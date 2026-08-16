-- Card-on-file billing: a Stripe Customer + default saved payment method per
-- contact, and links from purchases to the Stripe objects that actually
-- moved money (subscription for recurring memberships, payment intent for
-- one-off session-pack charges).

alter table contacts
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_payment_method_id text,
  add column if not exists card_brand text,
  add column if not exists card_last4 text;

create unique index if not exists contacts_stripe_customer_id_idx on contacts(stripe_customer_id) where stripe_customer_id is not null;

alter table purchases
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_payment_intent_id text;

create index if not exists purchases_stripe_subscription_id_idx on purchases(stripe_subscription_id) where stripe_subscription_id is not null;
