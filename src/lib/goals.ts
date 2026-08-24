import type { Contact } from './types';

export const PRIMARY_GOALS: { value: NonNullable<Contact['primary_goal']>; label: string }[] = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'hormonal_cycle_health', label: 'Hormonal / cycle health' },
  { value: 'mental_health', label: 'Mental health & stress' },
  { value: 'better_sleep', label: 'Better sleep' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'other', label: 'Other' },
];

export function goalLabel(goal: Contact['primary_goal'], other?: string | null): string | null {
  if (!goal) return null;
  if (goal === 'other') return other?.trim() || 'Other';
  return PRIMARY_GOALS.find((g) => g.value === goal)?.label ?? goal;
}

export function ageFromDateOfBirth(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}
