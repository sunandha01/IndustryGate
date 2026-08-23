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
  added_by uuid not null references profiles (id) on delete set null,
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
begin
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
create policy "profiles_select" on profiles for select to authenticated using (true);
create policy "profiles_update_own" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- industry_profiles: anyone can read; only faculty/authorized club members
-- can add, and only the person who added it (or faculty) can edit/remove.
create policy "industry_profiles_select" on industry_profiles for select to authenticated using (true);
create policy "industry_profiles_insert" on industry_profiles for insert to authenticated
  with check (added_by = auth.uid() and can_post());
create policy "industry_profiles_update" on industry_profiles for update to authenticated
  using (added_by = auth.uid() or is_faculty());
create policy "industry_profiles_delete" on industry_profiles for delete to authenticated
  using (added_by = auth.uid() or is_faculty());

create policy "industry_requests_select" on industry_requests for select to authenticated using (true);
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
