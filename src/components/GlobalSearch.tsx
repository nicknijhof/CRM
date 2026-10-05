'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, X, User, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SearchResult {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

const HISTORY_KEY = 'crm-search-history';
const HISTORY_MAX = 10;

// "Today" in Singapore time, so the list resets at local midnight rather than UTC.
function todayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
}

function loadHistory(): SearchResult[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? 'null');
    return raw?.date === todayKey() && Array.isArray(raw.items) ? raw.items : [];
  } catch {
    return [];
  }
}

function saveHistory(items: SearchResult[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ date: todayKey(), items }));
  } catch {
    // Storage blocked/full — history is a convenience, not essential.
  }
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('contacts')
        .select('id, full_name, email, phone')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
        .order('full_name')
        .limit(8);
      setResults(data ?? []);
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  function goToContact(contact: SearchResult) {
    const next = [contact, ...loadHistory().filter((h) => h.id !== contact.id)].slice(0, HISTORY_MAX);
    saveHistory(next);
    setHistory(next);
    setOpen(false);
    setQuery('');
    router.push(`/contacts/${contact.id}`);
  }

  function clearHistory() {
    saveHistory([]);
    setHistory([]);
  }

  function renderRow(r: SearchResult, icon: React.ReactNode) {
    return (
      <li key={r.id}>
        <button
          type="button"
          onClick={() => goToContact(r)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-400">
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-stone-900">{r.full_name}</span>
            <span className="block truncate text-xs text-stone-500">
              {[r.email, r.phone].filter(Boolean).join(' · ') || 'No contact info'}
            </span>
          </span>
        </button>
      </li>
    );
  }

  return (
    <div ref={containerRef} className="relative mx-auto flex w-full max-w-xl items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search"
          className="w-full rounded-full border border-transparent bg-stone-100 py-2.5 pl-11 pr-9 text-sm text-stone-900 outline-none transition focus:border-teal-500 focus:bg-white"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {open && !query.trim() && history.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Today&apos;s searches</p>
              <button type="button" onClick={clearHistory} className="text-xs text-stone-400 hover:text-stone-600">
                Clear
              </button>
            </div>
            <ul className="max-h-80 divide-y divide-stone-100 overflow-y-auto">
              {history.map((r) => renderRow(r, <Clock className="h-4 w-4" />))}
            </ul>
          </div>
        )}

        {open && query.trim() && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg">
            {loading ? (
              <p className="px-4 py-3 text-sm text-stone-400">Searching…</p>
            ) : results.length > 0 ? (
              <ul className="max-h-80 divide-y divide-stone-100 overflow-y-auto">
                {results.map((r) => renderRow(r, <User className="h-4 w-4" />))}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm text-stone-400">No members match &quot;{query}&quot;.</p>
            )}
          </div>
        )}
      </div>

      <Link
        href="/contacts/new"
        aria-label="Add new contact"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
      >
        <Plus className="h-5 w-5" />
      </Link>
    </div>
  );
}
