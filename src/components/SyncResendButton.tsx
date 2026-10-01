'use client';

import { useRef, useState } from 'react';
import { advanceResendRun, syncNewsletterContacts } from '@/app/(app)/marketing/newsletter/actions';

// For staff who want to compose and send from Resend's own dashboard instead of the CRM's
// form — pushes every current CRM contact into the Resend audience first, so that audience
// isn't stale when they go pick it in Resend (it otherwise only syncs as a side effect of the
// CRM's own "Send to all contacts" button). Resend caps requests at ~10/s, so this drives the
// sync forward in small steps (await each response before firing the next) rather than one
// request that would otherwise have to block for minutes.
export default function SyncResendButton() {
  const [starting, setStarting] = useState(false);
  const [progress, setProgress] = useState<{ synced: number; total: number } | null>(null);
  const [done, setDone] = useState<{ total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stoppedRef = useRef(false);

  async function driveRun(runId: string) {
    while (!stoppedRef.current) {
      const res = await advanceResendRun(runId);
      if (!res.ok) {
        setError(res.error ?? 'Sync failed');
        return;
      }
      setProgress({ synced: res.syncedCount ?? 0, total: res.totalCount ?? 0 });
      if (res.status === 'done') {
        setDone({ total: res.totalCount ?? 0 });
        setProgress(null);
        return;
      }
      if (res.status === 'error') {
        setError(res.error ?? 'Sync failed');
        setProgress(null);
        return;
      }
    }
  }

  async function handleClick() {
    setStarting(true);
    setError(null);
    setDone(null);
    stoppedRef.current = false;
    const res = await syncNewsletterContacts();
    setStarting(false);
    if (!res.ok || !res.runId) {
      setError(res.error ?? 'Could not start sync');
      return;
    }
    setProgress({ synced: res.syncedCount ?? 0, total: res.totalCount ?? 0 });
    driveRun(res.runId);
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
          Synced {progress.synced} of {progress.total}… if you leave this page, just come back and click the button
          again to pick up where it left off.
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
