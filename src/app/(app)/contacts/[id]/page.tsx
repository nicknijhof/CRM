import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addInteraction, deleteContact, updateContact, updateMarketingPrefs, updateStage } from '../actions';
import {
  addPurchase,
  adjustSessions,
  cancelPurchase,
  pauseMembership,
  resumeMembership,
  scheduleCancellation,
  unscheduleCancellation,
  updatePayment,
} from '../purchase-actions';
import { INTERACTION_CHANNELS, PIPELINE_STAGES, SERVICES, STAGE_BADGE_CLASSES } from '@/lib/constants';
import { canManagePurchases, getCurrentRole } from '@/lib/profile';
import { reconcileScheduledCancellations } from '@/lib/scheduledCancellations';
import { classifyFunnelStage, isLowerTierMembership } from '@/lib/funnel';
import { effectivePurchaseStatus } from '@/lib/purchases';
import { formatSGDateTime } from '@/lib/format';
import { WAIVER_VERSION } from '@/lib/waiver';
import type { Contact, DiscountCode, Interaction, Product, Purchase, PipelineStage, Visit } from '@/lib/types';
import ContactSidebar from '@/components/ContactSidebar';
import MemberQuickPanels from '@/components/MemberQuickPanels';
import CurrentMemberships from '@/components/CurrentMemberships';

function visitLabel(service: Visit['service']): string {
  if (service === 'other') return 'Checked in';
  return SERVICES.find((s) => s.value === service)?.label ?? service;
}

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  const canEditPurchases = canManagePurchases(role);

  const [
    { data: contact },
    { data: purchases },
    { data: products },
    { data: discountCodes },
    { data: visits },
    { data: interactions },
    { data: waiverAcceptance },
    { data: latestGoalReflection },
  ] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', id).single<Contact>(),
    supabase
      .from('purchases')
      .select('*')
      .eq('contact_id', id)
      .order('purchase_date', { ascending: false })
      .returns<Purchase[]>(),
    supabase.from('products').select('*').eq('is_active', true).order('sort_order').returns<Product[]>(),
    supabase.from('discount_codes').select('*').eq('is_active', true).order('code').returns<DiscountCode[]>(),
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
    supabase
      .from('waiver_acceptances')
      .select('accepted_at')
      .eq('contact_id', id)
      .eq('waiver_version', WAIVER_VERSION)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('session_logs')
      .select('goal_reflection, logged_date')
      .eq('contact_id', id)
      .not('goal_reflection', 'is', null)
      .order('logged_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!contact) notFound();

  // Lazily cancel anything whose scheduled cancellation date has arrived
  // (and its Stripe subscription, if any) — there's no cron in this app, so
  // this reconciles whenever the member's page is viewed.
  const { cancelledPurchaseIds, churnedContactIds } = await reconcileScheduledCancellations(
    supabase,
    purchases ?? [],
  );
  const cancelledSet = new Set(cancelledPurchaseIds);
  const effectivePurchases: Purchase[] = (purchases ?? []).map((p) =>
    cancelledSet.has(p.id)
      ? { ...p, status: 'cancelled', cancelled_at: new Date().toISOString(), scheduled_cancellation_date: null }
      : p,
  );
  const effectiveContact: Contact = churnedContactIds.includes(contact.id)
    ? { ...contact, pipeline_stage: 'churned' }
    : contact;

  const funnelStage = classifyFunnelStage(effectivePurchases);
  const activeLowerTierMembership = effectivePurchases.find(
    (p) => isLowerTierMembership(p) && effectivePurchaseStatus(p) === 'active',
  );

  const giftCodes = effectivePurchases.flatMap((p) => (p.is_gift && p.gift_code ? [p.gift_code] : []));
  const { data: giftCodeRows } = giftCodes.length
    ? await supabase
        .from('discount_codes')
        .select('code, redeemed_at')
        .in('code', giftCodes)
        .returns<Pick<DiscountCode, 'code' | 'redeemed_at'>[]>()
    : { data: [] };
  const giftCodeStatusByCode = new Map((giftCodeRows ?? []).map((r) => [r.code, r]));

  const updateContactWithId = updateContact.bind(null, id);
  const addInteractionWithId = addInteraction.bind(null, id);
  const deleteContactWithId = deleteContact.bind(null, id);
  const addPurchaseWithId = addPurchase.bind(null, id);
  const updateMarketingPrefsWithId = updateMarketingPrefs.bind(null, id);

  return (
    <div className="max-w-6xl">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <aside className="lg:order-2 lg:col-span-1">
          <div className="space-y-6 lg:sticky lg:top-8">
            <ContactSidebar
              contact={effectiveContact}
              waiverSigned={!!waiverAcceptance}
              updateContact={updateContactWithId}
              deleteContact={deleteContactWithId}
              latestGoalReflection={latestGoalReflection?.goal_reflection ?? null}
              funnelStage={funnelStage}
              upgradeOpportunity={activeLowerTierMembership?.name ?? null}
            />

            <section className="rounded-xl border border-stone-200 bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Interaction log</h2>
              <form action={addInteractionWithId} className="mt-3 space-y-2">
                <select
                  name="channel"
                  defaultValue="dm"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
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
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
                />
                <button className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                  Log
                </button>
              </form>
              <div className="mt-4 space-y-3">
                {interactions?.map((i) => (
                  <div key={i.id} className="rounded-lg border border-stone-200 px-3 py-2 text-sm">
                    <div className="flex justify-between text-stone-500">
                      <span className="text-xs uppercase tracking-wide">{i.channel}</span>
                      <span className="text-xs">{formatSGDateTime(i.created_at)}</span>
                    </div>
                    <p className="mt-1 text-stone-700">{i.note}</p>
                  </div>
                ))}
                {!interactions?.length && <p className="text-sm text-stone-400">No interactions logged yet.</p>}
              </div>
            </section>
          </div>
        </aside>

        <div className="space-y-8 lg:order-1 lg:col-span-2">
          <MemberQuickPanels
            contact={effectiveContact}
            purchases={effectivePurchases}
            canEdit={canEditPurchases}
            updateMarketingPrefs={updateMarketingPrefsWithId}
          />

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Pipeline stage</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {PIPELINE_STAGES.map((s) => (
                <form key={s.value} action={updateStage.bind(null, id, s.value as PipelineStage)}>
                  <button
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      effectiveContact.pipeline_stage === s.value
                        ? STAGE_BADGE_CLASSES[s.value]
                        : 'bg-stone-200 text-stone-500 hover:bg-stone-300'
                    }`}
                  >
                    {s.label}
                  </button>
                </form>
              ))}
            </div>
          </section>

          <CurrentMemberships
            contact={effectiveContact}
            purchases={effectivePurchases}
            products={products ?? []}
            discountCodes={discountCodes ?? []}
            giftCodeStatusByCode={giftCodeStatusByCode}
            canEdit={canEditPurchases}
            addPurchase={addPurchaseWithId}
            adjustSessions={adjustSessions}
            cancelPurchase={cancelPurchase}
            scheduleCancellation={scheduleCancellation}
            unscheduleCancellation={unscheduleCancellation}
            pauseMembership={pauseMembership}
            resumeMembership={resumeMembership}
            updatePayment={updatePayment}
          />

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Recent visits ({visits?.length ?? 0})
            </h2>
            <div className="mt-3 space-y-1">
              {visits?.length ? (
                visits.map((v) => (
                  <div key={v.id} className="flex justify-between rounded-lg px-4 py-2 text-sm hover:bg-stone-100">
                    <span className="text-stone-700">{visitLabel(v.service)}</span>
                    <span className="text-stone-500">{formatSGDateTime(v.visit_date)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-500">No visits imported yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
