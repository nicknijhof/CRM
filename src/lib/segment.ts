import { effectivePurchaseStatus } from './purchases';
import { membershipGroup } from './tags';
import type { Purchase } from './types';

// Customers vs members, worked out from purchases each time (never stored, so it can't go stale):
//   member   = holds something active right now: a membership (paused counts) or a session pack.
//              A complimentary Staff Membership doesn't count: staff are labelled 'staff' instead
//   trial    = nothing above, but a 14-day trial is running
//   customer = has bought before but holds nothing active (walk-ins buying single sessions, and
//              anyone whose plan has lapsed; those carry formerMember so staff can still see it)
//   none     = no purchases at all (a lead)
export type CustomerType = 'member' | 'trial' | 'customer' | 'staff' | 'none';

export const CUSTOMER_TYPES: { value: Exclude<CustomerType, 'none'>; label: string }[] = [
  { value: 'member', label: 'Member' },
  { value: 'trial', label: 'Trial' },
  { value: 'customer', label: 'Customer' },
];

export const CUSTOMER_TYPE_BADGE: Record<Exclude<CustomerType, 'none'>, string> = {
  member: 'bg-teal-100 text-teal-800',
  trial: 'bg-amber-100 text-amber-800',
  customer: 'bg-sky-100 text-sky-800',
  staff: 'bg-stone-200 text-stone-700',
};

export const CUSTOMER_TYPE_LABEL: Record<Exclude<CustomerType, 'none'>, string> = {
  member: 'Member',
  trial: 'Trial',
  customer: 'Customer',
  staff: 'Staff',
};

export function customerType(purchases: Purchase[]): { type: CustomerType; formerMember: boolean } {
  let activePlan = false;
  let staffMembership = false;
  let onTrial = false;
  let everHadPlan = false;

  for (const p of purchases) {
    const status = effectivePurchaseStatus(p);
    if (p.item_type === 'membership' && membershipGroup(p.name) === 'Staff') {
      if (status === 'active' || status === 'paused') staffMembership = true;
    } else if (p.item_type === 'membership') {
      everHadPlan = true;
      if (status === 'active' || status === 'paused') activePlan = true;
    } else if (p.item_type === 'session_pack') {
      everHadPlan = true;
      if (status === 'active') activePlan = true;
    } else if (p.item_type === 'trial' && status === 'active') {
      onTrial = true;
    }
  }

  const type: CustomerType = activePlan
    ? 'member'
    : staffMembership
      ? 'staff'
      : onTrial
        ? 'trial'
        : purchases.length > 0
          ? 'customer'
          : 'none';
  return { type, formerMember: type !== 'member' && everHadPlan };
}
