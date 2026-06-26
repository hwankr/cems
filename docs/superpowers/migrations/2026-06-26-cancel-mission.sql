-- Applied to Supabase project `cems` (ref zvuqmagfpdyrrzyjntue) on 2026-06-26
-- via apply_migration name `cancel_mission_demo`.
--
-- Demo/testing helper: let a user undo their own QR check-in for today so they
-- can re-scan. Server-authoritative (only deletes the caller's own rows for the
-- current Asia/Seoul day). Not an economy hole: it removes the points the
-- check-in added, so the per-mission daily cap still holds.
create or replace function public.cancel_mission(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_deleted int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  delete from public.mission_completions
    where user_id = v_user and mission_code = p_code and day = v_day;
  get diagnostics v_deleted = row_count;

  delete from public.point_events
    where user_id = v_user
      and reason = 'qr:' || p_code
      and period_label = to_char(v_day, 'YYYY-MM-DD');

  if v_deleted > 0 then return 'cancelled'; else return 'nothing'; end if;
end;
$$;
revoke all on function public.cancel_mission(text) from public;
revoke execute on function public.cancel_mission(text) from anon;
grant execute on function public.cancel_mission(text) to authenticated;
