import type { ContactSource, PurchaseStatus, Service } from './types';

export type ImportType = 'visits' | 'purchases';

export interface FieldSpec {
  key: string;
  label: string;
  required: boolean;
  guesses: string[];
}

export const VISIT_FIELDS: FieldSpec[] = [
  { key: 'name', label: 'Client name', required: true, guesses: ['name', 'client', 'full name', 'client name'] },
  { key: 'email', label: 'Email', required: false, guesses: ['email', 'e-mail'] },
  { key: 'phone', label: 'Phone', required: false, guesses: ['phone', 'mobile', 'contact number'] },
  { key: 'visit_date', label: 'Visit date/time', required: true, guesses: ['date', 'visit date', 'check-in', 'checkin', 'class date', 'session date'] },
  { key: 'service', label: 'Service / class', required: false, guesses: ['service', 'class', 'class name', 'session'] },
  { key: 'duration_minutes', label: 'Duration (minutes)', required: false, guesses: ['duration', 'minutes'] },
  { key: 'source', label: 'Lead source (new clients only)', required: false, guesses: ['source', 'lead source', 'how they found us'] },
  { key: 'external_id', label: 'Unique row ID (prevents duplicates on re-import)', required: false, guesses: ['id', 'booking id', 'visit id', 'checkin id'] },
];

export const PURCHASE_FIELDS: FieldSpec[] = [
  { key: 'name', label: 'Client name', required: true, guesses: ['name', 'client', 'full name', 'client name'] },
  { key: 'email', label: 'Email', required: false, guesses: ['email', 'e-mail'] },
  { key: 'phone', label: 'Phone', required: false, guesses: ['phone', 'mobile', 'contact number'] },
  { key: 'item_name', label: 'Plan / pack name', required: true, guesses: ['plan', 'membership', 'plan name', 'membership name', 'package'] },
  { key: 'status', label: 'Status', required: false, guesses: ['status', 'membership status'] },
  { key: 'purchase_date', label: 'Purchase / start date', required: false, guesses: ['start', 'start date', 'purchase date'] },
  { key: 'expiry_date', label: 'Expiry date', required: false, guesses: ['end', 'end date', 'expiry', 'expiry date', 'expires'] },
  { key: 'price', label: 'Price', required: false, guesses: ['price', 'amount', 'total'] },
  { key: 'sessions_total', label: 'Total sessions (packs only)', required: false, guesses: ['sessions', 'total sessions', 'package size', 'credits'] },
  { key: 'sessions_remaining', label: 'Sessions remaining (packs only)', required: false, guesses: ['remaining', 'sessions remaining', 'credits remaining', 'balance'] },
  { key: 'source', label: 'Lead source (new clients only)', required: false, guesses: ['source', 'lead source', 'how they found us'] },
  { key: 'discount_code', label: 'Discount code (optional)', required: false, guesses: ['discount', 'discount code', 'promo code', 'promo'] },
  { key: 'external_id', label: 'Unique row ID (prevents duplicates on re-import)', required: false, guesses: ['id', 'membership id', 'order id'] },
];

export function guessColumn(headers: string[], guesses: string[]): string {
  const normalized = headers.map((h) => ({ raw: h, clean: h.trim().toLowerCase() }));
  for (const guess of guesses) {
    const match = normalized.find((h) => h.clean === guess);
    if (match) return match.raw;
  }
  for (const guess of guesses) {
    const match = normalized.find((h) => h.clean.includes(guess));
    if (match) return match.raw;
  }
  return '';
}

export function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
}

export function normalizeEmail(email: string | undefined | null): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

const SERVICE_KEYWORDS: [RegExp, Service][] = [
  [/sauna/i, 'sauna'],
  [/ice|cold/i, 'ice_bath'],
  [/magnesium/i, 'magnesium_bath'],
  [/caf(e|é)|coffee|dough/i, 'cafe'],
];

export function normalizeService(value: string | undefined | null): Service {
  if (!value) return 'other';
  const found = SERVICE_KEYWORDS.find(([re]) => re.test(value));
  return found ? found[1] : 'other';
}

const SOURCE_KEYWORDS: [RegExp, ContactSource][] = [
  [/instagram|\big\b/i, 'instagram'],
  [/walk[\s-]?in/i, 'walk_in'],
  [/referral|referred/i, 'referral'],
  [/classpass/i, 'classpass'],
  [/entertainer/i, 'entertainer'],
  [/corporate/i, 'corporate'],
  [/staff|employee/i, 'staff'],
];

export function normalizeSource(value: string | undefined | null): ContactSource {
  if (!value) return 'other';
  const found = SOURCE_KEYWORDS.find(([re]) => re.test(value));
  return found ? found[1] : 'other';
}

const STATUS_KEYWORDS: [RegExp, PurchaseStatus][] = [
  [/active|current/i, 'active'],
  [/expired/i, 'expired'],
  [/cancel/i, 'cancelled'],
  [/used|redeemed/i, 'used_up'],
];

export function normalizeStatus(value: string | undefined | null): PurchaseStatus {
  if (!value) return 'active';
  const found = STATUS_KEYWORDS.find(([re]) => re.test(value));
  return found ? found[1] : 'active';
}

export function parseDate(value: string | undefined | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function parseDateOnly(value: string | undefined | null): string | null {
  const iso = parseDate(value);
  return iso ? iso.slice(0, 10) : null;
}
