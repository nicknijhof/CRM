'use client';

import { BILLING_CYCLES, CONTRACT_CATEGORIES } from '@/lib/business';
import type { Contract } from '@/lib/types';
import PendingButton from '../PendingButton';
import { Field, inputCls, primaryBtn } from './ui';

export default function ContractForm({
  contract,
  suppliers = [],
  action,
  submitLabel,
  onDone,
}: {
  contract?: Contract;
  suppliers?: { id: string; name: string }[];
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
      <Field label="Contract" hint="e.g. Starhub fibre, Cleaning, Laundry">
        <input name="name" required defaultValue={contract?.name} className={inputCls} />
      </Field>
      <Field label="Company">
        <input name="provider" defaultValue={contract?.provider ?? ''} placeholder="e.g. StarHub" className={inputCls} />
      </Field>
      <Field label="Linked supplier" hint="Optional. Links this contract to the supplier's page.">
        <select name="supplier_id" defaultValue={contract?.supplier_id ?? ''} className={inputCls}>
          <option value="">None</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Type">
        <input name="category" list="contract-categories" defaultValue={contract?.category ?? ''} className={inputCls} />
        <datalist id="contract-categories">
          {CONTRACT_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (S$)">
          <input name="price" type="number" step="0.01" min="0" defaultValue={contract?.price ?? ''} className={inputCls} />
        </Field>
        <Field label="Billed">
          <select name="billing_cycle" defaultValue={contract?.billing_cycle ?? 'monthly'} className={inputCls}>
            {BILLING_CYCLES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Contract started">
        <input name="start_date" type="date" defaultValue={contract?.start_date ?? ''} className={inputCls} />
      </Field>
      <Field label="Renewal date" hint="3 months before this, it shows under Actions to be taken on the dashboard.">
        <input name="renewal_date" type="date" defaultValue={contract?.renewal_date ?? ''} className={inputCls} />
      </Field>
      <Field label="Notice needed to cancel (days)" hint="e.g. 30, or 90 for three months. Leave blank if unknown.">
        <input name="notice_days" type="number" min="0" step="1" defaultValue={contract?.notice_days ?? ''} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 self-center text-sm text-stone-700">
        <input type="checkbox" name="auto_renews" defaultChecked={contract?.auto_renews ?? true} className="h-4 w-4" />
        Renews automatically unless we cancel
      </label>
      <Field label="Cancellation policy" className="col-span-2" hint="In plain words: notice period, fees, who to tell, in writing or not.">
        <textarea name="cancellation_policy" rows={3} defaultValue={contract?.cancellation_policy ?? ''} className={inputCls} />
      </Field>
      <Field label="Contact name">
        <input name="contact_name" defaultValue={contract?.contact_name ?? ''} className={inputCls} />
      </Field>
      <Field label="Contact number or email">
        <input name="contact_detail" defaultValue={contract?.contact_detail ?? ''} className={inputCls} />
      </Field>
      <Field label="Notes" className="col-span-2">
        <textarea name="notes" rows={2} defaultValue={contract?.notes ?? ''} className={inputCls} />
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
