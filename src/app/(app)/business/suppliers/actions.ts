'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertBusiness, num, str } from '@/lib/businessAuth';
import type { ContactChannel } from '@/lib/types';

function supplierFields(fd: FormData) {
  const name = str(fd, 'name');
  if (!name) throw new Error('Give the supplier a name');
  return {
    name,
    category: str(fd, 'category'),
    what_we_buy: str(fd, 'what_we_buy'),
    status: (str(fd, 'status') ?? 'active') as 'active' | 'inactive',
    contact_name: str(fd, 'contact_name'),
    preferred_channel: (str(fd, 'preferred_channel') ?? 'whatsapp') as ContactChannel,
    phone: str(fd, 'phone'),
    email: str(fd, 'email'),
    website: str(fd, 'website'),
    address: str(fd, 'address'),
    uen: str(fd, 'uen'),
    payment_terms: str(fd, 'payment_terms'),
    notes: str(fd, 'notes'),
  };
}

export async function createSupplier(fd: FormData) {
  const supabase = await assertBusiness();
  const { data, error } = await supabase.from('suppliers').insert(supplierFields(fd)).select('id').single();
  if (error) throw new Error(error.message);
  revalidatePath('/business/suppliers');
  revalidatePath('/business');
  redirect(`/business/suppliers/${data.id}`);
}

export async function updateSupplier(id: string, fd: FormData) {
  const supabase = await assertBusiness();
  const { error } = await supabase.from('suppliers').update(supplierFields(fd)).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/business/suppliers');
  revalidatePath(`/business/suppliers/${id}`);
}

export async function deleteSupplier(id: string) {
  const supabase = await assertBusiness();
  // Remove stored invoice files too, so nothing is left behind in the bucket.
  const { data: invoices } = await supabase.from('supplier_invoices').select('file_path').eq('supplier_id', id);
  const paths = (invoices ?? []).map((i) => i.file_path as string);
  if (paths.length) await supabase.storage.from('supplier-invoices').remove(paths);
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/business/suppliers');
  revalidatePath('/business');
  redirect('/business/suppliers');
}

export async function addOrder(supplierId: string, fd: FormData) {
  const supabase = await assertBusiness();
  const description = str(fd, 'description');
  if (!description) throw new Error('Say what was ordered');
  const { error } = await supabase.from('supplier_orders').insert({
    supplier_id: supplierId,
    order_date: str(fd, 'order_date') ?? new Date().toISOString().slice(0, 10),
    description,
    amount: num(fd, 'amount'),
    notes: str(fd, 'notes'),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/business/suppliers/${supplierId}`);
}

export async function deleteOrder(supplierId: string, orderId: string) {
  const supabase = await assertBusiness();
  const { error } = await supabase.from('supplier_orders').delete().eq('id', orderId);
  if (error) throw new Error(error.message);
  revalidatePath(`/business/suppliers/${supplierId}`);
}

// The file itself is uploaded from the browser straight to storage (so large PDFs and phone photos
// aren't squeezed through a server action); this records it against the supplier.
export async function recordInvoice(
  supplierId: string,
  input: { file_path: string; file_name: string; invoice_number: string | null; invoice_date: string | null; amount: number | null; order_id: string | null },
) {
  const supabase = await assertBusiness();
  if (!input.file_path.startsWith(`${supplierId}/`)) throw new Error('Invalid file path');
  const { error } = await supabase.from('supplier_invoices').insert({ supplier_id: supplierId, ...input });
  if (error) throw new Error(error.message);
  revalidatePath(`/business/suppliers/${supplierId}`);
}

export async function setInvoicePaid(supplierId: string, invoiceId: string, paid: boolean) {
  const supabase = await assertBusiness();
  const { error } = await supabase.from('supplier_invoices').update({ paid }).eq('id', invoiceId);
  if (error) throw new Error(error.message);
  revalidatePath(`/business/suppliers/${supplierId}`);
}

export async function deleteInvoice(supplierId: string, invoiceId: string) {
  const supabase = await assertBusiness();
  const { data: inv } = await supabase.from('supplier_invoices').select('file_path').eq('id', invoiceId).single();
  if (inv) await supabase.storage.from('supplier-invoices').remove([inv.file_path as string]);
  const { error } = await supabase.from('supplier_invoices').delete().eq('id', invoiceId);
  if (error) throw new Error(error.message);
  revalidatePath(`/business/suppliers/${supplierId}`);
}
