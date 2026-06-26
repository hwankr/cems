-- Applied to Supabase project `cems` (ref zvuqmagfpdyrrzyjntue) on 2026-06-26
-- via apply_migration name `harden_economy_server_authoritative`.
--
-- Addresses the remaining Codex adversarial-review findings by making all
-- economic mutations server-authoritative. Direct client writes to
-- point_events and estates are removed; everything goes through SECURITY
-- DEFINER RPCs that validate server-side.
--
--   C1 point forging  -> claim_period_reward() reads the amount from
--                        group_period_rewards; direct point_events insert
--                        policy dropped.
--   C2 group hopping  -> profiles_affiliation_immutable trigger blocks
--                        school_id/group_id changes after onboarding.
--   C3 estate squatting-> estate_subjects maps subject -> canonical group;
--                        save_estate() derives the owner authoritatively and
--                        direct estate insert/update policies are dropped.
--   H5 forged spend   -> save_estate() rejects positive (self-credit) deltas
--                        and any net spend exceeding the group pool.
--   H6 lost updates   -> estates.version + optimistic-concurrency check in
--                        save_estate().

-- ---- C1 ----
create table public.group_period_rewards (
  group_id text not null references public.groups (id),
  period_label text not null,
  points int not null check (points >= 0),
  primary key (group_id, period_label)
);
alter table public.group_period_rewards enable row level security;
create policy "group rewards readable" on public.group_period_rewards
  for select to authenticated using (true);

-- Seed reflects the authoritative per-group savings reward for the demo period
-- (computed from the same domain logic the UI uses).
insert into public.group_period_rewards (group_id, period_label, points) values
  ('engineering', '2026-W25', 0),
  ('humanities', '2026-W25', 1400),
  ('student-services', '2026-W25', 0);

drop policy "own point events insert" on public.point_events;

create or replace function public.claim_period_reward(p_period_label text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_group text;
  v_points int;
begin
  if v_user is null then return 'no-profile'; end if;
  select group_id into v_group from public.profiles where id = v_user;
  if v_group is null then return 'no-profile'; end if;

  select points into v_points
  from public.group_period_rewards
  where group_id = v_group and period_label = p_period_label;

  if v_points is null or v_points <= 0 then return 'no-reward'; end if;

  begin
    insert into public.point_events (user_id, points, reason, period_label)
    values (v_user, v_points, 'verified-savings', p_period_label);
  exception when unique_violation then
    return 'already';
  end;

  return 'claimed';
end;
$$;
revoke all on function public.claim_period_reward(text) from public;
revoke execute on function public.claim_period_reward(text) from anon;
grant execute on function public.claim_period_reward(text) to authenticated;

-- ---- C2 ----
create or replace function public.enforce_profile_affiliation_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if NEW.school_id <> OLD.school_id or NEW.group_id <> OLD.group_id then
    raise exception 'profile school_id/group_id are immutable';
  end if;
  return NEW;
end;
$$;
create trigger profiles_affiliation_immutable
  before update on public.profiles
  for each row execute function public.enforce_profile_affiliation_immutable();

-- ---- C3 ----
create table public.estate_subjects (
  subject_id text primary key,
  owner_group_id text not null references public.groups (id)
);
alter table public.estate_subjects enable row level security;
create policy "estate subjects readable" on public.estate_subjects
  for select to authenticated using (true);
insert into public.estate_subjects (subject_id, owner_group_id) values
  ('yu-e21', 'engineering'), ('yu-e22', 'engineering'),
  ('yu-e23', 'engineering'), ('yu-e24', 'engineering'),
  ('yu-c02', 'humanities'), ('yu-b04', 'student-services');

-- ---- H6 ----
alter table public.estates add column version int not null default 0;

drop policy "estates group insert" on public.estates;
drop policy "estates group update" on public.estates;

-- ---- C3 + H5 + H6: authoritative estate save ----
create or replace function public.save_estate(
  p_subject_id text,
  p_snapshot jsonb,
  p_expected_version int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_group text;
  v_owner text;
  v_current_version int;
  v_spend numeric := 0;
  v_pool int;
  tx jsonb;
  v_delta numeric;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select group_id into v_group from public.profiles where id = v_user;
  if v_group is null then raise exception 'no profile'; end if;

  select owner_group_id into v_owner from public.estate_subjects where subject_id = p_subject_id;
  v_owner := coalesce(v_owner, v_group);
  if v_owner <> v_group then
    raise exception 'subject % is owned by another group', p_subject_id;
  end if;

  if (p_snapshot->>'subjectId') is distinct from p_subject_id then
    raise exception 'snapshot subjectId mismatch';
  end if;

  for tx in select * from jsonb_array_elements(coalesce(p_snapshot->'transactions', '[]'::jsonb))
  loop
    v_delta := (tx->>'pointDelta')::numeric;
    if v_delta > 0 then
      raise exception 'positive transaction delta not allowed';
    end if;
    v_spend := v_spend + abs(v_delta);
  end loop;

  select coalesce(sum(points), 0) into v_pool
  from public.point_events
  where user_id in (select id from public.profiles where group_id = v_owner);

  if v_spend > v_pool then
    raise exception 'estate spend % exceeds group pool %', v_spend, v_pool;
  end if;

  select version into v_current_version from public.estates where subject_id = p_subject_id;
  if v_current_version is not null
     and p_expected_version is not null
     and v_current_version <> p_expected_version then
    raise exception 'conflict: estate was modified (current %, expected %)',
      v_current_version, p_expected_version;
  end if;

  insert into public.estates (subject_id, owner_group_id, snapshot, version, updated_at)
  values (p_subject_id, v_owner, p_snapshot, 1, now())
  on conflict (subject_id) do update
    set snapshot = excluded.snapshot,
        owner_group_id = excluded.owner_group_id,
        version = public.estates.version + 1,
        updated_at = now()
  returning version into v_current_version;

  return v_current_version;
end;
$$;
revoke all on function public.save_estate(text, jsonb, int) from public;
revoke execute on function public.save_estate(text, jsonb, int) from anon;
grant execute on function public.save_estate(text, jsonb, int) to authenticated;
