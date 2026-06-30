-- Applied to Supabase project `cems` (ref zvuqmagfpdyrrzyjntue) on 2026-06-30
-- via apply_migration name `daily_quiz`.
--
-- Daily environment quiz: 1 question/day, server-authoritative grading.
-- Question TEXT lives in the app i18n dictionaries; the DB holds only the
-- point values (quiz_questions) and the correct answer index (quiz_answers).
--
-- SECURITY NOTE: the correct answer lives in a SEPARATE table `quiz_answers`
-- with RLS enabled and NO select policy, and direct privileges revoked from
-- anon/authenticated. Postgres RLS is row-level, not column-level, so keeping
-- correct_index in the client-readable quiz_questions table would let any
-- authenticated user SELECT today's answer before submitting. Only the
-- SECURITY DEFINER functions below (which run as the table owner and bypass
-- RLS) can read quiz_answers. Points are awarded only through these RPCs.

-- ---- tables ----
create table public.quiz_questions (
  id text primary key,
  option_count int not null check (option_count >= 2),
  participation_points int not null check (participation_points >= 0),
  bonus_points int not null check (bonus_points >= 0),
  active boolean not null default true
);
alter table public.quiz_questions enable row level security;
-- Readable: only non-secret fields (option_count / points / active) live here.
create policy "quiz questions readable" on public.quiz_questions
  for select to authenticated using (true);

-- Correct answers, isolated. RLS on + no policy + revoked grants => no client
-- (anon or authenticated) can read this table directly. Only SECURITY DEFINER
-- functions read it as the owner.
create table public.quiz_answers (
  question_id text primary key references public.quiz_questions (id) on delete cascade,
  correct_index int not null check (correct_index >= 0)
);
alter table public.quiz_answers enable row level security;
revoke all on table public.quiz_answers from anon, authenticated;

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  question_id text not null references public.quiz_questions (id),
  selected_index int not null,
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id);
alter table public.quiz_attempts enable row level security;
create policy "own quiz attempts select" on public.quiz_attempts
  for select to authenticated using (user_id = auth.uid());

-- ---- seeds (text lives in i18n by id; answers isolated in quiz_answers) ----
insert into public.quiz_questions
  (id, option_count, participation_points, bonus_points) values
  ('q-led',     3, 10, 30),
  ('q-standby', 3, 10, 30),
  ('q-tumbler', 3, 10, 30),
  ('q-stairs',  3, 10, 30),
  ('q-aircon',  3, 10, 30),
  ('q-recycle', 3, 10, 30),
  ('q-shower',  3, 10, 30),
  ('q-paper',   3, 10, 30);

insert into public.quiz_answers (question_id, correct_index) values
  ('q-led',     1),
  ('q-standby', 1),
  ('q-tumbler', 1),
  ('q-stairs',  0),
  ('q-aircon',  1),
  ('q-recycle', 0),
  ('q-shower',  1),
  ('q-paper',   0);

-- ---- helper: deterministic "today's question" (Asia/Seoul day rotation) ----
create or replace function public.today_quiz_question_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  with active as (
    select id,
           row_number() over (order by id) - 1 as idx,
           count(*) over () as n
    from public.quiz_questions
    where active = true
  )
  select id from active
  where n > 0
    and idx = (((now() at time zone 'Asia/Seoul')::date - date '1970-01-01') % n)
  limit 1;
$$;
revoke all on function public.today_quiz_question_id() from public;
revoke execute on function public.today_quiz_question_id() from anon;
grant execute on function public.today_quiz_question_id() to authenticated;

-- ---- helper: streak milestone bonus (must match TS quizStreakBonus) ----
-- Pure arithmetic, no table access. search_path pinned to satisfy the linter;
-- default PUBLIC execute revoked, granted to authenticated per spec.
create or replace function public.quiz_streak_bonus(p_streak int)
returns int
language sql
immutable
set search_path = public
as $$
  select case p_streak
    when 3 then 20
    when 7 then 50
    when 14 then 100
    when 30 then 200
    else 0
  end;
$$;
revoke all on function public.quiz_streak_bonus(int) from public;
revoke execute on function public.quiz_streak_bonus(int) from anon;
grant execute on function public.quiz_streak_bonus(int) to authenticated;

-- ---- get_today_quiz: today's question + my result (hides answer if unattempted) ----
create or replace function public.get_today_quiz()
returns table(
  question_id text,
  option_count int,
  participation_points int,
  bonus_points int,
  attempted boolean,
  selected_index int,
  is_correct boolean,
  correct_index int,
  awarded int,
  streak int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_qid text;
  v_attempt public.quiz_attempts%rowtype;
  v_has boolean;
  v_last date;
  v_streak int := 0;
  v_awarded int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  v_qid := public.today_quiz_question_id();

  select max(day) into v_last from public.quiz_attempts where user_id = v_user;
  if v_last is not null then
    select count(*)::int into v_streak from (
      select day, row_number() over (order by day desc) as rn
      from public.quiz_attempts
      where user_id = v_user and day <= v_last
    ) t where t.day = v_last - (t.rn - 1)::int;
  end if;

  select * into v_attempt from public.quiz_attempts
    where user_id = v_user and day = v_day;
  v_has := found;

  if v_qid is null then
    return query select
      null::text, null::int, null::int, null::int,
      false, null::int, null::boolean, null::int, null::int, v_streak;
    return;
  end if;

  if v_has then
    -- attempted today: reveal the correct answer (read from isolated table)
    select pe.points into v_awarded from public.point_events pe
      where pe.user_id = v_user and pe.reason = 'quiz:daily'
        and pe.period_label = to_char(v_day, 'YYYY-MM-DD');
    return query
      select q.id, q.option_count, q.participation_points, q.bonus_points,
             true, v_attempt.selected_index, v_attempt.is_correct,
             a.correct_index, v_awarded, v_streak
      from public.quiz_questions q
      join public.quiz_answers a on a.question_id = q.id
      where q.id = v_qid;
  else
    -- not attempted: correct_index stays NULL (never leaked)
    return query
      select q.id, q.option_count, q.participation_points, q.bonus_points,
             false, null::int, null::boolean, null::int, null::int, v_streak
      from public.quiz_questions q where q.id = v_qid;
  end if;
end;
$$;
revoke all on function public.get_today_quiz() from public;
revoke execute on function public.get_today_quiz() from anon;
grant execute on function public.get_today_quiz() to authenticated;

-- ---- submit_quiz_answer: authoritative grade + award, 1 per day ----
create or replace function public.submit_quiz_answer(
  p_question_id text,
  p_selected_index int
)
returns table(
  result text,
  is_correct boolean,
  correct_index int,
  awarded int,
  streak int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_today text;
  v_correct int;
  v_optcount int;
  v_part int;
  v_bonus int;
  v_active boolean;
  v_is_correct boolean;
  v_streak int;
  v_awarded int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  v_today := public.today_quiz_question_id();
  if v_today is null or v_today <> p_question_id then
    return query select 'invalid'::text, null::boolean, null::int, null::int, null::int;
    return;
  end if;

  -- grade from the isolated answer table (owner read via SECURITY DEFINER)
  select a.correct_index, q.option_count, q.participation_points, q.bonus_points, q.active
    into v_correct, v_optcount, v_part, v_bonus, v_active
    from public.quiz_questions q
    join public.quiz_answers a on a.question_id = q.id
    where q.id = p_question_id;
  if v_correct is null or v_active is not true then
    return query select 'invalid'::text, null::boolean, null::int, null::int, null::int;
    return;
  end if;

  if p_selected_index < 0 or p_selected_index >= v_optcount then
    return query select 'invalid'::text, null::boolean, null::int, null::int, null::int;
    return;
  end if;

  v_is_correct := (p_selected_index = v_correct);

  begin
    insert into public.quiz_attempts (user_id, day, question_id, selected_index, is_correct)
    values (v_user, v_day, p_question_id, p_selected_index, v_is_correct);
  exception when unique_violation then
    return query select 'already'::text, null::boolean, null::int, null::int, null::int;
    return;
  end;

  select count(*)::int into v_streak from (
    select day, row_number() over (order by day desc) as rn
    from public.quiz_attempts
    where user_id = v_user and day <= v_day
  ) t where t.day = v_day - (t.rn - 1)::int;

  v_awarded := v_part
             + (case when v_is_correct then v_bonus else 0 end)
             + public.quiz_streak_bonus(v_streak);

  insert into public.point_events (user_id, points, reason, period_label)
  values (v_user, v_awarded, 'quiz:daily', to_char(v_day, 'YYYY-MM-DD'))
  on conflict (user_id, reason, period_label) do nothing;

  return query select 'completed'::text, v_is_correct, v_correct, v_awarded, v_streak;
end;
$$;
revoke all on function public.submit_quiz_answer(text, int) from public;
revoke execute on function public.submit_quiz_answer(text, int) from anon;
grant execute on function public.submit_quiz_answer(text, int) to authenticated;
