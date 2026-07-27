-- Track exactly when a purchase's sessions ran out (so we can filter
-- "used up in the last N days" for follow-ups), and a table to record
-- which follow-ups staff have already actioned.

alter table purchases add column if not exists used_up_at timestamptz;

drop table if exists follow_up_completions cascade;

create table follow_up_completions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  trigger_type text not null check (trigger_type in ('visit', 'purchase_used')),
  trigger_id uuid not null,
  completed_at timestamptz not null default now(),
  completed_by uuid references profiles(id),
  unique (trigger_type, trigger_id)
);
create index follow_up_completions_contact_id_idx on follow_up_completions(contact_id);

alter table follow_up_completions enable row level security;

create policy "authenticated full access follow_up_completions" on follow_up_completions
  for all to authenticated using (true) with check (true);
