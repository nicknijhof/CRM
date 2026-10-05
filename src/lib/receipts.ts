import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// Never throws: a receipt failing to send must not undo a purchase that's already recorded.
// Runs after the response is sent (`after`) so staff aren't left waiting on the email round trip.
export function sendPurchaseReceipt(supabase: SupabaseClient, purchaseId: string | null | undefined) {
  if (!purchaseId) return;
  after(() => deliver(supabase, purchaseId));
}

async function deliver(supabase: SupabaseClient, purchaseId: string) {
  try {
    const { error } = await supabase.functions.invoke('send-receipt', { body: { purchaseId } });
    if (error) console.error('send-receipt failed', error);
  } catch (err) {
    console.error('send-receipt threw', err);
  }
}
