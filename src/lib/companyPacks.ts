import type { Purchase } from './types';
import { effectivePurchaseStatus } from './purchases';

// A company account (e.g. "NBC Universal") holds a session pack its team shares. People are linked to it
// by carrying a tag with the company's name, matched without regard to capitals or stray spaces.
export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const hasTag = (tags: string[] | null | undefined, name: string) => (tags ?? []).some((t) => sameName(t, name));

export interface CompanyPackSummary {
  companyId: string;
  companyName: string;
  remaining: number;
  total: number;
  expiry: string | null;
}

// The pack the team is currently drawing from, if any is still usable.
export function activeCompanyPack(companyId: string, companyName: string, purchases: Purchase[]): CompanyPackSummary | null {
  const packs = purchases
    .filter((p) => p.contact_id === companyId && p.item_type === 'session_pack' && effectivePurchaseStatus(p) === 'active' && (p.sessions_remaining ?? 0) > 0)
    .sort((a, b) => (a.expiry_date ?? '9999') .localeCompare(b.expiry_date ?? '9999'));
  const p = packs[0];
  return p ? { companyId, companyName, remaining: p.sessions_remaining ?? 0, total: p.sessions_total ?? 0, expiry: p.expiry_date } : null;
}
