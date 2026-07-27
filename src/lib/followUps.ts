import type { Contact, Purchase } from './types';

export interface FollowUpCandidate {
  contact: Contact;
  triggerType: 'visit' | 'purchase_used';
  triggerId: string;
  triggerDate: string;
  reason: string;
}

interface VisitRow {
  id: string;
  contact_id: string;
  visit_date: string;
}

export function buildFollowUpCandidates(
  contacts: Contact[],
  visits: VisitRow[],
  purchases: Purchase[],
): FollowUpCandidate[] {
  const contactsById = new Map(contacts.map((c) => [c.id, c]));
  const candidates: FollowUpCandidate[] = [];

  // Only the first visit per contact triggers a follow-up (their initial
  // experience) — otherwise a bulk CSV import of historical visits would
  // flood this list with stale entries.
  const firstVisitByContact = new Map<string, VisitRow>();
  for (const v of visits) {
    const existing = firstVisitByContact.get(v.contact_id);
    if (!existing || new Date(v.visit_date) < new Date(existing.visit_date)) {
      firstVisitByContact.set(v.contact_id, v);
    }
  }
  for (const v of firstVisitByContact.values()) {
    const contact = contactsById.get(v.contact_id);
    if (!contact) continue;
    candidates.push({ contact, triggerType: 'visit', triggerId: v.id, triggerDate: v.visit_date, reason: 'First visit' });
  }

  for (const p of purchases) {
    if (!p.used_up_at) continue;
    const contact = contactsById.get(p.contact_id);
    if (!contact) continue;
    candidates.push({
      contact,
      triggerType: 'purchase_used',
      triggerId: p.id,
      triggerDate: p.used_up_at,
      reason: `Used up — ${p.name}`,
    });
  }

  return candidates;
}
