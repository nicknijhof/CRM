import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireFeature } from '@/lib/permissions';
import { effectivePurchaseStatus } from '@/lib/purchases';
import { whatsappLink } from '@/lib/whatsapp';
import { AUTO_TAGS, autoTags, membershipGroup } from '@/lib/tags';
import { customerType, type CustomerType } from '@/lib/segment';
import type { Purchase } from '@/lib/types';

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '3m', label: 'Last 3 months' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
] as const;
type RangeValue = (typeof RANGES)[number]['value'];

type ReportContact = { is_ambassador: boolean; id: string; full_name: string; email: string | null; phone: string | null; tags: string[]; created_at: string };
type ReportPurchase = Pick<
  Purchase,
  'id' | 'contact_id' | 'name' | 'item_type' | 'purchase_date' | 'status' | 'is_paused' | 'sessions_total' | 'sessions_remaining' | 'expiry_date' | 'scheduled_cancellation_date'
>;

// PostgREST caps a single response at 1000 rows, so anything meant to return "everything" loops in batches.
async function fetchAll<T>(make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const BATCH = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await make(from, from + BATCH - 1);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if ((data?.length ?? 0) < BATCH) break;
  }
  return all;
}

const sgDate = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
const daysAgo = (n: number) => sgDate(new Date(Date.now() - n * 86_400_000));

function rangeStart(range: RangeValue): string | null {
  const today = sgDate(new Date());
  if (range === 'today') return today;
  if (range === '7d') return daysAgo(6);
  if (range === '30d') return daysAgo(29);
  if (range === '3m') return daysAgo(90);
  if (range === 'month') return `${today.slice(0, 7)}-01`;
  return null;
}

function pct(part: number, whole: number) {
  return whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`;
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-stone-500">{sub}</p>}
    </div>
  );
}

function PeopleList({ title, people, details }: { title: string; people: ReportContact[]; details?: Map<string, string> }) {
  return (
    <details className="rounded-lg border border-stone-200 bg-white">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm text-stone-800">
        <span>{title}</span>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">{people.length}</span>
      </summary>
      {people.length > 0 && (
        <ul className="max-h-72 divide-y divide-stone-100 overflow-y-auto border-t border-stone-100">
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/contacts/${p.id}`} className="flex justify-between gap-3 px-4 py-2 text-sm hover:bg-stone-50">
                <span className="text-stone-900">{p.full_name}</span>
                <span className="truncate text-xs text-stone-500">{details?.get(p.id) ?? p.email ?? p.phone ?? ''}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string; tag?: string }> }) {
  await requireFeature('reports');
  const { range: rangeParam, tag } = await searchParams;
  const range: RangeValue = RANGES.find((r) => r.value === rangeParam)?.value ?? '30d';
  const start = rangeStart(range);
  const rangeLabel = RANGES.find((r) => r.value === range)!.label.toLowerCase();

  const supabase = await createClient();
  const [allContacts, purchases] = await Promise.all([
    fetchAll<ReportContact>((from, to) =>
      supabase.from('contacts').select('id, full_name, email, phone, tags, created_at, is_ambassador').order('id').range(from, to),
    ),
    fetchAll<ReportPurchase>((from, to) =>
      supabase
        .from('purchases')
        .select('id, contact_id, name, item_type, purchase_date, status, is_paused, sessions_total, sessions_remaining, expiry_date, scheduled_cancellation_date')
        .order('id')
        .range(from, to),
    ),
  ]);

  const manualTags = [...new Set(allContacts.flatMap((c) => c.tags ?? []))]
    .filter((t) => !(AUTO_TAGS as readonly string[]).includes(t))
    .sort((a, b) => a.localeCompare(b));

  const allByContact = new Map<string, ReportPurchase[]>();
  for (const p of purchases) {
    const list = allByContact.get(p.contact_id) ?? [];
    list.push(p);
    allByContact.set(p.contact_id, list);
  }
  const contacts = tag
    ? allContacts.filter(
        (c) => c.tags?.includes(tag) || autoTags((allByContact.get(c.id) ?? []) as Purchase[], c.is_ambassador).includes(tag),
      )
    : allContacts;
  const byId = new Map(contacts.map((c) => [c.id, c]));
  const inRange = (date: string) => (start ? date >= start : true);

  const byContact = new Map<string, ReportPurchase[]>();
  for (const [contactId, list] of allByContact) if (byId.has(contactId)) byContact.set(contactId, list);
  const people = (ids: Iterable<string>) =>
    [...ids].map((id) => byId.get(id)).filter((c): c is ReportContact => !!c).sort((a, b) => a.full_name.localeCompare(b.full_name));

  // ---- Trial conversions: trials that started in the period, and who went on to buy afterwards.
  const trialStarters: string[] = [];
  const toPack: string[] = [];
  const toMembership: string[] = [];
  const trialDetail = new Map<string, string>();
  const notConverted: string[] = [];
  for (const [contactId, list] of byContact) {
    const trialDates = list.filter((p) => p.item_type === 'trial').map((p) => p.purchase_date).sort();
    if (trialDates.length === 0 || !inRange(trialDates[0])) continue;
    trialStarters.push(contactId);
    const trialDate = trialDates[0];
    const firstAfter = (type: string) =>
      list
        .filter((p) => p.item_type === type && p.purchase_date >= trialDate)
        .sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))[0];
    const pack = firstAfter('session_pack');
    const membership = firstAfter('membership');
    if (pack) toPack.push(contactId);
    if (membership) toMembership.push(contactId);
    const bits = [
      `Trial ${trialDate}`,
      ...[pack, membership].filter(Boolean).map((p) => `→ ${p!.name} (${p!.purchase_date})`),
    ];
    trialDetail.set(contactId, bits.join(' '));
    if (!pack && !membership) notConverted.push(contactId);
  }
  const toEither = new Set([...toPack, ...toMembership]);

  // ---- Who currently holds what (live right now, so the time toggle doesn't apply).
  const membershipHolders = new Map<string, Set<string>>();
  const packHolders = new Set<string>();
  // Active packs split by pack type (5 Sessions, 10 Sessions, ...), with each person's balance.
  const packsByName = new Map<string, Map<string, string[]>>();
  const packDetail = new Map<string, Map<string, string>>();
  const pausedMemberships = new Set<string>();
  for (const [contactId, list] of byContact) {
    for (const p of list as Purchase[]) {
      const status = effectivePurchaseStatus(p);
      if (p.item_type === 'membership' && status === 'active') {
        const group = membershipGroup(p.name);
        membershipHolders.set(group, (membershipHolders.get(group) ?? new Set()).add(contactId));
      }
      if (p.item_type === 'membership' && status === 'paused') pausedMemberships.add(contactId);
      if (p.item_type === 'session_pack' && status === 'active') {
        packHolders.add(contactId);
        const byPerson = packsByName.get(p.name) ?? new Map<string, string[]>();
        const balance = `${p.sessions_remaining ?? 0} of ${p.sessions_total ?? '?'} left${p.expiry_date ? `, expires ${p.expiry_date}` : ''}`;
        byPerson.set(contactId, [...(byPerson.get(contactId) ?? []), balance]);
        packsByName.set(p.name, byPerson);
      }
    }
  }
  // Biggest packs first (100, 50, 20, 10, 5, 3...), anything unnumbered (e.g. guest passes) last.
  const packSize = (name: string) => Number(name.match(/\d+/)?.[0] ?? 0);
  const packNames = [...packsByName.keys()].sort((a, b) => packSize(b) - packSize(a) || a.localeCompare(b));
  for (const [name, byPerson] of packsByName) {
    packDetail.set(name, new Map([...byPerson].map(([id, balances]) => [id, balances.join(' · ')])));
  }
  const allMembershipHolders = new Set([...membershipHolders.values()].flatMap((s) => [...s]));
  const GROUP_ORDER = ['Unlimited Anytime', 'Weekdays', 'Off-Peak', 'Founding', 'Staff', 'Other'];

  // ---- Customers vs members right now.
  const typeOf = (id: string) => customerType((allByContact.get(id) ?? []) as Purchase[]).type;
  const idsByType: Record<CustomerType, string[]> = { member: [], trial: [], customer: [], staff: [], none: [] };
  for (const c of contacts) idsByType[typeOf(c.id)].push(c.id);

  // ---- New in the period.
  const newMembers = contacts.filter((c) => inRange(c.created_at.slice(0, 10)));
  const packsPurchased = purchases.filter((p) => byId.has(p.contact_id) && p.item_type === 'session_pack' && inRange(p.purchase_date));
  // A membership counts as "new" on its first-ever purchase, so monthly renewals aren't counted again.
  const newMembershipContacts: string[] = [];
  for (const [contactId, list] of byContact) {
    const first = list.filter((p) => p.item_type === 'membership').map((p) => p.purchase_date).sort()[0];
    if (first && inRange(first)) newMembershipContacts.push(contactId);
  }

  // ---- Single-session follow-up: bought a single session exactly 2 days ago and hasn't bought a plan since.
  const followUpDate = daysAgo(2);
  const followUps: ReportContact[] = [];
  for (const [contactId, list] of byContact) {
    const boughtSingle = list.some((p) => p.item_type === 'single_session' && p.purchase_date === followUpDate);
    const boughtPlanSince = list.some((p) => ['session_pack', 'membership'].includes(p.item_type) && p.purchase_date >= followUpDate);
    const hasLivePlan = list.some((p) => ['session_pack', 'membership'].includes(p.item_type) && effectivePurchaseStatus(p as Purchase) === 'active');
    if (boughtSingle && !boughtPlanSince && !hasLivePlan) followUps.push(byId.get(contactId)!);
  }
  followUps.sort((a, b) => a.full_name.localeCompare(b.full_name));

  const OFFER = (name: string) =>
    `Hi ${name.split(' ')[0]}! Thanks for visiting Sochill Bath Club. As a thank-you, enjoy 20% off a 5-session pack, just reply and we'll set it up for you.`;

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Reports</h1>
        <p className="mt-1 text-sm text-stone-500">
          Showing {rangeLabel}
          {tag ? ` · tag “${tag}”` : ''} · {contacts.length} people
        </p>
      </div>

      <form method="get" className="flex flex-wrap gap-3">
        <select name="range" defaultValue={range} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900">
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select name="tag" defaultValue={tag ?? ''} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900">
          <option value="">All tags</option>
          <optgroup label="Automatic (from their plans)">
            {AUTO_TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </optgroup>
          {manualTags.length > 0 && (
            <optgroup label="Your tags">
              {manualTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <button type="submit" className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100">
          Apply
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">New in {rangeLabel}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="New sign-ups"
            value={newMembers.length}
            sub={`${newMembers.filter((c) => typeOf(c.id) === 'member').length} now members, ${newMembers.filter((c) => typeOf(c.id) === 'customer').length} customers`}
          />
          <StatCard label="Trials started" value={trialStarters.length} />
          <StatCard label="Packs purchased" value={packsPurchased.length} />
          <StatCard label="New memberships" value={newMembershipContacts.length} sub="first-time, not renewals" />
        </div>
        <PeopleList title="New sign-ups" people={newMembers} />
        <PeopleList title="New memberships" people={people(newMembershipContacts)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Trial conversions ({rangeLabel})</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Trials started" value={trialStarters.length} />
          <StatCard label="Trial → pack" value={toPack.length} sub={pct(toPack.length, trialStarters.length)} />
          <StatCard label="Trial → membership" value={toMembership.length} sub={pct(toMembership.length, trialStarters.length)} />
          <StatCard label="Converted (either)" value={toEither.size} sub={pct(toEither.size, trialStarters.length)} />
        </div>
        <PeopleList title="Converted to a pack or membership" people={people(toEither)} details={trialDetail} />
        <PeopleList title="Trial → pack" people={people(toPack)} details={trialDetail} />
        <PeopleList title="Trial → membership" people={people(toMembership)} details={trialDetail} />
        <PeopleList title="Not converted yet" people={people(notConverted)} details={trialDetail} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Customers vs members right now</h2>
        <p className="text-sm text-stone-500">
          Members hold an active membership or session pack (a complimentary staff membership doesn't count; staff are listed separately). Customers have bought before but hold nothing active
          (walk-ins on single sessions, and anyone whose plan has lapsed). Not affected by the time toggle.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="Members" value={idsByType.member.length} sub="active membership or pack" />
          <StatCard label="On trial" value={idsByType.trial.length} sub="14-day trial running" />
          <StatCard label="Customers" value={idsByType.customer.length} sub="bought before, nothing active" />
          <StatCard label="Staff" value={idsByType.staff.length} sub="staff membership, not counted above" />
          <StatCard label="No purchases yet" value={idsByType.none.length} sub="leads" />
        </div>
        <PeopleList title="Members" people={people(idsByType.member)} />
        <PeopleList title="Customers" people={people(idsByType.customer)} />
        <PeopleList title="On trial" people={people(idsByType.trial)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Who holds what right now</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Active memberships" value={allMembershipHolders.size} />
          <StatCard label="Active session packs" value={packHolders.size} />
          <StatCard label="Paused memberships" value={pausedMemberships.size} />
        </div>
        <PeopleList title="All active memberships" people={people(allMembershipHolders)} />
        {GROUP_ORDER.filter((g) => membershipHolders.has(g)).map((g) => (
          <PeopleList key={g} title={`↳ ${g}`} people={people(membershipHolders.get(g)!)} />
        ))}
        <PeopleList title="All active session packs" people={people(packHolders)} />
        {packNames.map((name) => (
          <PeopleList
            key={name}
            title={`↳ ${name}`}
            people={people(packsByName.get(name)!.keys())}
            details={packDetail.get(name)}
          />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Single-session follow-up</h2>
        <p className="text-sm text-stone-500">
          Bought a single session on {followUpDate} (2 days ago) and haven&apos;t bought a pack or membership since. Offer 20% off a 5-pack.
        </p>
        {followUps.length === 0 ? (
          <p className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">Nobody due today.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
            {followUps.map((c) => {
              const wa = whatsappLink(c.phone, OFFER(c.full_name));
              const mail = c.email
                ? `mailto:${c.email}?subject=${encodeURIComponent('20% off a 5-session pack')}&body=${encodeURIComponent(OFFER(c.full_name))}`
                : null;
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <Link href={`/contacts/${c.id}`} className="font-medium text-stone-900 hover:text-teal-600">
                    {c.full_name}
                  </Link>
                  <span className="flex gap-2">
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200">
                        WhatsApp
                      </a>
                    )}
                    {mail && (
                      <a href={mail} className="rounded-lg bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-200">
                        Email
                      </a>
                    )}
                    {!wa && !mail && <span className="text-xs text-stone-400">No contact info</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
