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
const EXPORT_ITEM: NavItem = { type: 'link', id: 'export', href: '/export', label: 'Data Export' };
const BROADCAST_ITEM: NavItem = { type: 'link', id: 'broadcast', href: '/broadcast', label: 'Push Notification' };
const CAFE_ITEM: NavItem = {
  type: 'dropdown',
  id: 'cafe',
  label: 'Cafe',
  links: [
    { href: '/cafe/orders', label: 'Orders' },
    { href: '/cafe/menu', label: 'Menu' },
  ],
};
const MARKETING_ITEM: NavItem = {
  type: 'dropdown',
  id: 'marketing',
  label: 'Marketing',
  links: [
    { href: '/marketing', label: 'Marketing' },
    { href: '/marketing/analytics', label: 'Analytics' },
    { href: '/funnel', label: 'Funnel & Member Goals' },
    { href: '/marketing/blog', label: 'Blog' },
    { href: '/marketing/newsletter', label: 'Newsletter' },
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
  CAFE_ITEM,
  MARKETING_ITEM,
  EXPORT_ITEM,
  BROADCAST_ITEM,
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
  CAFE_ITEM,
  MARKETING_ITEM,
  EXPORT_ITEM,
  BROADCAST_ITEM,
];

// null visibleNavItems means "never customized" -> show everything (today's default).
// A (possibly empty) array means "show exactly these ids".
export function resolveOwnerAdminNav(visibleNavItems: string[] | null): NavItem[] {
  if (visibleNavItems === null) return [...OWNER_ADMIN_NAV, SETTINGS_ITEM];
  const visible = new Set(visibleNavItems);
  return [DASHBOARD_ITEM, ...CUSTOMIZABLE_NAV_ITEMS.filter((item) => visible.has(item.id)), SETTINGS_ITEM];
}

// Sidebar for the shared staff/marketing logins, built from the features the owner allows them.
// A dropdown with a single visible link collapses to a plain link.
export function buildNavForFeatures(allowed: ReadonlySet<string>): NavItem[] {
  const items: NavItem[] = [];
  const link = (id: string, href: string, label: string) => ({ id, href, label });

  if (allowed.has('dashboard')) items.push(DASHBOARD_ITEM);

  const groupOf = (id: string, label: string, links: { feature: string; href: string; label: string }[]) => {
    const visible = links.filter((l) => allowed.has(l.feature));
    if (visible.length === 0) return;
    if (visible.length === 1) items.push({ type: 'link', ...link(id, visible[0].href, visible.length === links.length ? label : visible[0].label) });
    else items.push({ type: 'dropdown', id, label, links: visible.map((l) => ({ href: l.href, label: l.label })) });
  };

  groupOf('clients', 'Clients', [
    { feature: 'whos_in', href: '/checked-in', label: "Who's In" },
    { feature: 'members', href: '/contacts', label: 'Members' },
  ]);
  if (allowed.has('pipeline')) items.push(PIPELINE_ITEM);
  if (allowed.has('coming_back')) items.push(COMING_BACK_ITEM);
  if (allowed.has('import')) items.push(IMPORT_ITEM);
  if (allowed.has('discounts')) items.push(DISCOUNTS_ITEM);
  groupOf('cafe', 'Cafe', [
    { feature: 'cafe_orders', href: '/cafe/orders', label: 'Orders' },
    { feature: 'cafe_menu', href: '/cafe/menu', label: 'Menu' },
  ]);
  groupOf('marketing', 'Marketing', [
    { feature: 'marketing_overview', href: '/marketing', label: 'Marketing' },
    { feature: 'analytics', href: '/marketing/analytics', label: 'Analytics' },
    { feature: 'funnel', href: '/funnel', label: 'Funnel & Member Goals' },
    { feature: 'blog', href: '/marketing/blog', label: 'Blog' },
    { feature: 'newsletter', href: '/marketing/newsletter', label: 'Newsletter' },
  ]);

  return items;
}
