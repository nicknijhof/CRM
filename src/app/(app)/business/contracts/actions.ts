'use server';

import { revalidatePath } from 'next/cache';
import { assertBusiness, num, str } from '@/lib/businessAuth';
import type { BillingCycle } from '@/lib/types';

function fields(fd: FormData) {
  const name = str(fd, 'name');
  if (!name) throw new Error('Give the contract a name');
  const notice = num(fd, 'notice_days');
  return {
    name,
    provider: str(fd, 'provider'),
    supplier_id: str(fd, 'supplier_id'),
    category: str(fd, 'category'),
    price: num(fd, 'price'),
    billing_cycle: (str(fd, 'billing_cycle') ?? 'monthly') as BillingCycle,
    start_date: str(fd, 'start_date'),
    renewal_date: str(fd, 'renewal_date'),
    auto_renews: fd.get('auto_renews') === 'on',
    notice_days: notice === null ? null : Math.max(0, Math.round(notice)),
    cancellation_policy: str(fd, 'cancellation_policy'),
    contact_name: str(fd, 'contact_name'),
    contact_detail: str(fd, 'contact_detail'),
    notes: str(fd, 'notes'),
  };
}

function refresh() {
  revalidatePath('/business/contracts');
  revalidatePath('/business');
  revalidatePath('/');
}

export async function createContract(fd: FormData) {
  const supabase = await assertBusiness();
  const { error } = await supabase.from('contracts').insert(fields(fd));
  if (error) throw new Error(error.message);
  refresh();
}

export async function updateContract(id: string, fd: FormData) {
  const supabase = await assertBusiness();
  const { error } = await supabase.from('contracts').update(fields(fd)).eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

// Marks the current renewal as dealt with (renewed, or notice already given). The reminder comes
// back on its own once the renewal date is moved to the next term.
export async function markRenewalHandled(id: string, renewalDate: string) {
  const supabase = await assertBusiness();
  const { error } = await supabase.from('contracts').update({ handled_for_renewal: renewalDate }).eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function reopenRenewal(id: string) {
  const supabase = await assertBusiness();
  const { error } = await supabase.from('contracts').update({ handled_for_renewal: null }).eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function setContractStatus(id: string, status: 'active' | 'ended') {
  const supabase = await assertBusiness();
  const { error } = await supabase.from('contracts').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteContract(id: string) {
  const supabase = await assertBusiness();
  const { error } = await supabase.from('contracts').delete().eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}
