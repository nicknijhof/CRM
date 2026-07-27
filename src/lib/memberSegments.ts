import { effectivePurchaseStatus } from './purchases';
import type { Purchase } from './types';

export type MemberSegment = 'member' | 'session_pack' | 'single_session' | 'no_purchase';

export const MEMBER_SEGMENTS: { value: MemberSegment; label: string }[] = [
  { value: 'member', label: 'Member' },
  { value: 'session_pack', label: 'Valid session pack' },
  { value: 'single_session', label: 'Single session only' },
  { value: 'no_purchase', label: 'No purchase yet' },
];

export function categorizePurchases(purchases: Purchase[]): MemberSegment {
  // A redeemed gift card (is_gift is only set on the buyer's record, not the
  // recipient's) behaves like whatever it actually granted: a session pack
  // if it has sessions, otherwise treat it like the thing it stood in for.
  const active = purchases.filter((p) => effectivePurchaseStatus(p) === 'active' && !p.is_gift);

  if (active.some((p) => p.item_type === 'membership')) return 'member';
  if (active.some((p) => p.item_type === 'session_pack' || (p.item_type === 'gift_card' && p.sessions_total !== null)))
    return 'session_pack';
  if (purchases.some((p) => p.item_type === 'single_session')) return 'single_session';
  return 'no_purchase';
}
