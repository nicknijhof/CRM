import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentRole } from '@/lib/profile';
import type { ProfileRole } from '@/lib/types';

export type FeatureId =
  | 'dashboard'
  | 'whos_in'
  | 'members'
  | 'manage_purchases'
  | 'pipeline'
  | 'coming_back'
  | 'import'
  | 'discounts'
  | 'sales_tracker'
  | 'cafe_orders'
  | 'cafe_menu'
  | 'marketing_overview'
  | 'analytics'
  | 'funnel'
  | 'blog'
  | 'newsletter';

export type FeatureGroup = 'Clients' | 'Sales' | 'Cafe' | 'Marketing' | 'General';

export const FEATURES: { id: FeatureId; label: string; hint: string; group: FeatureGroup; path: string }[] = [
  { id: 'dashboard', label: 'Dashboard', hint: 'Home overview', group: 'General', path: '/' },
  { id: 'whos_in', label: "Who's In", hint: 'Live check-ins', group: 'Clients', path: '/checked-in' },
  { id: 'members', label: 'Members', hint: 'Member list and profiles', group: 'Clients', path: '/contacts' },
  {
    id: 'manage_purchases',
    label: 'Add & edit purchases and payments',
    hint: 'On a member profile: sell passes, take payments, pause/cancel',
    group: 'Clients',
    path: '/contacts',
  },
  { id: 'pipeline', label: 'Pipeline', hint: 'Lead and member stages', group: 'Sales', path: '/pipeline' },
  { id: 'coming_back', label: 'Coming Back', hint: 'Win-back list', group: 'Sales', path: '/coming-back' },
  { id: 'import', label: 'Import', hint: 'Bulk import contacts', group: 'Sales', path: '/import' },
  { id: 'discounts', label: 'Discounts (view only)', hint: 'See active discount codes', group: 'Sales', path: '/discounts' },
  { id: 'sales_tracker', label: 'Sales Tracker', hint: 'Revenue by payment method — PayNow, Stripe, Qashier, Cash', group: 'Sales', path: '/sales' },
  { id: 'cafe_orders', label: 'Cafe orders', hint: 'Live cafe order queue', group: 'Cafe', path: '/cafe/orders' },
  { id: 'cafe_menu', label: 'Cafe menu (view only)', hint: 'See the menu', group: 'Cafe', path: '/cafe/menu' },
  { id: 'marketing_overview', label: 'Marketing overview', hint: 'Marketing home and Instagram stats', group: 'Marketing', path: '/marketing' },
  { id: 'analytics', label: 'Analytics', hint: 'Membership analytics', group: 'Marketing', path: '/marketing/analytics' },
  { id: 'funnel', label: 'Funnel & Member Goals', hint: 'Funnel and goals view', group: 'Marketing', path: '/funnel' },
  { id: 'blog', label: 'Blog', hint: 'Write and edit website blog posts', group: 'Marketing', path: '/marketing/blog' },
  { id: 'newsletter', label: 'Newsletter', hint: 'Send the email newsletter', group: 'Marketing', path: '/marketing/newsletter' },
];

export const FEATURE_GROUPS: FeatureGroup[] = ['General', 'Clients', 'Sales', 'Cafe', 'Marketing'];

export type ConfigurableRole = 'staff' | 'marketing';
export const CONFIGURABLE_ROLES: { id: ConfigurableRole; label: string }[] = [
  { id: 'staff', label: 'Staff login' },
  { id: 'marketing', label: 'Marketing login' },
];

// What each shared login can do before anyone customizes it — matches how the CRM behaved
// before this setting existed, so turning it on changes nothing by itself.
export const DEFAULT_FEATURES: Record<ConfigurableRole, FeatureId[]> = {
  staff: ['dashboard', 'whos_in', 'members', 'manage_purchases', 'coming_back', 'import', 'cafe_orders', 'cafe_menu'],
  marketing: ['members', 'pipeline', 'marketing_overview', 'analytics', 'funnel', 'blog', 'newsletter'],
};

export function isConfigurableRole(role: string | null): role is ConfigurableRole {
  return role === 'staff' || role === 'marketing';
}

const ALL_FEATURE_IDS = FEATURES.map((f) => f.id);

// Owner/admin always have everything; staff and marketing get their defaults with any saved
// overrides applied on top.
export const getAllowedFeatures = cache(async (role: ProfileRole | null): Promise<Set<FeatureId>> => {
  if (!role) return new Set();
  if (!isConfigurableRole(role)) return new Set(ALL_FEATURE_IDS);

  const allowed = new Set<FeatureId>(DEFAULT_FEATURES[role]);
  const { data } = await createAdminClient().from('role_feature_access').select('feature, allowed').eq('role', role);
  for (const row of data ?? []) {
    if (!ALL_FEATURE_IDS.includes(row.feature as FeatureId)) continue;
    if (row.allowed) allowed.add(row.feature as FeatureId);
    else allowed.delete(row.feature as FeatureId);
  }
  return allowed;
});

export async function hasFeature(role: ProfileRole | null, feature: FeatureId): Promise<boolean> {
  return (await getAllowedFeatures(role)).has(feature);
}

export async function firstAllowedPath(role: ProfileRole | null): Promise<string> {
  const allowed = await getAllowedFeatures(role);
  const first = FEATURES.find((f) => f.id !== 'manage_purchases' && allowed.has(f.id));
  return first ? first.path : '/no-access';
}

// Call at the top of a page: sends the person away if their login isn't allowed to see it.
export async function requireFeature(feature: FeatureId): Promise<ProfileRole> {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!role) redirect('/login');
  if (!(await hasFeature(role, feature))) redirect(await firstAllowedPath(role));
  return role;
}

// For server actions: throws instead of redirecting when the caller's login isn't allowed.
export async function assertFeature(feature: FeatureId, message = 'Not authorized'): Promise<ProfileRole> {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!role || !(await hasFeature(role, feature))) throw new Error(message);
  return role;
}
