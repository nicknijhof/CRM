'use client';

import { useState } from 'react';
import { createVariant, deleteVariant } from '@/app/(app)/cafe/menu/actions';
import type { CafeMenuItemVariant } from '@/lib/types';

export default function ItemVariantsManager({
  menuItemId,
  variants,
}: {
  menuItemId: string;
  variants: CafeMenuItemVariant[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button onClick={() => setOpen((o) => !o)} className="text-xs text-teal-600 underline hover:text-teal-700">
        {open ? 'Hide options' : `Options${variants.length ? ` (${variants.length})` : ''} — e.g. Hot/Iced`}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg bg-stone-50 p-3">
          {variants.map((v) => (
            <form key={v.id} action={deleteVariant.bind(null, v.id)} className="flex items-center justify-between text-xs">
              <span>
                {v.name}
                {v.price_delta !== 0 && (
                  <span className="text-stone-500"> ({v.price_delta > 0 ? '+' : ''}SGD {v.price_delta.toFixed(2)})</span>
                )}
              </span>
              <button className="text-rose-600 underline hover:text-rose-700">Delete</button>
            </form>
          ))}
          <form action={createVariant.bind(null, menuItemId)} className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[11px] text-stone-500">Name</label>
              <input
                name="name"
                required
                placeholder="e.g. Iced"
                className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900"
              />
            </div>
            <div className="w-24">
              <label className="block text-[11px] text-stone-500">Price +/-</label>
              <input
                name="price_delta"
                type="number"
                step="0.01"
                defaultValue={0}
                className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900"
              />
            </div>
            <button className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700">
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
