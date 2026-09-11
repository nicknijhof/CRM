'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { ContactSource, InteractionChannel, PipelineStage } from '@/lib/types';
import { addPurchase } from './purchase-actions';

// Ambassadors get a free Unlimited Anytime membership the moment they're
// added — expiry_date is left null (never expires) rather than the usual
// monthly renewal, since this is a standing perk tied to the role, not
// something staff should have to remember to re-comp every month.
async function grantAmbassadorMembership(contactId: string) {
  const supabase = await createClient();

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('slug', 'unlimited-anytime')
    .single();
  if (productError || !product) throw new Error(productError?.message ?? 'Unlimited Anytime product not found');

  const { error } = await supabase.from('purchases').insert({
    contact_id: contactId,
    product_id: product.id,
    name: product.name,
    item_type: 'membership',
    list_price: product.price,
    price: 0,
    discount_label: 'Ambassador — complimentary membership',
    discount_amount: product.price,
    payment_method: 'comp',
    amount_paid: 0,
    purchase_date: new Date().toISOString().slice(0, 10),
    expiry_date: null,
    status: 'active',
  });
  if (error) throw new Error(error.message);
}

export async function createContact(formData: FormData) {
  const supabase = await createClient();
  const isAmbassador = formData.get('is_ambassador') === 'on';

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      full_name: String(formData.get('full_name')),
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      source: formData.get('source') as ContactSource,
      pipeline_stage: (formData.get('pipeline_stage') as PipelineStage) || 'lead',
      notes: (formData.get('notes') as string) || null,
      is_ambassador: isAmbassador,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  if (isAmbassador) {
    await grantAmbassadorMembership(data.id);
  } else {
    await addPurchase(data.id, formData);
  }

  revalidatePath('/contacts');
  revalidatePath('/pipeline');
  redirect(`/contacts/${data.id}`);
}

export async function updateContact(contactId: string, formData: FormData) {
  const supabase = await createClient();

  const tagsRaw = String(formData.get('tags') ?? '');
  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const isAmbassador = formData.get('is_ambassador') === 'on';

  const { data: existing, error: existingError } = await supabase
    .from('contacts')
    .select('is_ambassador')
    .eq('id', contactId)
    .single();
  if (existingError) throw new Error(existingError.message);

  const { error } = await supabase
    .from('contacts')
    .update({
      full_name: String(formData.get('full_name')),
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      source: formData.get('source') as ContactSource,
      notes: (formData.get('notes') as string) || null,
      tags,
      is_ambassador: isAmbassador,
    })
    .eq('id', contactId);

  if (error) throw new Error(error.message);

  // Just turned into an ambassador — grant the standing free membership,
  // unless they already have an active one (an existing paying member
  // promoted to ambassador keeps their current membership; staff can adjust
  // it separately if they want to switch them to the comp).
  if (isAmbassador && !existing.is_ambassador) {
    const { data: activeMembership } = await supabase
      .from('purchases')
      .select('id')
      .eq('contact_id', contactId)
      .eq('item_type', 'membership')
      .eq('status', 'active')
      .eq('is_paused', false)
      .limit(1)
      .maybeSingle();

    if (!activeMembership) {
      await grantAmbassadorMembership(contactId);
    }
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath('/contacts');
}

export async function updateStage(contactId: string, stage: PipelineStage) {
  const supabase = await createClient();
  const { error } = await supabase.from('contacts').update({ pipeline_stage: stage }).eq('id', contactId);
  if (error) throw new Error(error.message);

  revalidatePath('/pipeline');
  revalidatePath('/contacts');
  revalidatePath(`/contacts/${contactId}`);
}

export async function addInteraction(contactId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('interactions').insert({
    contact_id: contactId,
    channel: formData.get('channel') as InteractionChannel,
    note: String(formData.get('note')),
    staff_id: user?.id ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}

export async function updateMarketingPrefs(contactId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('contacts')
    .update({
      marketing_sms_opt_in: formData.get('marketing_sms_opt_in') === 'on',
      marketing_email_opt_in: formData.get('marketing_email_opt_in') === 'on',
      marketing_whatsapp_opt_in: formData.get('marketing_whatsapp_opt_in') === 'on',
    })
    .eq('id', contactId);

  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}

export async function deleteContact(contactId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('contacts').delete().eq('id', contactId);
  if (error) throw new Error(error.message);

  revalidatePath('/contacts');
  revalidatePath('/pipeline');
  redirect('/contacts');
}
