'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { recordInvoice } from '@/app/(app)/business/suppliers/actions';
import type { SupplierOrder } from '@/lib/types';
import { formatDay } from '@/lib/business';
import { Field, inputCls, primaryBtn } from './ui';

const MAX_BYTES = 20 * 1024 * 1024;

export default function InvoiceUploader({ supplierId, orders }: { supplierId: string; orders: SupplierOrder[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get('file') as File | null;
    if (!file || file.size === 0) return setError('Choose a file to upload');
    if (file.size > MAX_BYTES) return setError('That file is over 20 MB');

    setBusy(true);
    try {
      const safeName = file.name.replace(/[^\w.\- ]+/g, '_');
      const path = `${supplierId}/${crypto.randomUUID()}-${safeName}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from('supplier-invoices').upload(path, file, { contentType: file.type || undefined });
      if (uploadError) throw new Error(uploadError.message);

      const amount = String(fd.get('amount') ?? '').trim();
      try {
        await recordInvoice(supplierId, {
          file_path: path,
          file_name: file.name,
          invoice_number: String(fd.get('invoice_number') ?? '').trim() || null,
          invoice_date: String(fd.get('invoice_date') ?? '') || null,
          amount: amount === '' ? null : Number(amount),
          order_id: String(fd.get('order_id') ?? '') || null,
        });
      } catch (err) {
        // Don't leave an orphaned file behind if saving the record failed.
        await supabase.storage.from('supplier-invoices').remove([path]);
        throw err;
      }
      formRef.current?.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid grid-cols-4 gap-3 rounded-lg bg-stone-50 p-3">
      <Field label="Invoice file (PDF or photo)" className="col-span-2">
        <input name="file" type="file" accept="application/pdf,image/*" required className="mt-1 block w-full text-sm text-stone-700" />
      </Field>
      <Field label="Invoice no.">
        <input name="invoice_number" className={inputCls} />
      </Field>
      <Field label="Invoice date">
        <input name="invoice_date" type="date" className={inputCls} />
      </Field>
      <Field label="Amount (S$)">
        <input name="amount" type="number" step="0.01" min="0" className={inputCls} />
      </Field>
      <Field label="For which order (optional)" className="col-span-2">
        <select name="order_id" defaultValue="" className={inputCls}>
          <option value="">Not linked to an order</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {formatDay(o.order_date)} — {o.description}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex items-end">
        <button disabled={busy} className={`${primaryBtn} disabled:opacity-60`}>
          {busy ? 'Uploading…' : 'Upload invoice'}
        </button>
      </div>
      {error && <p className="col-span-4 text-sm text-red-600">{error}</p>}
    </form>
  );
}
