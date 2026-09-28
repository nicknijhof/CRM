-- Nick confirmed: membership renewals should follow the same calendar-month cycle
-- Stripe auto-billing already uses (Jan 31 -> Feb 28), not the flat 30-day cycle
-- from 0006_membership_billing_cycle.sql. That flat cycle only ever applied to
-- memberships added by hand (via billing_period_days); Stripe subscriptions
-- (createMembershipSubscription) and Promo Checkout Links memberships already bill
-- calendar-month via billing_period_months. This brings the catalog in line so
-- computeExpiry() in purchase-actions.ts picks billing_period_months for every
-- membership, staff-added or not.
update products set billing_period_months = 1, billing_period_days = null where item_type = 'membership';
