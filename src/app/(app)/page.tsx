import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CONTACT_SOURCES, PIPELINE_STAGES, STAGE_BADGE_CLASSES } from '@/lib/constants';
import type { Contact, PipelineStage } from '@/lib/types';
import PipelineFunnelChart from '@/components/charts/PipelineFunnelChart';
import SourceBreakdownChart from '@/components/charts/SourceBreakdownChart';
import { differenceInDays, subDays } from 'date-fns';

const ATTENTION_STAGES: PipelineStage[] = ['at_risk', 'lapsed'];
const INACTIVITY_THRESHOLD_DAYS = 21;

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: contacts }, { data: visits }] = await Promise.all([
    supabase.from('contacts').select('*').returns<Contact[]>(),
    supabase.from('visits').select('contact_id, visit_date').order('visit_date', { ascending: false }),
  ]);

  const allContacts = contacts ?? [];
  const lastVisitByContact = new Map<string, string>();
  for (const v of visits ?? []) {
    if (!lastVisitByContact.has(v.contact_id)) lastVisitByContact.set(v.contact_id, v.visit_date);
  }

  const activeMembers = allContacts.filter((c) => c.pipeline_stage === 'active').length;
  const thirtyDaysAgo = subDays(new Date(), 30);
  const newLeads = allContacts.filter((c) => new Date(c.created_at) >= thirtyDaysAgo).length;
  const atRiskCount = allContacts.filter((c) => c.pipeline_stage === 'at_risk').length;

  const everTrial = allContacts.filter((c) => c.pipeline_stage !== 'lead');
  const convertedFromTrial = everTrial.filter((c) => c.pipeline_stage === 'active').length;
  const trialConversionRate = everTrial.length ? Math.round((convertedFromTrial / everTrial.length) * 100) : 0;

  const funnelData = PIPELINE_STAGES.map((s) => ({
    stage: s.label,
    count: allContacts.filter((c) => c.pipeline_stage === s.value).length,
  }));

  const sourceData = CONTACT_SOURCES.map((s) => ({
    source: s.label,
    count: allContacts.filter((c) => c.source === s.value).length,
  })).filter((s) => s.count > 0);

  const needsAttention = allContacts
    .filter((c) => {
      if (ATTENTION_STAGES.includes(c.pipeline_stage)) return true;
      if (c.pipeline_stage === 'active') {
        const lastVisit = lastVisitByContact.get(c.id);
        const referenceDate = lastVisit ? new Date(lastVisit) : new Date(c.created_at);
        return differenceInDays(new Date(), referenceDate) >= INACTIVITY_THRESHOLD_DAYS;
      }
      return false;
    })
    .map((c) => ({
      contact: c,
      lastVisit: lastVisitByContact.get(c.id) ?? null,
      daysSince: differenceInDays(
        new Date(),
        lastVisitByContact.get(c.id) ? new Date(lastVisitByContact.get(c.id)!) : new Date(c.created_at),
      ),
    }))
    .sort((a, b) => b.daysSince - a.daysSince);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Sochill Bath Club — member overview</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Kpi label="Active members" value={activeMembers} />
        <Kpi label="New leads (30d)" value={newLeads} />
        <Kpi label="At risk" value={atRiskCount} accent="text-amber-400" />
        <Kpi label="Trial → active rate" value={`${trialConversionRate}%`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 p-4">
          <h2 className="text-sm font-semibold text-slate-300">Pipeline funnel</h2>
          <PipelineFunnelChart data={funnelData} />
        </div>
        <div className="rounded-xl border border-slate-800 p-4">
          <h2 className="text-sm font-semibold text-slate-300">Lead source breakdown</h2>
          {sourceData.length ? (
            <SourceBreakdownChart data={sourceData} />
          ) : (
            <p className="mt-16 text-center text-sm text-slate-500">No contacts yet</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800">
        <div className="border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-300">Needs attention</h2>
          <p className="text-xs text-slate-500">
            At-risk, lapsed, or active members with no visit in {INACTIVITY_THRESHOLD_DAYS}+ days
          </p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Stage</th>
              <th className="px-4 py-2 font-medium">Last visit</th>
              <th className="px-4 py-2 font-medium">Days since</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {needsAttention.slice(0, 15).map(({ contact, lastVisit, daysSince }) => (
              <tr key={contact.id} className="hover:bg-slate-900">
                <td className="px-4 py-2">
                  <Link href={`/contacts/${contact.id}`} className="text-white hover:text-cyan-400">
                    {contact.full_name}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${STAGE_BADGE_CLASSES[contact.pipeline_stage]}`}
                  >
                    {PIPELINE_STAGES.find((s) => s.value === contact.pipeline_stage)?.label}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {lastVisit ? new Date(lastVisit).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-2 text-slate-400">{daysSince}</td>
              </tr>
            ))}
            {!needsAttention.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Nobody needs attention right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ?? 'text-white'}`}>{value}</p>
    </div>
  );
}
