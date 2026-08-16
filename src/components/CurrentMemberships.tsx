'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PAYMENT_METHODS, PURCHASE_STATUS_BADGE_CLASSES } from '@/lib/constants';
import { effectivePurchaseStatus, expiryLabel } from '@/lib/purchases';
import { paymentStatus, remainingBalance } from '@/lib/payments';
import { formatSGDateTime } from '@/lib/format';
import { chargeSavedCard, createMembershipSubscription } from '@/app/(app)/contacts/payment-actions';
import AddPurchaseFlow from './AddPurchaseFlow';
import type { Contact, DiscountCode, Product, Purchase } from '@/lib/types';

interface GiftCodeInfo {
  code: string;
  redeemed_at: string | null;
}

export default function CurrentMemberships({
  contact,
  purchases,
  products,
  discountCodes,
  giftCodeStatusByCode,
  canEdit,
  addPurchase,
  adjustSessions,
  cancelPurchase,
  scheduleCancellation,
  unscheduleCancellation,
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
  addPurchase: (formData: FormData) => Promise<void>;
  adjustSessions: (purchaseId: string, contactId: string, delta: number) => Promise<void>;
  cancelPurchase: (purchaseId: string, contactId: string) => Promise<void>;
  scheduleCancellation: (purchaseId: string, contactId: string, formData: FormData) => Promise<void>;
  unscheduleCancellation: (purchaseId: string, contactId: string) => Promise<void>;
  pauseMembership: (purchaseId: string, contactId: string, formData: FormData) => Promise<void>;
  resumeMembership: (purchaseId: string, contactId: string) => Promise<void>;
  updatePayment: (purchaseId: string, contactId: string, formData: FormData) => Promise<void>;
}) {
  const [addingPurchase, setAddingPurchase] = useState(false);

  const currentHoldings = [...purchases].sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1));

  // Each Stripe renewal inserts a new purchase row sharing the subscription's
  // ID, so a long-running membership has one row per billing cycle. Only the
  // most recent row per subscription is the "live" one — cancel/schedule/pause
  // controls must not appear on the older, already-superseded rows, or staff
  // could cancel the wrong row: the Stripe subscription would still die (same
  // stripe_subscription_id), but the real current row would stay status
  // "active" forever, a ghost membership nothing else would ever reconcile.
  const latestPurchaseIdBySubscription = new Map<string, string>();
  for (const p of currentHoldings) {
    if (p.stripe_subscription_id && !latestPurchaseIdBySubscription.has(p.stripe_subscription_id)) {
      latestPurchaseIdBySubscription.set(p.stripe_subscription_id, p.id);
    }
  }
  function isSupersededRow(p: Purchase): boolean {
    return Boolean(p.stripe_subscription_id && latestPurchaseIdBySubscription.get(p.stripe_subscription_id) !== p.id);
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Current memberships</h2>
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
          className="mt-3"
        >
          <AddPurchaseFlow
            products={products}
            discountCodes={discountCodes}
            defaultDate={new Date().toISOString().slice(0, 10)}
            onCancel={() => setAddingPurchase(false)}
          />
        </form>
      )}

      <div className="mt-3 space-y-2">
        {currentHoldings.length ? (
          currentHoldings.map((p) => {
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
                        The discount code for this gift was removed from Discounts, so it can no longer be redeemed
                        as-is. Use &quot;Remove gift card&quot; below to clean this up, or create a new code for the
                        recipient.
                      </p>
                    ) : (
                      <>
                        <p className="mt-1">
                          Code: <code className="rounded bg-stone-200 px-2 py-0.5 text-teal-700">{p.gift_code}</code>
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          Copy this and send it to them yourself. When they redeem it, add a purchase on their contact
                          page for the matching item and apply this code — it&apos;ll be marked redeemed automatically
                          once used.
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
                      Paid ${p.amount_paid} of ${p.price} — ${remainingBalance(p.price, p.amount_paid)} remaining
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

                {canEdit && p.item_type === 'membership' && contact.stripe_payment_method_id && !isSupersededRow(p) && (
                  <div className="mt-2">
                    {p.stripe_subscription_id ? (
                      <span className="text-xs font-medium text-emerald-600">✓ Auto-billing active via Stripe</span>
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
                  status !== 'cancelled' &&
                  !isSupersededRow(p) && (
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

                {canEdit && p.item_type === 'membership' && status !== 'cancelled' && !isSupersededRow(p) && (
                  <ScheduleCancellationControl
                    purchase={p}
                    contactId={contact.id}
                    scheduleCancellation={scheduleCancellation}
                    unscheduleCancellation={unscheduleCancellation}
                  />
                )}

                {canEdit && p.item_type === 'membership' && !isSupersededRow(p) && (
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
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Pause membership</p>
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
          <p className="text-sm text-stone-400">No current memberships or sessions.</p>
        )}
      </div>
    </section>
  );
}

function ScheduleCancellationControl({
  purchase,
  contactId,
  scheduleCancellation,
  unscheduleCancellation,
}: {
  purchase: Purchase;
  contactId: string;
  scheduleCancellation: (purchaseId: string, contactId: string, formData: FormData) => Promise<void>;
  unscheduleCancellation: (purchaseId: string, contactId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(purchase.expiry_date ?? todayStr);

  if (purchase.scheduled_cancellation_date) {
    return (
      <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <span>Cancellation scheduled for {purchase.scheduled_cancellation_date}</span>
        <form action={unscheduleCancellation.bind(null, purchase.id, contactId)}>
          <button className="font-medium underline hover:text-amber-900">Undo</button>
        </form>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-stone-500 underline hover:text-stone-700"
      >
        Schedule cancellation
      </button>
    );
  }

  const cycleDays = purchase.expiry_date
    ? Math.max(
        1,
        Math.round(
          (new Date(purchase.expiry_date).getTime() - new Date(purchase.purchase_date).getTime()) / 86400000,
        ),
      )
    : 30;

  function addCyclesFromExpiry(cycles: number) {
    if (!purchase.expiry_date) return;
    const d = new Date(purchase.expiry_date);
    d.setDate(d.getDate() + cycleDays * cycles);
    setDate(d.toISOString().slice(0, 10));
  }

  return (
    <form
      action={async (formData) => {
        await scheduleCancellation(purchase.id, contactId, formData);
        setOpen(false);
      }}
      className="mt-2 space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Schedule cancellation</p>
      {purchase.expiry_date && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setDate(purchase.expiry_date!)}
            className="rounded border border-stone-300 px-2 py-0.5 text-xs text-stone-700 hover:bg-stone-100"
          >
            End of current cycle
          </button>
          <button
            type="button"
            onClick={() => addCyclesFromExpiry(1)}
            className="rounded border border-stone-300 px-2 py-0.5 text-xs text-stone-700 hover:bg-stone-100"
          >
            +1 more cycle
          </button>
          <button
            type="button"
            onClick={() => addCyclesFromExpiry(3)}
            className="rounded border border-stone-300 px-2 py-0.5 text-xs text-stone-700 hover:bg-stone-100"
          >
            +3 more cycles
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-stone-500">Cancel on</label>
          <input
            name="scheduled_cancellation_date"
            type="date"
            min={todayStr}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-0.5 rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700"
          />
        </div>
        <button className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700">
          Schedule
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-500 hover:text-stone-700"
        >
          Cancel
        </button>
      </div>
      <p className="text-[11px] text-stone-400">
        The membership stays active (and keeps billing, if on Stripe auto-billing) until this date, then cancels
        automatically.
      </p>
    </form>
  );
}
