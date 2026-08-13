import { createClient } from '@supabase/supabase-js';

// Service-role client that bypasses RLS — only for trusted server-to-server
// contexts with no user session (e.g. the Stripe webhook), never exposed to
// the browser. Requires SUPABASE_SERVICE_ROLE_KEY, which is separate from
// the anon key used everywhere else in this app.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
