-- Migration 002 — workflow fixes
-- Run once in the Supabase SQL editor. Safe to re-run (all steps are guarded).
--
-- What changes:
--   1. Events span date ranges (start_date + end_date) instead of one date.
--   2. past_events records WHICH industry contact attended and in what role,
--      so the industry directory and the events list stay in sync.
--   3. industry_requests get an accept/reject status.
--   4. industry_past_events is dropped — past_events.industry_id replaces it,
--      so an event is entered once instead of twice.

-- ── 1 + 2. past_events: date range, industry role ──────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'past_events' and column_name = 'event_date'
  ) then
    alter table past_events rename column event_date to start_date;
  end if;
end $$;

alter table past_events add column if not exists end_date date;
alter table past_events add column if not exists industry_role text;  -- judge / chief guest / sponsor

-- ── 1. requirements: date range + who ended up fulfilling it ───────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'requirements' and column_name = 'event_date'
  ) then
    alter table requirements rename column event_date to start_date;
  end if;
end $$;

alter table requirements add column if not exists end_date date;
alter table requirements
  add column if not exists fulfilled_by uuid references industry_profiles (id) on delete set null;

-- ── 3. industry_requests: accept / reject workflow ─────────────────────────
do $$
begin
  create type request_status as enum ('sent', 'accepted', 'rejected');
exception
  when duplicate_object then null;
end $$;

alter table industry_requests
  add column if not exists status request_status not null default 'sent';
alter table industry_requests add column if not exists event_name text;

-- ── 4. Retire the duplicate table ──────────────────────────────────────────
-- Its rows were free text with no link to the real event; past_events.industry_id
-- now carries the same information without double entry. Dropping the table
-- drops its RLS policies too.
drop table if exists industry_past_events;
