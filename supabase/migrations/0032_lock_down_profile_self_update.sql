-- The "authenticated update own profile" policy (0001) let any logged-in
-- user update *any* column on their own profiles row via the browser
-- client, including `role` — so a staff/marketing account could grant
-- itself admin/owner directly against the database, bypassing the
-- owner-only Team screen (settings/actions.ts) entirely. Role changes
-- already go through that service-role-gated code path, so the only
-- column a user legitimately self-edits is their sidebar preference
-- (0031). Lock the grant down to that column only.
revoke update on public.profiles from authenticated;
grant update (visible_nav_items) on public.profiles to authenticated;

drop policy if exists "authenticated update own profile" on profiles;
create policy "authenticated update own nav prefs" on profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
