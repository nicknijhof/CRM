import type { DiscountCode } from './types';

export function computeDiscount(listPrice: number, discountCode: DiscountCode | null) {
  if (!discountCode) return { discountAmount: 0, finalPrice: listPrice };

  let discountAmount = 0;
  if (discountCode.discount_type === 'full_comp') discountAmount = listPrice;
  else if (discountCode.discount_type === 'percentage') discountAmount = (listPrice * discountCode.value) / 100;
  else discountAmount = discountCode.value;

  discountAmount = Math.min(Math.max(discountAmount, 0), listPrice);
  const finalPrice = Math.round((listPrice - discountAmount) * 100) / 100;
  return { discountAmount, finalPrice };
}

export function computeSessionsTotal(
  sessionsIncluded: number | null,
  discountCode: DiscountCode | null,
): number | null {
  if (sessionsIncluded === null) return null;
  return sessionsIncluded + (discountCode?.bonus_sessions ?? 0);
}
