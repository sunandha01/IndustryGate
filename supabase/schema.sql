-- SRM Industry Mentor Portal — schema + RLS
-- Run this once in the Supabase SQL editor (or `supabase db push`).

create extension if not exists "pgcrypto";

create type user_role as enum ('student', 'faculty');
create type requirement_status as enum ('open', 'fulfilled', 'closed');
create type request_status as enum ('sent', 'accepted', 'rejected');

-- ── Profiles (students & faculty) ──────────────────────────────────────────
-- One row per auth.users row, created automatically by handle_new_user().
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'student',
  full_name text not null,
  email text not null,
  linkedin_url text,
  phone text,
  domain text,                 -- area of work, e.g. "AI/ML", "Web Dev", "Robotics"
  department text,
  experience text,             -- freeform blurb; SRM staff-finder fetch is a manual copy-paste for now
  is_club_authorized boolean not null default false,   -- faculty grants this to let a student post on the club's behalf
  authorized_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- ── Industry contacts (manually entered — industry people don't use the app) ─
create table industry_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,  -- set when they sign in themselves
  full_name text not null,
  designation text,
  company text,
  education text,
  linkedin_url text,
  email text,
  phone text,
  domains text[] not null default '{}',
  min_cost numeric,            -- minimum they charge, if known
  notes text,
  added_by uuid references profiles (id) on delete set null,  -- null when self-registered
  created_at timestamptz not null default now()
);

-- Industry person's own ask, logged on their behalf by a student/faculty.
-- Accepting one mirrors it into `requirements` as a fulfilled post and emails them.
create table industry_requests (
  id uuid primary key default gen_random_uuid(),
  industry_id uuid not null references industry_profiles (id) on delete cascade,
  logged_by uuid not null references profiles (id) on delete cascade,
  domain text not null,
  event_name text,
  amount numeric,
  notes text,
  status request_status not null default 'sent',
  created_at timestamptz not null default now()
);

-- ── Events run by the college ───────────────────────────────────────────────
-- Past events: the "what we've already run" feed (like a closed job posting).
create table past_events (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid not null references profiles (id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,               -- events can run more than one day
  domain text not null,
  prize_pool numeric,
  sponsorship_details text,
  industry_id uuid references industry_profiles (id) on delete set null,
  industry_role text,          -- judge / chief guest / sponsor
  industry_person_name text,   -- freeform fallback if not in the directory yet
  industry_company text,
  notes text,
  created_at timestamptz not null default now()
);

-- Current requirement: the "wanted" posting — what this event still needs.
create table requirements (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid not null references profiles (id) on delete cascade,
  domain text not null,
  start_date date,
  end_date date,
  sponsorship_needed text,
  prize_pool numeric,
  offer_amount numeric,        -- what the college is offering the industry person
  description text,
  status requirement_status not null default 'open',
  fulfilled_by uuid references industry_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── Sign-up gate + auto profile creation ────────────────────────────────────
-- Why: only srmist.edu.in accounts should ever get a profile — this is the
-- single choke point every sign-up path (magic link, OAuth, etc.) goes through.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  claimed uuid;
begin
  -- Industry professionals sign up through their own page, which sets
  -- account_type='industry'. They are not bound to the srmist.edu.in domain.
  if coalesce(new.raw_user_meta_data->>'account_type', 'campus') = 'industry' then
    -- Claim the contact row faculty already created for this email, if any,
    -- so their event history and requests carry over.
    -- Exactly one row: two contacts can share an email, and claiming both
    -- would set the same user_id twice and trip its unique constraint.
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Why: without this, any signed-in student could PATCH their own row to
-- role='faculty' or is_club_authorized=true directly via the client.
create or replace function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- auth.uid() is null for direct dashboard/SQL-editor edits (no app session) —
  -- only guard against a logged-in student self-promoting through the app itself.
  if auth.uid() is not null and not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'faculty'
  ) then
    new.role := old.role;
    new.is_club_authorized := old.is_club_authorized;
    new.authorized_by := old.authorized_by;
  end if;
  return new;
end;
$$;

create trigger enforce_profile_privileged_fields
  before update on profiles
  for each row execute function public.guard_profile_privileged_fields();

-- Helper predicates used across RLS policies below.
create or replace function public.is_faculty()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'faculty');
$$;

-- A campus account (student or faculty) as opposed to an industry professional.
create or replace function public.is_campus()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.my_industry_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.industry_profiles where user_id = auth.uid();
$$;

-- Why: the whole point of this portal is that reaching out isn't limited to
-- "whoever has the contact" — but it's still gated to faculty and the
-- club members a faculty member has explicitly authorized, not every student.
create or replace function public.can_post()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (role = 'faculty' or is_club_authorized)
  );
$$;

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table industry_profiles enable row level security;
alter table industry_requests enable row level security;
alter table past_events enable row level security;
alter table requirements enable row level security;

-- profiles: everyone signed in can browse the directory; you can only edit
-- your own row, and guard_profile_privileged_fields() strips any privilege
-- escalation out of that update before it lands.
-- Campus-only: an industry professional has no business reading the
-- student/faculty directory (phone numbers, departments, and so on).
create policy "profiles_select" on profiles for select to authenticated using (is_campus());
create policy "profiles_update_own" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- industry_profiles: anyone can read; only faculty/authorized club members
-- can add, and only the person who added it (or faculty) can edit/remove.
-- Campus users browse the directory; a professional sees only their own row.
create policy "industry_profiles_select" on industry_profiles for select to authenticated
  using (is_campus() or user_id = auth.uid());
create policy "industry_profiles_insert" on industry_profiles for insert to authenticated
  with check (added_by = auth.uid() and can_post());
-- The `with check` stops a professional reassigning their row to another account.
create policy "industry_profiles_update" on industry_profiles for update to authenticated
  using (is_faculty() or added_by = auth.uid() or user_id = auth.uid())
  with check (is_campus() or user_id = auth.uid());
create policy "industry_profiles_delete" on industry_profiles for delete to authenticated
  using (added_by = auth.uid() or is_faculty());

-- A professional sees the requests addressed to them, and nobody else's.
create policy "industry_requests_select" on industry_requests for select to authenticated
  using (is_campus() or industry_id = my_industry_id());
create policy "industry_requests_insert" on industry_requests for insert to authenticated
  with check (logged_by = auth.uid() and can_post());
create policy "industry_requests_update" on industry_requests for update to authenticated
  using (logged_by = auth.uid() or is_faculty());
create policy "industry_requests_delete" on industry_requests for delete to authenticated
  using (logged_by = auth.uid() or is_faculty());

-- past_events / requirements: same read-all / gated-write shape.
create policy "past_events_select" on past_events for select to authenticated using (true);
create policy "past_events_insert" on past_events for insert to authenticated
  with check (posted_by = auth.uid() and can_post());
create policy "past_events_update" on past_events for update to authenticated
  using (posted_by = auth.uid() or is_faculty());
create policy "past_events_delete" on past_events for delete to authenticated
  using (posted_by = auth.uid() or is_faculty());

create policy "requirements_select" on requirements for select to authenticated using (true);
create policy "requirements_insert" on requirements for insert to authenticated
  with check (posted_by = auth.uid() and can_post());
create policy "requirements_update" on requirements for update to authenticated
  using (posted_by = auth.uid() or is_faculty());
create policy "requirements_delete" on requirements for delete to authenticated
  using (posted_by = auth.uid() or is_faculty());

-- The professional answers a request raised by faculty.
--
-- When the professional answers a request we now email the faculty member who
-- raised it. An industry account cannot read `profiles` (RLS is_campus()), so
-- the SECURITY DEFINER function hands back just the two fields needed for that
-- one email rather than opening the table up.
--
create function public.respond_to_request(
  request_id uuid,
  new_status request_status
)
returns table (
  r_domain text,
  r_event_name text,
  r_amount numeric,
  r_email text,
  r_full_name text,
  r_faculty_email text,
  r_faculty_name text
)
language plpgsql
security definer set search_path = public
as $$
declare
  req public.industry_requests;
  mine uuid;
begin
  select id into mine from public.industry_profiles where user_id = auth.uid();
  if mine is null then
    raise exception 'Only the industry professional can answer a request';
  end if;

  select * into req from public.industry_requests where id = request_id;
  if req.id is null or req.industry_id <> mine then
    raise exception 'Request not found';
  end if;
  if req.status <> 'sent' then
    raise exception 'This request has already been answered';
  end if;

  update public.industry_requests set status = new_status where id = request_id;

  if new_status = 'accepted' then
    insert into public.requirements
      (posted_by, domain, offer_amount, description, status, fulfilled_by)
    values (
      req.logged_by,            -- credited to the faculty member who raised it
      req.domain,
      req.amount,
      coalesce('Confirmed for ' || req.event_name, 'Confirmed from an industry request'),
      'fulfilled',
      mine
    );
  end if;

  return query
    select req.domain, req.event_name, req.amount,
           ip.email, ip.full_name,
           p.email, p.full_name
      from public.industry_profiles ip
      join public.profiles p on p.id = req.logged_by
     where ip.id = mine;
end;
$$;

grant execute on function public.respond_to_request(uuid, request_status) to authenticated;
