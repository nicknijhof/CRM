import Link from 'next/link';
import { requireBusiness } from '@/lib/businessAuth';
import { describeDays, formatDay, formatPrice, renewalActions } from '@/lib/business';
import type { Contract } from '@/lib/types';
import { PageHeader } from '@/components/business/ui';

export default async function BusinessOverviewPage() {
  const supabase = await requireBusiness();
  const [{ count: partnerCount }, { count: supplierCount }, { data: contracts }, { count: unpaidCount }] = await Promise.all([
    supabase.from('partners').select('id', { count: 'exact', head: true }).neq('status', 'ended'),
    supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('contracts').select('*').returns<Contract[]>(),
    supabase.from('supplier_invoices').select('id', { count: 'exact', head: true }).eq('paid', false),
  ]);
  const all = contracts ?? [];
  const actions = renewalActions(all);
  const upcoming = all
    .filter((c) => c.status === 'active' && c.renewal_date && !actions.some((a) => a.contract.id === c.id))
    .sort((a, b) => a.renewal_date!.localeCompare(b.renewal_date!))
    .slice(0, 5);

  const tiles = [
    { href: '/business/partnerships', title: 'Partnerships', stat: `${partnerCount ?? 0} active`, text: 'Gyms and companies we have deals with, and how each deal works.' },
    { href: '/business/suppliers', title: 'Suppliers', stat: `${supplierCount ?? 0} active${unpaidCount ? ` · ${unpaidCount} unpaid invoice${unpaidCount === 1 ? '' : 's'}` : ''}`, text: 'Who we buy from, order history and stored invoices.' },
    { href: '/business/contracts', title: 'Contracts', stat: `${all.filter((c) => c.status === 'active').length} active · ${actions.length} to action`, text: 'Prices, cancellation terms and renewal dates.' },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Business management" intro="Partners, suppliers and contracts in one place. Only owners and admins can see this section." />

      <div className="grid grid-cols-3 gap-4">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-xl border border-stone-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm">
            <h2 className="text-base font-semibold text-stone-900">{t.title}</h2>
            <p className="mt-1 text-sm font-medium text-teal-700">{t.stat}</p>
            <p className="mt-2 text-sm text-stone-500">{t.text}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-stone-700">Coming up</h2>
          <p className="text-xs text-stone-500">Renewals due in the next three months need action. The rest are listed by date.</p>
        </div>
        <ul className="divide-y divide-stone-100 text-sm">
          {[...actions.map((a) => ({ c: a.contract, days: a.daysToRenewal, flag: true })), ...upcoming.map((c) => ({ c, days: null as number | null, flag: false }))].map(({ c, days, flag }) => (
            <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <span>
                <Link href="/business/contracts" className="font-medium text-stone-900 hover:text-teal-600">
                  {c.name}
                </Link>
                {c.provider && <span className="text-stone-500"> · {c.provider}</span>}
              </span>
              <span className={flag ? 'font-medium text-amber-700' : 'text-stone-500'}>
                {formatPrice(c.price, c.billing_cycle)} · renews {formatDay(c.renewal_date)}
                {days !== null && ` (${describeDays(days)})`}
              </span>
            </li>
          ))}
          {!actions.length && !upcoming.length && <li className="px-4 py-6 text-center text-stone-400">No renewals on the calendar yet.</li>}
        </ul>
      </section>
    </div>
  );
}
