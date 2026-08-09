import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addInteraction, deleteContact, updateContact, updateStage } from '../actions';
import {
  addPurchase,
  adjustSessions,
  cancelPurchase,
  pauseMembership,
  resumeMembership,
  updatePayment,
} from '../purchase-actions';
import {
  INTERACTION_CHANNELS,
  PAYMENT_METHODS,
  PIPELINE_STAGES,
  PURCHASE_STATUS_BADGE_CLASSES,
  SERVICES,
  STAGE_BADGE_CLASSES,
} from '@/lib/constants';
import { effectivePurchaseStatus, expiryLabel } from '@/lib/purchases';
import { paymentStatus, remainingBalance } from '@/lib/payments';
import { canManagePurchases, getCurrentRole } from '@/lib/profile';
import { formatSGDateTime } from '@/lib/format';
import type { Contact, DiscountCode, Interaction, Product, Purchase, PipelineStage, Visit } from '@/lib/types';
import PurchaseFields from '@/components/PurchaseFields';
import ContactSidebar from '@/components/ContactSidebar';

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
  ]);

  if (!contact) notFound();

  const giftCodes = (purchases ?? []).flatMap((p) => (p.is_gift && p.gift_code ? [p.gift_code] : []));
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

  return (
    <div className="max-w-6xl">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <aside className="lg:order-2 lg:col-span-1">
          <div className="lg:sticky lg:top-8">
            <ContactSidebar contact={contact} updateContact={updateContactWithId} deleteContact={deleteContactWithId} />
          </div>
        </aside>

        <div className="space-y-8 lg:order-1 lg:col-span-2">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Pipeline stage</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {PIPELINE_STAGES.map((s) => (
                <form key={s.value} action={updateStage.bind(null, id, s.value as PipelineStage)}>
                  <button
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      contact.pipeline_stage === s.value
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

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Purchases</h2>
            {canEditPurchases && (
              <form action={addPurchaseWithId} className="mt-3 space-y-3 rounded-xl border border-stone-200 p-4">
                <PurchaseFields
                  products={products ?? []}
                  discountCodes={discountCodes ?? []}
                  defaultDate={new Date().toISOString().slice(0, 10)}
                />
                <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                  Add purchase
                </button>
              </form>
            )}

            <div className="mt-3 space-y-2">
              {purchases?.length ? (
                purchases.map((p) => {
                  const status = effectivePurchaseStatus(p);
                  const giftCodeInfo = p.gift_code ? giftCodeStatusByCode.get(p.gift_code) : undefined;
                  const isGiftRedeemed = Boolean(giftCodeInfo?.redeemed_at);
                  const isGiftCodeMissing = Boolean(p.is_gift && p.gift_code && !giftCodeInfo);
                  return (
                    <div
                      key={p.id}
                      className={`rounded-lg border border-stone-200 px-4 py-3 text-sm ${
                        status === 'used_up' || status === 'cancelled' ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-stone-900">{p.name}</p>
                          <p className="text-stone-500">
                            Purchased {p.purchase_date}
                            {p.expiry_date && ` · ${expiryLabel(p.item_type)} ${p.expiry_date}`}
                            {p.price !== null &&
                              (p.discount_amount > 0 ? (
                                <>
                                  {' · '}
                                  <span className="line-through">${p.list_price}</span> ${p.price}
                                  {p.discount_label && ` (${p.discount_label})`}
                                </>
                              ) : (
                                ` · $${p.price}`
                              ))}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${PURCHASE_STATUS_BADGE_CLASSES[status]}`}
                        >
                          {status.replace('_', ' ')}
                        </span>
                      </div>

                      {p.is_gift && isGiftRedeemed && (
                        <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                          <p>
                            ✅ Redeemed by {p.gift_recipient_email}
                            {giftCodeInfo?.redeemed_at && ` on ${formatSGDateTime(giftCodeInfo.redeemed_at)}`}
                          </p>
                        </div>
                      )}

                      {p.is_gift && !isGiftRedeemed && (
                        <div className="mt-2 rounded-lg bg-stone-100 px-3 py-2">
                          <p className="text-stone-500">
                            🎁 Gift for <span className="text-stone-900">{p.gift_recipient_email}</span>
                          </p>
                          {isGiftCodeMissing ? (
                            <p className="mt-1 text-xs text-rose-600">
                              The discount code for this gift was removed from Discounts, so it can no longer be
                              redeemed as-is. Use &quot;Remove gift card&quot; below to clean this up, or create a new
                              code for the recipient.
                            </p>
                          ) : (
                            <>
                              <p className="mt-1">
                                Code:{' '}
                                <code className="rounded bg-stone-200 px-2 py-0.5 text-teal-700">{p.gift_code}</code>
                              </p>
                              <p className="mt-1 text-xs text-stone-500">
                                Copy this and send it to them yourself. When they redeem it, add a purchase on their
                                contact page for the matching item and apply this code — it&apos;ll be marked redeemed
                                automatically once used.
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      {p.sessions_total !== null && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-stone-700">
                            {p.sessions_remaining} of {p.sessions_total} sessions left
                          </span>
                          {canEditPurchases && (
                            <>
                              <form action={adjustSessions.bind(null, p.id, id, -1)}>
                                <button
                                  className="rounded border border-stone-300 px-2 py-0.5 text-xs text-stone-700 hover:bg-stone-100"
                                  disabled={(p.sessions_remaining ?? 0) <= 0}
                                >
                                  −1
                                </button>
                              </form>
                              <form action={adjustSessions.bind(null, p.id, id, 1)}>
                                <button className="rounded border border-stone-300 px-2 py-0.5 text-xs text-stone-700 hover:bg-stone-100">
                                  +1
                                </button>
                              </form>
                            </>
                          )}
                        </div>
                      )}

                      {p.price !== null && p.price > 0 && (
                        <div className="mt-2 text-xs">
                          <span
                            className={
                              paymentStatus(p) === 'paid'
                                ? 'text-emerald-600'
                                : paymentStatus(p) === 'partial'
                                  ? 'text-amber-600'
                                  : 'text-rose-600'
                            }
                          >
                            Paid ${p.amount_paid} of ${p.price} — ${remainingBalance(p.price, p.amount_paid)} remaining
                          </span>
                        </div>
                      )}

                      {canEditPurchases && p.price !== null && p.price > 0 && (
                        <form
                          action={updatePayment.bind(null, p.id, id)}
                          className="mt-2 flex flex-wrap items-end gap-2 text-xs"
                        >
                          <select
                            name="payment_method"
                            defaultValue={p.payment_method ?? 'cash'}
                            className="rounded border border-stone-300 bg-white px-2 py-1 text-stone-700"
                          >
                            {PAYMENT_METHODS.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                          <input
                            name="amount_paid"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={p.amount_paid}
                            className="w-20 rounded border border-stone-300 bg-white px-2 py-1 text-stone-700"
                          />
                          <button className="rounded border border-stone-300 px-2 py-1 text-stone-700 hover:bg-stone-100">
                            Update payment
                          </button>
                        </form>
                      )}

                      {canEditPurchases &&
                        (p.item_type === 'membership' || p.item_type === 'trial' || p.item_type === 'gift_card') &&
                        status !== 'cancelled' && (
                          <form action={cancelPurchase.bind(null, p.id, id)} className="mt-2">
                            <button className="text-xs text-rose-600 underline hover:text-rose-700">
                              {p.item_type === 'trial'
                                ? 'Cancel trial'
                                : p.item_type === 'gift_card'
                                  ? 'Remove gift card'
                                  : 'Cancel membership'}
                            </button>
                          </form>
                        )}

                      {canEditPurchases && p.item_type === 'membership' && (
                        <div className="mt-3 border-t border-stone-200 pt-3">
                          {p.is_paused ? (
                            <div className="space-y-2">
                              <p className="text-stone-700">
                                <span className="font-medium text-stone-900">Paused</span>
                                {p.pause_reason && ` — ${p.pause_reason}`}
                              </p>
                              <p className="text-xs text-stone-500">
                                Paused since {p.pause_started_at} · Resumes {p.pause_resume_date ?? 'Indefinite'}
                              </p>
                              <form action={resumeMembership.bind(null, p.id, id)}>
                                <button className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100">
                                  Resume membership
                                </button>
                              </form>
                            </div>
                          ) : (
                            <form action={pauseMembership.bind(null, p.id, id)} className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                                Pause membership
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs text-stone-500">Pause from</label>
                                  <input
                                    name="pause_from"
                                    type="date"
                                    defaultValue={new Date().toISOString().slice(0, 10)}
                                    className="mt-0.5 w-full rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-stone-500">Resume on</label>
                                  <input
                                    name="pause_until"
                                    type="date"
                                    className="mt-0.5 w-full rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700"
                                  />
                                  <p className="mt-0.5 text-[11px] text-stone-400">Leave blank for indefinite</p>
                                </div>
                              </div>
                              <textarea
                                name="pause_reason"
                                rows={2}
                                placeholder="Reason (optional)"
                                className="w-full rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700"
                              />
                              <button className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100">
                                Pause membership
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-stone-500">No purchases yet.</p>
              )}
            </div>
          </section>

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

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Interaction log</h2>
            <form action={addInteractionWithId} className="mt-3 flex gap-2 rounded-xl border border-stone-200 p-4">
              <select
                name="channel"
                defaultValue="dm"
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
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
                className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
              />
              <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                Log
              </button>
            </form>
            <div className="mt-4 space-y-3">
              {interactions?.map((i) => (
                <div key={i.id} className="rounded-lg border border-stone-200 px-4 py-3 text-sm">
                  <div className="flex justify-between text-stone-500">
                    <span className="uppercase tracking-wide">{i.channel}</span>
                    <span>{formatSGDateTime(i.created_at)}</span>
                  </div>
                  <p className="mt-1 text-stone-700">{i.note}</p>
                </div>
              ))}
              {!interactions?.length && <p className="text-sm text-stone-500">No interactions logged yet.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
