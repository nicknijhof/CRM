-- Manual Instagram stat entries. Live API integration was attempted but
-- blocked on Meta Developer App setup, so for now someone in marketing
-- types in numbers periodically and we trend them over time.

create table instagram_stats (
  id uuid primary key default gen_random_uuid(),
  stat_date date not null,
  followers int not null,
  reach int,
  engagement int,
  note text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index instagram_stats_stat_date_idx on instagram_stats(stat_date);

alter table instagram_stats enable row level security;

create policy "authenticated full access instagram_stats" on instagram_stats
  for all to authenticated using (true) with check (true);
