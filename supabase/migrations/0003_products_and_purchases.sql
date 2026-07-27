-- Replace the ad-hoc memberships table with a product catalog (matching
-- the published price list) plus a purchases table that supports both
-- session packs (with remaining-session tracking and expiry) and
-- memberships (recurring, tracked by renewal date).

drop table if exists memberships cascade;

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  item_type text not null check (item_type in ('trial', 'single_session', 'session_pack', 'membership')),
  price numeric(10, 2) not null,
  sessions_included int,
  validity_days int,
  billing_period_days int,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into products (name, item_type, price, sessions_included, validity_days, billing_period_days, sort_order) values
  ('14 Day Full Trial Access', 'trial', 180, null, 14, null, 1),
  ('Single Session (Anytime)', 'single_session', 55, 1, null, null, 2),
  ('Single Session (Off-Peak)', 'single_session', 45, 1, null, null, 3),
  ('5 Sessions', 'session_pack', 250, 5, 90, null, 4),
  ('10 Sessions', 'session_pack', 450, 10, 90, null, 5),
  ('20 Sessions', 'session_pack', 800, 20, 180, null, 6),
  ('50 Sessions', 'session_pack', 1750, 50, 365, null, 7),
  ('100 Sessions', 'session_pack', 2900, 100, 730, null, 8),
  ('Unlimited Anytime Membership', 'membership', 356, null, null, 28, 9),
  ('Unlimited Weekdays Membership', 'membership', 304, null, null, 28, 10),
  ('Unlimited Off-Peak Membership', 'membership', 260, null, null, 28, 11);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  name text not null,
  item_type text not null check (item_type in ('trial', 'single_session', 'session_pack', 'membership')),
  price numeric(10, 2),
  sessions_total int,
  sessions_remaining int,
  purchase_date date not null default current_date,
  expiry_date date,
  status text not null default 'active' check (status in ('active', 'used_up', 'expired', 'cancelled')),
  arketa_id text unique,
  created_at timestamptz not null default now()
);
create index purchases_contact_id_idx on purchases(contact_id);

create table purchase_adjustments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  delta int not null,
  note text,
  staff_id uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index purchase_adjustments_purchase_id_idx on purchase_adjustments(purchase_id);

alter table products enable row level security;
alter table purchases enable row level security;
alter table purchase_adjustments enable row level security;

create policy "authenticated read products" on products for select to authenticated using (true);
create policy "authenticated full access purchases" on purchases for all to authenticated using (true) with check (true);
create policy "authenticated full access purchase_adjustments" on purchase_adjustments for all to authenticated using (true) with check (true);

alter table csv_imports drop constraint csv_imports_import_type_check;
alter table csv_imports add constraint csv_imports_import_type_check check (import_type in ('visits', 'purchases'));
