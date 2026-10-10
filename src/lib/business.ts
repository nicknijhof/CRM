import { addMonths, differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';
import type { BillingCycle, ContactChannel, Contract, PartnerArrangement, PartnerStatus, PartnerType } from './types';

// Contracts surface on the dashboard this many months before they renew.
export const RENEWAL_WARNING_MONTHS = 3;

export const PARTNER_TYPES: { value: PartnerType; label: string }[] = [
  { value: 'gym', label: 'Gym / studio' },
  { value: 'company', label: 'Company' },
  { value: 'other', label: 'Other' },
];
export const PARTNER_ARRANGEMENTS: { value: PartnerArrangement; label: string }[] = [
  { value: 'ongoing', label: 'Ongoing deal' },
  { value: 'one_off', label: 'One-off' },
];
export const PARTNER_STATUSES: { value: PartnerStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'ended', label: 'Ended' },
];
export const CONTACT_CHANNELS: { value: ContactChannel; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone call' },
  { value: 'other', label: 'Other' },
];
export const BILLING_CYCLES: { value: BillingCycle; label: string; short: string }[] = [
  { value: 'monthly', label: 'Monthly', short: '/month' },
  { value: 'quarterly', label: 'Quarterly', short: '/quarter' },
  { value: 'yearly', label: 'Yearly', short: '/year' },
  { value: 'one_off', label: 'One-off', short: '' },
];
export const CONTRACT_CATEGORIES = ['Phone & internet', 'Cleaning', 'Sauna maintenance', 'Laundry', 'Scent', 'Insurance', 'Software', 'Pest control', 'Other'];
export const SUPPLIER_CATEGORIES = ['Cleaning', 'Laundry', 'Sauna & equipment', 'Cafe stock', 'Retail stock', 'Amenities', 'Maintenance', 'Marketing', 'Software', 'Other'];

export const labelOf = (list: { value: string; label: string }[], value: string | null) =>
  list.find((i) => i.value === value)?.label ?? value ?? '';

export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return '';
  return `S$${Number(n).toLocaleString('en-SG', { minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function formatPrice(price: number | null, cycle: BillingCycle): string {
  if (price === null) return 'Price not set';
  return `${formatMoney(price)}${BILLING_CYCLES.find((c) => c.value === cycle)?.short ?? ''}`;
}

export function formatDay(date: string | null): string {
  return date ? format(parseISO(date), 'd MMM yyyy') : '';
}

// A link to chat with someone on their preferred channel.
export function contactHref(channel: ContactChannel | null, detail: string | null): string | null {
  if (!detail) return null;
  const d = detail.trim();
  if (channel === 'whatsapp') {
    const digits = d.replace(/[^\d]/g, '');
    return digits ? `https://wa.me/${digits.length === 8 ? `65${digits}` : digits}` : null;
  }
  if (channel === 'email') return d.includes('@') ? `mailto:${d}` : null;
  if (channel === 'phone') return `tel:${d.replace(/[^\d+]/g, '')}`;
  return null;
}

export interface RenewalAction {
  contract: Contract;
  daysToRenewal: number;
  /** Last day to give notice, when the contract has a notice period. */
  noticeDeadline: string | null;
  daysToNoticeDeadline: number | null;
  urgent: boolean;
}

// Active contracts renewing within RENEWAL_WARNING_MONTHS (or already past their renewal date)
// that haven't been marked handled for that renewal date. Most urgent first.
export function renewalActions(contracts: Contract[], today = new Date()): RenewalAction[] {
  const horizon = addMonths(today, RENEWAL_WARNING_MONTHS);
  const out: RenewalAction[] = [];
  for (const contract of contracts) {
    if (contract.status !== 'active' || !contract.renewal_date) continue;
    if (contract.handled_for_renewal === contract.renewal_date) continue;
    const renewal = parseISO(contract.renewal_date);
    if (renewal > horizon) continue;
    const daysToRenewal = differenceInCalendarDays(renewal, today);
    const deadline = contract.notice_days !== null ? subDays(renewal, contract.notice_days) : null;
    const daysToNoticeDeadline = deadline ? differenceInCalendarDays(deadline, today) : null;
    out.push({
      contract,
      daysToRenewal,
      noticeDeadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
      daysToNoticeDeadline,
      urgent: (daysToNoticeDeadline ?? daysToRenewal) <= 30,
    });
  }
  return out.sort((a, b) => (a.daysToNoticeDeadline ?? a.daysToRenewal) - (b.daysToNoticeDeadline ?? b.daysToRenewal));
}

export function describeDays(days: number): string {
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} ago`;
  if (days === 0) return 'today';
  if (days < 61) return `in ${days} day${days === 1 ? '' : 's'}`;
  return `in ${Math.round(days / 30)} months`;
}
