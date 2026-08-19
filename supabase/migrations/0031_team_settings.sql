-- Lets an owner/admin personalize which sidebar sections they see. Team
-- role management (who gets admin/staff/marketing access) doesn't need a
-- schema change: profiles rows are already readable by any authenticated
-- user (0001) and mutated via the service-role admin client (bypasses RLS),
-- same pattern as the Stripe webhook — see src/app/(app)/settings/actions.ts.
alter table profiles add column if not exists visible_nav_items text[];
