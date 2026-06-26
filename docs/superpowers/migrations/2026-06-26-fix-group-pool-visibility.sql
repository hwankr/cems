-- Applied to Supabase project `cems` (ref zvuqmagfpdyrrzyjntue) on 2026-06-26
-- via apply_migration name `fix_group_pool_visibility` (+ a follow-up revoke).
--
-- Fixes the Codex-review Critical/High finding that the group point pool
-- collapsed to the reader's own points: the `point_events` SELECT policy's
-- subquery on `profiles` was blocked by profiles' "own profile only" RLS, so a
-- reader could not see other members of their group. A same-group profiles
-- policy that references profiles directly would recurse, so the caller's group
-- is resolved via a SECURITY DEFINER helper (runs as owner, bypasses RLS).

create or replace function public.current_group_id()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select group_id from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_group_id() from public;
grant execute on function public.current_group_id() to authenticated;
-- anon never needs it (auth.uid() is null when signed out); revoke to satisfy
-- the security linter. authenticated keeps EXECUTE because RLS policies call it.
revoke execute on function public.current_group_id() from anon;

comment on function public.current_group_id() is
  'Returns the calling user''s own group_id (auth.uid()). SECURITY DEFINER to break profiles RLS recursion in same-group policies. Returns only the caller''s own group; safe to expose to authenticated. EXECUTE revoked from anon.';

-- Allow reading profiles of your own group (needed for the pool join and the
-- leaderboard). Non-recursive because it uses the definer helper.
create policy "same group profile select" on public.profiles
  for select to authenticated
  using (group_id = public.current_group_id());

-- Rewrite the point_events SELECT policy to use the helper. With the same-group
-- profiles policy in place, the member-id subquery now returns every member.
drop policy "group point events select" on public.point_events;
create policy "group point events select" on public.point_events
  for select to authenticated
  using (
    user_id in (
      select id from public.profiles where group_id = public.current_group_id()
    )
  );
