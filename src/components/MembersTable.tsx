'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { CONTACT_SOURCES, PIPELINE_STAGES, PURCHASE_STATUS_BADGE_CLASSES, STAGE_BADGE_CLASSES } from '@/lib/constants';
import { effectivePurchaseStatus } from '@/lib/purchases';
import type { Contact, ContactSource, PipelineStage, Purchase } from '@/lib/types';

export interface MemberRow {
  contact: Contact;
  planName: string | null;
  purchases: Purchase[];
}

export default function MembersTable({ rows }: { rows: MemberRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-stone-100 text-stone-500">
        <tr>
          <th className="px-4 py-3 font-medium">Name</th>
          <th className="px-4 py-3 font-medium">Contact</th>
          <th className="px-4 py-3 font-medium">Source</th>
          <th className="px-4 py-3 font-medium">Stage</th>
          <th className="px-4 py-3 font-medium">Plan</th>
          <th className="px-4 py-3 font-medium">Tags</th>
          <th className="px-4 py-3 font-medium">Purchases</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-200">
        {rows.map(({ contact: c, planName, purchases }) => {
          const isExpanded = expandedId === c.id;
          return (
            <Fragment key={c.id}>
              <tr className="bg-white hover:bg-stone-50">
                <td className="px-4 py-3">
                  <Link href={`/contacts/${c.id}`} className="font-medium text-stone-900 hover:text-teal-600">
                    {c.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-500">
                  <div>{c.email}</div>
                  <div>{c.phone}</div>
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {CONTACT_SOURCES.find((s) => s.value === (c.source as ContactSource))?.label}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${STAGE_BADGE_CLASSES[c.pipeline_stage as PipelineStage]}`}
                  >
                    {PIPELINE_STAGES.find((s) => s.value === c.pipeline_stage)?.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-600">{planName ?? '—'}</td>
                <td className="px-4 py-3 text-stone-500">{c.tags?.join(', ')}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    className="text-xs font-medium text-teal-600 underline hover:text-teal-700"
                  >
                    {purchases.length} purchase{purchases.length === 1 ? '' : 's'} {isExpanded ? '▲' : '▼'}
                  </button>
                </td>
              </tr>
              {isExpanded && (
                <tr className="bg-stone-50">
                  <td colSpan={7} className="px-4 py-3">
                    {purchases.length ? (
                      <div className="space-y-2">
                        {[...purchases]
                          .sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1))
                          .map((p) => {
                            const status = effectivePurchaseStatus(p);
                            return (
                              <div
                                key={p.id}
                                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2"
                              >
                                <div>
                                  <p className="font-medium text-stone-900">{p.name}</p>
                                  <p className="text-xs text-stone-500">
                                    Purchased {p.purchase_date}
                                    {p.price !== null && ` · $${p.price}`}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-medium ${PURCHASE_STATUS_BADGE_CLASSES[status]}`}
                                >
                                  {status.replace('_', ' ')}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="text-sm text-stone-400">No purchases yet.</p>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
              No members yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
