import type { SupabaseClient } from '@supabase/supabase-js';

// Never throws: a receipt failing to send must not undo a purchase that's already recorded.
export async function sendPurchaseReceipt(supabase: SupabaseClient, purchaseId: string | null | undefined) {
  if (!purchaseId) return;
  try {
    const { error } = await supabase.functions.invoke('send-receipt', { body: { purchaseId } });
    if (error) console.error('send-receipt failed', error);
  } catch (err) {
    console.error('send-receipt threw', err);
  }
}
