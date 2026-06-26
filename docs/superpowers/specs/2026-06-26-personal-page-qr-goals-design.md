# 개인 페이지 + QR 적립 + 목표 설계 (Design Spec)

**작성일:** 2026-06-26
**상태:** 승인됨 (브레인스토밍 → 이 스펙 → writing-plans)

## 목표 (Goal)

로그인한 참여자가 전용 "내 페이지"(`/me`)에서 자신의 포인트 이력·캐릭터·일간/주간 목표·영지 기여를 보고, 캠퍼스 곳곳의 **QR을 스캔해 미션을 인증하면 서버 권위로 포인트가 적립**되며, 목표 달성 시 서버 재검증 보너스를 받는 데모 가능한 수직 슬라이스를 만든다.

## 배경 (현재 저장소 사실)

- 스택: Next.js 16.2.9, React 19.2.4, TypeScript, Tailwind CSS v4, Mapbox GL JS, lucide-react, Vitest. 로케일 라우트 `/ko`·`/en`.
- 인증/DB: Supabase 프로젝트 `cems`(ref `zvuqmagfpdyrrzyjntue`, ap-northeast-2). 이메일+비밀번호 인증, `src/features/account/`.
- 라우트: `/[locale]`(홈=`CampusEnergyApp`, 인증 게이트), `/[locale]/login`·`/signup`·`/onboarding`, `/[locale]/subjects/[subjectId]/estate`(전용 라우트 패턴 존재).
- 두 모드(클라이언트 상태): `admin`(기본=풀스크린 Mapbox 지도, `AdminMapView`), `participant`(`ParticipantDashboard`: 개인 포인트·그룹 풀·보상받기·캐릭터·소속 순위). 모드 전환은 `MapSettingsPopover`/`BottomNav`.
- 경제는 **서버 권위**: `point_events`/`estates` 직접 쓰기 차단, 변형은 SECURITY DEFINER RPC(`claim_period_reward`, `save_estate`)로만. 개인 포인트 = 내 `point_events` 합, 그룹 풀 = 그룹원 전체 합, 캐릭터는 개인 포인트로 성장, 영지 예산 = 그룹 풀.

## 전역 제약 (Global Constraints)

- 모든 경제 변형(포인트 적립)은 **서버 권위 RPC**로만. 클라이언트가 금액/자격을 정할 수 없다. `point_events`/`mission_completions` 직접 insert는 RLS로 차단한다.
- 기존 `point_events` 스키마를 재사용: `points int check (points >= 0)`, `unique(user_id, reason, period_label)`. QR/목표 포인트도 이 테이블 한 줄로 떨어져 개인 포인트·캐릭터·그룹 풀·영지 예산이 자동 동기화된다(새 경제 축 없음).
- 한국어 우선. 모든 표시 문자열은 `src/i18n/messages/ko.ts`·`en.ts` 양쪽에 추가한다.
- "오늘/이번 주" 시간 경계는 **Asia/Seoul** 기준으로 Postgres에서 계산한다(표시·지급 일치).
- 오픈 리다이렉트 금지: 로그인 `next` 복귀 경로는 같은 사이트 경로로 검증한다(기존 `normalizeLocale` 정신).
- Next.js 코드 작성 전 `AGENTS.md`에 따라 `node_modules/next/dist/docs/`의 관련 문서를 확인한다.
- 기존 `ParticipantDashboard`는 유지하고 "내 페이지 →" 링크만 추가한다(중복 최소화, 기존 테스트 보존).

## 표면 4곳 (Surfaces)

### 1. 내 페이지 — `/[locale]/me` (신규 라우트, 서버 컴포넌트)

인증 게이트(미로그인→`/login`, 프로필 없음→`/onboarding`) 후 다음을 표시:

- **프로필 헤더**: 표시 이름, 캐릭터 레벨/칭호(`getCharacterProgress`), 총 개인 포인트.
- **캐릭터 카드**: 기존 `CharacterCard` 재사용.
- **일간/주간 목표**: 목표별 진행률 바(현재/목표), 달성 시 "보너스 받기" 버튼(`claim_goal_reward`). 이미 받았으면 "받음" 상태.
- **포인트 이력**: 내 `point_events` 최신순 리스트. reason→라벨 매핑(아래 참고).
- **영지 기여 요약**: 내 누적 포인트와 그룹 풀 내 비중(%), 내 그룹 영지로 가는 링크.
- 헤더에 지도(`/`)·로그아웃 링크.

### 2. QR 스캔 착지 — `/[locale]/scan/[code]` (신규 라우트, 서버 컴포넌트)

- 인증 게이트. 미로그인 시 `redirect(/${locale}/login?next=/${locale}/scan/${code})` → 로그인 후 복귀.
- 미션 코드로 `missions` 조회. 없거나 비활성이면 "무효한 미션" 안내.
- 미션 정보(제목·포인트) 표시 + **"미션 인증" 버튼**(클라이언트, POST 서버 액션). GET 부수효과 금지.
- 인증 결과: `completed`(+N 포인트)·`already`(오늘 이미 함)·`invalid`. 결과에 `/me`·그룹 영지 링크.

### 3. 지도 진입점 — 프로필 칩 (`AdminMapView` 상단 우측)

- 신규 `profile-chip.tsx`: 아바타(이름 이니셜)+레벨+포인트, 탭하면 `/[locale]/me`.
- `account`(displayName, personalPoints)를 `CampusEnergyApp`→`CampusEnergyShell`→`AdminMapView`로 스레딩. 레벨은 클라이언트에서 `getCharacterProgress(personalPoints)`로 계산.
- 위치: 기존 `MapSummaryChips`가 있는 top-right 클러스터(`pointer-events-auto`)에 함께.

### 4. 영지 기여 — "내 기여" 칩 (`EstateGameClient` 오버레이)

- 영지 페이지(`subjects/[subjectId]/estate/page.tsx`)가 `getPersonalPointTotal`을 추가로 로드해 개인 포인트를 넘긴다.
- `EstateGameClient`에 선택적 `contribution` prop 추가 → 오버레이에 "내 기여 N P · 풀의 X%" 칩 + `/me` 링크. 큰 클라이언트 본체 로직은 건드리지 않는다.
- 참고: 영지 스냅샷에는 아이템별 배치자(user) 귀속이 없으므로 "내가 배치한 아이템"이 아니라 **풀 기여 기반 기록**을 보여준다(귀속 추적은 범위 밖).

## 데이터 모델 (신규 테이블 3 + RPC 3)

기존 패턴(직접 쓰기 차단 + SECURITY DEFINER RPC) 준수. 마이그레이션 이름 `missions_and_goals`, 기록 `docs/superpowers/migrations/2026-06-26-missions-and-goals.sql`.

### 테이블

```sql
-- 캠퍼스에 설치되는 QR 미션 (참조 데이터)
create table public.missions (
  code text primary key,
  points int not null check (points >= 0),
  category text not null,           -- stairs | facility | waste | transport
  active boolean not null default true
);

-- 미션 인증 기록 (원장; RPC만 기록). 미션당 1일 1회.
create table public.mission_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_code text not null references public.missions (code),
  day date not null,
  created_at timestamptz not null default now(),
  unique (user_id, mission_code, day)
);
create index mission_completions_user_idx on public.mission_completions (user_id);

-- 사전정의 목표 (참조 데이터)
create table public.goals (
  id text primary key,
  scope text not null,              -- daily | weekly
  target_count int not null check (target_count > 0),
  bonus_points int not null check (bonus_points >= 0),
  active boolean not null default true
);
```

RLS: 세 테이블 모두 enable. `missions`·`goals`는 authenticated select(`using (true)`). `mission_completions`는 **본인 행만 select**(`user_id = auth.uid()`), insert 정책 없음(RPC만 기록).

### 시드 (Seed)

미션 5개 (표시 문자열은 i18n `me.missions.<code>`):

| code | category | points |
|---|---|---|
| `stairs` | stairs | 50 |
| `lights-off` | facility | 80 |
| `recycle` | waste | 40 |
| `eco-commute` | transport | 60 |
| `tumbler` | waste | 30 |

목표 3개 (표시 문자열은 i18n `me.goals.<id>`):

| id | scope | target_count | bonus_points |
|---|---|---|---|
| `daily-1` | daily | 1 | 20 |
| `daily-3` | daily | 3 | 80 |
| `weekly-10` | weekly | 10 | 300 |

### RPC

**`complete_mission(p_code text) returns text`** — `'completed' | 'already' | 'invalid'`
- `v_user := auth.uid()`; null이면 예외.
- `missions`에서 active 미션 조회, 없으면 `'invalid'`.
- `v_day := (now() at time zone 'Asia/Seoul')::date`.
- `mission_completions(user_id, mission_code, day)` insert → `unique_violation`이면 `'already'`.
- 같은 트랜잭션에서 `point_events(user_id, points=mission.points, reason='qr:'||p_code, period_label=to_char(v_day,'YYYY-MM-DD'))` insert(이미 있으면 무시/통과).
- `'completed'` 반환. 권한: anon revoke, authenticated grant.

**`claim_goal_reward(p_goal_id text) returns text`** — `'claimed' | 'already' | 'not-met'`
- `v_user := auth.uid()`; 프로필 없으면 예외.
- `goals`에서 active 목표 조회, 없으면 `'not-met'`.
- 서버가 자격 **재계산**: 일간이면 오늘(서울) `mission_completions` 수, 주간이면 이번 ISO주 수. `count < target_count`면 `'not-met'`.
- period_label: 일간=`to_char(seoul_day,'YYYY-MM-DD')`, 주간=`to_char(seoul_day,'IYYY-"W"IW')`.
- `point_events(points=bonus_points, reason='goal:'||p_goal_id, period_label)` insert → `unique_violation`이면 `'already'`, 아니면 `'claimed'`. 권한: anon revoke, authenticated grant.

**`get_my_goal_progress() returns table(today_label text, week_label text, today_count int, week_count int)`** (읽기, 드리프트 방지)
- `v_day := (now() at time zone 'Asia/Seoul')::date`.
- `today_label = to_char(v_day,'YYYY-MM-DD')`, `week_label = to_char(v_day,'IYYY-"W"IW')`.
- `today_count` = 오늘 내 `mission_completions` 수, `week_count` = 이번 ISO주 내 수.
- 표시(진행률)와 지급(claim)이 동일한 Postgres tz/주 로직을 쓰도록 단일 출처 제공. 권한: anon revoke, authenticated grant.

## 핵심 루프 (Data Flow)

```
[QR(폰 카메라)] → /[locale]/scan/<code>
  → (미로그인) /login?next=… → 로그인 → 복귀
  → "미션 인증"(POST 서버 액션) → complete_mission RPC
      → mission_completions +1, point_events +N (같은 트랜잭션)
      → 개인포인트↑ · 캐릭터↑ · 그룹풀↑ · 영지예산↑ (자동 동기화)
  → /me: get_my_goal_progress로 진행률 표시
      → target 도달 → "보너스 받기"(POST) → claim_goal_reward RPC(서버 재검증)
          → point_events +bonus (멱등)
```

## 도메인 매핑 (표시 로직)

포인트 이력 reason→라벨(클라이언트 매핑):
- `verified-savings` → "주간 절감 보상" (`me.history.verifiedSavings`)
- `qr:<code>` → 미션 제목 (`me.missions.<code>.title`)
- `goal:<id>` → 목표 제목 + "보너스" (`me.goals.<id>.title`)
- 그 외 → reason 원문

목표 진행률(순수 도메인 함수, `domain/goals.ts`): `(goals, {todayCount, weekCount}, {todayLabel, weekLabel}, claimedSet)` → 목표별 `{id, scope, target, bonus, progress, met, claimed, claimable}`. `claimable = met && !claimed`. `claimedSet`은 현재 기간 라벨에 해당하는 `goal:<id>` point_events 존재 여부로 구성.

## 부정방지 & 한계 (문서화)

- **미션당 1일 1회** 상한(`unique(user_id, mission_code, day)` + 동일 라벨 point_events). 파밍 차단.
- 목표 보너스는 **서버가 `mission_completions`로 재계산** → 위조 불가.
- `mission_completions`/`point_events` 직접 쓰기는 RLS로 차단, RPC만 기록.
- **정적 QR**(서명·회전 없음): URL을 아는 사람은 어디서든 인증 가능 → **지오펜싱 없음**(범위 제외). 향후 서명/회전 코드 + 위치 검증.
- 관리자 QR 발급 UI 없음(미션은 시드). 데모용 QR URL 형식: `https://<host>/<locale>/scan/<code>`.

## 파일 구조 (신규 N / 수정 M)

신규 기능 모듈 `src/features/missions/`:
- `domain/types.ts` — `Mission`, `Goal`, `GoalProgress`, `GoalScope` 등 타입.
- `domain/goals.ts` — 진행률/달성/claimable 계산(순수, TDD).
- `data/missions-dal.ts` — `getActiveMissions()`, `getMission(code)`, `getGoals()`, `getMyGoalProgress()`(RPC), `getMyMissionCompletionsToday(userId)` 등.
- `actions/complete-mission.ts` — `completeMissionAction(code, locale)` → `complete_mission` RPC, `revalidatePath('/[locale]/me')`·`'/[locale]'`.
- `actions/claim-goal.ts` — `claimGoalRewardAction(goalId, locale)` → `claim_goal_reward` RPC, revalidate.
- `components/goal-list.tsx`, `components/mission-confirm.tsx`(스캔 인증 버튼+결과).

`src/features/account/components/` (신규):
- `profile-summary.tsx` — /me 프로필 헤더.
- `points-history.tsx` — 원장 표시 + reason 매핑.
- `estate-contribution.tsx` — 영지 기여 칩(재사용 가능).

라우트 (신규):
- `src/app/[locale]/me/page.tsx`
- `src/app/[locale]/scan/[code]/page.tsx`

지도 (신규):
- `src/features/campus-energy/components/profile-chip.tsx`

수정 (M):
- `src/features/campus-energy/components/campus-energy-app.tsx`, `admin-map-view.tsx` — `account` 스레딩 + 프로필 칩.
- `src/features/campus-energy/components/participant-dashboard.tsx` — "내 페이지 →" 링크.
- `src/features/estate/components/estate-game-client.tsx` + `src/app/[locale]/subjects/[subjectId]/estate/page.tsx` — 기여 칩 + 개인 포인트 로드.
- `src/features/account/actions/auth.ts` + `src/features/account/components/login-form.tsx` + `src/app/[locale]/login/page.tsx` — `next` 안전 복귀.
- `src/features/account/data/account-dal.ts` — 필요한 read helper(있으면 재사용).
- `src/i18n/messages/ko.ts`·`en.ts` — `me`, `scan`, `me.missions`, `me.goals`, `me.history`, 프로필 칩·기여 칩 문자열.

기록 (신규): `docs/superpowers/migrations/2026-06-26-missions-and-goals.sql`.

## 테스트

- **Vitest 도메인**: `domain/goals.ts` 진행률/달성 경계(미달·정확 일치·초과), `claimable`(met·미claim), reason→라벨 매핑, (필요 시) 기간 라벨 helper.
- **DB 스크립트(1회성, 적용 후 삭제)**: `complete_mission`(일 멱등=같은 날 두 번째 'already', 포인트 정확, `mission_completions`+`point_events` 두 행 기록, 무효 코드 'invalid'), `claim_goal_reward`(미달 'not-met'·충족 'claimed'·재호출 'already'·서버 재계산으로 위조 차단), 직접 insert가 RLS로 차단되는지, `get_my_goal_progress` 카운트 정확.
- **HTTP 실측**: `/ko/me`·`/ko/scan/<code>` 미로그인 시 `/login`(+`next`)로 리다이렉트, 로그인 복귀, 빌드(`npm run build`)·lint(`npm run lint`) 통과.
- 검증 데이터는 모두 삭제하고, 사용자가 만든 실계정(`it@naver.com`)은 보존한다.

## 범위 밖 (Deferred)

- 관리자 QR 발급/관리 UI, 서명·회전 QR, 지오펜싱·위치/시간 검증.
- 사용자 지정(커스텀) 목표.
- 영지 아이템의 사용자 귀속(누가 무엇을 배치했는지).
- 미션의 건물(subject) 연결을 지도에 시각화(미션은 `category`/표시 문자열만; subject FK 미도입).
- 에너지 수집/ML 파이프라인, 배포 구성.

## 미해결 (열린 항목)

없음. 위 기본값으로 구현 계획을 작성한다.
