-- Migration 006 — return the requesting faculty's contact details
--
-- When the professional answers a request we now email the faculty member who
-- raised it. An industry account cannot read `profiles` (RLS is_campus()), so
-- the SECURITY DEFINER function hands back just the two fields needed for that
-- one email rather than opening the table up.
--
-- The return type changes, so the old function has to be dropped first.
drop function if exists public.respond_to_request(uuid, request_status);

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
