-- CRITICAL SECURITY FIX: the CRM's `on_auth_user_created` trigger (from its original
-- 0001_init.sql) fires on EVERY new auth.users row and automatically inserts a `profiles`
-- row for them — which is exactly the signal migration 0021/0023 used to distinguish
-- "staff" from "app member". That trigger predates the member app and was written when
-- "this app has exactly two trusted logins" (its own comment). Now that the member app
-- shares this same Supabase Auth pool, EVERY app signup — any customer — automatically
-- got a `profiles` row too, silently granting them full staff-level CRM access. This has
-- already happened for at least one real member (not just test accounts).
--
-- Fix: stop auto-creating profiles rows on signup entirely. Staff accounts are rare to add
-- — going forward, provision a new staff member's `profiles` row manually (one INSERT) when
-- you actually add one, instead of it happening implicitly for anyone who signs up anywhere.
drop trigger if exists on_auth_user_created on auth.users;

-- Kept (not dropped) in case anything else references it, but it's no longer wired to fire.
comment on function public.handle_new_user() is
  'No longer triggered automatically — see 0022_stop_auto_granting_staff_on_signup.sql. Insert into profiles manually to add a new staff member.';
