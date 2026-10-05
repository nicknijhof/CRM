import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CONTACT_SOURCES, PIPELINE_STAGES } from '@/lib/constants';
import { effectivePurchaseStatus } from '@/lib/purchases';
import type { Contact, ItemType, Product, Purchase } from '@/lib/types';
import MembersTable from '@/components/MembersTable';
import { requireFeature } from '@/lib/permissions';

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

const PER_PAGE_OPTIONS = [20, 50] as const;

function currentPlan(purchases: Purchase[]): Purchase | null {
  const active = purchases.filter((p) => effectivePurchaseStatus(p) === 'active');
  for (const type of PLAN_TYPE_PRIORITY) {
    const match = active.find((p) => p.item_type === type);
    if (match) return match;
  }
  return null;
}

function currentPlanName(purchases: Purchase[]): string | null {
  return currentPlan(purchases)?.name ?? null;
}

// Plan-state filter: "active" = has a live plan, "paused" = a paused membership, "cancelling" =
// a live plan with a cancellation scheduled, "expired" = nothing live but a plan that ran out,
// was used up or was cancelled. Returns the purchase that qualifies them (so the Plan column can
// show it), or null when they don't match.
const PLAN_STATES = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelling', label: 'Cancelling' },
  { value: 'expired', label: 'Expired' },
] as const;
type PlanState = (typeof PLAN_STATES)[number]['value'];

function matchForState(purchases: Purchase[], state: PlanState, planName?: string): Purchase | null {
  const named = planName ? purchases.filter((p) => p.name === planName) : purchases;
  const byDateDesc = (a: Purchase, b: Purchase) => b.purchase_date.localeCompare(a.purchase_date);
  const pick = (test: (p: Purchase) => boolean) => [...named].filter(test).sort(byDateDesc)[0] ?? null;

  if (state === 'active') return pick((p) => effectivePurchaseStatus(p) === 'active');
  if (state === 'paused') return pick((p) => effectivePurchaseStatus(p) === 'paused');
  if (state === 'cancelling') {
    return pick((p) => effectivePurchaseStatus(p) === 'active' && !!p.scheduled_cancellation_date);
  }
  const hasLive = purchases.some((p) => ['active', 'paused'].includes(effectivePurchaseStatus(p)));
  if (hasLive) return null;
  return pick((p) => ['expired', 'used_up', 'cancelled'].includes(effectivePurchaseStatus(p)));
}

function planLabel(purchase: Purchase | null): string | null {
  if (!purchase) return null;
  const status = effectivePurchaseStatus(purchase);
  if (status === 'paused') return `${purchase.name} · paused`;
  if (status === 'active' && purchase.scheduled_cancellation_date) return `${purchase.name} · cancelling`;
  if (status === 'expired' || status === 'used_up' || status === 'cancelled') return `${purchase.name} · ${status.replace('_', ' ')}`;
  return purchase.name;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Supabase/PostgREST caps any single response at 1000 rows — fine for a page
// of results, but silently truncates a query meant to return everything
// (e.g. "every purchase" to compute plans before a client-side filter).
// Loops in 1000-row batches so a growing member base doesn't quietly start
// losing data off the end again.
async function fetchAllPaginated<T>(makeQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const BATCH = 1000;
  let from = 0;
  const all: T[] = [];
  for (;;) {
    const { data, error } = await makeQuery(from, from + BATCH - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < BATCH) break;
    from += BATCH;
  }
  return all;
}

function buildContactsQuery(
  supabase: SupabaseClient,
  sortOption: (typeof SORT_OPTIONS)[number],
  filters: { stage?: string; source?: string; q?: string },
) {
  let query = supabase.from('contacts').select('*').order(sortOption.column, { ascending: sortOption.ascending });
  if (filters.stage) query = query.eq('pipeline_stage', filters.stage);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.q) query = query.or(`full_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%,phone.ilike.%${filters.q}%`);
  return query;
}

function buildContactsCountQuery(supabase: SupabaseClient, filters: { stage?: string; source?: string; q?: string }) {
  let query = supabase.from('contacts').select('*', { count: 'exact', head: true });
  if (filters.stage) query = query.eq('pipeline_stage', filters.stage);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.q) query = query.or(`full_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%,phone.ilike.%${filters.q}%`);
  return query;
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; source?: string; q?: string; sort?: string; plan?: string; state?: string; page?: string; perPage?: string }>;
}) {
  await requireFeature('members');
  const { stage, source, q, sort, plan, state: stateParam, page: pageParam, perPage: perPageParam } = await searchParams;
  const state = PLAN_STATES.find((st) => st.value === stateParam)?.value;
  const supabase = await createClient();

  const sortOption = SORT_OPTIONS.find((s) => s.value === sort) ?? SORT_OPTIONS[0];
  const filters = { stage, source, q };
  const perPage = PER_PAGE_OPTIONS.includes(Number(perPageParam) as (typeof PER_PAGE_OPTIONS)[number])
    ? (Number(perPageParam) as (typeof PER_PAGE_OPTIONS)[number])
    : 20;
  const page = Math.max(1, Number(pageParam) || 1);

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('is_active', { ascending: false })
    .order('sort_order')
    .returns<Product[]>();

  let rows: { contact: Contact; planName: string | null; purchases: Purchase[] }[];
  let totalCount: number;
  let totalPages: number;

  if (plan || state || sortOption.value === 'plan') {
    // The "current plan" filter needs every matching contact's purchases
    // computed up front before it can filter, so this path can't paginate
    // at the database level — it fetches everything (safely, past the
    // 1000-row cap), filters in memory, then slices to the requested page.
    const allContacts = await fetchAllPaginated<Contact>((from, to) =>
      buildContactsQuery(supabase, sortOption, filters).range(from, to),
    );
    const allPurchases = await fetchAllPaginated<Purchase>((from, to) =>
      supabase.from('purchases').select('*').range(from, to),
    );

    const purchasesByContact = new Map<string, Purchase[]>();
    for (const p of allPurchases) {
      const list = purchasesByContact.get(p.contact_id) ?? [];
      list.push(p);
      purchasesByContact.set(p.contact_id, list);
    }

    let filtered = allContacts.map((c) => {
      const cp = purchasesByContact.get(c.id) ?? [];
      return { contact: c, planName: planLabel(currentPlan(cp)), purchases: cp };
    });
    if (state) {
      filtered = filtered.flatMap((r) => {
        const match = matchForState(r.purchases, state, plan);
        return match ? [{ ...r, planName: planLabel(match) }] : [];
      });
    } else if (plan) {
      filtered = filtered.filter((r) => currentPlanName(r.purchases) === plan);
    }

    if (sortOption.value === 'plan') {
      filtered = [...filtered].sort((a, b) => (a.planName ?? '￿').localeCompare(b.planName ?? '￿'));
    }

    totalCount = filtered.length;
    totalPages = Math.max(1, Math.ceil(totalCount / perPage));
    const from = (page - 1) * perPage;
    rows = filtered.slice(from, from + perPage);
  } else {
    const { count } = await buildContactsCountQuery(supabase, filters);
    totalCount = count ?? 0;
    totalPages = Math.max(1, Math.ceil(totalCount / perPage));

    const from = (page - 1) * perPage;
    const { data: pageContacts, error } = await buildContactsQuery(supabase, sortOption, filters)
      .range(from, from + perPage - 1)
      .returns<Contact[]>();
    if (error) throw new Error(error.message);

    const pageContactIds = (pageContacts ?? []).map((c) => c.id);
    const { data: pagePurchases } = pageContactIds.length
      ? await supabase.from('purchases').select('*').in('contact_id', pageContactIds).returns<Purchase[]>()
      : { data: [] as Purchase[] };

    const purchasesByContact = new Map<string, Purchase[]>();
    for (const p of pagePurchases ?? []) {
      const list = purchasesByContact.get(p.contact_id) ?? [];
      list.push(p);
      purchasesByContact.set(p.contact_id, list);
    }

    rows = (pageContacts ?? []).map((c) => ({
      contact: c,
      planName: planLabel(currentPlan(purchasesByContact.get(c.id) ?? [])),
      purchases: purchasesByContact.get(c.id) ?? [],
    }));
  }

  const basePageParams = new URLSearchParams();
  if (q) basePageParams.set('q', q);
  if (stage) basePageParams.set('stage', stage);
  if (source) basePageParams.set('source', source);
  if (plan) basePageParams.set('plan', plan);
  if (state) basePageParams.set('state', state);
  if (sort) basePageParams.set('sort', sort);
  basePageParams.set('perPage', String(perPage));

  function hrefForPage(targetPage: number) {
    const sp = new URLSearchParams(basePageParams);
    sp.set('page', String(targetPage));
    return `/contacts?${sp.toString()}`;
  }

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(page * perPage, totalCount);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Members</h1>
          <p className="mt-1 text-sm text-stone-500">{totalCount} people</p>
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
          name="state"
          defaultValue={state ?? ''}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
        >
          <option value="">Any plan status</option>
          {PLAN_STATES.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label}
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
        <select
          name="perPage"
          defaultValue={String(perPage)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
        >
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} per page
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

      <div className="mt-6 overflow-hidden rounded-xl border border-stone-200">
        <MembersTable rows={rows} />
      </div>

      {totalCount > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-stone-500">
          <p>
            Showing {rangeStart}–{rangeEnd} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={hrefForPage(page - 1)} className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-700 hover:bg-stone-100">
                ← Prev
              </Link>
            ) : (
              <span className="rounded-lg border border-stone-200 px-3 py-1.5 text-stone-300">← Prev</span>
            )}
            <span className="px-2">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={hrefForPage(page + 1)} className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-700 hover:bg-stone-100">
                Next →
              </Link>
            ) : (
              <span className="rounded-lg border border-stone-200 px-3 py-1.5 text-stone-300">Next →</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
