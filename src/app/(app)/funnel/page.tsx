import { createClient } from '@/lib/supabase/server';
import type { Contact, Purchase } from '@/lib/types';
import { effectivePurchaseStatus } from '@/lib/purchases';
import { groupPurchasesByContact } from '@/lib/pipelineSync';
import {
  FUNNEL_STAGES,
  MEMBERSHIP_TIERS,
  TOP_TIER,
  classifyFunnelStage,
  hasUpgradedToAnytime,
  highestMembershipTier,
  isLowerTierMembership,
} from '@/lib/funnel';
import { whatsappLink } from '@/lib/whatsapp';
import PipelineFunnelChart from '@/components/charts/PipelineFunnelChart';

export default async function FunnelPage() {
  const supabase = await createClient();

  const [{ data: contacts }, { data: purchases }] = await Promise.all([
    supabase.from('contacts').select('*').returns<Contact[]>(),
    supabase.from('purchases').select('*').returns<Purchase[]>(),
  ]);

  const allContacts = contacts ?? [];
  const purchasesByContact = groupPurchasesByContact(purchases ?? []);

  const stageByContact = new Map(
    allContacts.map((c) => [c.id, classifyFunnelStage(purchasesByContact.get(c.id) ?? [])]),
  );

  const funnelData = FUNNEL_STAGES.map((s) => ({
    stage: s.label,
    count: allContacts.filter((c) => stageByContact.get(c.id) === s.value).length,
  }));

  const membershipContacts = allContacts.filter((c) => stageByContact.get(c.id) === 'membership');
  const tierBreakdown = membershipContacts.reduce<Record<string, number>>((acc, c) => {
    const tier = highestMembershipTier(purchasesByContact.get(c.id) ?? []);
    if (tier) acc[tier] = (acc[tier] ?? 0) + 1;
    return acc;
  }, {});

  const upgradedCount = allContacts.filter((c) => hasUpgradedToAnytime(purchasesByContact.get(c.id) ?? [])).length;

  // Currently paying for a lower tier right now — the actual list worth
  // messaging, not just "ever bought" a lower tier (which includes people
  // who've already moved on to Anytime or cancelled entirely).
  const upgradeTargets = allContacts
    .map((c) => {
      const contactPurchases = purchasesByContact.get(c.id) ?? [];
      const activeLowerTier = contactPurchases.find(
        (p) => isLowerTierMembership(p) && effectivePurchaseStatus(p) === 'active',
      );
      return activeLowerTier ? { contact: c, purchase: activeLowerTier } : null;
    })
    .filter((x): x is { contact: Contact; purchase: Purchase } => x !== null)
    .sort((a, b) => a.contact.full_name.localeCompare(b.contact.full_name));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Conversion Funnel</h1>
        <p className="mt-1 text-sm text-stone-500">
          How far into the product ladder each contact has ever gone — New Guest → Single Session → Session Pack →
          Membership.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-700">Funnel stages</h3>
          <p className="text-xs text-stone-500">All-time — a lapsed membership still counts as having reached it</p>
          <PipelineFunnelChart data={funnelData} />
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-700">Membership tier (highest ever reached)</h3>
          <p className="text-xs text-stone-500">Of {membershipContacts.length} members</p>
          <div className="mt-4 space-y-3">
            {MEMBERSHIP_TIERS.map(({ tier, label }) => {
              const count = tierBreakdown[tier] ?? 0;
              const pct = membershipContacts.length ? Math.round((count / membershipContacts.length) * 100) : 0;
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-700">{label}</span>
                    <span className="text-stone-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-stone-100">
                    <div
                      className={`h-2 rounded-full ${tier === TOP_TIER ? 'bg-teal-600' : 'bg-stone-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-stone-500">
            <span className="font-semibold text-stone-700">{upgradedCount}</span> have upgraded from a lower tier to
            Unlimited Anytime (all-time)
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-stone-700">Upgrade opportunities</h3>
        <p className="text-xs text-stone-500">
          Currently active on Off-Peak or Weekdays — the target list for an Unlimited Anytime upsell
        </p>
        <div className="mt-3 space-y-2">
          {upgradeTargets.map(({ contact, purchase }) => {
            const link = whatsappLink(
              contact.phone,
              `Hi ${contact.full_name.split(' ')[0]}, thinking of upgrading to our Unlimited Anytime membership? You'd get full access any time, no restrictions — happy to walk you through it 🧊`,
            );
            return (
              <div key={contact.id} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm">
                <div>
                  <a href={`/contacts/${contact.id}`} className="font-medium text-teal-600 hover:underline">
                    {contact.full_name}
                  </a>
                  <span className="ml-2 text-stone-500">{purchase.name}</span>
                </div>
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
                  >
                    Message
                  </a>
                )}
              </div>
            );
          })}
          {!upgradeTargets.length && <p className="text-sm text-stone-400">No one on a lower tier right now.</p>}
        </div>
      </div>
    </div>
  );
}
