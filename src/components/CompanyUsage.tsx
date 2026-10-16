import Link from 'next/link';
import { formatSGDateTime } from '@/lib/format';

export interface CompanyMember {
  id: string;
  full_name: string;
  used: number;
  lastUsed: string | null;
}

export interface CompanyLogRow {
  id: string;
  created_at: string;
  delta: number;
  note: string | null;
  memberName: string | null;
  staffAdjusted: boolean;
}

// On a company account: who is on the team, how many sessions each person has used, and the log of every
// session taken from the company's pack.
export default function CompanyUsage({
  companyName,
  members,
  log,
  remaining,
  total,
}: {
  companyName: string;
  members: CompanyMember[];
  log: CompanyLogRow[];
  remaining: number | null;
  total: number | null;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-teal-200 bg-teal-50/40 p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Team sessions</h2>
        <p className="mt-1 text-sm text-stone-600">
          Tag a member with <span className="font-medium text-stone-900">{companyName}</span> and they use this account&apos;s pack when they check in.
          They still fill in the waiver themselves.
          {remaining !== null && total !== null && (
            <>
              {' '}
              <span className="font-medium text-stone-900">
                {remaining} of {total} sessions left.
              </span>
            </>
          )}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 text-stone-500">
            <tr>
              <th className="px-4 py-2 font-medium">Team member</th>
              <th className="px-4 py-2 text-right font-medium">Sessions used</th>
              <th className="px-4 py-2 text-right font-medium">Last used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2">
                  <Link href={`/contacts/${m.id}`} className="font-medium text-stone-900 hover:text-teal-600">
                    {m.full_name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right text-stone-900">{m.used}</td>
                <td className="px-4 py-2 text-right text-stone-500">{m.lastUsed ? formatSGDateTime(m.lastUsed) : '—'}</td>
              </tr>
            ))}
            {!members.length && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-stone-400">
                  Nobody is tagged {companyName} yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Session log</h3>
        <div className="mt-2 space-y-1">
          {log.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-2 text-sm">
              <span className="text-stone-800">
                <span className="font-medium">{r.delta < 0 ? '−' : '+'}{Math.abs(r.delta)}</span>{' '}
                {r.memberName ?? (r.staffAdjusted ? 'Staff adjustment' : 'No name recorded')}
                {r.note && <span className="text-stone-500"> · {r.note}</span>}
              </span>
              <span className="shrink-0 text-xs text-stone-500">{formatSGDateTime(r.created_at)}</span>
            </div>
          ))}
          {!log.length && <p className="text-sm text-stone-400">No sessions used yet.</p>}
        </div>
      </div>
    </section>
  );
}
