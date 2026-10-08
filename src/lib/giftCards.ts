const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion

export function generateGiftCode(): string {
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `GIFT-${suffix}`;
}

// How long a gifted session pack stays valid once it's redeemed, by number of sessions:
// 2 -> 1 month, 3 -> 2, 5 -> 3, 10 -> 4, 20 -> 6. Mirrors the "Valid for" wording on the
// website's gifting page; anything else falls back to the product's normal validity.
const GIFT_VALIDITY_MONTHS: Record<number, number> = { 2: 1, 3: 2, 5: 3, 10: 4, 20: 6 };

export function giftValidityMonths(sessionsTotal: number | null): number | null {
  return sessionsTotal === null ? null : (GIFT_VALIDITY_MONTHS[sessionsTotal] ?? null);
}
