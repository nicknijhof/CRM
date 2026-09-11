'use client';

import { useState, useTransition } from 'react';
import { sendBroadcast } from '@/app/(app)/broadcast/actions';

export default function BroadcastForm({ subscriberCount }: { subscriberCount: number }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; sent?: number; total?: number; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const res = await sendBroadcast(title, body);
      setResult(res);
      setConfirming(false);
      if (res.ok) {
        setTitle('');
        setBody('');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <label className="block text-sm text-stone-700">Title</label>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setConfirming(false);
          }}
          maxLength={60}
          required
          placeholder="e.g. Sochill Bath Club"
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-500"
        />
      </div>
      <div>
        <label className="block text-sm text-stone-700">Message</label>
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setConfirming(false);
          }}
          maxLength={180}
          rows={3}
          required
          placeholder="e.g. Rain or shine, come on down for a session!"
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-500"
        />
        <p className="mt-1 text-right text-xs text-stone-400">{body.length}/180</p>
      </div>

      {confirming ? (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <p>
            This sends to everyone with notifications enabled — <span className="font-semibold">{subscriberCount}</span>{' '}
            device{subscriberCount === 1 ? '' : 's'} right now. Can&apos;t be undone once sent.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {isPending ? 'Sending…' : `Yes, send to ${subscriberCount}`}
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
          Send to all members
        </button>
      )}

      {result && !result.ok && <p className="text-sm text-rose-600">{result.error}</p>}
      {result?.ok && (
        <p className="text-sm text-emerald-700">
          Sent to {result.sent} of {result.total} device{result.total === 1 ? '' : 's'}.
        </p>
      )}
    </form>
  );
}
