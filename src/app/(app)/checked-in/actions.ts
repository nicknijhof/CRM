'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function manualCheckIn(contactId: string) {
  const supabase = await createClient();

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
