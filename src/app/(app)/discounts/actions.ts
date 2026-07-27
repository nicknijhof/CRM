'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { DiscountType } from '@/lib/types';

export async function createDiscountCode(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from('discount_codes').insert({
    code: String(formData.get('code')).trim().toUpperCase(),
    label: String(formData.get('label')),
    discount_type: formData.get('discount_type') as DiscountType,
    value: Number(formData.get('value')) || 0,
    bonus_sessions: Math.max(0, Number(formData.get('bonus_sessions')) || 0),
  });

  if (error) throw new Error(error.message);
  revalidatePath('/discounts');
}

export async function setDiscountCodeActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from('discount_codes').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/discounts');
}

export async function deleteDiscountCode(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('discount_codes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/discounts');
}
