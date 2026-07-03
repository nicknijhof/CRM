-- Sochill Bath Club CRM schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- Profiles: one row per authenticated user, extends auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'owner' check (role in ('admin', 'owner')),
  created_at timestamptz not null default now()
);

-- Contacts: leads and members
create table contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  source text not null default 'other'
    check (source in ('instagram', 'walk_in', 'referral', 'classpass', 'corporate', 'other')),
  pipeline_stage text not null default 'lead'
    check (pipeline_stage in ('lead', 'trial', 'active', 'at_risk', 'lapsed', 'churned')),
  tags text[] not null default '{}',
  notes text,
  location_id text not null default 'holland_village',
  arketa_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contacts_pipeline_stage_idx on contacts(pipeline_stage);
create index contacts_arketa_id_idx on contacts(arketa_id);

-- Memberships: plan history per contact
create table memberships (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  plan_name text not null,
  status text not null default 'active' check (status in ('trial', 'active', 'expired', 'cancelled')),
  start_date date,
  end_date date,
  price numeric(10, 2),
  billing_period text,
  arketa_id text unique,
  created_at timestamptz not null default now()
);
create index memberships_contact_id_idx on memberships(contact_id);

-- Visits: one row per check-in, imported from Arketa CSV
create table visits (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  visit_date timestamptz not null,
  service text not null default 'other'
    check (service in ('sauna', 'ice_bath', 'magnesium_bath', 'cafe', 'other')),
  duration_minutes int,
  arketa_id text unique,
  created_at timestamptz not null default now()
);
create index visits_contact_id_idx on visits(contact_id);
create index visits_visit_date_idx on visits(visit_date);

-- Interactions: staff-logged touchpoints (DMs, calls, notes)
create table interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  channel text not null check (channel in ('dm', 'call', 'email', 'in_person', 'whatsapp', 'other')),
  note text not null,
  staff_id uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index interactions_contact_id_idx on interactions(contact_id);

-- Pipeline stage history, for funnel/conversion reporting over time
create table pipeline_stage_history (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  stage text not null,
  changed_at timestamptz not null default now()
);
create index pipeline_stage_history_contact_id_idx on pipeline_stage_history(contact_id);

-- Log of CSV imports for traceability
create table csv_imports (
  id uuid primary key default gen_random_uuid(),
  import_type text not null check (import_type in ('visits', 'memberships')),
  filename text,
  row_count int not null default 0,
  imported_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Keep contacts.updated_at fresh
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_set_updated_at
  before update on contacts
  for each row execute function set_updated_at();

-- Record pipeline stage changes automatically
create or replace function record_pipeline_stage_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') or (new.pipeline_stage is distinct from old.pipeline_stage) then
    insert into pipeline_stage_history (contact_id, stage) values (new.id, new.pipeline_stage);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger contacts_stage_history
  after insert or update on contacts
  for each row execute function record_pipeline_stage_change();

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'owner');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Row Level Security: this app has exactly two trusted logins (you + the
-- owner), so every authenticated user gets full read/write access rather
-- than modeling granular per-role permissions.
alter table profiles enable row level security;
alter table contacts enable row level security;
alter table memberships enable row level security;
alter table visits enable row level security;
alter table interactions enable row level security;
alter table pipeline_stage_history enable row level security;
alter table csv_imports enable row level security;

create policy "authenticated read profiles" on profiles for select to authenticated using (true);
create policy "authenticated update own profile" on profiles for update to authenticated using (auth.uid() = id);

create policy "authenticated full access contacts" on contacts for all to authenticated using (true) with check (true);
create policy "authenticated full access memberships" on memberships for all to authenticated using (true) with check (true);
create policy "authenticated full access visits" on visits for all to authenticated using (true) with check (true);
create policy "authenticated full access interactions" on interactions for all to authenticated using (true) with check (true);
create policy "authenticated read stage history" on pipeline_stage_history for select to authenticated using (true);
create policy "authenticated full access csv_imports" on csv_imports for all to authenticated using (true) with check (true);
