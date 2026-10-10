import { requireBusiness } from '@/lib/businessAuth';
import { formatMoney, renewalActions } from '@/lib/business';
import type { Contract } from '@/lib/types';
import ContractCard from '@/components/business/ContractCard';
import ContractForm from '@/components/business/ContractForm';
import { PageHeader } from '@/components/business/ui';
import { createContract } from './actions';

export default async function ContractsPage() {
  const supabase = await requireBusiness();
  const [{ data }, { data: supplierRows }] = await Promise.all([
    supabase.from('contracts').select('*').order('renewal_date', { ascending: true, nullsFirst: false }).returns<Contract[]>(),
    supabase.from('suppliers').select('id, name').order('name').returns<{ id: string; name: string }[]>(),
  ]);
  const suppliers = supplierRows ?? [];
  const contracts = data ?? [];
  const active = contracts.filter((c) => c.status === 'active');
  const ended = contracts.filter((c) => c.status === 'ended');
  const dueCount = renewalActions(contracts).length;

  const monthly = active.reduce((sum, c) => {
    if (c.price === null) return sum;
    if (c.billing_cycle === 'monthly') return sum + c.price;
    if (c.billing_cycle === 'quarterly') return sum + c.price / 3;
    if (c.billing_cycle === 'yearly') return sum + c.price / 12;
    return sum;
  }, 0);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Contracts"
        intro="Every recurring contract in one place: what it costs, how to get out of it, and when it renews. Three months before a renewal it shows up under Actions to be taken on the dashboard."
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Active contracts" value={String(active.length)} />
        <Stat label="Running cost (per month)" value={formatMoney(Math.round(monthly * 100) / 100) || 'S$0'} />
        <Stat label="Renewals to action" value={String(dueCount)} tone={dueCount ? 'text-amber-600' : undefined} />
      </div>

      <details className="rounded-xl border border-stone-200 bg-white" open={contracts.length === 0}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-teal-700">+ Add a contract</summary>
        <div className="border-t border-stone-200 p-4">
          <ContractForm suppliers={suppliers} action={createContract} submitLabel="Add contract" />
        </div>
      </details>

      <div className="space-y-3">
        {active.map((c) => (
          <ContractCard key={c.id} contract={c} suppliers={suppliers} />
        ))}
        {!active.length && <p className="text-sm text-stone-500">No active contracts yet. Add Starhub, cleaning, laundry and the rest above.</p>}
      </div>

      {ended.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-500">Ended</h2>
          {ended.map((c) => (
            <ContractCard key={c.id} contract={c} suppliers={suppliers} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone ?? 'text-stone-900'}`}>{value}</p>
    </div>
  );
}
