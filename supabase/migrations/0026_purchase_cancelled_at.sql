-- Track when a purchase was cancelled so dashboards can report
-- cancellations over a rolling window (status alone has no timestamp).
alter table purchases add column if not exists cancelled_at timestamptz;
