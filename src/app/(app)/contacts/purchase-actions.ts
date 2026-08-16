'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { computeDiscount, computeSessionsTotal } from '@/lib/discounts';
import { addMonthsClamped } from '@/lib/dateMath';
import { generateGiftCode } from '@/lib/giftCards';
import { stripe } from '@/lib/stripe';
import type { DiscountCode, PaymentMethod, Product } from '@/lib/types';

function computeExpiry(purchaseDate: string, product: Product): string | null {
  // True memberships renew on the same calendar day each month (Jan 31 -> Feb 28), not a
  // flat day count — a flat +30 days drifts later relative to the purchase date over time.
  if (product.billing_period_months) {
    return addMonthsClamped(purchaseDate, product.billing_period_months);
  }
  const days = product.validity_days ?? product.billing_period_days;
  if (!days) return null;
  const date = new Date(purchaseDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function addPurchase(contactId: string, formData: FormData) {
  const productId = String(formData.get('product_id') ?? '');
  if (!productId) return;

  const purchaseDate = (formData.get('purchase_date') as string) || new Date().toISOString().slice(0, 10);
  const discountCodeId = String(formData.get('discount_code_id') ?? '') || null;
  const supabase = await createClient();

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single<Product>();

  if (productError || !product) throw new Error(productError?.message ?? 'Product not found');

  let discountCode: DiscountCode | null = null;
  if (discountCodeId) {
    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('id', discountCodeId)
      .single<DiscountCode>();
    if (error) throw new Error(error.message);
    discountCode = data;
  }

  const { discountAmount, finalPrice } = computeDiscount(product.price, discountCode);
  const sessionsTotal = computeSessionsTotal(product.sessions_included, discountCode);
  const amountPaid = Math.min(Math.max(Number(formData.get('amount_paid')) || 0, 0), finalPrice);
  const paymentMethod = (formData.get('payment_method') as PaymentMethod) || null;

  if (product.item_type === 'gift_card') {
    const recipientEmail = String(formData.get('gift_recipient_email') ?? '').trim();
    if (!recipientEmail) throw new Error('Recipient email is required for a gift card purchase');

    const giftCode = generateGiftCode();
    const giftedItemName = product.name.replace(/^Gift Card:\s*/, '');

    const { error: codeError } = await supabase.from('discount_codes').insert({
      code: giftCode,
      label: `Gift: ${giftedItemName} (for ${recipientEmail})`,
      discount_type: 'full_comp',
      value: 0,
      bonus_sessions: 0,
      single_use: true,
      is_gift_code: true,
    });
    if (codeError) throw new Error(codeError.message);

    const { error } = await supabase.from('purchases').insert({
      contact_id: contactId,
      product_id: product.id,
      name: product.name,
      item_type: product.item_type,
      list_price: product.price,
      discount_code_id: discountCode?.id ?? null,
      discount_label: discountCode?.label ?? null,
      discount_amount: discountAmount,
      price: finalPrice,
      payment_method: finalPrice > 0 ? paymentMethod : null,
      amount_paid: amountPaid,
      sessions_total: null,
      sessions_remaining: null,
      purchase_date: purchaseDate,
      expiry_date: null,
      is_gift: true,
      gift_recipient_email: recipientEmail,
      gift_code: giftCode,
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/contacts/${contactId}`);
    revalidatePath('/discounts');
    return;
  }

  const { error } = await supabase.from('purchases').insert({
    contact_id: contactId,
    product_id: product.id,
    name: product.name,
    item_type: product.item_type,
    list_price: product.price,
    discount_code_id: discountCode?.id ?? null,
    discount_label: discountCode?.label ?? null,
    discount_amount: discountAmount,
    price: finalPrice,
    payment_method: finalPrice > 0 ? paymentMethod : null,
    amount_paid: amountPaid,
    sessions_total: sessionsTotal,
    sessions_remaining: sessionsTotal,
    purchase_date: purchaseDate,
    expiry_date: computeExpiry(purchaseDate, product),
  });

  if (error) throw new Error(error.message);

  if (discountCode?.single_use) {
    if (discountCode.is_gift_code) {
      // Keep the row so the original purchaser's gift-card card can show it
      // was redeemed, instead of hard-deleting and leaving a dangling code.
      await supabase
        .from('discount_codes')
        .update({ is_active: false, redeemed_at: new Date().toISOString() })
        .eq('id', discountCode.id);
    } else {
      await supabase.from('discount_codes').delete().eq('id', discountCode.id);
    }
  }

  revalidatePath(`/contacts/${contactId}`);
}

export async function adjustSessions(purchaseId: string, contactId: string, delta: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: purchase, error: fetchError } = await supabase
    .from('purchases')
    .select('sessions_remaining, sessions_total')
    .eq('id', purchaseId)
    .single();

  if (fetchError || !purchase) throw new Error(fetchError?.message ?? 'Purchase not found');

  const nextRemaining = Math.max(0, (purchase.sessions_remaining ?? 0) + delta);
  const nextStatus = nextRemaining === 0 ? 'used_up' : 'active';

  let usedUpAt: string | null | undefined;
  if (nextRemaining > 0) {
    usedUpAt = null; // back to active: clear any previous used-up timestamp
  } else if ((purchase.sessions_remaining ?? 0) > 0) {
    usedUpAt = new Date().toISOString(); // just ran out: record when
  } // else: was already at 0, leave the existing timestamp alone

  const { error } = await supabase
    .from('purchases')
    .update({ sessions_remaining: nextRemaining, status: nextStatus, used_up_at: usedUpAt })
    .eq('id', purchaseId);

  if (error) throw new Error(error.message);

  await supabase.from('purchase_adjustments').insert({
    purchase_id: purchaseId,
    delta,
    staff_id: user?.id ?? null,
  });

  if (delta < 0) {
    // Deducting a session means they're using it right now — check them in.
    await supabase.from('visits').insert({
      contact_id: contactId,
      visit_date: new Date().toISOString(),
      service: 'other',
    });
    revalidatePath('/checked-in');
  }

  revalidatePath(`/contacts/${contactId}`);
}

export async function cancelPurchase(purchaseId: string, contactId: string) {
  const supabase = await createClient();

  const { data: purchase, error: fetchError } = await supabase
    .from('purchases')
    .select('item_type, stripe_subscription_id')
    .eq('id', purchaseId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  if (purchase?.stripe_subscription_id) {
    // Stop future billing, not just our own record — otherwise Stripe keeps
    // charging the card every month even though the CRM shows "cancelled".
    try {
      await stripe.subscriptions.cancel(purchase.stripe_subscription_id);
    } catch {
      // Already cancelled on Stripe's side, or some other issue — still
      // reflect the cancellation in our own records below.
    }
  }

  const { error } = await supabase
    .from('purchases')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), scheduled_cancellation_date: null })
    .eq('id', purchaseId);
  if (error) throw new Error(error.message);

  // Cancelling a membership means the person churned — reflect that in the pipeline.
  if (purchase?.item_type === 'membership') {
    const { error: contactError } = await supabase
      .from('contacts')
      .update({ pipeline_stage: 'churned' })
      .eq('id', contactId);
    if (contactError) throw new Error(contactError.message);
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath('/contacts');
  revalidatePath('/pipeline');
  revalidatePath('/');
}

export async function scheduleCancellation(purchaseId: string, contactId: string, formData: FormData) {
  const date = String(formData.get('scheduled_cancellation_date') ?? '');
  if (!date) throw new Error('Pick a date to schedule the cancellation for');

  const supabase = await createClient();
  const { error } = await supabase
    .from('purchases')
    .update({ scheduled_cancellation_date: date })
    .eq('id', purchaseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}

export async function unscheduleCancellation(purchaseId: string, contactId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('purchases')
    .update({ scheduled_cancellation_date: null })
    .eq('id', purchaseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}

function revalidatePauseAffectedPaths(contactId: string) {
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath('/contacts');
  revalidatePath('/pipeline');
  revalidatePath('/coming-back');
  revalidatePath('/');
}

export async function pauseMembership(purchaseId: string, contactId: string, formData: FormData) {
  const pauseFrom = (formData.get('pause_from') as string) || new Date().toISOString().slice(0, 10);
  const pauseUntil = (formData.get('pause_until') as string) || null;
  const pauseReason = String(formData.get('pause_reason') ?? '').trim() || null;

  const supabase = await createClient();

  const { error } = await supabase
    .from('purchases')
    .update({
      is_paused: true,
      pause_reason: pauseReason,
      pause_started_at: pauseFrom,
      pause_resume_date: pauseUntil,
    })
    .eq('id', purchaseId);

  if (error) throw new Error(error.message);

  const { error: contactError } = await supabase
    .from('contacts')
    .update({ pipeline_stage: 'lead' })
    .eq('id', contactId);

  if (contactError) throw new Error(contactError.message);

  revalidatePauseAffectedPaths(contactId);
}

export async function resumeMembership(purchaseId: string, contactId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('purchases')
    .update({
      is_paused: false,
      pause_reason: null,
      pause_started_at: null,
      pause_resume_date: null,
    })
    .eq('id', purchaseId);

  if (error) throw new Error(error.message);

  const { error: contactError } = await supabase
    .from('contacts')
    .update({ pipeline_stage: 'active' })
    .eq('id', contactId);

  if (contactError) throw new Error(contactError.message);

  revalidatePauseAffectedPaths(contactId);
}

export async function updatePayment(purchaseId: string, contactId: string, formData: FormData) {
  const supabase = await createClient();

  const { data: purchase, error: fetchError } = await supabase
    .from('purchases')
    .select('price')
    .eq('id', purchaseId)
    .single();
  if (fetchError || !purchase) throw new Error(fetchError?.message ?? 'Purchase not found');

  const amountPaid = Math.min(Math.max(Number(formData.get('amount_paid')) || 0, 0), purchase.price ?? 0);
  const paymentMethod = (formData.get('payment_method') as PaymentMethod) || null;

  const { error } = await supabase
    .from('purchases')
    .update({ payment_method: paymentMethod, amount_paid: amountPaid })
    .eq('id', purchaseId);

  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}
