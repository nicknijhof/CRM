'use server';

import { createClient } from '@/lib/supabase/server';
import { hasFeature } from '@/lib/permissions';
import { getCurrentRole } from '@/lib/profile';
import { buildNewsletterHtml } from '@/lib/newsletterTemplate';

export async function sendNewsletter(
  subject: string,
  body: string,
  customHtml?: string,
): Promise<{ ok: boolean; recipientCount?: number; error?: string }> {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!(await hasFeature(role, 'newsletter'))) {
    return { ok: false, error: 'Only marketing, admins and the owner can send the newsletter.' };
  }

  const trimmedSubject = subject.trim();
  const trimmedCustomHtml = customHtml?.trim();
  const trimmedBody = body.trim();

  if (!trimmedSubject) {
    return { ok: false, error: 'Enter a subject.' };
  }
  if (!trimmedCustomHtml && !trimmedBody) {
    return { ok: false, error: 'Enter a message, or upload an HTML file.' };
  }

  // A staff-uploaded HTML file is sent exactly as-is — it's already a complete, designed
  // email (e.g. built and previewed with Claude) — rather than wrapped in the generic
  // plain-text template used for a quick written update.
  const html = trimmedCustomHtml || buildNewsletterHtml(trimmedBody);

  // The Edge Function forwards this request's own staff session as its Authorization
  // header automatically, so it can independently re-check the caller's role —
  // this action's own check above is the first gate, not the only one.
  const { data, error } = await supabase.functions.invoke<{
    sent: boolean;
    recipientCount: number;
    error?: string;
  }>('send-newsletter', {
    body: { subject: trimmedSubject, html, plainBody: trimmedBody || '(custom HTML upload)' },
  });

  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };

  return { ok: true, recipientCount: data?.recipientCount ?? 0 };
}

// Pushes every CRM contact with an email into the Resend audience without sending anything —
// for staff who want to compose/send from Resend's own dashboard instead of the CRM, so that
// audience isn't stale (it otherwise only gets synced as a side effect of sendNewsletter above).
export async function syncNewsletterContacts(): Promise<{ ok: boolean; contactCount?: number; error?: string }> {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!(await hasFeature(role, 'newsletter'))) {
    return { ok: false, error: 'Only marketing, admins and the owner can sync contacts.' };
  }

  const { data, error } = await supabase.functions.invoke<{
    synced: boolean;
    contactCount: number;
    error?: string;
  }>('send-newsletter', { body: { syncOnly: true } });

  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };

  return { ok: true, contactCount: data?.contactCount ?? 0 };
}
