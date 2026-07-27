import type { DiscountCode } from '@/lib/types';

export default function DiscountCodeSelect({ codes }: { codes: DiscountCode[] }) {
  return (
    <select
      name="discount_code_id"
      defaultValue=""
      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
    >
      <option value="">— no discount —</option>
      {codes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.code} — {c.label}
        </option>
      ))}
    </select>
  );
}
