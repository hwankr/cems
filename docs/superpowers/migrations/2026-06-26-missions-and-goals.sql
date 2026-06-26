-- Applied to Supabase project `cems` (ref zvuqmagfpdyrrzyjntue) on 2026-06-26
-- via apply_migration name `missions_and_goals`.
--
-- Adds the QR mission point-earning loop and predefined daily/weekly goals.
-- All point grants stay server-authoritative: missions/goals write to
-- point_events only through SECURITY DEFINER RPCs; clients cannot insert.

-- ---- tables ----
create table public.missions (
  code text primary key,
  points int not null check (points >= 0),
  category text not null,
  active boolean not null default true
);
alter table public.missions enable row level security;
create policy "missions readable" on public.missions
  for select to authenticated using (true);

create table public.mission_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_code text not null references public.missions (code),
  day date not null,
  created_at timestamptz not null default now(),
  unique (user_id, mission_code, day)
);
create index mission_completions_user_idx on public.mission_completions (user_id);
alter table public.mission_completions enable row level security;
create policy "own mission completions select" on public.mission_completions
  for select to authenticated using (user_id = auth.uid());

create table public.goals (
  id text primary key,
  scope text not null check (scope in ('daily', 'weekly')),
  target_count int not null check (target_count > 0),
  bonus_points int not null check (bonus_points >= 0),
  active boolean not null default true
);
alter table public.goals enable row level security;
create policy "goals readable" on public.goals
  for select to authenticated using (true);

-- ---- seeds ----
insert into public.missions (code, points, category) values
  ('stairs', 50, 'stairs'),
  ('lights-off', 80, 'facility'),
  ('recycle', 40, 'waste'),
  ('eco-commute', 60, 'transport'),
  ('tumbler', 30, 'waste');

insert into public.goals (id, scope, target_count, bonus_points) values
  ('daily-1', 'daily', 1, 20),
  ('daily-3', 'daily', 3, 80),
  ('weekly-10', 'weekly', 10, 300);

-- ---- complete_mission: authoritative QR award, 1 per mission per day ----
create or replace function public.complete_mission(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_points int;
  v_active boolean;
  v_day date := (now() at time zone 'Asia/Seoul')::date;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select points, active into v_points, v_active
  from public.missions where code = p_code;
  if v_points is null or v_active is not true then return 'invalid'; end if;

  begin
    insert into public.mission_completions (user_id, mission_code, day)
    values (v_user, p_code, v_day);
  exception when unique_violation then
    return 'already';
  end;

  insert into public.point_events (user_id, points, reason, period_label)
  values (v_user, v_points, 'qr:' || p_code, to_char(v_day, 'YYYY-MM-DD'))
  on conflict (user_id, reason, period_label) do nothing;

  return 'completed';
end;
$$;
revoke all on function public.complete_mission(text) from public;
revoke execute on function public.complete_mission(text) from anon;
grant execute on function public.complete_mission(text) to authenticated;

-- ---- get_my_goal_progress: single source of truth for counts/labels ----
create or replace function public.get_my_goal_progress()
returns table(today_label text, week_label text, today_count int, week_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Seoul')::date;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  today_label := to_char(v_day, 'YYYY-MM-DD');
  week_label := to_char(v_day, 'IYYY-"W"IW');
  select count(*)::int into today_count
    from public.mission_completions
    where user_id = v_user and day = v_day;
  select count(*)::int into week_count
    from public.mission_completions
    where user_id = v_user
      and to_char(day, 'IYYY-"W"IW') = week_label;
  return next;
end;
$$;
revoke all on function public.get_my_goal_progress() from public;
revoke execute on function public.get_my_goal_progress() from anon;
grant execute on function public.get_my_goal_progress() to authenticated;

-- ---- claim_goal_reward: server recomputes eligibility, idempotent ----
create or replace function public.claim_goal_reward(p_goal_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_scope text;
  v_target int;
  v_bonus int;
  v_active boolean;
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_count int;
  v_period text;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select scope, target_count, bonus_points, active
    into v_scope, v_target, v_bonus, v_active
    from public.goals where id = p_goal_id;
  if v_scope is null or v_active is not true then return 'not-met'; end if;

  if v_scope = 'daily' then
    v_period := to_char(v_day, 'YYYY-MM-DD');
    select count(*)::int into v_count
      from public.mission_completions
      where user_id = v_user and day = v_day;
  else
    v_period := to_char(v_day, 'IYYY-"W"IW');
    select count(*)::int into v_count
      from public.mission_completions
      where user_id = v_user
        and to_char(day, 'IYYY-"W"IW') = v_period;
  end if;

  if v_count < v_target then return 'not-met'; end if;

  begin
    insert into public.point_events (user_id, points, reason, period_label)
    values (v_user, v_bonus, 'goal:' || p_goal_id, v_period);
  exception when unique_violation then
    return 'already';
  end;

  return 'claimed';
end;
$$;
revoke all on function public.claim_goal_reward(text) from public;
revoke execute on function public.claim_goal_reward(text) from anon;
grant execute on function public.claim_goal_reward(text) to authenticated;
