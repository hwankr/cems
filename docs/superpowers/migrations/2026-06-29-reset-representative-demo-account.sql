-- Operational SQL record for resetting demo login to one representative account.
-- Applied to Supabase project `cems` (ref zvuqmagfpdyrrzyjntue) on 2026-06-29.
--
-- This removes the old `guest*@cems.demo` rows and the previous `it@naver.com`
-- test/demo account, then creates one representative demo account:
--   demo@cems.kr
--
-- The real password is intentionally not recorded here.
-- Before applying in an interactive SQL session:
--   select set_config('cems.representative_demo_password', '<secret>', false);

do $$
declare
  v_demo_id uuid := 'd0000000-0000-4000-8000-000000000001';
  v_demo_email text := 'demo@cems.kr';
  v_demo_password text := current_setting(
    'cems.representative_demo_password',
    true
  );
  v_target_ids uuid[];
  v_all_ids uuid[];
  v_all_id_texts text[];
begin
  if v_demo_password is null or length(v_demo_password) < 12 then
    raise exception 'Set cems.representative_demo_password before applying.';
  end if;

  select coalesce(array_agg(id), array[]::uuid[])
    into v_target_ids
  from auth.users
  where email ~ '^guest[0-9]+@cems\.demo$'
     or email in ('it@naver.com', v_demo_email)
     or id = v_demo_id;

  select array_agg(distinct id)
    into v_all_ids
  from unnest(array_append(v_target_ids, v_demo_id)) as ids(id);

  select array_agg(id::text)
    into v_all_id_texts
  from unnest(v_all_ids) as ids(id);

  delete from public.league_awards
  where league_id = 'yu-college-2026-05'
     or user_id = any(v_all_ids);

  delete from public.mission_completions where user_id = any(v_all_ids);
  delete from public.point_events where user_id = any(v_all_ids);
  delete from public.profiles where id = any(v_all_ids);

  delete from auth.mfa_amr_claims
  where session_id in (
    select id from auth.sessions where user_id = any(v_all_ids)
  );

  delete from auth.mfa_challenges
  where factor_id in (
    select id from auth.mfa_factors where user_id = any(v_all_ids)
  );

  delete from auth.mfa_factors where user_id = any(v_all_ids);
  delete from auth.oauth_authorizations where user_id = any(v_all_ids);
  delete from auth.oauth_consents where user_id = any(v_all_ids);
  delete from auth.one_time_tokens where user_id = any(v_all_ids);
  delete from auth.webauthn_challenges where user_id = any(v_all_ids);
  delete from auth.webauthn_credentials where user_id = any(v_all_ids);

  delete from auth.flow_state
  where user_id = any(v_all_ids)
     or linking_target_id = any(v_all_ids);

  delete from auth.refresh_tokens
  where user_id = any(v_all_id_texts)
     or session_id in (
       select id from auth.sessions where user_id = any(v_all_ids)
     );

  delete from auth.identities
  where user_id = any(v_all_ids)
     or (provider = 'email' and email in ('it@naver.com', v_demo_email))
     or (provider = 'email' and email ~ '^guest[0-9]+@cems\.demo$');

  delete from auth.sessions where user_id = any(v_all_ids);

  delete from auth.users
  where id = any(v_all_ids)
     or email ~ '^guest[0-9]+@cems\.demo$'
     or email in ('it@naver.com', v_demo_email);

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
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_demo_id,
    'authenticated',
    'authenticated',
    v_demo_email,
    extensions.crypt(v_demo_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'sub', v_demo_id::text,
      'email', v_demo_email,
      'email_verified', true,
      'phone_verified', false,
      'display_name', '대표 데모'
    ),
    false,
    now(),
    now(),
    false,
    false
  );

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
  where id = v_demo_id;

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_demo_id,
    v_demo_id::text,
    jsonb_build_object(
      'sub', v_demo_id::text,
      'email', v_demo_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  );

  insert into public.profiles (
    id,
    display_name,
    school_id,
    group_id,
    handle,
    bio
  ) values (
    v_demo_id,
    '대표 데모',
    'yeungnam',
    'student-services',
    'demo',
    '발표용 대표 데모 계정'
  );

  insert into public.point_events (
    user_id,
    points,
    reason,
    period_label,
    created_at
  ) values (
    v_demo_id,
    1000000,
    'seed:representative-demo',
    '2026-W26',
    now()
  );

  insert into public.league_awards (
    league_id,
    award_type,
    tier,
    competitor_kind,
    competitor_id,
    user_id,
    rank,
    metric_value
  ) values
    ('yu-college-2026-05', 'team', 'gold', 'group', 'student-services', null, 1, 1000000),
    ('yu-college-2026-05', 'student', 'gold', null, null, v_demo_id, 1, 1000000);
end $$;

select
  u.id,
  u.email,
  p.display_name,
  p.school_id,
  p.group_id,
  coalesce(sum(pe.points), 0) as points
from auth.users u
join public.profiles p on p.id = u.id
left join public.point_events pe on pe.user_id = u.id
where u.email = 'demo@cems.kr'
group by u.id, u.email, p.display_name, p.school_id, p.group_id;
