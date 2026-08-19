import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '../login/actions';
import { canCustomizeNav, getCurrentProfile } from '@/lib/profile';
import { MARKETING_ROLE_NAV, STAFF_NAV, resolveOwnerAdminNav } from '@/lib/nav';
import NavDropdown from '@/components/NavDropdown';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getCurrentProfile(supabase);
  const role = profile?.role ?? null;
  const navLinks =
    role === 'marketing'
      ? MARKETING_ROLE_NAV
      : canCustomizeNav(role)
        ? resolveOwnerAdminNav(profile!.visible_nav_items)
        : STAFF_NAV;

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
            <button className="mt-2 text-xs text-stone-500 underline hover:text-stone-700">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-stone-50 p-8">{children}</main>
    </div>
  );
}
