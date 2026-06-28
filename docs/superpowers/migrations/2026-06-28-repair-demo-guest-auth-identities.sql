-- Operational SQL record for repairing manually seeded demo guest auth rows.
-- Applied to Supabase project `cems` (ref zvuqmagfpdyrrzyjntue) on 2026-06-28.
-- The 2026-06-27 seed inserted auth.users rows for guest1..guest15 so they could
-- appear in rankings, but Supabase Auth password login also expects normalized
-- token fields and matching auth.identities rows for the email provider.
--
-- It does not include or require a password.
-- If you also need to rotate the guest password, run
-- 2026-06-28-rotate-demo-guest-passwords.sql in the same operational window.

do $$
declare
  guest_emails text[] := array[
    'guest1@cems.demo',
    'guest2@cems.demo',
    'guest3@cems.demo',
    'guest4@cems.demo',
    'guest5@cems.demo',
    'guest6@cems.demo',
    'guest7@cems.demo',
    'guest8@cems.demo',
    'guest9@cems.demo',
    'guest10@cems.demo',
    'guest11@cems.demo',
    'guest12@cems.demo',
    'guest13@cems.demo',
    'guest14@cems.demo',
    'guest15@cems.demo'
  ];
  user_columns text[];
  set_clauses text[] := array[
    'raw_app_meta_data = coalesce(raw_app_meta_data, ''{}''::jsonb) || ''{"provider":"email","providers":["email"]}''::jsonb',
    'updated_at = now()'
  ];
  identity_id_type text;
  identity_id_expr text;
  affected_users integer;
  affected_identities integer;
begin
  select array_agg(column_name)
  into user_columns
  from information_schema.columns
  where table_schema = 'auth'
    and table_name = 'users';

  if user_columns is null then
    raise exception 'auth.users table was not found.';
  end if;

  if 'email_confirmed_at' = any(user_columns) then
    set_clauses := array_append(set_clauses, 'email_confirmed_at = coalesce(email_confirmed_at, now())');
  end if;

  foreach identity_id_type in array array[
    'confirmation_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'email_change',
    'phone_change',
    'phone_change_token',
    'reauthentication_token'
  ]
  loop
    if identity_id_type = any(user_columns) then
      set_clauses := array_append(
        set_clauses,
        format('%I = coalesce(%I, '''')', identity_id_type, identity_id_type)
      );
    end if;
  end loop;

  execute format(
    'update auth.users set %s where email = any($1)',
    array_to_string(set_clauses, ', ')
  )
  using guest_emails;

  get diagnostics affected_users = row_count;

  if affected_users <> array_length(guest_emails, 1) then
    raise exception 'Expected to repair % guest auth.users rows, repaired %.',
      array_length(guest_emails, 1), affected_users;
  end if;

  select data_type
  into identity_id_type
  from information_schema.columns
  where table_schema = 'auth'
    and table_name = 'identities'
    and column_name = 'id';

  if identity_id_type is null then
    raise exception 'auth.identities.id column was not found.';
  end if;

  identity_id_expr := case
    when identity_id_type = 'uuid' then 'gen_random_uuid()'
    else 'gen_random_uuid()::text'
  end;

  execute format($sql$
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
      %s,
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
    from auth.users u
    where u.email = any($1)
    on conflict (provider_id, provider) do update
    set
      user_id = excluded.user_id,
      identity_data = excluded.identity_data,
      updated_at = now()
  $sql$, identity_id_expr)
  using guest_emails;

  get diagnostics affected_identities = row_count;

  if affected_identities <> array_length(guest_emails, 1) then
    raise exception 'Expected to upsert % guest auth.identities rows, upserted %.',
      array_length(guest_emails, 1), affected_identities;
  end if;
end $$;

select
  u.email,
  u.email_confirmed_at is not null as email_confirmed,
  (u.raw_app_meta_data -> 'providers') ? 'email' as email_provider_registered,
  i.id is not null as has_email_identity
from auth.users u
left join auth.identities i
  on i.user_id = u.id
  and i.provider = 'email'
where u.email in (
  'guest1@cems.demo',
  'guest7@cems.demo',
  'guest12@cems.demo'
)
order by u.email;
