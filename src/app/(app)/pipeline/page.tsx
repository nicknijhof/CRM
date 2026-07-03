import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PIPELINE_STAGES } from '@/lib/constants';
import type { Contact, PipelineStage } from '@/lib/types';
import { updateStage } from '../contacts/actions';

export default async function PipelinePage() {
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .order('updated_at', { ascending: false })
    .returns<Contact[]>();

  const byStage = PIPELINE_STAGES.map((stage) => ({
    stage,
    contacts: contacts?.filter((c) => c.pipeline_stage === stage.value) ?? [],
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Pipeline</h1>
      <p className="mt-1 text-sm text-slate-400">
        Click the arrows on a card to move a contact forward or back a stage.
      </p>

      <div className="mt-6 grid grid-cols-6 gap-3">
        {byStage.map(({ stage, contacts: stageContacts }, columnIndex) => (
          <div key={stage.value} className="rounded-xl border border-slate-800 bg-slate-900/50">
            <div className="border-b border-slate-800 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{stage.label}</p>
              <p className="text-xs text-slate-500">{stageContacts.length}</p>
            </div>
            <div className="space-y-2 p-2">
              {stageContacts.map((c) => {
                const prevStage = PIPELINE_STAGES[columnIndex - 1]?.value;
                const nextStage = PIPELINE_STAGES[columnIndex + 1]?.value;
                return (
                  <div key={c.id} className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs">
                    <Link href={`/contacts/${c.id}`} className="font-medium text-white hover:text-cyan-400">
                      {c.full_name}
                    </Link>
                    <p className="mt-0.5 truncate text-slate-500">{c.email || c.phone}</p>
                    <div className="mt-2 flex justify-between">
                      {prevStage ? (
                        <form action={updateStage.bind(null, c.id, prevStage as PipelineStage)}>
                          <button className="text-slate-400 hover:text-white">← back</button>
                        </form>
                      ) : (
                        <span />
                      )}
                      {nextStage ? (
                        <form action={updateStage.bind(null, c.id, nextStage as PipelineStage)}>
                          <button className="text-cyan-400 hover:text-cyan-300">forward →</button>
                        </form>
                      ) : (
                        <span />
                      )}
                    </div>
                  </div>
                );
              })}
              {!stageContacts.length && <p className="px-1 py-2 text-xs text-slate-600">Empty</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
