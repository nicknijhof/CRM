import { createClient } from '@/lib/supabase/server';
import { canManageCafeMenu, getCurrentRole } from '@/lib/profile';
import type { CafeMenuCategory, CafeMenuItem } from '@/lib/types';
import { createCategory, createMenuItem, deleteCategory } from './actions';
import MenuItemRow from '@/components/MenuItemRow';

export default async function CafeMenuPage() {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  const canManage = canManageCafeMenu(role);

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from('cafe_menu_categories').select('*').order('sort_order', { ascending: true }).returns<CafeMenuCategory[]>(),
    supabase
      .from('cafe_menu_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .returns<CafeMenuItem[]>(),
  ]);

  const allCategories = categories ?? [];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-stone-900">Cafe Menu</h1>
      <p className="mt-1 text-sm text-stone-500">
        What members see when ordering ahead in the app. Toggle an item off to hide it without deleting it.
      </p>

      {canManage && (
        <div className="mt-6 rounded-xl border border-stone-200 p-4">
          <h2 className="text-sm font-semibold text-stone-900">Categories</h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Add any category you need — e.g. an &quot;Add-ons&quot; category for extras like an extra shot or a drink to
            go with food, which members can add to any order just like a menu item.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {allCategories.map((c) => (
              <form key={c.id} action={deleteCategory.bind(null, c.id)} className="flex items-center gap-1">
                <span className="flex items-center gap-1.5 rounded-full bg-stone-100 py-1 pl-3 pr-1.5 text-xs text-stone-700">
                  {c.name}
                  <button className="text-stone-400 hover:text-rose-600" title="Delete category">
                    ×
                  </button>
                </span>
              </form>
            ))}
          </div>
          <form action={createCategory} className="mt-3 flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs text-stone-500">New category name</label>
              <input
                name="name"
                required
                placeholder="e.g. Add-ons"
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs text-stone-500">Sort order</label>
              <input
                name="sort_order"
                type="number"
                step="1"
                defaultValue={allCategories.length}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900"
              />
            </div>
            <button className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
              Add
            </button>
          </form>
        </div>
      )}

      {canManage && allCategories.length > 0 && (
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
              name="category_id"
              defaultValue={allCategories[0]?.id}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            >
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
          <div>
            <label className="block text-sm text-stone-700">Calories</label>
            <input
              name="calories"
              type="number"
              step="1"
              min="0"
              placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700">Protein (g)</label>
            <input
              name="protein_grams"
              type="number"
              step="0.1"
              min="0"
              placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
          </div>
          <div className="col-span-2">
            <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Add menu item
            </button>
          </div>
        </form>
      )}

      {canManage && allCategories.length === 0 && (
        <p className="mt-6 text-sm text-stone-500">Add a category above before adding menu items.</p>
      )}

      {allCategories.map((category) => {
        const categoryItems = items?.filter((i) => i.category_id === category.id) ?? [];
        if (categoryItems.length === 0) return null;
        return (
          <div key={category.id} className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{category.name}</h2>
            <div className="mt-2 space-y-2">
              {categoryItems.map((item) => (
                <MenuItemRow key={item.id} item={item} categories={allCategories} canManage={canManage} />
              ))}
            </div>
          </div>
        );
      })}

      {!items?.length && <p className="mt-6 text-sm text-stone-500">No menu items yet.</p>}
    </div>
  );
}
