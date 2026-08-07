import { createClient } from '@/lib/supabase/server';
import type { Contact, Purchase } from '@/lib/types';
import { effectivePurchaseStatus } from '@/lib/purchases';
import CheckInSearch from '@/components/CheckInSearch';
import AutoRefresh from '@/components/AutoRefresh';
import Link from 'next/link';
import { subMinutes } from 'date-fns';
import { formatSGTime } from '@/lib/format';
import { checkOut } from './actions';

const WINDOW_MINUTES = 60;

export default async function CheckedInPage() {
  const supabase = await createClient();

  const oneHourAgo = subMinutes(new Date(), WINDOW_MINUTES).toISOString();

  const [{ data: recentVisits }, { data: contacts }, { data: purchases }] = await Promise.all([
    supabase
      .from('visits')
      .select('id, contact_id, visit_date')
      .gte('visit_date', oneHourAgo)
      .is('checked_out_at', null)
      .order('visit_date', { ascending: false }),
    supabase.from('contacts').select('id, full_name, phone').returns<Pick<Contact, 'id' | 'full_name' | 'phone'>[]>(),
    supabase.from('purchases').select('*').returns<Purchase[]>(),
  ]);

  const contactsById = new Map((contacts ?? []).map((c) => [c.id, c]));

  const activeContactIds = new Set<string>();
  for (const p of purchases ?? []) {
    if (effectivePurchaseStatus(p) === 'active') activeContactIds.add(p.contact_id);
  }
  const searchableContacts = (contacts ?? []).map((c) => ({ ...c, eligible: activeContactIds.has(c.id) }));

  const checkedIn = (recentVisits ?? [])
    .map((v) => ({ visit: v, contact: contactsById.get(v.contact_id) }))
    .filter((x): x is { visit: NonNullable<typeof x.visit>; contact: NonNullable<typeof x.contact> } =>
      Boolean(x.contact),
    );

  return (
    <div className="max-w-2xl space-y-6">
      <AutoRefresh intervalMs={30000} />
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Who&apos;s In</h1>
        <p className="mt-1 text-sm text-stone-500">
          Members checked in within the last {WINDOW_MINUTES} minutes. Updates automatically.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 p-4">
        <h2 className="text-sm font-semibold text-stone-700">Manual check-in</h2>
        <p className="mt-1 text-xs text-stone-500">
          Use this if the member&apos;s app check-in isn&apos;t working.
        </p>
        <div className="mt-3">
          <CheckInSearch contacts={searchableContacts} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Checked in</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {checkedIn.map(({ visit, contact }) => (
              <tr key={visit.id} className="hover:bg-stone-100">
                <td className="px-4 py-3">
                  <Link href={`/contacts/${contact.id}`} className="font-medium text-stone-900 hover:text-teal-600">
                    {contact.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-500">{formatSGTime(visit.visit_date)}</td>
                <td className="px-4 py-3 text-right">
                  <form action={checkOut.bind(null, visit.id)}>
                    <button type="submit" className="text-xs font-medium text-stone-500 hover:text-teal-600">
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!checkedIn.length && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-stone-400">
                  Nobody checked in right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
