import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile, ProfileRole } from './types';

export async function getCurrentRole(supabase: SupabaseClient): Promise<ProfileRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return (data?.role as ProfileRole) ?? null;
}

export async function getCurrentProfile(
  supabase: SupabaseClient,
): Promise<Pick<Profile, 'id' | 'role' | 'visible_nav_items'> | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('id, role, visible_nav_items').eq('id', user.id).single();
  return (data as Pick<Profile, 'id' | 'role' | 'visible_nav_items'>) ?? null;
}

export function canManageDiscounts(role: ProfileRole | null): boolean {
  return role === 'admin' || role === 'owner';
}

export function canManagePurchases(role: ProfileRole | null): boolean {
  return role !== 'marketing';
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

export function homePathForRole(role: ProfileRole | null): string {
  return role === 'marketing' ? '/marketing' : '/';
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
