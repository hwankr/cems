-- Add winner-emblem gating to save_estate (applied to zvuqmagfpdyrrzyjntue, 2026-06-28).
-- A placed 'award-emblem-<tier>' item is only allowed if the estate's owning
-- group actually holds that tier's team award in some finalized league. Closes
-- the cosmetic cheat for emblems specifically (other items' cost legality stays
-- a documented MVP limitation). Body is otherwise identical to the
-- harden_economy_server_authoritative version.
create or replace function public.save_estate(
  p_subject_id text,
  p_snapshot jsonb,
  p_expected_version int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_group text;
  v_owner text;
  v_current_version int;
  v_spend numeric := 0;
  v_pool int;
  tx jsonb;
  v_delta numeric;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select group_id into v_group from public.profiles where id = v_user;
  if v_group is null then raise exception 'no profile'; end if;

  select owner_group_id into v_owner from public.estate_subjects where subject_id = p_subject_id;
  v_owner := coalesce(v_owner, v_group);
  if v_owner <> v_group then
    raise exception 'subject % is owned by another group', p_subject_id;
  end if;

  if (p_snapshot->>'subjectId') is distinct from p_subject_id then
    raise exception 'snapshot subjectId mismatch';
  end if;

  -- Winner-emblem gating: any placed award emblem requires the owning group to
  -- hold that tier's team award.
  for tx in select * from jsonb_array_elements(coalesce(p_snapshot->'items', '[]'::jsonb))
  loop
    if (tx->>'definitionId') like 'award-emblem-%' then
      if not exists (
        select 1 from public.league_awards la
        where la.award_type = 'team'
          and la.competitor_id = v_owner
          and la.tier = split_part(tx->>'definitionId', '-', 3)
      ) then
        raise exception 'estate not awarded emblem %', tx->>'definitionId';
      end if;
    end if;
  end loop;

  for tx in select * from jsonb_array_elements(coalesce(p_snapshot->'transactions', '[]'::jsonb))
  loop
    v_delta := (tx->>'pointDelta')::numeric;
    if v_delta > 0 then
      raise exception 'positive transaction delta not allowed';
    end if;
    v_spend := v_spend + abs(v_delta);
  end loop;

  select coalesce(sum(points), 0) into v_pool
  from public.point_events
  where user_id in (select id from public.profiles where group_id = v_owner);

  if v_spend > v_pool then
    raise exception 'estate spend % exceeds group pool %', v_spend, v_pool;
  end if;

  select version into v_current_version from public.estates where subject_id = p_subject_id;
  if v_current_version is not null
     and p_expected_version is not null
     and v_current_version <> p_expected_version then
    raise exception 'conflict: estate was modified (current %, expected %)',
      v_current_version, p_expected_version;
  end if;

  insert into public.estates (subject_id, owner_group_id, snapshot, version, updated_at)
  values (p_subject_id, v_owner, p_snapshot, 1, now())
  on conflict (subject_id) do update
    set snapshot = excluded.snapshot,
        owner_group_id = excluded.owner_group_id,
        version = public.estates.version + 1,
        updated_at = now()
  returning version into v_current_version;

  return v_current_version;
end;
$$;
revoke all on function public.save_estate(text, jsonb, int) from public;
revoke execute on function public.save_estate(text, jsonb, int) from anon;
grant execute on function public.save_estate(text, jsonb, int) to authenticated;
