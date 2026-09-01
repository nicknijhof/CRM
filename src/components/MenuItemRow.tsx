'use client';

import { useState } from 'react';
import { deleteMenuItem, setMenuItemAvailable, updateMenuItem } from '@/app/(app)/cafe/menu/actions';
import ItemVariantsManager from './ItemVariantsManager';
import type { CafeMenuCategory, CafeMenuItem, CafeMenuItemVariant } from '@/lib/types';

export default function MenuItemRow({
  item,
  categories,
  variants,
  canManage,
}: {
  item: CafeMenuItem;
  categories: CafeMenuCategory[];
  variants: CafeMenuItemVariant[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await updateMenuItem(item.id, formData);
          setEditing(false);
        }}
        className="grid grid-cols-2 gap-3 rounded-lg border border-teal-300 bg-teal-50/40 px-4 py-3 text-sm"
      >
        <div>
          <label className="block text-xs text-stone-500">Name</label>
          <input
            name="name"
            required
            defaultValue={item.name}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500">Category</label>
          <select
            name="category_id"
            defaultValue={item.category_id}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-stone-500">Description</label>
          <input
            name="description"
            defaultValue={item.description ?? ''}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-stone-500">Photo URL</label>
          <input
            name="image_url"
            defaultValue={item.image_url ?? ''}
            placeholder="Optional — paste a hosted image link"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500">Price (SGD)</label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={item.price}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500">Sort order</label>
          <input
            name="sort_order"
            type="number"
            step="1"
            defaultValue={item.sort_order}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500">Calories</label>
          <input
            name="calories"
            type="number"
            step="1"
            min="0"
            defaultValue={item.calories ?? ''}
            placeholder="Optional"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500">Protein (g)</label>
          <input
            name="protein_grams"
            type="number"
            step="0.1"
            min="0"
            defaultValue={item.protein_grams ?? ''}
            placeholder="Optional"
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

  const nutritionParts = [
    item.calories != null ? `${item.calories} kcal` : null,
    item.protein_grams != null ? `${item.protein_grams}g protein` : null,
  ].filter(Boolean);

  return (
    <div className="rounded-lg border border-stone-200 px-4 py-3 text-sm">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary staff-pasted URL, not worth configuring next/image remotePatterns for
          <img src={item.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-[10px] text-stone-400">
            No photo
          </div>
        )}
        <div>
          <p className="font-medium text-stone-900">
            {item.name} <span className="font-normal text-stone-500">— SGD {item.price.toFixed(2)}</span>
          </p>
          {item.description && <p className="text-stone-500">{item.description}</p>}
          {nutritionParts.length > 0 && <p className="text-stone-400">{nutritionParts.join(' · ')}</p>}
        </div>
      </div>
      {canManage ? (
        <div className="flex items-center gap-3">
          <button onClick={() => setEditing(true)} className="text-xs text-teal-600 underline hover:text-teal-700">
            Edit
          </button>
          <form action={setMenuItemAvailable.bind(null, item.id, !item.is_available)}>
            <button
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                item.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
              }`}
            >
              {item.is_available ? 'Available' : 'Hidden'}
            </button>
          </form>
          <form action={deleteMenuItem.bind(null, item.id)}>
            <button className="text-xs text-rose-600 underline hover:text-rose-700">Delete</button>
          </form>
        </div>
      ) : (
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            item.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
          }`}
        >
          {item.is_available ? 'Available' : 'Hidden'}
        </span>
      )}
    </div>
    {canManage && <ItemVariantsManager menuItemId={item.id} variants={variants} />}
    </div>
  );
}
