import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CONTACT_SOURCES, PIPELINE_STAGES, STAGE_BADGE_CLASSES } from '@/lib/constants';
import { effectivePurchaseStatus } from '@/lib/purchases';
import type { Contact, PipelineStage, ContactSource, ItemType, Product, Purchase } from '@/lib/types';

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
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {rows.map(({ contact: c, planName }) => (
              <tr key={c.id} className="bg-white hover:bg-stone-50">
                <td className="px-4 py-3">
                  <Link href={`/contacts/${c.id}`} className="font-medium text-stone-900 hover:text-teal-600">
                    {c.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-500">
                  <div>{c.email}</div>
                  <div>{c.phone}</div>
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {CONTACT_SOURCES.find((s) => s.value === (c.source as ContactSource))?.label}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${STAGE_BADGE_CLASSES[c.pipeline_stage as PipelineStage]}`}
                  >
                    {PIPELINE_STAGES.find((s) => s.value === c.pipeline_stage)?.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-600">{planName ?? '—'}</td>
                <td className="px-4 py-3 text-stone-500">{c.tags?.join(', ')}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
