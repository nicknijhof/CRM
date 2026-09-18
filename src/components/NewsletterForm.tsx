'use client';

import { useState, useTransition } from 'react';
import { sendNewsletter } from '@/app/(app)/marketing/newsletter/actions';

export default function NewsletterForm({ contactCount }: { contactCount: number }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; recipientCount?: number; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const res = await sendNewsletter(subject, body);
      setResult(res);
      setConfirming(false);
      if (res.ok) {
        setSubject('');
        setBody('');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <label className="block text-sm text-stone-700">Subject</label>
        <input
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setConfirming(false);
          }}
          maxLength={120}
          required
          placeholder="e.g. This month at Sochill"
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-500"
        />
      </div>
      <div>
        <label className="block text-sm text-stone-700">Message</label>
        <p className="mt-0.5 text-xs text-stone-400">Leave a blank line between paragraphs — no HTML needed.</p>
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setConfirming(false);
          }}
          rows={10}
          required
          placeholder={'Hi there,\n\nHere’s what’s new at Sochill this month...'}
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-500"
        />
      </div>

      {confirming ? (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <p>
            This sends to every contact with an email address — <span className="font-semibold">{contactCount}</span>{' '}
            right now. Can&apos;t be undone once sent.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {isPending ? 'Sending…' : `Yes, send to ${contactCount}`}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Send to all contacts
        </button>
      )}

      {result && !result.ok && <p className="text-sm text-rose-600">{result.error}</p>}
      {result?.ok && (
        <p className="text-sm text-emerald-700">Sent to {result.recipientCount} contact{result.recipientCount === 1 ? '' : 's'}.</p>
      )}
    </form>
  );
}
