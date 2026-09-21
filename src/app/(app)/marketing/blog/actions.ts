'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hasFeature } from '@/lib/permissions';
import { getCurrentProfile } from '@/lib/profile';

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
  if (!profile || !(await hasFeature(profile.role, 'blog'))) throw new Error('Not authorized to manage the blog');
  return { supabase, profile };
}

const MAX_COVER_BYTES = 6 * 1024 * 1024;

// Returns the public URL of a newly uploaded cover, or null if no file was chosen.
async function uploadCover(supabase: Awaited<ReturnType<typeof createClient>>, formData: FormData): Promise<string | null> {
  const file = formData.get('cover');
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith('image/')) throw new Error('The cover must be an image file');
  if (file.size > MAX_COVER_BYTES) throw new Error('The cover image must be under 6MB');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('blog-covers').upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
  });
  if (error) throw new Error(`Cover upload failed: ${error.message}`);
  return supabase.storage.from('blog-covers').getPublicUrl(path).data.publicUrl;
}

export async function createBlogPost(formData: FormData) {
  const { supabase, profile } = await assertCanManage();

  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('Title is required');
  const slug = String(formData.get('slug') ?? '').trim() || slugify(title);
  const coverUrl = await uploadCover(supabase, formData);

  const { error } = await supabase.from('blog_posts').insert({
    slug,
    cover_image_url: coverUrl,
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

  // New upload replaces the cover; "remove" clears it; otherwise leave the existing one alone.
  const coverUrl = await uploadCover(supabase, formData);
  const coverChange: { cover_image_url?: string | null } = coverUrl
    ? { cover_image_url: coverUrl }
    : formData.get('remove_cover')
      ? { cover_image_url: null }
      : {};

  const { error } = await supabase
    .from('blog_posts')
    .update({
      ...coverChange,
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
