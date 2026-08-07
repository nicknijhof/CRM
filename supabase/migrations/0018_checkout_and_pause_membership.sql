-- Manual check-out on "Who's In" (visits.checked_out_at) and
-- pause-membership support on purchases.

alter table visits
  add column if not exists checked_out_at timestamptz;

alter table purchases
  add column if not exists is_paused boolean not null default false,
  add column if not exists pause_reason text,
  add column if not exists pause_started_at date,
  add column if not exists pause_resume_date date;
