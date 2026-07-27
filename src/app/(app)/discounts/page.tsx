import { createClient } from '@/lib/supabase/server';
import { canManageDiscounts, getCurrentRole } from '@/lib/profile';
import { DISCOUNT_TYPES } from '@/lib/constants';
import type { DiscountCode } from '@/lib/types';
import { createDiscountCode, deleteDiscountCode, setDiscountCodeActive } from './actions';

export default async function DiscountsPage() {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  const canManage = canManageDiscounts(role);

  let query = supabase.from('discount_codes').select('*').order('created_at', { ascending: false });
  if (!canManage) query = query.eq('is_active', true);
  const { data: codes } = await query.returns<DiscountCode[]>();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-white">Discounts</h1>
      <p className="mt-1 text-sm text-slate-400">
        {canManage
          ? 'Codes staff can apply when logging a purchase — e.g. comping ClassPass/Entertainer visits that are already paid for on that platform.'
          : 'Apply these when logging a purchase on a member’s page. Only admin/owner accounts can add or change codes here.'}
      </p>

      {canManage && (
        <form action={createDiscountCode} className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-800 p-4">
          <div>
            <label className="block text-sm text-slate-300">Code</label>
            <input
              name="code"
              required
              placeholder="e.g. CLASSPASS"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300">Label</label>
            <input
              name="label"
              required
              placeholder="e.g. ClassPass (paid via platform)"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300">Type</label>
            <select
              name="discount_type"
              defaultValue="full_comp"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            >
              {DISCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300">Value</label>
            <input
              name="value"
              type="number"
              step="0.01"
              defaultValue={0}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
            <p className="mt-0.5 text-xs text-slate-500">% for percentage, $ for fixed, ignored for full comp.</p>
          </div>
          <div>
            <label className="block text-sm text-slate-300">Bonus sessions</label>
            <input
              name="bonus_sessions"
              type="number"
              step="1"
              min="0"
              defaultValue={0}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
            <p className="mt-0.5 text-xs text-slate-500">
              Extra sessions added on top (e.g. a 1-for-1 deal = 1).
            </p>
          </div>
          <div className="col-span-2">
            <button className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400">
              Add discount code
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-2">
        {codes?.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-800 px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-white">
                {c.code} <span className="font-normal text-slate-400">— {c.label}</span>
              </p>
              <p className="text-slate-500">
                {DISCOUNT_TYPES.find((t) => t.value === c.discount_type)?.label}
                {c.discount_type !== 'full_comp' && ` · ${c.value}`}
                {c.bonus_sessions > 0 && ` · +${c.bonus_sessions} bonus session${c.bonus_sessions > 1 ? 's' : ''}`}
              </p>
            </div>
            {canManage ? (
              <div className="flex items-center gap-3">
                <form action={setDiscountCodeActive.bind(null, c.id, !c.is_active)}>
                  <button
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      c.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {c.is_active ? 'Active' : 'Inactive'}
                  </button>
                </form>
                <form action={deleteDiscountCode.bind(null, c.id)}>
                  <button className="text-xs text-red-400 underline hover:text-red-300">Delete</button>
                </form>
              </div>
            ) : (
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
                Active
              </span>
            )}
          </div>
        ))}
        {!codes?.length && <p className="text-sm text-slate-500">No discount codes yet.</p>}
      </div>
    </div>
  );
}
