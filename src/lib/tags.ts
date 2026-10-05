import { effectivePurchaseStatus } from './purchases';
import type { Purchase } from './types';

// Tags that follow a member's plans automatically — worked out from their purchases each time,
// never stored, so they can't go stale when a plan expires, pauses or is cancelled.
export const AUTO_TAGS = [
  'Founding Member',
  'Unlimited Anytime',
  'Weekdays Member',
  'Off-Peak Member',
  'Staff Member',
  'Pack Holder',
  'On Trial',
  'Paused Member',
  'Ambassador',
] as const;

export function membershipGroup(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('founding')) return 'Founding';
  if (n.includes('off-peak') || n.includes('off peak')) return 'Off-Peak';
  if (n.includes('weekday')) return 'Weekdays';
  if (n.includes('anytime')) return 'Unlimited Anytime';
  if (n.includes('staff')) return 'Staff';
  return 'Other';
}

const GROUP_TAG: Record<string, string> = {
  Founding: 'Founding Member',
  'Unlimited Anytime': 'Unlimited Anytime',
  Weekdays: 'Weekdays Member',
  'Off-Peak': 'Off-Peak Member',
  Staff: 'Staff Member',
};

export function autoTags(purchases: Purchase[], isAmbassador = false): string[] {
  const tags = new Set<string>();
  for (const p of purchases) {
    const status = effectivePurchaseStatus(p);
    if (p.item_type === 'membership') {
      if (status === 'active') {
        const tag = GROUP_TAG[membershipGroup(p.name)];
        if (tag) tags.add(tag);
      } else if (status === 'paused') {
        tags.add('Paused Member');
      }
    }
    if (p.item_type === 'session_pack' && status === 'active') tags.add('Pack Holder');
    if (p.item_type === 'trial' && status === 'active') tags.add('On Trial');
  }
  if (isAmbassador) tags.add('Ambassador');
  return AUTO_TAGS.filter((t) => tags.has(t));
}
