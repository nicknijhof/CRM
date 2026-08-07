'use client';

import { useState } from 'react';
import { manualCheckIn } from '@/app/(app)/checked-in/actions';

interface SearchableContact {
  id: string;
  full_name: string;
  phone: string | null;
}

export default function CheckInSearch({ contacts }: { contacts: SearchableContact[] }) {
  const [query, setQuery] = useState('');
  const [checkedIn, setCheckedIn] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const matches = normalizedQuery
    ? contacts
        .filter(
          (c) =>
            c.full_name.toLowerCase().includes(normalizedQuery) ||
            (c.phone ?? '').replace(/[^\d]/g, '').includes(normalizedQuery.replace(/[^\d]/g, '')),
        )
        .slice(0, 8)
    : [];

  async function handleCheckIn(contact: SearchableContact) {
    await manualCheckIn(contact.id);
    setCheckedIn(contact.full_name);
    setQuery('');
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCheckedIn(null);
        }}
        placeholder="Search name or phone…"
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-teal-500"
      />

      {checkedIn && <p className="mt-2 text-sm text-emerald-600">Checked in {checkedIn}.</p>}

      {matches.length > 0 && (
        <div className="mt-2 divide-y divide-stone-200 rounded-lg border border-stone-200">
          {matches.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCheckIn(c)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-100"
            >
              <span className="text-stone-900">{c.full_name}</span>
              <span className="text-xs text-teal-600">Check in →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
