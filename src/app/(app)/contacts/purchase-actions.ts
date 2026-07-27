'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { computeDiscount, computeSessionsTotal } from '@/lib/discounts';
import type { DiscountCode, PaymentMethod, Product } from '@/lib/types';

function computeExpiry(purchaseDate: string, product: Product): string | null {
  const days = product.validity_days ?? product.billing_period_days;
  if (!days) return null;
  const date = new Date(purchaseDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function addPurchase(contactId: string, formData: FormData) {
  const productId = String(formData.get('product_id') ?? '');
  if (!productId) return;

  const purchaseDate = (formData.get('purchase_date') as string) || new Date().toISOString().slice(0, 10);
  const discountCodeId = String(formData.get('discount_code_id') ?? '') || null;
  const supabase = await createClient();

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single<Product>();

  if (productError || !product) throw new Error(productError?.message ?? 'Product not found');

  let discountCode: DiscountCode | null = null;
  if (discountCodeId) {
    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('id', discountCodeId)
      .single<DiscountCode>();
    if (error) throw new Error(error.message);
    discountCode = data;
  }

  const { discountAmount, finalPrice } = computeDiscount(product.price, discountCode);
  const sessionsTotal = computeSessionsTotal(product.sessions_included, discountCode);
  const amountPaid = Math.min(Math.max(Number(formData.get('amount_paid')) || 0, 0), finalPrice);
  const paymentMethod = (formData.get('payment_method') as PaymentMethod) || null;

  const { error } = await supabase.from('purchases').insert({
    contact_id: contactId,
    product_id: product.id,
    name: product.name,
    item_type: product.item_type,
    list_price: product.price,
    discount_code_id: discountCode?.id ?? null,
    discount_label: discountCode?.label ?? null,
    discount_amount: discountAmount,
    price: finalPrice,
    payment_method: finalPrice > 0 ? paymentMethod : null,
    amount_paid: amountPaid,
    sessions_total: sessionsTotal,
    sessions_remaining: sessionsTotal,
    purchase_date: purchaseDate,
    expiry_date: computeExpiry(purchaseDate, product),
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}

export async function adjustSessions(purchaseId: string, contactId: string, delta: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: purchase, error: fetchError } = await supabase
    .from('purchases')
    .select('sessions_remaining, sessions_total')
    .eq('id', purchaseId)
    .single();

  if (fetchError || !purchase) throw new Error(fetchError?.message ?? 'Purchase not found');

  const nextRemaining = Math.max(0, (purchase.sessions_remaining ?? 0) + delta);
  const nextStatus = nextRemaining === 0 ? 'used_up' : 'active';

  let usedUpAt: string | null | undefined;
  if (nextRemaining > 0) {
    usedUpAt = null; // back to active: clear any previous used-up timestamp
  } else if ((purchase.sessions_remaining ?? 0) > 0) {
    usedUpAt = new Date().toISOString(); // just ran out: record when
  } // else: was already at 0, leave the existing timestamp alone

  const { error } = await supabase
    .from('purchases')
    .update({ sessions_remaining: nextRemaining, status: nextStatus, used_up_at: usedUpAt })
    .eq('id', purchaseId);

  if (error) throw new Error(error.message);

  await supabase.from('purchase_adjustments').insert({
    purchase_id: purchaseId,
    delta,
    staff_id: user?.id ?? null,
  });

  revalidatePath(`/contacts/${contactId}`);
}

export async function cancelPurchase(purchaseId: string, contactId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('purchases').update({ status: 'cancelled' }).eq('id', purchaseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}

export async function updatePayment(purchaseId: string, contactId: string, formData: FormData) {
  const supabase = await createClient();

  const { data: purchase, error: fetchError } = await supabase
    .from('purchases')
    .select('price')
    .eq('id', purchaseId)
    .single();
  if (fetchError || !purchase) throw new Error(fetchError?.message ?? 'Purchase not found');

  const amountPaid = Math.min(Math.max(Number(formData.get('amount_paid')) || 0, 0), purchase.price ?? 0);
  const paymentMethod = (formData.get('payment_method') as PaymentMethod) || null;

  const { error } = await supabase
    .from('purchases')
    .update({ payment_method: paymentMethod, amount_paid: amountPaid })
    .eq('id', purchaseId);

  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}
