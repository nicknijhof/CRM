'use client';

import { useState } from 'react';
import { createVariant, deleteVariant, setVariantAvailable } from '@/app/(app)/cafe/menu/actions';
import type { CafeMenuItemVariant } from '@/lib/types';

export default function ItemVariantsManager({
  menuItemId,
  variants,
}: {
  menuItemId: string;
  variants: CafeMenuItemVariant[];
}) {
  const [open, setOpen] = useState(false);

  const groups = new Map<string, CafeMenuItemVariant[]>();
  for (const v of variants) groups.set(v.group_label, [...(groups.get(v.group_label) ?? []), v]);

  return (
    <div className="mt-2">
      <button onClick={() => setOpen((o) => !o)} className="text-xs text-teal-600 underline hover:text-teal-700">
        {open ? 'Hide options' : `Options${variants.length ? ` (${variants.length})` : ''} — e.g. Temperature, Size`}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-3 rounded-lg bg-stone-50 p-3">
          <p className="text-[11px] text-stone-500">
            A member picks exactly <strong>one option per group</strong> — and one from <strong>every</strong> group an item
            has. So if Hot/Iced and Regular/Large should combine into a single 4-way choice, put all four under{' '}
            <strong>one</strong> group (e.g. &quot;Temperature &amp; Size&quot;: Hot Regular, Hot Large, Iced Regular, Iced
            Large) — don&apos;t split Hot and Iced into two separate groups, or a member ends up having to pick from both at
            once.
          </p>
          {[...groups.entries()].map(([label, groupVariants]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-stone-700">{label}</p>
              <div className="mt-1 flex flex-col gap-1">
                {groupVariants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className={!v.is_available ? 'text-stone-400 line-through' : ''}>
                      {v.name}
                      {v.price_delta !== 0 && (
                        <span className="text-stone-500"> ({v.price_delta > 0 ? '+' : ''}SGD {v.price_delta.toFixed(2)})</span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <form action={setVariantAvailable.bind(null, v.id, !v.is_available)}>
                        <button
                          className={`rounded-full px-2 py-0.5 font-medium ${
                            v.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {v.is_available ? 'In stock' : 'Out of stock'}
                        </button>
                      </form>
                      <form action={deleteVariant.bind(null, v.id)}>
                        <button className="text-rose-600 underline hover:text-rose-700">Delete</button>
                      </form>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <form action={createVariant.bind(null, menuItemId)} className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] text-stone-500">Group</label>
              <input
                name="group_label"
                list={`variant-groups-${menuItemId}`}
                placeholder="e.g. Size"
                className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900"
              />
              <datalist id={`variant-groups-${menuItemId}`}>
                {[...groups.keys()].map((label) => (
                  <option key={label} value={label} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-[11px] text-stone-500">Name</label>
              <input
                name="name"
                required
                placeholder="e.g. Large"
                className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-500">Price +/-</label>
              <input
                name="price_delta"
                type="number"
                step="0.01"
                defaultValue={0}
                className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900"
              />
            </div>
            <div className="col-span-3">
              <button className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700">
                Add
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
