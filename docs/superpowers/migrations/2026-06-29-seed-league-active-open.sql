-- Seed (applied 2026-06-29 to project zvuqmagfpdyrrzyjntue) — demo leagues for
-- the /leagues hub. Idempotent.
--
-- IMPORTANT (verified against live data): all current point_events are dated
-- 2026-05-15 (the old finalized league) and 2026-06-29 (the 1,000,000 demo
-- top-up + presentation/contributor seeds). To keep the active league's
-- per-capita averages realistic, its window starts 2026-06-30 — AFTER all that
-- bulk data — and the balanced seed below is dated 2026-06-30 so it is the ONLY
-- data scored. avg = total/member_count and every member of a group gets the
-- same flat amount, so team avg == that amount: student-services 220 >
-- humanities 200 > engineering 180.

insert into public.leagues (id, name, scope, school_id, starts_at, ends_at, status, is_open, badge_winner_count)
values ('yu-energy-2026-summer', '영남대 여름 상시 에너지 리그', 'group', 'yeungnam',
        '2026-06-30T00:00:00+09:00', '2026-07-31T23:59:59+09:00', 'active', true, 3)
on conflict (id) do update set
  name=excluded.name, status=excluded.status, is_open=excluded.is_open,
  starts_at=excluded.starts_at, ends_at=excluded.ends_at;

insert into public.league_participants (league_id, competitor_kind, competitor_id) values
  ('yu-energy-2026-summer','group','student-services'),
  ('yu-energy-2026-summer','group','humanities'),
  ('yu-energy-2026-summer','group','engineering')
on conflict do nothing;

insert into public.point_events (user_id, points, reason, period_label, created_at)
select id, 220, 'seed:league-active', '2026-W27-ss', '2026-06-30T09:00:00+09:00'
from public.profiles where group_id='student-services'
on conflict (user_id, reason, period_label) do nothing;

insert into public.point_events (user_id, points, reason, period_label, created_at)
select id, 200, 'seed:league-active', '2026-W27-hu', '2026-06-30T09:00:00+09:00'
from public.profiles where group_id='humanities'
on conflict (user_id, reason, period_label) do nothing;

insert into public.point_events (user_id, points, reason, period_label, created_at)
select id, 180, 'seed:league-active', '2026-W27-en', '2026-06-30T09:00:00+09:00'
from public.profiles where group_id='engineering'
on conflict (user_id, reason, period_label) do nothing;

insert into public.leagues (id, name, scope, school_id, starts_at, ends_at, status, is_open, badge_winner_count)
values ('yu-open-2026-fall', '가을 신규 에너지 리그 (모집 중)', 'group', 'yeungnam',
        '2026-09-01T00:00:00+09:00', '2026-09-30T23:59:59+09:00', 'upcoming', true, 3)
on conflict (id) do update set
  name=excluded.name, status=excluded.status, is_open=excluded.is_open;

insert into public.league_participants (league_id, competitor_kind, competitor_id) values
  ('yu-open-2026-fall','group','engineering'),
  ('yu-open-2026-fall','group','humanities')
on conflict do nothing;
