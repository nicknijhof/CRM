import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CONTACT_SOURCES } from '@/lib/constants';
import type { Contact, InstagramStat, Purchase } from '@/lib/types';
import { whatsappLink } from '@/lib/whatsapp';
import { buildFollowUpCandidates } from '@/lib/followUps';
import { categorizePurchases, MEMBER_SEGMENTS, type MemberSegment } from '@/lib/memberSegments';
import SourceBreakdownChart from '@/components/charts/SourceBreakdownChart';
import InstagramTrendChart from '@/components/charts/InstagramTrendChart';
import { addInstagramStat } from './actions';

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string }>;
}) {
  const { segment } = await searchParams;
  const activeSegment = MEMBER_SEGMENTS.some((s) => s.value === segment) ? (segment as MemberSegment) : null;

  const supabase = await createClient();

  const [{ data: contacts }, { data: visits }, { data: purchases }, { data: instagramStats }] = await Promise.all([
    supabase.from('contacts').select('*').returns<Contact[]>(),
    supabase.from('visits').select('id, contact_id, visit_date'),
    supabase.from('purchases').select('*').returns<Purchase[]>(),
    supabase.from('instagram_stats').select('*').order('stat_date', { ascending: true }).returns<InstagramStat[]>(),
  ]);

  const allContacts = contacts ?? [];
  const allPurchases = purchases ?? [];

  const instagramLeads = allContacts.filter((c) => c.source === 'instagram').length;
  const walkInLeads = allContacts.filter((c) => c.source === 'walk_in').length;
  const partnerLeads = allContacts.filter((c) => c.source === 'classpass' || c.source === 'entertainer').length;

  const sourceData = CONTACT_SOURCES.map((s) => ({
    source: s.label,
    count: allContacts.filter((c) => c.source === s.value).length,
  })).filter((s) => s.count > 0);

  const walkInsToFollowUp = buildFollowUpCandidates(allContacts, visits ?? [], purchases ?? [])
    .filter((c) => c.contact.source === 'walk_in')
    .sort((a, b) => new Date(b.triggerDate).getTime() - new Date(a.triggerDate).getTime());

  const memberRows = allContacts
    .map((c) => ({
      contact: c,
      segment: categorizePurchases(allPurchases.filter((p) => p.contact_id === c.id)),
    }))
    .sort((a, b) => a.contact.full_name.localeCompare(b.contact.full_name));

  const segmentCounts = MEMBER_SEGMENTS.map((s) => ({
    ...s,
    count: memberRows.filter((r) => r.segment === s.value).length,
  }));

  const visibleMemberRows = activeSegment ? memberRows.filter((r) => r.segment === activeSegment) : memberRows;

  const allInstagramStats = instagramStats ?? [];
  const latestStat = allInstagramStats[allInstagramStats.length - 1] ?? null;
  const trendData = allInstagramStats.map((s) => ({
    date: new Date(s.stat_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    followers: s.followers,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Marketing</h1>
        <p className="mt-1 text-sm text-slate-400">
          Rough first pass — lead source performance, plus follow-up on recent walk-ins.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Instagram leads" value={instagramLeads} />
        <Kpi label="Walk-in leads" value={walkInLeads} />
        <Kpi label="ClassPass/Entertainer leads" value={partnerLeads} />
      </div>

      <div className="rounded-xl border border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Instagram</h2>
          <a
            href="https://www.instagram.com/sochillbathclub/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            Open @sochillbathclub →
          </a>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Live API integration is blocked on Meta&apos;s Developer App setup for now, so these numbers
          are entered by hand — log them whenever you check the app.
        </p>

        {latestStat && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            <Kpi label="Followers" value={latestStat.followers} />
            <Kpi label="Views" value={latestStat.views ?? '—'} />
            <Kpi label="Reach" value={latestStat.reach ?? '—'} />
            <Kpi label="Interactions" value={latestStat.interactions ?? '—'} />
            <Kpi label="Accounts engaged" value={latestStat.accounts_engaged ?? '—'} />
            <Kpi label="Profile visits" value={latestStat.profile_visits ?? '—'} />
            <Kpi label="External link taps" value={latestStat.external_link_taps ?? '—'} />
          </div>
        )}

        {trendData.length > 1 && (
          <div className="mt-4">
            <p className="mb-1 text-xs text-slate-500">Followers over time</p>
            <InstagramTrendChart data={trendData} />
          </div>
        )}

        <form action={addInstagramStat} className="mt-4 grid grid-cols-4 gap-2 rounded-lg bg-slate-900 p-3">
          <div>
            <label className="block text-xs text-slate-400">Date</label>
            <input
              name="stat_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
            />
          </div>
          <Field label="Followers" name="followers" defaultValue={latestStat?.followers} required />
          <Field label="Views" name="views" />
          <Field label="Reach" name="reach" />
          <Field label="Interactions" name="interactions" />
          <Field label="Accounts engaged" name="accounts_engaged" />
          <Field label="Profile visits" name="profile_visits" />
          <Field label="External link taps" name="external_link_taps" />
          <div className="flex items-end">
            <button className="w-full rounded bg-cyan-500 px-2 py-1 text-sm font-medium text-slate-950 hover:bg-cyan-400">
              Log stat
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-800 p-4">
        <h2 className="text-sm font-semibold text-slate-300">Website analytics</h2>
        <p className="mt-2 text-sm text-slate-400">
          Not connected yet. Once there&apos;s a Google Analytics (or similar) property set up for
          sochillbathclub.com, we can link or embed traffic/conversion metrics here.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 p-4">
        <h2 className="text-sm font-semibold text-slate-300">Lead source breakdown</h2>
        {sourceData.length ? (
          <SourceBreakdownChart data={sourceData} />
        ) : (
          <p className="mt-16 text-center text-sm text-slate-500">No members yet</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-800">
        <div className="border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-300">Who&apos;s a member?</h2>
          <p className="text-xs text-slate-500">
            Every registered name, grouped by what they&apos;ve actually bought.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3 p-4">
          {segmentCounts.map((s) => (
            <Link
              key={s.value}
              href={activeSegment === s.value ? '/marketing' : `/marketing?segment=${s.value}`}
              className={`rounded-lg border p-3 transition ${
                activeSegment === s.value
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="mt-1 text-xl font-semibold text-white">{s.count}</p>
            </Link>
          ))}
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Segment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {visibleMemberRows.slice(0, 50).map(({ contact, segment: rowSegment }) => (
              <tr key={contact.id} className="hover:bg-slate-900">
                <td className="px-4 py-2">
                  <Link href={`/contacts/${contact.id}`} className="text-white hover:text-cyan-400">
                    {contact.full_name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {CONTACT_SOURCES.find((s) => s.value === contact.source)?.label}
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {MEMBER_SEGMENTS.find((s) => s.value === rowSegment)?.label}
                </td>
              </tr>
            ))}
            {!visibleMemberRows.length && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  Nobody in this segment yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-300">Follow up with recent walk-ins</h2>
            <p className="text-xs text-slate-500">First visit or a used-up session — check in on how it went.</p>
          </div>
          <Link href="/follow-ups" className="text-xs text-cyan-400 hover:text-cyan-300">
            See all follow-ups →
          </Link>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Reason</th>
              <th className="px-4 py-2 font-medium">WhatsApp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {walkInsToFollowUp.slice(0, 20).map((item) => {
              const href = whatsappLink(
                item.contact.phone,
                `Hi ${item.contact.full_name.split(' ')[0]}, thanks for visiting Sochill Bath Club! How was your experience? 🧊`,
              );
              return (
                <tr key={`${item.triggerType}:${item.triggerId}`} className="hover:bg-slate-900">
                  <td className="px-4 py-2">
                    <Link href={`/contacts/${item.contact.id}`} className="text-white hover:text-cyan-400">
                      {item.contact.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-400">{item.reason}</td>
                  <td className="px-4 py-2">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30"
                      >
                        Ask about experience
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600">No phone</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!walkInsToFollowUp.length && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  No walk-in visits logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-800 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400">{label}</label>
      <input
        name={name}
        type="number"
        min="0"
        required={required}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
      />
    </div>
  );
}
