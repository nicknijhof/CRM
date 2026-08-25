'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PRIMARY_GOALS, goalLabel } from '@/lib/goals';
import { whatsappLink } from '@/lib/whatsapp';
import type { Contact } from '@/lib/types';

type GoalRow = Pick<Contact, 'id' | 'full_name' | 'email' | 'phone' | 'primary_goal' | 'primary_goal_other'>;

type SegmentValue = NonNullable<Contact['primary_goal']> | 'none';

const SEGMENTS: { value: SegmentValue; label: string }[] = [
  ...PRIMARY_GOALS,
  { value: 'none', label: 'No goal set yet' },
];

const DEFAULT_MESSAGE =
  "Hi {first_name}, it's the team at Sochill Bath Club! We'd love to see you again soon 🧊";

export default function GoalOutreachView({ contacts }: { contacts: GoalRow[] }) {
  const [activeSegment, setActiveSegment] = useState<SegmentValue | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [subject, setSubject] = useState('A note from Sochill Bath Club');

  const segmentCounts = useMemo(
    () =>
      SEGMENTS.map((s) => ({
        ...s,
        count: contacts.filter((c) => (s.value === 'none' ? !c.primary_goal : c.primary_goal === s.value)).length,
      })),
    [contacts],
  );

  const visibleContacts = useMemo(
    () =>
      activeSegment === 'all'
        ? contacts
        : contacts.filter((c) => (activeSegment === 'none' ? !c.primary_goal : c.primary_goal === activeSegment)),
    [contacts, activeSegment],
  );

  const selectedContacts = contacts.filter((c) => selectedIds.has(c.id));
  const selectedWithEmail = selectedContacts.filter((c) => c.email);
  const selectedWithPhone = selectedContacts.filter((c) => c.phone);

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    const visibleIds = visibleContacts.map((c) => c.id);
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function personalize(template: string, firstName: string) {
    return template.replaceAll('{first_name}', firstName || 'there');
  }

  const mailtoHref = `mailto:?bcc=${encodeURIComponent(selectedWithEmail.map((c) => c.email).join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message.replaceAll('{first_name}', 'there'))}`;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-200">
        <div className="grid grid-cols-5 gap-3 p-4">
          <button
            onClick={() => setActiveSegment('all')}
            className={`rounded-lg border p-3 text-left transition ${
              activeSegment === 'all' ? 'border-teal-500 bg-teal-50' : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <p className="text-xs text-stone-500">All</p>
            <p className="mt-1 text-xl font-semibold text-stone-900">{contacts.length}</p>
          </button>
          {segmentCounts.map((s) => (
            <button
              key={s.value}
              onClick={() => setActiveSegment(s.value)}
              className={`rounded-lg border p-3 text-left transition ${
                activeSegment === s.value ? 'border-teal-500 bg-teal-50' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <p className="text-xs text-stone-500">{s.label}</p>
              <p className="mt-1 text-xl font-semibold text-stone-900">{s.count}</p>
            </button>
          ))}
        </div>

        <table className="w-full text-left text-sm">
          <thead className="text-stone-500">
            <tr>
              <th className="w-10 px-4 py-2">
                <input
                  type="checkbox"
                  checked={visibleContacts.length > 0 && visibleContacts.every((c) => selectedIds.has(c.id))}
                  onChange={toggleAllVisible}
                />
              </th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Goal</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Phone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {visibleContacts.slice(0, 200).map((c) => (
              <tr key={c.id} className="hover:bg-stone-100">
                <td className="px-4 py-2">
                  <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleOne(c.id)} />
                </td>
                <td className="px-4 py-2">
                  <Link href={`/contacts/${c.id}`} className="text-stone-900 hover:text-teal-600">
                    {c.full_name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-stone-500">{goalLabel(c.primary_goal, c.primary_goal_other) ?? '—'}</td>
                <td className="px-4 py-2 text-stone-500">{c.email ?? '—'}</td>
                <td className="px-4 py-2 text-stone-500">{c.phone ?? '—'}</td>
              </tr>
            ))}
            {!visibleContacts.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-stone-500">
                  Nobody in this segment yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-700">Reach out</h2>
        <p className="text-xs text-stone-500">{selectedIds.size} selected</p>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setChannel('whatsapp')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              channel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setChannel('email')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              channel === 'email' ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            Email
          </button>
        </div>

        {channel === 'email' && (
          <div className="mt-3 space-y-2">
            <label className="block text-xs font-medium text-stone-700">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
            />
          </div>
        )}

        <div className="mt-3">
          <label className="block text-xs font-medium text-stone-700">
            Message {channel === 'whatsapp' && <span className="text-stone-400">— use {'{first_name}'} to personalize each one</span>}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
          />
        </div>

        {channel === 'email' ? (
          <div className="mt-4">
            {selectedWithEmail.length > 0 ? (
              <a
                href={mailtoHref}
                className="inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Open email to {selectedWithEmail.length} {selectedWithEmail.length === 1 ? 'person' : 'people'}
              </a>
            ) : (
              <p className="text-sm text-stone-400">Select at least one member with an email address.</p>
            )}
            {selectedContacts.length > selectedWithEmail.length && (
              <p className="mt-1 text-xs text-stone-400">
                {selectedContacts.length - selectedWithEmail.length} selected member(s) have no email on file and
                will be skipped.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {selectedWithPhone.length === 0 && (
              <p className="text-sm text-stone-400">Select at least one member with a phone number.</p>
            )}
            {selectedWithPhone.map((c) => {
              const link = whatsappLink(c.phone, personalize(message, c.full_name.split(' ')[0]));
              if (!link) return null;
              return (
                <a
                  key={c.id}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50"
                >
                  <span className="text-stone-900">{c.full_name}</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Message
                  </span>
                </a>
              );
            })}
            {selectedContacts.length > selectedWithPhone.length && (
              <p className="text-xs text-stone-400">
                {selectedContacts.length - selectedWithPhone.length} selected member(s) have no phone on file and
                will be skipped.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
