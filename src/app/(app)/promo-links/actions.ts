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

export async function createPromoLink(formData: FormData) {
  await assertFeature('promo_links', 'Not authorized to create promo checkout links');
  const supabase = await createClient();

  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required');

  const price = Number(formData.get('price'));
  if (!Number.isFinite(price) || price < 0) throw new Error('Enter a valid price');

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
    if (error.code === '23505') throw new Error(`That link (/checkout/${slug}) is already taken — pick another.`);
    throw new Error(error.message);
  }

  revalidatePath('/promo-links');
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
