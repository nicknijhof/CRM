export interface UpcomingBirthday {
  /** The next birthday as YYYY-MM-DD. */
  date: string;
  /** The age they turn on it. */
  turning: number;
  /** 0 = today. */
  daysAway: number;
}

const SG = 'Asia/Singapore';
const todaySG = () => new Date().toLocaleDateString('en-CA', { timeZone: SG });

// A 29 Feb birthday is celebrated on 28 Feb in years without one.
function dateInYear(month: number, day: number, year: number): Date {
  const leap = new Date(year, 1, 29).getMonth() === 1;
  return month === 1 && day === 29 && !leap ? new Date(year, 1, 28) : new Date(year, month, day);
}

// The next time this date of birth comes round, counted from today in Singapore.
export function nextBirthday(dateOfBirth: string | null | undefined, from: string = todaySG()): UpcomingBirthday | null {
  if (!dateOfBirth) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date(`${from}T00:00:00`);
  let next = dateInYear(dob.getMonth(), dob.getDate(), today.getFullYear());
  if (next < today) next = dateInYear(dob.getMonth(), dob.getDate(), today.getFullYear() + 1);
  return {
    date: next.toLocaleDateString('en-CA'),
    turning: next.getFullYear() - dob.getFullYear(),
    daysAway: Math.round((next.getTime() - today.getTime()) / 86400000),
  };
}

export function describeDaysAway(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}
