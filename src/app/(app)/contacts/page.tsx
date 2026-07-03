import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CONTACT_SOURCES, PIPELINE_STAGES, STAGE_BADGE_CLASSES } from '@/lib/constants';
import type { Contact, PipelineStage, ContactSource } from '@/lib/types';

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; source?: string; q?: string }>;
}) {
  const { stage, source, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from('contacts').select('*').order('created_at', { ascending: false });

  if (stage) query = query.eq('pipeline_stage', stage);
  if (source) query = query.eq('source', source);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data: contacts, error } = await query.returns<Contact[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Contacts</h1>
          <p className="mt-1 text-sm text-slate-400">{contacts?.length ?? 0} people</p>
        </div>
        <Link
          href="/contacts/new"
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
        >
          + Add contact
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name, email, phone"
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
        />
        <select
          name="stage"
          defaultValue={stage ?? ''}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">All stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          name="source"
          defaultValue={source ?? ''}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">All sources</option>
          {CONTACT_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Filter
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error.message}</p>}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {contacts?.map((c) => (
              <tr key={c.id} className="bg-slate-950 hover:bg-slate-900">
                <td className="px-4 py-3">
                  <Link href={`/contacts/${c.id}`} className="font-medium text-white hover:text-cyan-400">
                    {c.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  <div>{c.email}</div>
                  <div>{c.phone}</div>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {CONTACT_SOURCES.find((s) => s.value === (c.source as ContactSource))?.label}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${STAGE_BADGE_CLASSES[c.pipeline_stage as PipelineStage]}`}
                  >
                    {PIPELINE_STAGES.find((s) => s.value === c.pipeline_stage)?.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{c.tags?.join(', ')}</td>
              </tr>
            ))}
            {contacts?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No contacts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
