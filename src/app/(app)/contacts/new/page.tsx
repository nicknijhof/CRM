import { createContact } from '../actions';
import { CONTACT_SOURCES, PIPELINE_STAGES } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import { canManagePurchases, getCurrentRole } from '@/lib/profile';
import type { DiscountCode, Product } from '@/lib/types';
import PurchaseFields from '@/components/PurchaseFields';

export default async function NewContactPage() {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  const canAddPurchase = canManagePurchases(role);
  const [{ data: products }, { data: discountCodes }] = await Promise.all([
    supabase.from('products').select('*').eq('is_active', true).order('sort_order').returns<Product[]>(),
    supabase.from('discount_codes').select('*').eq('is_active', true).order('code').returns<DiscountCode[]>(),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-white">Add member</h1>

      <form action={createContact} className="mt-6 space-y-4">
        <Field label="Full name" name="full_name" required />
        <Field label="Email" name="email" type="email" />
        <Field label="Phone" name="phone" />

        <div>
          <label className="block text-sm text-slate-300">Source</label>
          <select
            name="source"
            defaultValue="instagram"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            {CONTACT_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-300">Pipeline stage</label>
          <select
            name="pipeline_stage"
            defaultValue="lead"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {canAddPurchase && (
          <div className="rounded-lg border border-slate-800 p-3">
            <label className="block text-sm text-slate-300">Purchase (optional)</label>
            <p className="mt-0.5 text-xs text-slate-500">
              What is this guest signing up for today — a single session, pack, or membership? ClassPass/
              Entertainer visits paid via the platform can be comped with a discount code.
            </p>
            <div className="mt-2">
              <PurchaseFields
                products={products ?? []}
                discountCodes={discountCodes ?? []}
                defaultDate={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-300">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 hover:bg-cyan-400"
        >
          Save member
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-300">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-500"
      />
    </div>
  );
}
