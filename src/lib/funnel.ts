import type { Purchase } from './types';

export type FunnelStage = 'new_guest' | 'single_session' | 'session_pack' | 'membership';

export const FUNNEL_STAGES: { value: FunnelStage; label: string }[] = [
  { value: 'new_guest', label: 'New Guest' },
  { value: 'single_session', label: 'Single Session' },
  { value: 'session_pack', label: 'Session Pack' },
  { value: 'membership', label: 'Membership' },
];

export const FUNNEL_STAGE_CLASSES: Record<FunnelStage, string> = {
  new_guest: 'bg-stone-100 text-stone-600',
  single_session: 'bg-amber-100 text-amber-700',
  session_pack: 'bg-sky-100 text-sky-700',
  membership: 'bg-emerald-100 text-emerald-700',
};

// Membership tier, by rank of commitment. Purchase rows store a denormalized
// name snapshot, and the product catalog has been renamed at least once
// (Off-Peak Membership -> Unlimited Off-Peak Membership, 3x Weekly -> Unlimited
// Weekdays, Unlimited Monthly -> Unlimited Anytime) — old purchases keep the
// name they were bought under, so both old and current names map to the same
// tier here. Staff Membership is an internal $0 account, not a real customer
// tier, and is intentionally not mapped to anything.
type MembershipTier = 'off_peak' | 'weekdays' | 'anytime';

const TIER_LABELS: Record<MembershipTier, string> = {
  off_peak: 'Off-Peak',
  weekdays: 'Weekdays',
  anytime: 'Unlimited Anytime',
};

const TIER_RANK: Record<MembershipTier, number> = { off_peak: 1, weekdays: 2, anytime: 3 };

const NAME_TO_TIER: Record<string, MembershipTier> = {
  'Off-Peak Membership': 'off_peak',
  'Unlimited Off-Peak Membership': 'off_peak',
  '3x Weekly Membership': 'weekdays',
  'Unlimited Weekdays Membership': 'weekdays',
  'Unlimited Monthly Membership': 'anytime',
  'Unlimited Anytime Membership': 'anytime',
};

export const MEMBERSHIP_TIERS: { tier: MembershipTier; label: string }[] = (
  ['off_peak', 'weekdays', 'anytime'] as const
).map((tier) => ({ tier, label: TIER_LABELS[tier] }));

export const TOP_TIER: MembershipTier = 'anytime';

function membershipTier(p: Purchase): MembershipTier | null {
  if (p.item_type !== 'membership') return null;
  return NAME_TO_TIER[p.name] ?? null;
}

export function isLowerTierMembership(p: Purchase): boolean {
  const tier = membershipTier(p);
  return tier !== null && tier !== TOP_TIER;
}

// Highest tier this contact has EVER reached — a lapsed/cancelled membership
// still counts for funnel purposes (that's a retention concern, tracked
// separately via pipeline_stage); the funnel measures how deep into the
// product ladder someone has gone at all.
export function classifyFunnelStage(purchases: Purchase[]): FunnelStage {
  if (purchases.some((p) => membershipTier(p) !== null)) return 'membership';
  if (purchases.some((p) => p.item_type === 'session_pack')) return 'session_pack';
  if (purchases.some((p) => p.item_type === 'single_session')) return 'single_session';
  return 'new_guest';
}

// The highest membership tier ever reached, for contacts at the membership stage.
export function highestMembershipTier(purchases: Purchase[]): MembershipTier | null {
  const tiers = purchases.map(membershipTier).filter((t): t is MembershipTier => t !== null);
  if (!tiers.length) return null;
  return tiers.reduce((best, t) => (TIER_RANK[t] > TIER_RANK[best] ? t : best));
}

// A contact who bought a lower membership tier before their first Anytime
// purchase — a genuine upgrade, not just a first-time Anytime signup.
export function hasUpgradedToAnytime(purchases: Purchase[]): boolean {
  const withTiers = purchases
    .map((p) => ({ purchase: p, tier: membershipTier(p) }))
    .filter((x): x is { purchase: Purchase; tier: MembershipTier } => x.tier !== null)
    .sort((a, b) => a.purchase.purchase_date.localeCompare(b.purchase.purchase_date));

  const firstAnytimeIndex = withTiers.findIndex((x) => x.tier === TOP_TIER);
  if (firstAnytimeIndex <= 0) return false;
  return withTiers.slice(0, firstAnytimeIndex).some((x) => x.tier !== TOP_TIER);
}
