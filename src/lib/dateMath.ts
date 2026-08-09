/**
 * Adds calendar months to a date, clamping to the last valid day of the target month.
 * Plain `Date.setMonth` does NOT do this — e.g. Jan 31 + 1 month rolls over to Mar 3
 * instead of landing on Feb 28. This keeps a monthly billing date anchored to the
 * original day-of-month instead of drifting later over successive cycles.
 */
export function addMonthsClamped(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  const day = d.getDate();

  d.setDate(1);
  d.setMonth(d.getMonth() + months);

  const daysInTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, daysInTargetMonth));

  return d.toISOString().slice(0, 10);
}
