-- Track when a gift code is redeemed instead of hard-deleting the
-- discount_codes row, so the original purchaser's gift-card purchase card
-- can show it was redeemed (and by when) rather than a broken/missing code.
alter table discount_codes add column if not exists redeemed_at timestamptz;
