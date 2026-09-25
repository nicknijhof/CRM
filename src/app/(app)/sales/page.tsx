import Link from 'next/link';
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfDay,
  format,
} from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { requireFeature } from '@/lib/permissions';
import { PAYMENT_METHODS } from '@/lib/constants';
import type { Contact, PaymentMethod, Purchase } from '@/lib/types';

function formatMoney(amount: number): string {
  return `S$${amount.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type RangeKey = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
];

const DATE_FMT = 'yyyy-MM-dd';

function resolveRange(range: RangeKey, fromParam?: string, toParam?: string) {
  const now = new Date();
  if (range === 'custom' && fromParam && toParam) {
    return { from: fromParam, to: toParam };
  }
  const to = format(endOfDay(now), DATE_FMT);
  switch (range) {
    case 'today':
      return { from: format(startOfDay(now), DATE_FMT), to };
    case 'week':
      return { from: format(startOfWeek(now, { weekStartsOn: 1 }), DATE_FMT), to };
    case 'year':
      return { from: format(startOfYear(now), DATE_FMT), to };
    case 'all':
      return { from: '2020-01-01', to };
    case 'month':
    default:
      return { from: format(startOfMonth(now), DATE_FMT), to };
  }
}

// Real payment rails, in the order shown — "comp" (ambassador comps) is deliberately left out
// of the revenue breakdown since it's $0 by definition, not a payment method to reconcile.
const REVENUE_METHODS: PaymentMethod[] = ['paynow', 'stripe', 'qashier', 'cash'];

const METHOD_LABEL: Record<PaymentMethod, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label]),
) as Record<PaymentMethod, string>;

const METHOD_BADGE_CLASSES: Record<string, string> = {
  paynow: 'bg-red-100 text-red-700',
  stripe: 'bg-violet-100 text-violet-700',
  qashier: 'bg-amber-100 text-amber-700',
  cash: 'bg-emerald-100 text-emerald-700',
  comp: 'bg-stone-200 text-stone-600',
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireFeature('sales_tracker');
  const params = await searchParams;
  const range = (RANGE_OPTIONS.some((r) => r.key === params.range) ? params.range : params.from && params.to ? 'custom' : 'month') as RangeKey;
  const { from, to } = resolveRange(range, params.from, params.to);

  const supabase = await createClient();
  const { data: purchases } = await supabase
    .from('purchases')
    .select('*')
    .gte('purchase_date', from)
    .lte('purchase_date', to)
    .order('purchase_date', { ascending: false })
    .returns<Purchase[]>();

  const rows = purchases ?? [];

  const contactIds = [...new Set(rows.map((r) => r.contact_id))];
  const { data: contacts } = contactIds.length
    ? await supabase.from('contacts').select('id, full_name').in('id', contactIds).returns<Pick<Contact, 'id' | 'full_name'>[]>()
    : { data: [] as Pick<Contact, 'id' | 'full_name'>[] };
  const nameById = new Map((contacts ?? []).map((c) => [c.id, c.full_name]));

  const totals = new Map<string, { amount: number; count: number }>();
  for (const row of rows) {
    const method = row.payment_method ?? 'unknown';
    const bucket = totals.get(method) ?? { amount: 0, count: 0 };
    bucket.amount += row.amount_paid;
    bucket.count += 1;
    totals.set(method, bucket);
  }
  const grandTotal = REVENUE_METHODS.reduce((sum, m) => sum + (totals.get(m)?.amount ?? 0), 0);
  const compCount = totals.get('comp')?.count ?? 0;

  const customRangeHref = (key: RangeKey) => `/sales?range=${key}`;

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Sales Tracker</h1>
        <p className="mt-1 text-sm text-stone-500">
          Revenue by payment method, so this can be matched line-by-line against the Stripe and Qashier dashboards.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <Link
            key={opt.key}
            href={customRangeHref(opt.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              range === opt.key ? 'bg-teal-600 text-white' : 'border border-stone-300 text-stone-700 hover:bg-stone-100'
            }`}
          >
            {opt.label}
          </Link>
        ))}
        <form action="/sales" method="get" className="flex items-center gap-2">
          <input type="hidden" name="range" value="custom" />
          <input
            type="date"
            name="from"
            defaultValue={from.slice(0, 10)}
            className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-700"
          />
          <span className="text-sm text-stone-400">to</span>
          <input
            type="date"
            name="to"
            defaultValue={to.slice(0, 10)}
            className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-700"
          />
          <button className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100">
            Go
          </button>
        </form>
      </div>

      <p className="text-xs text-stone-400">
        Showing {format(new Date(from), 'd MMM yyyy')} – {format(new Date(to), 'd MMM yyyy')}
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {REVENUE_METHODS.map((method) => {
          const bucket = totals.get(method) ?? { amount: 0, count: 0 };
          return (
            <div key={method} className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{METHOD_LABEL[method]}</p>
              <p className="mt-1 text-2xl font-semibold text-stone-900">{formatMoney(bucket.amount)}</p>
              <p className="mt-0.5 text-xs text-stone-500">{bucket.count} transaction{bucket.count === 1 ? '' : 's'}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-700">Total revenue</p>
        <p className="mt-1 text-3xl font-semibold text-teal-900">{formatMoney(grandTotal)}</p>
        {compCount > 0 && (
          <p className="mt-1 text-xs text-teal-700">
            Plus {compCount} ambassador comp{compCount === 1 ? '' : 's'} (no revenue, not counted above).
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">Transactions</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-stone-400">No purchases in this range.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Member</th>
                  <th className="px-4 py-2.5">Item</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-stone-100 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 text-stone-600">
                      {format(new Date(row.purchase_date), 'd MMM yyyy')}
                    </td>
                    <td className="px-4 py-2.5 text-stone-900">{nameById.get(row.contact_id) ?? '—'}</td>
                    <td className="px-4 py-2.5 text-stone-600">{row.name}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          METHOD_BADGE_CLASSES[row.payment_method ?? ''] ?? 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {row.payment_method ? METHOD_LABEL[row.payment_method] : '—'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-stone-900">
                      {formatMoney(row.amount_paid)}
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
