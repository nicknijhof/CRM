-- A plain "3 Sessions" pack didn't exist in the regular catalog — only
-- the gift-card version did. Front desk redeeming a 3-session gift needs
-- a normal Session Pack option to apply the gift code against.
update products set sort_order = sort_order + 1 where sort_order >= 4 and sort_order < 20;

insert into products (name, item_type, price, sessions_included, validity_days, billing_period_days, sort_order) values
  ('3 Sessions', 'session_pack', 165, 3, 90, null, 4);
