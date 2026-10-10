'use client';

import { useState } from 'react';
import { CONTACT_CHANNELS, PARTNER_ARRANGEMENTS, PARTNER_STATUSES, PARTNER_TYPES } from '@/lib/business';
import type { Partner, PartnerArrangement } from '@/lib/types';
import PendingButton from '../PendingButton';
import { Field, inputCls, primaryBtn } from './ui';

export default function PartnerForm({
  partner,
  action,
  submitLabel,
  onDone,
}: {
  partner?: Partner;
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
  onDone?: () => void;
}) {
  const [arrangement, setArrangement] = useState<PartnerArrangement>(partner?.arrangement ?? 'ongoing');
  return (
    <form
      action={async (fd) => {
        await action(fd);
        onDone?.();
      }}
      className="grid grid-cols-2 gap-4"
    >
      <Field label="Name">
        <input name="name" required defaultValue={partner?.name} placeholder="e.g. Anytime Fitness Bukit Timah" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Who they are">
          <select name="partner_type" defaultValue={partner?.partner_type ?? 'gym'} className={inputCls}>
            {PARTNER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={partner?.status ?? 'active'} className={inputCls}>
            {PARTNER_STATUSES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Kind of deal" hint="One-off covers events, pop-ups and single collaborations.">
        <select name="arrangement" value={arrangement} onChange={(e) => setArrangement(e.target.value as PartnerArrangement)} className={inputCls}>
          {PARTNER_ARRANGEMENTS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      {arrangement === 'one_off' ? (
        <Field label="Event / date">
          <input name="event_date" type="date" defaultValue={partner?.event_date ?? ''} className={inputCls} />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Started">
            <input name="start_date" type="date" defaultValue={partner?.start_date ?? ''} className={inputCls} />
          </Field>
          <Field label="Ends (if fixed)">
            <input name="end_date" type="date" defaultValue={partner?.end_date ?? ''} className={inputCls} />
          </Field>
        </div>
      )}
      <Field label="What the company is" className="col-span-2">
        <textarea name="what_they_do" rows={2} defaultValue={partner?.what_they_do ?? ''} className={inputCls} />
      </Field>
      <Field label="What the deal is" className="col-span-2" hint="e.g. their members get 20% off a 10-pack, we get a poster in their lobby.">
        <textarea name="deal_summary" rows={2} defaultValue={partner?.deal_summary ?? ''} className={inputCls} />
      </Field>
      <Field label="How it works" className="col-span-2" hint="The steps: how members claim it, how it is tracked, who pays what, how it is settled.">
        <textarea name="how_it_works" rows={4} defaultValue={partner?.how_it_works ?? ''} className={inputCls} />
      </Field>
      <Field label="Contact person">
        <input name="contact_name" defaultValue={partner?.contact_name ?? ''} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Best channel">
          <select name="contact_channel" defaultValue={partner?.contact_channel ?? 'whatsapp'} className={inputCls}>
            {CONTACT_CHANNELS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Number or email">
          <input name="contact_detail" defaultValue={partner?.contact_detail ?? ''} className={inputCls} />
        </Field>
      </div>
      <Field label="Notes" className="col-span-2">
        <textarea name="notes" rows={2} defaultValue={partner?.notes ?? ''} className={inputCls} />
      </Field>
      <div className="col-span-2 flex gap-2">
        <PendingButton className={primaryBtn} pendingLabel="Saving…">
          {submitLabel}
        </PendingButton>
        {onDone && (
          <button type="button" onClick={onDone} className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
