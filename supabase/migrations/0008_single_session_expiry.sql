-- Single sessions now expire 1 week after purchase (previously never
-- expired). Only affects purchases made after this runs.
update products set validity_days = 7 where item_type = 'single_session';
