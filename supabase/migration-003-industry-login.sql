-- Migration 003 — industry professional logins
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Industry professionals get their own auth account, separate from the campus
-- (@srmist.edu.in) student/faculty flow, which is left exactly as it was.
--
-- IMPORTANT: this also tightens the read policies. Until now every table was
-- readable by any signed-in user (`using (true)`), which was fine when the only
-- accounts were campus staff. Now that outsiders can log in, an industry account
-- would otherwise be able to read every student's phone number and every other
-- contact's rates. Campus users keep the access they had.

-- ── 1. Give industry contacts an optional auth identity ────────────────────
alter table industry_profiles
  add column if not exists user_id uuid unique references auth.users (id) on delete set null;

-- Self-registered professionals have nobody who "added" them.
-- (The old `not null` also contradicted its own `on delete set null`.)
alter table industry_profiles alter column added_by drop not null;

-- ── 2. Sign-up routing ─────────────────────────────────────────────────────
-- account_type='industry' in the sign-up metadata takes the industry branch.
-- Anything else (including no metadata at all) takes the original campus branch,
-- so the existing student/faculty flow is untouched.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  claimed uuid;
begin
  if coalesce(new.raw_user_meta_data->>'account_type', 'campus') = 'industry' then
    -- If faculty already added this person as a contact, they claim that row
    -- so their existing event history and requests carry over.
    update public.industry_profiles
       set user_id = new.id
     where lower(email) = lower(new.email)
       and user_id is null
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

-- ── 3. Helpers ─────────────────────────────────────────────────────────────
create or replace function public.is_campus()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.my_industry_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.industry_profiles where user_id = auth.uid();
$$;

-- ── 4. Tighten reads now that outsiders can sign in ────────────────────────
-- The student/faculty directory is campus-only.
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select to authenticated
  using (is_campus());

-- Campus users browse the whole directory; an industry user sees only themselves.
drop policy if exists "industry_profiles_select" on industry_profiles;
create policy "industry_profiles_select" on industry_profiles for select to authenticated
  using (is_campus() or user_id = auth.uid());

-- Professionals may edit their own basic information.
-- The `with check` stops them reassigning the row to a different auth account.
drop policy if exists "industry_profiles_update" on industry_profiles;
create policy "industry_profiles_update" on industry_profiles for update to authenticated
  using (is_faculty() or added_by = auth.uid() or user_id = auth.uid())
  with check (is_campus() or user_id = auth.uid());

-- A professional sees the requests addressed to them, and nobody else's.
drop policy if exists "industry_requests_select" on industry_requests;
create policy "industry_requests_select" on industry_requests for select to authenticated
  using (is_campus() or industry_id = my_industry_id());

-- past_events and requirements stay readable by everyone signed in: they are
-- the event history and the "what we need" feed that professionals are here for.
