import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CONTACT_SOURCES, PIPELINE_STAGES } from '@/lib/constants';
import { effectivePurchaseStatus } from '@/lib/purchases';
import type { Contact, ItemType, Product, Purchase } from '@/lib/types';
import MembersTable from '@/components/MembersTable';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first', column: 'created_at', ascending: false },
  { value: 'oldest', label: 'Oldest first', column: 'created_at', ascending: true },
  { value: 'name', label: 'Name A-Z', column: 'full_name', ascending: true },
  // Plan isn't a database column (it's derived from purchases), so this
  // reuses "newest" for the initial query and is re-sorted in JS below.
  { value: 'plan', label: 'Plan A-Z', column: 'created_at', ascending: false },
] as const;

// Which active purchase counts as someone's "current plan" when they have more than one.
const PLAN_TYPE_PRIORITY: ItemType[] = ['membership', 'session_pack', 'gift_card', 'single_session', 'trial'];

function currentPlanName(purchases: Purchase[]): string | null {
  const active = purchases.filter((p) => effectivePurchaseStatus(p) === 'active');
  for (const type of PLAN_TYPE_PRIORITY) {
    const match = active.find((p) => p.item_type === type);
    if (match) return match.name;
  }
  return null;
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; source?: string; q?: string; sort?: string; plan?: string }>;
}) {
  const { stage, source, q, sort, plan } = await searchParams;
  const supabase = await createClient();

  const sortOption = SORT_OPTIONS.find((s) => s.value === sort) ?? SORT_OPTIONS[0];
  let query = supabase.from('contacts').select('*').order(sortOption.column, { ascending: sortOption.ascending });

  if (stage) query = query.eq('pipeline_stage', stage);
  if (source) query = query.eq('source', source);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);

  const [{ data: contacts, error }, { data: purchases }, { data: products }] = await Promise.all([
    query.returns<Contact[]>(),
    supabase.from('purchases').select('*').returns<Purchase[]>(),
    supabase.from('products').select('*').eq('is_active', true).order('sort_order').returns<Product[]>(),
  ]);

  const purchasesByContact = new Map<string, Purchase[]>();
  for (const p of purchases ?? []) {
    const list = purchasesByContact.get(p.contact_id) ?? [];
    list.push(p);
    purchasesByContact.set(p.contact_id, list);
  }

  let rows = (contacts ?? []).map((c) => ({
    contact: c,
    planName: currentPlanName(purchasesByContact.get(c.id) ?? []),
    purchases: purchasesByContact.get(c.id) ?? [],
  }));

  if (plan) rows = rows.filter((r) => r.planName === plan);

  if (sortOption.value === 'plan') {
    rows = [...rows].sort((a, b) => (a.planName ?? '￿').localeCompare(b.planName ?? '￿'));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Members</h1>
          <p className="mt-1 text-sm text-stone-500">{rows.length} people</p>
        </div>
        <Link
          href="/contacts/new"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          + Add member
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name, email, phone"
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-teal-500"
        />
        <select
          name="stage"
          defaultValue={stage ?? ''}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
        >
          <option value="">All stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          name="source"
          defaultValue={source ?? ''}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
        >
          <option value="">All sources</option>
          {CONTACT_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          name="plan"
          defaultValue={plan ?? ''}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
        >
          <option value="">All plans</option>
          {(products ?? []).map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sortOption.value}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
        >
          Filter
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-rose-600">{error.message}</p>}

      <div className="mt-6 overflow-hidden rounded-xl border border-stone-200">
        <MembersTable rows={rows} />
      </div>
    </div>
  );
}
