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

// A membership whose `expiry_date` (renewal date) has passed while its row
// still says status: 'active' — nobody explicitly cancelled it, it just
// silently stopped renewing. cancelledAt uses the actual renewal date it
// lapsed on, not "whenever staff happened to load this page", so
// cancellations analytics reflect reality rather than reconciliation timing.
export type LapsedMembershipCancellation = { purchaseId: string; cancelledAt: string };

export interface StageReconciliationResult {
  stageReconciliations: StageReconciliation[];
  purchaseCancellations: LapsedMembershipCancellation[];
}

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
): StageReconciliationResult {
  const stageReconciliations: StageReconciliation[] = [];
  const purchaseCancellations: LapsedMembershipCancellation[] = [];

  for (const contact of contacts) {
    const purchases = purchasesByContact.get(contact.id) ?? [];
    if (!purchases.length) continue;

    const withStatus = purchases.map((p) => ({ purchase: p, status: effectivePurchaseStatus(p) }));

    // Purchase-level fix: any membership whose row still says active but its
    // renewal date has passed needs correcting, regardless of the contact's
    // current pipeline stage — a contact already sitting at Cancelled from a
    // prior reconciliation pass would otherwise never get its underlying
    // purchase record (and cancellations analytics) fixed at all.
    for (const { purchase, status } of withStatus) {
      if (purchase.item_type === 'membership' && status === 'expired' && purchase.expiry_date) {
        purchaseCancellations.push({
          purchaseId: purchase.id,
          cancelledAt: new Date(`${purchase.expiry_date}T00:00:00.000Z`).toISOString(),
        });
      }
    }

    const canReconcile = RECONCILABLE_STAGES.has(contact.pipeline_stage);
    const canCancel = CANCELLABLE_STAGES.has(contact.pipeline_stage);
    if (!canReconcile && !canCancel) continue;
    if (withStatus.some((p) => p.status === 'active')) continue;

    const membershipDone = withStatus.some(
      (p) => p.purchase.item_type === 'membership' && (p.status === 'expired' || p.status === 'cancelled')
    );
    if (membershipDone) {
      if (canCancel && contact.pipeline_stage !== 'churned') {
        stageReconciliations.push({ contactId: contact.id, stage: 'churned' });
      }
      continue;
    }

    if (canReconcile && withStatus.some((p) => p.status === 'expired')) {
      stageReconciliations.push({ contactId: contact.id, stage: 'lapsed' });
    }
  }

  return { stageReconciliations, purchaseCancellations };
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
