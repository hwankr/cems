# 리그 시스템 (허브 · 검색 · 참가) 설계 (Design Spec)

**작성일:** 2026-06-29
**상태:** 승인됨 (브레인스토밍 → 이 스펙 → writing-plans)

## 목표 (Goal)

기존 **명예의 전당**(종료된 리그의 수상만 보여주는 정적 화면)을 **리그 허브**로 재구성한다. 사용자는 ① **진행 중인(내 그룹이 참가한) 리그의 실시간 순위**를 보고, ② **공개 리그를 검색해 내 그룹을 참가**시키고, ③ **종료된 리그의 수상 기록**(기존 시상대)을 본다. 더불어 한국어 로케일에서 영어로 노출되던 **팀(그룹) 이름을 한글화**한다.

직전 작업(브랜치 `feat/league-hall-of-fame-design`, 미머지)에서 만든 **시상대(`AwardPodium`)·우수학생(`StudentWinners`)·tier 팔레트(`award-tier.ts`)·warm 시트 CSS**는 폐기하지 않고 종료된 리그 상세에 **그대로 재사용**한다. 즉 이 작업은 그 브랜치를 흡수·확장한다.

## 용어 (Terminology)

- **리그(League)** = 기간이 정해진 한 번의 대회. `status`는 `upcoming`(예정) / `active`(진행 중) / `finalized`(종료).
- **경쟁 단위(Competitor)** = 리그에서 겨루는 주체. v1은 `competitor_kind='group'`(단과대/부서)만. 스키마는 `'school'`도 수용(후속).
- **참가(Join)** = 사용자가 **자기 그룹**을 한 리그의 경쟁 단위로 등록하는 것(`league_participants`에 그룹 1행 추가). 개인이 아니라 **그룹이 참가 단위**다. "참가중인 리그" = 내 그룹이 참가자로 들어 있는 리그.
- **공개 리그(Open league)** = `is_open = true` 이고 `status in ('upcoming','active')` 인 리그. 검색·참가 대상.

## 배경 (현재 저장소 사실 — 작업 중 확인)

- 스택: Next.js 16.2.9, React 19.2.4, TypeScript, Tailwind CSS v4(토큰 유틸 + CSS Modules), Mapbox, lucide-react, Vitest. 로케일 라우트 `/ko`·`/en`(한국어 기본). 인증 게이트는 기존 패턴(미로그인→`/login?next=…`, 프로필 없음→`/onboarding`).
- Supabase 프로젝트 `cems`(ref `zvuqmagfpdyrrzyjntue`, ap-northeast-2).
- **기존 리그 테이블**: `leagues(id, name, scope, school_id, starts_at, ends_at, status, badge_winner_count, created_at)`, `league_participants(league_id, competitor_kind, competitor_id)`(PK 3컬럼), `league_awards(...)`. 세 테이블 모두 RLS enable + `for select to authenticated using (true)`(읽기 자유), insert/update/delete 정책 없음(RPC/운영자만).
- **기존 RPC**: `get_league_standings(p_league_id)` → `(competitor_kind, competitor_id, competitor_name, member_count, total_points, avg_points, rank)`(1인당 평균, 기간 윈도우 `created_at ∈ [starts_at, ends_at)`). `finalize_league`(운영자), `get_league_awards`, `get_subject_award_tiers`, `get_my_league_awards`. SECURITY DEFINER 헬퍼 `current_group_id()`(호출자 그룹 반환, 정책에서 사용) 존재.
- **기존 DAL** `src/features/leagues/data/leagues-dal.ts`: `getLeagueStandings`, `getLeagueAwards`, `getFinalizedLeagues`, `getMyLeagueAwards`, `getSubjectAwardTiers`. 도메인 `standings.ts`(`shapeStandings`, `groupLeagueAwards`, `tierForRank`), `types.ts`(`LeagueStanding`, `LeagueAwards`, `FinalizedLeague`, `AwardTier`, ...).
- **이름 영어 노출(버그)**: `groups.name`이 DB에 영어로만 저장됨 — `College of Engineering` / `College of Humanities` / `Student Services`. 리그 RPC가 이 원본을 반환해 한국어 화면에 영어가 뜬다. 그러나 **한글 라벨이 이미 i18n에 존재**한다: `src/i18n/messages/ko.ts`의 `demo.groups`(`engineering→"공과대학"`, `humanities→"문과대학"`, `"student-services"→"학생지원"`), `en.ts`에 영문 대칭.
- **현재 데이터**: 리그 2개 모두 `finalized`(`yu-college-2026-05`, `yu-college-2026-06-live-demo`). 진행 중/예정 리그 없음 → 새 시드 없이는 "진행 중" 섹션이 비어 보인다.
- **데모 계정**: `demo@cems.kr`(프로필 `대표 데모`), 그룹 **`student-services`**. 따라서 `current_group_id()` = `student-services`. (1,000,000 데모 톱업이 2026-06-27자 `point_events`에 있음 — 순위 왜곡 주의.)
- **직전 브랜치(미머지) `feat/league-hall-of-fame-design`** 산출물(재사용 대상): `src/features/leagues/domain/award-tier.ts`(`TIER_PALETTE`, `PODIUM_VISUAL_ORDER`, `TIER_PEDESTAL_REM`), `components/award-podium.tsx`(3열 시상대), `components/student-winners.tsx`, `components/league-hall.module.css`, `account/components/profile-surface.module.css`(warm 시트 `.surface`/`.sheet`/`.section`), `components/league-hall-section.tsx`, `app/[locale]/hall-of-fame/page.tsx`. 이 작업은 같은 브랜치 위에서 이어서 진행한다.

## 전역 제약 (Global Constraints)

- 모든 **쓰기 변형은 서버 권위**: `league_participants` 직접 쓰기 정책을 두지 않고 신규 SECURITY DEFINER RPC(`join_league`/`leave_league`)로만. 읽기는 기존처럼 authenticated SELECT 직접 쿼리 허용. anon에는 신규 RPC EXECUTE revoke.
- **리그 생성은 운영자/시드 전용**(현행 유지). 사용자向 리그 생성 UI는 범위 밖.
- **그룹 등록 권한 = 로그인한 그룹원 누구나**(이 앱엔 리더/권한 개념 없음 — 데모 단순화). 이미 참가된 그룹이면 멱등 처리.
- **기존 포인트/그룹 풀/캐릭터/영지/수상 로직은 변경하지 않는다.** 리그는 기존 포인트를 읽기만 한다(새 경제 축 없음). `is_open` 컬럼 추가 외 기존 스키마 의미 불변.
- **한국어 우선 + ko/en 대칭.** 모든 표시 문자열은 `ko.ts`·`en.ts` 양쪽에 추가(`Messages` 타입이 `koMessages` 파생, i18n 대칭 테스트가 강제). 팀(그룹) 이름은 **`demo.groups` 재사용**(신규 키 아님).
- **Tailwind v4 JIT 안전**: 동적 tier 색은 인라인 `style`(팔레트 기반), 동적 arbitrary 클래스 금지. 정적 토큰 유틸(`text-ink`, `bg-surface`, `bg-surface-3` 등)은 사용 가능. warm 팔레트는 `profile-surface.module.css` `.surface` 토큰 오버라이드 재사용(전역 토큰 수정 금지).
- Next.js 코드 작성 전 `AGENTS.md`에 따라 `node_modules/next/dist/docs/`의 관련 문서 확인(서버 액션·`revalidatePath`·동적 라우트·`redirect` 사용 시).
- 마이그레이션은 적용 후 `docs/superpowers/migrations/`에 기록. 검증 데이터 정리, 실데모 계정 `demo@cems.kr` 보존.
- 순수 계산(이름 매핑 등)은 도메인 함수로 분리해 Vitest TDD. DB는 SQL 프로브로 검증. 빌드/린트(0 errors + 기존 `game-preview.tsx` 경고 2개)·`npm run build` 통과.

## 데이터 모델 (스키마 변경 1 + RPC 2 + 검증 1)

마이그레이션 이름(제안): `league_join_open`. 적용 후 `docs/superpowers/migrations/2026-06-29-league-join-open.sql`에 기록.

### 스키마 변경

```sql
alter table public.leagues
  add column if not exists is_open boolean not null default false;
```

참가 가능(joinable) 판정 = `is_open = true and status in ('upcoming','active')`.

### RPC ①: `join_league(p_league_id text) returns text`

SECURITY DEFINER, `set search_path = public`. authenticated EXECUTE, anon revoke. 멱등.

- `current_group_id()`로 호출자 그룹 해석; null이면 예외(`no group affiliation`).
- 리그 조회: 없으면 예외. `scope = 'group'` 아니면 예외(v1은 그룹 참가만). `is_open` 거짓이거나 `status not in ('upcoming','active')`면 예외(`league not open for joining`).
- `insert into league_participants (league_id, competitor_kind, competitor_id) values (p_league_id, 'group', v_group) on conflict (league_id, competitor_kind, competitor_id) do nothing;`
- `get diagnostics`로 삽입 행수 확인 → `'joined'`(신규) 또는 `'already'`(기존) 반환.

### RPC ②: `leave_league(p_league_id text) returns text` (데모 재시연용)

SECURITY DEFINER, authenticated, anon revoke. `cancel_mission` 선례와 동일 성격(데모 상태를 되돌려 재시연 가능).

- `current_group_id()` 그룹 해석; null이면 예외.
- 리그 없으면 예외. `status = 'finalized'`면 예외(`cannot leave a finalized league` — 종료 리그 참가 기록은 불변).
- `delete from league_participants where league_id = p_league_id and competitor_kind='group' and competitor_id = v_group;`
- 삭제 행수 → `'left'` 또는 `'absent'` 반환.

### 확인 완료 (2026-06-29, RPC 정의 조회)

`get_league_standings`는 **이미 `league_participants` 기준**이다(`parts := league_participants where league_id = p_league_id` → 그룹 멤버 조인 → 기간 윈도우 합산 → `avg = total/member_count` 반올림 2자리 → `rank = row_number() over (avg desc, total desc, competitor_id asc)`). 따라서 **참가/탈퇴가 순위에 그대로 반영**되며 **RPC 보강 불필요**. `competitor_name`은 `coalesce(groups.name, competitor_id)`(영어) → UI에서 `competitorLabel`로 한글화. `current_group_id()` = `select group_id from profiles where id = auth.uid()`.

### RLS

- `leagues`에 추가한 `is_open`은 기존 SELECT 정책 범위 내(컬럼 추가). 쓰기 정책은 신설하지 않음.
- `league_participants`: 기존대로 SELECT만 authenticated 허용, insert/delete는 정책 없음 → 신규 RPC(SECURITY DEFINER)로만 변형. (advisor는 기존 SECURITY DEFINER RPC들과 동일한 양성 WARN 클래스로 예상.)

## 화면 (Routes / Surfaces)

모든 페이지는 인증 게이트(기존 패턴). warm 시트(`profile-surface.module.css`) 재사용으로 `/me`·기존 전당과 시각 일관.

### ① `/[locale]/leagues` — 허브 (서버 컴포넌트)

`styles.surface > styles.sheet` 안에 hero(트로피, 제목 "리그") + 3개 `styles.section`:

1. **진행 중 · 내 그룹** (`leagues.sections.active`)
   - 내 그룹이 참가한 `active`(+`upcoming`) 리그 목록. 없으면 빈 상태(`emptyActive` + `emptyActiveHint`).
   - 각 항목 = `LeagueCard`: 이름·상태 배지·기간·참가 팀 수. `active`면 `get_league_standings` 상위 미리보기(내 그룹 하이라이트) 인라인. 클릭 → 상세.

2. **리그 찾기** (`leagues.sections.browse`)
   - 검색 입력(이름 클라이언트 필터) + 참가 가능(`is_open && upcoming/active && 내 그룹 미참가`) 리그 리스트.
   - 각 항목 = `LeagueCard` + **`JoinLeagueButton`**(미참가→"참가하기", 처리 중, 성공→"참가됨"). 없으면 빈 상태(`emptyBrowse`).

3. **지난 기록** (`leagues.sections.past`)
   - `finalized` 리그(기존 `getFinalizedLeagues`). 각 항목 클릭 → 상세(시상대). 없으면 빈 상태(`emptyPast`).

### ② `/[locale]/leagues/[leagueId]` — 상세 (서버 컴포넌트)

- 헤더: 리그 이름, 상태 배지, 기간, 참가 팀 수.
- `finalized` → **`AwardPodium`(시상대) + `StudentWinners`** 재사용(`get_league_awards`). 팀 이름은 `competitorLabel`로 한글화.
- `active`/`upcoming` → **`LeagueStandingsTable`**(`get_league_standings`, 1인당 평균, 내 그룹 하이라이트). 참가 가능·미참가면 상단/하단에 `JoinLeagueButton`. 진행 중이고 내 그룹이 참가 상태면 데모용 `leave` 컨트롤(선택).
- 없는 id → `notFound()`.

### ③ 진입점 정리

- `/[locale]/hall-of-fame` → `/[locale]/leagues` **리다이렉트**(딥링크 보존).
- 지도 컨트롤 레일 트로피 아이콘(`map-controls.tsx`) 링크와 `/me`의 전당 링크(`me/page.tsx`)를 `/leagues`로. i18n `mapView.controls.hallOfFame` 라벨을 "리그"로(또는 신규 `leagues` 키로 교체, ko/en 대칭).

## 이름 한글화 (버그 수정)

순수 헬퍼(도메인, TDD):

```ts
// src/features/leagues/domain/competitor-label.ts
/** 그룹 competitor_id를 로케일 라벨로. 미지(未知) id는 RPC 원본명으로 폴백. */
export function competitorLabel(
  groupLabels: Record<string, string>, // = messages.demo.groups
  competitorId: string,
  fallback: string,
): string {
  return groupLabels[competitorId] ?? fallback;
}
```

- 팀(그룹) 이름을 표시하는 모든 곳에서 사용: `AwardPodium`(`team.competitorName` → `competitorLabel(messages.demo.groups, team.competitorId, team.competitorName)`), `LeagueStandingsTable`, `LeagueCard`.
- 학생상(`StudentWinners`)은 `display_name`(사용자 표시명, 이미 한국어)이라 변경 불필요.
- 미지 그룹/학교(scope='school' 후속)는 폴백으로 원본명 표시.

## 신규 컴포넌트 / 서버 액션 (재사용 + 신규)

**재사용(직전 브랜치):** `AwardPodium`, `StudentWinners`, `award-tier.ts`(`TIER_PALETTE` 등), `league-hall.module.css`, `profile-surface.module.css`.

**신규 컴포넌트 (`src/features/leagues/components/`):**
- `league-status-badge.tsx` — `upcoming/active/finalized` → 예정/진행 중/종료 칩(상태별 톤).
- `league-standings-table.tsx` — `{ standings: LeagueStanding[]; myCompetitorId: string | null }`. 행: 순위·한글 팀명(`competitorLabel`)·구성원 수·1인당 평균·합계. 내 그룹 하이라이트. 빈 상태.
- `league-card.tsx` — `{ league, participantCount, myStanding?, action? }`. 이름·상태 배지·기간·참가 팀 수(+선택 순위 미리보기/액션 슬롯).
- `league-browse-list.tsx` — 검색 입력(클라이언트 필터) + 참가 가능 `LeagueCard` 리스트(각 `JoinLeagueButton` 주입). 빈/무결과 상태.
- `join-league-button.tsx` — `useActionState`로 `joinLeagueAction(leagueId, locale)` 호출, 상태 참가하기/처리 중/참가됨, 성공 시 갱신. (상세의 `leave`는 동일 패턴의 작은 컨트롤 또는 같은 컴포넌트의 variant.)

**서버 액션 (`src/features/leagues/actions/`):**
- `join-league.ts` — `joinLeagueAction(leagueId, locale)`: locale 검증(`normalizeLocale`), `join_league` RPC 호출, 결과/에러 매핑, `revalidatePath('/[locale]/leagues')`(및 상세). 미로그인/그룹없음 처리.
- `leave-league.ts` — `leaveLeagueAction(leagueId, locale)`: `leave_league` RPC, 동일 처리.

**페이지(서버):** `app/[locale]/leagues/page.tsx`(허브), `app/[locale]/leagues/[leagueId]/page.tsx`(상세), `app/[locale]/hall-of-fame/page.tsx`(→ `/leagues` redirect로 축소).

## DAL 추가 (`leagues-dal.ts`) / 타입

- `getMyGroupLeagues(groupId): Promise<LeagueSummary[]>` — `league_participants`(내 그룹) 조인 `leagues`, 상태·기간 포함.
- `getJoinableLeagues(groupId): Promise<LeagueSummary[]>` — `is_open && status in (upcoming,active) && 내 그룹 미참가`.
- `getLeague(leagueId): Promise<LeagueSummary | null>`, `getLeagueParticipants(leagueId)`(+카운트), `getLeagueParticipantCounts(ids)`.
- 기존 유지: `getFinalizedLeagues`, `getLeagueStandings`, `getLeagueAwards`.
- 타입(`domain/types.ts`): 기존 `FinalizedLeague`를 포함하는 `LeagueSummary { id; name; scope; status; startsAt; endsAt; isOpen }` 추가(파생/확장). RLS 직접 쿼리는 에러 throw(에러 삼키지 않음, M8 선례).

## 데이터 흐름 (Data Flow)

```
/leagues (서버):
  getCurrentUser/Profile (게이트)
  병렬: getMyGroupLeagues(groupId), getJoinableLeagues(groupId), getFinalizedLeagues()
        + 진행 중 내 그룹 리그 각각 getLeagueStandings(id) 미리보기
  → 진행 중 / 리그 찾기 / 지난 기록 섹션 렌더 (competitorLabel로 한글화)

/leagues/[id] (서버):
  getLeague(id) (없으면 notFound)
  finalized → getLeagueAwards(id) → AwardPodium + StudentWinners
  else     → getLeagueStandings(id) → LeagueStandingsTable + (공개·미참가 시) JoinLeagueButton

참가/탈퇴:
  JoinLeagueButton → joinLeagueAction(id, locale) → join_league RPC → revalidate
  (leave 동일)
```

## 데모 시드 (Demo seeding) — 1M 톱업 왜곡 회피

`docs/superpowers/migrations/2026-06-29-league-join-open.sql`(또는 별도 시드 파일)에 기록. 멱등(고정 id/ON CONFLICT).

- **진행 중 공개 리그 1개** — 예: `id='yu-energy-2026-summer'`, name `'영남대 여름 상시 에너지 리그'`, `scope='group'`, `school_id='yeungnam'`, `status='active'`, `is_open=true`, **`starts_at`는 2026-06-27 1M 톱업 이후로**(예: `'2026-06-28T00:00:00+09:00'`) `ends_at` 미래(예: `'2026-07-31'`). 참가자 = 3그룹(`student-services` 포함 → "진행 중 · 내 그룹"에 표시). 윈도우 내 `point_events`(reason `seed:league-active`, 2026-06-28/29 날짜)를 **균형 있게** 시드해 1인당 평균이 자연스럽게(대표 데모/student-services가 근소 우위 정도, 1M 톱업은 윈도우 밖이라 채점 제외). 2026-05 종료 리그가 과거 윈도우로 톱업을 피한 것과 동일 원리.
- **참가 가능 공개 리그 1개** — 예: `id='yu-open-2026-fall'`, name `'가을 신규 에너지 리그 (모집 중)'`, `status='upcoming'`(또는 active), `is_open=true`, 참가자 = `engineering`+`humanities`(**`student-services` 미참가** → "리그 찾기"에 참가 버튼 노출). 윈도우 미래.
- 기존 종료 리그 2개 = "지난 기록"으로 유지(`is_open` 기본 false).
- 부수효과(문서화): `seed:league-active` 행이 student-services 풀/개인 합을 소폭 올린다(기존 게스트 시드와 동일 성격).

## 테스트

- **Vitest 도메인**: `competitorLabel`(매핑 + 미지 폴백). 기존 `standings`/`award-podium`/`student-winners` 테스트 유지.
- **컴포넌트(jsdom)**: `LeagueStandingsTable`(행·내 그룹 하이라이트·한글 팀명), `LeagueBrowseList`(검색 필터·항목), `JoinLeagueButton`(참가하기/처리 중/참가됨 상태), `LeagueCard`, `league-status-badge`. 기존 시상대/우수학생 테스트 재사용.
- **DB SQL 프로브(1회성)**: `is_open` 컬럼; `join_league`(그룹 참가→`joined`, 재호출→`already`, 비공개/종료/미존재 거부, scope≠group 거부, anon revoke); `leave_league`(탈퇴→`left`, 미참가→`absent`, 종료 거부); `get_league_standings`가 active 윈도우에서 1M 톱업 제외 + **`league_participants` 기준**인지(아니면 보강); 시드 검증(active 리그에 내 그룹 있음, joinable 리그에 내 그룹 없음). 검증 데이터 정리, `demo@cems.kr` 보존.
- **i18n**: ko/en 대칭(신규 `leagues` 네임스페이스 + 진입점 라벨). **빌드/린트/타입**: ESLint 0 errors(+기존 경고 2), `npm run build`(라우트 `/[locale]/leagues`·`/[locale]/leagues/[leagueId]` 생성, `/hall-of-fame` 리다이렉트), `tsc` 신규 오류 0.

## i18n (신규 `leagues` 네임스페이스, ko/en 대칭)

신규 블록(키 예시 — 정확한 카피는 계획에서 확정):

```
leagues: {
  title: "리그", subtitle: "에너지 절감 리그", back: "지도로",
  sections: { active: "진행 중 · 내 그룹", browse: "리그 찾기", past: "지난 기록" },
  status: { upcoming: "예정", active: "진행 중", finalized: "종료" },
  search: { placeholder: "리그 이름 검색", noResults: "검색 결과가 없어요" },
  join: { join: "참가하기", joining: "참가 중…", joined: "참가됨", leave: "참가 취소", leaving: "처리 중…" },
  standings: { rank: "순위", team: "팀", avg: "1인당 평균", total: "합계", members: "{count}명", you: "내 그룹", empty: "아직 순위가 없어요" },
  participants: "참가 {count}팀", period: "{start} – {end}",
  emptyActive: "참가 중인 리그가 없어요", emptyActiveHint: "‘리그 찾기’에서 공개 리그에 참가해보세요",
  emptyBrowse: "참가 가능한 공개 리그가 없어요", emptyPast: "아직 종료된 리그가 없어요",
}
```

- **시상대/수상 카피는 기존 `hallOfFame` 네임스페이스 유지**(`AwardPodium`/`StudentWinners`가 사용하는 `tierGold/Silver/Bronze`, `teamSectionTitle`, `studentSectionTitle`, `avgPointsLabel`, `rankUnit`, `periodFormat` 등). 재사용 컴포넌트 안정성을 위해 그대로 둔다. `hallOfFame.title/subtitle/back/empty`는 상세의 종료-리그 표시에서 선택적으로 재사용(또는 `leagues`로 점진 이전).
- 팀 이름은 **`demo.groups` 재사용**(신규 키 없음).

## 파일 구조 (신규 N / 수정 M)

**DB (신규/기록)**
- `docs/superpowers/migrations/2026-06-29-league-join-open.sql` — `is_open` + `join_league`/`leave_league`(+필요 시 `get_league_standings` 보강) + 데모 시드.

**도메인/DAL (신규/수정)**
- 신규 `src/features/leagues/domain/competitor-label.ts` (+ 테스트).
- 수정 `src/features/leagues/domain/types.ts` — `LeagueSummary`(+상태/공개) 추가.
- 수정 `src/features/leagues/data/leagues-dal.ts` — `getMyGroupLeagues`/`getJoinableLeagues`/`getLeague`/`getLeagueParticipants(+counts)` 추가.

**액션 (신규)**
- `src/features/leagues/actions/join-league.ts`, `leave-league.ts`.

**컴포넌트 (신규/수정)**
- 신규 `league-status-badge.tsx`, `league-standings-table.tsx`, `league-card.tsx`, `league-browse-list.tsx`, `join-league-button.tsx` (+ jsdom 테스트).
- 수정 `award-podium.tsx`(팀명 `competitorLabel` 적용), 필요 시 `league-hall-section.tsx`(상세에서 재사용 형태로).

**라우트 (신규/수정)**
- 신규 `app/[locale]/leagues/page.tsx`, `app/[locale]/leagues/[leagueId]/page.tsx`.
- 수정 `app/[locale]/hall-of-fame/page.tsx` → `/leagues` redirect.
- 수정 `features/campus-energy/components/map-controls.tsx`(트로피 → `/leagues`), `app/[locale]/me/page.tsx`(전당 링크 → `/leagues`).

**i18n (수정)**: `ko.ts`·`en.ts` — `leagues` 네임스페이스 + 진입점 라벨.

## 구현 단계 (Phasing) — 각 단계 독립 검증 가능

1. **P0 백엔드/데이터**: `is_open` + `join_league`/`leave_league` + (확인 후) `get_league_standings` 보강 + 데모 시드 + DAL(`getMyGroupLeagues`/`getJoinableLeagues`/`getLeague`/participants) + `competitorLabel`(이름 버그 수정). SQL 프로브로 검증.
2. **P1 허브 읽기 화면**: `/leagues`(진행 중·내 그룹 / 지난 기록) + `LeagueCard`·`LeagueStandingsTable`·`league-status-badge` + `competitorLabel` 적용. 리프레임 + 이름 수정 가시화.
3. **P2 상세**: `/leagues/[id]`(종료=시상대 재사용 / 진행=순위표) + 진입점 정리(`/hall-of-fame` redirect, 지도·/me 링크·라벨).
4. **P3 검색·참가**: `LeagueBrowseList` 검색 + `JoinLeagueButton`/`joinLeagueAction`(+leave) + "리그 찾기" 섹션 완성.

## 확정된 기본값 (Defaults)

1. 참가 단위 = **그룹**(사용자가 자기 그룹 등록).
2. 리그 생성 = **운영자/시드 전용**(사용자向 생성 UI 없음).
3. 그룹 등록 권한 = **로그인한 그룹원 누구나**(권한 개념 없음, 멱등).
4. 진행 중 순위 = **`get_league_standings`(1인당 평균)**. 우승자 시상대는 종료 리그만.
5. 이름 한글화 = **`demo.groups` i18n 매핑**(없으면 원본 폴백).
6. 화면 구조 = **전용 `/leagues` 허브 + `/leagues/[id]` 상세**, warm 시트 재사용.
7. `leave_league` 포함(데모 재시연용, `cancel_mission` 선례).

## 범위 밖 (Deferred)

- 사용자向 리그 생성/기간·규칙 설정 UI(운영자 SQL/MCP 유지).
- 학교간(school scope) 실데이터 리그 — 스키마만 수용, 멤버 해석/시드 후속.
- 그룹 등록 권한(리더/승인) 모델, 정원·초대.
- 실시간 푸시/라이브 업데이트(요청 시 새로고침 기준).
- 진행 중 리그의 수상 예측/가확정.

## 미해결 (열린 항목)

없음. (`get_league_standings`의 participants-기준 여부는 2026-06-29 RPC 정의 조회로 확인 완료 — 보강 불필요. 위 "확인 완료" 참조.) 위 기본값으로 구현 계획(writing-plans)을 작성한다.
