-- Operational SQL record for presentation demo league population.
-- Applied to Supabase project `cems` (ref zvuqmagfpdyrrzyjntue) on 2026-06-29.
--
-- This keeps `demo@cems.kr` as the representative account and adds realistic
-- surrounding test accounts so the latest finalized league, team awards, student
-- awards, and building contributor rankings look active during a presentation.
--
-- The real shared presentation password is intentionally not recorded here.
-- Before applying in an interactive SQL session:
--   select set_config('cems.presentation_test_password', '<secret>', false);

begin;

do $$
begin
  if current_setting('cems.presentation_test_password', true) is null
     or length(current_setting('cems.presentation_test_password', true)) < 12 then
    raise exception 'Set cems.presentation_test_password before applying.';
  end if;
end $$;

create temp table _presentation_demo_users (
  id uuid primary key,
  email text not null,
  display_name text not null,
  group_id text not null,
  building_points integer not null,
  live_points integer not null,
  may_points integer not null
) on commit drop;

insert into _presentation_demo_users (
  id,
  email,
  display_name,
  group_id,
  building_points,
  live_points,
  may_points
) values
  ('b0000000-0000-4000-8000-000000000001', 'eng01@cems.demo', '공대 절감대장 민준', 'engineering', 12800, 4700, 3200),
  ('b0000000-0000-4000-8000-000000000002', 'eng02@cems.demo', '기계관 지킴이 서준', 'engineering', 12150, 4300, 3000),
  ('b0000000-0000-4000-8000-000000000003', 'eng03@cems.demo', '전기실험실 하린', 'engineering', 11700, 4100, 2800),
  ('b0000000-0000-4000-8000-000000000004', 'eng04@cems.demo', '화공관 세이버 지호', 'engineering', 10900, 3800, 2600),
  ('b0000000-0000-4000-8000-000000000005', 'eng05@cems.demo', '건설관 루틴러 유찬', 'engineering', 10150, 3500, 2400),
  ('b0000000-0000-4000-8000-000000000006', 'eng06@cems.demo', '로봇동아리 수아', 'engineering', 9400, 3300, 2200),
  ('b0000000-0000-4000-8000-000000000007', 'eng07@cems.demo', '공학관 야간순찰 현우', 'engineering', 8800, 3100, 2000),
  ('b0000000-0000-4000-8000-000000000008', 'eng08@cems.demo', '메이커스 은서', 'engineering', 8150, 2900, 1900),
  ('b0000000-0000-4000-8000-000000000009', 'eng09@cems.demo', '에너지랩 도윤', 'engineering', 7600, 2800, 1800),
  ('b0000000-0000-4000-8000-000000000010', 'eng10@cems.demo', '스마트팩토리 나윤', 'engineering', 7100, 2600, 1700),
  ('b0000000-0000-4000-8000-000000000011', 'eng11@cems.demo', '캡스톤 유진', 'engineering', 6550, 2400, 1600),
  ('b0000000-0000-4000-8000-000000000012', 'eng12@cems.demo', '공대 새벽반 준호', 'engineering', 6100, 2200, 1500),
  ('b0000000-0000-4000-8000-000000000013', 'eng13@cems.demo', '절전알림 다인', 'engineering', 5700, 2100, 1400),
  ('b0000000-0000-4000-8000-000000000014', 'eng14@cems.demo', '그린엔지니어 태오', 'engineering', 5300, 1900, 1300),
  ('b1000000-0000-4000-8000-000000000001', 'hum01@cems.demo', '인문관 절감러 지민', 'humanities', 11600, 3900, 2800),
  ('b1000000-0000-4000-8000-000000000002', 'hum02@cems.demo', '문과대 리더 서연', 'humanities', 10850, 3700, 2600),
  ('b1000000-0000-4000-8000-000000000003', 'hum03@cems.demo', '외국어관 하루', 'humanities', 10200, 3400, 2400),
  ('b1000000-0000-4000-8000-000000000004', 'hum04@cems.demo', '역사관 다혜', 'humanities', 9500, 3200, 2200),
  ('b1000000-0000-4000-8000-000000000005', 'hum05@cems.demo', '철학과 온도지킴', 'humanities', 8800, 3000, 2000),
  ('b1000000-0000-4000-8000-000000000006', 'hum06@cems.demo', '문헌정보 민서', 'humanities', 8200, 2800, 1850),
  ('b1000000-0000-4000-8000-000000000007', 'hum07@cems.demo', '인문라운지 태린', 'humanities', 7600, 2600, 1700),
  ('b1000000-0000-4000-8000-000000000008', 'hum08@cems.demo', '번역동아리 예린', 'humanities', 7000, 2400, 1600),
  ('b1000000-0000-4000-8000-000000000009', 'hum09@cems.demo', '캠퍼스기록 준서', 'humanities', 6500, 2200, 1500),
  ('b1000000-0000-4000-8000-000000000010', 'hum10@cems.demo', '교양관 소윤', 'humanities', 5900, 2000, 1400),
  ('b2000000-0000-4000-8000-000000000001', 'svc01@cems.demo', '중앙도서관 서포터 지우', 'student-services', 14200, 4400, 3300),
  ('b2000000-0000-4000-8000-000000000002', 'svc02@cems.demo', '학생지원 절감왕 하준', 'student-services', 13650, 4200, 3100),
  ('b2000000-0000-4000-8000-000000000003', 'svc03@cems.demo', '민원실 에너지메이트', 'student-services', 12900, 3950, 2900),
  ('b2000000-0000-4000-8000-000000000004', 'svc04@cems.demo', '장학팀 서포터 유나', 'student-services', 12100, 3700, 2700),
  ('b2000000-0000-4000-8000-000000000005', 'svc05@cems.demo', '도서관 야간반 시우', 'student-services', 11300, 3500, 2500),
  ('b2000000-0000-4000-8000-000000000006', 'svc06@cems.demo', '학생회관 그린러', 'student-services', 10750, 3200, 2300),
  ('b2000000-0000-4000-8000-000000000007', 'svc07@cems.demo', '상담센터 나래', 'student-services', 9800, 3000, 2100),
  ('b2000000-0000-4000-8000-000000000008', 'svc08@cems.demo', '복지팀 라온', 'student-services', 9200, 2800, 1950),
  ('b2000000-0000-4000-8000-000000000009', 'svc09@cems.demo', '열람실 루틴러 도아', 'student-services', 8500, 2600, 1800),
  ('b2000000-0000-4000-8000-000000000010', 'svc10@cems.demo', '편의시설 지킴이 현서', 'student-services', 7900, 2400, 1650),
  ('b2000000-0000-4000-8000-000000000011', 'svc11@cems.demo', '도서관 절전메이트', 'student-services', 7200, 2200, 1500);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
select
  '00000000-0000-0000-0000-000000000000',
  u.id,
  'authenticated',
  'authenticated',
  u.email,
  extensions.crypt(
    current_setting('cems.presentation_test_password'),
    extensions.gen_salt('bf')
  ),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false,
    'display_name', u.display_name
  ),
  false,
  now(),
  now(),
  false,
  false
from _presentation_demo_users u
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  email_change = coalesce(email_change, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  updated_at = now()
where id in (select id from _presentation_demo_users);

delete from auth.identities
where user_id in (select id from _presentation_demo_users)
   or (
     provider = 'email'
     and email in (select email from _presentation_demo_users)
   );

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
from _presentation_demo_users u;

insert into public.profiles (
  id,
  display_name,
  school_id,
  group_id
)
select u.id, u.display_name, 'yeungnam', u.group_id
from _presentation_demo_users u
on conflict (id) do update
set
  display_name = excluded.display_name,
  school_id = excluded.school_id,
  group_id = excluded.group_id;

delete from public.point_events
where user_id in (
    select id from _presentation_demo_users
    union all
    select 'd0000000-0000-4000-8000-000000000001'::uuid
  )
  and reason in (
    'seed:building-demo',
    'seed:live-league-demo',
    'seed:may-league-demo'
  );

insert into public.point_events (
  user_id,
  points,
  reason,
  period_label,
  created_at
)
select
  id,
  building_points,
  'seed:building-demo',
  'all-time-demo',
  '2026-06-29T11:00:00+09'::timestamptz
from _presentation_demo_users
union all
select
  id,
  live_points,
  'seed:live-league-demo',
  '2026-W27-live',
  '2026-06-29T12:00:00+09'::timestamptz
from _presentation_demo_users
union all
select
  id,
  may_points,
  'seed:may-league-demo',
  '2026-05-demo',
  '2026-05-15T12:00:00+09'::timestamptz
from _presentation_demo_users
union all
select
  'd0000000-0000-4000-8000-000000000001'::uuid,
  24000,
  'seed:live-league-demo',
  '2026-W27-live',
  '2026-06-29T12:00:00+09'::timestamptz
union all
select
  'd0000000-0000-4000-8000-000000000001'::uuid,
  12000,
  'seed:may-league-demo',
  '2026-05-demo',
  '2026-05-15T12:00:00+09'::timestamptz;

insert into public.leagues (
  id,
  name,
  scope,
  school_id,
  starts_at,
  ends_at,
  status,
  badge_winner_count
) values
  (
    'yu-college-2026-05',
    '영남대 단과대 에너지 절감 리그',
    'group',
    'yeungnam',
    '2026-05-01T00:00:00+09'::timestamptz,
    '2026-06-01T00:00:00+09'::timestamptz,
    'finalized',
    3
  ),
  (
    'yu-college-2026-06-live-demo',
    '영남대 여름 에너지 절감 리그',
    'group',
    'yeungnam',
    '2026-06-29T10:00:00+09'::timestamptz,
    '2026-07-12T23:59:59+09'::timestamptz,
    'finalized',
    3
  )
on conflict (id) do update
set
  name = excluded.name,
  scope = excluded.scope,
  school_id = excluded.school_id,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  status = excluded.status,
  badge_winner_count = excluded.badge_winner_count;

insert into public.league_participants (
  league_id,
  competitor_kind,
  competitor_id
) values
  ('yu-college-2026-05', 'group', 'engineering'),
  ('yu-college-2026-05', 'group', 'humanities'),
  ('yu-college-2026-05', 'group', 'student-services'),
  ('yu-college-2026-06-live-demo', 'group', 'engineering'),
  ('yu-college-2026-06-live-demo', 'group', 'humanities'),
  ('yu-college-2026-06-live-demo', 'group', 'student-services')
on conflict do nothing;

select public.finalize_league('yu-college-2026-05');
select public.finalize_league('yu-college-2026-06-live-demo');

commit;

select
  u.email,
  p.display_name,
  p.group_id,
  coalesce(sum(pe.points), 0) as points
from auth.users u
join public.profiles p on p.id = u.id
left join public.point_events pe on pe.user_id = u.id
where u.email = 'demo@cems.kr'
   or u.email like 'eng%@cems.demo'
   or u.email like 'hum%@cems.demo'
   or u.email like 'svc%@cems.demo'
group by u.email, p.display_name, p.group_id
order by p.group_id, points desc;
