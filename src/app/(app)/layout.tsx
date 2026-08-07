import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '../login/actions';
import { canManageDiscounts, getCurrentRole } from '@/lib/profile';
import NavDropdown from '@/components/NavDropdown';

type NavItem =
  | { type: 'link'; href: string; label: string }
  | { type: 'dropdown'; label: string; links: { href: string; label: string }[] };

const NAV_LINKS: NavItem[] = [
  { type: 'link', href: '/', label: 'Dashboard' },
  {
    type: 'dropdown',
    label: 'Clients',
    links: [
      { href: '/checked-in', label: "Who's In" },
      { href: '/contacts', label: 'Members' },
    ],
  },
  { type: 'link', href: '/pipeline', label: 'Pipeline' },
  { type: 'link', href: '/coming-back', label: 'Coming Back' },
  { type: 'link', href: '/import', label: 'Import' },
  { type: 'link', href: '/discounts', label: 'Discounts' },
];

const MARKETING_NAV_LINKS: NavItem[] = [
  { type: 'link', href: '/marketing', label: 'Marketing' },
  { type: 'link', href: '/contacts', label: 'Clients' },
  { type: 'link', href: '/pipeline', label: 'Pipeline' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getCurrentRole(supabase);
  const navLinks =
    role === 'marketing'
      ? MARKETING_NAV_LINKS
      : canManageDiscounts(role)
        ? [...NAV_LINKS, { type: 'link' as const, href: '/marketing', label: 'Marketing' }]
        : NAV_LINKS;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-stone-200 bg-white px-4 py-6">
        <div className="mb-8 flex items-center gap-2">
          <Image src="/logo.jpg" alt="Sochill Bath Club" width={36} height={36} className="rounded-lg" />
          <div>
            <p className="text-sm font-semibold tracking-wide text-teal-600">SOCHILL</p>
            <p className="text-xs text-stone-500">Bath Club CRM</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navLinks.map((item) =>
            item.type === 'dropdown' ? (
              <NavDropdown key={item.label} label={item.label} links={item.links} />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-100 hover:text-stone-900"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="border-t border-stone-200 pt-4">
          <p className="truncate text-xs text-stone-500">{user?.email}</p>
          <form action={signOut}>
            <button className="mt-2 text-xs text-stone-500 underline hover:text-stone-700">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-stone-50 p-8">{children}</main>
    </div>
  );
}
