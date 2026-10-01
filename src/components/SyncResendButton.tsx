'use client';

import { useEffect, useRef, useState } from 'react';
import { getResendRunStatus, syncNewsletterContacts } from '@/app/(app)/marketing/newsletter/actions';

// For staff who want to compose and send from Resend's own dashboard instead of the CRM's
// form — pushes every current CRM contact into the Resend audience first, so that audience
// isn't stale when they go pick it in Resend (it otherwise only syncs as a side effect of the
// CRM's own "Send to all contacts" button). Resend caps requests at ~10/s, so syncing a large
// contact list runs as a background job the CRM polls rather than one blocking request.
export default function SyncResendButton() {
  const [starting, setStarting] = useState(false);
  const [progress, setProgress] = useState<{ synced: number; total: number } | null>(null);
  const [done, setDone] = useState<{ synced: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  function pollStatus(runId: string) {
    pollRef.current = setInterval(async () => {
      const res = await getResendRunStatus(runId);
      if (!res.ok) {
        setError(res.error ?? 'Sync failed');
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      setProgress({ synced: res.syncedCount ?? 0, total: res.totalCount ?? 0 });
      if (res.status === 'done') {
        setDone({ synced: res.syncedCount ?? 0, total: res.totalCount ?? 0 });
        setProgress(null);
        if (pollRef.current) clearInterval(pollRef.current);
      } else if (res.status === 'error') {
        setError(res.error ?? 'Sync failed');
        setProgress(null);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 1500);
  }

  async function handleClick() {
    setStarting(true);
    setError(null);
    setDone(null);
    const res = await syncNewsletterContacts();
    setStarting(false);
    if (!res.ok || !res.runId) {
      setError(res.error ?? 'Could not start sync');
      return;
    }
    setProgress({ synced: 0, total: res.totalCount ?? 0 });
    pollStatus(res.runId);
  }

  const isRunning = starting || !!progress;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isRunning}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
      >
        {isRunning ? 'Syncing…' : 'Sync contacts to Resend'}
      </button>
      {progress && (
        <span className="text-xs text-stone-500">
          Synced {progress.synced} of {progress.total}…
        </span>
      )}
      {done && (
        <span className="text-xs text-emerald-700">
          Synced all {done.total} contacts — go send from Resend&apos;s dashboard now.
        </span>
      )}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
