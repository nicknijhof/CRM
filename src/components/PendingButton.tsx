'use client';

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

// Disables a submit button (and swaps its label) the instant its form starts
// submitting — the baseline fix for every action button in the CRM: without
// this, a click gives no visible sign it registered until the full server
// round trip finishes, which is what led to things like double-clicking
// "Complete sale" and ending up with two of the same purchase.
export default function PendingButton({
  className,
  pendingLabel = 'Working…',
  children,
}: {
  className: string;
  pendingLabel?: string;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? pendingLabel : children}
    </button>
  );
}
