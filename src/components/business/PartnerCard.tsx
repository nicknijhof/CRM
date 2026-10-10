'use client';

import { useState, useTransition } from 'react';
import { deletePartner, updatePartner } from '@/app/(app)/business/partnerships/actions';
import { contactHref, formatDay, labelOf, PARTNER_ARRANGEMENTS, PARTNER_TYPES, CONTACT_CHANNELS } from '@/lib/business';
import type { Partner } from '@/lib/types';
import PartnerForm from './PartnerForm';
import { Badge, Detail, dangerBtn, ghostBtn } from './ui';

export default function PartnerCard({ partner: p }: { partner: Partner }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const link = contactHref(p.contact_channel, p.contact_detail);

  if (editing) {
    return (
      <div className="rounded-xl border border-teal-300 bg-teal-50/40 p-4">
        <PartnerForm partner={p} action={updatePartner.bind(null, p.id)} submitLabel="Save changes" onDone={() => setEditing(false)} />
      </div>
    );
  }

  const when =
    p.arrangement === 'one_off'
      ? formatDay(p.event_date)
      : [p.start_date && `from ${formatDay(p.start_date)}`, p.end_date && `until ${formatDay(p.end_date)}`].filter(Boolean).join(' ');

  return (
    <div className={`rounded-xl border border-stone-200 bg-white p-4 ${p.status === 'ended' ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-stone-900">{p.name}</h2>
        <Badge tone="teal">{labelOf(PARTNER_TYPES, p.partner_type)}</Badge>
        <Badge tone={p.arrangement === 'one_off' ? 'amber' : 'stone'}>{labelOf(PARTNER_ARRANGEMENTS, p.arrangement)}</Badge>
        {p.status !== 'active' && <Badge>{p.status === 'paused' ? 'Paused' : 'Ended'}</Badge>}
        {when && <span className="text-xs text-stone-500">{when}</span>}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4">
        <Detail label="What the company is">{p.what_they_do}</Detail>
        <Detail label="The deal">{p.deal_summary}</Detail>
        <div className="col-span-2">
          <Detail label="How it works">{p.how_it_works}</Detail>
        </div>
        <Detail label="Contact">{p.contact_name}</Detail>
        <Detail label={p.contact_channel ? `Best on ${labelOf(CONTACT_CHANNELS, p.contact_channel)}` : 'Reach them on'}>
          {p.contact_detail &&
            (link ? (
              <a href={link} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">
                {p.contact_detail}
              </a>
            ) : (
              p.contact_detail
            ))}
        </Detail>
        <div className="col-span-2">
          <Detail label="Notes">{p.notes}</Detail>
        </div>
      </dl>

      <div className="mt-4 flex gap-2 border-t border-stone-100 pt-3">
        <button onClick={() => setEditing(true)} className={ghostBtn}>
          Edit
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm(`Delete ${p.name}? This can't be undone.`)) startTransition(() => deletePartner(p.id));
          }}
          className={dangerBtn}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
