'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { assertFeature } from '@/lib/permissions';

// Asks Qashier about every unconfirmed online checkout and records the paid ones. The function
// itself only accepts owners/admins, so this runs with the signed-in user's own session.
export async function checkQashierNow() {
  await assertFeature('sales_tracker', 'Not authorized to view sales');
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<{
    checked: number;
    recorded: string[];
    expired: number;
    errors: string[];
  }>('reconcile-qashier', { body: {} });

  if (error || !data) redirect('/sales/online-payments?result=failed');
  const params = new URLSearchParams({
    result: 'ok',
    checked: String(data.checked),
    recorded: String(data.recorded.length),
    expired: String(data.expired),
    errors: String(data.errors.length),
  });
  redirect(`/sales/online-payments?${params.toString()}`);
}
