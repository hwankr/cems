# 일간 환경 퀴즈 설계 (Daily Environment Quiz)

> 상태: 승인됨 (2026-06-30). 구현 계획은 `docs/superpowers/plans/2026-06-30-daily-environment-quiz.md` 참고.

## 목표

매일 1문제의 환경/에너지 퀴즈를 통해 사용자가 포인트를 쌓는 기능을 추가한다. 적립은 기존 missions/goals와 동일하게 **서버 권위(SECURITY DEFINER RPC)** 로만 이뤄지고, 정답 인덱스는 클라이언트로 절대 노출되지 않는다.

## 확정된 결정 (사용자 발화 기반, 2026-06-30)

- **구성/주기:** 하루 1문제. 시드 풀에서 날짜 기준 결정적 회전으로 "오늘의 문제"를 선택.
- **지급 방식:** 참여 보상 + 정답 보너스. 제출 시 항상 참여 포인트, 정답이면 보너스 추가. 한 `point_event`에 합산.
- **오답 처리:** 하루 1회, 정답+해설 공개. 한 번 제출하면 그날은 종료, 제출 후 정답과 해설을 노출. 재시도 불가.
- **노출 위치:** `/me` 프로필 카드. `GoalList` 옆에 "오늘의 환경 퀴즈" 카드를 둔다.
- **보강 ① 스트릭 보너스:** 연속 참여일 마일스톤 도달 시 추가 포인트.
- **보강 ② 해설 → 관련 실천 딥링크:** 문항별 해설에 관련 QR 미션/영지로 가는 선택적 링크.
- **범위 제외:** 주간 퀴즈 목표(goals 연동), 지난 퀴즈 다시보기(복습)는 이번 범위 밖.

## 아키텍처 개요

기존 missions/goals 패턴을 그대로 재사용한다.

- `missions` 테이블 → `quiz_questions` 테이블 (정답/숫자만 저장)
- `mission_completions` → `quiz_attempts` (Asia/Seoul `day` + unique 제약으로 하루 1회)
- `complete_mission()` RPC → `get_today_quiz()` + `submit_quiz_answer()` RPC (서버 채점)
- 적립은 `point_events` 단일 경로 → 개인 포인트·캐릭터·그룹 풀·영지 예산·에너지 잔디 그래프·건물 기여 랭킹·리그가 **자동으로 함께 갱신**(추가 작업 없음)
- 문항 라벨/텍스트는 i18n 사전(ko/en)에 두어 대칭을 타입으로 강제 (미션 라벨과 동일 방식)

## 데이터 모델

### `quiz_questions` (비밀이 아닌 숫자만) + `quiz_answers` (정답 격리)

> **보안 수정(적용 전 SQL 리뷰 반영):** Postgres RLS는 행 단위라 열 단위 차단이 안 된다. `correct_index`를 client-readable `quiz_questions`에 두면 인증 사용자가 Supabase JS/PostgREST로 `select correct_index ...`를 직접 조회해 제출 전 정답을 볼 수 있다. 그래서 정답을 **별도 테이블 `quiz_answers`** 로 분리하고, RLS on + 정책 없음 + anon/authenticated grant revoke로 잠근다. 오직 SECURITY DEFINER 함수(소유자 권한, RLS 우회)만 읽는다.

```sql
create table public.quiz_questions (
  id text primary key,                       -- 예: 'q-led'
  option_count int not null check (option_count >= 2),
  participation_points int not null check (participation_points >= 0),
  bonus_points int not null check (bonus_points >= 0),
  active boolean not null default true
);
-- authenticated readable: 비밀 아닌 필드만 존재

create table public.quiz_answers (
  question_id text primary key references public.quiz_questions (id) on delete cascade,
  correct_index int not null check (correct_index >= 0)
);
-- RLS on + 정책 없음 + revoke all from anon, authenticated
-- => 클라이언트는 못 읽음. SECURITY DEFINER 함수만 읽음.
```

- 정답(`correct_index`)은 `quiz_answers`에만 있고 어떤 client 경로로도 읽을 수 없다. 서버 채점·미응시 reveal-차단 전용.
- `option_count`로 `submit_quiz_answer`가 `selected_index` 범위를 검증.

### `quiz_attempts` (하루 1회)

```sql
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,                         -- Asia/Seoul
  question_id text not null references public.quiz_questions (id),
  selected_index int not null,
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id);
```

- RLS: 본인 row만 select 가능(미션 완료와 동일). insert는 직접 불가 — RPC만 경유.

### i18n 문항 텍스트 (`me.quizQuestions[id]`)

```ts
quizQuestions: {
  "q-led": {
    prompt: "...",
    options: ["...", "...", "..."],          // 길이 = option_count, ko/en 동일
    explanation: "...",
    actionLabel: "관련 미션 보기",            // 선택 (보강 ②)
    actionHref: "/scan/lights-off",          // 선택, 로케일 접두는 렌더 시 부여
  },
  // ...
}
```

- `WidenMessageValues`가 `options` 배열을 readonly 튜플로 좁히므로 en.ts는 같은 길이를 유지해야 한다(미션 라벨과 동일한 ko/en 대칭 제약).
- `actionLabel`/`actionHref`는 선택. 없으면 딥링크 미표시.

## 오늘의 문제 선택 — 서버 단일 출처

TS와 SQL의 회전 로직이 어긋나 사용자가 "서버가 거부할 문제"를 푸는 사고를 막기 위해, **오늘의 문제 id는 서버만 계산한다.** 클라이언트는 TS로 문제를 고르지 않는다.

- SQL 헬퍼가 `active = true` 문항을 `id` 오름차순으로 정렬하고, `epoch_day = floor(extract(epoch from (now() at time zone 'Asia/Seoul'))/86400)` 기준 `epoch_day % count` 인덱스로 결정적 선택.
- 활성 문항이 0개면 "오늘의 문제 없음" 상태를 반환(카드가 빈 상태 표시).

## RPC

### `get_today_quiz()`

반환(단일 행):

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `question_id` | text | 오늘의 문제 id (없으면 NULL) |
| `option_count` | int | 보기 수 |
| `participation_points` | int | 참여 보상 |
| `bonus_points` | int | 정답 보너스 |
| `attempted` | bool | 오늘 응시 여부 |
| `selected_index` | int | 응시했으면 내 답, 아니면 NULL |
| `is_correct` | bool | 응시했으면 정/오답, 아니면 NULL |
| `correct_index` | int | **응시했을 때만** 정답, 미응시면 **NULL**(유출 방지) |
| `awarded` | int | 응시했으면 그날 획득 합계, 아니면 NULL |
| `streak` | int | 현재 연속 응시일(응시했으면 오늘 포함) |

- `security definer`, `authenticated`만 EXECUTE, `anon` revoke.

### `submit_quiz_answer(p_question_id text, p_selected_index int)`

반환: `(result text, is_correct boolean, correct_index int, awarded int, streak int)`

로직:

1. `auth.uid()` 없으면 예외.
2. 오늘의 문제 id 계산. `p_question_id`가 오늘의 id와 다르면 `result = 'invalid'`(다른/미래 문제 응답 차단).
3. 문항 로드. 비활성/없음이면 `'invalid'`.
4. `p_selected_index`가 `0..option_count-1` 밖이면 `'invalid'`.
5. `quiz_attempts`에 insert. `unique(user_id, day)` 위반이면 `'already'`(저장된 결과는 페이지가 `get_today_quiz`로 재조회).
6. `is_correct = (p_selected_index = correct_index)`.
7. 스트릭 계산: 오늘 포함, 연속된 `day`가 끊기기 전까지의 응시일 수.
8. `awarded = participation_points + (is_correct ? bonus_points : 0) + quizStreakBonus(streak)`.
9. `point_events`(reason `'quiz:daily'`, period_label = `to_char(day,'YYYY-MM-DD')`, points = `awarded`)에 insert, `on conflict (user_id, reason, period_label) do nothing`(멱등).
10. `('completed', is_correct, correct_index, awarded, streak)` 반환.

- `security definer`, `authenticated`만 EXECUTE, `anon` revoke.

## 스트릭 보너스 (보강 ①)

- 스트릭 = 오늘 포함, Asia/Seoul 기준 연속 응시일.
- **마일스톤 정확 도달 시에만** 그날 적립액에 합산(데모값, 추후 조정 가능):

  | 스트릭 | 보너스 |
  | --- | --- |
  | 3일 | +20 |
  | 7일 | +50 |
  | 14일 | +100 |
  | 30일 | +200 |
  | 그 외 | 0 |

- 하루 1 `point_event`라 멱등(같은 날 재제출은 do-nothing). 스트릭이 끊겼다 다시 쌓이면 마일스톤 재도달 가능(정상 동작).
- `/me` 카드에 "🔥 N일 연속" 표시.

## 순수 도메인 (TDD 대상)

채점·적립은 SQL이 권위지만, 표시/검증용 순수 TS 함수를 둔다.

- `quizStreakBonus(streak: number, milestones?: Record<number, number>): number` — 스트릭 보너스. 기본 마일스톤 테이블을 SQL과 동일하게 고정하고 단위테스트로 표 잠금(SQL 값과의 회귀 방지 문서 주석 포함).
- `parsePointEventReason`에 `{ kind: "quiz" }` 추가 — reason `'quiz:daily'` 파싱. 포인트 이력에서 "환경 퀴즈"로 표기.

> 주의: TS의 `quizStreakBonus`는 **표시·검증용**이며 적립 권위가 아니다. 실제 적립액은 RPC 반환(`awarded`)이 출처다. 두 곳의 마일스톤 값이 일치해야 하며, 단위테스트와 RPC 프로브로 각각 고정한다.

## UI — `/me` 카드

새 클라이언트 컴포넌트 `DailyQuiz`를 `GoalList` 옆에 배치.

- **오늘의 문제 없음**(활성 문항 0): 짧은 빈 상태.
- **미응시:** 문제(`prompt`) + 보기 버튼 N개. 보기 클릭 → `submitQuizAnswerAction`(hidden: `questionId`, `selectedIndex`, `locale`). pending 시 스피너 + `aria-busy`(`PendingButtonContent` 재사용).
- **응시 후:** 정답 보기 강조(초록) + 내 답이 오답이면 빨강 표시 + `explanation` + "획득 +N" + "🔥 N일 연속" + (있으면) `actionLabel`/`actionHref` 딥링크(`/{locale}` 접두).

데이터: DAL `getTodayQuiz(userId)`가 `get_today_quiz` RPC를 호출해 타입 객체로 매핑. `/me` 페이지(`src/app/[locale]/me/page.tsx`)가 `Promise.all`에 추가하고 i18n 문항 텍스트와 합쳐 컴포넌트에 전달. `submitQuizAnswerAction`은 `completed` 시 `revalidatePath('/{locale}/me')` + `'/{locale}'`.

## i18n 키 (ko/en 대칭)

- `me.quiz`: `{ title, todayBadge, submit, submitting, correct, incorrect, awardedLabel, streakLabel, emptyToday, alreadyToday }` 류 상태 문자열.
- `me.quizQuestions`: 문항 id별 `{ prompt, options[], explanation, actionLabel?, actionHref? }`.
- 키 추가/삭제 시 `Messages` 타입이 `koMessages` 파생이라 빌드가 누락 참조를 잡는다(기존 안전망).

## 시드 & 마이그레이션

- 7~10개 문항 시드(회전 다양성 확보). 각 문항: `id`, `correct_index`, `option_count`, `participation_points`(기본 10), `bonus_points`(기본 30), `active`.
- ko/en 문항 텍스트(보기 배열 길이 = `option_count`).
- 마이그레이션은 `docs/superpowers/migrations/2026-06-30-daily-quiz.sql`에 기록하고 Supabase MCP `apply_migration name=daily_quiz`로 라이브 `cems`(ref `zvuqmagfpdyrrzyjntue`)에 적용.

## 검증 전략

- 순수 도메인 Vitest: `quizStreakBonus` 표 고정, `parsePointEventReason` quiz 케이스.
- `DailyQuiz` 컴포넌트: 미응시/응시-정답/응시-오답/딥링크/빈 상태 렌더 테스트(jsdom).
- RPC 자가-롤백 프로브: (a) 미응시 시 `correct_index` NULL(유출 없음), (b) 다른 id 제출 → `invalid`, (c) 범위 밖 인덱스 → `invalid`, (d) 첫 제출 → `completed` + 참여/보너스 적립, (e) 같은 날 재제출 → `already`(중복 적립 없음), (f) 스트릭 마일스톤 적립, (g) `point_events` 합계가 `awarded`와 일치. 프로브는 데이터 잔존 없이 롤백.
- `npm run test`(전체), `npx eslint src`(0 errors, 기존 `game-preview.tsx` 경고 2개 허용), `npm run build` 통과.

## 보안 고려

- **정답은 `quiz_answers` 테이블에 격리**(RLS on·정책 없음·anon/authenticated grant revoke). 어떤 client(JS/PostgREST/대시보드)도 직접 읽을 수 없고, SECURITY DEFINER 함수만 소유자 권한으로 읽는다. (열 단위 차단이 불가능한 RLS 특성 때문에 단일 테이블+RLS로는 부족 — 적용 전 SQL 리뷰에서 발견·수정.)
- 정답 인덱스는 미응시 상태에서 어떤 응답에도 포함되지 않는다(`get_today_quiz`가 미응시 시 `correct_index` NULL 반환).
- 채점은 전적으로 RPC 내부. 클라이언트가 보낼 수 있는 값은 `question_id`와 `selected_index`뿐이며, 서버가 "오늘의 문제"인지 검증.
- 적립액은 RPC가 결정(클라이언트가 포인트를 못 정함). 하루 1회 + 멱등.
- `point_events` 직접 insert는 기존 RLS로 계속 차단 — 신규 RPC만 권위 경로.
- Supabase advisor(적용 후 확인): 신규 3개 RPC(`today_quiz_question_id`/`get_today_quiz`/`submit_quiz_answer`)가 기존과 동일한 양성 SECURITY DEFINER WARN, `quiz_answers`의 `rls_enabled_no_policy`는 의도된 잠금(INFO). ERROR 0.

## 영향 없는 것(불변)

- 경제 계산식(`save_estate`, 에코, 영지 카탈로그), 지도/영지/리그 UI, 기존 미션/목표/체크포인트 로직.
- 퀴즈 포인트는 일반 `point_events`라 잔디 그래프·기여 랭킹·그룹 풀·영지 예산에 기존 경로로 자연 반영(코드 변경 0).
