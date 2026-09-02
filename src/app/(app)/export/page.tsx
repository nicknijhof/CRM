import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canManageDataExports, getCurrentProfile } from '@/lib/profile';
import type { DataExportRequest, DataExportStatus, Profile } from '@/lib/types';
import { cancelDataExportRequest, requestDataExport, respondToDataExportRequest } from './actions';
import ExportRequestActions from '@/components/ExportRequestActions';

const STATUS_LABEL: Record<DataExportStatus, string> = {
  pending: 'Awaiting approval',
  approved: 'Approved — ready to download',
  denied: 'Denied',
  completed: 'Downloaded',
};

const STATUS_CLASSES: Record<DataExportStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  denied: 'bg-rose-100 text-rose-700',
  completed: 'bg-stone-200 text-stone-600',
};

export default async function ExportPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile || !canManageDataExports(profile.role)) redirect('/');

  const { data: requests } = await supabase
    .from('data_export_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<DataExportRequest[]>();

  const involvedIds = [
    ...new Set((requests ?? []).flatMap((r) => [r.requested_by, r.decided_by].filter((id): id is string => !!id))),
  ];
  const { data: profiles } = involvedIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', involvedIds).returns<Pick<Profile, 'id' | 'full_name'>[]>()
    : { data: [] as Pick<Profile, 'id' | 'full_name'>[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? 'Unnamed staff']));

  const myPending = (requests ?? []).find((r) => r.requested_by === profile.id && r.status === 'pending');

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-stone-900">Data Export</h1>
      <p className="mt-1 text-sm text-stone-500">
        Export all member/business data as a bundle of CSV files. Because this pulls everything at once, a{' '}
        <strong>different</strong> admin or the owner has to approve your request before you can download it —
        you can&apos;t approve your own.
      </p>

      <section className="mt-6 rounded-xl border border-stone-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Request an export</h2>
        {myPending ? (
          <p className="mt-2 text-sm text-stone-600">
            You already have a request awaiting another admin&apos;s approval.
          </p>
        ) : (
          <form action={requestDataExport} className="mt-3 flex flex-col gap-3">
            <div>
              <label className="block text-sm text-stone-700">Reason (optional, shown to the approver)</label>
              <input
                name="reason"
                placeholder="e.g. Monthly accounting reconciliation"
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
              />
            </div>
            <button className="w-fit rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Request export
            </button>
          </form>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">All requests</h2>
        {(!requests || requests.length === 0) && <p className="mt-2 text-sm text-stone-500">No export requests yet.</p>}
        <div className="mt-3 flex flex-col gap-3">
          {(requests ?? []).map((r) => {
            const isMine = r.requested_by === profile.id;
            const canDecide = r.status === 'pending' && !isMine;
            const canDownload = r.status === 'approved' && isMine;
            const canCancel = r.status === 'pending' && isMine;
            return (
              <div key={r.id} className="rounded-xl border border-stone-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-stone-900">
                    {isMine ? 'You' : nameById.get(r.requested_by) ?? 'Unknown'} requested this export
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500">{new Date(r.created_at).toLocaleString('en-SG')}</p>
                {r.reason && <p className="mt-2 text-sm text-stone-600">&ldquo;{r.reason}&rdquo;</p>}
                {r.decided_by && (
                  <p className="mt-2 text-xs text-stone-500">
                    {r.status === 'denied' ? 'Denied' : 'Approved'} by{' '}
                    {r.decided_by === profile.id ? 'you' : nameById.get(r.decided_by) ?? 'Unknown'}
                    {r.decided_at && ` · ${new Date(r.decided_at).toLocaleString('en-SG')}`}
                  </p>
                )}
                {r.denial_reason && <p className="mt-1 text-xs text-rose-600">Reason: {r.denial_reason}</p>}

                <ExportRequestActions
                  requestId={r.id}
                  canDecide={canDecide}
                  canDownload={canDownload}
                  canCancel={canCancel}
                  respondAction={respondToDataExportRequest}
                  cancelAction={cancelDataExportRequest}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
