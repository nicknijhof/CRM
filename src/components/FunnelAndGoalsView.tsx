'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail, MessageCircle, TrendingDown, Trophy, Users, X } from 'lucide-react';
import { FUNNEL_STAGES, FUNNEL_STAGE_CLASSES, TOP_TIER, type FunnelStage } from '@/lib/funnel';
import { PRIMARY_GOALS, goalLabel } from '@/lib/goals';
import { whatsappLink } from '@/lib/whatsapp';
import type { Contact } from '@/lib/types';
import type { FunnelContactRow } from '@/app/(app)/funnel/page';

type GoalFilter = NonNullable<Contact['primary_goal']> | 'none' | 'all';
type StageFilter = FunnelStage | 'all';

const GOAL_SEGMENTS: { value: GoalFilter; label: string }[] = [...PRIMARY_GOALS, { value: 'none', label: 'No goal set yet' }];

const DEFAULT_MESSAGE = "Hi {first_name}, it's the team at Sochill Bath Club! We'd love to see you again soon 🧊";

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function FunnelAndGoalsView({
  rows,
  funnelCounts,
  tierCounts,
  membershipCount,
  upgradedCount,
}: {
  rows: FunnelContactRow[];
  funnelCounts: { value: FunnelStage; label: string; count: number }[];
  tierCounts: { tier: string; label: string; count: number; isTop: boolean }[];
  membershipCount: number;
  upgradedCount: number;
}) {
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [subject, setSubject] = useState('A note from Sochill Bath Club');

  const total = rows.length;

  // Cumulative "reached at least this stage" — the real funnel metric, since
  // each row only sits in the ONE stage it's deepest in. Stage-to-stage %
  // here means "of everyone who reached stage N, how many went on to N+1".
  const cumulative = useMemo(() => {
    const result: number[] = [];
    for (let i = 0; i < funnelCounts.length; i++) {
      result.push(funnelCounts.slice(i).reduce((sum, s) => sum + s.count, 0));
    }
    return result;
  }, [funnelCounts]);

  const conversions = useMemo(
    () =>
      cumulative.slice(1).map((count, i) => ({
        pct: cumulative[i] ? Math.round((count / cumulative[i]) * 100) : 0,
      })),
    [cumulative],
  );
  const worstConversionIndex =
    conversions.length > 0
      ? conversions.reduce((worstIdx, c, i) => (c.pct < conversions[worstIdx].pct ? i : worstIdx), 0)
      : -1;

  const goalCounts = useMemo(
    () =>
      GOAL_SEGMENTS.map((s) => ({
        ...s,
        count: rows.filter((r) => (s.value === 'none' ? !r.primaryGoal : r.primaryGoal === s.value)).length,
      })),
    [rows],
  );

  const upgradeTargets = useMemo(() => rows.filter((r) => r.activeLowerTierMembership), [rows]);

  const filteredRows = useMemo(
    () =>
      rows.filter((r) => {
        if (stageFilter !== 'all' && r.funnelStage !== stageFilter) return false;
        if (goalFilter !== 'all') {
          if (goalFilter === 'none' ? r.primaryGoal : r.primaryGoal !== goalFilter) return false;
        }
        return true;
      }),
    [rows, stageFilter, goalFilter],
  );

  const selectedRows = rows.filter((r) => selectedIds.has(r.id));
  const selectedWithEmail = selectedRows.filter((r) => r.email);
  const selectedWithPhone = selectedRows.filter((r) => r.phone);

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    const ids = filteredRows.map((r) => r.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function personalize(template: string, firstName: string) {
    return template.replaceAll('{first_name}', firstName || 'there');
  }

  const mailtoHref = `mailto:?bcc=${encodeURIComponent(selectedWithEmail.map((r) => r.email).join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message.replaceAll('{first_name}', 'there'))}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Funnel &amp; Member Goals</h1>
        <p className="mt-1 text-sm text-stone-500">
          How far each contact has gone into the product ladder, why they say they&apos;re here, and a place to
          reach out to exactly who you mean.
        </p>
      </div>

      {/* Funnel overview */}
      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-stone-700">Conversion funnel</h2>
        </div>
        <p className="text-xs text-stone-500">
          New Guest → Single Session → Session Pack → Membership, all-time (a lapsed membership still counts as
          having reached it). Click a stage to filter the list below.
        </p>

        <div className="mt-4 flex flex-wrap items-stretch gap-1 overflow-x-auto pb-2">
          {funnelCounts.map((s, i) => (
            <div key={s.value} className="flex items-center gap-1">
              <button
                onClick={() => setStageFilter((prev) => (prev === s.value ? 'all' : s.value))}
                className={cn(
                  'min-w-[132px] rounded-lg border p-3 text-left transition',
                  stageFilter === s.value ? 'border-teal-500 bg-teal-50' : 'border-stone-200 hover:border-stone-300',
                )}
              >
                <p className="text-xs text-stone-500">{s.label}</p>
                <p className="mt-1 text-xl font-semibold text-stone-900">{s.count}</p>
                <p className="text-[11px] text-stone-400">{total ? Math.round((s.count / total) * 100) : 0}% of all</p>
              </button>
              {i < conversions.length && (
                <div className="flex shrink-0 flex-col items-center px-1 text-center">
                  <ArrowRight
                    className={cn('h-4 w-4', i === worstConversionIndex ? 'text-rose-500' : 'text-stone-300')}
                    strokeWidth={1.75}
                  />
                  <span
                    className={cn(
                      'mt-0.5 text-[11px] font-medium',
                      i === worstConversionIndex ? 'text-rose-600' : 'text-stone-400',
                    )}
                  >
                    {conversions[i].pct}%
                  </span>
                  {i === worstConversionIndex && <span className="text-[10px] text-rose-500">biggest drop</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Membership tier + upgrade opportunities */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-stone-700">Membership tier reached</h2>
          </div>
          <p className="text-xs text-stone-500">Of {membershipCount} members</p>
          <div className="mt-4 space-y-3">
            {tierCounts.map(({ tier, label, count, isTop }) => {
              const pct = membershipCount ? Math.round((count / membershipCount) * 100) : 0;
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-700">{label}</span>
                    <span className="text-stone-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-stone-100">
                    <div
                      className={cn('h-2 rounded-full', isTop ? 'bg-teal-600' : 'bg-stone-400')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-stone-500">
            <span className="font-semibold text-stone-700">{upgradedCount}</span> have upgraded from a lower tier to{' '}
            {TOP_TIER === 'anytime' ? 'Unlimited Anytime' : TOP_TIER} (all-time)
          </p>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-stone-700">Upgrade opportunities</h2>
          <p className="text-xs text-stone-500">
            Currently active on Off-Peak or Weekdays — click a stage above (Membership) to see them in the table too
          </p>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {upgradeTargets.map((r) => {
              const link = whatsappLink(
                r.phone,
                `Hi ${r.fullName.split(' ')[0]}, thinking of upgrading to our Unlimited Anytime membership? You'd get full access any time, no restrictions — happy to walk you through it 🧊`,
              );
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm"
                >
                  <div>
                    <Link href={`/contacts/${r.id}`} className="font-medium text-teal-600 hover:underline">
                      {r.fullName}
                    </Link>
                    <span className="ml-2 text-stone-500">{r.activeLowerTierMembership}</span>
                  </div>
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
                    >
                      Message
                    </a>
                  )}
                </div>
              );
            })}
            {!upgradeTargets.length && <p className="text-sm text-stone-400">No one on a lower tier right now.</p>}
          </div>
        </section>
      </div>

      {/* Goal segments */}
      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-stone-700">Filter by reason for joining</h2>
        </div>
        <p className="text-xs text-stone-500">Click a card to filter the list below — combine with a funnel stage too</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {goalCounts.map((s) => (
            <button
              key={s.value}
              onClick={() => setGoalFilter((prev) => (prev === s.value ? 'all' : s.value))}
              className={cn(
                'rounded-lg border p-3 text-left transition',
                goalFilter === s.value ? 'border-teal-500 bg-teal-50' : 'border-stone-200 hover:border-stone-300',
              )}
            >
              <p className="text-xs text-stone-500">{s.label}</p>
              <p className="mt-1 text-xl font-semibold text-stone-900">{s.count}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Filtered table + active filters */}
      <section className="rounded-xl border border-stone-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-700">
              {filteredRows.length} of {total} members
            </h2>
            {(stageFilter !== 'all' || goalFilter !== 'all') && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {stageFilter !== 'all' && (
                  <button
                    onClick={() => setStageFilter('all')}
                    className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-200"
                  >
                    {FUNNEL_STAGES.find((s) => s.value === stageFilter)?.label}
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                )}
                {goalFilter !== 'all' && (
                  <button
                    onClick={() => setGoalFilter('all')}
                    className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-200"
                  >
                    {GOAL_SEGMENTS.find((s) => s.value === goalFilter)?.label}
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                )}
              </div>
            )}
          </div>
          {selectedIds.size > 0 && (
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-stone-500 hover:text-stone-700">
              Clear {selectedIds.size} selected
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                <th className="w-10 px-4 py-2">
                  <input
                    type="checkbox"
                    checked={filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.id))}
                    onChange={toggleAllFiltered}
                  />
                </th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Stage</th>
                <th className="px-4 py-2 font-medium">Goal</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredRows.slice(0, 200).map((r) => (
                <tr key={r.id} className="hover:bg-stone-100">
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleOne(r.id)} />
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/contacts/${r.id}`} className="text-stone-900 hover:text-teal-600">
                      {r.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={cn(
                        'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                        FUNNEL_STAGE_CLASSES[r.funnelStage],
                      )}
                    >
                      {FUNNEL_STAGES.find((s) => s.value === r.funnelStage)?.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-stone-500">{goalLabel(r.primaryGoal, r.primaryGoalOther) ?? '—'}</td>
                  <td className="px-4 py-2 text-stone-500">{r.email ?? '—'}</td>
                  <td className="px-4 py-2 text-stone-500">{r.phone ?? '—'}</td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-stone-500">
                    Nobody matches this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reach out */}
      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-700">Reach out</h2>
        <p className="text-xs text-stone-500">{selectedIds.size} selected</p>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setChannel('whatsapp')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
              channel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600',
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
            WhatsApp
          </button>
          <button
            onClick={() => setChannel('email')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
              channel === 'email' ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-600',
            )}
          >
            <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
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
            Message
            {channel === 'whatsapp' && <span className="text-stone-400"> — use {'{first_name}'} to personalize each one</span>}
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                <Mail className="h-4 w-4" strokeWidth={1.75} />
                Open email to {selectedWithEmail.length} {selectedWithEmail.length === 1 ? 'person' : 'people'}
              </a>
            ) : (
              <p className="text-sm text-stone-400">Select at least one member with an email address.</p>
            )}
            {selectedRows.length > selectedWithEmail.length && (
              <p className="mt-1 text-xs text-stone-400">
                {selectedRows.length - selectedWithEmail.length} selected member(s) have no email on file and will
                be skipped.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {selectedWithPhone.length === 0 && (
              <p className="text-sm text-stone-400">Select at least one member with a phone number.</p>
            )}
            {selectedWithPhone.map((r) => {
              const link = whatsappLink(r.phone, personalize(message, r.fullName.split(' ')[0]));
              if (!link) return null;
              return (
                <a
                  key={r.id}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50"
                >
                  <span className="text-stone-900">{r.fullName}</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Message
                  </span>
                </a>
              );
            })}
            {selectedRows.length > selectedWithPhone.length && (
              <p className="text-xs text-stone-400">
                {selectedRows.length - selectedWithPhone.length} selected member(s) have no phone on file and will
                be skipped.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
