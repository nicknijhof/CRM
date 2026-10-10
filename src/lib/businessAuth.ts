import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canManageBusiness, getCurrentRole } from '@/lib/profile';
import { firstAllowedPath } from '@/lib/permissions';

// Top of every Business page: sends anyone who isn't an owner/admin away.
export async function requireBusiness() {
  const role = await getCurrentRole();
  if (!role) redirect('/login');
  if (!canManageBusiness(role)) redirect(await firstAllowedPath(role));
  return createClient();
}

// Top of every Business server action.
export async function assertBusiness() {
  const role = await getCurrentRole();
  if (!canManageBusiness(role)) throw new Error('Only owners and admins can manage this');
  return createClient();
}

export function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim();
  return v === '' ? null : v;
}
export function num(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
