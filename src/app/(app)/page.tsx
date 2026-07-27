import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CONTACT_SOURCES, PIPELINE_STAGES } from '@/lib/constants';
import type { Contact, PipelineStage, Purchase } from '@/lib/types';
import { effectivePurchaseStatus } from '@/lib/purchases';
import { whatsappLink } from '@/lib/whatsapp';
import PipelineFunnelChart from '@/components/charts/PipelineFunnelChart';
import SourceBreakdownChart from '@/components/charts/SourceBreakdownChart';
import { differenceInDays, subDays } from 'date-fns';

const ATTENTION_STAGES: PipelineStage[] = ['at_risk', 'lapsed'];
const INACTIVITY_THRESHOLD_DAYS = 21;
const LOW_SESSION_PACK_MINIMUM = 5;
const LOW_SESSION_REMAINING_THRESHOLD = 1;
const EXPIRY_WARNING_FRACTION = 0.1;

interface AttentionItem {
  contactId: string;
  contactName: string;
  reason: string;
  whatsappHref: string | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: contacts }, { data: visits }, { data: purchases }] = await Promise.all([
    supabase.from('contacts').select('*').returns<Contact[]>(),
    supabase.from('visits').select('contact_id, visit_date').order('visit_date', { ascending: false }),
    supabase.from('purchases').select('*').returns<Purchase[]>(),
  ]);

  const allContacts = contacts ?? [];
  const contactsById = new Map(allContacts.map((c) => [c.id, c]));
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

  function daysSinceLastVisit(c: Contact) {
    const lastVisit = lastVisitByContact.get(c.id);
    return differenceInDays(new Date(), lastVisit ? new Date(lastVisit) : new Date(c.created_at));
  }

  const stageOrInactivityContacts = allContacts.filter((c) => {
    if (ATTENTION_STAGES.includes(c.pipeline_stage)) return true;
    if (c.pipeline_stage === 'active') return daysSinceLastVisit(c) >= INACTIVITY_THRESHOLD_DAYS;
    return false;
  });

  const stageOrInactivityItems: AttentionItem[] = [...stageOrInactivityContacts]
    .sort((a, b) => daysSinceLastVisit(b) - daysSinceLastVisit(a))
    .map((c) => {
      const reason = ATTENTION_STAGES.includes(c.pipeline_stage)
        ? `${PIPELINE_STAGES.find((s) => s.value === c.pipeline_stage)?.label} stage`
        : `No visit in ${daysSinceLastVisit(c)}+ days`;
      return {
        contactId: c.id,
        contactName: c.full_name,
        reason,
        whatsappHref: whatsappLink(
          c.phone,
          `Hi ${c.full_name.split(' ')[0]}, we miss you at Sochill Bath Club! Come in for a session soon 🧊`,
        ),
      };
    });

  const activePurchases = (purchases ?? []).filter((p) => effectivePurchaseStatus(p) === 'active');

  const lowSessionItems: AttentionItem[] = activePurchases
    .filter(
      (p) =>
        p.sessions_total !== null &&
        p.sessions_total >= LOW_SESSION_PACK_MINIMUM &&
        p.sessions_remaining === LOW_SESSION_REMAINING_THRESHOLD,
    )
    .map((p) => ({ p, contact: contactsById.get(p.contact_id) }))
    .filter((x): x is { p: Purchase; contact: Contact } => x.contact !== undefined)
    .sort((a, b) => a.contact.full_name.localeCompare(b.contact.full_name))
    .map(({ p, contact }) => ({
      contactId: contact.id,
      contactName: contact.full_name,
      reason: `1 session left — ${p.name}`,
      whatsappHref: whatsappLink(
        contact.phone,
        `Hi ${contact.full_name.split(' ')[0]}, you have 1 session left on your ${p.name} at Sochill Bath Club! Let us know if you'd like to top up 🧊`,
      ),
    }));

  const expiringSoonItems: AttentionItem[] = activePurchases
    .filter((p) => {
      if (!p.expiry_date) return false;
      const totalDays = differenceInDays(new Date(p.expiry_date), new Date(p.purchase_date));
      const warningDays = Math.max(1, Math.round(totalDays * EXPIRY_WARNING_FRACTION));
      const daysUntilExpiry = differenceInDays(new Date(p.expiry_date), new Date());
      return daysUntilExpiry >= 0 && daysUntilExpiry <= warningDays;
    })
    .map((p) => ({ p, contact: contactsById.get(p.contact_id) }))
    .filter((x): x is { p: Purchase; contact: Contact } => x.contact !== undefined)
    .sort((a, b) => new Date(a.p.expiry_date!).getTime() - new Date(b.p.expiry_date!).getTime())
    .map(({ p, contact }) => ({
      contactId: contact.id,
      contactName: contact.full_name,
      reason: `${p.name} expires ${p.expiry_date}`,
      whatsappHref: whatsappLink(
        contact.phone,
        `Hi ${contact.full_name.split(' ')[0]}, your ${p.name} at Sochill Bath Club expires on ${p.expiry_date} — come use your remaining sessions before then! 🧊`,
      ),
    }));

  const needsAttention = [...stageOrInactivityItems, ...lowSessionItems, ...expiringSoonItems];

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
            <p className="mt-16 text-center text-sm text-slate-500">No members yet</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800">
        <div className="border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-300">Needs attention</h2>
          <p className="text-xs text-slate-500">
            At-risk/lapsed stages, no visit in {INACTIVITY_THRESHOLD_DAYS}+ days, 1 session left on a{' '}
            {LOW_SESSION_PACK_MINIMUM}+ pack, or a pack nearing its expiry
          </p>
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
            {needsAttention.slice(0, 20).map((item, i) => (
              <tr key={`${item.contactId}-${i}`} className="hover:bg-slate-900">
                <td className="px-4 py-2">
                  <Link href={`/contacts/${item.contactId}`} className="text-white hover:text-cyan-400">
                    {item.contactName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-400">{item.reason}</td>
                <td className="px-4 py-2">
                  {item.whatsappHref ? (
                    <a
                      href={item.whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30"
                    >
                      Message
                    </a>
                  ) : (
                    <span className="text-xs text-slate-600">No phone</span>
                  )}
                </td>
              </tr>
            ))}
            {!needsAttention.length && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
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
