export type NavItem =
  | { type: 'link'; id: string; href: string; label: string }
  | { type: 'dropdown'; id: string; label: string; links: { href: string; label: string }[] };

export const DASHBOARD_ITEM: NavItem = { type: 'link', id: 'dashboard', href: '/', label: 'Dashboard' };
export const SETTINGS_ITEM: NavItem = { type: 'link', id: 'settings', href: '/settings', label: 'Settings' };

const CLIENTS_ITEM: NavItem = {
  type: 'dropdown',
  id: 'clients',
  label: 'Clients',
  links: [
    { href: '/checked-in', label: "Who's In" },
    { href: '/contacts', label: 'Members' },
  ],
};
const PIPELINE_ITEM: NavItem = { type: 'link', id: 'pipeline', href: '/pipeline', label: 'Pipeline' };
const COMING_BACK_ITEM: NavItem = { type: 'link', id: 'coming_back', href: '/coming-back', label: 'Coming Back' };
const IMPORT_ITEM: NavItem = { type: 'link', id: 'import', href: '/import', label: 'Import' };
const DISCOUNTS_ITEM: NavItem = { type: 'link', id: 'discounts', href: '/discounts', label: 'Discounts' };
const MARKETING_ITEM: NavItem = {
  type: 'dropdown',
  id: 'marketing',
  label: 'Marketing',
  links: [
    { href: '/marketing', label: 'Marketing' },
    { href: '/marketing/analytics', label: 'Analytics' },
    { href: '/funnel', label: 'Funnel & Member Goals' },
  ],
};

// Full sidebar for owner/admin before any personal "My sidebar" filtering is applied.
export const OWNER_ADMIN_NAV: NavItem[] = [
  DASHBOARD_ITEM,
  CLIENTS_ITEM,
  PIPELINE_ITEM,
  COMING_BACK_ITEM,
  IMPORT_ITEM,
  DISCOUNTS_ITEM,
  MARKETING_ITEM,
];

// Staff can't manage discounts/marketing, so those never show regardless of any
// personal customization (customization is owner/admin-only, see canCustomizeNav).
// The Funnel view lives under Marketing, so staff don't get it either.
export const STAFF_NAV: NavItem[] = [
  DASHBOARD_ITEM,
  CLIENTS_ITEM,
  PIPELINE_ITEM,
  COMING_BACK_ITEM,
  IMPORT_ITEM,
  DISCOUNTS_ITEM,
];

export const MARKETING_ROLE_NAV: NavItem[] = [
  MARKETING_ITEM,
  { type: 'link', id: 'clients', href: '/contacts', label: 'Clients' },
  PIPELINE_ITEM,
];

// The sections an owner/admin can individually toggle on their own sidebar.
// Dashboard and Settings are always pinned so nobody can customize their way
// to a dead end with no way back into Settings.
export const CUSTOMIZABLE_NAV_ITEMS: NavItem[] = [
  CLIENTS_ITEM,
  PIPELINE_ITEM,
  COMING_BACK_ITEM,
  IMPORT_ITEM,
  DISCOUNTS_ITEM,
  MARKETING_ITEM,
];

// null visibleNavItems means "never customized" -> show everything (today's default).
// A (possibly empty) array means "show exactly these ids".
export function resolveOwnerAdminNav(visibleNavItems: string[] | null): NavItem[] {
  if (visibleNavItems === null) return [...OWNER_ADMIN_NAV, SETTINGS_ITEM];
  const visible = new Set(visibleNavItems);
  return [DASHBOARD_ITEM, ...CUSTOMIZABLE_NAV_ITEMS.filter((item) => visible.has(item.id)), SETTINGS_ITEM];
}
