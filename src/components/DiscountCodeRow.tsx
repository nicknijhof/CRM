'use client';

import { useState } from 'react';
import { deleteDiscountCode, setDiscountCodeActive, updateDiscountCode } from '@/app/(app)/discounts/actions';
import type { DiscountCode } from '@/lib/types';

export default function DiscountCodeRow({
  code: c,
  discountTypes,
  canManage,
}: {
  code: DiscountCode;
  discountTypes: { value: string; label: string }[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await updateDiscountCode(c.id, formData);
          setEditing(false);
        }}
        className="grid grid-cols-2 gap-3 rounded-lg border border-teal-300 bg-teal-50/40 px-4 py-3 text-sm"
      >
        <div>
          <label className="block text-xs text-stone-500">Code</label>
          <input
            name="code"
            required
            defaultValue={c.code}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500">Label</label>
          <input
            name="label"
            required
            defaultValue={c.label}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500">Type</label>
          <select
            name="discount_type"
            defaultValue={c.discount_type}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          >
            {discountTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-stone-500">Value</label>
          <input
            name="value"
            type="number"
            step="0.01"
            defaultValue={c.value}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500">Bonus sessions</label>
          <input
            name="bonus_sessions"
            type="number"
            step="1"
            min="0"
            defaultValue={c.bonus_sessions}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div className="col-span-2 flex gap-3">
          <button className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-stone-300 px-4 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-3 text-sm">
      <div>
        <p className="font-medium text-stone-900">
          {c.code} <span className="font-normal text-stone-500">— {c.label}</span>
        </p>
        <p className="text-stone-500">
          {discountTypes.find((t) => t.value === c.discount_type)?.label}
          {c.discount_type !== 'full_comp' && ` · ${c.value}`}
          {c.bonus_sessions > 0 && ` · +${c.bonus_sessions} bonus session${c.bonus_sessions > 1 ? 's' : ''}`}
          {c.single_use && ' · Single use (gift)'}
        </p>
      </div>
      {canManage ? (
        <div className="flex items-center gap-3">
          <button onClick={() => setEditing(true)} className="text-xs text-teal-600 underline hover:text-teal-700">
            Edit
          </button>
          <form action={setDiscountCodeActive.bind(null, c.id, !c.is_active)}>
            <button
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
              }`}
            >
              {c.is_active ? 'Active' : 'Inactive'}
            </button>
          </form>
          <form action={deleteDiscountCode.bind(null, c.id)}>
            <button className="text-xs text-rose-600 underline hover:text-rose-700">Delete</button>
          </form>
        </div>
      ) : (
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Active</span>
      )}
    </div>
  );
}
