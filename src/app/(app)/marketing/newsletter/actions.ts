'use server';

import { createClient } from '@/lib/supabase/server';
import { hasFeature } from '@/lib/permissions';
import { getCurrentRole } from '@/lib/profile';
import { buildNewsletterHtml } from '@/lib/newsletterTemplate';

export type ResendRunStatus = {
  ok: boolean;
  status?: 'running' | 'done' | 'error';
  totalCount?: number;
  syncedCount?: number;
  recipientCount?: number;
  error?: string;
};

// Starts sending the newsletter as a background job and returns right away with a runId —
// syncing 1000+ contacts into Resend (it enforces ~10 requests/second) can take a couple of
// minutes, far longer than this request is allowed to block on, so the actual work continues
// server-side. Call getResendRunStatus(runId) to poll progress.
export async function sendNewsletter(
  subject: string,
  body: string,
  customHtml?: string,
): Promise<{ ok: boolean; runId?: string; totalCount?: number; error?: string }> {
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

  const { data, error } = await supabase.functions.invoke<{
    runId: string;
    totalCount: number;
    error?: string;
  }>('send-newsletter', {
    body: { subject: trimmedSubject, html, plainBody: trimmedBody || '(custom HTML upload)' },
  });

  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };

  return { ok: true, runId: data?.runId, totalCount: data?.totalCount };
}

// Pushes every CRM contact with an email into the Resend audience without sending anything —
// for staff who want to compose/send from Resend's own dashboard instead of the CRM form.
// Also runs as a background job; poll with getResendRunStatus(runId).
export async function syncNewsletterContacts(): Promise<{ ok: boolean; runId?: string; totalCount?: number; error?: string }> {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!(await hasFeature(role, 'newsletter'))) {
    return { ok: false, error: 'Only marketing, admins and the owner can sync contacts.' };
  }

  const { data, error } = await supabase.functions.invoke<{
    runId: string;
    totalCount: number;
    error?: string;
  }>('send-newsletter', { body: {} });

  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };

  return { ok: true, runId: data?.runId, totalCount: data?.totalCount };
}

export async function getResendRunStatus(runId: string): Promise<ResendRunStatus> {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!(await hasFeature(role, 'newsletter'))) {
    return { ok: false, error: 'Not authorized.' };
  }

  const { data, error } = await supabase.functions.invoke<{
    status: 'running' | 'done' | 'error';
    totalCount: number;
    syncedCount: number;
    recipientCount: number | null;
    error?: string;
  }>('send-newsletter', { body: { action: 'status', runId } });

  if (error) return { ok: false, error: error.message };
  if (data?.error && data.status !== 'error') return { ok: false, error: data.error };

  return {
    ok: true,
    status: data?.status,
    totalCount: data?.totalCount,
    syncedCount: data?.syncedCount,
    recipientCount: data?.recipientCount ?? undefined,
    error: data?.status === 'error' ? data?.error : undefined,
  };
}
