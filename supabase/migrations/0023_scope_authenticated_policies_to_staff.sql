-- SECURITY FIX (pre-existing, unrelated to recent work): the CRM's own RLS policies grant
-- "to authenticated using (true)" access on most tables — meaning ANY authenticated
-- Supabase user, not just CRM staff. Since the member app's signups share the exact same
-- Supabase Auth pool as CRM staff logins, any app member could read (and in several cases
-- write/delete) the entire contacts list, purchase history, staff interaction notes, etc.
-- via the API directly, bypassing the app's own UI entirely.
--
-- Fix: every CRM staff member gets a row in `profiles` (via handle_new_user()); app members
-- never do. So `exists (select 1 from profiles where profiles.id = auth.uid())` is a
-- reliable "is this a staff account" check. Re-scope the blanket policies to require it —
-- staff keep exactly the same access they had before; only non-staff (app members) lose
-- access they should never have had. The app's own member-scoped policies (own contact,
-- friends, own purchases/visits, active products) are untouched and keep working.

drop policy if exists "authenticated full access contacts" on public.contacts;
create policy "staff full access contacts" on public.contacts
  for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid()))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid()));

-- Note: `memberships` doesn't exist in the live database (superseded by `purchases` early
-- on; the policy referencing it in the CRM's migration history was never applied here) —
-- skipped, nothing to fix there.

drop policy if exists "authenticated full access visits" on public.visits;
create policy "staff full access visits" on public.visits
  for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid()))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid()));

drop policy if exists "authenticated full access interactions" on public.interactions;
create policy "staff full access interactions" on public.interactions
  for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid()))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid()));

drop policy if exists "authenticated read stage history" on public.pipeline_stage_history;
create policy "staff read stage history" on public.pipeline_stage_history
  for select to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid()));

drop policy if exists "authenticated full access csv_imports" on public.csv_imports;
create policy "staff full access csv_imports" on public.csv_imports
  for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid()))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid()));

drop policy if exists "authenticated read purchases" on public.purchases;
create policy "staff read purchases" on public.purchases
  for select to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid()));

drop policy if exists "authenticated full access purchase_adjustments" on public.purchase_adjustments;
create policy "staff full access purchase_adjustments" on public.purchase_adjustments
  for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid()))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid()));

drop policy if exists "authenticated read discount codes" on public.discount_codes;
create policy "staff read discount codes" on public.discount_codes
  for select to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid()));

drop policy if exists "authenticated full access follow_up_completions" on public.follow_up_completions;
create policy "staff full access follow_up_completions" on public.follow_up_completions
  for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid()))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid()));

drop policy if exists "authenticated full access instagram_stats" on public.instagram_stats;
create policy "staff full access instagram_stats" on public.instagram_stats
  for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid()))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid()));

-- Members still need to read the products catalog (Pricing page) and their own
-- contacts/purchases/visits/member_app_state rows — those policies are separate (added in
-- earlier app migrations) and are untouched by this fix.
