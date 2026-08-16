-- Per-channel marketing consent, editable per member. Defaults to true so
-- existing outreach (WhatsApp/follow-up messaging) isn't silently muted for
-- everyone on rollout — staff can opt individual members out from here.
alter table contacts
  add column if not exists marketing_sms_opt_in boolean not null default true,
  add column if not exists marketing_email_opt_in boolean not null default true,
  add column if not exists marketing_whatsapp_opt_in boolean not null default true;
