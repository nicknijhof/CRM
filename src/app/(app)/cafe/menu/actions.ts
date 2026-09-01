'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { canManageCafeMenu, getCurrentRole } from '@/lib/profile';

async function assertCanManage() {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!canManageCafeMenu(role)) throw new Error('Not authorized to manage the cafe menu');
  return supabase;
}

export async function createCategory(formData: FormData) {
  const supabase = await assertCanManage();

  const { error } = await supabase.from('cafe_menu_categories').insert({
    name: String(formData.get('name')).trim(),
    sort_order: Number(formData.get('sort_order')) || 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/cafe/menu');
}

export async function deleteCategory(id: string) {
  const supabase = await assertCanManage();
  const { error } = await supabase.from('cafe_menu_categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/cafe/menu');
}

function nullableNumber(value: FormDataEntryValue | null): number | null {
  const trimmed = String(value ?? '').trim();
  return trimmed === '' ? null : Number(trimmed);
}

export async function createMenuItem(formData: FormData) {
  const supabase = await assertCanManage();

  const { error } = await supabase.from('cafe_menu_items').insert({
    name: String(formData.get('name')),
    description: String(formData.get('description') || '').trim() || null,
    price: Number(formData.get('price')) || 0,
    category_id: String(formData.get('category_id')),
    calories: nullableNumber(formData.get('calories')),
    protein_grams: nullableNumber(formData.get('protein_grams')),
    image_url: String(formData.get('image_url') || '').trim() || null,
    sort_order: Number(formData.get('sort_order')) || 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/cafe/menu');
}

export async function updateMenuItem(id: string, formData: FormData) {
  const supabase = await assertCanManage();

  const { error } = await supabase
    .from('cafe_menu_items')
    .update({
      name: String(formData.get('name')),
      description: String(formData.get('description') || '').trim() || null,
      price: Number(formData.get('price')) || 0,
      category_id: String(formData.get('category_id')),
      calories: nullableNumber(formData.get('calories')),
      protein_grams: nullableNumber(formData.get('protein_grams')),
      image_url: String(formData.get('image_url') || '').trim() || null,
      sort_order: Number(formData.get('sort_order')) || 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/cafe/menu');
}

export async function setMenuItemAvailable(id: string, isAvailable: boolean) {
  const supabase = await assertCanManage();
  const { error } = await supabase
    .from('cafe_menu_items')
    .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/cafe/menu');
}

export async function deleteMenuItem(id: string) {
  const supabase = await assertCanManage();
  const { error } = await supabase.from('cafe_menu_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/cafe/menu');
}

// Variants (e.g. Hot/Iced) — pick exactly one per order, can change the price.
export async function createVariant(menuItemId: string, formData: FormData) {
  const supabase = await assertCanManage();
  const { error } = await supabase.from('cafe_menu_item_variants').insert({
    menu_item_id: menuItemId,
    name: String(formData.get('name')).trim(),
    price_delta: Number(formData.get('price_delta')) || 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/cafe/menu');
}

export async function deleteVariant(id: string) {
  const supabase = await assertCanManage();
  const { error } = await supabase.from('cafe_menu_item_variants').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/cafe/menu');
}

// Add-ons — scoped to a category (e.g. "Boosters" for Smoothies), members can
// add any of them to an order for an item in that category.
export async function createAddon(categoryId: string, formData: FormData) {
  const supabase = await assertCanManage();
  const { error } = await supabase.from('cafe_addons').insert({
    category_id: categoryId,
    group_label: String(formData.get('group_label') || '').trim() || 'Add-ons',
    name: String(formData.get('name')).trim(),
    price: Number(formData.get('price')) || 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/cafe/menu');
}

export async function deleteAddon(id: string) {
  const supabase = await assertCanManage();
  const { error } = await supabase.from('cafe_addons').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/cafe/menu');
}
