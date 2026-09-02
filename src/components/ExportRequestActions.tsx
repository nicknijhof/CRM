'use client';

import { useState } from 'react';

export default function ExportRequestActions({
  requestId,
  canDecide,
  canDownload,
  canCancel,
  respondAction,
  cancelAction,
}: {
  requestId: string;
  canDecide: boolean;
  canDownload: boolean;
  canCancel: boolean;
  respondAction: (requestId: string, approve: boolean, formData: FormData) => Promise<void>;
  cancelAction: (requestId: string) => Promise<void>;
}) {
  const [showDenyReason, setShowDenyReason] = useState(false);

  if (!canDecide && !canDownload && !canCancel) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {canDownload && (
        <a
          href={`/api/export/download?requestId=${requestId}`}
          className="w-fit rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
        >
          Download export
        </a>
      )}

      {canCancel && (
        <form action={cancelAction.bind(null, requestId)}>
          <button className="text-xs text-rose-600 underline hover:text-rose-700">Cancel request</button>
        </form>
      )}

      {canDecide && !showDenyReason && (
        <div className="flex gap-2">
          <form action={respondAction.bind(null, requestId, true)}>
            <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
              Approve
            </button>
          </form>
          <button
            type="button"
            onClick={() => setShowDenyReason(true)}
            className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            Deny
          </button>
        </div>
      )}

      {canDecide && showDenyReason && (
        <form action={respondAction.bind(null, requestId, false)} className="flex flex-col gap-2">
          <input
            name="denial_reason"
            placeholder="Reason for denying (optional)"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
          />
          <div className="flex gap-2">
            <button className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700">
              Confirm deny
            </button>
            <button
              type="button"
              onClick={() => setShowDenyReason(false)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
