import { effectivePurchaseStatus } from './purchases';
import type { Contact, Purchase } from './types';

const RECONCILABLE_STAGES = new Set(['trial', 'active', 'at_risk']);

/**
 * Contacts currently marked trial/active/at-risk whose purchases have all
 * lapsed (nothing active, but at least one actually expired) belong in the
 * "Expired" column. There's no cron in this app, so this is computed
 * lazily whenever the Pipeline/Dashboard is viewed and persisted then.
 */
export function contactsNeedingExpiredStage(contacts: Contact[], purchasesByContact: Map<string, Purchase[]>): string[] {
  const ids: string[] = [];

  for (const contact of contacts) {
    if (!RECONCILABLE_STAGES.has(contact.pipeline_stage)) continue;

    const purchases = purchasesByContact.get(contact.id) ?? [];
    if (!purchases.length) continue;

    const statuses = purchases.map((p) => effectivePurchaseStatus(p));
    const hasActive = statuses.includes('active');
    const hasExpired = statuses.includes('expired');

    if (!hasActive && hasExpired) ids.push(contact.id);
  }

  return ids;
}

export function groupPurchasesByContact(purchases: Purchase[]): Map<string, Purchase[]> {
  const map = new Map<string, Purchase[]>();
  for (const p of purchases) {
    const list = map.get(p.contact_id) ?? [];
    list.push(p);
    map.set(p.contact_id, list);
  }
  return map;
}
