-- Migration: league_join_open (applied 2026-06-29 to project zvuqmagfpdyrrzyjntue)
-- Adds an `is_open` joinability flag to leagues and server-authoritative
-- join_league / leave_league RPCs (participant unit = group). Reads stay on the
-- existing authenticated SELECT policy; writes go only through these SECURITY
-- DEFINER functions (anon EXECUTE revoked).

alter table public.leagues
  add column if not exists is_open boolean not null default false;

create or replace function public.join_league(p_league_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
  v_status text;
  v_open boolean;
  v_scope text;
  v_inserted int;
begin
  v_group := public.current_group_id();
  if v_group is null then
    raise exception 'no group affiliation';
  end if;

  select status, is_open, scope into v_status, v_open, v_scope
  from public.leagues where id = p_league_id;
  if not found then
    raise exception 'league not found: %', p_league_id;
  end if;
  if v_scope <> 'group' then
    raise exception 'league is not group-scoped';
  end if;
  if not v_open or v_status not in ('upcoming', 'active') then
    raise exception 'league not open for joining';
  end if;

  insert into public.league_participants (league_id, competitor_kind, competitor_id)
  values (p_league_id, 'group', v_group)
  on conflict (league_id, competitor_kind, competitor_id) do nothing;
  get diagnostics v_inserted = row_count;
  return case when v_inserted > 0 then 'joined' else 'already' end;
end;
$$;

create or replace function public.leave_league(p_league_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
  v_status text;
  v_deleted int;
begin
  v_group := public.current_group_id();
  if v_group is null then
    raise exception 'no group affiliation';
  end if;

  select status into v_status from public.leagues where id = p_league_id;
  if not found then
    raise exception 'league not found: %', p_league_id;
  end if;
  if v_status = 'finalized' then
    raise exception 'cannot leave a finalized league';
  end if;

  delete from public.league_participants
  where league_id = p_league_id
    and competitor_kind = 'group'
    and competitor_id = v_group;
  get diagnostics v_deleted = row_count;
  return case when v_deleted > 0 then 'left' else 'absent' end;
end;
$$;

-- Revoke from PUBLIC (anon inherits the default PUBLIC EXECUTE grant; revoking
-- from anon alone leaves it executable), then grant only authenticated.
revoke execute on function public.join_league(text) from public;
revoke execute on function public.leave_league(text) from public;
grant execute on function public.join_league(text) to authenticated;
grant execute on function public.leave_league(text) to authenticated;
