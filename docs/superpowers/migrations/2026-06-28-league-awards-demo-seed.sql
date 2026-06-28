-- Demo league for the awards system (applied to zvuqmagfpdyrrzyjntue, 2026-06-28).
-- Window = 2026-05 so the June +1,000,000 manual top-up (it@naver.com) and the
-- June guest contribution seed are OUTSIDE the scoring window and do not distort
-- the per-capita average. Balanced May points produce a clean podium with
-- student-services #1 (gold) and it1 the #1 student, so the logged-in demo
-- account sees its building lit gold, its top-student badge, and (Plan C) the
-- gold emblem. Idempotent: fixed league id + ON CONFLICT on point_events.
--
-- Members confirmed live (2026-06-28): engineering=6 (게스트1~6),
-- humanities=5 (게스트7~11), student-services=5 (it1 + 게스트12~15).
-- it1 user id = 96573000-4365-443f-816e-ba93bb5154d0 (it@naver.com).

insert into public.leagues
  (id, name, scope, school_id, starts_at, ends_at, status, badge_winner_count)
values (
  'yu-college-2026-05',
  '영남대 단과대 에너지 절감 리그',
  'group', 'yeungnam',
  '2026-05-01T00:00:00+09:00', '2026-06-01T00:00:00+09:00',
  'upcoming', 3
)
on conflict (id) do update set
  name = excluded.name, scope = excluded.scope, school_id = excluded.school_id,
  starts_at = excluded.starts_at, ends_at = excluded.ends_at,
  badge_winner_count = excluded.badge_winner_count;

insert into public.league_participants (league_id, competitor_kind, competitor_id)
values
  ('yu-college-2026-05', 'group', 'engineering'),
  ('yu-college-2026-05', 'group', 'humanities'),
  ('yu-college-2026-05', 'group', 'student-services')
on conflict do nothing;

-- Balanced May points (reason 'seed:league-demo', period_label '2026-05',
-- created_at mid-May so they land in the window). Per-capita target:
--   student-services 6000/5 = 1200 (gold), it1 top (1600)
--   humanities       5500/5 = 1100 (silver)
--   engineering      6000/6 = 1000 (bronze)
insert into public.point_events (user_id, points, reason, period_label, created_at)
select v.user_id, v.points, 'seed:league-demo', '2026-05', '2026-05-15T12:00:00+09:00'
from (values
  -- student-services
  ('96573000-4365-443f-816e-ba93bb5154d0'::uuid, 1600),
  ('a0000000-0000-4000-8000-000000000012'::uuid, 1300),
  ('a0000000-0000-4000-8000-000000000013'::uuid, 1100),
  ('a0000000-0000-4000-8000-000000000014'::uuid, 1000),
  ('a0000000-0000-4000-8000-000000000015'::uuid, 1000),
  -- humanities
  ('a0000000-0000-4000-8000-000000000007'::uuid, 1300),
  ('a0000000-0000-4000-8000-000000000008'::uuid, 1200),
  ('a0000000-0000-4000-8000-000000000009'::uuid, 1100),
  ('a0000000-0000-4000-8000-000000000010'::uuid, 1000),
  ('a0000000-0000-4000-8000-000000000011'::uuid, 900),
  -- engineering
  ('a0000000-0000-4000-8000-000000000001'::uuid, 1200),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 1100),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 1050),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 950),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 900),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 800)
) as v(user_id, points)
on conflict (user_id, reason, period_label) do nothing;
