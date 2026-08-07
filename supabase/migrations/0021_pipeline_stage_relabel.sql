-- The 'lead' pipeline_stage value is being repurposed in the UI to mean
-- "Paused" (set automatically when a membership is paused — see
-- pauseMembership in purchase-actions.ts). New contacts should no longer
-- default into it; 'trial' is the new starting point for a brand-new
-- contact.
alter table contacts alter column pipeline_stage set default 'trial';
