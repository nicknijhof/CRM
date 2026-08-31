'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { canManageCafeMenu, getCurrentRole } from '@/lib/profile';
import type { CafeMenuCategory } from '@/lib/types';

async function assertCanManage() {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!canManageCafeMenu(role)) throw new Error('Not authorized to manage the cafe menu');
  return supabase;
}

export async function createMenuItem(formData: FormData) {
  const supabase = await assertCanManage();

  const { error } = await supabase.from('cafe_menu_items').insert({
    name: String(formData.get('name')),
    description: String(formData.get('description') || '').trim() || null,
    price: Number(formData.get('price')) || 0,
    category: formData.get('category') as CafeMenuCategory,
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
      category: formData.get('category') as CafeMenuCategory,
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
