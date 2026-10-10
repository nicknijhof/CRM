'use server';

import { revalidatePath } from 'next/cache';
import { assertBusiness, str } from '@/lib/businessAuth';
import type { ContactChannel, PartnerArrangement, PartnerStatus, PartnerType } from '@/lib/types';

function fields(fd: FormData) {
  const name = str(fd, 'name');
  if (!name) throw new Error('Give the partner a name');
  const arrangement = (str(fd, 'arrangement') ?? 'ongoing') as PartnerArrangement;
  return {
    name,
    partner_type: (str(fd, 'partner_type') ?? 'company') as PartnerType,
    arrangement,
    status: (str(fd, 'status') ?? 'active') as PartnerStatus,
    what_they_do: str(fd, 'what_they_do'),
    deal_summary: str(fd, 'deal_summary'),
    how_it_works: str(fd, 'how_it_works'),
    start_date: str(fd, 'start_date'),
    end_date: arrangement === 'ongoing' ? str(fd, 'end_date') : null,
    event_date: arrangement === 'one_off' ? str(fd, 'event_date') : null,
    contact_name: str(fd, 'contact_name'),
    contact_channel: str(fd, 'contact_channel') as ContactChannel | null,
    contact_detail: str(fd, 'contact_detail'),
    notes: str(fd, 'notes'),
  };
}

export async function createPartner(fd: FormData) {
  const supabase = await assertBusiness();
  const { error } = await supabase.from('partners').insert(fields(fd));
  if (error) throw new Error(error.message);
  revalidatePath('/business/partnerships');
  revalidatePath('/business');
}

export async function updatePartner(id: string, fd: FormData) {
  const supabase = await assertBusiness();
  const { error } = await supabase.from('partners').update(fields(fd)).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/business/partnerships');
  revalidatePath('/business');
}

export async function deletePartner(id: string) {
  const supabase = await assertBusiness();
  const { error } = await supabase.from('partners').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/business/partnerships');
  revalidatePath('/business');
}
