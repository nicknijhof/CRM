'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { canManageDataExports, getCurrentProfile } from '@/lib/profile';

export async function requestDataExport(formData: FormData) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile || !canManageDataExports(profile.role)) throw new Error('Not allowed');

  const { data: existingPending } = await supabase
    .from('data_export_requests')
    .select('id')
    .eq('requested_by', profile.id)
    .eq('status', 'pending')
    .maybeSingle();
  if (existingPending) throw new Error('You already have a pending export request awaiting approval.');

  const reason = String(formData.get('reason') ?? '').trim() || null;
  const { error } = await supabase.from('data_export_requests').insert({ requested_by: profile.id, reason });
  if (error) throw new Error(error.message);

  revalidatePath('/export');
}

export async function cancelDataExportRequest(requestId: string) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile || !canManageDataExports(profile.role)) throw new Error('Not allowed');

  const { data: request } = await supabase
    .from('data_export_requests')
    .select('requested_by, status')
    .eq('id', requestId)
    .single();
  if (!request || request.requested_by !== profile.id) throw new Error('Not allowed');
  if (request.status !== 'pending') throw new Error('Only a pending request can be cancelled');

  const { error } = await supabase.from('data_export_requests').delete().eq('id', requestId);
  if (error) throw new Error(error.message);

  revalidatePath('/export');
}

// The second admin/owner's approval — this is the actual security boundary of the
// whole feature, so the self-approval and already-decided checks happen here on
// the server, not just in the UI (which merely hides the buttons as a courtesy).
export async function respondToDataExportRequest(requestId: string, approve: boolean, formData: FormData) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile || !canManageDataExports(profile.role)) throw new Error('Not allowed');

  const { data: request, error: fetchError } = await supabase
    .from('data_export_requests')
    .select('requested_by, status')
    .eq('id', requestId)
    .single();
  if (fetchError || !request) throw new Error('Export request not found');
  if (request.status !== 'pending') throw new Error('This request has already been decided');
  if (request.requested_by === profile.id) {
    throw new Error("You can't approve your own export request — ask another admin or the owner.");
  }

  const denialReason = String(formData.get('denial_reason') ?? '').trim() || null;
  const { error } = await supabase
    .from('data_export_requests')
    .update({
      status: approve ? 'approved' : 'denied',
      decided_by: profile.id,
      decided_at: new Date().toISOString(),
      denial_reason: approve ? null : denialReason,
    })
    .eq('id', requestId);
  if (error) throw new Error(error.message);

  revalidatePath('/export');
}
