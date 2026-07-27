import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProfileRole } from './types';

export async function getCurrentRole(supabase: SupabaseClient): Promise<ProfileRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return (data?.role as ProfileRole) ?? null;
}

export function canManageDiscounts(role: ProfileRole | null): boolean {
  return role === 'admin' || role === 'owner';
}

export function canManagePurchases(role: ProfileRole | null): boolean {
  return role !== 'marketing';
}

export function homePathForRole(role: ProfileRole | null): string {
  return role === 'marketing' ? '/marketing' : '/';
}
