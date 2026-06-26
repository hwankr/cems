# Meeting Notes

User-stated decisions and verified working facts are recorded here by date. Do not treat unstated product, architecture, ML, or deployment ideas as confirmed.

## 2026-06-26

- 사용자는 "로그인으로 소속 등록 → 자신만의 캐릭터/포인트 적립 → 그룹 영지 포인트 획득 → 영지 물품 구매" 흐름의 구현 계획을 요청했고, 이어서 "위 계획을 새로운 브랜치에서 진행"하라고 지시했다.
- AskUserQuestion으로 확정한 방향: (1) 백엔드는 Supabase 실제 백엔드(Auth + Postgres + RLS), (2) 로그인은 이메일+비밀번호, (3) 영지는 "건물(subjectId) 단위 유지 + 구매 예산만 그룹 공유 포인트 풀로". 기존 영지 포인트 계산식(`calculateEstatePointAccount(earnedPoints, transactions)`)은 그대로 두고 `earnedPoints`의 출처만 그룹 풀로 바꾸는 방식.
- 계획 문서: `docs/superpowers/plans/2026-06-26-affiliation-login-group-estate-economy.md`. 마이그레이션 기록: `docs/superpowers/migrations/2026-06-26-account-and-estate.sql`.
- 작업 브랜치 `feat/affiliation-login-group-estate`에서 구현했고 **푸시하지 않았다(로컬 전용)**. 커밋은 계획의 태스크 단위로 13개.
- Supabase: 조직 `jzwzzsdovlztmbcvakzv`에 무료($0/월) 프로젝트 `cems`(ref `zvuqmagfpdyrrzyjntue`, ap-northeast-2)를 신규 생성(기존 fomopomo와 분리). 마이그레이션 `account_and_estate` 적용 — 테이블 `schools/groups/profiles/point_events/estates` + RLS + 시드(영남대 1, 그룹 engineering/humanities/student-services 3). `.env.local`에 URL+anon 키 추가(git-ignored, Mapbox 토큰은 유지).
- 신규 `src/features/account/`: env 리더, 브라우저/서버/proxy용 Supabase 클라이언트, 도메인(프로필 검증·개인 포인트·그룹 풀, 전부 TDD), 서버 DAL, 서버 액션(auth/profile/claim-reward), 로그인·회원가입·온보딩 페이지/폼, 로그아웃·보상받기 버튼.
- `src/proxy.ts`는 이제 비동기로 Supabase 세션을 먼저 갱신한 뒤 로케일 리다이렉트를 적용한다.
- 홈(`/[locale]`)과 영지 페이지는 인증 게이트(미로그인→`/login`, 프로필 없음→`/onboarding`). 참여자 대시보드는 실제 개인 포인트·그룹 풀·"이번 주 절감 보상 받기" 버튼을 보여주고, 캐릭터는 개인 포인트로 성장. 영지 스냅샷은 `SupabaseEstateRepository`로 서버 공유(건물별 1행, owner_group_id 소유), 예산은 소유 그룹 풀, 쓰기는 RLS로 그룹원만 허용.
- 작업 중 확인한 제약: Supabase 프로젝트는 기본값으로 이메일 확인(Confirm email)이 켜져 있고 MCP로 끌 수 없어, 브라우저 회원가입 즉시 로그인을 쓰려면 사용자가 대시보드(Authentication → Email)에서 "Confirm email"을 꺼야 한다. 또한 GoTrue 이메일 검증이 `*.test`·`example.com` 가입을 거부해, 검증용 사용자는 SQL로 직접(bcrypt·확인완료) 만들어 테스트했다.
- 알려진 MVP 한계(문서화함): 영지 지출은 클라이언트 검증 + RLS 쓰기 차단으로 보장하고, 서버 측 재검증과 "그룹당 영지 여러 개"의 교차 지출 합산은 범위 밖(데모는 그룹당 영지 1개 가정).
- 검증: Vitest 213/213 통과, ESLint 0 errors(기존 `game-preview.tsx` 경고 2개만 잔존), `npm run build` 통과, Supabase 보안 advisor 0건. HTTP 실측: `/`→`/ko`, `/ko`→`/ko/login`, `/ko/login`·`/ko/signup` 200, `/ko/onboarding`·`/ko/subjects/yu-e21/estate`→`/ko/login`. RLS는 일회용 스크립트로 10/10 통과(프로필·포인트·영지 insert, 보상 중복 unique 거부, 그룹 풀 조인, 타 그룹 영지 쓰기 차단, 타 그룹 포인트 격리). 검증 데이터는 모두 삭제해 테이블은 0행. `.claude/launch.json`은 계속 제외.

### 같은 날 — Codex 적대적 리뷰 + 수정

- 사용자 요청으로 현재 브랜치 변경분을 Codex(`codex:rescue`)로 적대적 리뷰. 결과: Critical 3, High 3, Medium 2.
  - C1 포인트 위조: anon 키로 `point_events`에 직접 임의 insert 가능(서버 액션이 권위 없음). C2 소속 변경: 프로필 update 정책이 `id=auth.uid()`만 봐서 `group_id`를 바꿔 타 그룹 영지 쓰기 가능. C3 영지 스쿼팅: `estates.subject_id`가 자유 text라 남의 건물 영지를 자기 그룹 소유로 선점 가능. C4 **그룹 풀 붕괴**: point_events SELECT 정책 서브쿼리가 profiles RLS(본인만)에 막혀, 그룹원 2명 이상이면 풀이 "읽는 사람 본인 포인트"로만 합산됨. H5 스냅샷 검증이 경제성 아닌 형태만 검사. H6 영지 저장 last-writer-wins. M7 locale 오픈 리다이렉트. M8 DAL이 에러 삼킴.
- C4를 직접 재현 확인: 엔지니어링 멤버 2명(1000+500)인데 한 명이 풀을 읽으면 1500이 아니라 1000. 기존 "RLS 10/10"은 그룹당 멤버 1명만 테스트해서 이 케이스를 놓쳤음.
- 사용자 선택(AskUserQuestion): "C4 + M7만 최소 정상화". 경제 위조(C1~C3,H5)·동시성(H6)·DAL 에러(M8)는 **MVP 한계로 문서 유지**(서버 권위 변형 = SECURITY DEFINER RPC/서버 전용 쓰기 경로가 향후 과제).
- **C4 수정**(마이그레이션 `fix_group_pool_visibility`, 기록 `docs/superpowers/migrations/2026-06-26-fix-group-pool-visibility.sql`): `current_group_id()` SECURITY DEFINER 헬퍼(자기참조 재귀 회피) + "같은 그룹 프로필 SELECT" 정책 추가, point_events SELECT 정책을 헬퍼 기반으로 재작성. 재현 검증: 2멤버 풀이 1500으로 합산되고, 타 그룹(humanities) 사용자는 엔지니어링 이벤트·프로필 0건(격리 유지). anon에는 EXECUTE revoke. 남은 advisor 2건은 양성: `current_group_id` authenticated 실행(정책이 호출하므로 필수, 본인 그룹만 반환)과 leaked-password-protection(기존 auth 설정, 무관).
- **M7 수정**: 세 서버 액션(auth/profile/points)에서 클라이언트 locale을 기존 `normalizeLocale()`로 검증해 `//evil.example` 류 오픈 리다이렉트 차단.
- 수정 후 재검증: Vitest 213/213, ESLint 0 errors, `npm run build` 통과. 커밋 추가(`fix(db)`, `fix(account)`). 여전히 푸시 안 함(로컬). 참고: 사용자가 직접 만든 실계정 `it@naver.com`(it1/student-services)이 DB에 남아 있어 보존함(내 테스트 데이터 아님).

### 같은 날 — 나머지 Codex 지적 전체 하드닝(C1~C3·H5·H6·M8)

- 사용자가 "codex가 지적한 것 전부 수정"을 지시. 핵심 방향: 경제 변형을 **서버 권위(SECURITY DEFINER RPC + 직접 쓰기 차단)** 로 전환. 마이그레이션 `harden_economy_server_authoritative`(기록 `docs/superpowers/migrations/2026-06-26-harden-economy-server-authoritative.sql`).
- C1: `group_period_rewards` 테이블(권위 있는 그룹별 기간 보상, 실제 도메인 로직으로 계산한 값 시드: engineering 0, humanities 1400, student-services 0) + `claim_period_reward()` RPC(금액을 클라이언트가 못 정함, 멱등). `point_events` insert 정책 제거 → 직접 insert 불가.
- C2: `enforce_profile_affiliation_immutable` BEFORE UPDATE 트리거로 `school_id/group_id` 변경 차단(표시 이름은 변경 가능).
- C3: `estate_subjects`(subject→소유 그룹, 6개 매핑 시드) + `save_estate()` RPC가 소유 그룹을 권위 있게 결정. `estates` insert/update 정책 제거 → 직접 쓰기 불가, 남의 건물 영지 선점 불가.
- H5(부분): `save_estate()`가 양수(자기 적립) 거래 거부 + 스냅샷 순지출이 그룹 풀을 초과하면 거부. **남은 한계(문서화)**: 아이템별 원가 정합성(거래 없는 "공짜 아이템")까지는 검증 안 함 — 카탈로그·구역별 시드를 DB로 이식해야 가능해 범위 밖. 이는 "자기 그룹 영지를 미결제 아이템으로 꾸미는" 자기 그룹 내 치팅이며, 포인트 경제나 타 그룹 침해는 아님.
- H6: `estates.version` 컬럼 + `save_estate()` 낙관적 동시성(예상 버전 불일치 시 conflict). 클라이언트(`SupabaseEstateRepository`)가 subject별 버전을 추적해 저장 시 전달하고, conflict면 서버 스냅샷을 다시 불러와 덮어쓰기 방지(`estate.messages.reloaded` 안내). 영지 저장은 이제 `.upsert` 대신 `save_estate` RPC 경유.
- M8: DAL(`account-dal.ts`)이 Supabase 에러를 삼키지 않고 throw하도록 변경(0/빈값 둔갑 방지).
- 코드 변경: `points.ts`(RPC 호출로 단순화, 데모 계산 제거), `supabase-estate-repository.ts`(RPC 저장 + 버전/충돌, `ownerGroupId` 파라미터 제거), `estate-game-client.tsx`(RPC 클라이언트·충돌 리로드), `estate-repository.ts`(`conflict` 에러코드), `i18n` ko/en(reloaded), `supabase-estate-repository.test.ts` 갱신.
- 검증: DB 레이어 일회용 스크립트 **14/14 통과**(직접 insert 차단, claim 권위/멱등, 소유권·예산·자기적립·OCC·소속불변 전부 강제). Vitest **214/214**, ESLint 0 errors, `npm run build` 통과. dev 부팅·인증 게이트 HTTP 실측 정상(에러 0). advisor 잔여: `current_group_id`/`claim_period_reward`/`save_estate`의 authenticated 실행 WARN 3건(권위 RPC 진입점이라 의도된 것·정책/앱이 호출하므로 필수)과 leaked-password-protection(기존 auth 토글). 트리거 함수 search_path는 핀 고정해 그 WARN은 해소. 테스트 데이터 전부 삭제(실계정 it@naver.com 보존).
- 미수정으로 남긴 것: Codex의 Low 노트(`proxy.test.ts`가 세션 갱신을 mock해 쿠키 회귀를 못 잡음)는 테스트 커버리지 사안이라 보류. 모든 변경 푸시 안 함(로컬).

### 같은 날 — 개인 페이지 + QR 미션 + 목표 설계·구현

- 사용자가 "로그인에 이어 개인 페이지가 필요하다"며 설계+구현 계획을 요청. 메인 Mapbox 지도와 소속 그룹 영지에서 "내 기록"을 보는 것이 중요하고, 일간/주간 목표와 "학교 곳곳 QR 설치 → 인증 시 포인트 지급(예: 계단 이용)"을 구상 중이라고 밝힘.
- AskUserQuestion으로 확정한 방향: (1) 범위는 "개인 페이지 + QR 핵심 루프 + 목표"를 하나의 데모 가능한 수직 슬라이스로, (2) 개인 페이지는 **전용 라우트 `/me`**, (3) QR은 **URL 딥링크**(`/scan/<code>`, 폰 기본 카메라로 스캔→서버 권위 지급), (4) 목표는 **사전정의 + 서버 재검증 완료 보너스**, (5) 참여자 대시보드는 유지하고 `/me` 링크만 추가.
- 설계 스펙 `docs/superpowers/specs/2026-06-26-personal-page-qr-goals-design.md`, 구현 계획 `docs/superpowers/plans/2026-06-26-personal-page-qr-goals.md` 작성. 브레인스토밍 중 "표시 진행률과 지급 자격의 시간/주 경계 드리프트"를 막으려 읽기 전용 RPC `get_my_goal_progress()`를 추가해 RPC를 2개에서 3개로 늘림.
- 새 로컬 브랜치 `feat/personal-page-qr-goals`(푸시 안 함)에서 계획대로 구현. 커밋은 태스크 단위(스펙/플랜 → DB → 도메인 → DAL → 액션 → 로그인 next → i18n → /me → /scan → 지도 칩 → 영지 칩).
- DB: 마이그레이션 `missions_and_goals`(기록 `docs/superpowers/migrations/2026-06-26-missions-and-goals.sql`) — 테이블 `missions`/`mission_completions`/`goals`(+RLS, 시드 미션 5·목표 3), RPC `complete_mission`(미션당 1일 1회, Asia/Seoul)·`claim_goal_reward`(서버가 `mission_completions`로 자격 재계산, 멱등)·`get_my_goal_progress`(읽기). QR/목표 포인트는 모두 `point_events` 한 줄이라 개인 포인트·캐릭터·그룹 풀·영지 예산이 함께 갱신됨. 직접 쓰기는 RLS로 차단 유지.
- 작업 중 확인한 사실: `/me`·`/scan` 인증 게이트는 미로그인 시 `/login?next=…`로 307 리다이렉트(로그인 액션이 `isSafeNextPath`로 검증해 오픈 리다이렉트 차단). 로그인 페이지가 `searchParams.next`를 읽으면서 `● SSG`에서 `ƒ Dynamic`으로 바뀜. 영지 풀블리드 캔버스 위에 개인 기여 칩은 `fixed`(z-[60]) 형제 오버레이로 얹어 큰 estate-game-client 본체는 건드리지 않음. 포트 3000에 기존 dev 서버(HMR)가 떠 있어 HTTP 실측은 그걸 재사용함.
- 알려진 한계(문서화): 정적 QR(서명·회전·지오펜싱 없음 — URL 아는 사람은 어디서든 인증), 관리자 QR 발급 UI 없음(미션 시드). 사용자 지정 목표·영지 아이템의 사용자 귀속은 범위 밖.
- 검증: Vitest 227/227(신규 13: goals·point-reason·safe-redirect), ESLint 0 errors(기존 `game-preview.tsx` 경고 2개), `npm run build` 통과. DB RPC 일회성 프로브(자체 롤백, 10 assert: completed/already/invalid·daily-3 지급·weekly-10 미달·포인트 합)가 두 번 통과(잔여 0행, 시드 유지, 실계정 `it@naver.com` 보존). Supabase 보안 advisor는 예상된 양성 WARN(신규 3 RPC가 authenticated 실행 권위 진입점 + 기존 leaked-password 토글). 푸시 안 함.

## 2026-06-25

- The user reported that the estate experience felt uncomfortable because estate-related popups opened from very light touches.
- Verified and fixed the estate canvas root cause: item selection and locked-parcel expansion no longer fire on `pointerdown`; they are committed only after an unmoved pointer release, and a pan-like move cancels the popup path. Changed `src/features/estate/components/estate-canvas.tsx` with regression coverage in `src/features/estate/__tests__/estate-canvas.test.tsx`.
- Verification for the estate touch fix: targeted estate canvas test, full Vitest suite, ESLint, production build, and `git diff --check` all completed; ESLint still reports only the pre-existing `game-preview.tsx` warnings, and `git diff --check` only reports CRLF conversion warnings for touched files.

- 사용자는 기존 영지(estate) 디자인이 불만이었다: 색감이 좋지 않고, UI 배치가 부자연스럽고 UX 고려가 부족하며, 특히 모바일에서 아이템 목록 패널이 화면 절반을 차지해 영지가 잘 안 보였다.
- 사용자는 전반적인 디자인을 메인화면(Mapbox 지도)처럼 월드가 잘 보이도록, 데스크탑·모바일 모두 고려해 재디자인하길 원했다.
- 확정된 방향: (1) 모바일 패널은 "하단 도크 + 필요할 때만 시트" 방식, (2) 앱의 블루 테마를 그대로 따르지 않고 estate 고유의 "햇살 정원" 톤을 유지하되 메인과 같은 품질로 깔끔하게 재구성, (3) 정원은 앱 다크모드와 무관하게 항상 햇살 톤으로 고정.
- 작업 중 확인한 원인: 구 `estate-page.module.css`의 `.shell`이 자손 선택자와 `!important`로 앱 디자인 시스템을 덮어쓰고, 캔버스에 다크 비네트와 `brightness(0.94)` 필터를 곱해 원래 밝은 정원 아트(잔디 `#7fb466`, 렌더러 하늘 그라데이션 `#dfe8ed→#edf4e8→#d8e4dc`)를 어둡게 만들고 있었다.
- 구현: `estate-game-client.tsx`를 풀블리드 월드 + 떠 있는 크림 글래스 패널(메인 지도 패턴, `pointer-events-none/auto` 오버레이)로 재작성했다. estate 고유 토큰은 신설한 `src/features/estate/components/estate-shell.module.css` 한 곳에 평탄하게 정의했고(잎새 그린 액션, 꿀색 포인트), 구 `estate-page.module.css`는 삭제했다. `page.tsx`에서 셸 래퍼를 제거하고, `estate-canvas.tsx`는 캔버스 컨트롤 위치·색을 정리하고 컨테이너를 풀블리드로 바꿨다.
- 동작: 데스크탑은 우측 도크 콘솔(22rem, 상시 열림·스크롤) + 좌상단 헤더 + 우상단 칩 + 좌하단 줌 컨트롤. 모바일은 기본 하단 도크 76px(월드 약 90% 노출)이고, 탭하면 시트가 약 46dvh(약 374px)로 열려 영지가 43% 보이며, 같은 탭/핸들로 다시 닫힌다. 도메인 로직·아이소메트릭 캔버스 엔진·i18n·접근성(포커스 트랩, aria-live, R/F/Delete 단축키)은 1:1 보존했다.
- 기술 메모: `max-h-[46dvh]` Tailwind arbitrary가 JIT에서 생성되지 않아(다른 arbitrary 값은 정상 생성됨) 시트 높이를 CSS 모듈로 옮기고 `vh` 폴백을 두었다.
- 레이아웃을 검증하던 `estate-quality.test.ts`의 가드 테스트를 새 구조(풀스크린 월드 + 클릭 통과 오버레이 + 토큰 기반)에 맞게 갱신했다.
- 검증: Vitest 188/188 통과(접근성 포커스 트랩 + 새 레이아웃 가드 포함), ESLint 0 errors(기존 경고 2개는 무관 파일 `game-preview.tsx`), 프리뷰 실측으로 데스크탑(1280, 우측 콘솔 x=916·우측 여백 12px)과 모바일(375, 도크 76px ↔ 시트 374px) 레이아웃을 확인했다. 콘솔 에러 없음, 에셋 정상 로드.
- 사용자 요청으로 변경분을 커밋(`fcac1cb feat: redesign estate as a full-bleed sunny-garden world`)하고 `main`으로 fast-forward 머지 후 `origin/main`에 푸시했다.
- 사용자 요청으로 나머지 브랜치를 모두 삭제했다: `feature/estate-fullscreen-polish`(로컬+원격), `building-estate-game`·`feature/building-estate-game`(로컬, 이미 main에 머지됨). 최종적으로 로컬·원격 모두 `main` 단일 브랜치만 남았다.
- `.claude/launch.json`(프리뷰용 로컬 설정)은 커밋에서 의도적으로 제외해 untracked로 두었다.

### 같은 날 후속 세션 — estate 디자인 2차·3차 개편

- 사용자는 estate 전반 디자인이 여전히 불만이었다: 기본 영지 디자인 자체(시작이 휑함, 건물·나무·아이템 아트/색감, 바닥·잠긴 구역 표현, 떠 있는 패널/UI 배치 — 네 가지 모두), 상점 탭 아이템에 미리보기 사진이 없는 점, 확장 방법이 직관적이지 않은 점.
- 확정 방향(2차): 상점은 "카드에 썸네일 추가", 확장은 "캔버스에서 바로". estate 고유 햇살 톤은 유지하되 메인 지도와 같은 품질로 끌어올린다.
- 2차 구현: 햇살 팔레트(따뜻한 하늘 그라데이션 `#fbf3e2→#eef4e0→#d8e8d2` + 캔버스 햇무리, 잔디 2톤 `#8fc46a`/`#86bd63`, 꿀색 포인트 `#f2b53c`), 셀 내부 경계 옅게/구역 외곽선만 또렷, 잠긴 땅은 회색 박스 대신 따뜻한 점선 "예정 부지" + 인접 확장가능 구역에 꿀색 "+가격" 배지(클릭하면 기존 확장 다이얼로그). 상점·인벤토리 카드에 잔디 타일 배경 위 아이소메트릭 썸네일(아이템=SVG 스프라이트, 바닥재=타일 텍스처, `<img>` 대신 background-image), 가격은 꿀색 알약. 시작 정원을 더 풍성하게 재배치. 변경: `renderer.ts`, `estate-shell.module.css`, `estate-asset-manifest.ts`, `estate-game-client.tsx`, `demo-estate-data.ts`. 설계 스펙은 `docs/superpowers/specs/2026-06-25-estate-redesign-design.md`에 기록.
- 확정 방향(3차): 기본(중앙) 영지를 16×16으로 키우고, 애초에 전체 영역을 크게 잡은 뒤 나머지를 잠금 형태로 처음부터 보여줘 "아직 이만큼 확장 가능"이라는 느낌을 준다. 사용자 선택: 전체 약 48×48(코어의 9배), 처음 화면은 "코어 + 가장자리 잠금 땅 살짝".
- 3차 구현: 확장 카탈로그를 9구역으로 교체 — 중앙 `central-campus` 16×16(무료·초기 해제)을 같은 16×16 잠금 구역 8개(north/east/south/west 가장자리 + north-east/south-east/south-west/north-west 모서리)가 둘러싸 48×48을 이루고 코어를 중앙에 둔다(x·y −16..31). 가장자리는 코어에서 바로, 모서리는 인접 가장자리를 거쳐 단계적으로 열린다. 비용 3,000/4,000/6,000/8,000(가장자리), 12,000/15,000/18,000/22,000(모서리). 초기 카메라는 코어 기준에서 약 28% 줌아웃해 잠긴 링이 가장자리에 보이게(화면맞춤 버튼은 해제 영역에 딱 맞춤 유지). 큰 맵을 위해 렌더러 `drawParcelFloors`에 화면 밖 구역/셀 컬링 추가. 시작 정원을 16×16에 맞게 대칭으로 재배치(중앙 건물→앞쪽 분수 축, 모서리·중간 나무, 벤치·화단·가로등·관목 23개, 충돌 없음). parcel i18n 9개를 ko/en에 갱신. 변경: `estate-expansion-catalog.ts`, `demo-estate-data.ts`, `estate-canvas.tsx`, `renderer.ts`, `ko.ts`, `en.ts`.
- 작업 중 확인한 사실: 기존 parcel id(east-yard 등)를 쓰던 테스트(expansion·commands·renderer-scene·repository·placement)를 새 id·비용·좌표로 갱신했고, 시드 아이템이 중앙 구역 안에서 겹치지 않는지 검사하는 가드 테스트를 신규 추가했다. 16×16 코어로 (8,0) 등 일부 셀이 잠김→해제로 바뀌어 placement/paint 테스트의 "잠긴 셀" 좌표를 (16,0)으로 옮겼다.
- 검증: Vitest 87/87 통과(영향 테스트 갱신 + 시드 무충돌 가드 신규 포함), ESLint 0 errors(기존 경고 2개는 무관 파일 `game-preview.tsx`), `npm run build` 통과(빌드의 TypeScript 검사 포함). `tsc --noEmit`에는 무관한 사전 존재 테스트 오류 4개만 남음(`asset-manifest.test.ts` readonly 인자, `isometric-renderer-assets.test.ts`의 `"loaded"` 리터럴) — 내 변경으로 추가된 오류는 없음. 라이브 실측(dev): 구역 칩 `1/9`, 확장 패널에 잠긴 8구역이 새 이름으로 표시, 콘솔 에러 0; 상점 15개 아이템 전부 썸네일+꿀색 가격 알약.
- 도구 한계로 확인한 사실: estate 풀블리드 캔버스 페이지에서 preview 스크린샷 도구가 매번 멈춘다(다른 라우트 `/ko`는 정상, 그리고 이 현상은 이번 수정 이전 원본에서도 동일). 페이지는 무에러·responsive이고 캔버스는 1회 페인트 후 idle(rAF 0)이라 리페인트 루프가 아님을 확인했다. 캔버스 월드의 실제 픽셀 이미지는 첨부하지 못했고, 검증은 테스트·라이브 DOM·빌드로 갈음했다.
- 사용자 요청으로 회의록을 정리하고 변경분을 커밋해 `origin/main`에 푸시했다(`.claude/launch.json`은 계속 제외).

## 2026-06-23

- The user wanted the uncomfortable black floor-only Mapbox building appearance removed.
- The user wanted visible circular building markers removed so clicking a building focuses that building instead.
- A markerless Mapbox interaction implementation plan was created at `docs/superpowers/plans/2026-06-23-mapbox-building-click-focus.md`.
- The admin campus map now disables Mapbox Standard 3D objects, removes visible app-level polygon fills and point circles, and uses transparent polygon and point hit layers for selection.
- Reviewed polygon subjects can be selected by clicking their building area, point fallback subjects remain selectable through invisible hit areas or labels, and selected subjects still focus the map with `flyTo()`.
- Verified checks were targeted map tests, all Vitest tests, ESLint, production build, `git diff --check`, and an HTTP check for `/ko` on the existing local dev server.
- The user wanted official Yeungnam campus-map floor data parsed so building shapes can show height instead of floor-only footprints.
- The implementation now parses official `bFloor` first and falls back to `fList` floor labels, stores `displayHeightMeters` separately from `heightSource`, and uses `1 floor = 3.6m` for official-floor display height.
- The floor-height implementation initially gave 42 polygon building features floor-count-based extrusion height; point fallback features kept no height metadata and were not rendered as arbitrary 3D buildings.
- Verified checks for the floor-height implementation were official catalog regeneration, generated geometry regeneration with strict point-fallback acceptance, all Vitest tests, ESLint, production build, and `git diff --check`.
- The user pointed to the local `campus-ems` project as a better Yeungnam Mapbox reference and asked to compare the difference and apply a fix.
- The local `campus-ems` reference had 96 shared Gyeongsan entries as polygons; the current app previously had 48 polygons and 73 point fallbacks across 121 official entries.
- The implementation imported only non-`fallback_square` reference polygons from `campus-ems`, adding 22 OSM matches and 2 manual reference geometries while excluding 24 artificial fallback squares.
- Generated Yeungnam geometries now contain 72 polygons and 49 point fallbacks, with 24 polygon footprints marked as `campus-ems-reference`.
- The admin Mapbox view now uses `dark-v11`, hides default Mapbox building layers, uses stronger floor-count extrusion styling, shows centered building-name labels, and focuses selected subjects with `easeTo()`.
- The user reported remaining floor-only items such as E26 and F29 and wanted every map zone to either have no clickable area when footprint/height data is missing, or show as a building form that focuses on click.
- E26 had an OSM polygon and official floor data but no height because utility subjects were excluded from height calculation; height generation now includes `building`, `utility`, and `outdoor` polygon subjects with official floors.
- F29 was a point fallback because `campus-ems` only had a `fallback_square`; it is now manually matched to the nearest named OSM footprint `way/468971867`.
- Generated Yeungnam geometries now contain 73 polygons and 48 point fallbacks. 69 height-bearing polygons render as clickable Mapbox zones; point fallbacks and no-height polygons are not rendered as map click zones.

## 2026-06-21

- The user wanted the project's default language to be Korean.
- The user also wanted multilingual support implemented early so the language can later be changed from settings.
- A Korean-first i18n implementation plan was created at `docs/superpowers/plans/2026-06-21-korean-first-i18n.md`.
- The implementation added locale-prefixed routes for `/ko` and `/en`.
- Locale-less requests are handled by `src/proxy.ts`, which redirects to a valid `cems-locale` cookie or to Korean (`ko`) by default.
- Korean and English message dictionaries now live under `src/i18n/messages/`.
- Client components read locale and messages through `I18nProvider` and `useI18n`, and the current header language selector writes the `cems-locale` cookie for future settings reuse.
- Demo school, subject, group, and participant display names are localized through `src/features/campus-energy/data/localized-demo-campus.ts`.
- Character progression now stores a title key instead of hard-coded English display text.
- Verified checks were `npm run test`, `npm run lint`, `npm run build`, `git diff --check`, and runtime HTTP checks for `/`, `/ko`, `/en`, the saved-locale cookie redirect, Korean text, English text, language options, and the missing Mapbox token fallback.

## 2026-06-20

- The user first asked for a Mapbox web view that shows Yeungnam University buildings well.
- The direction was then expanded beyond a Yeungnam-only map. Yeungnam University should be the first concrete demo case, but the system should support multiple schools later.
- The user clarified that the product goal is not only a map. It is a campus energy platform that lets schools see electricity usage, forecast usage, and savings.
- Admin and facility-team users should be able to identify which buildings are using more electricity than predicted.
- The user plans to add a prediction model later, such as LightGBM, to estimate expected electricity usage.
- The user stated that energy is often not saved because the actual actors, such as students and faculty, lack interest, not only because monitoring systems are missing.
- The product should therefore include a competition or engagement system.
- Participants should register their school and affiliation.
- If their school or affiliation saves electricity compared with predicted usage, that saving should become points or another reward format.
- The reward should be used to grow a character, with an RPG-style experience later.
- The product should have two UI surfaces: an administrator-facing advanced energy dashboard and a user-facing participation and character experience.
- The implementation plan should be reset from a Yeungnam-only Mapbox view to a campus energy platform MVP that uses Yeungnam as the first school.
- The first campus energy MVP was implemented and pushed as `94560de Add campus energy MVP`.
- The implemented MVP contains admin and participant modes, mock Yeungnam energy data, shared energy comparison and scoring logic, a Mapbox-backed admin map with a missing-token fallback, and Vitest domain tests.
- The verified checks for the MVP were `npm run test`, `npm run lint`, `npm run build`, and `git diff --check`.
- `.env.example` leaves `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` blank so the repository does not contain a Mapbox-looking token value.

## 2026-06-19

- The user preferred manual session recording over always-on background logging.
- Recording mode should start only when the user explicitly asks with phrases such as `정리 시작`, `세션 정리해줘`, `기록해줘`, or `회의록 정리해줘`.

## 2026-06-18

- The user explored the idea of a system that records project context from Codex sessions.
- The idea was described as close to a `session recorder`, `context logger`, `agent session recorder`, or `session logging harness`.

## 2026-06-17

- The user said the existing docs contained planning content that no longer matched the desired direction.
- The old planning docs should not be preserved as the baseline.
- Going forward, docs should work more like meeting notes: user statements and facts verified during work should be accumulated gradually.
