'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canManageBlog, getCurrentRole } from '@/lib/profile';

// Same access bar as the rest of the Marketing page's write actions — the
// edge function itself only accepts a service-role call, so this action
// (not the signed-in staff session) is what's actually authorized to
// trigger it, gated here the same way canManageBlog gates the Blog page.
export async function syncInstagramNow(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!canManageBlog(role)) {
    return { ok: false, error: 'Not authorized.' };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.functions.invoke<{ error?: string }>('sync-instagram-stats');
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };

  revalidatePath('/marketing');
  return { ok: true };
}

export async function addInstagramStat(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const optionalInt = (field: string) => (formData.get(field) ? Number(formData.get(field)) : null);

  const { error } = await supabase.from('instagram_stats').insert({
    stat_date: String(formData.get('stat_date')),
    followers: Number(formData.get('followers')) || 0,
    views: optionalInt('views'),
    reach: optionalInt('reach'),
    interactions: optionalInt('interactions'),
    accounts_engaged: optionalInt('accounts_engaged'),
    profile_visits: optionalInt('profile_visits'),
    external_link_taps: optionalInt('external_link_taps'),
    note: (formData.get('note') as string) || null,
    recorded_by: user?.id ?? null,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/marketing');
}
