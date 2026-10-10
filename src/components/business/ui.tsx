import type { ReactNode } from 'react';

export const inputCls = 'mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900';
export const primaryBtn = 'rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700';
export const ghostBtn = 'rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50';
export const dangerBtn = 'rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50';

export function Field({ label, hint, className = '', children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block text-sm text-stone-700 ${className}`}>
      {label}
      {children}
      {hint && <span className="mt-0.5 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

const TONES = {
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  stone: 'bg-stone-100 text-stone-600',
  teal: 'bg-teal-100 text-teal-700',
} as const;

export function Badge({ tone = 'stone', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

export function PageHeader({ title, intro, children }: { title: string; intro: string; children?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-500">{intro}</p>
      </div>
      {children}
    </div>
  );
}

export function Detail({ label, children }: { label: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-sm text-stone-800">{children}</dd>
    </div>
  );
}
