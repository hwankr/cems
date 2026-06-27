-- Seed: demo guest contributors (applied 2026-06-27 to project zvuqmagfpdyrrzyjntue via execute_sql)
-- 15 guests across engineering / humanities / student-services so the 6 mapped
-- estate subjects show populated rankings in the building popup contributor tab.
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING.
--
-- NOTE: this writes to the LIVE Supabase DB. Guest point_events raise their
-- group's pooled points (and the student-services estate budget) by a modest,
-- intentional amount. Guest totals are far below the it@naver.com (it1) top-up
-- so that account stays rank 1 in its own building (yu-b04, 중앙도서관).
-- auth.users resilience check (2026-06-27): the only NOT NULL column without a
-- default is `id`, which the insert provides; all other columns default.

-- 1) auth.users (profiles.id FKs to auth.users.id, so insert these first).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  v.id, 'authenticated', 'authenticated', v.email,
  crypt('cems-demo-guest', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', v.display_name)
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'guest1@cems.demo',  '게스트 1'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'guest2@cems.demo',  '게스트 2'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'guest3@cems.demo',  '게스트 3'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'guest4@cems.demo',  '게스트 4'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'guest5@cems.demo',  '게스트 5'),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 'guest6@cems.demo',  '게스트 6'),
  ('a0000000-0000-4000-8000-000000000007'::uuid, 'guest7@cems.demo',  '게스트 7'),
  ('a0000000-0000-4000-8000-000000000008'::uuid, 'guest8@cems.demo',  '게스트 8'),
  ('a0000000-0000-4000-8000-000000000009'::uuid, 'guest9@cems.demo',  '게스트 9'),
  ('a0000000-0000-4000-8000-000000000010'::uuid, 'guest10@cems.demo', '게스트 10'),
  ('a0000000-0000-4000-8000-000000000011'::uuid, 'guest11@cems.demo', '게스트 11'),
  ('a0000000-0000-4000-8000-000000000012'::uuid, 'guest12@cems.demo', '게스트 12'),
  ('a0000000-0000-4000-8000-000000000013'::uuid, 'guest13@cems.demo', '게스트 13'),
  ('a0000000-0000-4000-8000-000000000014'::uuid, 'guest14@cems.demo', '게스트 14'),
  ('a0000000-0000-4000-8000-000000000015'::uuid, 'guest15@cems.demo', '게스트 15')
) as v(id, email, display_name)
on conflict (id) do nothing;

-- 2) profiles (school_id derived from the group's school).
insert into public.profiles (id, display_name, school_id, group_id)
select v.id, v.display_name, g.school_id, v.group_id
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, '게스트 1',  'engineering'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, '게스트 2',  'engineering'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, '게스트 3',  'engineering'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, '게스트 4',  'engineering'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, '게스트 5',  'engineering'),
  ('a0000000-0000-4000-8000-000000000006'::uuid, '게스트 6',  'engineering'),
  ('a0000000-0000-4000-8000-000000000007'::uuid, '게스트 7',  'humanities'),
  ('a0000000-0000-4000-8000-000000000008'::uuid, '게스트 8',  'humanities'),
  ('a0000000-0000-4000-8000-000000000009'::uuid, '게스트 9',  'humanities'),
  ('a0000000-0000-4000-8000-000000000010'::uuid, '게스트 10', 'humanities'),
  ('a0000000-0000-4000-8000-000000000011'::uuid, '게스트 11', 'humanities'),
  ('a0000000-0000-4000-8000-000000000012'::uuid, '게스트 12', 'student-services'),
  ('a0000000-0000-4000-8000-000000000013'::uuid, '게스트 13', 'student-services'),
  ('a0000000-0000-4000-8000-000000000014'::uuid, '게스트 14', 'student-services'),
  ('a0000000-0000-4000-8000-000000000015'::uuid, '게스트 15', 'student-services')
) as v(id, display_name, group_id)
join public.groups g on g.id = v.group_id
on conflict (id) do nothing;

-- 3) point_events (one row per guest; id defaults to gen_random_uuid()).
insert into public.point_events (user_id, points, reason, period_label)
select v.id, v.points, 'seed:demo-contribution', '2026-W26'
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 1850),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 1420),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 1180),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 920),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 640),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 380),
  ('a0000000-0000-4000-8000-000000000007'::uuid, 1560),
  ('a0000000-0000-4000-8000-000000000008'::uuid, 1240),
  ('a0000000-0000-4000-8000-000000000009'::uuid, 870),
  ('a0000000-0000-4000-8000-000000000010'::uuid, 610),
  ('a0000000-0000-4000-8000-000000000011'::uuid, 300),
  ('a0000000-0000-4000-8000-000000000012'::uuid, 1320),
  ('a0000000-0000-4000-8000-000000000013'::uuid, 980),
  ('a0000000-0000-4000-8000-000000000014'::uuid, 720),
  ('a0000000-0000-4000-8000-000000000015'::uuid, 450)
) as v(id, points)
on conflict (user_id, reason, period_label) do nothing;
