import type { Purchase } from './types';

export function remainingBalance(price: number | null, amountPaid: number): number {
  return Math.max(0, Math.round(((price ?? 0) - amountPaid) * 100) / 100);
}

export function paymentStatus(purchase: Purchase): 'paid' | 'partial' | 'unpaid' {
  const due = purchase.price ?? 0;
  if (purchase.amount_paid <= 0) return due === 0 ? 'paid' : 'unpaid';
  if (purchase.amount_paid >= due) return 'paid';
  return 'partial';
}
