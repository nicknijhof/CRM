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
  type FunnelStage,
} from '@/lib/funnel';
import FunnelAndGoalsView from '@/components/FunnelAndGoalsView';

export interface FunnelContactRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  funnelStage: FunnelStage;
  primaryGoal: Contact['primary_goal'];
  primaryGoalOther: string | null;
  activeLowerTierMembership: string | null;
}

export default async function FunnelPage() {
  const supabase = await createClient();

  const [{ data: contacts }, { data: purchases }] = await Promise.all([
    supabase.from('contacts').select('*').returns<Contact[]>(),
    supabase.from('purchases').select('*').returns<Purchase[]>(),
  ]);

  const allContacts = contacts ?? [];
  const purchasesByContact = groupPurchasesByContact(purchases ?? []);

  const rows: FunnelContactRow[] = allContacts.map((c) => {
    const contactPurchases = purchasesByContact.get(c.id) ?? [];
    const activeLowerTier = contactPurchases.find(
      (p) => isLowerTierMembership(p) && effectivePurchaseStatus(p) === 'active',
    );
    return {
      id: c.id,
      fullName: c.full_name,
      email: c.email,
      phone: c.phone,
      funnelStage: classifyFunnelStage(contactPurchases),
      primaryGoal: c.primary_goal,
      primaryGoalOther: c.primary_goal_other,
      activeLowerTierMembership: activeLowerTier?.name ?? null,
    };
  });

  const funnelCounts = FUNNEL_STAGES.map((s) => ({
    ...s,
    count: rows.filter((r) => r.funnelStage === s.value).length,
  }));

  const membershipRows = rows.filter((r) => r.funnelStage === 'membership');
  const tierBreakdown = membershipRows.reduce<Record<string, number>>((acc, r) => {
    const tier = highestMembershipTier(purchasesByContact.get(r.id) ?? []);
    if (tier) acc[tier] = (acc[tier] ?? 0) + 1;
    return acc;
  }, {});
  const tierCounts = MEMBERSHIP_TIERS.map(({ tier, label }) => ({
    tier,
    label,
    count: tierBreakdown[tier] ?? 0,
    isTop: tier === TOP_TIER,
  }));

  const upgradedCount = allContacts.filter((c) => hasUpgradedToAnytime(purchasesByContact.get(c.id) ?? [])).length;

  return (
    <FunnelAndGoalsView
      rows={rows}
      funnelCounts={funnelCounts}
      tierCounts={tierCounts}
      membershipCount={membershipRows.length}
      upgradedCount={upgradedCount}
    />
  );
}
