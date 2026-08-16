'use client';

import { useState } from 'react';
import { CreditCard, History, Megaphone } from 'lucide-react';
import { paymentStatus } from '@/lib/payments';
import { removePaymentMethod } from '@/app/(app)/contacts/payment-actions';
import AddPaymentMethodForm from './AddPaymentMethodForm';
import type { Contact, Purchase } from '@/lib/types';

type PanelKey = 'payment_history' | 'payment_method' | 'marketing_prefs';

const PANELS: { key: PanelKey; label: string; icon: typeof History }[] = [
  { key: 'payment_history', label: 'Payment history', icon: History },
  { key: 'payment_method', label: 'Payment method', icon: CreditCard },
  { key: 'marketing_prefs', label: 'Marketing prefs', icon: Megaphone },
];

export default function MemberQuickPanels({
  contact,
  purchases,
  canEdit,
  updateMarketingPrefs,
}: {
  contact: Contact;
  purchases: Purchase[];
  canEdit: boolean;
  updateMarketingPrefs: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState<PanelKey | null>(null);
  const [addingCard, setAddingCard] = useState(false);
  const hasCard = Boolean(contact.stripe_payment_method_id);

  const paidPurchases = [...purchases]
    .filter((p) => p.price !== null && p.price > 0)
    .sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1));

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
