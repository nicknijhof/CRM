import { createClient } from '@/lib/supabase/server';
import { canManageCafeMenu, getCurrentRole } from '@/lib/profile';
import type { CafeMenuItem } from '@/lib/types';
import { createMenuItem } from './actions';
import MenuItemRow from '@/components/MenuItemRow';

const CATEGORIES: { value: 'drink' | 'food'; label: string }[] = [
  { value: 'drink', label: 'Drink' },
  { value: 'food', label: 'Food' },
];

export default async function CafeMenuPage() {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  const canManage = canManageCafeMenu(role);

  const { data: items } = await supabase
    .from('cafe_menu_items')
    .select('*')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
    .returns<CafeMenuItem[]>();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-stone-900">Cafe Menu</h1>
      <p className="mt-1 text-sm text-stone-500">
        What members see when ordering ahead in the app. Toggle an item off to hide it without deleting it.
      </p>

      {canManage && (
        <form action={createMenuItem} className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-stone-200 p-4">
          <div>
            <label className="block text-sm text-stone-700">Name</label>
            <input
              name="name"
              required
              placeholder="e.g. Flat White"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700">Category</label>
            <select
              name="category"
              defaultValue="drink"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-stone-700">Description</label>
            <input
              name="description"
              placeholder="Optional — shown under the name"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-stone-700">Photo URL</label>
            <input
              name="image_url"
              placeholder="Optional — paste a hosted image link. Shows a placeholder until then."
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700">Price (SGD)</label>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700">Sort order</label>
            <input
              name="sort_order"
              type="number"
              step="1"
              defaultValue={0}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
            <p className="mt-0.5 text-xs text-stone-500">Lower numbers show first within their category.</p>
          </div>
          <div className="col-span-2">
            <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Add menu item
            </button>
          </div>
        </form>
      )}

      {(['drink', 'food'] as const).map((category) => {
        const categoryItems = items?.filter((i) => i.category === category) ?? [];
        if (categoryItems.length === 0) return null;
        return (
          <div key={category} className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              {CATEGORIES.find((c) => c.value === category)?.label}s
            </h2>
            <div className="mt-2 space-y-2">
              {categoryItems.map((item) => (
                <MenuItemRow key={item.id} item={item} categories={CATEGORIES} canManage={canManage} />
              ))}
            </div>
          </div>
        );
      })}

      {!items?.length && <p className="mt-6 text-sm text-stone-500">No menu items yet.</p>}
    </div>
  );
}
