import type { Contact } from './types';

export const PRIMARY_GOALS: { value: NonNullable<Contact['primary_goal']>; label: string }[] = [
  { value: 'stress_wellbeing', label: 'Stress & Wellbeing' },
  { value: 'fitness_recovery', label: 'Fitness & Recovery' },
  { value: 'hormonal_wellbeing', label: 'Hormonal Wellbeing' },
  { value: 'other', label: 'Other reasons' },
];

export function goalLabel(goal: Contact['primary_goal'], other?: string | null): string | null {
  if (!goal) return null;
  if (goal === 'other') return other?.trim() || 'Other reasons';
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
