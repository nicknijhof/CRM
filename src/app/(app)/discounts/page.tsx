import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canManageDiscounts, getCurrentRole } from '@/lib/profile';
import { DISCOUNT_TYPES } from '@/lib/constants';
import type { DiscountCode } from '@/lib/types';
import { createDiscountCode } from './actions';
import DiscountCodeRow from '@/components/DiscountCodeRow';

export default async function DiscountsPage() {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (role === 'staff') redirect('/');

  const canManage = canManageDiscounts(role);

  let query = supabase.from('discount_codes').select('*').order('created_at', { ascending: false });
  if (!canManage) query = query.eq('is_active', true);
  const { data: codes } = await query.returns<DiscountCode[]>();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-stone-900">Discounts</h1>
      <p className="mt-1 text-sm text-stone-500">
        {canManage
          ? 'Codes staff can apply when logging a purchase — e.g. comping ClassPass/Entertainer visits that are already paid for on that platform.'
          : 'Apply these when logging a purchase on a member’s page. Only admin/owner accounts can add or change codes here.'}
      </p>

      {canManage && (
        <form action={createDiscountCode} className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-stone-200 p-4">
          <div>
            <label className="block text-sm text-stone-700">Code</label>
            <input
              name="code"
              required
              placeholder="e.g. CLASSPASS"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700">Label</label>
            <input
              name="label"
              required
              placeholder="e.g. ClassPass (paid via platform)"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700">Type</label>
            <select
              name="discount_type"
              defaultValue="full_comp"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            >
              {DISCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-stone-700">Value</label>
            <input
              name="value"
              type="number"
              step="0.01"
              defaultValue={0}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
            <p className="mt-0.5 text-xs text-stone-500">% for percentage, $ for fixed, ignored for full comp.</p>
          </div>
          <div>
            <label className="block text-sm text-stone-700">Bonus sessions</label>
            <input
              name="bonus_sessions"
              type="number"
              step="1"
              min="0"
              defaultValue={0}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
            <p className="mt-0.5 text-xs text-stone-500">
              Extra sessions added on top (e.g. a 1-for-1 deal = 1).
            </p>
          </div>
          <div className="col-span-2">
            <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Add discount code
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-2">
        {codes?.map((c) => (
          <DiscountCodeRow key={c.id} code={c} discountTypes={DISCOUNT_TYPES} canManage={canManage} />
        ))}
        {!codes?.length && <p className="text-sm text-stone-500">No discount codes yet.</p>}
      </div>
    </div>
  );
}
