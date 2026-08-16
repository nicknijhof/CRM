-- Let staff schedule a membership cancellation for a future date (e.g. end
-- of the current billing cycle, or after N more cycles) instead of only
-- being able to cancel immediately. Reconciled lazily on page view, same
-- pattern as the existing lapsed-stage/gift-code reconciliation elsewhere.
alter table purchases add column if not exists scheduled_cancellation_date date;
