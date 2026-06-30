# 일간 환경 퀴즈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매일 1문제의 환경/에너지 퀴즈를 풀어 포인트를 쌓는 기능을 `/me`에 추가한다. 적립은 서버 권위 RPC로만, 정답은 클라이언트에 유출되지 않는다.

**Architecture:** 기존 missions/goals 패턴 재사용. DB `quiz_questions`(정답·숫자만)/`quiz_attempts`(하루 1회) + SECURITY DEFINER RPC `today_quiz_question_id`/`get_today_quiz`/`submit_quiz_answer`. 문항 텍스트는 i18n 사전(ko/en). 포인트는 `point_events` 단일 경로라 개인 포인트·캐릭터·그룹 풀·영지 예산·잔디·기여 랭킹·리그가 자동 갱신.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase(Postgres + RLS + RPC, via MCP), Vitest, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-06-30-daily-environment-quiz-design.md`

## Global Constraints

- 한국어가 기본 언어. 모든 i18n 키는 `ko.ts`/`en.ts` 대칭이어야 하며 `Messages` 타입(=`koMessages` 파생)이 누락을 빌드에서 잡는다.
- 포인트 적립은 서버 권위(SECURITY DEFINER RPC)만. `point_events` 직접 insert는 RLS로 계속 차단. 클라이언트는 포인트 금액을 정하지 못한다.
- 일일 경계는 `Asia/Seoul`: `(now() at time zone 'Asia/Seoul')::date`.
- 경제 계산식·`save_estate`·영지 카탈로그·지도/영지/리그 UI는 불변.
- 참여 포인트 기본 10, 정답 보너스 기본 30. 스트릭 마일스톤: 3→20, 7→50, 14→100, 30→200.
- Next.js 코드 수정 전 `AGENTS.md`대로 `node_modules/next/dist/docs/`의 관련 문서를 먼저 확인.
- 커밋/푸시는 사용자가 명시적으로 요청했을 때만(프로젝트 `AGENTS.md`). 아래 커밋 step은 사용자가 커밋을 요청한 경우에만 실행한다.
- ESLint는 0 errors 유지(기존 `game-preview.tsx` 경고 2개는 허용).

## File Structure

새 feature `src/features/quiz/`(단일 책임: 일간 퀴즈). 공유 변경은 `account`/`i18n`/`me` 페이지에 최소 범위로.

- Create: `src/features/quiz/domain/quiz.ts` — 타입(`QuizView`, `QuizQuestionContent`) + 순수 `quizStreakBonus`
- Create: `src/features/quiz/__tests__/quiz.test.ts` — `quizStreakBonus` 표 고정
- Create: `src/features/quiz/data/quiz-dal.ts` — `getTodayQuiz()` (RPC 매핑)
- Create: `src/features/quiz/actions/submit-quiz.ts` — `submitQuizAnswerAction`
- Create: `src/features/quiz/components/daily-quiz.tsx` — `DailyQuiz` 카드
- Create: `src/features/quiz/__tests__/daily-quiz.test.tsx` — 렌더 상태 테스트
- Modify: `src/features/account/domain/point-reason.ts` — `quiz` 종류 추가
- Modify: `src/features/account/__tests__/point-reason.test.ts` — quiz 케이스
- Modify: `src/features/account/components/points-history.tsx` — quiz 라벨
- Modify: `src/i18n/messages/ko.ts` — `me.quiz`, `me.quizQuestions`, `me.history.quiz`
- Modify: `src/i18n/messages/en.ts` — 동일 키(영문)
- Modify: `src/i18n/__tests__/messages.test.ts` — quizQuestions 대칭 단언
- Modify: `src/app/[locale]/me/page.tsx` — `DailyQuiz` 배치
- Create: `docs/superpowers/migrations/2026-06-30-daily-quiz.sql` — 마이그레이션 기록(MCP로 적용)

---

## Task 1: DB 마이그레이션 (테이블·RLS·RPC·시드)

**Files:**
- Create: `docs/superpowers/migrations/2026-06-30-daily-quiz.sql`
- Apply: Supabase MCP `apply_migration` (project ref `zvuqmagfpdyrrzyjntue`, name `daily_quiz`)

**Interfaces:**
- Produces (RPCs consumed by later tasks):
  - `get_today_quiz()` → row `(question_id text, option_count int, participation_points int, bonus_points int, attempted boolean, selected_index int, is_correct boolean, correct_index int, awarded int, streak int)`
  - `submit_quiz_answer(p_question_id text, p_selected_index int)` → row `(result text, is_correct boolean, correct_index int, awarded int, streak int)`; `result ∈ {'completed','already','invalid'}`

> **적용됨(2026-06-30) — 보안 수정 반영:** 적용 전 SQL 리뷰에서 CRITICAL을 발견해 스키마를 2테이블로 변경했다. 정답(`correct_index`)을 client-readable `quiz_questions`에서 빼서 **별도 `quiz_answers` 테이블**(RLS on·정책 없음·anon/authenticated grant revoke)로 격리; SECURITY DEFINER 함수만 읽는다(`get_today_quiz` 응시 reveal·`submit_quiz_answer` 채점이 `quiz_answers`를 join). `quiz_streak_bonus`에 `set search_path` + grant/revoke 추가. **적용된 최종 SQL은 `docs/superpowers/migrations/2026-06-30-daily-quiz.sql`가 정본이다** (아래 Step 1 코드 블록은 초기 단일테이블안으로, 정본과 다름 — 참고용). RPC 시그니처는 위와 동일하게 유지돼 Task 5/6/7/8 인터페이스는 불변.

- [ ] **Step 1: 마이그레이션 SQL 파일 작성**

`docs/superpowers/migrations/2026-06-30-daily-quiz.sql`:

```sql
-- Applied to Supabase project `cems` (ref zvuqmagfpdyrrzyjntue) on 2026-06-30
-- via apply_migration name `daily_quiz`.
--
-- Daily environment quiz: 1 question/day, server-authoritative grading.
-- Question TEXT lives in the app i18n dictionaries; the DB holds only the
-- correct index and point values. Points are awarded only through the
-- SECURITY DEFINER RPC below (clients cannot insert point_events).

-- ---- tables ----
create table public.quiz_questions (
  id text primary key,
  correct_index int not null check (correct_index >= 0),
  option_count int not null check (option_count >= 2),
  participation_points int not null check (participation_points >= 0),
  bonus_points int not null check (bonus_points >= 0),
  active boolean not null default true,
  check (correct_index < option_count)
);
alter table public.quiz_questions enable row level security;
-- Readable so option_count/points can render; correct_index is never sent
-- to un-attempted clients because the app reads quiz state via get_today_quiz,
-- not by selecting this table. (correct_index is low-value but kept server-side
-- by convention; the authoritative grade happens in submit_quiz_answer.)
create policy "quiz questions readable" on public.quiz_questions
  for select to authenticated using (true);

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

-- ---- seeds (text lives in i18n by id) ----
insert into public.quiz_questions
  (id, correct_index, option_count, participation_points, bonus_points) values
  ('q-led',     1, 3, 10, 30),
  ('q-standby', 1, 3, 10, 30),
  ('q-tumbler', 1, 3, 10, 30),
  ('q-stairs',  0, 3, 10, 30),
  ('q-aircon',  1, 3, 10, 30),
  ('q-recycle', 0, 3, 10, 30),
  ('q-shower',  1, 3, 10, 30),
  ('q-paper',   0, 3, 10, 30);

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
create or replace function public.quiz_streak_bonus(p_streak int)
returns int
language sql
immutable
as $$
  select case p_streak
    when 3 then 20
    when 7 then 50
    when 14 then 100
    when 30 then 200
    else 0
  end;
$$;

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
    ) t where t.day = v_last - (t.rn - 1);
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
    select pe.points into v_awarded from public.point_events pe
      where pe.user_id = v_user and pe.reason = 'quiz:daily'
        and pe.period_label = to_char(v_day, 'YYYY-MM-DD');
    return query
      select q.id, q.option_count, q.participation_points, q.bonus_points,
             true, v_attempt.selected_index, v_attempt.is_correct,
             q.correct_index, v_awarded, v_streak
      from public.quiz_questions q where q.id = v_qid;
  else
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

  select q.correct_index, q.option_count, q.participation_points, q.bonus_points, q.active
    into v_correct, v_optcount, v_part, v_bonus, v_active
    from public.quiz_questions q where q.id = p_question_id;
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
  ) t where t.day = v_day - (t.rn - 1);

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
```

- [ ] **Step 2: 마이그레이션 적용 (MCP)**

Supabase MCP `apply_migration`로 적용:
- `project_id`: `zvuqmagfpdyrrzyjntue`
- `name`: `daily_quiz`
- `query`: 위 SQL 전체

Expected: 성공(에러 없음). 이어 `list_tables`로 `quiz_questions`/`quiz_attempts` 존재 확인.

- [ ] **Step 3: RPC 자가-롤백 프로브 (MCP execute_sql)**

대표 데모 계정의 user_id를 구해(`select id from public.profiles limit 1` 또는 `demo@cems.kr`의 auth.users id) 프로브한다. `auth.uid()`는 MCP 세션에 없으므로, 함수 본문을 직접 모사하는 대신 **로직을 검증하는 트랜잭션 프로브**를 `do $$ ... $$` 블록 + `rollback` 의미로 실행한다(아래는 단언 위주, 실행 후 잔존 데이터 없어야 함).

Run (MCP `execute_sql`):

```sql
do $$
declare
  v_user uuid;
  v_qid text;
  v_n int;
begin
  select id into v_user from public.profiles order by created_at limit 1;
  v_qid := public.today_quiz_question_id();
  assert v_qid is not null, 'today question should resolve';

  -- simulate attempt insert + award like submit_quiz_answer
  insert into public.quiz_attempts (user_id, day, question_id, selected_index, is_correct)
  values (v_user, date '2999-01-01', v_qid, 0, true);
  insert into public.point_events (user_id, points, reason, period_label)
  values (v_user, 40, 'quiz:daily', '2999-01-01')
  on conflict (user_id, reason, period_label) do nothing;

  select count(*) into v_n from public.quiz_attempts
    where user_id = v_user and day = date '2999-01-01';
  assert v_n = 1, 'attempt recorded';

  -- duplicate-day insert must fail (unique)
  begin
    insert into public.quiz_attempts (user_id, day, question_id, selected_index, is_correct)
    values (v_user, date '2999-01-01', v_qid, 1, false);
    raise exception 'duplicate should have failed';
  exception when unique_violation then null;
  end;

  -- streak bonus values match the milestone table
  assert public.quiz_streak_bonus(3) = 20, 'streak 3';
  assert public.quiz_streak_bonus(7) = 50, 'streak 7';
  assert public.quiz_streak_bonus(2) = 0,  'streak 2';

  raise notice 'probe ok';
  rollback;  -- inside DO this raises; see cleanup below
exception when others then
  -- ensure no residue regardless of path
  delete from public.point_events where period_label = '2999-01-01' and reason = 'quiz:daily';
  delete from public.quiz_attempts where day = date '2999-01-01';
  if sqlerrm <> 'probe ok-rollback' then raise; end if;
end $$;
```

> 주의: `do` 블록 안에서는 `rollback`을 쓸 수 없으므로, 실제로는 두 단계로 한다 — (a) 위 단언 블록에서 `rollback` 줄을 빼고 실행, (b) 마지막에 명시적으로 정리 DELETE를 실행해 `day = '2999-01-01'` / `period_label='2999-01-01'` 흔적을 모두 제거. 정리 후 다음 확인:

```sql
select count(*) as leftover_attempts from public.quiz_attempts where day = date '2999-01-01';
select count(*) as leftover_points from public.point_events where period_label = '2999-01-01' and reason = 'quiz:daily';
```

Expected: 두 카운트 모두 `0`. (단언이 모두 통과하고 잔존 데이터 0이면 합격.)

- [ ] **Step 4: Supabase advisor 확인 (MCP get_advisors)**

`get_advisors(type: "security")` 실행. Expected: 신규 함수가 기존과 동일한 "SECURITY DEFINER executable by authenticated" 양성 WARN만 추가(ERROR 0).

- [ ] **Step 5: Commit (사용자가 커밋을 요청한 경우에만)**

```bash
git add docs/superpowers/migrations/2026-06-30-daily-quiz.sql
git commit -m "feat(quiz): add daily quiz tables and server-authoritative RPCs"
```

---

## Task 2: 순수 도메인 — 타입 + `quizStreakBonus`

**Files:**
- Create: `src/features/quiz/domain/quiz.ts`
- Test: `src/features/quiz/__tests__/quiz.test.ts`

**Interfaces:**
- Produces:
  - `type QuizView = { questionId: string | null; optionCount: number; participationPoints: number; bonusPoints: number; attempted: boolean; selectedIndex: number | null; isCorrect: boolean | null; correctIndex: number | null; awarded: number | null; streak: number }`
  - `type QuizQuestionContent = { prompt: string; options: readonly string[]; explanation: string; actionLabel?: string; actionHref?: string }`
  - `function quizStreakBonus(streak: number, milestones?: Record<number, number>): number`

- [ ] **Step 1: 실패 테스트 작성**

`src/features/quiz/__tests__/quiz.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { quizStreakBonus } from "../domain/quiz";

describe("quizStreakBonus", () => {
  it("awards milestone bonuses only at exact streak lengths", () => {
    expect(quizStreakBonus(3)).toBe(20);
    expect(quizStreakBonus(7)).toBe(50);
    expect(quizStreakBonus(14)).toBe(100);
    expect(quizStreakBonus(30)).toBe(200);
  });

  it("gives no bonus off-milestone", () => {
    expect(quizStreakBonus(1)).toBe(0);
    expect(quizStreakBonus(2)).toBe(0);
    expect(quizStreakBonus(8)).toBe(0);
    expect(quizStreakBonus(0)).toBe(0);
  });

  it("accepts a custom milestone table", () => {
    expect(quizStreakBonus(5, { 5: 99 })).toBe(99);
    expect(quizStreakBonus(6, { 5: 99 })).toBe(0);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/features/quiz/__tests__/quiz.test.ts`
Expected: FAIL (Cannot find module `../domain/quiz`).

- [ ] **Step 3: 구현**

`src/features/quiz/domain/quiz.ts`:

```ts
export type QuizView = {
  questionId: string | null;
  optionCount: number;
  participationPoints: number;
  bonusPoints: number;
  attempted: boolean;
  selectedIndex: number | null;
  isCorrect: boolean | null;
  correctIndex: number | null;
  awarded: number | null;
  streak: number;
};

export type QuizQuestionContent = {
  prompt: string;
  options: readonly string[];
  explanation: string;
  actionLabel?: string;
  actionHref?: string;
};

// MUST match the SQL function public.quiz_streak_bonus (migration daily_quiz).
// Exact-milestone bonuses folded into the day's award; off-milestone = 0.
const DEFAULT_MILESTONES: Record<number, number> = {
  3: 20,
  7: 50,
  14: 100,
  30: 200,
};

export function quizStreakBonus(
  streak: number,
  milestones: Record<number, number> = DEFAULT_MILESTONES,
): number {
  return milestones[streak] ?? 0;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/features/quiz/__tests__/quiz.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit (요청 시)**

```bash
git add src/features/quiz/domain/quiz.ts src/features/quiz/__tests__/quiz.test.ts
git commit -m "feat(quiz): add quiz domain types and streak bonus"
```

---

## Task 3: 포인트 사유 파싱 + 이력 라벨

**Files:**
- Modify: `src/features/account/domain/point-reason.ts`
- Test: `src/features/account/__tests__/point-reason.test.ts:1-17`
- Modify: `src/features/account/components/points-history.tsx:19-26`
- Modify: `src/i18n/messages/ko.ts` (me.history) and `src/i18n/messages/en.ts` (me.history)

**Interfaces:**
- Consumes: `PointEventReason` (existing union)
- Produces: `PointEventReason` now includes `{ kind: "quiz" }`; reason `"quiz:daily"` → `{ kind: "quiz" }`.

- [ ] **Step 1: 실패 테스트 추가**

`src/features/account/__tests__/point-reason.test.ts`에 추가:

```ts
  it("recognizes a quiz reason", () => {
    expect(parsePointEventReason("quiz:daily")).toEqual({ kind: "quiz" });
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/features/account/__tests__/point-reason.test.ts`
Expected: FAIL (받은 값 `{ kind: "other", reason: "quiz:daily" }`).

- [ ] **Step 3: 구현 — point-reason.ts**

`src/features/account/domain/point-reason.ts` 전체:

```ts
export type PointEventReason =
  | { kind: "verified-savings" }
  | { kind: "mission"; code: string }
  | { kind: "goal"; id: string }
  | { kind: "quiz" }
  | { kind: "other"; reason: string };

export function parsePointEventReason(reason: string): PointEventReason {
  if (reason === "verified-savings") return { kind: "verified-savings" };
  if (reason.startsWith("qr:")) return { kind: "mission", code: reason.slice(3) };
  if (reason.startsWith("goal:")) return { kind: "goal", id: reason.slice(5) };
  if (reason.startsWith("quiz:")) return { kind: "quiz" };
  return { kind: "other", reason };
}
```

- [ ] **Step 4: 이력 라벨 — points-history.tsx**

`src/features/account/components/points-history.tsx`의 `label` 함수(19-26줄)를 다음으로 교체:

```tsx
  function label(reason: string): string {
    const parsed = parsePointEventReason(reason);
    if (parsed.kind === "verified-savings") return me.history.verifiedSavings;
    if (parsed.kind === "mission") return missions[parsed.code]?.title ?? parsed.code;
    if (parsed.kind === "goal")
      return `${goalTitles[parsed.id] ?? parsed.id} · ${me.history.goalBonus}`;
    if (parsed.kind === "quiz") return me.history.quiz;
    return parsed.reason;
  }
```

- [ ] **Step 5: i18n `me.history.quiz` 추가**

`src/i18n/messages/ko.ts`의 `me.history` 블록(현재 `title`/`verifiedSavings`/`goalBonus`/`empty`)에 추가:

```ts
      quiz: "환경 퀴즈",
```

`src/i18n/messages/en.ts`의 동일 `me.history` 블록에 추가:

```ts
      quiz: "Eco quiz",
```

- [ ] **Step 6: 통과 확인**

Run: `npx vitest run src/features/account/__tests__/point-reason.test.ts`
Expected: PASS (5 tests).
Run: `npx tsc --noEmit` — points-history.tsx의 `me.history.quiz` 참조가 타입에 존재하는지 확인(신규 오류 0; 기존 테스트 파일 한정 오류는 무관).

- [ ] **Step 7: Commit (요청 시)**

```bash
git add src/features/account/domain/point-reason.ts src/features/account/__tests__/point-reason.test.ts src/features/account/components/points-history.tsx src/i18n/messages/ko.ts src/i18n/messages/en.ts
git commit -m "feat(quiz): parse quiz point reason and label in history"
```

---

## Task 4: i18n 문항 텍스트 (ko/en) + 대칭 테스트

**Files:**
- Modify: `src/i18n/messages/ko.ts` (me 블록)
- Modify: `src/i18n/messages/en.ts` (me 블록)
- Test: `src/i18n/__tests__/messages.test.ts`

**Interfaces:**
- Produces: `messages.me.quiz`(상태 문자열) + `messages.me.quizQuestions[id]`(문항 콘텐츠). 8개 id: `q-led, q-standby, q-tumbler, q-stairs, q-aircon, q-recycle, q-shower, q-paper`. 각 `options` 길이 3, `correct_index`는 Task 1 시드와 일치.

- [ ] **Step 1: ko.ts — `me.quiz` + `me.quizQuestions` 추가**

`src/i18n/messages/ko.ts`의 `me: { ... }` 안, `goalTitles` 다음에 추가:

```ts
    quiz: {
      title: "오늘의 환경 퀴즈",
      submit: "제출",
      submitting: "제출 중…",
      correct: "정답!",
      incorrect: "오답",
      answerTag: "정답",
      yourAnswerTag: "내 답",
      awarded: "+{points} 적립",
      streak: "🔥 {days}일 연속",
      explanationTitle: "해설",
      empty: "오늘 풀 수 있는 퀴즈가 없어요.",
      error: "잠시 후 다시 시도해주세요.",
    },
    quizQuestions: {
      "q-led": {
        prompt: "LED 전구는 백열전구 대비 전력 소비가 약 얼마나 적을까요?",
        options: ["약 20% 적다", "약 80% 적다", "차이가 없다"],
        explanation: "LED는 같은 밝기에서 백열전구보다 약 80% 적은 전력을 씁니다.",
        actionLabel: "관련 미션 보기",
        actionHref: "/scan/lights-off",
      },
      "q-standby": {
        prompt: "쓰지 않는 가전의 대기전력을 줄이는 가장 효과적인 방법은?",
        options: ["화면 밝기 낮추기", "멀티탭 전원 끄기", "음량 줄이기"],
        explanation: "대기전력은 플러그가 꽂혀만 있어도 소모됩니다. 멀티탭을 끄면 차단됩니다.",
      },
      "q-tumbler": {
        prompt: "일회용 컵 대신 텀블러를 쓰면 주로 무엇을 줄일까요?",
        options: ["물 사용량", "일회용 폐기물", "소음"],
        explanation: "텀블러는 반복 사용으로 일회용 컵 폐기물을 크게 줄입니다.",
        actionLabel: "관련 미션 보기",
        actionHref: "/scan/tumbler",
      },
      "q-stairs": {
        prompt: "엘리베이터 대신 계단을 이용하면 무엇을 절약할까요?",
        options: ["전력 소비", "수돗물", "난방비만"],
        explanation: "엘리베이터 운행 전력을 줄이고 건강에도 좋습니다.",
        actionLabel: "관련 미션 보기",
        actionHref: "/scan/stairs",
      },
      "q-aircon": {
        prompt: "여름철 냉방 권장 적정 온도는?",
        options: ["18도", "26도", "30도"],
        explanation: "여름 냉방 적정 온도는 약 26도입니다. 1도만 높여도 전력이 절약됩니다.",
      },
      "q-recycle": {
        prompt: "페트병을 분리수거할 때 가장 좋은 방법은?",
        options: ["라벨 떼고 압착해서", "뚜껑 닫아 그대로", "물을 채워서"],
        explanation: "라벨을 제거하고 압착하면 재활용 품질과 부피 효율이 높아집니다.",
        actionLabel: "관련 미션 보기",
        actionHref: "/scan/recycle",
      },
      "q-shower": {
        prompt: "샤워 시간을 줄이면 절약되는 주요 자원은?",
        options: ["전기만", "물과 온수 에너지", "가스만"],
        explanation: "물 자체와 물을 데우는 에너지를 함께 절약합니다.",
      },
      "q-paper": {
        prompt: "이면지(양면) 사용의 환경적 이점은?",
        options: ["종이 소비 절감", "잉크 증가", "전력 증가"],
        explanation: "한 장을 양면으로 쓰면 종이 소비와 벌목 부담을 줄입니다.",
      },
    },
```

- [ ] **Step 2: en.ts — 동일 키(영문) 추가**

`src/i18n/messages/en.ts`의 `me: { ... }` 안 같은 위치에 추가:

```ts
    quiz: {
      title: "Today's eco quiz",
      submit: "Submit",
      submitting: "Submitting…",
      correct: "Correct!",
      incorrect: "Incorrect",
      answerTag: "Answer",
      yourAnswerTag: "Your answer",
      awarded: "+{points} earned",
      streak: "🔥 {days}-day streak",
      explanationTitle: "Explanation",
      empty: "No quiz available today.",
      error: "Please try again in a moment.",
    },
    quizQuestions: {
      "q-led": {
        prompt: "About how much less power does an LED bulb use vs an incandescent?",
        options: ["About 20% less", "About 80% less", "No difference"],
        explanation: "At equal brightness, LEDs use roughly 80% less power than incandescent bulbs.",
        actionLabel: "See related mission",
        actionHref: "/scan/lights-off",
      },
      "q-standby": {
        prompt: "Most effective way to cut standby power of idle appliances?",
        options: ["Lower screen brightness", "Switch off the power strip", "Lower the volume"],
        explanation: "Standby power drains while plugged in. A power strip switch cuts it off.",
      },
      "q-tumbler": {
        prompt: "Using a tumbler instead of a paper cup mainly reduces what?",
        options: ["Water use", "Single-use waste", "Noise"],
        explanation: "A reusable tumbler greatly reduces single-use cup waste.",
        actionLabel: "See related mission",
        actionHref: "/scan/tumbler",
      },
      "q-stairs": {
        prompt: "Taking the stairs instead of the elevator saves what?",
        options: ["Electricity", "Tap water", "Heating only"],
        explanation: "It cuts elevator power use and is good for your health.",
        actionLabel: "See related mission",
        actionHref: "/scan/stairs",
      },
      "q-aircon": {
        prompt: "Recommended summer cooling temperature?",
        options: ["18°C", "26°C", "30°C"],
        explanation: "About 26°C is recommended; even 1°C higher saves power.",
      },
      "q-recycle": {
        prompt: "Best way to recycle a PET bottle?",
        options: ["Remove label, crush it", "Leave the cap on", "Fill it with water"],
        explanation: "Removing the label and crushing improves recycling quality and volume.",
        actionLabel: "See related mission",
        actionHref: "/scan/recycle",
      },
      "q-shower": {
        prompt: "Shorter showers mainly save which resources?",
        options: ["Electricity only", "Water and heating energy", "Gas only"],
        explanation: "You save both the water and the energy used to heat it.",
      },
      "q-paper": {
        prompt: "Environmental benefit of double-sided paper use?",
        options: ["Less paper used", "More ink", "More electricity"],
        explanation: "Using both sides cuts paper consumption and logging pressure.",
      },
    },
```

- [ ] **Step 3: 대칭 단언 추가 — messages.test.ts**

`src/i18n/__tests__/messages.test.ts`에 새 it 블록 추가:

```ts
  it("keeps quiz question ids symmetric across locales", () => {
    expect(Object.keys(enMessages.me.quizQuestions)).toEqual(
      Object.keys(koMessages.me.quizQuestions),
    );
    for (const id of Object.keys(koMessages.me.quizQuestions)) {
      const ko = koMessages.me.quizQuestions[
        id as keyof typeof koMessages.me.quizQuestions
      ];
      const en = enMessages.me.quizQuestions[
        id as keyof typeof enMessages.me.quizQuestions
      ];
      expect(en.options.length).toBe(ko.options.length);
    }
  });
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/i18n/__tests__/messages.test.ts`
Expected: PASS (기존 + 신규 1).
Run: `npx tsc --noEmit` — ko/en 비대칭이 있으면 여기서 잡힘(신규 오류 0 목표).

- [ ] **Step 5: Commit (요청 시)**

```bash
git add src/i18n/messages/ko.ts src/i18n/messages/en.ts src/i18n/__tests__/messages.test.ts
git commit -m "feat(quiz): add bilingual quiz question content"
```

---

## Task 5: DAL — `getTodayQuiz`

**Files:**
- Create: `src/features/quiz/data/quiz-dal.ts`

**Interfaces:**
- Consumes: `get_today_quiz()` RPC (Task 1), `QuizView` (Task 2), `createServerSupabaseClient` (`src/features/account/supabase/server.ts`)
- Produces: `async function getTodayQuiz(): Promise<QuizView>`

- [ ] **Step 1: 구현**

`src/features/quiz/data/quiz-dal.ts`:

```ts
import "server-only";
import { createServerSupabaseClient } from "@/features/account/supabase/server";
import type { QuizView } from "../domain/quiz";

type TodayQuizRow = {
  question_id: string | null;
  option_count: number | null;
  participation_points: number | null;
  bonus_points: number | null;
  attempted: boolean;
  selected_index: number | null;
  is_correct: boolean | null;
  correct_index: number | null;
  awarded: number | null;
  streak: number | null;
};

export async function getTodayQuiz(): Promise<QuizView> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_today_quiz");
  if (error) throw new Error(`Failed to load today's quiz: ${error.message}`);

  const row = ((data ?? []) as TodayQuizRow[])[0];
  if (!row) {
    return {
      questionId: null,
      optionCount: 0,
      participationPoints: 0,
      bonusPoints: 0,
      attempted: false,
      selectedIndex: null,
      isCorrect: null,
      correctIndex: null,
      awarded: null,
      streak: 0,
    };
  }

  return {
    questionId: row.question_id,
    optionCount: row.option_count ?? 0,
    participationPoints: row.participation_points ?? 0,
    bonusPoints: row.bonus_points ?? 0,
    attempted: row.attempted,
    selectedIndex: row.selected_index,
    isCorrect: row.is_correct,
    correctIndex: row.correct_index,
    awarded: row.awarded,
    streak: row.streak ?? 0,
  };
}
```

- [ ] **Step 2: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 신규 오류 0.

- [ ] **Step 3: Commit (요청 시)**

```bash
git add src/features/quiz/data/quiz-dal.ts
git commit -m "feat(quiz): add getTodayQuiz DAL"
```

---

## Task 6: 서버 액션 — `submitQuizAnswerAction`

**Files:**
- Create: `src/features/quiz/actions/submit-quiz.ts`

**Interfaces:**
- Consumes: `submit_quiz_answer(p_question_id, p_selected_index)` RPC (Task 1), `normalizeLocale` (`@/i18n/config`), `createServerSupabaseClient`
- Produces: `type SubmitQuizState = { status: "idle" | "completed" | "already" | "invalid" | "error" }`; `async function submitQuizAnswerAction(prev, formData): Promise<SubmitQuizState>`. 폼 필드: `questionId`, `selectedIndex`, `locale`.

- [ ] **Step 1: 구현**

`src/features/quiz/actions/submit-quiz.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { normalizeLocale } from "@/i18n/config";
import { createServerSupabaseClient } from "@/features/account/supabase/server";

export type SubmitQuizState = {
  status: "idle" | "completed" | "already" | "invalid" | "error";
};

export async function submitQuizAnswerAction(
  _prevState: SubmitQuizState,
  formData: FormData,
): Promise<SubmitQuizState> {
  const questionId = String(formData.get("questionId") ?? "");
  const selectedIndex = Number(formData.get("selectedIndex"));
  const locale = normalizeLocale(formData.get("locale"));

  if (!Number.isInteger(selectedIndex)) return { status: "invalid" };

  const supabase = await createServerSupabaseClient();

  // Authoritative: submit_quiz_answer validates that p_question_id is today's
  // question, grades server-side, and awards participation + correct bonus +
  // streak bonus. The client cannot set the points or read the answer early.
  const { data, error } = await supabase.rpc("submit_quiz_answer", {
    p_question_id: questionId,
    p_selected_index: selectedIndex,
  });
  if (error) return { status: "error" };

  const result = ((data ?? []) as { result: string }[])[0]?.result;

  if (result === "completed") {
    revalidatePath(`/${locale}/me`);
    revalidatePath(`/${locale}`);
    return { status: "completed" };
  }
  if (result === "already") return { status: "already" };
  if (result === "invalid") return { status: "invalid" };
  return { status: "error" };
}
```

- [ ] **Step 2: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 신규 오류 0.

- [ ] **Step 3: Commit (요청 시)**

```bash
git add src/features/quiz/actions/submit-quiz.ts
git commit -m "feat(quiz): add submitQuizAnswer server action"
```

---

## Task 7: `DailyQuiz` 카드 컴포넌트

**Files:**
- Create: `src/features/quiz/components/daily-quiz.tsx`
- Test: `src/features/quiz/__tests__/daily-quiz.test.tsx`

**Interfaces:**
- Consumes: `QuizView` (Task 2), `submitQuizAnswerAction`/`SubmitQuizState` (Task 6), `useI18n`, `formatPoints`, `interpolate`, `PendingButtonContent`, `profile-surface.module.css`
- Produces: `function DailyQuiz({ quiz }: { quiz: QuizView })`

- [ ] **Step 1: 실패 테스트 작성**

`src/features/quiz/__tests__/daily-quiz.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      me: {
        quiz: {
          title: "오늘의 환경 퀴즈",
          submit: "제출",
          submitting: "제출 중…",
          correct: "정답!",
          incorrect: "오답",
          answerTag: "정답",
          yourAnswerTag: "내 답",
          awarded: "+{points} 적립",
          streak: "🔥 {days}일 연속",
          explanationTitle: "해설",
          empty: "오늘 풀 수 있는 퀴즈가 없어요.",
          error: "잠시 후 다시 시도해주세요.",
        },
        quizQuestions: {
          "q-led": {
            prompt: "LED 전구 문제",
            options: ["약 20%", "약 80%", "차이 없음"],
            explanation: "LED 해설",
            actionLabel: "관련 미션 보기",
            actionHref: "/scan/lights-off",
          },
        },
      },
    },
  }),
}));

let mockActionState: [{ status: string }, () => void, boolean] = [
  { status: "idle" },
  () => {},
  false,
];

vi.mock("react", async (orig) => {
  const actual = await orig<typeof import("react")>();
  return { ...actual, useActionState: () => mockActionState };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

import { DailyQuiz } from "../components/daily-quiz";
import type { QuizView } from "../domain/quiz";

const base: QuizView = {
  questionId: "q-led",
  optionCount: 3,
  participationPoints: 10,
  bonusPoints: 30,
  attempted: false,
  selectedIndex: null,
  isCorrect: null,
  correctIndex: null,
  awarded: null,
  streak: 0,
};

function setup() {
  const container = document.createElement("div");
  const root: Root = createRoot(container);
  document.body.append(container);
  return { container, root };
}

describe("DailyQuiz", () => {
  afterEach(() => {
    document.body.replaceChildren();
    mockActionState = [{ status: "idle" }, () => {}, false];
  });

  it("renders the prompt and option submit buttons when unattempted", async () => {
    const { container, root } = setup();
    await act(async () => root.render(<DailyQuiz quiz={base} />));
    expect(container.textContent).toContain("LED 전구 문제");
    const buttons = container.querySelectorAll<HTMLButtonElement>(
      'button[name="selectedIndex"]',
    );
    expect(buttons.length).toBe(3);
    expect(buttons[1]?.value).toBe("1");
    await act(async () => root.unmount());
  });

  it("does not reveal the answer or explanation when unattempted", async () => {
    const { container, root } = setup();
    await act(async () => root.render(<DailyQuiz quiz={base} />));
    expect(container.textContent).not.toContain("LED 해설");
    expect(container.textContent).not.toContain("정답!");
    await act(async () => root.unmount());
  });

  it("shows correct result, award, streak, explanation, and deep link when attempted correctly", async () => {
    const attempted: QuizView = {
      ...base,
      attempted: true,
      selectedIndex: 1,
      isCorrect: true,
      correctIndex: 1,
      awarded: 40,
      streak: 3,
    };
    const { container, root } = setup();
    await act(async () => root.render(<DailyQuiz quiz={attempted} />));
    expect(container.textContent).toContain("정답!");
    expect(container.textContent).toContain("LED 해설");
    expect(container.textContent).toContain("+40점 적립");
    expect(container.textContent).toContain("🔥 3일 연속");
    const link = container.querySelector<HTMLAnchorElement>('a[href="/ko/scan/lights-off"]');
    expect(link).not.toBeNull();
    await act(async () => root.unmount());
  });

  it("marks an incorrect attempt", async () => {
    const attempted: QuizView = {
      ...base,
      attempted: true,
      selectedIndex: 0,
      isCorrect: false,
      correctIndex: 1,
      awarded: 10,
      streak: 1,
    };
    const { container, root } = setup();
    await act(async () => root.render(<DailyQuiz quiz={attempted} />));
    expect(container.textContent).toContain("오답");
    expect(container.textContent).toContain("+10점 적립");
    await act(async () => root.unmount());
  });

  it("shows an empty state when there is no question today", async () => {
    const empty: QuizView = { ...base, questionId: null };
    const { container, root } = setup();
    await act(async () => root.render(<DailyQuiz quiz={empty} />));
    expect(container.textContent).toContain("오늘 풀 수 있는 퀴즈가 없어요.");
    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/features/quiz/__tests__/daily-quiz.test.tsx`
Expected: FAIL (Cannot find module `../components/daily-quiz`).

- [ ] **Step 3: 구현**

`src/features/quiz/components/daily-quiz.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Brain } from "lucide-react";
import { PendingButtonContent } from "@/features/ui/pending-button-content";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import {
  submitQuizAnswerAction,
  type SubmitQuizState,
} from "../actions/submit-quiz";
import type { QuizQuestionContent, QuizView } from "../domain/quiz";
import surface from "@/features/account/components/profile-surface.module.css";

const initialState: SubmitQuizState = { status: "idle" };

export function DailyQuiz({ quiz }: { quiz: QuizView }) {
  const { locale, messages } = useI18n();
  const copy = messages.me.quiz;
  const questions = messages.me.quizQuestions as Record<
    string,
    QuizQuestionContent
  >;
  const [state, formAction, pending] = useActionState(
    submitQuizAnswerAction,
    initialState,
  );

  const content = quiz.questionId ? questions[quiz.questionId] : undefined;

  function header() {
    return (
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Brain className="h-4 w-4 text-accent" aria-hidden="true" />
        {copy.title}
      </h2>
    );
  }

  if (!quiz.questionId || !content) {
    return (
      <section className={surface.section}>
        {header()}
        <p className="mt-3 text-sm text-ink-muted">{copy.empty}</p>
      </section>
    );
  }

  if (quiz.attempted) {
    return (
      <section className={surface.section}>
        {header()}
        <p className="mt-3 text-sm font-medium text-ink">{content.prompt}</p>
        <ul className="mt-3 grid gap-2">
          {content.options.map((option, index) => {
            const isAnswer = index === quiz.correctIndex;
            const isMine = index === quiz.selectedIndex;
            return (
              <li
                key={index}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                  isAnswer
                    ? "border-saving bg-saving/10 text-ink"
                    : isMine
                      ? "border-overuse bg-overuse/10 text-ink"
                      : "border-line text-ink-muted"
                }`}
              >
                <span>{option}</span>
                {isAnswer ? (
                  <span className="text-xs font-semibold text-saving">
                    {copy.answerTag}
                  </span>
                ) : isMine ? (
                  <span className="text-xs font-semibold text-overuse">
                    {copy.yourAnswerTag}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm font-semibold text-ink">
          {quiz.isCorrect ? copy.correct : copy.incorrect}
          <span className="ml-2 text-[var(--honey-strong)]">
            {interpolate(copy.awarded, {
              points: formatPoints(locale, quiz.awarded ?? 0),
            })}
          </span>
        </p>
        <p className="mt-1 text-xs font-semibold text-accent">
          {interpolate(copy.streak, { days: quiz.streak })}
        </p>
        <div className="mt-3 rounded-xl bg-inset px-3 py-2.5">
          <p className="text-xs font-semibold text-ink-muted">
            {copy.explanationTitle}
          </p>
          <p className="mt-1 text-sm text-ink">{content.explanation}</p>
          {content.actionHref && content.actionLabel ? (
            <Link
              href={`/${locale}${content.actionHref}`}
              className="mt-2 inline-block text-xs font-semibold text-accent"
            >
              {content.actionLabel} →
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={surface.section}>
      {header()}
      <p className="mt-3 text-sm font-medium text-ink">{content.prompt}</p>
      {state.status === "error" || state.status === "invalid" ? (
        <p className="mt-2 text-xs text-overuse">{copy.error}</p>
      ) : null}
      <form action={formAction} className="mt-3 grid gap-2">
        <input type="hidden" name="questionId" value={quiz.questionId} />
        <input type="hidden" name="locale" value={locale} />
        {content.options.map((option, index) => (
          <button
            key={index}
            type="submit"
            name="selectedIndex"
            value={index}
            disabled={pending}
            aria-busy={pending}
            className="rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm text-ink transition hover:bg-surface-3 disabled:opacity-60"
          >
            <PendingButtonContent
              pending={pending}
              idleLabel={option}
              pendingLabel={copy.submitting}
              spinnerClassName="h-3 w-3"
            />
          </button>
        ))}
      </form>
    </section>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/features/quiz/__tests__/daily-quiz.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit (요청 시)**

```bash
git add src/features/quiz/components/daily-quiz.tsx src/features/quiz/__tests__/daily-quiz.test.tsx
git commit -m "feat(quiz): add DailyQuiz card component"
```

---

## Task 8: `/me` 페이지 배치 + 최종 검증

**Files:**
- Modify: `src/app/[locale]/me/page.tsx`

**Interfaces:**
- Consumes: `getTodayQuiz` (Task 5), `DailyQuiz` (Task 7)

- [ ] **Step 1: import 추가**

`src/app/[locale]/me/page.tsx` 상단 import 영역에 추가:

```tsx
import { DailyQuiz } from "@/features/quiz/components/daily-quiz";
import { getTodayQuiz } from "@/features/quiz/data/quiz-dal";
```

- [ ] **Step 2: 데이터 로드 — Promise.all에 추가**

`const [ ... ] = await Promise.all([ ... ])` 배열에 `getTodayQuiz()`를 추가하고 구조분해에 `quiz`를 추가한다. 결과:

```tsx
  const [
    messages,
    personalPoints,
    groupPool,
    events,
    goals,
    estateSubjectId,
    myLeagueAwards,
    quiz,
  ] = await Promise.all([
    getMessages(locale),
    getPersonalPointTotal(profile.userId),
    getGroupPointPool(profile.groupId),
    getMyPointEvents(profile.userId),
    getGoalsWithProgress(profile.userId),
    getGroupEstateSubjectId(profile.groupId),
    getMyLeagueAwards(profile.userId),
    getTodayQuiz(),
  ]);
```

- [ ] **Step 3: 카드 렌더 — GoalList 위에 배치**

`<ContributionGraph graph={graph} />`와 `<GoalList goals={goals} />` 사이에 추가:

```tsx
          <DailyQuiz quiz={quiz} />
```

(결과 순서: ContributionGraph → DailyQuiz → GoalList → EstateContribution → PointsHistory)

- [ ] **Step 4: 타입/린트 확인**

Run: `npx tsc --noEmit`
Expected: 신규 오류 0(기존 테스트 파일 한정 오류는 무관).
Run: `npx eslint src`
Expected: 0 errors (기존 `game-preview.tsx` 경고 2개만).

- [ ] **Step 5: 전체 테스트 + 빌드**

Run: `npm run test`
Expected: 전체 통과(신규: quiz 3 + point-reason 1 + messages 1 + daily-quiz 5).
Run: `npm run build`
Expected: 성공. `/[locale]/me`가 빌드 출력에 존재.

- [ ] **Step 6: 라이브 RPC 스모크(선택, 대표 데모 계정)**

가능하면 dev 서버에서 `demo@cems.kr`로 로그인해 `/ko/me` 진입 → "오늘의 환경 퀴즈" 카드에서 한 보기 제출 → 결과(정답/해설/획득/스트릭) 노출, 새로고침해도 응시 상태 유지, 같은 날 재제출 불가 확인. (지도/영지 풀블리드 라우트가 아닌 `/me`라 일반 페이지로 확인 가능.)

- [ ] **Step 7: Commit (요청 시)**

```bash
git add src/app/[locale]/me/page.tsx
git commit -m "feat(quiz): surface daily quiz card on /me"
```

---

## Self-Review

**Spec coverage:**
- 하루 1문제 + 결정적 회전 → Task 1 `today_quiz_question_id`. ✅
- 참여 + 정답 보너스 합산 적립 → Task 1 `submit_quiz_answer` (`v_part + bonus + streak`). ✅
- 하루 1회 + 정답/해설 공개 → `quiz_attempts` unique + `get_today_quiz` reveal-after-attempt + Task 7 result view. ✅
- /me 카드 → Task 7 + Task 8. ✅
- 보강① 스트릭 보너스 → Task 1 `quiz_streak_bonus` + Task 2 TS 미러 + 카드 스트릭 표시. ✅
- 보강② 해설→실천 딥링크 → i18n `actionHref/actionLabel`(Task 4) + 카드 링크(Task 7). ✅
- 정답 미유출 → `get_today_quiz`가 미응시 시 `correct_index` NULL(Task 1) + 컴포넌트 테스트로 검증(Task 7). ✅
- ko/en 대칭 → Task 4 + messages.test. ✅
- 포인트 이력 라벨 → Task 3. ✅

**Placeholder scan:** 모든 step에 실제 코드/명령/기대값 포함. TBD/TODO 없음. ✅

**Type consistency:** `QuizView`/`QuizQuestionContent`(Task 2)를 DAL(5)·컴포넌트(7)·페이지(8)가 동일 사용. RPC 컬럼명(snake_case)→DAL 매핑(camelCase) 일관. `submitQuizAnswerAction` 폼 필드(`questionId`/`selectedIndex`/`locale`)가 컴포넌트 hidden/버튼과 일치. SQL `quiz_streak_bonus` 값과 TS `DEFAULT_MILESTONES` 값 동일(3/7/14/30 → 20/50/100/200). ✅

## Execution Handoff

계획이 `docs/superpowers/plans/2026-06-30-daily-environment-quiz.md`에 저장됐습니다. 실행 방식 두 가지:

1. **Subagent-Driven (추천)** — 태스크마다 새 서브에이전트 디스패치 + 태스크별 2단계 리뷰(스펙/품질), 빠른 반복.
2. **Inline Execution** — 이 세션에서 executing-plans로 체크포인트 단위 배치 실행.

어느 방식으로 진행할까요?
