-- Any authenticated user can generate a single-use gift code when selling
-- a gift card purchase — only creating regular, reusable discount codes
-- stays admin/owner-only (existing policy).
create policy "authenticated insert single-use discount codes" on discount_codes
  for insert to authenticated
  with check (single_use = true);
