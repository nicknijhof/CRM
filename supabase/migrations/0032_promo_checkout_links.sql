-- Promo Checkout Links (src/app/(app)/promo-links/) writes these columns on `products`
-- already, but the columns/permissions were never added in a migration — every
-- "Create" click has been failing against the real database. Add what the code expects.

alter table products add column if not exists description text;
alter table products add column if not exists image_url text;
alter table products add column if not exists billing_period_months int;
alter table products add column if not exists slug text;
alter table products add column if not exists is_public boolean not null default true;
alter table products add column if not exists payment_provider text not null default 'qashier'
  check (payment_provider in ('stripe', 'qashier'));
alter table products add column if not exists is_promo_link boolean not null default false;
alter table products add column if not exists promo_expires_at timestamptz;

-- Only promo links set a slug; catalog products leave it null, so this can't be a
-- plain unique column constraint.
create unique index if not exists products_slug_unique_idx on products (slug) where slug is not null;

-- Permissions: the catalog ("authenticated read products") was select-only for any
-- authenticated user, staff and app members alike — there was no insert/update/delete
-- policy at all, so promo-link create/toggle/delete were silently doomed regardless of
-- the missing columns above. Follow the "is this a staff account" pattern from
-- 0023_scope_authenticated_policies_to_staff.sql: staff manage everything; app members
-- (and anyone else merely authenticated) keep read-only access, now scoped to public
-- products only so a promo link (is_public = false) isn't exposed to the member app.
drop policy if exists "authenticated read products" on public.products;
create policy "read public or staff products" on public.products
  for select to authenticated
  using (is_public = true or exists (select 1 from public.profiles where profiles.id = auth.uid()));

create policy "staff insert products" on public.products
  for insert to authenticated
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid()));

create policy "staff update products" on public.products
  for update to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid()))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid()));

create policy "staff delete products" on public.products
  for delete to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid()));

-- Note (not part of this SQL migration, apply manually in the Supabase dashboard):
-- the promo-link photo upload (src/app/(app)/promo-links/actions.ts) writes to a
-- `promo-images` storage bucket, the same way blog covers use `blog-covers` — that
-- bucket needs to be created (public, image uploads) in Storage before photo upload
-- will work, same as blog-covers was.
