'use client';

import { useState } from 'react';
import { createAddon, deleteAddon } from '@/app/(app)/cafe/menu/actions';
import type { CafeAddon } from '@/lib/types';

export default function CategoryAddonsManager({ categoryId, addons }: { categoryId: string; addons: CafeAddon[] }) {
  const [open, setOpen] = useState(false);

  const groups = new Map<string, CafeAddon[]>();
  for (const a of addons) groups.set(a.group_label, [...(groups.get(a.group_label) ?? []), a]);

  return (
    <div className="mt-2 rounded-lg border border-dashed border-stone-300 p-3">
      <button onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-teal-600 underline hover:text-teal-700">
        {open ? 'Hide add-ons' : `Add-ons for this category${addons.length ? ` (${addons.length})` : ''} — e.g. Boosters`}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-3">
          {[...groups.entries()].map(([label, groupAddons]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-stone-700">{label}</p>
              <div className="mt-1 flex flex-col gap-1">
                {groupAddons.map((a) => (
                  <form key={a.id} action={deleteAddon.bind(null, a.id)} className="flex items-center justify-between text-xs">
                    <span>
                      {a.name} <span className="text-stone-500">(SGD {a.price.toFixed(2)})</span>
                    </span>
                    <button className="text-rose-600 underline hover:text-rose-700">Delete</button>
                  </form>
                ))}
              </div>
            </div>
          ))}
          <form action={createAddon.bind(null, categoryId)} className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] text-stone-500">Group label</label>
              <input
                name="group_label"
                placeholder="e.g. Boosters"
                className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-500">Name</label>
              <input
                name="name"
                required
                placeholder="e.g. Extra Shot"
                className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-500">Price</label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={0}
                className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900"
              />
            </div>
            <div className="col-span-3">
              <button className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700">
                Add add-on
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
