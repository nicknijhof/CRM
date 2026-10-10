'use client';

import { useState, useTransition } from 'react';
import { deleteContract, markRenewalHandled, reopenRenewal, setContractStatus, updateContract } from '@/app/(app)/business/contracts/actions';
import { contactHref, describeDays, formatDay, formatPrice, renewalActions } from '@/lib/business';
import type { Contract } from '@/lib/types';
import ContractForm from './ContractForm';
import { Badge, Detail, dangerBtn, ghostBtn } from './ui';

export default function ContractCard({ contract: c, suppliers }: { contract: Contract; suppliers: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const action = renewalActions([c])[0];
  const handled = c.renewal_date !== null && c.handled_for_renewal === c.renewal_date;
  const link = contactHref(c.contact_detail?.includes('@') ? 'email' : 'phone', c.contact_detail);

  if (editing) {
    return (
      <div className="rounded-xl border border-teal-300 bg-teal-50/40 p-4">
        <ContractForm contract={c} suppliers={suppliers} action={updateContract.bind(null, c.id)} submitLabel="Save changes" onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className={`rounded-xl border bg-white p-4 ${action?.urgent ? 'border-amber-300' : 'border-stone-200'} ${c.status === 'ended' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-stone-900">{c.name}</h2>
            {c.category && <Badge>{c.category}</Badge>}
            {c.status === 'ended' && <Badge>Ended</Badge>}
            {action && <Badge tone={action.urgent ? 'red' : 'amber'}>Action needed</Badge>}
            {handled && c.status === 'active' && <Badge tone="green">Renewal handled</Badge>}
          </div>
          {c.provider && <p className="mt-0.5 text-sm text-stone-500">{c.provider}</p>}
        </div>
        <p className="shrink-0 text-right text-lg font-semibold text-stone-900">{formatPrice(c.price, c.billing_cycle)}</p>
      </div>

      {action && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${action.urgent ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}>
          Renews {formatDay(c.renewal_date)} ({describeDays(action.daysToRenewal)}).
          {action.noticeDeadline && (
            <>
              {' '}
              Give notice by <strong>{formatDay(action.noticeDeadline)}</strong> ({describeDays(action.daysToNoticeDeadline!)}) if we want out or to renegotiate.
            </>
          )}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-4">
        <Detail label="Renewal date">{formatDay(c.renewal_date) && `${formatDay(c.renewal_date)}${c.auto_renews ? ' (auto-renews)' : ' (does not auto-renew)'}`}</Detail>
        <Detail label="Started">{formatDay(c.start_date)}</Detail>
        <Detail label="Notice to cancel">{c.notice_days !== null && `${c.notice_days} days`}</Detail>
        <div className="col-span-3">
          <Detail label="Cancellation policy">{c.cancellation_policy}</Detail>
        </div>
        <Detail label="Contact">{c.contact_name}</Detail>
        <Detail label="Reach them on">
          {c.contact_detail &&
            (link ? (
              <a href={link} className="text-teal-700 hover:underline">
                {c.contact_detail}
              </a>
            ) : (
              c.contact_detail
            ))}
        </Detail>
        <Detail label="Notes">{c.notes}</Detail>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
        {action && c.renewal_date && (
          <button
            disabled={pending}
            onClick={() => startTransition(() => markRenewalHandled(c.id, c.renewal_date!))}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            Mark renewal as handled
          </button>
        )}
        {handled && c.status === 'active' && (
          <button disabled={pending} onClick={() => startTransition(() => reopenRenewal(c.id))} className={ghostBtn}>
            Show reminder again
          </button>
        )}
        <button onClick={() => setEditing(true)} className={ghostBtn}>
          Edit
        </button>
        <button
          disabled={pending}
          onClick={() => startTransition(() => setContractStatus(c.id, c.status === 'active' ? 'ended' : 'active'))}
          className={ghostBtn}
        >
          {c.status === 'active' ? 'Mark as ended' : 'Reactivate'}
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm(`Delete the ${c.name} contract? This can't be undone.`)) startTransition(() => deleteContract(c.id));
          }}
          className={dangerBtn}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
