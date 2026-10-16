'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { effectivePurchaseStatus } from '@/lib/purchases';
import type { Purchase } from '@/lib/types';

export async function manualCheckIn(contactId: string) {
  const supabase = await createClient();

  const { data: purchases } = await supabase
    .from('purchases')
    .select('*')
    .eq('contact_id', contactId)
    .returns<Purchase[]>();

  const hasActivePlan = (purchases ?? []).some((p) => effectivePurchaseStatus(p) === 'active');
  if (!hasActivePlan) {
    // No pass of their own: a member tagged with a company account (e.g. NBC Universal) uses that
    // company's pack. The session comes off it and the member's name is recorded against it.
    const { data: company } = await supabase.rpc('company_pack_for', { p_contact: contactId });
    const pack = Array.isArray(company) ? company[0] : company;
    if (!pack?.purchase_id) throw new Error('This member has no active membership or session pack.');

    const { data: row, error: fetchError } = await supabase
      .from('purchases')
      .select('sessions_remaining')
      .eq('id', pack.purchase_id)
      .single();
    if (fetchError || !row || (row.sessions_remaining ?? 0) <= 0) throw new Error("The company's session pack has no sessions left.");
    const left = row.sessions_remaining - 1;
    const { error: deductError } = await supabase
      .from('purchases')
      .update({ sessions_remaining: left, status: left === 0 ? 'used_up' : 'active', used_up_at: left === 0 ? new Date().toISOString() : null })
      .eq('id', pack.purchase_id);
    if (deductError) throw new Error(deductError.message);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from('purchase_adjustments').insert({
      purchase_id: pack.purchase_id,
      delta: -1,
      note: 'Desk check-in (company pack)',
      staff_id: user?.id ?? null,
      used_by_contact_id: contactId,
    });
  }

  const { error } = await supabase.from('visits').insert({
    contact_id: contactId,
    visit_date: new Date().toISOString(),
    service: 'other',
  });

  if (error) throw new Error(error.message);
  revalidatePath('/checked-in');
}

export async function checkOut(visitId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('visits')
    .update({ checked_out_at: new Date().toISOString() })
    .eq('id', visitId);

  if (error) throw new Error(error.message);
  revalidatePath('/checked-in');
}
