import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireFeature } from '@/lib/permissions';
import { getCurrentRole } from '@/lib/profile';
import { formatSGDateTime } from '@/lib/format';
import PendingButton from '@/components/PendingButton';
import { checkQashierNow } from './actions';

type CheckoutRow = {
  id: string;
  status: 'pending' | 'completed' | 'expired';
  buyer_email: string | null;
  buyer_name: string | null;
  created_at: string;
  completed_at: string | null;
  completed_via: 'webhook' | 'reconcile' | null;
  products: { name: string } | null;
};

// Qashier checkouts stop being payable after 24 hours; give it a little extra before calling one abandoned.
const ABANDONED_AFTER_MS = 25 * 3_600_000;

type Label = { text: string; className: string };

function labelFor(row: CheckoutRow): Label {
  if (row.status === 'completed') {
    return row.completed_via === 'reconcile'
      ? { text: 'Recorded (recovered)', className: 'bg-amber-100 text-amber-800' }
      : { text: 'Recorded', className: 'bg-emerald-100 text-emerald-800' };
  }
  if (row.status === 'expired' || Date.now() - new Date(row.created_at).getTime() > ABANDONED_AFTER_MS) {
    return { text: 'Not paid', className: 'bg-stone-100 text-stone-600' };
  }
  return { text: 'Waiting', className: 'bg-sky-100 text-sky-800' };
}

export default async function OnlinePaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; checked?: string; recorded?: string; expired?: string; errors?: string }>;
}) {
  await requireFeature('sales_tracker');
  const params = await searchParams;
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  const canCheck = role === 'owner' || role === 'admin';

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await supabase
    .from('qashier_checkout_sessions')
    .select('id, status, buyer_email, buyer_name, created_at, completed_at, completed_via, products(name)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<CheckoutRow[]>();
  const rows = data ?? [];

  const labelled = rows.map((r) => ({ row: r, label: labelFor(r) }));
  const count = (text: string) => labelled.filter((l) => l.label.text === text).length;
  const recorded = count('Recorded');
  const recovered = count('Recorded (recovered)');
  const waiting = count('Waiting');
  const notPaid = count('Not paid');

  // Healthy = the most recent confirmation came straight from Qashier's webhook. Anything
  // recovered by the safety net after that means the webhook has stopped reaching us.
  const completed = rows.filter((r) => r.status === 'completed' && r.completed_at);
  const latest = [...completed].sort((a, b) => (b.completed_at! > a.completed_at! ? 1 : -1))[0];
  const webhookHealthy = latest ? latest.completed_via === 'webhook' : null;

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <Link href="/sales" className="text-xs text-teal-600 hover:text-teal-700">
          ← Sales Tracker
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">Online payments (Qashier)</h1>
        <p className="mt-1 text-sm text-stone-500">
          Packs, single sessions, trials and gift cards bought on the website or in the app. Qashier tells us when a
          payment goes through; a safety net also checks with Qashier every 5 minutes, in case that message is lost.
        </p>
      </div>

      {webhookHealthy === false && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Qashier&apos;s confirmations aren&apos;t reaching us</p>
          <p className="mt-1">
            The latest online payment was found by the safety net, not delivered by Qashier. Payments are still being
            recorded, but check the webhook address in Qashier HQ (API key settings) is{' '}
            <code className="rounded bg-amber-100 px-1">https://rmqfvhethwzzmsamkoam.supabase.co/functions/v1/qashier-webhook</code>.
            This turns green by itself once a payment is confirmed by Qashier directly.
          </p>
        </div>
      )}
      {webhookHealthy === true && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Working</p>
          <p className="mt-1">
            The latest online payment was confirmed by Qashier directly
            {latest?.completed_at ? ` (${formatSGDateTime(latest.completed_at)})` : ''}.
          </p>
        </div>
      )}
      {webhookHealthy === null && (
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
          No online payment has been recorded in the last 30 days yet. The first one will show here.
        </div>
      )}

      {params.result === 'ok' && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
          Checked {params.checked} unconfirmed checkout{params.checked === '1' ? '' : 's'} with Qashier: recorded{' '}
          {params.recorded}, marked {params.expired} as not paid
          {params.errors && params.errors !== '0' ? `, ${params.errors} could not be checked` : ''}.
        </div>
      )}
      {params.result === 'failed' && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          Couldn&apos;t reach the checker. Only owner and admin logins can run it. Try again in a moment.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Recorded', recorded, 'text-emerald-700'],
          ['Recovered by safety net', recovered, 'text-amber-700'],
          ['Waiting', waiting, 'text-sky-700'],
          ['Not paid', notPaid, 'text-stone-500'],
        ].map(([label, value, color]) => (
          <div key={label as string} className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
            <p className="text-xs text-stone-400">last 30 days</p>
          </div>
        ))}
      </div>

      {canCheck && (
        <form action={checkQashierNow}>
          <PendingButton
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            pendingLabel="Checking with Qashier…"
          >
            Check Qashier now
          </PendingButton>
          <p className="mt-1 text-xs text-stone-500">Records anything that was paid but didn&apos;t come through.</p>
        </form>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">Recent checkouts</h2>
        {labelled.length === 0 ? (
          <p className="text-sm text-stone-400">No online checkouts in the last 30 days.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-2.5">Started</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Item</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {labelled.map(({ row, label }) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-stone-600">{formatSGDateTime(row.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-stone-900">{row.buyer_name ?? '—'}</div>
                      <div className="text-xs text-stone-500">{row.buyer_email}</div>
                    </td>
                    <td className="px-4 py-2.5 text-stone-700">{row.products?.name ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${label.className}`}>{label.text}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
