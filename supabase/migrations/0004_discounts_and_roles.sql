-- Discount codes (e.g. ClassPass/Entertainer visits that are already paid
-- for on that platform, so the club charges $0), a "staff" role for
-- front-desk logins who can apply but not manage discount codes, and an
-- "entertainer" lead source alongside the existing "classpass" one.

alter table contacts drop constraint contacts_source_check;
alter table contacts add constraint contacts_source_check
  check (source in ('instagram', 'walk_in', 'referral', 'classpass', 'entertainer', 'corporate', 'other'));

alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin', 'owner', 'staff'));
alter table profiles alter column role set default 'staff';

create table discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed', 'full_comp')),
  value numeric(10, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into discount_codes (code, label, discount_type, value) values
  ('CLASSPASS', 'ClassPass (paid via platform)', 'full_comp', 0),
  ('ENTERTAINER', 'Entertainer (paid via platform)', 'full_comp', 0);

alter table purchases
  add column list_price numeric(10, 2),
  add column discount_code_id uuid references discount_codes(id) on delete set null,
  add column discount_label text,
  add column discount_amount numeric(10, 2) not null default 0;

update purchases set list_price = price where list_price is null;

alter table discount_codes enable row level security;

create policy "authenticated read discount codes" on discount_codes
  for select to authenticated using (true);

create policy "admin or owner insert discount codes" on discount_codes
  for insert to authenticated
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));

create policy "admin or owner update discount codes" on discount_codes
  for update to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));

create policy "admin or owner delete discount codes" on discount_codes
  for delete to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));
