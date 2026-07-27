import { ITEM_TYPES } from '@/lib/constants';
import type { Product } from '@/lib/types';

export default function ProductSelect({ products }: { products: Product[] }) {
  return (
    <select
      name="product_id"
      defaultValue=""
      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
    >
      <option value="">— none —</option>
      {ITEM_TYPES.map((type) => {
        const group = products.filter((p) => p.item_type === type.value);
        if (!group.length) return null;
        return (
          <optgroup key={type.value} label={type.label}>
            {group.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ${p.price}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
