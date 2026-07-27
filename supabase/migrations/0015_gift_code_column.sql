-- Store the raw gift code text on the buyer's purchase record so it can
-- still be displayed after the discount_codes row is deleted at redemption
-- (discount_label is already used for the buyer's own discount, if any).
alter table purchases add column gift_code text;
