'use client';

import { useRef, useState, useTransition } from 'react';
import { createBlogPost } from '@/app/(app)/marketing/blog/actions';
import { shrinkImage } from '@/lib/shrinkImage';

const inputCls = 'mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900';

// The "New post" form. The cover photo is shrunk in the browser before it is sent (Vercel rejects
// requests over 4.5 MB before our code runs), and any problem shows as a message instead of a crash.
export default function BlogCreateForm({ suggestedPublishAt }: { suggestedPublishAt: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const cover = data.get('cover');
        if (cover instanceof File && cover.size > 0) data.set('cover', await shrinkImage(cover, 1800));
        const result = await createBlogPost(data);
        if (result.ok) {
          setSaved(true);
          form.reset();
        } else {
          setError(result.error);
        }
      } catch (err) {
        const message = err instanceof Error && /photo/i.test(err.message) ? err.message : null;
        setError(message ?? 'We could not save the post. Check your connection and try again. If you added a photo, try a smaller one.');
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-3 grid grid-cols-2 gap-3 text-sm">
      {saved && <div className="col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">Post saved.</div>}
      {error && (
        <div role="alert" className="col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-rose-700">
          {error}
        </div>
      )}
      <div>
        <label className="block text-xs text-stone-500">Title</label>
        <input name="title" required placeholder="e.g. 5 Ways Cold Plunging Improves Sleep" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs text-stone-500">Slug (optional — auto from title)</label>
        <input name="slug" placeholder="cold-plunging-sleep" className={inputCls} />
      </div>
      <div className="col-span-2">
        <label className="block text-xs text-stone-500">Excerpt</label>
        <input name="excerpt" required placeholder="One or two sentences shown on the blog list page" className={inputCls} />
      </div>
      <div className="col-span-2">
        <label className="block text-xs text-stone-500">Body — separate paragraphs with a blank line</label>
        <textarea name="body" rows={8} required className={inputCls} />
      </div>
      <div className="col-span-2">
        <label className="block text-xs text-stone-500">Cover photo (optional)</label>
        <input
          name="cover"
          type="file"
          accept="image/*"
          className={`${inputCls} text-sm file:mr-3 file:rounded file:border-0 file:bg-stone-100 file:px-3 file:py-1 file:text-stone-700`}
        />
        <p className="mt-1 text-xs text-stone-400">
          Shown on the blog list and at the top of the post. A wide photo of the space works best. Large photos are shrunk
          automatically.
        </p>
      </div>
      <div>
        <label className="block text-xs text-stone-500">Read time</label>
        <input name="read_time" defaultValue="3 min read" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs text-stone-500">Tone</label>
        <select name="tone" defaultValue="coral" className={inputCls}>
          <option value="coral">Coral</option>
          <option value="teal">Teal</option>
          <option value="navy">Navy</option>
        </select>
      </div>
      <div className="col-span-2">
        <label className="block text-xs text-stone-500">Publish date &amp; time — leave blank to save as a draft</label>
        <input name="publish_at" type="datetime-local" defaultValue={suggestedPublishAt} className={inputCls} />
        <p className="mt-1 text-xs text-stone-400">
          Suggested slot — 2 weeks after your last scheduled post. Change it, or clear it to save as a draft.
        </p>
      </div>
      <div className="col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save post'}
        </button>
      </div>
    </form>
  );
}
