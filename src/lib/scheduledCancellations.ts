import type { SupabaseClient } from '@supabase/supabase-js';
import { stripe } from './stripe';
import type { Purchase } from './types';

export interface ScheduledCancellationResult {
  cancelledPurchaseIds: string[];
  churnedContactIds: string[];
}

/**
 * Cancels any purchase whose scheduled_cancellation_date has arrived —
 * cancelling the Stripe subscription first (if any), so a scheduled
 * cancellation actually stops future billing instead of just marking our
 * own record cancelled while Stripe keeps charging. There's no cron in
 * this app, so this runs lazily whenever a page that shows purchases is
 * viewed, same pattern as the existing lapsed-stage reconciliation.
 */
export async function reconcileScheduledCancellations(
  supabase: SupabaseClient,
  purchases: Purchase[],
): Promise<ScheduledCancellationResult> {
  const today = new Date().toISOString().slice(0, 10);
  const due = purchases.filter(
    (p) => p.status === 'active' && p.scheduled_cancellation_date && p.scheduled_cancellation_date <= today,
  );

  const cancelledPurchaseIds: string[] = [];
  const churnedContactIds: string[] = [];

  for (const p of due) {
    if (p.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(p.stripe_subscription_id);
      } catch {
        // Already cancelled on Stripe's side (or some other issue) — still
        // reflect the cancellation locally below rather than getting stuck.
      }
    }

    const { error } = await supabase
      .from('purchases')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        scheduled_cancellation_date: null,
      })
      .eq('id', p.id);
    if (error) continue;
    cancelledPurchaseIds.push(p.id);

    if (p.item_type === 'membership') {
      await supabase.from('contacts').update({ pipeline_stage: 'churned' }).eq('id', p.contact_id);
      churnedContactIds.push(p.contact_id);
    }
  }

  return { cancelledPurchaseIds, churnedContactIds };
}
