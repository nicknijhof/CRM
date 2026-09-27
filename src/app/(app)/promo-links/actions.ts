'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertFeature } from '@/lib/permissions';

const SLUG_CHARS = 'abcdefghijkmnpqrstuvwxyz23456789'; // no 0/o/1/l/i to avoid confusion when read aloud

function generateSlug(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)];
  return s;
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

// Returns the public URL of a newly uploaded photo, or null if no file was chosen.
async function uploadPromoImage(supabase: Awaited<ReturnType<typeof createClient>>, formData: FormData): Promise<string | null> {
  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith('image/')) throw new Error('The photo must be an image file');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('The photo must be under 6MB');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('promo-images').upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
  });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return supabase.storage.from('promo-images').getPublicUrl(path).data.publicUrl;
}

export type CreatePromoLinkState = { error: string | null; successSlug: string | null };

// Returns state instead of throwing — used with useActionState so the form can
// show a clear inline success/error message and disable itself while
// submitting, instead of a confusing silent no-op (or a full error-page crash)
// that led to the same link being created several times over by mistake.
export async function createPromoLink(
  _prevState: CreatePromoLinkState,
  formData: FormData
): Promise<CreatePromoLinkState> {
  try {
    await assertFeature('promo_links', 'Not authorized to create promo checkout links');
    const supabase = await createClient();

    const name = String(formData.get('name') ?? '').trim();
    if (!name) return { error: 'Name is required', successSlug: null };

    const imageUrl = await uploadPromoImage(supabase, formData);

    const price = Number(formData.get('price'));
    if (!Number.isFinite(price) || price < 0) return { error: 'Enter a valid price', successSlug: null };

    const description = String(formData.get('description') ?? '').trim() || null;
    const billing = formData.get('billing') === 'recurring' ? 'recurring' : 'one_time';
    const validityDaysRaw = String(formData.get('validity_days') ?? '').trim();
    const validityDays = validityDaysRaw ? Math.max(1, Math.round(Number(validityDaysRaw))) : null;
    const paymentProviderInput = String(formData.get('payment_provider') ?? 'qashier');
    const promoExpiresAt = String(formData.get('promo_expires_at') ?? '').trim() || null;
    const customSlug = slugify(String(formData.get('slug') ?? ''));

    const slug = customSlug || generateSlug();

    const { error } = await supabase.from('products').insert({
      name,
      description,
      image_url: imageUrl,
      item_type: billing === 'recurring' ? 'membership' : 'single_session',
      price,
      billing_period_months: billing === 'recurring' ? 1 : null,
      validity_days: billing === 'recurring' ? null : validityDays,
      // Recurring billing only exists on Stripe (Qashier has no subscriptions) — see
      // migration 0060_qashier_checkout.
      payment_provider: billing === 'recurring' ? 'stripe' : paymentProviderInput === 'stripe' ? 'stripe' : 'qashier',
      is_active: true,
      is_public: false,
      is_promo_link: true,
      promo_expires_at: promoExpiresAt ? new Date(promoExpiresAt).toISOString() : null,
      slug,
    });

    if (error) {
      if (error.code === '23505') {
        return { error: `That link (/checkout/${slug}) is already taken — pick another.`, successSlug: null };
      }
      return { error: error.message, successSlug: null };
    }

    revalidatePath('/promo-links');
    return { error: null, successSlug: slug };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Something went wrong', successSlug: null };
  }
}

export async function setPromoLinkActive(id: string, isActive: boolean) {
  await assertFeature('promo_links', 'Not authorized to manage promo checkout links');
  const supabase = await createClient();
  const { error } = await supabase.from('products').update({ is_active: isActive }).eq('id', id).eq('is_promo_link', true);
  if (error) throw new Error(error.message);
  revalidatePath('/promo-links');
}

export async function deletePromoLink(id: string) {
  await assertFeature('promo_links', 'Not authorized to manage promo checkout links');
  const supabase = await createClient();
  // Purchases keep a denormalized name/price snapshot and only soft-reference
  // product_id (on delete set null), so deleting the link doesn't touch anyone
  // who already checked out through it.
  const { error } = await supabase.from('products').delete().eq('id', id).eq('is_promo_link', true);
  if (error) throw new Error(error.message);
  revalidatePath('/promo-links');
}
