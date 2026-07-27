-- Match the fields actually shown on Instagram's own professional
-- dashboard (Account insights), so entries can be copied straight off
-- that screen: Views, Reach, Interactions, Accounts engaged, Profile
-- visits, External link taps, Followers.

alter table instagram_stats rename column engagement to interactions;
alter table instagram_stats add column views int;
alter table instagram_stats add column accounts_engaged int;
alter table instagram_stats add column profile_visits int;
alter table instagram_stats add column external_link_taps int;
