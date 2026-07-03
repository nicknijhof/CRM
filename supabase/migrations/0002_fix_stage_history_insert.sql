-- The contacts_stage_history trigger inserts into pipeline_stage_history on
-- every contact insert/update, running as the calling user (not security
-- definer), so authenticated users need an insert policy too.
create policy "authenticated insert stage history" on pipeline_stage_history
  for insert to authenticated with check (true);
