import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canManageBlog, getCurrentProfile } from '@/lib/profile';
import type { BlogPost } from '@/lib/types';
import { createBlogPost } from './actions';
import BlogPostRow from '@/components/BlogPostRow';

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function BlogAdminPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile || !canManageBlog(profile.role)) redirect('/');

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .order('publish_at', { ascending: false, nullsFirst: true })
    .returns<BlogPost[]>();

  const allPosts = posts ?? [];

  // Scheduling 10 posts at once every 2 weeks is just "create a post, pick a
  // date" repeated — this suggests the next slot (2 weeks after whichever
  // scheduled/published post is furthest out) so that rhythm takes no
  // mental math to keep up.
  const latestScheduled = allPosts
    .map((p) => p.publish_at)
    .filter((d): d is string => !!d)
    .sort()
    .pop();
  const suggestedNext = new Date(latestScheduled ? new Date(latestScheduled) : new Date());
  suggestedNext.setDate(suggestedNext.getDate() + 14);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Blog</h1>
        <p className="mt-1 text-sm text-stone-500">
          Write posts here and schedule them — they go live on the website automatically once their publish date
          passes, no further action needed.
        </p>
      </div>

      <section className="rounded-xl border border-stone-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">New post</h2>
        <form action={createBlogPost} className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <label className="block text-xs text-stone-500">Title</label>
            <input
              name="title"
              required
              placeholder="e.g. 5 Ways Cold Plunging Improves Sleep"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500">Slug (optional — auto from title)</label>
            <input
              name="slug"
              placeholder="cold-plunging-sleep"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-stone-500">Excerpt</label>
            <input
              name="excerpt"
              required
              placeholder="One or two sentences shown on the blog list page"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-stone-500">Body — separate paragraphs with a blank line</label>
            <textarea
              name="body"
              rows={8}
              required
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500">Read time</label>
            <input
              name="read_time"
              defaultValue="3 min read"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500">Tone</label>
            <select
              name="tone"
              defaultValue="coral"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
            >
              <option value="coral">Coral</option>
              <option value="teal">Teal</option>
              <option value="navy">Navy</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-stone-500">
              Publish date &amp; time — leave blank to save as a draft
            </label>
            <input
              name="publish_at"
              type="datetime-local"
              defaultValue={toDatetimeLocal(suggestedNext)}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900"
            />
            <p className="mt-1 text-xs text-stone-400">
              Suggested slot — 2 weeks after your last scheduled post. Change it, or clear it to save as a draft.
            </p>
          </div>
          <div className="col-span-2">
            <button className="rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700">
              Save post
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          All posts ({allPosts.length})
        </h2>
        {allPosts.length === 0 && <p className="text-sm text-stone-500">No posts yet — write your first one above.</p>}
        {allPosts.map((post) => (
          <BlogPostRow key={post.id} post={post} />
        ))}
      </section>
    </div>
  );
}
