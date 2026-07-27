-- Some discount codes grant extra sessions rather than (or in addition to)
-- a price cut — e.g. Entertainer is a 1-for-1 deal: a single session
-- purchase becomes 2 sessions instead of 1.

alter table discount_codes add column bonus_sessions int not null default 0;

update discount_codes set bonus_sessions = 1 where code = 'ENTERTAINER';
