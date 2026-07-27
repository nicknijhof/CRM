-- New 'marketing' role: can see contacts/pipeline/purchases but never
-- create/edit/cancel a purchase (view-only), enforced at the RLS level
-- so it's a real boundary, not just a hidden button.

alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin', 'owner', 'staff', 'marketing'));

update profiles set role = 'marketing' where id = '106ee802-32dd-467e-8375-40f350f60105';

drop policy "authenticated full access purchases" on purchases;

create policy "authenticated read purchases" on purchases for select to authenticated using (true);

create policy "non-marketing insert purchases" on purchases for insert to authenticated
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role <> 'marketing'));

create policy "non-marketing update purchases" on purchases for update to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role <> 'marketing'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role <> 'marketing'));

create policy "non-marketing delete purchases" on purchases for delete to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role <> 'marketing'));
