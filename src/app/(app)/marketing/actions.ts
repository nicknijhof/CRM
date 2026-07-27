'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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
