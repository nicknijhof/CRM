import { stripe } from '@/lib/stripe';

export type StripeCharge = {
  id: string;
  amount: number; // dollars
  status: 'succeeded' | 'failed' | 'pending';
  at: string; // ISO
  failure: string | null;
};

export type StripeBillingStatus = {
  subscriptionStatus: string;
  nextChargeAt: string | null; // ISO date of the next invoice (or when billing starts, for a trial)
  cancelAtPeriodEnd: boolean;
  charges: StripeCharge[]; // most recent card charges on this customer
  error?: string;
};

type SubscriptionTimes = {
  current_period_end?: number;
  trial_end?: number | null;
  items?: { data: { current_period_end?: number }[] };
};

// Asks Stripe, live, how each subscription is doing and which card charges went through. Never
// throws: a Stripe hiccup becomes an `error` on that subscription so the member page still loads.
export async function getStripeBillingStatuses(
  customerId: string | null,
  subscriptionIds: string[],
): Promise<Record<string, StripeBillingStatus>> {
  const result: Record<string, StripeBillingStatus> = {};
  if (!subscriptionIds.length) return result;

  let charges: StripeCharge[] = [];
  let chargesError: string | undefined;
  if (customerId) {
    try {
      const list = await stripe.charges.list({ customer: customerId, limit: 3 });
      charges = list.data.map((c) => ({
        id: c.id,
        amount: c.amount / 100,
        status: c.status === 'succeeded' ? 'succeeded' : c.status === 'failed' ? 'failed' : 'pending',
        at: new Date(c.created * 1000).toISOString(),
        failure: c.failure_message ?? null,
      }));
    } catch (err) {
      chargesError = err instanceof Error ? err.message : 'Could not read charges from Stripe';
    }
  }

  await Promise.all(
    subscriptionIds.map(async (id) => {
      try {
        const sub = (await stripe.subscriptions.retrieve(id)) as unknown as SubscriptionTimes & {
          status: string;
          cancel_at_period_end: boolean;
        };
        const nextEpoch = sub.status === 'trialing' ? sub.trial_end : (sub.items?.data[0]?.current_period_end ?? sub.current_period_end);
        result[id] = {
          subscriptionStatus: sub.status,
          nextChargeAt: nextEpoch ? new Date(nextEpoch * 1000).toISOString() : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          charges,
          error: chargesError,
        };
      } catch (err) {
        result[id] = {
          subscriptionStatus: 'unknown',
          nextChargeAt: null,
          cancelAtPeriodEnd: false,
          charges: [],
          error: err instanceof Error ? err.message : 'Could not reach Stripe',
        };
      }
    }),
  );
  return result;
}
