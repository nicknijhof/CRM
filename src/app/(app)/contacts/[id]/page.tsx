import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addInteraction, deleteContact, updateContact, updateStage } from '../actions';
import {
  CONTACT_SOURCES,
  INTERACTION_CHANNELS,
  PIPELINE_STAGES,
  STAGE_BADGE_CLASSES,
} from '@/lib/constants';
import type { Contact, Interaction, Membership, PipelineStage, Visit } from '@/lib/types';
import { format } from 'date-fns';

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: contact }, { data: memberships }, { data: visits }, { data: interactions }] =
    await Promise.all([
      supabase.from('contacts').select('*').eq('id', id).single<Contact>(),
      supabase
        .from('memberships')
        .select('*')
        .eq('contact_id', id)
        .order('start_date', { ascending: false })
        .returns<Membership[]>(),
      supabase
        .from('visits')
        .select('*')
        .eq('contact_id', id)
        .order('visit_date', { ascending: false })
        .limit(20)
        .returns<Visit[]>(),
      supabase
        .from('interactions')
        .select('*')
        .eq('contact_id', id)
        .order('created_at', { ascending: false })
        .returns<Interaction[]>(),
    ]);

  if (!contact) notFound();

  const updateContactWithId = updateContact.bind(null, id);
  const addInteractionWithId = addInteraction.bind(null, id);
  const deleteContactWithId = deleteContact.bind(null, id);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{contact.full_name}</h1>
          <span
            className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${STAGE_BADGE_CLASSES[contact.pipeline_stage]}`}
          >
            {PIPELINE_STAGES.find((s) => s.value === contact.pipeline_stage)?.label}
          </span>
        </div>
        <form action={deleteContactWithId}>
          <button className="text-xs text-red-400 underline hover:text-red-300">Delete contact</button>
        </form>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Pipeline stage</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PIPELINE_STAGES.map((s) => (
            <form key={s.value} action={updateStage.bind(null, id, s.value as PipelineStage)}>
              <button
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  contact.pipeline_stage === s.value
                    ? STAGE_BADGE_CLASSES[s.value]
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {s.label}
              </button>
            </form>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Details</h2>
        <form action={updateContactWithId} className="mt-3 grid grid-cols-2 gap-4 rounded-xl border border-slate-800 p-4">
          <Field label="Full name" name="full_name" defaultValue={contact.full_name} required />
          <Field label="Email" name="email" defaultValue={contact.email ?? ''} type="email" />
          <Field label="Phone" name="phone" defaultValue={contact.phone ?? ''} />
          <div>
            <label className="block text-sm text-slate-300">Source</label>
            <select
              name="source"
              defaultValue={contact.source}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            >
              {CONTACT_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-slate-300">Tags (comma separated)</label>
            <input
              name="tags"
              defaultValue={contact.tags?.join(', ')}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-slate-300">Notes</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={contact.notes ?? ''}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </div>
          <div className="col-span-2">
            <button className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400">
              Save details
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Memberships</h2>
        <div className="mt-3 space-y-2">
          {memberships?.length ? (
            memberships.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{m.plan_name}</p>
                  <p className="text-slate-400">
                    {m.start_date ?? '—'} to {m.end_date ?? '—'}
                  </p>
                </div>
                <span className="text-slate-300">{m.status}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No memberships imported yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Recent visits ({visits?.length ?? 0})
        </h2>
        <div className="mt-3 space-y-1">
          {visits?.length ? (
            visits.map((v) => (
              <div key={v.id} className="flex justify-between rounded-lg px-4 py-2 text-sm hover:bg-slate-900">
                <span className="text-slate-300">{v.service}</span>
                <span className="text-slate-500">{format(new Date(v.visit_date), 'PP p')}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No visits imported yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Interaction log</h2>
        <form action={addInteractionWithId} className="mt-3 flex gap-2 rounded-xl border border-slate-800 p-4">
          <select
            name="channel"
            defaultValue="dm"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            {INTERACTION_CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            name="note"
            required
            placeholder="What happened?"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          <button className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400">
            Log
          </button>
        </form>
        <div className="mt-4 space-y-3">
          {interactions?.map((i) => (
            <div key={i.id} className="rounded-lg border border-slate-800 px-4 py-3 text-sm">
              <div className="flex justify-between text-slate-500">
                <span className="uppercase tracking-wide">{i.channel}</span>
                <span>{format(new Date(i.created_at), 'PP p')}</span>
              </div>
              <p className="mt-1 text-slate-200">{i.note}</p>
            </div>
          ))}
          {!interactions?.length && <p className="text-sm text-slate-500">No interactions logged yet.</p>}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-300">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-500"
      />
    </div>
  );
}
