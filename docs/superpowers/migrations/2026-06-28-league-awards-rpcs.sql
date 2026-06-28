-- League awards RPCs (applied to project zvuqmagfpdyrrzyjntue, 2026-06-28).

-- Standings: per-capita average points over the league window, across ALL
-- participant groups. SECURITY DEFINER deliberately crosses the per-group
-- point_events RLS to compute a cross-group leaderboard (name + points + rank).
create or replace function public.get_league_standings(p_league_id text)
returns table (
  competitor_kind text,
  competitor_id text,
  competitor_name text,
  member_count int,
  total_points int,
  avg_points numeric,
  rank int
)
language sql
security definer
stable
set search_path = public
as $$
  with lg as (
    select starts_at, ends_at from public.leagues where id = p_league_id
  ),
  parts as (
    select competitor_kind, competitor_id
    from public.league_participants
    where league_id = p_league_id
  ),
  members as (
    select pa.competitor_kind, pa.competitor_id, pr.id as user_id
    from parts pa
    join public.profiles pr
      on pa.competitor_kind = 'group' and pr.group_id = pa.competitor_id
  ),
  scored as (
    select
      m.competitor_kind,
      m.competitor_id,
      count(distinct m.user_id) as member_count,
      coalesce(sum(pe.points), 0)::int as total_points
    from members m
    left join public.point_events pe
      on pe.user_id = m.user_id
     and pe.created_at >= (select starts_at from lg)
     and pe.created_at <  (select ends_at from lg)
    group by m.competitor_kind, m.competitor_id
  ),
  named as (
    select
      s.competitor_kind,
      s.competitor_id,
      coalesce(g.name, s.competitor_id) as competitor_name,
      s.member_count,
      s.total_points,
      case when s.member_count > 0
        then round(s.total_points::numeric / s.member_count, 2)
        else 0 end as avg_points
    from scored s
    left join public.groups g
      on s.competitor_kind = 'group' and g.id = s.competitor_id
  )
  select
    competitor_kind,
    competitor_id,
    competitor_name,
    member_count,
    total_points,
    avg_points,
    row_number() over (
      order by avg_points desc, total_points desc, competitor_id asc
    )::int as rank
  from named
  order by rank;
$$;
revoke all on function public.get_league_standings(text) from public;
revoke execute on function public.get_league_standings(text) from anon;
grant execute on function public.get_league_standings(text) to authenticated;
comment on function public.get_league_standings(text) is
  'Per-capita average points standings for a league, across all participant groups. SECURITY DEFINER leaderboard projection (name+points+rank). EXECUTE revoked from anon.';

-- Finalize: write podium team awards (gold/silver/bronze) + top-N student
-- awards from the gold group. OPERATOR-ONLY (EXECUTE revoked from authenticated
-- and anon; only service_role / MCP can run it). Idempotent.
create or replace function public.finalize_league(p_league_id text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge_n int;
  v_starts timestamptz;
  v_ends timestamptz;
  v_gold text;
  v_count int := 0;
  v_n int;
begin
  select badge_winner_count, starts_at, ends_at
    into v_badge_n, v_starts, v_ends
  from public.leagues where id = p_league_id;
  if not found then
    raise exception 'league % not found', p_league_id;
  end if;

  delete from public.league_awards where league_id = p_league_id;

  insert into public.league_awards
    (league_id, award_type, tier, competitor_kind, competitor_id, rank, metric_value)
  select
    p_league_id, 'team',
    (array['gold','silver','bronze'])[s.rank],
    s.competitor_kind, s.competitor_id, s.rank, s.avg_points
  from public.get_league_standings(p_league_id) s
  where s.rank <= 3;
  get diagnostics v_n = row_count;
  v_count := v_count + v_n;

  select competitor_id into v_gold
  from public.get_league_standings(p_league_id)
  where rank = 1;

  if v_gold is not null and v_badge_n > 0 then
    insert into public.league_awards
      (league_id, award_type, tier, user_id, rank, metric_value)
    select p_league_id, 'student', 'gold', t.user_id, t.rk, t.pts
    from (
      select
        pr.id as user_id,
        coalesce(sum(pe.points), 0)::int as pts,
        row_number() over (
          order by coalesce(sum(pe.points), 0) desc, pr.display_name asc
        ) as rk
      from public.profiles pr
      left join public.point_events pe
        on pe.user_id = pr.id
       and pe.created_at >= v_starts
       and pe.created_at <  v_ends
      where pr.group_id = v_gold
      group by pr.id, pr.display_name
    ) t
    where t.rk <= v_badge_n;
    get diagnostics v_n = row_count;
    v_count := v_count + v_n;
  end if;

  update public.leagues set status = 'finalized' where id = p_league_id;
  return v_count;
end;
$$;
revoke all on function public.finalize_league(text) from public;
revoke execute on function public.finalize_league(text) from anon, authenticated;
comment on function public.finalize_league(text) is
  'OPERATOR-ONLY (service_role/MCP). Writes podium team awards + top-N gold-team student awards for a league, then marks it finalized. Idempotent. EXECUTE revoked from anon and authenticated.';

-- Hall of fame read: a league's full award set (team podium + students) with
-- names. SECURITY DEFINER because winners' display_name spans groups (profiles
-- RLS is own-group only). Leaderboard projection: name + tier + rank only.
create or replace function public.get_league_awards(p_league_id text)
returns table (
  award_type text,
  tier text,
  rank int,
  competitor_id text,
  competitor_name text,
  user_id uuid,
  display_name text,
  metric_value numeric
)
language sql
security definer
stable
set search_path = public
as $$
  select
    la.award_type,
    la.tier,
    la.rank,
    la.competitor_id,
    coalesce(g.name, la.competitor_id) as competitor_name,
    la.user_id,
    pr.display_name,
    la.metric_value
  from public.league_awards la
  left join public.groups g on la.competitor_id = g.id
  left join public.profiles pr on la.user_id = pr.id
  where la.league_id = p_league_id
  order by la.award_type desc, la.rank;  -- 'team' before 'student'
$$;
revoke all on function public.get_league_awards(text) from public;
revoke execute on function public.get_league_awards(text) from anon;
grant execute on function public.get_league_awards(text) to authenticated;
comment on function public.get_league_awards(text) is
  'Returns a league''s team podium + student winners with names (leaderboard projection). SECURITY DEFINER crosses profiles RLS for cross-group winner names. EXECUTE revoked from anon.';
