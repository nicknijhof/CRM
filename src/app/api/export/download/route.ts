import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { createClient } from '@/lib/supabase/server';
import { canManageDataExports, getCurrentProfile } from '@/lib/profile';

// The full set of member/business-data tables a "give me everything" export
// covers — catalog/config tables (products, rewards_catalog) and internal app
// plumbing (member_app_state, csv_imports, friendships, ...) are left out since
// they aren't data *about* members, just how the app itself is configured.
const EXPORT_TABLES = [
  'contacts',
  'purchases',
  'purchase_adjustments',
  'purchase_shares',
  'discount_codes',
  'interactions',
  'visits',
  'session_logs',
  'events',
  'event_rsvps',
  'point_ledger',
  'referral_rewards',
  'reward_redemptions',
  'promotions',
  'waiver_acceptances',
  'pipeline_stage_history',
  'cafe_orders',
  'cafe_order_items',
  'cafe_order_item_addons',
] as const;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile || !canManageDataExports(profile.role)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  const requestId = req.nextUrl.searchParams.get('requestId');
  if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });

  const { data: exportRequest, error: fetchError } = await supabase
    .from('data_export_requests')
    .select('requested_by, status')
    .eq('id', requestId)
    .single();

  if (fetchError || !exportRequest) {
    return NextResponse.json({ error: 'Export request not found' }, { status: 404 });
  }
  if (exportRequest.requested_by !== profile.id) {
    return NextResponse.json({ error: 'This is not your export request' }, { status: 403 });
  }
  if (exportRequest.status !== 'approved') {
    return NextResponse.json(
      { error: 'This export has not been approved by another admin yet' },
      { status: 403 },
    );
  }

  const zip = new JSZip();
  for (const table of EXPORT_TABLES) {
    const { data: rows, error: rowsError } = await supabase.from(table).select('*');
    if (rowsError) continue; // best-effort — never let one table's failure block the rest
    zip.file(`${table}.csv`, Papa.unparse(rows ?? []));
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });

  // Each approval is single-use — downloading consumes it, so getting the data
  // again needs a fresh request and a fresh approval from another admin.
  await supabase
    .from('data_export_requests')
    .update({ status: 'completed', downloaded_at: new Date().toISOString() })
    .eq('id', requestId);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="sochill-export-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
