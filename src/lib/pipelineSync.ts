import { effectivePurchaseStatus } from './purchases';
import type { Contact, PipelineStage, Purchase } from './types';

// Stages eligible to move into "Expired" (non-membership purchases going stale).
export const RECONCILABLE_STAGES = new Set<PipelineStage>(['trial', 'active', 'at_risk']);

// Stages eligible to move into "Cancelled" — a superset that also includes
// `lapsed`, so a contact previously (mis)filed as Expired by the old
// pack/trial-only logic gets corrected once we see their real driver was a
// membership, not just re-examined going forward.
const CANCELLABLE_STAGES = new Set<PipelineStage>(['trial', 'active', 'at_risk', 'lapsed']);

export type StageReconciliation = { contactId: string; stage: 'lapsed' | 'churned' };

/**
 * Contacts currently marked trial/active/at-risk whose purchases have all
 * lapsed belong off the active board. A membership doesn't just "expire"
 * on its renewal date the way a pack does — it only really ends when the
 * subscription is cancelled (via Stripe non-payment or a staff cancel), so
 * a contact whose most relevant purchase is a done membership moves to
 * Cancelled instead of Expired. There's no cron in this app, so this is
 * computed lazily whenever the Pipeline/Dashboard is viewed and persisted
 * then; the Stripe webhook also does this immediately on cancellation.
 */
export function contactsNeedingStageReconciliation(
  contacts: Contact[],
  purchasesByContact: Map<string, Purchase[]>
): StageReconciliation[] {
  const results: StageReconciliation[] = [];

  for (const contact of contacts) {
    const canReconcile = RECONCILABLE_STAGES.has(contact.pipeline_stage);
    const canCancel = CANCELLABLE_STAGES.has(contact.pipeline_stage);
    if (!canReconcile && !canCancel) continue;

    const purchases = purchasesByContact.get(contact.id) ?? [];
    if (!purchases.length) continue;

    const withStatus = purchases.map((p) => ({ purchase: p, status: effectivePurchaseStatus(p) }));
    if (withStatus.some((p) => p.status === 'active')) continue;

    const membershipDone = withStatus.some(
      (p) => p.purchase.item_type === 'membership' && (p.status === 'expired' || p.status === 'cancelled')
    );
    if (membershipDone) {
      if (canCancel && contact.pipeline_stage !== 'churned') results.push({ contactId: contact.id, stage: 'churned' });
      continue;
    }

    if (canReconcile && withStatus.some((p) => p.status === 'expired')) {
      results.push({ contactId: contact.id, stage: 'lapsed' });
    }
  }

  return results;
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
