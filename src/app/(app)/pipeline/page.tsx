import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PIPELINE_STAGES } from '@/lib/constants';
import { contactsNeedingStageReconciliation, groupPurchasesByContact } from '@/lib/pipelineSync';
import type { Contact, Purchase, PipelineStage } from '@/lib/types';
import { updateStage } from '../contacts/actions';

export default async function PipelinePage() {
  const supabase = await createClient();
  const [{ data: contacts }, { data: purchases }] = await Promise.all([
    supabase.from('contacts').select('*').order('updated_at', { ascending: false }).returns<Contact[]>(),
    supabase.from('purchases').select('*').returns<Purchase[]>(),
  ]);

  const allContacts = contacts ?? [];
  const purchasesByContact = groupPurchasesByContact(purchases ?? []);

  // Lazily move anyone whose purchases have all lapsed off the active board
  // — there's no cron in this app, so this reconciles on each view. Expired
  // packs/trials go to Expired; a membership that's ended goes to Cancelled.
  const { stageReconciliations, purchaseCancellations } = contactsNeedingStageReconciliation(
    allContacts,
    purchasesByContact
  );
  if (stageReconciliations.length) {
    const lapsedIds = stageReconciliations.filter((r) => r.stage === 'lapsed').map((r) => r.contactId);
    const churnedIds = stageReconciliations.filter((r) => r.stage === 'churned').map((r) => r.contactId);
    await Promise.all([
      lapsedIds.length
        ? supabase.from('contacts').update({ pipeline_stage: 'lapsed' }).in('id', lapsedIds)
        : Promise.resolve(),
      churnedIds.length
        ? supabase.from('contacts').update({ pipeline_stage: 'churned' }).in('id', churnedIds)
        : Promise.resolve(),
    ]);
  }
  if (purchaseCancellations.length) {
    await Promise.all(
      purchaseCancellations.map((c) =>
        supabase.from('purchases').update({ status: 'cancelled', cancelled_at: c.cancelledAt }).eq('id', c.purchaseId)
      )
    );
  }
  const stageByContactId = new Map(stageReconciliations.map((r) => [r.contactId, r.stage]));

  const byStage = PIPELINE_STAGES.map((stage) => ({
    stage,
    contacts: allContacts.filter((c) => {
      const reconciledStage = stageByContactId.get(c.id);
      return reconciledStage ? reconciledStage === stage.value : c.pipeline_stage === stage.value;
    }),
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Pipeline</h1>
      <p className="mt-1 text-sm text-stone-500">
        Click the arrows on a card to move a contact forward or back a stage.
      </p>

      <div className="mt-6 grid grid-cols-6 gap-3">
        {byStage.map(({ stage, contacts: stageContacts }, columnIndex) => (
          <div key={stage.value} className="rounded-xl border border-stone-200 bg-stone-100">
            <div className="border-b border-stone-200 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">{stage.label}</p>
              <p className="text-xs text-stone-400">{stageContacts.length}</p>
            </div>
            <div className="space-y-2 p-2">
              {stageContacts.map((c) => {
                const prevStage = PIPELINE_STAGES[columnIndex - 1]?.value;
                const nextStage = PIPELINE_STAGES[columnIndex + 1]?.value;
                return (
                  <div key={c.id} className="rounded-lg border border-stone-200 bg-white p-2 text-xs">
                    <Link href={`/contacts/${c.id}`} className="font-medium text-stone-900 hover:text-teal-600">
                      {c.full_name}
                    </Link>
                    <p className="mt-0.5 truncate text-stone-400">{c.email || c.phone}</p>
                    <div className="mt-2 flex justify-between">
                      {prevStage ? (
                        <form action={updateStage.bind(null, c.id, prevStage as PipelineStage)}>
                          <button className="text-stone-400 hover:text-stone-900">← back</button>
                        </form>
                      ) : (
                        <span />
                      )}
                      {nextStage ? (
                        <form action={updateStage.bind(null, c.id, nextStage as PipelineStage)}>
                          <button className="text-teal-600 hover:text-teal-700">forward →</button>
                        </form>
                      ) : (
                        <span />
                      )}
                    </div>
                  </div>
                );
              })}
              {!stageContacts.length && <p className="px-1 py-2 text-xs text-stone-400">Empty</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
