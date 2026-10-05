import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { Profile, ProfileRole } from './types';

// One auth lookup + profile read per request, shared by every caller on the page. Each page
// used to repeat this (auth round trip + profile query) several times in sequence before any
// real data loaded. The `supabase` args below are kept for call-site compatibility only.
const loadCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('id, role, visible_nav_items').eq('id', user.id).single();
  return (data as Pick<Profile, 'id' | 'role' | 'visible_nav_items'>) ?? null;
});

export async function getCurrentRole(_supabase?: SupabaseClient): Promise<ProfileRole | null> {
  return ((await loadCurrentProfile())?.role as ProfileRole) ?? null;
}

export async function getCurrentProfile(
  _supabase?: SupabaseClient,
): Promise<Pick<Profile, 'id' | 'role' | 'visible_nav_items'> | null> {
  return loadCurrentProfile();
}

export function canEditTags(role: ProfileRole | null): boolean {
  return role === 'admin' || role === 'owner';
}

export function canManageDiscounts(role: ProfileRole | null): boolean {
  return role === 'admin' || role === 'owner';
}

export function canManageCafeMenu(role: ProfileRole | null): boolean {
  return role === 'admin' || role === 'owner';
}

// A bulk data export is far more sensitive than the day-to-day contact access
// every admin/owner already has, so it's gated the same way discounts/cafe
// management are (admin+owner) — the two-admin approval on top of this lives
// in the export actions themselves, not here.
export function canManageDataExports(role: ProfileRole | null): boolean {
  return role === 'admin' || role === 'owner';
}

// Only the owner can grant/revoke team access — an admin granting other admins
// would be a privilege-escalation path, so this stays a level above canManageDiscounts.
export function canManageTeam(role: ProfileRole | null): boolean {
  return role === 'owner';
}

// Owner and whoever they've made admin can personalize their own sidebar.
export function canCustomizeNav(role: ProfileRole | null): boolean {
  return role === 'owner' || role === 'admin';
}

// A broadcast push notification reaches every member with notifications on —
// same bar as discounts/data exports, not something plain staff should trigger.
export function canSendBroadcasts(role: ProfileRole | null): boolean {
  return role === 'admin' || role === 'owner';
}

