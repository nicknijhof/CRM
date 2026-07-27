import { createClient } from '@/lib/supabase/server';
import type { Contact } from '@/lib/types';
import CheckInSearch from '@/components/CheckInSearch';
import AutoRefresh from '@/components/AutoRefresh';
import Link from 'next/link';
import { subMinutes } from 'date-fns';

const WINDOW_MINUTES = 60;

export default async function CheckedInPage() {
  const supabase = await createClient();

  const oneHourAgo = subMinutes(new Date(), WINDOW_MINUTES).toISOString();

  const [{ data: recentVisits }, { data: contacts }] = await Promise.all([
    supabase
      .from('visits')
      .select('id, contact_id, visit_date')
      .gte('visit_date', oneHourAgo)
      .order('visit_date', { ascending: false }),
    supabase.from('contacts').select('id, full_name, phone').returns<Pick<Contact, 'id' | 'full_name' | 'phone'>[]>(),
  ]);

  const contactsById = new Map((contacts ?? []).map((c) => [c.id, c]));

  const checkedIn = (recentVisits ?? [])
    .map((v) => ({ visit: v, contact: contactsById.get(v.contact_id) }))
    .filter((x): x is { visit: NonNullable<typeof x.visit>; contact: NonNullable<typeof x.contact> } =>
      Boolean(x.contact),
    );

  return (
    <div className="max-w-2xl space-y-6">
      <AutoRefresh intervalMs={30000} />
      <div>
        <h1 className="text-2xl font-semibold text-white">Who&apos;s In</h1>
        <p className="mt-1 text-sm text-slate-400">
          Members checked in within the last {WINDOW_MINUTES} minutes. Updates automatically.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 p-4">
        <h2 className="text-sm font-semibold text-slate-300">Manual check-in</h2>
        <p className="mt-1 text-xs text-slate-500">
          Use this if the member&apos;s app check-in isn&apos;t working.
        </p>
        <div className="mt-3">
          <CheckInSearch contacts={contacts ?? []} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Checked in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {checkedIn.map(({ visit, contact }) => (
              <tr key={visit.id} className="hover:bg-slate-900">
                <td className="px-4 py-3">
                  <Link href={`/contacts/${contact.id}`} className="font-medium text-white hover:text-cyan-400">
                    {contact.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {new Date(visit.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
            {!checkedIn.length && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
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
