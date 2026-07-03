import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '../login/actions';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/import', label: 'Import' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900 px-4 py-6">
        <div className="mb-8">
          <p className="text-sm font-semibold tracking-wide text-cyan-400">SOCHILL</p>
          <p className="text-xs text-slate-500">Bath Club CRM</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-800 pt-4">
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
          <form action={signOut}>
            <button className="mt-2 text-xs text-slate-400 underline hover:text-slate-200">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-950 p-8">{children}</main>
    </div>
  );
}
