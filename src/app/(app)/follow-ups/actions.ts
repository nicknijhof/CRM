'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function markFollowedUp(contactId: string, triggerType: string, triggerId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('follow_up_completions').upsert(
    { contact_id: contactId, trigger_type: triggerType, trigger_id: triggerId, completed_by: user?.id ?? null },
    { onConflict: 'trigger_type,trigger_id' },
  );

  if (error) throw new Error(error.message);
  revalidatePath('/follow-ups');
  revalidatePath('/marketing');
}

export async function unmarkFollowedUp(triggerType: string, triggerId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('follow_up_completions')
    .delete()
    .eq('trigger_type', triggerType)
    .eq('trigger_id', triggerId);

  if (error) throw new Error(error.message);
  revalidatePath('/follow-ups');
  revalidatePath('/marketing');
}
