import Link from 'next/link';
import { differenceInDays } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { buildFollowUpCandidates } from '@/lib/followUps';
import { whatsappLink } from '@/lib/whatsapp';
import type { Contact, Purchase } from '@/lib/types';
import { markFollowedUp, unmarkFollowedUp } from './actions';

const WINDOW_OPTIONS = [
  { value: '1', label: 'Last 1 day' },
  { value: '3', label: 'Last 3 days' },
  { value: '7', label: 'Last 7 days' },
  { value: '15', label: 'Last half month' },
  { value: '30', label: 'Last month' },
];

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const { window } = await searchParams;
  const windowDays = WINDOW_OPTIONS.some((o) => o.value === window) ? Number(window) : 7;
  const supabase = await createClient();

  const [{ data: contacts }, { data: visits }, { data: purchases }, { data: completions }] = await Promise.all([
    supabase.from('contacts').select('*').returns<Contact[]>(),
    supabase.from('visits').select('id, contact_id, visit_date'),
    supabase.from('purchases').select('*').returns<Purchase[]>(),
    supabase.from('follow_up_completions').select('trigger_type, trigger_id'),
  ]);

  const completedSet = new Set((completions ?? []).map((c) => `${c.trigger_type}:${c.trigger_id}`));

  const candidates = buildFollowUpCandidates(contacts ?? [], visits ?? [], purchases ?? [])
    .filter((c) => differenceInDays(new Date(), new Date(c.triggerDate)) <= windowDays)
    .sort((a, b) => new Date(b.triggerDate).getTime() - new Date(a.triggerDate).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Follow-ups</h1>
        <p className="mt-1 text-sm text-stone-500">
          Anyone with a first visit or a used-up session pack — check in, then tick once you&apos;ve
          reached out.
        </p>
      </div>

      <form className="flex gap-3" method="get">
        <select
          name="window"
          defaultValue={String(windowDays)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
        >
          {WINDOW_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
        >
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-stone-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Done</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">WhatsApp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {candidates.map((c) => {
              const key = `${c.triggerType}:${c.triggerId}`;
              const isDone = completedSet.has(key);
              const toggleAction = isDone
                ? unmarkFollowedUp.bind(null, c.triggerType, c.triggerId)
                : markFollowedUp.bind(null, c.contact.id, c.triggerType, c.triggerId);
              const href = whatsappLink(
                c.contact.phone,
                `Hi ${c.contact.full_name.split(' ')[0]}, just checking in from Sochill Bath Club — how was your visit? 🧊`,
              );
              return (
                <tr key={key} className={isDone ? 'opacity-40' : 'hover:bg-stone-100'}>
                  <td className="px-4 py-2">
                    <form action={toggleAction}>
                      <button
                        aria-label={isDone ? 'Mark not followed up' : 'Mark followed up'}
                        className={`h-5 w-5 rounded border text-xs ${
                          isDone ? 'border-emerald-600 bg-emerald-100 text-emerald-700' : 'border-stone-300'
                        }`}
                      >
                        {isDone ? '✓' : ''}
                      </button>
                    </form>
                  </td>
                  <td className={`px-4 py-2 ${isDone ? 'text-stone-500 line-through' : 'text-stone-900'}`}>
                    <Link href={`/contacts/${c.contact.id}`} className="hover:text-teal-600">
                      {c.contact.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-stone-500">{c.reason}</td>
                  <td className="px-4 py-2 text-stone-500">{new Date(c.triggerDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                      >
                        Message
                      </a>
                    ) : (
                      <span className="text-xs text-stone-400">No phone</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!candidates.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-stone-400">
                  Nobody to follow up with in this window.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
