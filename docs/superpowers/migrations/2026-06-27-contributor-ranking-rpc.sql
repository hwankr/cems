-- Migration: contributor_ranking_rpc (applied 2026-06-27 to project zvuqmagfpdyrrzyjntue)
-- Building contributor ranking preview.
-- Leaderboard-scoped SECURITY DEFINER RPC: for each estate subject, returns the
-- top-N members (by cumulative point_events.points) of the group that operates
-- the subject. Exposes only a non-sensitive projection (display_name + points +
-- rank + is_me) to any authenticated caller, deliberately crossing the
-- same-group RLS boundary because the map lets a user click any building.

create or replace function public.get_subject_contributor_rankings(p_limit int default 5)
returns table (
  subject_id text,
  user_id uuid,
  display_name text,
  points int,
  rank int,
  is_me boolean
)
language sql
security definer
stable
set search_path = public
as $$
  with member_points as (
    select
      es.subject_id,
      p.id as user_id,
      p.display_name,
      coalesce(sum(pe.points), 0)::int as points
    from public.estate_subjects es
    join public.profiles p on p.group_id = es.owner_group_id
    left join public.point_events pe on pe.user_id = p.id
    group by es.subject_id, p.id, p.display_name
  ),
  ranked as (
    select
      mp.*,
      row_number() over (
        partition by mp.subject_id
        order by mp.points desc, mp.display_name asc
      )::int as rank
    from member_points mp
  )
  select
    r.subject_id,
    r.user_id,
    r.display_name,
    r.points,
    r.rank,
    (r.user_id = auth.uid()) as is_me
  from ranked r
  where r.rank <= p_limit
  order by r.subject_id, r.rank;
$$;

revoke all on function public.get_subject_contributor_rankings(int) from public;
grant execute on function public.get_subject_contributor_rankings(int) to authenticated;
revoke execute on function public.get_subject_contributor_rankings(int) from anon;

comment on function public.get_subject_contributor_rankings(int) is
  'Returns top-N members (display_name + total points + rank + is_me) of the group operating each estate subject, for any authenticated caller. SECURITY DEFINER deliberately exposes a name+points leaderboard projection across groups for the building contributor preview. EXECUTE revoked from anon.';
