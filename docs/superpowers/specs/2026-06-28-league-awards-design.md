# 리그 기반 수상 시스템 설계 (Design Spec)

**작성일:** 2026-06-28
**상태:** 승인됨 (브레인스토밍 → 이 스펙 → writing-plans)

## 목표 (Goal)

**리그(=기간이 정해진 한 번의 대회)**를 도입해, 리그가 종료되면 참가 팀의 순위를 권위 있게 확정하고 **1·2·3위 팀상(금·은·동)과 1위팀 우수 학생 뱃지**를 불변 기록으로 남긴다. 그 수상 기록을 네 곳에서 *읽어* 표시한다: ① 메인 지도에서 수상 팀 건물 외관 특수효과, ② `/me`의 우수 학생 뱃지(잠긴 `top-student` 슬롯 해금), ③ 영지에 배치 가능한 **우승자 휘장** 아이템, ④ **명예의 전당** 화면.

## 용어 (Terminology)

- **리그(League)** = 한 번의 대회. 이름·기간(시작/종료)·참가자·규칙을 가지며, 종료(확정)되면 수상이 발생한다. 별도 "시즌" 계층은 두지 않는다(사용자 확정). 다시 열려면 새 리그를 만든다. "경북지역초등학교 에너지 절감 리그", "영남대 단과대 에너지 절감 리그"가 각각 하나의 리그다.
- **참가자/경쟁 단위(Competitor)** = 리그에서 겨루는 주체. `competitor_kind`로 추상화한다: v1은 `'group'`(단과대/부서), 스키마는 `'school'`(학교간 지역 리그)도 같은 틀로 수용한다.
- **팀상(team award)** = 상위 3개 경쟁 단위에 부여(금·은·동). **학생상(student award)** = 1위 팀 내부 상위 N명에게 부여.

## 배경 (현재 저장소 사실)

- 스택: Next.js 16.2.9, React 19.2.4, TypeScript, Tailwind CSS v4, Mapbox GL JS, lucide-react, Vitest. 로케일 라우트 `/ko`·`/en`(한국어 기본).
- 인증/DB: Supabase 프로젝트 `cems`(ref `zvuqmagfpdyrrzyjntue`, ap-northeast-2). `src/features/account/`.
- **경제는 서버 권위**: `point_events`/`estates` 직접 쓰기 차단, 변형은 SECURITY DEFINER RPC(`claim_period_reward`, `save_estate`)로만. 리그/수상도 이 패턴을 따른다.
- **포인트/기간**: `point_events(user_id, points, reason, period_label, created_at, unique(user_id,reason,period_label))`. 그룹 풀 = 그룹원 전체 합, 개인 포인트 = 본인 합, 영지 예산 = 그룹 풀. `group_period_rewards`/`claim_period_reward`가 이미 "기간별 그룹 보상" 형태로 존재한다.
- **그룹 = 팀**: `groups`(engineering/humanities/student-services), `profiles.group_id`. 건물 소유는 `estate_subjects(subject_id, owner_group_id)`(매핑 6개: 공대 `yu-e21~e24`, 인문 `yu-c02`, 학생지원 `yu-b04`).
- **리더보드 패턴**: `get_subject_contributor_rankings()`가 RLS(본인 그룹만)를 넘어 이름+점수+순위만 노출하는 SECURITY DEFINER 투영으로 존재 → 본 설계의 리그 RPC들이 그대로 따른다.
- **뱃지 슬롯 예약됨**: `src/features/account/domain/achievements.ts`에 `{ key: "top-student", earned: false, locked: true }`가 "future / admin-awarded"로 비어 있다. 본 기능이 이 슬롯을 채운다.
- **지도 건물 렌더**: `mapbox-style.ts`의 `ENERGY_SUBJECT_EXTRUSION_PAINT*`가 `["match", ["get","status"], "saving", …]`로 색을 정한다. GeoJSON은 `geojson.ts`가 만든다.
- **영지 아이템**: `estate-asset-manifest.ts`(스프라이트 `/estate-assets/<id>.png`, 2× 해상도 저작), `requiredEstateSpriteAssetIds`(테스트가 강제), 인벤토리(`EstateInventoryEntry { definitionId, quantity }`), `save_estate` RPC가 스냅샷을 권위 저장(양수 거래 거부, 순지출 ≤ 풀, OCC 버전). 영지는 건물(subjectId) 단위, 소유 그룹은 `estate_subjects`로 결정.

## 전역 제약 (Global Constraints)

- 모든 변형은 **서버 권위**. 신규 3개 테이블에 클라이언트 쓰기 정책을 두지 않는다. 수상 확정(`finalize_league`)은 **운영자(MCP/service-role) 전용**(authenticated/anon EXECUTE revoke).
- 읽기 RPC는 leaderboard 투영(이름·점수·티어·순위만)만 노출한다. 이메일/handle/bio 노출 금지.
- 기존 `point_events`/그룹 풀/캐릭터/영지 예산 로직은 **변경하지 않는다**. 리그는 기존 포인트를 *읽기만* 한다(새 경제 축 없음).
- 한국어 우선. 모든 표시 문자열은 `src/i18n/messages/ko.ts`·`en.ts` 양쪽에 추가(타입은 `koMessages`에서 파생).
- Next.js 코드 작성 전 `AGENTS.md`에 따라 `node_modules/next/dist/docs/`의 관련 문서를 확인한다.
- 마이그레이션은 적용 후 `docs/superpowers/migrations/`에 기록한다(기존 워크플로우). 검증 데이터는 정리하고 실계정 `it@naver.com`은 보존한다.
- 순수 계산(순위·파생 뱃지·티어 매핑)은 도메인 함수로 분리해 Vitest TDD. DB는 SQL 프로브로 검증.

## 데이터 모델 (신규 테이블 3 + RPC 5 + 기존 RPC 1곳 보강)

마이그레이션 이름(제안): `league_awards`(코어), 이후 surface별 RPC는 같은 파일 또는 분할 가능.

### 테이블

```sql
-- 리그 = 기간이 정해진 한 번의 대회
create table public.leagues (
  id text primary key,                               -- 예: 'yu-college-2026-05'
  name text not null,                                -- '영남대 단과대 에너지 절감 리그'
  scope text not null check (scope in ('group','school')),
  school_id text references public.schools (id),     -- null = 학교간/지역 통합 리그
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'upcoming'
    check (status in ('upcoming','active','finalized')),
  badge_winner_count int not null default 3 check (badge_winner_count >= 0),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- 리그 참가자(경쟁 단위). v1은 competitor_kind='group'만 시드.
create table public.league_participants (
  league_id text not null references public.leagues (id) on delete cascade,
  competitor_kind text not null check (competitor_kind in ('group','school')),
  competitor_id text not null,
  primary key (league_id, competitor_kind, competitor_id)
);

-- 수상 불변 기록(확정 시 기록). 팀상 또는 학생상.
create table public.league_awards (
  id uuid primary key default gen_random_uuid(),
  league_id text not null references public.leagues (id) on delete cascade,
  award_type text not null check (award_type in ('team','student')),
  tier text not null check (tier in ('gold','silver','bronze')),
  competitor_kind text,                              -- 팀상
  competitor_id text,                                -- 팀상(group_id/school_id)
  user_id uuid references public.profiles (id) on delete cascade,  -- 학생상
  rank int not null,
  metric_value numeric,                              -- 확정 당시 지표(1인당 평균/개인 합)
  created_at timestamptz not null default now()
);
-- 멱등: 리그당 경쟁 단위 1개 팀상, 리그당 사용자 1개 학생상
create unique index league_awards_team_uniq
  on public.league_awards (league_id, competitor_id) where award_type = 'team';
create unique index league_awards_student_uniq
  on public.league_awards (league_id, user_id) where award_type = 'student';
create index league_awards_league_idx on public.league_awards (league_id);
```

RLS: 세 테이블 모두 enable. 셋 다 `for select to authenticated using (true)`(참조/결과 데이터). **insert/update/delete 정책 없음**(RPC/운영자만).

### 순위 산정 지표 (확정)

**1인당 평균 포인트** = 그룹원의 *리그 기간 내* 포인트 합 ÷ 그룹원 수.

- 기간 판정: `point_events.created_at ∈ [leagues.starts_at, leagues.ends_at)`(유동 기간을 timestamp 윈도우로 표현). `period_label`은 변경하지 않는다.
- 그룹원 수: 해당 `competitor_id` 그룹의 `profiles` 수(포인트 0인 멤버도 분모에 포함).
- 타이브레이크: 평균 desc → 합계 desc → `competitor_id` asc.
- v1은 `competitor_kind='group'`만 멤버 해석(`profiles.group_id = competitor_id`). `'school'`은 후속(멤버 해석 join만 추가).

### RPC (5개)

기존 `get_subject_contributor_rankings`와 동일하게 SECURITY DEFINER + `set search_path = public`. anon EXECUTE revoke.

1. **`get_league_standings(p_league_id text)`** — 읽기, authenticated.
   반환: `(competitor_kind, competitor_id, competitor_name, member_count, total_points, avg_points numeric, rank int)`. 위 지표로 계산, `rank`는 `row_number()`. `competitor_name`은 `groups.name`(group scope) 또는 `schools.name`(school scope, 후속).

2. **`finalize_league(p_league_id text) returns int`** — **운영자 전용**(authenticated·anon EXECUTE revoke; service-role/MCP만). 멱등.
   - 리그 없으면 예외. 기존 `league_awards` 행 삭제(재확정 대비).
   - **팀상**: `get_league_standings`의 `rank ≤ 3`을 `tier = 금/은/동`으로 insert(`metric_value = avg_points`).
   - **학생상**: 1위(gold) `competitor_id` 그룹의 멤버를 리그 기간 내 개인 포인트 합으로 정렬, 상위 `badge_winner_count`명을 `tier='gold'`, `rank=1..N`, `metric_value=개인합`으로 insert.
   - `leagues.status = 'finalized'`로 갱신. 기록된 award 행 수 반환.
   - (v1 group scope 기준. school scope의 "학생" 정의는 후속.)

3. **`get_subject_award_tiers() returns table(subject_id text, tier text, league_id text, league_name text)`** — 읽기, authenticated.
   - **가장 최근 확정된 리그 1개**(`status='finalized'` `order by ends_at desc limit 1`)의 팀상을 `estate_subjects`에 조인 → 각 subject의 owning 그룹이 받은 티어. 지도·영지가 사용.

4. **`get_my_league_awards() returns table(league_id text, league_name text, tier text, rank int)`** — 읽기, authenticated. 내(`auth.uid()`) 학생상 목록(최근순). `/me` 뱃지가 사용.

5. **`get_league_awards(p_league_id text)`** — 읽기, authenticated. 명예의 전당용 전체 수상(팀 금·은·동 + 학생) + 이름 투영: `(award_type, tier, rank, competitor_id, competitor_name, user_id, display_name, metric_value)`. 팀상 먼저, 그다음 학생상, 각 `rank` 오름차순.

### 기존 `save_estate` 보강 (휘장 게이팅)

현행 `save_estate`는 순지출 ≤ 풀·양수 거래 거부·OCC만 검사하고 "아이템 원가 정합성"은 미검증(문서화된 영지 내부 코스메틱 한계). **우승자 휘장 아이템에 한해** 이 구멍을 닫는다:

- 저장 스냅샷의 배치 아이템 중 `definitionId LIKE 'award-emblem-%'`가 있으면, 그 티어(`gold|silver|bronze`)에 대해 **소유 그룹(`v_owner`)이 해당 티어의 `league_awards` 팀상을 보유**하는지 검사. 없으면 예외(`raise exception 'estate not awarded tier %'`).
- 즉 휘장은 수상한 그룹만 배치/유지할 수 있다. (다른 일반 아이템의 무단 배치 한계는 기존대로 범위 밖.)

## 표시 surface 4곳 (Surfaces) — 전부 수상 기록을 읽기만

### ① 지도 건물 외관 특수효과 (메인 Mapbox 지도)

- `src/app/[locale]/page.tsx`(서버)가 `getSubjectAwardTiers()`를 `Promise.all`에 추가 선조회 → `Record<subjectId, { tier, leagueName }>`.
- `geojson.ts`(또는 호출부)가 각 subject feature 속성에 `awardTier`(없으면 미설정) 추가.
- `mapbox-style.ts`: 수상 효과 paint 추가 — extrusion `fill-extrusion-color`를 `awardTier` 우선 `match`(gold `#f5c518`, silver `#c3cad3`, bronze `#cd7f32`) 후 기존 status 색 폴백; outline은 티어색 + 굵게; 라벨은 **티어 색 강조**(가능 시 메달 글리프/아이콘 프리픽스 — Mapbox 폰트 글리프 지원 여부는 계획에서 확인해 확정, 미지원 시 색·굵기 강조로 대체). 신규 이미지 에셋 없이 paint/layout 식으로 구현.
- `admin-map-view.tsx`/`campus-energy-app.tsx`가 `subjectAwardTiers`를 스레딩(기존 `contributorRankings` 스레딩과 동일 경로). 효과 기준은 **가장 최근 확정 리그**(진행 중 리그는 효과 없음).

### ② 우수 학생 뱃지 (`/me`)

- `deriveAchievements(input)`에 `hasTopStudentAward: boolean`(+ 선택 `topStudentTier`) 파라미터 추가 → `top-student`를 `earned: hasTopStudentAward, locked: !hasTopStudentAward`로. 다른 뱃지 로직 불변(순수 함수, TDD).
- `/me` 로더가 `getMyLeagueAwards()`(DAL → RPC 4)로 내 학생상을 받아 위 입력에 전달. `AchievementHighlights`는 해금 시 티어색 + 리그명 `title` 툴팁(기존 컴포넌트 최소 수정).

### ③ 영지 우승자 휘장 아이템

- **신규 아이템 3종** `award-emblem-gold|silver|bronze`를 `estate-asset-manifest.ts`(스프라이트, `/estate-assets/award-emblem-<tier>.png`)와 `requiredEstateSpriteAssetIds`에 추가. 카탈로그(`estate-expansion-catalog.ts`/상점 데이터)에서는 **구매 불가(awardTier 플래그)** 로 표시.
- 영지 페이지(`subjects/[subjectId]/estate/page.tsx`)가 그 subject의 **소유 그룹 수상 티어**를 조회(`getSubjectAwardTiers()` 재사용 또는 단건) → 수상 시 해당 휘장을 인벤토리에 **0포인트 수여**로 노출(미수상이면 잠금/숨김). 배치는 기존 placement 플로우 그대로.
- 권위 게이팅은 위 `save_estate` 보강이 담당(무단 배치 차단).

### ④ 명예의 전당 (`/[locale]/hall-of-fame`, 신규 라우트·서버 컴포넌트)

- 인증 게이트(기존 패턴). 확정된 리그 목록 + 각 리그의 `get_league_awards(league_id)` 결과로 **시상대(팀 금·은·동)** + **1위팀 뱃지 학생**을 렌더.
- 진입점: `/me`와 지도(설정 팝오버 또는 컨트롤 레일)에 링크 추가.
- 활성 리그가 있으면(선택) 상단에 `get_league_standings`로 현재 순위 미리보기(범위 최소화: 확정 결과 표시가 우선).

## 데이터 흐름 (Data Flow)

```
[운영자/MCP] finalize_league(L)            -- 기간 종료 후 1회(또는 재확정)
  → get_league_standings(L)로 순위 계산
  → league_awards에 팀상(금·은·동) + 1위팀 학생상(top-N) 기록(불변)
  → leagues.status='finalized'

[표시: 전부 읽기]
  지도   page.tsx → get_subject_award_tiers() → GeoJSON awardTier → mapbox-style 티어색/메달
  /me    loader  → get_my_league_awards()   → deriveAchievements(hasTopStudentAward) → top-student 해금
  영지   estate page → get_subject_award_tiers() → 휘장 인벤토리 노출 → 배치(save_estate 게이팅)
  전당   hall-of-fame → get_league_awards(L) → 시상대 + 학생 명단
```

## 데모 데이터 (Demo seeding) — 핵심: 1M 톱업 왜곡 회피

현재 `it@naver.com`의 **+1,000,000 수동 톱업**(reason `manual:demo-topup`, 2026-06-27)이 1인당 평균을 왜곡한다. 이를 피하려고 **데모 리그를 "지난달(2026-05)" 윈도우로** 두고, 그 윈도우 안에만 균형 시드를 넣는다(6월 톱업·게스트 기여 seed는 윈도우 밖이라 채점에서 제외).

- 데모 리그: `id='yu-college-2026-05'`, `name='영남대 단과대 에너지 절감 리그'`, `scope='group'`, `school_id='yeungnam'`, `starts_at='2026-05-01'`, `ends_at='2026-06-01'`, `badge_winner_count=3`.
- 참가자: engineering, humanities, student-services(group scope 3팀).
- 시드 `seed:league-demo` `point_events`(created_at 2026-05 중, period_label `'2026-05'`)를 멤버에 배분해 **명확한 금·은·동**이 나오게 한다. 로그인 사용자(it@naver.com, student-services)가 데모 가치를 보도록 **student-services를 1위(gold) + it1을 학생 1위**로 배치(대표 배분; 정확한 값은 구현 계획에서 확정):

  | 그룹 | 멤버 수(분모) | 5월 합계(예) | 1인당 평균(예) | 결과 |
  |---|---|---|---|---|
  | student-services | 5 (it1 + 게스트12~15) | 6,000 | 1,200 | 🥇 gold |
  | humanities | 5 (게스트7~11) | 5,500 | 1,100 | 🥈 silver |
  | engineering | 6 (게스트1~6) | 6,000 | 1,000 | 🥉 bronze |

  student-services 내부 배분은 it1을 최상위로(예: it1 1,600 / 게스트 1,200·1,100·1,100·1,000) → 학생상 top-3 = it1 + 게스트 2명.
- 확정: `finalize_league('yu-college-2026-05')` 실행 → 금=student-services(건물 `yu-b04` 금색 효과), it1 학생 금상(/me 해금·영지 금휘장).
- 문서화 부수효과: `seed:league-demo` 행도 그룹 풀/개인 합/캐릭터/영지 예산을 (소폭) 올린다(기존 게스트 시드와 동일 성격).

## 필요 에셋 & 생성 프롬프트 (사용자가 이미지 AI로 생성)

지도/명예의전당/뱃지/영지 효과 중 **신규 비트맵이 필요한 것은 영지 우승자 휘장 3종뿐**이다(지도 메달은 글리프, 뱃지는 lucide 아이콘+티어색, 전당은 CSS로 처리). 기존 상점 아트 워크플로우와 동일하게 사용자가 생성 → `public/estate-assets/`에 투입하면 내가 trim/팔레트 최적화 후 매니페스트 연결.

- 형식: 정사각 캔버스, **투명 PNG**, 단일 오브젝트 중앙, 2:1 다이메트릭 아이소메트릭, 메인 건물 화풍(따뜻한 크림 석조 + 광택 금/황동 + 에메랄드 천·잎, 은은한 발광, 부드러운 앰비언트 오클루전, **바닥 그림자 미포함**). 최종 매니페스트 logical ≈ 140×184 → 저작 해상도는 정확히 2배(약 280×368)로 trim.
- **공통 스타일 블록:** "Isometric 2:1 dimetric game asset, single ceremonial monument centered on a fully transparent background, painted to match a warm cream-stone-and-gold campus building set (ivory/cream stone pedestal, polished gold/brass accents, emerald banner cloth, glowing trim), soft studio lighting, gentle ambient occlusion, crisp clean edges, no baked ground shadow, no text watermark, high detail, PNG with alpha."
  - **gold (`award-emblem-gold`)**: "+ A FIRST-PLACE winner's standard: a tall banner on a cream-stone pedestal topped by a large laurel-wreathed GOLDEN crest/medallion emitting a soft golden glow, a single star on the crest, rich emerald banner cloth with gold trim. Triumphant, festive."
  - **silver (`award-emblem-silver`)**: "+ A SECOND-PLACE winner's standard: same pedestal and banner, a laurel-wreathed SILVER/platinum crest with a cool silver glow, a single star, slate-blue banner cloth with silver trim."
  - **bronze (`award-emblem-bronze`)**: "+ A THIRD-PLACE winner's standard: same pedestal and banner, a laurel-wreathed BRONZE/copper crest with a warm bronze sheen, a single star, deep-green banner cloth with bronze trim."

## 파일 구조 (신규 N / 수정 M)

**코어 / 도메인 (신규)**
- `src/features/leagues/domain/types.ts` — `League`, `LeagueStanding`, `LeagueAward`, `AwardTier`, `CompetitorKind`, `SubjectAwardTier` 등 타입.
- `src/features/leagues/domain/standings.ts` — 순위/티어 매핑 등 순수 계산(필요 시; 핵심 채점은 RPC) + 행 shaping(`groupAwardsByType` 등).
- `src/features/leagues/data/leagues-dal.ts` — `getLeagueStandings`, `getSubjectAwardTiers`, `getMyLeagueAwards`, `getLeagueAwards`, `getFinalizedLeagues`(RPC/쿼리 래퍼, 에러 throw).
- `docs/superpowers/migrations/2026-06-28-league-awards.sql` — 기록.

**① 지도 (수정)**
- `src/features/campus-energy/domain/geojson.ts` — feature 속성에 `awardTier` 추가.
- `src/features/campus-energy/components/mapbox-style.ts` — 티어 paint(extrusion/outline/label) 식.
- `src/features/campus-energy/components/admin-map-view.tsx`, `campus-energy-app.tsx`, `src/app/[locale]/page.tsx` — `subjectAwardTiers` 선조회·스레딩.

**② 뱃지 (수정)**
- `src/features/account/domain/achievements.ts` — `deriveAchievements`에 `hasTopStudentAward`(+티어) 입력.
- `src/app/[locale]/me/page.tsx`(로더) + `account/data/account-dal.ts` 또는 `leagues-dal.ts` 연결, `achievement-highlights.tsx` 티어색/툴팁.

**③ 영지 (수정/신규 에셋)**
- `src/features/estate/data/estate-asset-manifest.ts` — 휘장 3종 + `requiredEstateSpriteAssetIds`.
- `src/features/estate/data/estate-expansion-catalog.ts`(또는 상점 데이터) — `awardTier`(구매 불가) 플래그.
- `src/app/[locale]/subjects/[subjectId]/estate/page.tsx` + `estate-game-client.tsx` — 소유 그룹 티어 조회·휘장 인벤토리 노출.
- `public/estate-assets/award-emblem-{gold,silver,bronze}.png` — 사용자 생성 에셋.
- DB: `save_estate` 보강(휘장 게이팅) — 마이그레이션에 포함.

**④ 명예의 전당 (신규 라우트)**
- `src/app/[locale]/hall-of-fame/page.tsx` + `src/features/leagues/components/`(시상대·학생 명단·리그 카드).
- `/me`·지도 진입 링크(수정), i18n.

**i18n (수정)**: `src/i18n/messages/ko.ts`·`en.ts` — `hallOfFame`, `me.achievements.topStudent`(이미 존재, 해금 카피), 지도 메달/툴팁, 영지 휘장 라벨.

## 테스트

- **Vitest 도메인**: 순위 티어 매핑(1→gold,2→silver,3→bronze), `deriveAchievements`(hasTopStudentAward true/false → top-student earned/locked + 기존 뱃지 불변), award 행 shaping(팀/학생 분리), `awardTier` GeoJSON 속성 주입, `mapbox-style` 티어 paint 스냅샷, (가능 시) 휘장 카탈로그 잠금/해금 선택 로직.
- **컴포넌트(jsdom)**: 명예의 전당 시상대/빈 상태, `AchievementHighlights` 해금 표시, (영지) 휘장 인벤토리 노출/잠금.
- **DB SQL 프로브(1회성)**: `get_league_standings`(1인당 평균·타이브레이크·기간 윈도우가 6월 톱업 제외), `finalize_league`(금·은·동 3행 + 1위팀 top-N 학생상, 멱등 재확정, status 갱신), `get_subject_award_tiers`(최근 확정 리그의 subject→티어), `get_my_league_awards`(본인 학생상), `get_league_awards`, `save_estate` 휘장 게이팅(미수상 그룹 거부·수상 그룹 허용), 직접 쓰기 RLS 차단, advisor가 기존과 동일한 양성 WARN인지.
- **빌드/린트**: `npm run test`·`npm run lint`(기존 `game-preview.tsx` 경고 2개 외 0 errors)·`npm run build`.
- 검증 데이터 정리, 실계정 `it@naver.com` 보존.

## 구현 단계 (Phasing) — 각 단계 독립 검증·배포 가능

1. **P0 코어**: 3개 테이블 + RLS + 데모 리그/참가자/균형 시드 + `get_league_standings` + `finalize_league` + 데모 리그 확정 (SQL 프로브로 시상대 검증). 도메인 타입/shaping + leagues-dal.
2. **P1 명예의 전당**(`/hall-of-fame`) — 코어를 UI로 가장 빨리 증명.
3. **P2 우수 학생 뱃지**(`/me` top-student 해금).
4. **P3 지도 건물 효과**(티어 extrusion/outline/메달).
5. **P4 영지 우승자 휘장**(에셋 + 매니페스트 + 인벤토리 노출 + `save_estate` 게이팅).

> 구현 계획(writing-plans)은 (a) 한 계획에 P0~P4 마일스톤으로 담거나 (b) **계획 2개로 분할**(계획1=P0+P1 코어·전당 / 계획2=P2~P4 인플레이스 효과) 가능. 계획 단계에서 결정.

## 확정된 기본값 (Defaults)

1. 학생 뱃지 인원 = 1위팀 상위 **3명**(`badge_winner_count`로 리그별 조정).
2. 지도 효과 대상 = 수상 그룹이 소유한 **모든 건물**.
3. 영지 효과 = **배치형 우승자 휘장 아이템**(절차적 렌더링 아님; 신규 PNG 3종 필요).
4. 지도/영지 효과 기준 = **가장 최근 확정 리그** 1개(진행 중 리그는 효과 없음).
5. 순위 지표 = **1인당 평균 포인트**(리그 기간 윈도우). 티어 = **1·2·3위(금·은·동)**.
6. 설정 = **SQL 시드 + 코드**(관리자 UI 없음). 확정은 운영자(MCP) `finalize_league`.

## 범위 밖 (Deferred)

- 관리자 UI(리그/시즌 생성·기간 설정·수상 확정 버튼). v1은 SQL/MCP.
- 학교간(school scope) 실데이터 리그 — 스키마만 수용, 멤버 해석/시드는 후속.
- 진행 중 리그의 실시간 순위 보드(전당의 선택적 미리보기 외).
- 휘장 외 일반 영지 아이템의 원가 정합성 검증(기존 문서화 한계 유지).
- 고화질 영지 효과(왕관/파티클 애니메이션 등) 고도화.
- 에너지 절감률 기반 채점, 에너지 수집/ML 파이프라인.

## 미해결 (열린 항목)

없음. 위 기본값으로 구현 계획을 작성한다.
