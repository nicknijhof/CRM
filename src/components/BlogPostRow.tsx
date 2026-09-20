'use client';

import { useState } from 'react';
import { deleteBlogPost, updateBlogPost } from '@/app/(app)/marketing/blog/actions';
import type { BlogPost } from '@/lib/types';
import { coverSrc } from '@/lib/blogCover';

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time, no timezone suffix.
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusOf(post: BlogPost): { label: string; className: string } {
  if (!post.publish_at) return { label: 'Draft', className: 'bg-stone-200 text-stone-600' };
  return new Date(post.publish_at) > new Date()
    ? { label: 'Scheduled', className: 'bg-amber-100 text-amber-700' }
    : { label: 'Published', className: 'bg-emerald-100 text-emerald-700' };
}

export default function BlogPostRow({ post }: { post: BlogPost }) {
  const [editing, setEditing] = useState(false);
  const status = statusOf(post);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await updateBlogPost(post.id, formData);
          setEditing(false);
        }}
        className="grid grid-cols-2 gap-3 rounded-lg border border-teal-300 bg-teal-50/40 p-4 text-sm"
      >
        <div>
          <label className="block text-xs text-stone-500">Title</label>
          <input
            name="title"
            required
            defaultValue={post.title}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500">Slug</label>
          <input
            name="slug"
            defaultValue={post.slug}
            placeholder="auto from title if left blank"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-stone-500">Excerpt</label>
          <input
            name="excerpt"
            defaultValue={post.excerpt}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-stone-500">Body — separate paragraphs with a blank line</label>
          <textarea
            name="body"
            rows={8}
            defaultValue={post.body.join('\n\n')}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-stone-500">Cover photo — choose a file to replace it</label>
          <div className="mt-1 flex items-center gap-3">
            {post.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverSrc(post.cover_image_url) ?? ''} alt="" className="h-14 w-20 rounded object-cover" />
            )}
            <input
              name="cover"
              type="file"
              accept="image/*"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 file:mr-3 file:rounded file:border-0 file:bg-stone-100 file:px-3 file:py-1 file:text-stone-700"
            />
          </div>
          {post.cover_image_url && (
            <label className="mt-1 flex items-center gap-2 text-xs text-stone-500">
              <input type="checkbox" name="remove_cover" /> Remove the current cover photo
            </label>
          )}
        </div>
        <div>
          <label className="block text-xs text-stone-500">Read time</label>
          <input
            name="read_time"
            defaultValue={post.read_time}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500">Tone</label>
          <select
            name="tone"
            defaultValue={post.tone}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          >
            <option value="coral">Coral</option>
            <option value="teal">Teal</option>
            <option value="navy">Navy</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-stone-500">Publish date &amp; time — leave blank to keep as a draft</label>
          <input
            name="publish_at"
            type="datetime-local"
            defaultValue={toDatetimeLocal(post.publish_at)}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
          />
        </div>
        <div className="col-span-2 flex gap-3">
          <button className="rounded-lg bg-teal-600 px-4 py-1.5 font-medium text-white hover:bg-teal-700">Save</button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-stone-300 px-4 py-1.5 text-stone-700 hover:bg-stone-100"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-lg border border-stone-200 px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          {post.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverSrc(post.cover_image_url) ?? ''} alt="" className="h-16 w-24 shrink-0 rounded object-cover" />
          )}
          <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-stone-900">{post.title}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
          </div>
          <p className="mt-0.5 text-xs text-stone-400">/blog/{post.slug}</p>
          <p className="mt-1 text-stone-500">{post.excerpt}</p>
          {post.publish_at && (
            <p className="mt-1 text-xs text-stone-400">
              {status.label === 'Scheduled' ? 'Goes live' : 'Published'}{' '}
              {new Date(post.publish_at).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button onClick={() => setEditing(true)} className="text-xs text-teal-600 underline hover:text-teal-700">
            Edit
          </button>
          <form action={deleteBlogPost.bind(null, post.id)}>
            <button className="text-xs text-rose-600 underline hover:text-rose-700">Delete</button>
          </form>
        </div>
      </div>
    </div>
  );
}
