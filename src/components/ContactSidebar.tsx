'use client';

import { useState } from 'react';
import { Mail, Phone, Pencil, Trash2, Tag as TagIcon } from 'lucide-react';
import { CONTACT_SOURCES, PIPELINE_STAGES, STAGE_BADGE_CLASSES } from '@/lib/constants';
import { ageFromDateOfBirth, goalLabel } from '@/lib/goals';
import { FUNNEL_STAGES, type FunnelStage } from '@/lib/funnel';
import type { Contact } from '@/lib/types';

const GENDER_LABELS: Record<NonNullable<Contact['gender']>, string> = {
  female: 'Female',
  male: 'Male',
  non_binary: 'Non-binary',
  prefer_not_to_say: 'Prefer not to say',
};

const FUNNEL_STAGE_CLASSES: Record<FunnelStage, string> = {
  new_guest: 'bg-stone-100 text-stone-600',
  single_session: 'bg-amber-100 text-amber-700',
  session_pack: 'bg-sky-100 text-sky-700',
  membership: 'bg-emerald-100 text-emerald-700',
};

export default function ContactSidebar({
  contact,
  waiverSigned,
  updateContact,
  deleteContact,
  latestGoalReflection,
  funnelStage,
  upgradeOpportunity,
}: {
  contact: Contact;
  waiverSigned: boolean;
  updateContact: (formData: FormData) => Promise<void>;
  deleteContact: (formData: FormData) => Promise<void>;
  latestGoalReflection?: string | null;
  funnelStage?: FunnelStage;
  upgradeOpportunity?: string | null;
}) {
  const [editing, setEditing] = useState(false);

  const initial = contact.full_name.trim().charAt(0).toUpperCase() || '?';

  if (editing) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Edit member</h2>
        <form
          action={async (formData) => {
            await updateContact(formData);
            setEditing(false);
          }}
          className="mt-4 space-y-4"
        >
          <Field label="Full name" name="full_name" defaultValue={contact.full_name} required />
          <Field label="Email" name="email" defaultValue={contact.email ?? ''} type="email" />
          <Field label="Phone" name="phone" defaultValue={contact.phone ?? ''} />
          <div>
            <label className="block text-sm text-stone-700">Source</label>
            <select
              name="source"
              defaultValue={contact.source}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            >
              {CONTACT_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-stone-700">Tags (comma separated)</label>
            <input
              name="tags"
              defaultValue={contact.tags?.join(', ')}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700">Notes</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={contact.notes ?? ''}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Save changes
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {contact.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not worth configuring next/image remotePatterns for a single avatar
            <img
              src={contact.avatar_url}
              alt={contact.full_name}
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-100 text-lg font-semibold text-teal-700">
              {initial}
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-stone-900">{contact.full_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_BADGE_CLASSES[contact.pipeline_stage]}`}
              >
                {PIPELINE_STAGES.find((s) => s.value === contact.pipeline_stage)?.label}
              </span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  waiverSigned ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}
              >
                {waiverSigned ? 'Waiver signed' : 'Waiver not signed'}
              </span>
              {funnelStage && (
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${FUNNEL_STAGE_CLASSES[funnelStage]}`}
                >
                  {FUNNEL_STAGES.find((s) => s.value === funnelStage)?.label}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      <div className="mt-5 space-y-2.5 border-t border-stone-200 pt-4 text-sm">
        <div className="flex items-center gap-2 text-stone-700">
          <Mail className="h-4 w-4 shrink-0 text-stone-400" />
          {contact.email || <span className="text-stone-400">No email</span>}
        </div>
        <div className="flex items-center gap-2 text-stone-700">
          <Phone className="h-4 w-4 shrink-0 text-stone-400" />
          {contact.phone || <span className="text-stone-400">No phone</span>}
        </div>
      </div>

      <div className="mt-4 border-t border-stone-200 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Source</p>
        <p className="mt-1 text-sm text-stone-700">{CONTACT_SOURCES.find((s) => s.value === contact.source)?.label}</p>
      </div>

      {funnelStage && funnelStage !== 'membership' && (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Not on a membership yet — worth an offer to move them up when the moment&apos;s right.
        </div>
      )}
      {upgradeOpportunity && (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Currently on <span className="font-medium">{upgradeOpportunity}</span> — a good candidate for an Unlimited
          Anytime upgrade offer.
        </div>
      )}

      {(contact.gender || contact.date_of_birth || contact.primary_goal) && (
        <div className="mt-4 border-t border-stone-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">About</p>
          <div className="mt-1 space-y-1 text-sm text-stone-700">
            {(contact.gender || contact.date_of_birth) && (
              <p>
                {contact.gender ? GENDER_LABELS[contact.gender] : null}
                {contact.gender && contact.date_of_birth ? ' · ' : null}
                {contact.date_of_birth ? `Age ${ageFromDateOfBirth(contact.date_of_birth)}` : null}
              </p>
            )}
            {contact.primary_goal && (
              <p>
                Goal: <span className="font-medium">{goalLabel(contact.primary_goal, contact.primary_goal_other)}</span>
              </p>
            )}
            {contact.gender === 'female' && (ageFromDateOfBirth(contact.date_of_birth) ?? 0) >= 45 && (
              <p className="text-xs text-stone-400">
                Age 45+ — informational only, not a diagnosis; may be worth a gentle check-in if relevant to their goal.
              </p>
            )}
          </div>
          {latestGoalReflection && (
            <p className="mt-2 rounded-lg bg-stone-50 px-2.5 py-2 text-xs italic text-stone-600">
              &ldquo;{latestGoalReflection}&rdquo;
            </p>
          )}
        </div>
      )}

      {contact.tags?.length > 0 && (
        <div className="mt-4 border-t border-stone-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Tags</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {contact.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
              >
                <TagIcon className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {contact.notes && (
        <div className="mt-4 border-t border-stone-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{contact.notes}</p>
        </div>
      )}

      <div className="mt-5 border-t border-stone-200 pt-4">
        <form action={deleteContact}>
          <button className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700">
            <Trash2 className="h-3.5 w-3.5" />
            Delete member
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-stone-700">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-500"
      />
    </div>
  );
}
