-- Migration 007 — one event, one record
--
-- Requests are now linked to the requirement (the event) they were raised for.
-- A requirement can be sent to several mentors; when one accepts, THAT SAME
-- requirement flips from open to fulfilled instead of a second "fulfilled" row
-- being created next to the open one. The other pending requests are then
-- withdrawn automatically, whether the requirement was filled or closed.
--
-- Requests that were logged standalone (from a mentor's profile page) have no
-- requirement_id and behave exactly as before.

-- A request can be withdrawn when the event it belongs to is filled or closed.
alter type request_status add value if not exists 'withdrawn';

alter table industry_requests
  add column if not exists requirement_id uuid references requirements (id) on delete set null,
  add column if not exists start_date date,
  add column if not exists end_date date;

-- At most one request per mentor per event, so a double click or a retry can
-- never email the same person twice.
create unique index if not exists industry_requests_one_per_event
  on industry_requests (requirement_id, industry_id)
  where requirement_id is not null;

-- When a requirement stops being open (a mentor accepted, or someone closed it),
-- anyone still waiting on a reply is told it is no longer needed. SECURITY
-- DEFINER because the person closing it does not own every request.
create or replace function public.withdraw_pending_requests()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status = 'open' and new.status <> 'open' then
    update public.industry_requests
       set status = 'withdrawn'
     where requirement_id = new.id
       and status = 'sent';
  end if;
  return new;
end;
$$;

drop trigger if exists requirement_leaves_open on requirements;
create trigger requirement_leaves_open
  after update of status on requirements
  for each row execute function public.withdraw_pending_requests();

-- Same signature as before, so this replaces it in place.
create or replace function public.respond_to_request(
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
  filled uuid;
begin
  select id into mine from public.industry_profiles where user_id = auth.uid();
  if mine is null then
    raise exception 'Only the industry professional can answer a request';
  end if;

  select * into req from public.industry_requests where id = request_id;
  if req.id is null or req.industry_id <> mine then
    raise exception 'Request not found';
  end if;
  if req.status = 'withdrawn' then
    raise exception 'This opportunity is no longer available';
  end if;
  if req.status <> 'sent' then
    raise exception 'This request has already been answered';
  end if;

  if new_status = 'accepted' then
    if req.requirement_id is not null then
      -- Fill the posted requirement in place. The `status = 'open'` guard makes
      -- this atomic: if two mentors accept at once, exactly one gets it.
      update public.requirements
         set status = 'fulfilled', fulfilled_by = mine
       where id = req.requirement_id and status = 'open'
      returning id into filled;

      if filled is null then
        raise exception 'This opportunity has already been filled or closed';
      end if;
    else
      -- Standalone request: no posted requirement exists, so record one.
      insert into public.requirements
        (posted_by, domain, offer_amount, description, status, fulfilled_by)
      values (
        req.logged_by,
        req.domain,
        req.amount,
        coalesce('Confirmed for ' || req.event_name, 'Confirmed from an industry request'),
        'fulfilled',
        mine
      );
    end if;
  end if;

  -- Set last: the trigger above withdraws every pending request for the event,
  -- including this one, so this write has to win.
  update public.industry_requests set status = new_status where id = request_id;

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
