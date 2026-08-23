import { format, startOfMonth, subDays, subMonths } from 'date-fns';
import type { Contact, Purchase } from './types';

export function newMembersCount(purchases: Purchase[], days: number): number {
  const cutoff = subDays(new Date(), days);
  const ids = new Set(
    purchases
      .filter((p) => p.item_type === 'membership' && new Date(p.purchase_date) >= cutoff)
      .map((p) => p.contact_id),
  );
  return ids.size;
}

export function cancellationsCount(purchases: Purchase[], days: number): number {
  const cutoff = subDays(new Date(), days);
  return purchases.filter((p) => p.cancelled_at && new Date(p.cancelled_at) >= cutoff).length;
}

export type CancellationTrendPoint = { month: string; cancellations: number };

export function cancellationsByMonth(purchases: Purchase[], monthsBack: number): CancellationTrendPoint[] {
  const cancelled = purchases.filter((p): p is Purchase & { cancelled_at: string } => !!p.cancelled_at);
  const now = new Date();
  const points: CancellationTrendPoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = startOfMonth(subMonths(now, i - 1));
    const count = cancelled.filter((p) => {
      const d = new Date(p.cancelled_at);
      return d >= monthStart && d < monthEnd;
    }).length;
    points.push({ month: format(monthStart, 'MMM'), cancellations: count });
  }

  return points;
}

// All-time snapshot: of everyone not currently paused, what fraction are active members.
export function trialToActiveRate(contacts: Contact[]): number {
  const everTrial = contacts.filter((c) => c.pipeline_stage !== 'lead');
  const converted = everTrial.filter((c) => c.pipeline_stage === 'active').length;
  return everTrial.length ? Math.round((converted / everTrial.length) * 100) : 0;
}

export interface CohortConversionPoint {
  month: string;
  cohortSize: number;
  convertedCount: number;
  rate: number;
}

// Groups contacts by the month they signed up (their trial starting point,
// since every new contact defaults to the trial stage), then checks what
// fraction of each signup cohort are active members today. There's no
// pipeline-stage history log, so this is a current-snapshot view of past
// cohorts rather than a true month-by-month conversion rate over time.
export function conversionByCohortMonth(contacts: Contact[], monthsBack: number): CohortConversionPoint[] {
  const points: CohortConversionPoint[] = [];
  const now = new Date();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = startOfMonth(subMonths(now, i - 1));
    const cohort = contacts.filter((c) => {
      const created = new Date(c.created_at);
      return created >= monthStart && created < monthEnd;
    });
    const convertedCount = cohort.filter((c) => c.pipeline_stage === 'active').length;
    points.push({
      month: format(monthStart, 'MMM'),
      cohortSize: cohort.length,
      convertedCount,
      rate: cohort.length ? Math.round((convertedCount / cohort.length) * 100) : 0,
    });
  }

  return points;
}

export type PackSalesPoint = { month: string } & Record<string, number | string>;

// Monthly sale counts for the top N best-selling session packs (by name),
// so a decline in a specific pack (e.g. the 10-session pack) shows up as
// its own line rather than being averaged away in an "all packs" total.
export function packSalesByMonth(
  purchases: Purchase[],
  monthsBack: number,
  topN = 4,
): { data: PackSalesPoint[]; packNames: string[] } {
  const packPurchases = purchases.filter((p) => p.item_type === 'session_pack');

  const nameCounts = new Map<string, number>();
  for (const p of packPurchases) nameCounts.set(p.name, (nameCounts.get(p.name) ?? 0) + 1);
  const packNames = [...nameCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name]) => name);

  const now = new Date();
  const data: PackSalesPoint[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = startOfMonth(subMonths(now, i - 1));
    const point: PackSalesPoint = { month: format(monthStart, 'MMM') };
    for (const name of packNames) point[name] = 0;
    for (const p of packPurchases) {
      if (!packNames.includes(p.name)) continue;
      const d = new Date(p.purchase_date);
      if (d >= monthStart && d < monthEnd) {
        point[p.name] = (point[p.name] as number) + 1;
      }
    }
    data.push(point);
  }

  return { data, packNames };
}

interface FollowUpCompletionRow {
  contact_id: string;
  completed_at: string;
}

interface VisitRow {
  contact_id: string;
  visit_date: string;
}

// Of the follow-up messages staff marked as sent, what fraction of those
// contacts actually visited within `windowDays` afterward.
export function followUpReturnRate(
  completions: FollowUpCompletionRow[],
  visits: VisitRow[],
  windowDays: number,
): { total: number; returned: number; rate: number | null } {
  if (!completions.length) return { total: 0, returned: 0, rate: null };

  const visitsByContact = new Map<string, Date[]>();
  for (const v of visits) {
    const list = visitsByContact.get(v.contact_id) ?? [];
    list.push(new Date(v.visit_date));
    visitsByContact.set(v.contact_id, list);
  }

  let returned = 0;
  for (const c of completions) {
    const completedAt = new Date(c.completed_at);
    const windowEnd = new Date(completedAt.getTime() + windowDays * 24 * 60 * 60 * 1000);
    const contactVisits = visitsByContact.get(c.contact_id) ?? [];
    if (contactVisits.some((v) => v > completedAt && v <= windowEnd)) returned += 1;
  }

  return { total: completions.length, returned, rate: Math.round((returned / completions.length) * 100) };
}
