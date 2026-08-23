import Link from 'next/link';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import type { Contact, Purchase } from '@/lib/types';
import { ITEM_TYPES } from '@/lib/constants';
import { cancellationsByMonth } from '@/lib/analytics';
import MonthlyTrendChart from '@/components/charts/MonthlyTrendChart';

const TREND_MONTHS_BACK = 6;

function itemTypeLabel(itemType: Purchase['item_type']) {
  return ITEM_TYPES.find((t) => t.value === itemType)?.label ?? itemType;
}

export default async function CancellationsPage() {
  const supabase = await createClient();

  const [{ data: contacts }, { data: purchases }] = await Promise.all([
    supabase.from('contacts').select('id, full_name').returns<Pick<Contact, 'id' | 'full_name'>[]>(),
    supabase.from('purchases').select('*').not('cancelled_at', 'is', null).returns<Purchase[]>(),
  ]);

  const contactNameById = new Map((contacts ?? []).map((c) => [c.id, c.full_name]));
  const cancelled = (purchases ?? []).slice().sort((a, b) => (b.cancelled_at! < a.cancelled_at! ? -1 : 1));
  const trend = cancellationsByMonth(purchases ?? [], TREND_MONTHS_BACK);

  const groups = new Map<string, Purchase[]>();
  for (const p of cancelled) {
    const monthKey = format(new Date(p.cancelled_at!), 'MMMM yyyy');
    const list = groups.get(monthKey) ?? [];
    list.push(p);
    groups.set(monthKey, list);
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/marketing/analytics" className="text-sm text-teal-600 hover:underline">
          ← Analytics
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">Cancellations</h1>
        <p className="mt-1 text-sm text-stone-500">
          Every cancelled purchase, {cancelled.length} total, grouped by the month it was cancelled.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-stone-700">Cancellations by month</h3>
        <p className="text-xs text-stone-500">Last {TREND_MONTHS_BACK} months</p>
        <MonthlyTrendChart data={trend} series={[{ key: 'cancellations', label: 'Cancellations' }]} />
      </div>

      {groups.size === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-400">
          No cancellations yet.
        </div>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([month, monthPurchases]) => (
            <div key={month}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                {month} · {monthPurchases.length}
              </h2>
              <div className="mt-2 overflow-hidden rounded-xl border border-stone-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Member</th>
                      <th className="px-4 py-2 font-medium">Item</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 font-medium">Price</th>
                      <th className="px-4 py-2 font-medium">Cancelled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {monthPurchases.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2.5">
                          <Link href={`/contacts/${p.contact_id}`} className="font-medium text-teal-600 hover:underline">
                            {contactNameById.get(p.contact_id) ?? 'Unknown'}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-stone-700">{p.name}</td>
                        <td className="px-4 py-2.5 text-stone-500">{itemTypeLabel(p.item_type)}</td>
                        <td className="px-4 py-2.5 text-stone-500">{p.price != null ? `$${p.price.toFixed(2)}` : '—'}</td>
                        <td className="px-4 py-2.5 text-stone-500">{format(new Date(p.cancelled_at!), 'd MMM yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
