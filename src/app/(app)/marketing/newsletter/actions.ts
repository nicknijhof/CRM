'use server';

import { createClient } from '@/lib/supabase/server';
import { hasFeature } from '@/lib/permissions';
import { getCurrentRole } from '@/lib/profile';
import { buildNewsletterHtml } from '@/lib/newsletterTemplate';

export type ResendRunStatus = {
  ok: boolean;
  runId?: string;
  status?: 'running' | 'done' | 'error';
  totalCount?: number;
  syncedCount?: number;
  recipientCount?: number;
  error?: string;
};

async function invokeNewsletterFn(body: Record<string, unknown>): Promise<ResendRunStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<{
    runId?: string;
    status?: 'running' | 'done' | 'error';
    totalCount?: number;
    syncedCount?: number;
    recipientCount?: number | null;
    error?: string;
  }>('send-newsletter', { body });

  if (error) return { ok: false, error: error.message };
  if (data?.error && !data.status) return { ok: false, error: data.error };

  return {
    ok: true,
    runId: data?.runId,
    status: data?.status,
    totalCount: data?.totalCount,
    syncedCount: data?.syncedCount,
    recipientCount: data?.recipientCount ?? undefined,
    error: data?.status === 'error' ? data?.error : undefined,
  };
}

// Starts sending the newsletter and returns a runId right away — syncing 1000+ contacts into
// Resend (it enforces ~10 requests/second) takes a couple of minutes, so the actual work happens
// in small steps driven by repeated advanceResendRun() calls rather than one blocking request.
export async function sendNewsletter(
  subject: string,
  body: string,
  customHtml?: string,
): Promise<ResendRunStatus> {
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

  return invokeNewsletterFn({ subject: trimmedSubject, html, plainBody: trimmedBody || '(custom HTML upload)' });
}

// Pushes every CRM contact with an email into the Resend audience without sending anything —
// for staff who want to compose/send from Resend's own dashboard instead of the CRM form.
export async function syncNewsletterContacts(): Promise<ResendRunStatus> {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!(await hasFeature(role, 'newsletter'))) {
    return { ok: false, error: 'Only marketing, admins and the owner can sync contacts.' };
  }

  return invokeNewsletterFn({});
}

// Advances a run by one small batch (~40 contacts, a few seconds) and reports progress — call
// this in a loop (awaiting each response before firing the next) until status is 'done'/'error'.
export async function advanceResendRun(runId: string): Promise<ResendRunStatus> {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!(await hasFeature(role, 'newsletter'))) {
    return { ok: false, error: 'Not authorized.' };
  }

  return invokeNewsletterFn({ action: 'advance', runId });
}
