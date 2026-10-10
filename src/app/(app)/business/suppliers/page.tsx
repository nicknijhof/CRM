import Link from 'next/link';
import { requireBusiness } from '@/lib/businessAuth';
import { CONTACT_CHANNELS, contactHref, formatMoney, labelOf } from '@/lib/business';
import type { Supplier, SupplierInvoice, SupplierOrder } from '@/lib/types';
import SupplierForm from '@/components/business/SupplierForm';
import { Badge, PageHeader } from '@/components/business/ui';
import { createSupplier } from './actions';

export default async function SuppliersPage() {
  const supabase = await requireBusiness();
  const [{ data: suppliers }, { data: orders }, { data: invoices }] = await Promise.all([
    supabase.from('suppliers').select('*').order('name').returns<Supplier[]>(),
    supabase.from('supplier_orders').select('supplier_id, order_date, amount').returns<Pick<SupplierOrder, 'supplier_id' | 'order_date' | 'amount'>[]>(),
    supabase.from('supplier_invoices').select('supplier_id, paid').returns<Pick<SupplierInvoice, 'supplier_id' | 'paid'>[]>(),
  ]);

  const stats = new Map<string, { orders: number; spent: number; last: string | null; unpaid: number }>();
  for (const s of suppliers ?? []) stats.set(s.id, { orders: 0, spent: 0, last: null, unpaid: 0 });
  for (const o of orders ?? []) {
    const s = stats.get(o.supplier_id);
    if (!s) continue;
    s.orders += 1;
    s.spent += Number(o.amount ?? 0);
    if (!s.last || o.order_date > s.last) s.last = o.order_date;
  }
  for (const i of invoices ?? []) if (!i.paid) stats.get(i.supplier_id)!.unpaid += 1;

  const list = suppliers ?? [];

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Suppliers"
        intro="Everyone we buy goods and services from. Open a supplier to see their details, our order history and the invoices we have stored."
      />

      <details className="rounded-xl border border-stone-200 bg-white" open={list.length === 0}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-teal-700">+ Add a supplier</summary>
        <div className="border-t border-stone-200 p-4">
          <SupplierForm action={createSupplier} submitLabel="Add supplier" />
        </div>
      </details>

      <div className="space-y-3">
        {list.map((s) => {
          const st = stats.get(s.id)!;
          const handle = s.preferred_channel === 'email' ? s.email : s.phone;
          const href = contactHref(s.preferred_channel, handle);
          return (
            <div key={s.id} className={`rounded-xl border border-stone-200 bg-white p-4 ${s.status === 'inactive' ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/business/suppliers/${s.id}`} className="text-base font-semibold text-stone-900 hover:text-teal-600">
                      {s.name}
                    </Link>
                    {s.category && <Badge>{s.category}</Badge>}
                    {s.status === 'inactive' && <Badge>No longer used</Badge>}
                    {st.unpaid > 0 && <Badge tone="amber">{st.unpaid} unpaid invoice{st.unpaid === 1 ? '' : 's'}</Badge>}
                  </div>
                  {s.what_we_buy && <p className="mt-1 text-sm text-stone-600">{s.what_we_buy}</p>}
                  <p className="mt-2 text-sm text-stone-500">
                    {s.contact_name && <>{s.contact_name} · </>}
                    Best on {labelOf(CONTACT_CHANNELS, s.preferred_channel)}
                    {handle && (
                      <>
                        {': '}
                        {href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">
                            {handle}
                          </a>
                        ) : (
                          handle
                        )}
                      </>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right text-sm text-stone-500">
                  <p>
                    {st.orders} order{st.orders === 1 ? '' : 's'}
                    {st.spent > 0 && <> · {formatMoney(st.spent)}</>}
                  </p>
                  <Link href={`/business/suppliers/${s.id}`} className="mt-1 inline-block text-teal-700 hover:underline">
                    Open
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
        {!list.length && <p className="text-sm text-stone-500">No suppliers yet.</p>}
      </div>
    </div>
  );
}
