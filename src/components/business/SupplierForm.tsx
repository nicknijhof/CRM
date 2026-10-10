'use client';

import { CONTACT_CHANNELS, SUPPLIER_CATEGORIES } from '@/lib/business';
import type { Supplier } from '@/lib/types';
import PendingButton from '../PendingButton';
import { Field, inputCls, primaryBtn } from './ui';

export default function SupplierForm({
  supplier,
  action,
  submitLabel,
  onDone,
}: {
  supplier?: Supplier;
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
  onDone?: () => void;
}) {
  return (
    <form
      action={async (fd) => {
        await action(fd);
        onDone?.();
      }}
      className="grid grid-cols-2 gap-4"
    >
      <Field label="Company">
        <input name="name" required defaultValue={supplier?.name} className={inputCls} />
      </Field>
      <Field label="Category">
        <input name="category" list="supplier-categories" defaultValue={supplier?.category ?? ''} className={inputCls} />
        <datalist id="supplier-categories">
          {SUPPLIER_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="What we buy from them" className="col-span-2">
        <input name="what_we_buy" defaultValue={supplier?.what_we_buy ?? ''} placeholder="e.g. towels, laundry service, ice machine servicing" className={inputCls} />
      </Field>
      <Field label="Contact person">
        <input name="contact_name" defaultValue={supplier?.contact_name ?? ''} className={inputCls} />
      </Field>
      <Field label="Best way to reach them">
        <select name="preferred_channel" defaultValue={supplier?.preferred_channel ?? 'whatsapp'} className={inputCls}>
          {CONTACT_CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Phone / WhatsApp number">
        <input name="phone" defaultValue={supplier?.phone ?? ''} placeholder="+65 ..." className={inputCls} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" defaultValue={supplier?.email ?? ''} className={inputCls} />
      </Field>
      <Field label="Website">
        <input name="website" defaultValue={supplier?.website ?? ''} className={inputCls} />
      </Field>
      <Field label="Company registration no. (UEN)">
        <input name="uen" defaultValue={supplier?.uen ?? ''} className={inputCls} />
      </Field>
      <Field label="Address" className="col-span-2">
        <input name="address" defaultValue={supplier?.address ?? ''} className={inputCls} />
      </Field>
      <Field label="Payment terms" hint="e.g. 30 days from invoice, pay on delivery">
        <input name="payment_terms" defaultValue={supplier?.payment_terms ?? ''} className={inputCls} />
      </Field>
      <Field label="Status">
        <select name="status" defaultValue={supplier?.status ?? 'active'} className={inputCls}>
          <option value="active">Active</option>
          <option value="inactive">No longer used</option>
        </select>
      </Field>
      <Field label="Notes" className="col-span-2">
        <textarea name="notes" rows={2} defaultValue={supplier?.notes ?? ''} className={inputCls} />
      </Field>
      <div className="col-span-2 flex gap-2">
        <PendingButton className={primaryBtn} pendingLabel="Saving…">
          {submitLabel}
        </PendingButton>
        {onDone && (
          <button type="button" onClick={onDone} className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
