-- Gift cards: buy one of 4 fixed bundles for someone else. The buyer's
-- purchase is a financial record only (no sessions attached to them); a
-- single-use discount code is generated and given to the recipient, who
-- redeems it later against the matching product. Redeeming deletes the
-- code (see purchase-actions.ts).

alter table products drop constraint products_item_type_check;
alter table products add constraint products_item_type_check
  check (item_type in ('trial', 'single_session', 'session_pack', 'membership', 'gift_card'));

alter table purchases drop constraint purchases_item_type_check;
alter table purchases add constraint purchases_item_type_check
  check (item_type in ('trial', 'single_session', 'session_pack', 'membership', 'gift_card'));

alter table purchases add column is_gift boolean not null default false;
alter table purchases add column gift_recipient_email text;

alter table discount_codes add column single_use boolean not null default false;

insert into products (name, item_type, price, sessions_included, validity_days, billing_period_days, sort_order) values
  ('Gift Card: 3 Sessions Anytime', 'gift_card', 165, 3, 90, null, 20),
  ('Gift Card: 5 Sessions Anytime', 'gift_card', 250, 5, 90, null, 21),
  ('Gift Card: 10 Sessions Anytime', 'gift_card', 450, 10, 90, null, 22),
  ('Gift Card: 14 Day Trial', 'gift_card', 180, null, 14, null, 23);
