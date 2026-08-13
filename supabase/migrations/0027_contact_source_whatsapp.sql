-- Add 'whatsapp' as a contact source. Also folds in 'staff', which was added
-- to the app's ContactSource/CONTACT_SOURCES/import code earlier but never
-- to this check constraint — saving a contact with source='staff' currently
-- fails at the database level.
alter table contacts drop constraint contacts_source_check;
alter table contacts add constraint contacts_source_check
  check (source in ('instagram', 'walk_in', 'referral', 'classpass', 'entertainer', 'corporate', 'staff', 'whatsapp', 'other'));
