'use server';

import { createClient } from '@/lib/supabase/server';
import { canSendBroadcasts, getCurrentRole } from '@/lib/profile';

export async function sendBroadcast(
  title: string,
  body: string,
): Promise<{ ok: boolean; sent?: number; total?: number; error?: string }> {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!canSendBroadcasts(role)) {
    return { ok: false, error: 'Only admins and the owner can send a broadcast.' };
  }

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  if (!trimmedTitle || !trimmedBody) {
    return { ok: false, error: 'Enter a title and a message.' };
  }

  // The Edge Function forwards this request's own staff session as its Authorization
  // header automatically, so it can independently re-check the caller is admin/owner —
  // this action's own check above is the first gate, not the only one.
  const { data, error } = await supabase.functions.invoke<{ sent: number; total: number; error?: string }>(
    'send-push',
    { body: { broadcast: true, title: trimmedTitle, body: trimmedBody } },
  );

  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };

  return { ok: true, sent: data?.sent ?? 0, total: data?.total ?? 0 };
}
