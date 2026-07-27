-- Memberships actually bill on a 30-day cycle in practice (e.g. sign up
-- July 3, next charge August 2), not the 28-day "4 weeks" wording on the
-- public pricing page.
update products set billing_period_days = 30 where item_type = 'membership';
