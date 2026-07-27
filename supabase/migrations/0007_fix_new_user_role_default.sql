-- Migration 0004 changed profiles.role's column default to 'staff', but
-- handle_new_user() (from 0001) hardcodes 'owner' in its insert, which
-- overrides the column default for every new sign-up. Fix the trigger,
-- and correct the staff account that was created while this bug was live.

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'staff');
  return new;
end;
$$ language plpgsql security definer;

update profiles set role = 'staff'
where id = (select id from auth.users where email = 'staff@sochillbathclub.com');
