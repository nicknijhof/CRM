import type { Purchase, PurchaseStatus } from './types';

export function effectivePurchaseStatus(purchase: Purchase): PurchaseStatus {
  if (purchase.status === 'cancelled') return 'cancelled';
  if (purchase.sessions_total !== null && (purchase.sessions_remaining ?? 0) <= 0) return 'used_up';
  if (purchase.expiry_date && purchase.expiry_date < new Date().toISOString().slice(0, 10)) return 'expired';
  return purchase.status;
}

export function expiryLabel(itemType: Purchase['item_type']): string {
  return itemType === 'membership' ? 'Renews' : 'Expires';
}
