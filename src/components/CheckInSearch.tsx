'use client';

import { useState } from 'react';
import { manualCheckIn } from '@/app/(app)/checked-in/actions';

interface SearchableContact {
  id: string;
  full_name: string;
  phone: string | null;
  eligible: boolean;
}

// Lower-case, strip accents and collapse spacing so names compare the way people type them.
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export default function CheckInSearch({ contacts }: { contacts: SearchableContact[] }) {
  const [query, setQuery] = useState('');
  const [checkedIn, setCheckedIn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const normalizedQuery = normalize(query);
  const queryDigits = query.replace(/[^\d]/g, '');
  const words = normalizedQuery.split(' ').filter(Boolean);
  const sorted = [...contacts].sort((a, b) => a.full_name.localeCompare(b.full_name));
  // Every word typed has to appear in the name, in any order, so "tan shawn", "Shawn Tan" and a
  // name saved with a double space all find the same person. Phone numbers match on digits.
  const visible = words.length
    ? sorted.filter((c) => {
        const name = normalize(c.full_name);
        return words.every((w) => name.includes(w)) || (queryDigits.length >= 3 && (c.phone ?? '').replace(/[^\d]/g, '').includes(queryDigits));
      })
    : sorted;

  async function handleCheckIn(contact: SearchableContact) {
    if (!contact.eligible || pendingId) return;
    setPendingId(contact.id);
    setError(null);
    try {
      await manualCheckIn(contact.id);
      setCheckedIn(contact.full_name);
      setQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check in');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCheckedIn(null);
          setError(null);
        }}
        placeholder="Search name or phone…"
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-teal-500"
      />

      {checkedIn && <p className="mt-2 text-sm text-emerald-600">Checked in {checkedIn}.</p>}
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      {visible.length > 0 ? (
        <div className="mt-2 max-h-80 divide-y divide-stone-200 overflow-y-auto rounded-lg border border-stone-200">
          {visible.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCheckIn(c)}
              disabled={!c.eligible || pendingId === c.id}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                c.eligible ? 'hover:bg-stone-100' : 'cursor-not-allowed opacity-50'
              }`}
            >
              <span className="text-stone-900">{c.full_name}</span>
              <span className={`text-xs ${c.eligible ? 'text-teal-600' : 'text-stone-400'}`}>
                {c.eligible ? (pendingId === c.id ? 'Checking in…' : 'Check in →') : 'No active plan'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        words.length > 0 && <p className="mt-2 text-sm text-stone-400">No members match &quot;{query}&quot;.</p>
      )}
    </div>
  );
}
