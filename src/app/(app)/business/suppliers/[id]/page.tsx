import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireBusiness } from '@/lib/businessAuth';
import { CONTACT_CHANNELS, contactHref, formatDay, formatMoney, labelOf } from '@/lib/business';
import type { Contract, Supplier, SupplierInvoice, SupplierOrder } from '@/lib/types';
import InvoiceUploader from '@/components/business/InvoiceUploader';
import { DeleteOrderButton, InvoiceActions, SupplierEditor } from '@/components/business/SupplierRowActions';
import { Badge, Detail, Field, inputCls, primaryBtn } from '@/components/business/ui';
import PendingButton from '@/components/PendingButton';
import { addOrder } from '../actions';

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await requireBusiness();
  const [{ data: supplier }, { data: orders }, { data: invoices }, { data: contracts }] = await Promise.all([
    supabase.from('suppliers').select('*').eq('id', id).maybeSingle<Supplier>(),
    supabase.from('supplier_orders').select('*').eq('supplier_id', id).order('order_date', { ascending: false }).returns<SupplierOrder[]>(),
    supabase.from('supplier_invoices').select('*').eq('supplier_id', id).order('created_at', { ascending: false }).returns<SupplierInvoice[]>(),
    supabase.from('contracts').select('id, name, renewal_date').eq('supplier_id', id).returns<Pick<Contract, 'id' | 'name' | 'renewal_date'>[]>(),
  ]);
  if (!supplier) notFound();

  const orderList = orders ?? [];
  const invoiceList = invoices ?? [];

  // Short-lived links to the stored files (the bucket is private).
  const signed = invoiceList.length
    ? await supabase.storage.from('supplier-invoices').createSignedUrls(
        invoiceList.map((i) => i.file_path),
        60 * 30,
      )
    : { data: [] };
  const urlByPath = new Map((signed.data ?? []).map((s) => [s.path, s.signedUrl]));
  const orderById = new Map(orderList.map((o) => [o.id, o]));

  const handle = supplier.preferred_channel === 'email' ? supplier.email : supplier.phone;
  const href = contactHref(supplier.preferred_channel, handle);
  const total = orderList.reduce((sum, o) => sum + Number(o.amount ?? 0), 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/business/suppliers" className="text-sm text-stone-500 hover:text-teal-600">
          ← All suppliers
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-stone-900">{supplier.name}</h1>
          {supplier.category && <Badge>{supplier.category}</Badge>}
          {supplier.status === 'inactive' && <Badge>No longer used</Badge>}
        </div>
        {supplier.what_we_buy && <p className="mt-1 text-sm text-stone-500">{supplier.what_we_buy}</p>}
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <dl className="grid grid-cols-3 gap-4">
          <Detail label="Contact person">{supplier.contact_name}</Detail>
          <Detail label={`Best on ${labelOf(CONTACT_CHANNELS, supplier.preferred_channel)}`}>
            {handle &&
              (href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">
                  {handle}
                </a>
              ) : (
                handle
              ))}
          </Detail>
          <Detail label="Other channel">
            {supplier.preferred_channel === 'email' ? supplier.phone : supplier.email}
          </Detail>
          <Detail label="Website">{supplier.website}</Detail>
          <Detail label="Company reg. no.">{supplier.uen}</Detail>
          <Detail label="Payment terms">{supplier.payment_terms}</Detail>
          <div className="col-span-3">
            <Detail label="Address">{supplier.address}</Detail>
          </div>
          <div className="col-span-3">
            <Detail label="Notes">{supplier.notes}</Detail>
          </div>
          {(contracts ?? []).length > 0 && (
            <div className="col-span-3">
              <Detail label="Contracts with them">
                {(contracts ?? []).map((c) => (
                  <Link key={c.id} href="/business/contracts" className="mr-3 text-teal-700 hover:underline">
                    {c.name}
                    {c.renewal_date ? ` (renews ${formatDay(c.renewal_date)})` : ''}
                  </Link>
                ))}
              </Detail>
            </div>
          )}
        </dl>
        <div className="mt-4 border-t border-stone-100 pt-3">
          <SupplierEditor supplier={supplier} />
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-stone-700">Order history</h2>
          <p className="text-xs text-stone-500">
            {orderList.length} order{orderList.length === 1 ? '' : 's'}
            {total > 0 && <> · {formatMoney(total)} in total</>}
          </p>
        </div>
        <form action={addOrder.bind(null, supplier.id)} className="grid grid-cols-5 gap-3 border-b border-stone-100 bg-stone-50 p-3">
          <Field label="Date">
            <input name="order_date" type="date" defaultValue={today} className={inputCls} />
          </Field>
          <Field label="What was ordered" className="col-span-2">
            <input name="description" required placeholder="e.g. 60 bath towels" className={inputCls} />
          </Field>
          <Field label="Amount (S$)">
            <input name="amount" type="number" step="0.01" min="0" className={inputCls} />
          </Field>
          <div className="flex items-end">
            <PendingButton className={primaryBtn} pendingLabel="Adding…">
              Log order
            </PendingButton>
          </div>
        </form>
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-stone-100">
            {orderList.map((o) => (
              <tr key={o.id}>
                <td className="whitespace-nowrap px-4 py-2 text-stone-500">{formatDay(o.order_date)}</td>
                <td className="px-4 py-2 text-stone-900">
                  {o.description}
                  {o.notes && <span className="block text-xs text-stone-500">{o.notes}</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right text-stone-900">{formatMoney(o.amount)}</td>
                <td className="px-4 py-2 text-right">
                  <DeleteOrderButton supplierId={supplier.id} orderId={o.id} />
                </td>
              </tr>
            ))}
            {!orderList.length && (
              <tr>
                <td className="px-4 py-6 text-center text-stone-400">No orders logged yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-stone-700">Invoices</h2>
          <p className="text-xs text-stone-500">Stored privately. Only owners and admins can open them.</p>
        </div>
        <div className="border-b border-stone-100 p-3">
          <InvoiceUploader supplierId={supplier.id} orders={orderList} />
        </div>
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-stone-100">
            {invoiceList.map((i) => {
              const url = urlByPath.get(i.file_path);
              const order = i.order_id ? orderById.get(i.order_id) : null;
              return (
                <tr key={i.id}>
                  <td className="px-4 py-2">
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-teal-700 hover:underline">
                        {i.invoice_number ? `Invoice ${i.invoice_number}` : i.file_name}
                      </a>
                    ) : (
                      <span className="text-stone-500">{i.file_name} (file unavailable)</span>
                    )}
                    <span className="block text-xs text-stone-500">
                      {i.invoice_date ? formatDay(i.invoice_date) : `Uploaded ${formatDay(i.created_at.slice(0, 10))}`}
                      {order && <> · for {order.description}</>}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-stone-900">{formatMoney(i.amount)}</td>
                  <td className="px-4 py-2">
                    <Badge tone={i.paid ? 'green' : 'amber'}>{i.paid ? 'Paid' : 'Unpaid'}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <InvoiceActions supplierId={supplier.id} invoiceId={i.id} paid={i.paid} />
                  </td>
                </tr>
              );
            })}
            {!invoiceList.length && (
              <tr>
                <td className="px-4 py-6 text-center text-stone-400">No invoices uploaded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
