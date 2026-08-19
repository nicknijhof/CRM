'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canCustomizeNav, canManageTeam, getCurrentProfile } from '@/lib/profile';
import { CUSTOMIZABLE_NAV_ITEMS } from '@/lib/nav';
import type { ProfileRole } from '@/lib/types';

const ASSIGNABLE_ROLES: ProfileRole[] = ['admin', 'staff', 'marketing'];

export async function updateVisibleNavItems(formData: FormData) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile || !canCustomizeNav(profile.role)) throw new Error('Not allowed');

  const validIds = new Set(CUSTOMIZABLE_NAV_ITEMS.map((item) => item.id));
  const selected = formData
    .getAll('nav_items')
    .map(String)
    .filter((id) => validIds.has(id));

  const { error } = await supabase.from('profiles').update({ visible_nav_items: selected }).eq('id', profile.id);
  if (error) throw new Error(error.message);

  revalidatePath('/', 'layout');
}

export async function resetVisibleNavItems() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile || !canCustomizeNav(profile.role)) throw new Error('Not allowed');

  const { error } = await supabase.from('profiles').update({ visible_nav_items: null }).eq('id', profile.id);
  if (error) throw new Error(error.message);

  revalidatePath('/', 'layout');
}

// auth.users is shared with the customer-facing member app (see migration 0024),
// so it can hold far more rows than just staff — page through it rather than
// assuming a match is in the first page.
async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  const perPage = 1000;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < perPage) return null;
  }
  return null;
}

export async function addTeamMember(formData: FormData) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile || !canManageTeam(profile.role)) throw new Error('Not allowed');

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const role = String(formData.get('role') ?? '') as ProfileRole;
  if (!email) throw new Error('Email is required');
  if (!ASSIGNABLE_ROLES.includes(role)) throw new Error('Invalid role');

  const admin = createAdminClient();

  // Someone might already have a login (an existing customer of the member
  // app, or a previously-invited teammate) — reuse that account rather than
  // always sending a fresh invite email.
  const existingUser = await findAuthUserByEmail(admin, email);

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
    if (inviteError || !invited.user) throw new Error(inviteError?.message ?? 'Could not send invite');
    userId = invited.user.id;
  }

  const { data: existingProfile } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (existingProfile?.role === 'owner') throw new Error("That's the owner's account — can't change its role here.");

  const { error: upsertError } = await admin.from('profiles').upsert({ id: userId, role }, { onConflict: 'id' });
  if (upsertError) throw new Error(upsertError.message);

  revalidatePath('/settings');
}

export async function updateTeamMemberRole(profileId: string, formData: FormData) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile || !canManageTeam(profile.role)) throw new Error('Not allowed');
  if (profileId === profile.id) throw new Error("Can't change your own role here");

  const role = String(formData.get('role') ?? '') as ProfileRole;
  if (!ASSIGNABLE_ROLES.includes(role)) throw new Error('Invalid role');

  const admin = createAdminClient();
  const { data: target } = await admin.from('profiles').select('role').eq('id', profileId).single();
  if (target?.role === 'owner') throw new Error("Can't change the owner's role");

  const { error } = await admin.from('profiles').update({ role }).eq('id', profileId);
  if (error) throw new Error(error.message);

  revalidatePath('/settings');
}

export async function removeTeamMember(profileId: string) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile || !canManageTeam(profile.role)) throw new Error('Not allowed');
  if (profileId === profile.id) throw new Error("Can't remove yourself");

  const admin = createAdminClient();
  const { data: target } = await admin.from('profiles').select('role').eq('id', profileId).single();
  if (target?.role === 'owner') throw new Error("Can't remove the owner");

  const { error } = await admin.from('profiles').delete().eq('id', profileId);
  if (error) throw new Error(error.message);

  revalidatePath('/settings');
}
