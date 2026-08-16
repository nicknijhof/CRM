'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { canManagePurchases, getCurrentRole } from '@/lib/profile';

async function requireCanManagePayments() {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!canManagePurchases(role)) throw new Error('Not authorized to manage payments');
  return supabase;
}

async function ensureStripeCustomer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contactId: string,
): Promise<string> {
  const { data: contact, error } = await supabase
    .from('contacts')
    .select('stripe_customer_id, full_name, email')
    .eq('id', contactId)
    .single();
  if (error || !contact) throw new Error(error?.message ?? 'Member not found');

  if (contact.stripe_customer_id) return contact.stripe_customer_id;

  const customer = await stripe.customers.create({
    name: contact.full_name,
    email: contact.email ?? undefined,
    metadata: { contact_id: contactId },
  });

  const { error: updateError } = await supabase
    .from('contacts')
    .update({ stripe_customer_id: customer.id })
    .eq('id', contactId);
  if (updateError) throw new Error(updateError.message);

  return customer.id;
}

export async function createSetupIntent(contactId: string): Promise<{ clientSecret: string }> {
  const supabase = await requireCanManagePayments();
  const customerId = await ensureStripeCustomer(supabase, contactId);

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  });

  if (!setupIntent.client_secret) throw new Error('Stripe did not return a client secret');
  return { clientSecret: setupIntent.client_secret };
}

export async function savePaymentMethod(contactId: string, paymentMethodId: string) {
  const supabase = await requireCanManagePayments();

  const { data: contact, error: fetchError } = await supabase
    .from('contacts')
    .select('stripe_customer_id')
    .eq('id', contactId)
    .single();
  if (fetchError || !contact?.stripe_customer_id) {
    throw new Error(fetchError?.message ?? 'This member has no Stripe customer set up yet');
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

  await stripe.customers.update(contact.stripe_customer_id, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const { error } = await supabase
    .from('contacts')
    .update({
      stripe_payment_method_id: paymentMethodId,
      card_brand: paymentMethod.card?.brand ?? null,
      card_last4: paymentMethod.card?.last4 ?? null,
    })
    .eq('id', contactId);
  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}

export async function removePaymentMethod(contactId: string) {
  const supabase = await requireCanManagePayments();

  const { data: contact, error: fetchError } = await supabase
    .from('contacts')
    .select('stripe_payment_method_id')
    .eq('id', contactId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  if (contact?.stripe_payment_method_id) {
    try {
      await stripe.paymentMethods.detach(contact.stripe_payment_method_id);
    } catch {
      // Already detached/removed on Stripe's side — fine, still clear our record below.
    }
  }

  const { error } = await supabase
    .from('contacts')
    .update({ stripe_payment_method_id: null, card_brand: null, card_last4: null })
    .eq('id', contactId);
  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}

export async function chargeSavedCard(purchaseId: string, contactId: string) {
  const supabase = await requireCanManagePayments();

  const [{ data: contact, error: contactError }, { data: purchase, error: purchaseError }] = await Promise.all([
    supabase.from('contacts').select('stripe_customer_id, stripe_payment_method_id').eq('id', contactId).single(),
    supabase.from('purchases').select('price, amount_paid').eq('id', purchaseId).single(),
  ]);
  if (contactError || !contact?.stripe_customer_id || !contact.stripe_payment_method_id) {
    throw new Error(contactError?.message ?? 'This member has no card on file');
  }
  if (purchaseError || !purchase) throw new Error(purchaseError?.message ?? 'Purchase not found');

  const amountDue = Math.round(((purchase.price ?? 0) - purchase.amount_paid) * 100) / 100;
  if (amountDue <= 0) throw new Error('Nothing owing on this purchase');

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountDue * 100),
      currency: 'sgd',
      customer: contact.stripe_customer_id,
      payment_method: contact.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      metadata: { purchase_id: purchaseId, contact_id: contactId },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Card charge failed';
    throw new Error(`Charge failed: ${message}`);
  }

  if (paymentIntent.status !== 'succeeded') {
    throw new Error(`Charge did not complete (status: ${paymentIntent.status}). No amount was recorded as paid.`);
  }

  const { error } = await supabase
    .from('purchases')
    .update({
      amount_paid: purchase.amount_paid + amountDue,
      payment_method: 'stripe',
      stripe_payment_intent_id: paymentIntent.id,
    })
    .eq('id', purchaseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}

export async function createMembershipSubscription(purchaseId: string, contactId: string) {
  const supabase = await requireCanManagePayments();

  const [{ data: contact, error: contactError }, { data: purchase, error: purchaseError }] = await Promise.all([
    supabase.from('contacts').select('stripe_customer_id, stripe_payment_method_id').eq('id', contactId).single(),
    supabase.from('purchases').select('name, price, item_type, stripe_subscription_id').eq('id', purchaseId).single(),
  ]);
  if (contactError || !contact?.stripe_customer_id || !contact.stripe_payment_method_id) {
    throw new Error(contactError?.message ?? 'This member has no card on file');
  }
  if (purchaseError || !purchase) throw new Error(purchaseError?.message ?? 'Purchase not found');
  if (purchase.item_type !== 'membership') throw new Error('Only memberships can be set up for auto-billing');
  if (purchase.stripe_subscription_id) throw new Error('Auto-billing is already set up for this membership');
  if (!purchase.price || purchase.price <= 0) throw new Error('This membership has no price to bill');

  const product = await stripe.products.create({ name: purchase.name });

  const subscription = await stripe.subscriptions.create({
    customer: contact.stripe_customer_id,
    default_payment_method: contact.stripe_payment_method_id,
    items: [
      {
        price_data: {
          currency: 'sgd',
          product: product.id,
          unit_amount: Math.round(purchase.price * 100),
          recurring: { interval: 'month' },
        },
      },
    ],
    metadata: { purchase_id: purchaseId, contact_id: contactId },
  });

  const { error } = await supabase
    .from('purchases')
    .update({ stripe_subscription_id: subscription.id, payment_method: 'stripe' })
    .eq('id', purchaseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}
