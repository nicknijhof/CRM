-- Track how a purchase was paid for and how much has been paid so far,
-- so front desk can see the remaining balance go to $0 as payment is keyed in.

alter table purchases
  add column payment_method text check (payment_method in ('cash', 'stripe')),
  add column amount_paid numeric(10, 2) not null default 0;
