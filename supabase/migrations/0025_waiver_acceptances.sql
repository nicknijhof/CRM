-- Tracks which waiver version each member has agreed to, so purchases can be gated on it
-- and staff have an audit trail of who accepted what and when. Rows are never updated or
-- deleted (append-only) — a new waiver version means a new row, not editing an old one.
create table public.waiver_acceptances (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id),
  waiver_version text not null,
  accepted_at timestamptz not null default now()
);

create index waiver_acceptances_contact_id_idx on public.waiver_acceptances (contact_id);

alter table public.waiver_acceptances enable row level security;

create policy "members_select_own_waiver_acceptances" on public.waiver_acceptances
  for select to authenticated
  using (contact_id = public.my_contact_id());

create policy "members_insert_own_waiver_acceptances" on public.waiver_acceptances
  for insert to authenticated
  with check (contact_id = public.my_contact_id());

create policy "staff_select_waiver_acceptances" on public.waiver_acceptances
  for select to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid()));
