'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { ContactSource, InteractionChannel, PipelineStage } from '@/lib/types';
import { addPurchase } from './purchase-actions';

export async function createContact(formData: FormData) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      full_name: String(formData.get('full_name')),
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      source: formData.get('source') as ContactSource,
      pipeline_stage: (formData.get('pipeline_stage') as PipelineStage) || 'lead',
      notes: (formData.get('notes') as string) || null,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  await addPurchase(data.id, formData);

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

  const { error } = await supabase
    .from('contacts')
    .update({
      full_name: String(formData.get('full_name')),
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      source: formData.get('source') as ContactSource,
      notes: (formData.get('notes') as string) || null,
      tags,
    })
    .eq('id', contactId);

  if (error) throw new Error(error.message);

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

export async function deleteContact(contactId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('contacts').delete().eq('id', contactId);
  if (error) throw new Error(error.message);

  revalidatePath('/contacts');
  revalidatePath('/pipeline');
  redirect('/contacts');
}
