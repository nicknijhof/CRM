'use client';

import { useState, useTransition } from 'react';
import { deleteInvoice, deleteOrder, deleteSupplier, setInvoicePaid, updateSupplier } from '@/app/(app)/business/suppliers/actions';
import type { Supplier } from '@/lib/types';
import SupplierForm from './SupplierForm';
import { dangerBtn, ghostBtn } from './ui';

export function SupplierEditor({ supplier }: { supplier: Supplier }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  if (editing) {
    return (
      <div className="rounded-xl border border-teal-300 bg-teal-50/40 p-4">
        <SupplierForm supplier={supplier} action={updateSupplier.bind(null, supplier.id)} submitLabel="Save changes" onDone={() => setEditing(false)} />
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <button onClick={() => setEditing(true)} className={ghostBtn}>
        Edit details
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm(`Delete ${supplier.name}, its orders and its stored invoices? This can't be undone.`)) startTransition(() => deleteSupplier(supplier.id));
        }}
        className={dangerBtn}
      >
        Delete supplier
      </button>
    </div>
  );
}

export function DeleteOrderButton({ supplierId, orderId }: { supplierId: string; orderId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm('Delete this order? Invoices linked to it are kept.')) startTransition(() => deleteOrder(supplierId, orderId));
      }}
      className={dangerBtn}
    >
      Delete
    </button>
  );
}

export function InvoiceActions({ supplierId, invoiceId, paid }: { supplierId: string; invoiceId: string; paid: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-1">
      <button disabled={pending} onClick={() => startTransition(() => setInvoicePaid(supplierId, invoiceId, !paid))} className={ghostBtn}>
        {paid ? 'Mark unpaid' : 'Mark paid'}
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm('Delete this invoice and its file?')) startTransition(() => deleteInvoice(supplierId, invoiceId));
        }}
        className={dangerBtn}
      >
        Delete
      </button>
    </div>
  );
}
