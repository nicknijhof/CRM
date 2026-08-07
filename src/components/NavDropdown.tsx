'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavSubLink {
  href: string;
  label: string;
}

export default function NavDropdown({ label, links }: { label: string; links: NavSubLink[] }) {
  const pathname = usePathname();
  const isActive = links.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));
  const [open, setOpen] = useState(isActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-100 hover:text-stone-900"
      >
        <span>{label}</span>
        <span className={`text-xs text-stone-500 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      {open && (
        <div className="mt-1 ml-3 flex flex-col gap-1 border-l border-stone-200 pl-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
