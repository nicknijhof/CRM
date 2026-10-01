'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { getResendRunStatus, sendNewsletter } from '@/app/(app)/marketing/newsletter/actions';

type Mode = 'text' | 'html';

export default function NewsletterForm({ contactCount }: { contactCount: number }) {
  const [mode, setMode] = useState<Mode>('text');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [htmlFileName, setHtmlFileName] = useState('');
  const [htmlError, setHtmlError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState<{ synced: number; total: number } | null>(null);
  const [result, setResult] = useState<{ ok: boolean; recipientCount?: number; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const hasContent = mode === 'text' ? !!body.trim() : !!htmlContent.trim();
  const canSubmit = !!subject.trim() && hasContent;

  function resetConfirmState() {
    setConfirming(false);
    setResult(null);
  }

  function handleModeChange(next: Mode) {
    setMode(next);
    resetConfirmState();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setHtmlError(null);
    if (!file.name.toLowerCase().endsWith('.html') && file.type !== 'text/html') {
      setHtmlError('Please choose a .html file.');
      return;
    }
    const text = await file.text();
    if (!text.trim()) {
      setHtmlError('That file looks empty.');
      return;
    }
    setHtmlContent(text);
    setHtmlFileName(file.name);
    resetConfirmState();
  }

  function clearFile() {
    setHtmlContent('');
    setHtmlFileName('');
    setHtmlError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    resetConfirmState();
  }

  function pollStatus(runId: string) {
    pollRef.current = setInterval(async () => {
      const res = await getResendRunStatus(runId);
      if (!res.ok) {
        setResult({ ok: false, error: res.error ?? 'Send failed' });
        setProgress(null);
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      setProgress({ synced: res.syncedCount ?? 0, total: res.totalCount ?? 0 });
      if (res.status === 'done') {
        setResult({ ok: true, recipientCount: res.recipientCount });
        setProgress(null);
        setSubject('');
        setBody('');
        clearFile();
        if (pollRef.current) clearInterval(pollRef.current);
      } else if (res.status === 'error') {
        setResult({ ok: false, error: res.error ?? 'Send failed' });
        setProgress(null);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 1500);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const res = await sendNewsletter(subject, mode === 'text' ? body : '', mode === 'html' ? htmlContent : undefined);
      setConfirming(false);
      if (!res.ok || !res.runId) {
        setResult({ ok: false, error: res.error ?? 'Could not start send' });
        return;
      }
      setResult(null);
      setProgress({ synced: 0, total: res.totalCount ?? contactCount });
      pollStatus(res.runId);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <label className="block text-sm text-stone-700">Subject</label>
        <input
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            resetConfirmState();
          }}
          maxLength={120}
          required
          placeholder="e.g. This month at Sochill"
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-500"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleModeChange('text')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            mode === 'text' ? 'bg-teal-600 text-white' : 'border border-stone-300 text-stone-600 hover:bg-stone-50'
          }`}
        >
          Write a message
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('html')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            mode === 'html' ? 'bg-teal-600 text-white' : 'border border-stone-300 text-stone-600 hover:bg-stone-50'
          }`}
        >
          Upload HTML file
        </button>
      </div>

      {mode === 'text' ? (
        <div>
          <label className="block text-sm text-stone-700">Message</label>
          <p className="mt-0.5 text-xs text-stone-400">Leave a blank line between paragraphs — no HTML needed.</p>
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              resetConfirmState();
            }}
            rows={10}
            placeholder={'Hi there,\n\nHere’s what’s new at Sochill this month...'}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-500"
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm text-stone-700">HTML file</label>
          <p className="mt-0.5 text-xs text-stone-400">
            Sent exactly as-is — no wrapping template applied. Use a fully designed email export (e.g. from a design
            tool or built with Claude).
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,text/html"
            onChange={handleFileChange}
            className="mt-2 block w-full text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
          />
          {htmlError && <p className="mt-1 text-sm text-rose-600">{htmlError}</p>}
          {htmlFileName && !htmlError && (
            <div className="mt-2 flex items-center gap-2 text-sm text-stone-600">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Loaded
              </span>
              {htmlFileName}
              <button type="button" onClick={clearFile} className="text-xs text-stone-400 underline hover:text-stone-600">
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {confirming ? (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <p>
            This sends to every contact with an email address — <span className="font-semibold">{contactCount}</span>{' '}
            right now. Can&apos;t be undone once sent.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={isPending || !!progress}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {isPending ? 'Starting…' : `Yes, send to ${contactCount}`}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!canSubmit || !!progress}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {progress ? 'Sending…' : 'Send to all contacts'}
        </button>
      )}

      {progress && (
        <p className="text-sm text-stone-500">
          Syncing contacts to Resend — {progress.synced} of {progress.total}… this can take a couple of minutes for a
          large list, feel free to leave this page.
        </p>
      )}
      {result && !result.ok && <p className="text-sm text-rose-600">{result.error}</p>}
      {result?.ok && (
        <p className="text-sm text-emerald-700">Sent to {result.recipientCount} contact{result.recipientCount === 1 ? '' : 's'}.</p>
      )}
    </form>
  );
}
