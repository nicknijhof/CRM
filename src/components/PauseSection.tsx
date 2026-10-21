'use client';

import { useState, useTransition } from 'react';
import type { Purchase } from '@/lib/types';
import type { PauseResult } from '@/app/(app)/contacts/purchase-actions';

type PauseActions = {
  pauseMembership: (purchaseId: string, contactId: string, formData: FormData) => Promise<PauseResult>;
  resumeMembership: (purchaseId: string, contactId: string) => Promise<PauseResult>;
  cancelScheduledPause: (purchaseId: string, contactId: string) => Promise<PauseResult>;
  editPause: (purchaseId: string, contactId: string, formData: FormData) => Promise<PauseResult>;
};

const dayOnly = (value: string | null) => (value ? value.slice(0, 10) : '');
const buttonCls = 'rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 disabled:opacity-60';
const inputCls = 'mt-0.5 w-full rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700';

// Pause, edit, cancel and resume for one membership. Every action reports back a result, so a
// problem (a bad date, Stripe not reachable) shows as a message right here instead of an error page.
export default function PauseSection({
  purchase: p,
  contactId,
  actions,
}: {
  purchase: Purchase;
  contactId: string;
  actions: PauseActions;
}) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(task: () => Promise<PauseResult>, done: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await task();
        if (result.ok) setNotice(done);
        else setError(result.error);
      } catch {
        setError('Something went wrong. Refresh the page and try again.');
      }
    });
  }

  function submit(action: PauseActions['pauseMembership'], done: string) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      run(() => action(p.id, contactId, data), done);
    };
  }

  const scheduled = !p.is_paused && Boolean(p.pause_started_at);
  const editKey = `${p.pause_started_at}-${p.pause_resume_date}-${p.pause_reason}`;
  const today = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Singapore',
  });

  const editForm = (
    <details key={editKey} className="rounded-lg border border-stone-200 bg-white px-3 py-2">
      <summary className="cursor-pointer text-xs font-medium text-stone-700">Edit pause</summary>
      <form onSubmit={submit(actions.editPause, 'Pause updated.')} className="mt-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-stone-500">{scheduled ? 'Pause from' : 'Paused since'}</label>
            <input
              name="pause_from"
              type="date"
              required
              defaultValue={dayOnly(p.pause_started_at)}
              {...(scheduled ? { min: today } : { max: today })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500">Resume on</label>
            <input name="pause_until" type="date" defaultValue={dayOnly(p.pause_resume_date)} className={inputCls} />
            <p className="mt-0.5 text-[11px] text-stone-400">Resumes by itself on this date. Leave blank to resume manually.</p>
          </div>
        </div>
        <textarea
          name="pause_reason"
          rows={2}
          defaultValue={p.pause_reason ?? ''}
          placeholder="Reason (optional)"
          className={`${inputCls} w-full`}
        />
        <button type="submit" disabled={pending} className={buttonCls}>
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </details>
  );

  return (
    <div className="mt-3 border-t border-stone-200 pt-3">
      {p.is_paused ? (
        <div className="space-y-2">
          <p className="text-stone-700">
            <span className="font-medium text-stone-900">Paused</span>
            {p.pause_reason && ` — ${p.pause_reason}`}
          </p>
          <p className="text-xs text-stone-500">
            Paused since {dayOnly(p.pause_started_at)} · Resumes {dayOnly(p.pause_resume_date) || 'Indefinite'}. Staff resume it
            manually.
          </p>
          <button
            type="button"
            disabled={pending}
            className={buttonCls}
            onClick={() => {
              const message = p.stripe_subscription_id
                ? 'Resume this membership now? Their next Stripe charge moves out by the number of days they were paused.'
                : 'Resume this membership now?';
              if (confirm(message)) run(() => actions.resumeMembership(p.id, contactId), 'Membership resumed.');
            }}
          >
            {pending ? 'Working…' : 'Resume membership'}
          </button>
          {editForm}
        </div>
      ) : scheduled ? (
        <div className="space-y-2">
          <p className="text-stone-700">
            <span className="font-medium text-stone-900">Pause scheduled</span>
            {p.pause_reason && ` — ${p.pause_reason}`}
          </p>
          <p className="text-xs text-stone-500">
            Starts {dayOnly(p.pause_started_at)} · Resumes {dayOnly(p.pause_resume_date) || 'Indefinite'}. They can use their
            account until the start date.
          </p>
          <button
            type="button"
            disabled={pending}
            className={buttonCls}
            onClick={() => run(() => actions.cancelScheduledPause(p.id, contactId), 'Scheduled pause cancelled.')}
          >
            {pending ? 'Working…' : 'Cancel scheduled pause'}
          </button>
          {editForm}
        </div>
      ) : (
        <form onSubmit={submit(actions.pauseMembership, 'Pause saved.')} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Pause membership</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-stone-500">Pause from</label>
              <input name="pause_from" type="date" required defaultValue={today} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-stone-500">Resume on</label>
              <input name="pause_until" type="date" className={inputCls} />
              <p className="mt-0.5 text-[11px] text-stone-400">Resumes by itself on this date. Leave blank to resume manually.</p>
            </div>
          </div>
          <textarea name="pause_reason" rows={2} placeholder="Reason (optional)" className={`${inputCls} w-full`} />
          <button type="submit" disabled={pending} className={buttonCls}>
            {pending ? 'Pausing…' : 'Pause membership'}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}
      {notice && !error && <p className="mt-2 text-xs text-emerald-700">{notice}</p>}
    </div>
  );
}
