-- Migration 004 — make the industry sign-up claim exactly one row
--
-- Bug in 003: `update ... where lower(email) = lower(new.email)` matches EVERY
-- contact row with that email. Two people adding the same mentor is normal, and
-- then the update sets the same user_id on both rows, tripping the unique
-- constraint on user_id and failing the sign-up entirely.
-- Fix: claim the oldest matching row only.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  claimed uuid;
begin
  if coalesce(new.raw_user_meta_data->>'account_type', 'campus') = 'industry' then
    update public.industry_profiles
       set user_id = new.id
     where id = (
       select id
         from public.industry_profiles
        where lower(email) = lower(new.email)
          and user_id is null
        order by created_at
        limit 1
     )
    returning id into claimed;

    if claimed is null then
      insert into public.industry_profiles (user_id, full_name, email)
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email
      );
    end if;

    return new;
  end if;

  -- Campus branch — unchanged.
  if new.email !~* '@srmist\.edu\.in$' then
    raise exception 'Only @srmist.edu.in accounts can sign up';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$;
