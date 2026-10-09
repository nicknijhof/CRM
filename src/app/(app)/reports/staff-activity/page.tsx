import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireFeature } from '@/lib/permissions';
import { getCurrentRole } from '@/lib/profile';
import { formatSGDateTime } from '@/lib/format';

type LogRow = {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_label: string;
  actor_kind: 'staff' | 'member' | 'system';
  action: string;
  contact_id: string | null;
  summary: string;
  new_data: { price?: number | string; amount_paid?: number | string; payment_method?: string | null } | null;
};

const ACTION_LABEL: Record<string, string> = {
  purchase_added: 'Added purchase',
  purchase_edited: 'Edited purchase',
  purchase_deleted: 'Deleted purchase',
  sessions_adjusted: 'Adjusted sessions',
  contact_added: 'Added member',
  contact_deleted: 'Deleted member',
};

const sgMonthKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }).slice(0, 7);
const monthStart = (key: string) => new Date(`${key}-01T00:00:00+08:00`);
function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
const money = (n: number) => `S$${n.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function fetchAll<T>(make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await make(from, from + 999);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return all;
}

export default async function StaffActivityPage({ searchParams }: { searchParams: Promise<{ month?: string; actor?: string }> }) {
  await requireFeature('reports');
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (role !== 'owner' && role !== 'admin') redirect('/reports');

  const params = await searchParams;
  const thisMonth = sgMonthKey(new Date());
  const month = /^\d{4}-\d{2}$/.test(params.month ?? '') ? params.month! : thisMonth;
  const start = monthStart(month);
  const end = monthStart(shiftMonth(month, 1));
  const monthLabel = start.toLocaleDateString('en-SG', { month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' });

  const [rows, notes] = await Promise.all([
    fetchAll<LogRow>((from, to) =>
      supabase
        .from('activity_log')
        .select('id, created_at, actor_id, actor_label, actor_kind, action, contact_id, summary, new_data')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
        .order('created_at', { ascending: false })
        .range(from, to),
    ),
    fetchAll<{ staff_id: string | null }>((from, to) =>
      supabase
        .from('interactions')
        .select('staff_id')
        .not('staff_id', 'is', null)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
        .range(from, to),
    ),
  ]);

  const staffRows = rows.filter((r) => r.actor_kind === 'staff' && r.actor_id);
  type Tally = { id: string; label: string; added: number; sales: number; edited: number; deleted: number; adjusted: number; membersAdded: number; membersDeleted: number; notes: number };
  const tallies = new Map<string, Tally>();
  const tallyFor = (r: LogRow) => {
    const t = tallies.get(r.actor_id!) ?? { id: r.actor_id!, label: r.actor_label, added: 0, sales: 0, edited: 0, deleted: 0, adjusted: 0, membersAdded: 0, membersDeleted: 0, notes: 0 };
    tallies.set(r.actor_id!, t);
    return t;
  };
  for (const r of staffRows) {
    const t = tallyFor(r);
    if (r.action === 'purchase_added') {
      t.added++;
      if (r.new_data?.payment_method !== 'comp') t.sales += Number(r.new_data?.amount_paid ?? 0) || 0;
    } else if (r.action === 'purchase_edited') t.edited++;
    else if (r.action === 'purchase_deleted') t.deleted++;
    else if (r.action === 'sessions_adjusted') t.adjusted++;
    else if (r.action === 'contact_added') t.membersAdded++;
    else if (r.action === 'contact_deleted') t.membersDeleted++;
  }
  for (const n of notes) {
    const t = tallies.get(n.staff_id!);
    if (t) t.notes++;
  }
  const people = [...tallies.values()].sort((a, b) => a.label.localeCompare(b.label));
  const systemCount = rows.filter((r) => r.actor_kind === 'system').length;
  const memberCount = rows.filter((r) => r.actor_kind === 'member').length;

  const deletions = staffRows.filter((r) => r.action === 'purchase_deleted' || r.action === 'contact_deleted');
  const selected = params.actor ? people.find((p) => p.id === params.actor) : null;
  const detail = selected ? staffRows.filter((r) => r.actor_id === selected.id).slice(0, 300) : [];
  const href = (m: string, actor?: string) => `/reports/staff-activity?month=${m}${actor ? `&actor=${actor}` : ''}`;

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <Link href="/reports" className="text-xs text-teal-600 hover:text-teal-700">← Reports</Link>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">Staff activity</h1>
        <p className="mt-1 text-sm text-stone-500">
          What each staff login did in the CRM, taken from the audit trail. Each person needs their own login (Settings,
          Team) to show up here. Actions made before 9 Oct 2026 weren&apos;t recorded.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link href={href(shiftMonth(month, -1))} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100">←</Link>
        <span className="text-lg font-semibold text-stone-900">{monthLabel}</span>
        {month < thisMonth ? (
          <Link href={href(shiftMonth(month, 1))} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100">→</Link>
        ) : (
          <span className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-300">→</span>
        )}
      </div>

      {people.length === 0 ? (
        <p className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-500">
          No staff activity recorded for {monthLabel}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-2.5">Staff</th>
                <th className="px-3 py-2.5">Purchases added</th>
                <th className="px-3 py-2.5">Sales entered</th>
                <th className="px-3 py-2.5">Edited</th>
                <th className="px-3 py-2.5">Deleted</th>
                <th className="px-3 py-2.5">Session +/-</th>
                <th className="px-3 py-2.5">Members added</th>
                <th className="px-3 py-2.5">Notes logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {people.map((p) => (
                <tr key={p.id} className={p.id === selected?.id ? 'bg-teal-50' : ''}>
                  <td className="px-4 py-2.5 font-medium">
                    <Link href={href(month, p.id)} className="text-stone-900 hover:text-teal-600">{p.label}</Link>
                  </td>
                  <td className="px-3 py-2.5">{p.added}</td>
                  <td className="px-3 py-2.5">{money(p.sales)}</td>
                  <td className="px-3 py-2.5">{p.edited}</td>
                  <td className={`px-3 py-2.5 ${p.deleted + p.membersDeleted > 0 ? 'font-semibold text-rose-600' : ''}`}>
                    {p.deleted}{p.membersDeleted > 0 ? ` (+${p.membersDeleted} members)` : ''}
                  </td>
                  <td className="px-3 py-2.5">{p.adjusted}</td>
                  <td className="px-3 py-2.5">{p.membersAdded}</td>
                  <td className="px-3 py-2.5">{p.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-stone-400">
        Also recorded: {systemCount} automatic changes (payment confirmations and scheduled jobs) and {memberCount} made by members in the app. Not counted above.
        &ldquo;Sales entered&rdquo; adds up the amounts staff recorded paid, excluding complimentary items.
      </p>

      {deletions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-600">Deletions this month</h2>
          <ul className="divide-y divide-stone-100 rounded-xl border border-rose-200 bg-white">
            {deletions.map((r) => (
              <li key={r.id} className="px-4 py-2.5 text-sm">
                <span className="text-xs text-stone-500">{formatSGDateTime(r.created_at)}</span>{' '}
                <span className="font-medium text-stone-900">{r.actor_label}</span>: {r.summary}
              </li>
            ))}
          </ul>
        </section>
      )}

      {selected && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{selected.label}: what they did in {monthLabel}</h2>
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {detail.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2.5 text-sm">
                <span className="text-xs text-stone-500">{formatSGDateTime(r.created_at)}</span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{ACTION_LABEL[r.action] ?? r.action}</span>
                <span className="text-stone-800">{r.summary}</span>
                {r.contact_id && r.action !== 'contact_deleted' && (
                  <Link href={`/contacts/${r.contact_id}`} className="text-xs text-teal-600 hover:text-teal-700">open member</Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
