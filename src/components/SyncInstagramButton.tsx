'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { syncInstagramNow } from '@/app/(app)/marketing/actions';

export default function SyncInstagramButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await syncInstagramNow();
      if (!res.ok) {
        alert(res.error ?? 'Sync failed.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-60"
    >
      {isPending ? 'Syncing…' : 'Sync now'}
    </button>
  );
}
