import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/profile';
import type { BlogPost } from '@/lib/types';
import BlogPostRow from '@/components/BlogPostRow';
import BlogCreateForm from '@/components/BlogCreateForm';
import { requireFeature } from '@/lib/permissions';

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function BlogAdminPage() {
  await requireFeature('blog');
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) redirect('/');

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
        <BlogCreateForm suggestedPublishAt={toDatetimeLocal(suggestedNext)} />
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
