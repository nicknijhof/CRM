'use server';

import { createClient } from '@/lib/supabase/server';
import { canSendNewsletter, getCurrentRole } from '@/lib/profile';
import { buildNewsletterHtml } from '@/lib/newsletterTemplate';

export async function sendNewsletter(
  subject: string,
  body: string,
): Promise<{ ok: boolean; recipientCount?: number; error?: string }> {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!canSendNewsletter(role)) {
    return { ok: false, error: 'Only marketing, admins and the owner can send the newsletter.' };
  }

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject || !trimmedBody) {
    return { ok: false, error: 'Enter a subject and a message.' };
  }

  const html = buildNewsletterHtml(trimmedBody);

  // The Edge Function forwards this request's own staff session as its Authorization
  // header automatically, so it can independently re-check the caller's role —
  // this action's own check above is the first gate, not the only one.
  const { data, error } = await supabase.functions.invoke<{
    sent: boolean;
    recipientCount: number;
    error?: string;
  }>('send-newsletter', { body: { subject: trimmedSubject, html, plainBody: trimmedBody } });

  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };

  return { ok: true, recipientCount: data?.recipientCount ?? 0 };
}
