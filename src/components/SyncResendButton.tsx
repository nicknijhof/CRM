'use client';

import { useState, useTransition } from 'react';
import { syncNewsletterContacts } from '@/app/(app)/marketing/newsletter/actions';

// For staff who want to compose and send from Resend's own dashboard instead of the CRM's
// form — pushes every current CRM contact into the Resend audience first, so that audience
// isn't stale when they go pick it in Resend (it otherwise only syncs as a side effect of the
// CRM's own "Send to all contacts" button).
export default function SyncResendButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; contactCount?: number; error?: string } | null>(null);

  function handleClick() {
    startTransition(async () => {
      const res = await syncNewsletterContacts();
      setResult(res);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
      >
        {isPending ? 'Syncing…' : 'Sync contacts to Resend'}
      </button>
      {result?.ok && (
        <span className="text-xs text-emerald-700">
          Synced {result.contactCount} contact{result.contactCount === 1 ? '' : 's'} — go send from Resend&apos;s
          dashboard now.
        </span>
      )}
      {result && !result.ok && <span className="text-xs text-rose-600">{result.error}</span>}
    </div>
  );
}
