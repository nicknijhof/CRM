import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

// Runs with no user session — Stripe calls this directly. Authenticity comes
// from the signature check below, not from Supabase auth, so this uses the
// service-role client to write purchase/interaction records.
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return new Response('Webhook not configured', { status: 500 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid signature';
    return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === 'string'
          ? invoice.parent.subscription_details.subscription
          : (invoice.parent?.subscription_details?.subscription?.id ?? null);
      if (!subscriptionId) break;

      // The very first invoice fires immediately on subscription creation and
      // duplicates what staff already recorded when they set up auto-billing
      // — only genuine renewals should create a new payment history row.
      if (invoice.billing_reason !== 'subscription_cycle') break;

      const { data: originalPurchase } = await supabase
        .from('purchases')
        .select('contact_id, name, product_id, item_type')
        .eq('stripe_subscription_id', subscriptionId)
        .order('purchase_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!originalPurchase) break;

      const amountPaid = invoice.amount_paid / 100;
      const paymentIntentId =
        typeof invoice.payments?.data?.[0]?.payment?.payment_intent === 'string'
          ? invoice.payments.data[0].payment.payment_intent
          : null;

      // Pull the real next-renewal date from Stripe rather than guessing —
      // without this, "Renews X" would go stale after the first renewal.
      let nextRenewalDate: string | null = null;
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd = subscription.items.data[0]?.current_period_end;
        if (periodEnd) nextRenewalDate = new Date(periodEnd * 1000).toISOString().slice(0, 10);
      } catch {
        // Fine to leave expiry_date unset for this row if the lookup fails.
      }

      await supabase.from('purchases').insert({
        contact_id: originalPurchase.contact_id,
        product_id: originalPurchase.product_id,
        name: originalPurchase.name,
        item_type: originalPurchase.item_type,
        price: amountPaid,
        list_price: amountPaid,
        amount_paid: amountPaid,
        payment_method: 'stripe',
        purchase_date: new Date().toISOString().slice(0, 10),
        expiry_date: nextRenewalDate,
        status: 'active',
        stripe_subscription_id: subscriptionId,
        stripe_payment_intent_id: paymentIntentId,
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === 'string'
          ? invoice.parent.subscription_details.subscription
          : (invoice.parent?.subscription_details?.subscription?.id ?? null);
      if (!subscriptionId) break;

      const { data: purchase } = await supabase
        .from('purchases')
        .select('contact_id, name')
        .eq('stripe_subscription_id', subscriptionId)
        .order('purchase_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!purchase) break;

      await supabase.from('interactions').insert({
        contact_id: purchase.contact_id,
        channel: 'other',
        note: `Stripe auto-billing failed for "${purchase.name}" — card may need updating. (Stripe will retry automatically.)`,
        staff_id: null,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from('purchases')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscription.id)
        .eq('status', 'active');
      break;
    }

    default:
      break;
  }

  return new Response('ok', { status: 200 });
}
