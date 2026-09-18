import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Vercel Cron hits this route daily (see vercel.json) with an
// `Authorization: Bearer ${CRON_SECRET}` header it adds automatically —
// checked here so this endpoint can't be triggered by anyone else, since it
// forwards a service-role call to the sync-instagram-stats edge function.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.functions.invoke('sync-instagram-stats');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
