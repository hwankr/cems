-- Operational demo migration for ordered QR checkpoint sequences.
-- Applied to the live `cems` Supabase project for the presentation demo.
--
-- Model:
-- - checkpoint_steps are scanned in order.
-- - Intermediate steps only record progress.
-- - The final step awards one existing-style mission completion + point event
--   through `reward_mission_code`, so goals/history/character progression keep
--   using the existing point pipeline.

create table if not exists public.checkpoint_routes (
  id text primary key,
  title text not null,
  reward_mission_code text not null references public.missions (code),
  reward_points int not null check (reward_points >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.checkpoint_steps (
  code text primary key,
  route_id text not null references public.checkpoint_routes (id) on delete cascade,
  step_order int not null check (step_order > 0),
  title text not null,
  location_label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (route_id, step_order)
);

create table if not exists public.checkpoint_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  route_id text not null references public.checkpoint_routes (id) on delete cascade,
  step_code text not null references public.checkpoint_steps (code),
  step_order int not null check (step_order > 0),
  day date not null,
  created_at timestamptz not null default now(),
  unique (user_id, route_id, day, step_order)
);

create index if not exists checkpoint_scans_user_route_day_idx
  on public.checkpoint_scans (user_id, route_id, day);

create index if not exists checkpoint_routes_reward_mission_code_idx
  on public.checkpoint_routes (reward_mission_code);

create index if not exists checkpoint_scans_route_id_idx
  on public.checkpoint_scans (route_id);

create index if not exists checkpoint_scans_step_code_idx
  on public.checkpoint_scans (step_code);

alter table public.checkpoint_routes enable row level security;
alter table public.checkpoint_steps enable row level security;
alter table public.checkpoint_scans enable row level security;

grant select on public.checkpoint_routes to authenticated;
grant select on public.checkpoint_steps to authenticated;
grant select on public.checkpoint_scans to authenticated;

drop policy if exists "checkpoint routes readable" on public.checkpoint_routes;
create policy "checkpoint routes readable" on public.checkpoint_routes
  for select to authenticated using (true);

drop policy if exists "checkpoint steps readable" on public.checkpoint_steps;
create policy "checkpoint steps readable" on public.checkpoint_steps
  for select to authenticated using (true);

drop policy if exists "own checkpoint scans select" on public.checkpoint_scans;
create policy "own checkpoint scans select" on public.checkpoint_scans
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.complete_checkpoint_step(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_route_id text;
  v_step_order int;
  v_reward_code text;
  v_reward_points int;
  v_total_steps int;
  v_scanned_previous int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select s.route_id, s.step_order, r.reward_mission_code, r.reward_points
    into v_route_id, v_step_order, v_reward_code, v_reward_points
    from public.checkpoint_steps s
    join public.checkpoint_routes r on r.id = s.route_id
    where s.code = p_code
      and s.active is true
      and r.active is true;

  if v_route_id is null then return 'invalid'; end if;

  if exists (
    select 1 from public.mission_completions
    where user_id = v_user
      and mission_code = v_reward_code
      and day = v_day
  ) then
    return 'already';
  end if;

  select count(*)::int into v_total_steps
    from public.checkpoint_steps
    where route_id = v_route_id
      and active is true;

  if exists (
    select 1 from public.checkpoint_scans
    where user_id = v_user
      and route_id = v_route_id
      and day = v_day
      and step_order = v_step_order
  ) then
    return 'already-step';
  end if;

  if v_step_order > 1 then
    select count(*)::int into v_scanned_previous
      from public.checkpoint_scans
      where user_id = v_user
        and route_id = v_route_id
        and day = v_day
        and step_order < v_step_order;

    if v_scanned_previous <> v_step_order - 1 then
      return 'out-of-order';
    end if;
  end if;

  insert into public.checkpoint_scans (user_id, route_id, step_code, step_order, day)
  values (v_user, v_route_id, p_code, v_step_order, v_day);

  if v_step_order < v_total_steps then
    return 'step';
  end if;

  begin
    insert into public.mission_completions (user_id, mission_code, day)
    values (v_user, v_reward_code, v_day);
  exception when unique_violation then
    return 'already';
  end;

  insert into public.point_events (user_id, points, reason, period_label)
  values (v_user, v_reward_points, 'qr:' || v_reward_code, to_char(v_day, 'YYYY-MM-DD'))
  on conflict (user_id, reason, period_label) do nothing;

  return 'completed';
end;
$$;

revoke all on function public.complete_checkpoint_step(text) from public;
revoke execute on function public.complete_checkpoint_step(text) from anon;
grant execute on function public.complete_checkpoint_step(text) to authenticated;

insert into public.missions (code, points, category, active) values
  ('main-gate-route', 100, 'checkpoint', false)
on conflict (code) do update
  set points = excluded.points,
      category = excluded.category,
      active = excluded.active;

insert into public.checkpoint_routes (id, title, reward_mission_code, reward_points, active)
values ('main-gate-route', '정문 에너지 루트', 'main-gate-route', 100, true)
on conflict (id) do update
  set title = excluded.title,
      reward_mission_code = excluded.reward_mission_code,
      reward_points = excluded.reward_points,
      active = excluded.active;

insert into public.checkpoint_steps (code, route_id, step_order, title, location_label, active) values
  ('main-gate-1', 'main-gate-route', 1, '정문 체크포인트 1', '정문 진입로', true),
  ('main-gate-2', 'main-gate-route', 2, '정문 체크포인트 2', '정문 중앙 광장', true),
  ('main-gate-3', 'main-gate-route', 3, '정문 체크포인트 3', '정문 캠퍼스 안쪽', true)
on conflict (code) do update
  set route_id = excluded.route_id,
      step_order = excluded.step_order,
      title = excluded.title,
      location_label = excluded.location_label,
      active = excluded.active;
