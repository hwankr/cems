-- Operational SQL record for rotating presentation guest passwords.
-- Applied manually to Supabase project `cems` when demo one-click login is enabled.
--
-- Do not commit the real password. Before applying, generate a new password,
-- set it as `CEMS_DEMO_GUEST_PASSWORD` in the runtime environment, then set the
-- same value into the local SQL session variable below.

-- Local-only step before applying:
-- Run select set_config('cems.demo_guest_password', generated_password, false)
-- in the same SQL session, where generated_password is the secret value stored
-- in CEMS_DEMO_GUEST_PASSWORD.

do $$
declare
  demo_password text := current_setting('cems.demo_guest_password', true);
begin
  if demo_password is null or length(demo_password) < 24 then
    raise exception 'Set cems.demo_guest_password to a generated password before applying.';
  end if;

  update auth.users
  set
    encrypted_password = crypt(demo_password, gen_salt('bf')),
    updated_at = now()
  where email in (
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
  );
end $$;
