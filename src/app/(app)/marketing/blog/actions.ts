'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { canManageBlog, getCurrentProfile } from '@/lib/profile';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseBody(raw: string): string[] {
  // One paragraph per blank-line-separated block, matching how posts already render.
  return raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// publish_at comes from a <input type="datetime-local">, which has no timezone —
// treated as the browser's local time, exactly like scheduling anything else in the CRM.
function parsePublishAt(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? '').trim();
  return value ? new Date(value).toISOString() : null;
}

async function assertCanManage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile || !canManageBlog(profile.role)) throw new Error('Not authorized to manage the blog');
  return { supabase, profile };
}

export async function createBlogPost(formData: FormData) {
  const { supabase, profile } = await assertCanManage();

  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('Title is required');
  const slug = String(formData.get('slug') ?? '').trim() || slugify(title);

  const { error } = await supabase.from('blog_posts').insert({
    slug,
    title,
    excerpt: String(formData.get('excerpt') ?? '').trim(),
    body: parseBody(String(formData.get('body') ?? '')),
    read_time: String(formData.get('read_time') ?? '').trim() || '3 min read',
    tone: String(formData.get('tone') ?? 'coral'),
    publish_at: parsePublishAt(formData.get('publish_at')),
    author_id: profile.id,
  });

  if (error) {
    if (error.code === '23505') throw new Error(`A post with the slug "${slug}" already exists`);
    throw new Error(error.message);
  }
  revalidatePath('/marketing/blog');
}

export async function updateBlogPost(id: string, formData: FormData) {
  const { supabase } = await assertCanManage();

  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('Title is required');
  const slug = String(formData.get('slug') ?? '').trim() || slugify(title);

  const { error } = await supabase
    .from('blog_posts')
    .update({
      slug,
      title,
      excerpt: String(formData.get('excerpt') ?? '').trim(),
      body: parseBody(String(formData.get('body') ?? '')),
      read_time: String(formData.get('read_time') ?? '').trim() || '3 min read',
      tone: String(formData.get('tone') ?? 'coral'),
      publish_at: parsePublishAt(formData.get('publish_at')),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    if (error.code === '23505') throw new Error(`A post with the slug "${slug}" already exists`);
    throw new Error(error.message);
  }
  revalidatePath('/marketing/blog');
}

export async function deleteBlogPost(id: string) {
  const { supabase } = await assertCanManage();
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/marketing/blog');
}
