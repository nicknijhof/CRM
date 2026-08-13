'use client';

import { useState } from 'react';
import { CreditCard, History, Megaphone, Plus, Repeat } from 'lucide-react';
import { PAYMENT_METHODS, PURCHASE_STATUS_BADGE_CLASSES } from '@/lib/constants';
import { effectivePurchaseStatus, expiryLabel } from '@/lib/purchases';
import { paymentStatus, remainingBalance } from '@/lib/payments';
import { formatSGDateTime } from '@/lib/format';
import {
  removePaymentMethod,
  chargeSavedCard,
  createMembershipSubscription,
} from '@/app/(app)/contacts/payment-actions';
import AddPaymentMethodForm from './AddPaymentMethodForm';
import PurchaseFields from './PurchaseFields';
import type { Contact, DiscountCode, Product, Purchase } from '@/lib/types';

type PanelKey = 'payment_history' | 'payment_method' | 'marketing_prefs' | 'current_memberships';

const PANELS: { key: PanelKey; label: string; icon: typeof History }[] = [
  { key: 'payment_history', label: 'Payment history', icon: History },
  { key: 'payment_method', label: 'Payment method', icon: CreditCard },
  { key: 'marketing_prefs', label: 'Marketing prefs', icon: Megaphone },
  { key: 'current_memberships', label: 'Current memberships', icon: Repeat },
];

interface GiftCodeInfo {
  code: string;
  redeemed_at: string | null;
}

export default function MemberQuickPanels({
  contact,
  purchases,
  products,
  discountCodes,
  giftCodeStatusByCode,
  canEdit,
  updateMarketingPrefs,
  addPurchase,
  adjustSessions,
  cancelPurchase,
  pauseMembership,
  resumeMembership,
  updatePayment,
}: {
  contact: Contact;
  purchases: Purchase[];
  products: Product[];
  discountCodes: DiscountCode[];
  giftCodeStatusByCode: Map<string, GiftCodeInfo>;
  canEdit: boolean;
  updateMarketingPrefs: (formData: FormData) => Promise<void>;
  addPurchase: (formData: FormData) => Promise<void>;
  adjustSessions: (purchaseId: string, contactId: string, delta: number) => Promise<void>;
  cancelPurchase: (purchaseId: string, contactId: string) => Promise<void>;
  pauseMembership: (purchaseId: string, contactId: string, formData: FormData) => Promise<void>;
  resumeMembership: (purchaseId: string, contactId: string) => Promise<void>;
  updatePayment: (purchaseId: string, contactId: string, formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState<PanelKey | null>(null);
  const [addingCard, setAddingCard] = useState(false);
  const [addingPurchase, setAddingPurchase] = useState(false);
  const hasCard = Boolean(contact.stripe_payment_method_id);

  const paidPurchases = [...purchases]
    .filter((p) => p.price !== null && p.price > 0)
    .sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1));

  const currentHoldings = [...purchases].sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PANELS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setOpen(open === key ? null : key)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              open === key
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-stone-300 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {open && (
        <div className="mt-3 rounded-xl border border-stone-200 bg-white p-4">
          {open === 'payment_history' && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-stone-700">Payment history</h3>
              {paidPurchases.length ? (
                <div className="space-y-1.5">
                  {paidPurchases.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-stone-900">{p.name}</p>
                        <p className="text-xs text-stone-500">
                          {p.purchase_date} · {p.payment_method ?? 'no method recorded'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-stone-900">${p.amount_paid}</p>
                        <p
                          className={`text-xs ${
                            paymentStatus(p) === 'paid'
                              ? 'text-emerald-600'
                              : paymentStatus(p) === 'partial'
                                ? 'text-amber-600'
                                : 'text-rose-600'
                          }`}
                        >
                          {paymentStatus(p)} of ${p.price}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-400">No paid purchases yet.</p>
              )}
            </div>
          )}

          {open === 'payment_method' && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-stone-700">Payment method</h3>

              {hasCard ? (
                <div className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2">
                  <p className="text-sm text-stone-700">
                    <span className="font-medium capitalize">{contact.card_brand}</span> •••• {contact.card_last4}
                  </p>
                  {canEdit && (
                    <form action={removePaymentMethod.bind(null, contact.id)}>
                      <button className="text-xs text-rose-600 underline hover:text-rose-700">Remove</button>
                    </form>
                  )}
                </div>
              ) : addingCard ? (
                <AddPaymentMethodForm contactId={contact.id} onSaved={() => setAddingCard(false)} />
              ) : (
                <>
                  <p className="text-sm text-stone-500">No card on file for this member.</p>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setAddingCard(true)}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
                    >
                      + Add payment method
                    </button>
                  )}
                </>
              )}

              <p className="text-xs text-stone-400">
                A saved card can be charged for a monthly membership (via Stripe auto-billing) or for a new session pack
                — both need an explicit action from a staff member, nothing charges automatically without one.
              </p>
            </div>
          )}

          {open === 'marketing_prefs' && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-stone-700">Marketing prefs</h3>
              <form action={updateMarketingPrefs} className="space-y-2">
                <PrefCheckbox
                  name="marketing_sms_opt_in"
                  label="SMS"
                  defaultChecked={contact.marketing_sms_opt_in}
                  disabled={!canEdit}
                />
                <PrefCheckbox
                  name="marketing_email_opt_in"
                  label="Email"
                  defaultChecked={contact.marketing_email_opt_in}
                  disabled={!canEdit}
                />
                <PrefCheckbox
                  name="marketing_whatsapp_opt_in"
                  label="WhatsApp"
                  defaultChecked={contact.marketing_whatsapp_opt_in}
                  disabled={!canEdit}
                />
                {canEdit && (
                  <button className="mt-2 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700">
                    Save prefs
                  </button>
                )}
              </form>
            </div>
          )}

          {open === 'current_memberships' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-700">Current memberships</h3>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setAddingPurchase((v) => !v)}
                    aria-label="Add purchase"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-stone-100"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {addingPurchase && canEdit && (
                <form
                  action={async (formData) => {
                    await addPurchase(formData);
                    setAddingPurchase(false);
                  }}
                  className="space-y-3 rounded-xl border border-stone-200 p-4"
                >
                  <PurchaseFields
                    products={products}
                    discountCodes={discountCodes}
                    defaultDate={new Date().toISOString().slice(0, 10)}
                  />
                  <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                    Add purchase
                  </button>
                </form>
              )}

              {currentHoldings.length ? (
                <div className="space-y-2">
                  {currentHoldings.map((p) => {
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
                            {canEdit && (
                              <>
                                <form action={adjustSessions.bind(null, p.id, contact.id, -1)}>
                                  <button
                                    className="rounded border border-stone-300 px-2 py-0.5 text-xs text-stone-700 hover:bg-stone-100"
                                    disabled={(p.sessions_remaining ?? 0) <= 0}
                                  >
                                    −1
                                  </button>
                                </form>
                                <form action={adjustSessions.bind(null, p.id, contact.id, 1)}>
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
                              Paid ${p.amount_paid} of ${p.price} — ${remainingBalance(p.price, p.amount_paid)}{' '}
                              remaining
                            </span>
                          </div>
                        )}

                        {canEdit && p.price !== null && p.price > 0 && (
                          <form
                            action={updatePayment.bind(null, p.id, contact.id)}
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

                        {canEdit &&
                          contact.stripe_payment_method_id &&
                          p.item_type !== 'membership' &&
                          p.price !== null &&
                          remainingBalance(p.price, p.amount_paid) > 0 && (
                            <form action={chargeSavedCard.bind(null, p.id, contact.id)} className="mt-2">
                              <button className="rounded border border-teal-300 bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100">
                                Charge ${remainingBalance(p.price, p.amount_paid)} to card on file
                              </button>
                            </form>
                          )}

                        {canEdit && p.item_type === 'membership' && contact.stripe_payment_method_id && (
                          <div className="mt-2">
                            {p.stripe_subscription_id ? (
                              <span className="text-xs font-medium text-emerald-600">
                                ✓ Auto-billing active via Stripe
                              </span>
                            ) : (
                              <form action={createMembershipSubscription.bind(null, p.id, contact.id)}>
                                <button className="rounded border border-teal-300 bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100">
                                  Set up auto-billing via Stripe
                                </button>
                              </form>
                            )}
                          </div>
                        )}

                        {canEdit &&
                          (p.item_type === 'membership' || p.item_type === 'trial' || p.item_type === 'gift_card') &&
                          status !== 'cancelled' && (
                            <form action={cancelPurchase.bind(null, p.id, contact.id)} className="mt-2">
                              <button className="text-xs text-rose-600 underline hover:text-rose-700">
                                {p.item_type === 'trial'
                                  ? 'Cancel trial'
                                  : p.item_type === 'gift_card'
                                    ? 'Remove gift card'
                                    : 'Cancel membership'}
                              </button>
                            </form>
                          )}

                        {canEdit && p.item_type === 'membership' && (
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
                                <form action={resumeMembership.bind(null, p.id, contact.id)}>
                                  <button className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100">
                                    Resume membership
                                  </button>
                                </form>
                              </div>
                            ) : (
                              <form action={pauseMembership.bind(null, p.id, contact.id)} className="space-y-2">
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
                  })}
                </div>
              ) : (
                <p className="text-sm text-stone-400">No current memberships or sessions.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PrefCheckbox({
  name,
  label,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  disabled: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-stone-700">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
      />
      {label}
    </label>
  );
}
