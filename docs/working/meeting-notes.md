# Meeting Notes

User-stated decisions and verified working facts are recorded here by date. Do not treat unstated product, architecture, ML, or deployment ideas as confirmed.

## 2026-06-29

### Demo QR mission seed and checkpoint direction

- The user asked to create a few demo QR codes, starting with "화공관 2층 계단", and asked whether a sequential checkpoint flow such as "정문 1 → 2 → 3" is technically possible.
- A live Supabase demo mission `chem-2f-stairs` was seeded with 50 points, category `stairs`, and `active=true`.
- The app message dictionaries now include labels for `chem-2f-stairs` plus future checkpoint demo labels `main-gate-1`, `main-gate-2`, and `main-gate-3`.
- Printable demo QR artifacts were added at `docs/demo/qr-chem-2f-stairs.svg` and `docs/demo/qr-chem-2f-stairs.html`, encoding `https://cems-kappa.vercel.app/ko/scan/chem-2f-stairs`.
- Verified: targeted i18n Vitest passed, ESLint passed with only the pre-existing `game-preview.tsx` warnings, and `npm run build` passed.
- Sequential checkpoint recognition was then implemented for the demo route `main-gate-route`: `main-gate-1` → `main-gate-2` → `main-gate-3` is required, intermediate scans only record progress, and the final scan awards 100 points via `qr:main-gate-route` using the existing mission/point pipeline. Live Supabase now has `checkpoint_routes`, `checkpoint_steps`, `checkpoint_scans`, and RPC `complete_checkpoint_step(p_code)`; the route is seeded as "정문 에너지 루트".
- Printable checkpoint QR artifacts were added at `docs/demo/qr-main-gate-1.svg`, `docs/demo/qr-main-gate-2.svg`, `docs/demo/qr-main-gate-3.svg`, and `docs/demo/qr-main-gate-checkpoints.html`, encoding the production scan URLs for the three steps.
- Verified after implementation: targeted Vitest 14/14 passed; ESLint passed with 0 errors and the same 2 pre-existing `game-preview.tsx` warnings; `npm run build` passed. A rollback-style live DB probe confirmed `main-gate-2` first returns `out-of-order`, `main-gate-1`/`2` return `step`, `main-gate-3` returns `completed`, a repeat returns `already`, 3 checkpoint scans and 100 points appear inside the probe, and no probe data remains afterward.

### Representative demo account reset

- The user said the demo password was forgotten and asked to remove the multiple demo accounts, then recreate one clean representative demo account.
- App code now exposes one demo entry card only: `complete-demo` / "대표 데모 계정". The old scenario keys `engineering-leader`, `humanities-leader`, and `estate-builder` are no longer accepted.
- Demo runtime config was first simplified, then removed after the user clarified this is for presentation deployment rather than real production. The server-only demo credential is now hardcoded to `demo@cems.kr` / `CemsDemo!2026`.
- Live Supabase project `cems` now has only `demo@cems.kr` among the demo/test emails checked. The old `guest*@cems.demo` accounts and `it@naver.com` test/demo account were removed.
- The representative account has profile `대표 데모`, group `student-services`, 1,000,000 demo points, and gold demo awards for the student and student-services team surfaces. Auth login was verified by direct Supabase password-token API.
- The operational SQL record is `docs/superpowers/migrations/2026-06-29-reset-representative-demo-account.sql`; it intentionally does not contain the real password.

### Presentation league population

- The user asked to keep the representative demo account as the main account and add many test accounts so it looks like a real energy-saving league is underway across other buildings and the user's building.
- Live Supabase project `cems` now has 35 additional presentation accounts: 14 engineering users, 10 humanities users, and 11 student-services users, alongside `demo@cems.kr`.
- The latest finalized league is `yu-college-2026-06-live-demo` ("영남대 여름 에너지 절감 리그"). Current standings are student-services gold, engineering silver, humanities bronze.
- The representative demo account `demo@cems.kr` is the latest student gold winner and remains the rank 1 contributor for `yu-b04`; surrounding student-services users fill out that building's contributor preview, while engineering and humanities buildings also show populated top-5 contributor rankings.
- The operational SQL record is `docs/superpowers/migrations/2026-06-29-seed-presentation-league-demo-users.sql`; it intentionally does not contain the shared presentation password.

### League leave-path cleanup + join error feedback (merged to main, pushed)

- Context: the league feature shipped a fully-built but completely unwired "leave league" path — `leaveLeagueAction` in `src/features/leagues/actions/leave-league.ts` (grep-confirmed zero importers) plus unused `leagues.join.leave`/`leaving` i18n keys. The user chose between building an in-UI leave control (Option A) or removing the dead code (Option B); the `leave_league` DB RPC is kept either way as the documented MCP demo-reset mechanism.
- The user chose **Option B (remove the dead code)**: a presentation demo (representative account is a league *winner*; hall-of-fame surface) needs no in-UI leave, and `leave_league` stays callable via MCP for demo reset.
- Mid-session conflict (verified via git): a parallel agent (Claude Sonnet 4.6) independently built **Option A** and committed it as `6bbe925` ("wire leave control + surface join/leave error"), discarding the in-progress Option B working-tree changes twice. The user confirmed **enforce Option B**, then asked to record the session, merge to main, push, and delete the leftover branch.
- Implemented Option B: deleted `leave-league.ts`; removed `leagues.join.leave`/`leaving` from `ko.ts`+`en.ts` (kept symmetric — `Messages` derives from `koMessages` via `as const satisfies`); restored the detail page `src/app/[locale]/leagues/[leagueId]/page.tsx` to join-only (no `LeaveLeagueButton`/`getMyGroupLeagues`/`amParticipant`). Kept the wanted parts bundled in the parallel commit: the orphaned `leagues.join.error` is now wired into `JoinLeagueButton` as a `role="status" aria-live="polite"` region (visible `text-overuse` on error) so a failed join is announced instead of the button silently resetting; `join-league-button.test.tsx` (idle/error/live-region) kept; unused `me.hallOfFameLink` key removal kept. Deliberately did not add a static `aria-label` to the join button (it would override the dynamic visible label — an a11y regression).
- Git: the rejected `6bbe925` was unpushed/local-only, so it was collapsed via `reset --soft` into one clean commit **`1f6628f`** "feat(leagues): surface join error + remove dead leave path" on `08504bf`, so main never records the leave-button detour. Fast-forwarded `feat/league-hall-of-fame-design` → `main` (`b597e00 → 1f6628f`), landing the entire league feature on main, and pushed `origin/main` → Vercel auto-deploy. The feature branch was then deleted (local-only; never pushed).
- Verification: `npm run test` 386 passed (81 files), `npx eslint` 0 errors (2 pre-existing `game-preview.tsx` warnings), `npm run build` pass (routes `/[locale]/leagues` and `/[locale]/leagues/[leagueId]` present).

## 2026-06-28

### 로그인·온보딩 화면 잔디 정원 리디자인 (+ main 머지·푸시)

- 사용자가 `/superpowers:write-plan`(deprecated — 앞으로 "superpowers writing-plans" 스킬 사용으로 안내함)로 "로그인(온보딩) 페이지를 깔끔하게 우리 테마에 맞게" 만드는 구현 계획을 요청. 계획 `docs/superpowers/plans/2026-06-28-auth-onboarding-warm-redesign.md`, 스펙 `docs/superpowers/specs/2026-06-28-auth-onboarding-redesign-design.md`.
- AskUserQuestion으로 확정: (1) 테마 = 잔디 정원 웜(=/me·영지 팔레트, 항상 라이트), (2) 레이아웃 = 브랜드 스플릿, (3) 범위 = 로그인·회원가입·온보딩 3개 모두. 이후 `/goal`로 "구현 진행" 지시 → 새 브랜치 `feat/auth-onboarding-warm-redesign`.
- 1차 구현(5 Task, TDD·태스크별 커밋): i18n 카피+스펙(`2b85d54`) → AuthShell+CSS+jsdom 테스트(`7bf7043`) → 3개 페이지 배선(`72f49b7`) → 폼 3종 다듬기(`85c9bee`). 공유 `AuthShell`이 `profile-surface`와 동일한 토큰 재정의 기법으로 웜 팔레트를 스코프(지도/대시보드 불변). AGENTS.md대로 `next/image` 로컬 문서 확인(Next 16에서 `priority` deprecated → 미사용).
- 사용자가 라이브(자체 dev 서버)에서 보고 피드백: "디자인적으로 별로 + 모바일 공백이 크다"며 레퍼런스(일러스트 헤더 + 언더라인 입력 + 알약 버튼의 컴팩트 중앙 카드)를 제시하고 "이 느낌에 우리 테마로"를 요청. 1차 브랜드 스플릿의 모바일 레이아웃이 상단 브랜드 밴드 후 폼을 남은 공간 중앙 정렬해 큰 세로 공백이 생긴 것이 핵심 불만.
- 2차 리디자인(`e681137`): 브랜드 스플릿 폐기 → **일러스트 중앙 카드**. 정원 헤더(그린 그라데이션 + 햇살 블룸 + `campus-building-lv3.png` 아이소메트릭 건물·미세 플로트 + 크림 SVG 웨이브로 본문 연결) + 좌상단 `🌿 CEMS` 태그, **언더라인 입력 + 원형 아이콘**(placeholder를 라벨로 쓰되 `.srOnly` 라벨 보존), **알약(pill) 버튼**, 배경은 부드러운 정원 언덕(인라인 SVG). 콘텐츠 크기 카드를 중앙 정렬해 모바일 공백 해소. 브랜드 칩·태그라인 제거, `AuthShell` props를 `brandName/title/subtitle`로 단순화, 미사용 `account.brand` 카피(ko/en) 삭제. 스펙 문서를 일러스트 카드 방향으로 갱신.
- 검증(각 단계): Vitest 303/303(신규 AuthShell 테스트 2), ESLint 0 errors(기존 `game-preview.tsx` 경고 2개), `npm run build` 통과. 라이브 SSR 실측 — `/ko·/en/login`·`/ko/signup` 200(브랜드·일러스트·웨이브·건물 아트·필드 렌더), `/ko/onboarding` 로그아웃 시 307(가드 정상). 토큰 격리: `auth-shell.module.css`는 인증 4개 파일(AuthShell + 폼 3종)만 import → 지도/`me`/영지 구조적 불변.
- 사용자 지시로 `feat/auth-onboarding-warm-redesign`(5 커밋)을 `main`에 fast-forward 머지(`e681137`)하고 `origin/main` 푸시 → Vercel 자동 배포. 브랜치 삭제, 로컬·원격 단일 `main`.
- 도구 제약(문서화): 이 환경엔 브라우저/스크린샷 도구가 없어 픽셀 스크린샷은 못 떴고, 검증은 SSR HTML·테스트·빌드·토큰 격리로 갈음. 실제 모양은 사용자가 자체 dev 서버(`localhost:3000`, HMR)로 확인.

### 같은 날 — 테마 초기화 스크립트 하이드레이션 이슈 수정

- 사용자가 dev 오버레이의 "2 Issues" 정리를 요청. 확인한 원인: 루트 레이아웃(`src/app/[locale]/layout.tsx`)이 `<body>`에 테마 플래시 방지용 **원시 `<script dangerouslySetInnerHTML>`**(테마 초기화)를 렌더 → React 19가 (1) "Encountered a script tag while rendering React component" 경고, (2) 원시 body 스크립트를 `<head>`로 호이스트하며 "Hydration failed(서버/클라이언트 불일치)"를 발생. 인증 리디자인과 무관한 **앱 전역(모든 페이지) 기존 이슈**.
- 수정(`5e49f0d`, AGENTS.md대로 `node_modules/next/dist/docs`의 Script 문서 확인 후): 레이아웃의 원시 `<script>`를 `next/script`의 `<Script id="cems-theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={...} />`로 교체. beforeInteractive는 Next가 스크립트를 추출·주입하고 React 트리에 원시 `<script>`를 렌더하지 않으므로 두 증상이 모두 해소된다. `themeInitScript` 로직과 `<html data-theme="light" suppressHydrationWarning>`은 유지.
- 검증: `tsc --noEmit`에 레이아웃 신규 오류 0(기존 테스트 오류만 잔존), ESLint 0 errors, Vitest 303/303, `npm run build` 통과. dev SSR 실측으로 테마 스크립트가 이제 Next beforeInteractive 로더(`__next_s` push, `id:"cems-theme-init"`)로 직렬화돼 **원시 React 트리 스크립트가 아님**을 확인. 브라우저 오버레이의 "0 Issues" 최종 확인은 사용자 새로고침 몫.

### 같은 날 — 영지 아이템 컨텍스트 컨트롤 재설계(이동 팝업 가림 해결) · main 머지·푸시

- 사용자가 `/superpowers:writing-plans`로 "영지에 설치된 아이템 위치 이동 시 아이템 표시 팝업이 화면을 가려 움직이기 어렵다"는 문제의 구현 계획을 요청. 확인한 근본 원인: 이동(moving) 모드에서 `ContextualItemActions` 팝업이 **이동 전 원래 아이템 위치**(앵커를 `scene.items`의 현재 셀에서 계산) 위에 떠 있어, 보통 가까운 칸으로 옮기는 목적지 셀을 가리고 탭까지 가로챔. (컨텍스트 컨트롤 자체는 직전 커밋 `0ecdbdb`에서 추가됨.)
- AskUserQuestion으로 1차 방향 확정: "이동 중 컨트롤을 화면 하단 고정 바로 분리"(추천 선택). 계획 문서 `docs/superpowers/plans/2026-06-28-estate-move-controls-bottom-bar.md` 작성 후 `/goal "구현 진행"` 지시 → 새 브랜치 `fix/estate-move-controls-bottom-bar`에서 TDD로 하단 고정 바 구현·커밋.
- 사용자가 라이브로 보고 방향 변경: "아이템 근처에 반투명 + 아이콘 형태로 간단화"를 원함 → **하단 바 폐기**. 선택·이동 두 상태 모두 아이템 위 작은 **아이콘 전용 클러스터**(이름은 `title` 툴팁, 버튼은 `aria-label`)로 재작성. 작고 반투명이라 시야를 거의 안 가리고 아이콘 밖 탭은 캔버스로 통과(타이틀/좌표 텍스트 제거).
- 사용자 추가 요청 3건을 순차 반영:
  1. "배치(이동) 시 반투명 박스도 미리보기 설치 위치로 같이 이동" → 이동 중 클러스터 앵커를 **미리보기 고스트(목표/호버 셀)** 기준으로 계산(없으면 아이템 기준). 신규 `getFootprintActionAnchor`(아이템·미리보기 공용 풋프린트 앵커) 추가, `getSelectedItemActionAnchor`가 위임, 캔버스 앵커 effect가 moving일 때 미리보기로 추종(deps에 `mode`·`placementPreview` 추가).
  2. "이동 버튼 누르기 전(선택 상태)에는 반투명일 필요 없음" → `.contextCluster` 기본 불투명, `.contextClusterMoving`에만 `opacity:0.62`(호버/포커스 시 또렷).
  3. "특정 물건 focus 상태에서 배경/바닥을 누르면 focus 해제" → 캔버스에 `onBackgroundTap` 콜백 + `clear-selection` 펜딩 프레스(아이템/구역과 동일한 탭 vs 드래그 판정: 탭=해제, 드래그=팬), 게임 클라이언트가 `handleClearSelection`(selected→view)로 배선.
- 작업 중 처리한 사실: `.moveBar`·구 `.contextMenu*`(타이틀/좌표 텍스트 포함) 제거(아이콘 클러스터로 대체). 테스트를 아이콘 전용 API에 맞춰 `aria-label` 기준으로 갱신(`contextual-item-actions.test.tsx`)하고, 미리보기 추종·배경 탭 해제 케이스를 `estate-canvas.test.tsx`·`action-anchor.test.ts`·`estate-game-client.a11y.test.tsx`에 추가.
- 검증(각 단계 및 최종): Vitest **340/340**, ESLint **0 errors**(기존 `game-preview.tsx` 경고 2개), `npm run build` 통과. 도구 제약(문서화): estate 풀블리드 캔버스 라우트는 프리뷰 스크린샷이 멈추는 기존 한계가 있어 픽셀 육안 확인 대신 테스트·빌드로 검증(실제 투명도·추종·탭 해제 느낌은 사용자 dev/배포 확인 몫).
- 사용자 지시로 브랜치의 4개 작업 커밋(하단 바 → 아이콘 클러스터 → 미리보기 추종 → 선택 불투명+배경탭)을 **하나로 스쿼시**해 `main`에 머지하고 `origin/main` 푸시(`0ecdbdb..ebc8dd5`, 폐기된 하단 바 커밋은 히스토리에서 제외, 계획 문서 포함) → Vercel 자동 배포. 이어서 `fix/estate-move-controls-bottom-bar` 삭제, 로컬·원격 모두 단일 `main`.

### 같은 날 — 메인 설정 팝업 정리·모드(관리자 대시보드/참여자 모드) 제거 · main 머지·푸시

- 사용자가 `/superpowers:writing-plans`로 "메인 페이지 설정 버튼 팝업이 구현된 부분과 맞지 않는다"는 문제의 구현 계획을 요청. 구체적 불만 3가지: (1) 팝업 내용이 실제 구현과 불일치, (2) "관리자 대시보드" 용어를 다른 용어로, (3) "참여자 모드"는 /me 프로필 기능과 겹쳐 불필요해 보임(제거 고려).
- 확인한 핵심 사실: 설정 팝업의 "모드" 토글이 `AdminMapView`(지도)와 `ParticipantDashboard`(참여자 대시보드)를 전환하는데, 참여자 대시보드(소속·그룹 풀·주간 보상·내 포인트·절감량·순위·그룹 랭킹·캐릭터)가 이미 `/me` 프로필(포인트·레벨·연속일·성취·에너지 잔디·목표·영지 기여·내역)과 대부분 겹쳐 사실상 중복.
- AskUserQuestion으로 방향 확정: (1) **모드 개념 자체 제거** — 지도를 단일 홈으로, 개인 데이터는 /me로 일원화, 참여자 대시보드의 유일 고유 기능 "주간 절감 보상 받기"는 /me로 이전해 기능 보존, (2) 메인 화면 명칭 **"캠퍼스 지도"**.
- 계획 문서 `docs/superpowers/plans/2026-06-28-main-settings-popover-mode-cleanup.md`. 이어서 `/goal "구현 진행"` → 새 브랜치 `feat/main-settings-mode-cleanup`에서 **subagent-driven**(구현 서브에이전트 → 태스크별 spec+품질 리뷰 → 최종 전체 브랜치 리뷰)으로 진행.
- 구현(태스크 단위 TDD 커밋):
  - `1c9527d` — `EstateContribution`에 `action?: ReactNode` 슬롯 추가, /me에서 `<ClaimRewardButton />` 주입(주간 절감 보상 기능 보존).
  - `d3b31af` — 모드 토글 제거: `CampusEnergyApp`이 항상 지도 렌더, `AdminMapView`·`MapSettingsPopover`의 `mode`/`onModeChange` 제거, 팝업 제목 "지도 설정"→"설정"(ko/en).
  - `2c815b5` — 고아 컴포넌트 7개(`mode-tabs`·`app-header`·`bottom-nav`·`participant-dashboard`·`group-rank-table`·`character-card`·`metric-card`) + `bottom-nav.test.tsx` 삭제, 죽은 i18n(`modes`·`participant`·`me.openMyPage`·`mapView.settings.mode`) ko·en 대칭 제거, `messages.test.ts` 단언 교체.
  - `1a663e8` — 메인 화면 명칭 "캠퍼스 지도"/"Campus map": `mapView.title` i18n + 홈 라우트 `generateMetadata`로 탭 제목 오버라이드(AGENTS.md대로 next metadata 로컬 문서 확인).
  - `854d307` — 모드 제거로 미사용이 된 홈 로더의 개인포인트·그룹풀 조회 제거, `CampusEnergyAccount`를 `{ orgSubjectId }`로 축소(/me가 자체 조회하므로 무손실).
- 보존(grep 확인): `app.eyebrow`(layout 메타), `getCharacterProgress`(/me·ProfileHero), `getDemoGroupRankings`(energy.test) 유지. `Messages` 타입이 `koMessages` 파생이라 키 제거 시 빌드가 잔존 참조를 잡는 안전망 역할.
- 검증(각 태스크 + 최종): Vitest **340/340**(`bottom-nav.test` 2개 삭제로 342→340), ESLint **0 errors**(기존 `game-preview.tsx` 경고 2개), `npm run build` 통과. 최종 전체 브랜치 리뷰(opus)가 독립 재확인 후 **"머지 가능"**(Critical/Important 0), 삭제된 컴포넌트·i18n 키 잔존 참조 0건(grep).
- 도구 제약(문서화): 지도 라우트는 Mapbox 지속 렌더로 프리뷰 스크린샷이 멈추는 기존 제약 → 실제 화면은 사용자 dev/배포 확인 몫. 검증은 테스트·빌드·grep으로 갈음.
- 남은 한계(문서화): 참여자 대시보드 제거로 `account.estatePool`(label/memberCount) i18n이 미사용이 됐으나 공용 `account` 네임스페이스라 무해, 정리는 범위 밖으로 남김.
- 사용자 지시로 회의록 정리 후 `feat/main-settings-mode-cleanup`(계획 1 + 구현 5 + docs 1 커밋)을 `main`에 fast-forward 머지하고 `origin/main` 푸시 → Vercel 자동 배포. 이어서 feature 브랜치 삭제, 로컬·원격 모두 단일 `main`.

## 2026-06-27

- The user asked to change the estate size from 16x16 to 15x15 and adjust the main building to 3x3.
- A focused implementation plan was saved at `docs/superpowers/plans/2026-06-27-estate-15-grid-main-building-3x3.md`.
- Implementation changed the estate expansion catalog to 15x15 parcels forming a 45x45 map (`-15..29`), changed the fixed base campus building footprint to 3x3, and centered fresh seed snapshots at `(6,6)`.
- Targeted estate verification passed: `npx vitest run src/features/estate/__tests__/expansion.test.ts src/features/estate/__tests__/placement.test.ts src/features/estate/__tests__/commands.test.ts src/features/estate/__tests__/estate-canvas.test.tsx src/features/estate/__tests__/estate-repository.test.ts src/features/estate/__tests__/isometric-renderer-scene.test.ts` -> 6 files / 55 tests passed.
- Full verification passed: `npm run test` -> 60 files / 286 tests passed; `npm run lint` -> 0 errors with the existing 2 `game-preview.tsx` warnings; `npm run build` -> pass.
- The user then reported the main building felt visually detached from the background, as if floating. The renderer now draws a warm grounding shadow from the building footprint before the sprite, and the sprite shadow color was adjusted from cool slate to olive so the building reads as planted on the garden floor.
- The user then clarified that the 3x3 floor itself must remain visible; the earlier tighter marker made the building read as 2x2. The renderer now keeps the main building's logical and displayed footprint at the full 3x3 floor, draws its selection outline underneath the sprite, enlarges the level-building sprites to read as 3x3 buildings, and shifts the main-building sprite anchor down so the building sits on the visible 3x3 floor. Ordinary item display footprints and ordinary building grounding keep their previous behavior.
- The user then asked to remove the shadow. The level-building sprites no longer define soft asset shadows, and the renderer skips decorative grounding for the main building while keeping ordinary building grounding behavior unchanged.
- Follow-up verification passed: estate Vitest `src/features/estate/__tests__` -> 24 files / 123 tests; full `npm run test` -> 60 files / 293 tests; `npm run lint` -> 0 errors with the existing 2 `game-preview.tsx` warnings; `npm run build` -> pass.

### 같은 날 — 영지 상점/타일 아트 고화질 PNG 교체·최적화, 테스트 계정 포인트, main 푸시

- 사용자가 "영지 꾸미기 디자인 강화용 이미지 생성 프롬프트"를 요청(메인 건물 `campus-building-lv1~5.png`는 고화질, 상점 아이템 아트가 부족 → 새로 제작). AskUserQuestion으로 (1) 도구 = ChatGPT/GPT-image(DALL·E), (2) 범위 = 상점 입체 배치 아이템(평면 바닥 타일 3종 제외)을 확정 → 메인 건물 화풍(2:1 아이소메트릭, 크림 석조+황금+녹색+빛나는 창, 투명 PNG)에 맞춘 GPT-image 프롬프트(공통 스타일 블록 + 아이템 12종)를 작성.
- 사용자가 결과 PNG를 `public/estate-assets/generated/`에 넣고 "확인 후 교체 + it@naver.com 돈 많이"를 요청.
  - 확인한 사실: 생성 PNG 13개(상점 12종 + it-technology-building)가 전부 알파 투명 + 매니페스트 logical 크기의 정확히 2배(종횡비 일치) → `estate-asset-manifest.ts`의 `src`만 svg→png로 바꾸고 logical 크기/앵커는 유지(왜곡 없음).
  - 포인트: Supabase MCP `execute_sql`로 `point_events`에 +1,000,000 직접 insert(관리자 직권, RLS 우회, reason `manual:demo-topup`). it@naver.com(it1/student-services) 개인 합 70→1,000,070. `profiles`가 1행뿐이라 그룹 풀(=영지 구매 예산)도 동일. 이 그룹 소유 영지는 `yu-b04`(중앙도서관) 1개.
- 사용자가 "안 쓰는 옛 SVG 삭제 + PNG 용량 최적화 + 파일명 정리"를 요청 → 옛 스프라이트 SVG 13개 + `generated/` 폴더 삭제(타 참조 없음 확인), sharp(0.34.5) 팔레트 양자화로 최상위 `<id>.png` 출력: 1.30MB→408KB(69%↓), 투명·2× 해상도 유지, 그라데이션(온실·IT·분수) 밴딩 없음 확인. 매니페스트 경로를 `/estate-assets/<id>.png`로 갱신.
- 사용자가 (커밋 전) "타일 프롬프트도"를 요청 → 렌더링 방식 확인(2:1 다이아몬드 셀에 평면 `fill`→`insetFill`→다이아몬드로 클립한 텍스처를 `textureOpacity`로 오버레이; 같은 이미지가 모든 셀에 반복이라 균일·심리스 필요. `renderer.ts` drawGroundTiles/drawGroundTextureImage). 타일 4종(grass·stone-path·light-pavement·flower-soil-tile) 프롬프트 작성.
- 사용자가 타일 PNG 4개를 `tiles/`에 넣고 "확인 후 적용"을 요청.
  - 확인한 사실: 4개 512×256 정확히 2:1·모서리 투명이나 다이아몬드가 프레임을 꽉 안 채우고 여백 있음 → sharp `.trim()`으로 여백 제거 후 256×128(2× 셀)로 정규화(다이아몬드가 변 중앙까지 채워 렌더러 클립과 정렬 → 셀 간 베이스색 틈 제거) + 팔레트 최적화: 826KB→52KB(94%↓). 풀 페인팅 타일이라 ground 6개 `src`→png + `textureOpacity`를 1로 변경(베이스색은 폴백; `grass-decoration`·`bright-sidewalk-block`은 grass·light-pavement 이미지 공유). `asset-manifest.test.ts`의 ground src 정규식을 `\.(svg|png)$`로 확장. 옛 타일 SVG 4개 + `-painterly` 원본 삭제.
- 각 단계 검증 동일 통과: estate Vitest 24파일/123, ESLint 0 errors(기존 `game-preview.tsx` 경고 2개), `npm run build` 통과.
- 사용자 지시로 전체 변경(PNG 17 추가·SVG 17 삭제·`estate-asset-manifest.ts`·`asset-manifest.test.ts` 수정)을 커밋(`a2b7027 feat(estate): replace shop sprites and ground tiles with optimized PNG art`)하고 `origin/main`에 푸시 → Vercel 자동 배포. 총 에셋 용량 ~2.1MB→460KB.
- 메모: it@naver.com은 이제 데모 포인트 1,000,070 보유(실적립 아님, 영지 구매 테스트용) — 앞 2026-06-26 항목의 "70 demo points"는 이로써 갱신됨. estate 풀블리드 캔버스는 프리뷰 스크린샷이 멈추는 기존 제약이 있어 실제 합성(타일 이음새·아이템 접지)은 배포본 육안 확인 필요.

### 같은 날 — 메인 지도 건물별 개인 기여도 랭킹 미리보기

- 사용자가 `/superpowers:writing-plans`로 "메인 화면에서 건물 클릭 시 토글 효과 등으로 해당 건물의 개인별 기여도 랭킹도 뜨도록(미리보기 개념)"의 구현 계획을 요청했고, 이어서 "구현 진행 + 다른 브랜치"를 지시했다.
- AskUserQuestion으로 확정한 방향: (1) 데이터 소스 = **실제 Supabase DB에 게스트 여러 명을 시드**해 "실제 돌아가는 시스템처럼"(합성 데모 데이터 대신 — 사용자가 Other로 직접 지정), (2) **팝업 내부 세그먼트 토글**(에너지 진단 ⇄ 기여 랭킹), (3) **상위 N명 인라인 미리보기만**(전체 랭킹 페이지 없음), (4) 지표 = **누적 포인트**(기존 개인 포인트·그룹 풀과 동일).
- 작업 중 확인한 핵심 사실: 메인 지도는 건물·에너지가 전부 데모 데이터이고 실제 데이터는 현재 사용자 본인 것뿐이며, RLS상 본인 그룹 외 멤버의 포인트는 못 읽는다. 그래서 어느 건물이든 랭킹을 조회하려면 **SECURITY DEFINER RPC**가 필요(이름+점수만 노출하는 의도된 리더보드용 완화). 또 기여는 그룹 단위로 적립되므로 "건물별 랭킹"은 실제로는 **그 건물을 운영하는 그룹의 멤버 랭킹**이다(공대 4개 건물은 같은 명단 공유, `estate_subjects`에 매핑된 6개 건물만 랭킹 표시·나머지는 빈 상태).
- 계획 문서 `docs/superpowers/plans/2026-06-27-building-contributor-ranking-preview.md`. 새 브랜치 `feat/building-contributor-ranking`에서 TDD·태스크 단위로 9커밋 구현 후 `main`에 fast-forward 머지(`818009c`)하고 브랜치 삭제, `origin/main` 푸시(Vercel 자동 배포).
- 코드: 신규 도메인 `src/features/account/domain/contributor-ranking.ts`(`groupContributorRowsBySubject` + 타입, TDD), 신규 `src/features/campus-energy/components/building-contributor-ranking.tsx`(상위 N 리스트+빈 상태+`is_me` "나" 배지), `building-popup.tsx`에 세그먼트 토글 추가(`contributors`는 선택적 prop 기본 `[]`, 탭 리셋은 `admin-map-view.tsx`에서 `key={subject.id}` 리마운트로 처리해 `set-state-in-effect` 린트 회피), DAL `getSubjectContributorRankings()`가 RPC 호출, `page.tsx`가 서버에서 미리 받아 `CampusEnergyApp→AdminMapView→BuildingPopup`로 전달. i18n `mapView.contributors`(ko/en).
- 작업 중 마주친 제약 2건: 기존 `building-popup.test.tsx`(영지 링크 테스트)가 이미 있어 새 토글 테스트를 합쳐 보존했고 `contributors`를 필수가 아닌 선택적 prop으로 바꿔 하위호환 유지. `campus-energy-app.test.tsx`도 새 prop을 받도록 갱신.
- DB(라이브 `cems`, ref `zvuqmagfpdyrrzyjntue`): 마이그레이션 `contributor_ranking_rpc`(기록 `docs/superpowers/migrations/2026-06-27-contributor-ranking-rpc.sql`) — `get_subject_contributor_rankings(p_limit)`가 `estate_subjects`→소유 그룹→`point_events` 합산 상위 N을 `(subject_id,user_id,display_name,points,rank,is_me)`로 반환, authenticated EXECUTE·anon revoke. 시드(기록 `docs/superpowers/migrations/2026-06-27-seed-demo-guests.sql`): 게스트 15명(게스트 1~15)을 engineering 6·humanities 5·student-services 4로 `auth.users`+`profiles`+`point_events`(reason `seed:demo-contribution`·period `2026-W26`)에 고정 UUID+ON CONFLICT로 멱등 시드. `profiles` 1→16행.
- 부수효과(문서화): 게스트 `point_events`가 소속 그룹 풀을 올린다. student-services 풀이 +3,470(→ it1/`it@naver.com`의 영지 예산에 반영)되지만 it1의 1,000,070점에 비해 미미해 `yu-b04`(중앙도서관) 1위는 it1 유지. 남은 한계: 건물별이 아닌 그룹별 귀속, 전체 랭킹 페이지 없음, 미매핑 건물은 빈 상태.
- 검증: RPC 프로브 — `yu-b04`=it1(1,000,070)#1·게스트12~15, `yu-c02`=게스트7~11, `yu-e21`=게스트1~5(게스트6은 6위라 제외), 6개 건물 모두 랭킹·`is_me` 정상. Supabase 보안 advisor는 신규 RPC가 기존 6개 SECURITY DEFINER 함수와 동일한 양성 WARN만(ERROR 0). Vitest 301/301(신규 8: contributor-ranking 4·building-contributor-ranking 2·building-popup +2), ESLint 0 errors(기존 `game-preview.tsx` 경고 2개), `npm run build` 통과(`/[locale]`는 Dynamic). 지도 라우트는 프리뷰 스크린샷이 멈추는 기존 제약이 있어 브라우저 육안 캡처 대신 SQL 프로브·단위테스트·빌드로 검증.

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

### 같은 날 — main 머지·Vercel 배포·프로덕션 검증·데모 QR·인증 취소

- 사용자 지시로 `feat/personal-page-qr-goals`를 `main`에 fast-forward 머지(`dd5b403`)하고 `origin/main`에 푸시 → Vercel(`https://cems-kappa.vercel.app`) 자동 배포. 이후 머지된 브랜치 삭제, 로컬·원격 모두 단일 `main`. (앞 항목의 "푸시 안 함(로컬)"은 이로써 갱신됨 — 머지·배포 완료.)
- 프로덕션 검증: `gh`/Vercel CLI가 이 환경에 없어 브라우저 UI 대신 테스트 계정(`it@naver.com`)으로 프로덕션 Supabase에 직접 로그인해 전체 경제 루프를 실측 — `complete_mission('stairs')`=completed(+50), `get_my_goal_progress` today/week=1, `claim_goal_reward('daily-1')`=claimed(+20, 서버 재검증), `daily-3`=not-met, 개인 합 70. 로그아웃 라우트 게이트(`/ko`,`/ko/me`,`/ko/scan/stairs`→`/ko/login?next=…`)도 프로덕션 정상.
- 데모 QR 생성: `docs/demo/qr-it-2f-stairs.{svg,html}`(라벨 "IT관 2층 계단", 프로덕션 URL `…/ko/scan/stairs` 인코딩, 인쇄용 스티커). 확인한 사실: QR은 URL 텍스트일 뿐이라 "WiFi 무관"은 DB 등록이 아니라 앱 호스팅(배포/터널) 문제 — 이미 배포돼 있어 셀룰러 포함 어디서든 스캔되고, 미션은 이미 시드돼 DB 추가 등록 불필요.
- 사용자 요청 "QR 인증 수동 취소"(한 번 찍으면 일 상한 때문에 재스캔 불가): 서버 권위 RPC `cancel_mission`(마이그레이션 `cancel_mission_demo`, 기록 `docs/superpowers/migrations/2026-06-26-cancel-mission.sql`) + `/scan/[code]` 결과의 "테스트: 인증 취소" 버튼(`cancelMissionAction`, 성공 시 새로고침). 본인 오늘 체크인만 삭제하고 적립 포인트도 함께 회수해 일 상한이 유지됨(파밍 아님). 프로덕션 실측: 취소→today 1→0, −50 → 재스캔 completed. 취소는 QR 체크인만 되돌리고 목표 claim은 별개(문서화).
- 테스트 계정 정리: 검증으로 생긴 산출물 중 내가 claim한 `goal:daily-1` 보너스 1건은 삭제했고, 검증 중 사용자가 실시간으로 찍은 stairs 체크인은 사용자 데이터라 보존(동시 사용 확인됨).
- 검증: Vitest 227/227, `npm run build` 통과, 독립 코드 리뷰(opus, 라이브 DB·동작 프로브로 실증) Critical/Important 0건(Minor 3건 수정 반영). 커밋·푸시: `dd5b403`(슬라이스)·`51cac09`(docs+QR)·`87d83ac`(취소 기능) 모두 `origin/main`.

### 같은 날 — 모바일 지도 UI 정리 + 내 조직/프로필 레일

- 사용자가 모바일에서 메인 지도 UI가 난잡하다고 불만(요약 카드 글자가 세로로 깨짐, 떠 있는 보조 UI 과다)이라며 수정 계획을 요청(`/superpowers:writing-plans`).
- AskUserQuestion으로 확정한 방향: (1) 구조적 모바일 재설계(영지에서 쓴 "하단 도크+시트" 패턴과 통일), (2) 상단 요약 카드는 모바일에서 "줄바꿈 없는 한 줄 컴팩트 바", (3) 모바일에서 숨길 보조 UI = 캠퍼스 선택 드롭다운·지도 범례·브랜드 부제(로고 아이콘만)·히트맵/라벨 토글(설정 팝오버로 이동). 데스크탑(`sm`≥640px)은 불변 유지.
- 계획 문서 `docs/superpowers/plans/2026-06-26-mobile-map-ui-cleanup.md`. 새 로컬 브랜치 `feat/mobile-map-ui-cleanup`에서 TDD·태스크 단위로 구현. 사용자 제공 테스트 계정 `it@naver.com`/`123456`.
- 구현(태스크 1~6): 신규 `map-summary-bar.tsx`(모바일 한 줄 요약, `whitespace-nowrap`) + i18n 단축키 `summaryRealtimeShort`/`summaryNetSavingShort`(ko·en); `map-top-bar` 반응형(아이콘 브랜드·검색창 flex-1·캠퍼스 숨김); `map-controls`가 모바일에서 히트맵/라벨 버튼 숨김; 신규 `map-display-toggles.tsx`를 설정 팝오버에 모바일 전용으로 추가; `building-rank-panel`에 `variant`(floating/sheet) 추가해 모바일은 기본 접힘 하단 시트; 건물 팝업은 `globals.css` `.cems-popup-anchor`로 모바일 하단 카드화; 모바일 범례 숨김.
- 라이브 프리뷰(390px) 실측으로 단위테스트·정적리뷰가 놓친 **실제 버그 2개를 잡아 수정**(커밋 `d83d044`): (a) Mapbox 저작권 lift가 Mapbox 자체 `bottom:0`에 소스 순서로 밀려 적용 안 됨(computed 0px) → `globals.css`에 `bottom: 4rem !important`로 도크 위 노출; (b) 하단 시트가 안 펼쳐짐 — `max-h-[45vh]` arbitrary 유틸을 Tailwind v4 JIT가 생성 안 함 + `0→vh` max-height 트랜지션이 0에 멈춤 → max-height를 인라인 스타일로 구동하고 시트만 트랜지션 제외(데스크탑 플로팅 패널은 트랜지션 유지). 독립 코드리뷰(opus)는 APPROVE(Critical/Important 0).
- 후속 1 — 사용자가 "우측 줌 버튼(+/−/새로고침) 대신 내 조직 바로가기·프로필 아이콘"을 요청. AskUserQuestion 확정: (1) "내 조직"은 페이지 이동이 아니라 **지도에서 내 그룹 건물로 flyTo**, (2) 모바일·데스크탑 모두 교체, (3) 상단 프로필 칩은 유지. 구현(`d466462`): `page.tsx`가 `getGroupEstateSubjectId(groupId)`로 `orgSubjectId`를 해석해 `CampusEnergyApp`→`AdminMapView`로 전달. "내 조직" 클릭 = `onSelectSubject(orgSubjectId)`(선택하면 지도가 `easeTo`로 이동). "프로필" = `/{locale}/me` Link. 줌 버튼 제거(지도 줌은 스크롤·핀치로 유지). `CampusMap`의 zoom/reset imperative handle은 테스트가 있어 보존(버튼만 제거). 데모 그룹 student-services는 `estate_subjects` 시드상 `yu-b04`(중앙도서관)에 매핑.
- 후속 2 — 사용자가 "레일에 프로필 아이콘이 생겼으니 우측 상단 레벨/점수 칩은 불필요"라고 추가 결정(앞의 '칩 유지'에서 변경). 구현(`f870614`): `AdminMapView`에서 `ProfileChip` 제거 + 단일 사용처라 컴포넌트 `profile-chip.tsx` 삭제 + 미사용이 된 `account` prop 정리. 데스크탑 요약 카드와 레일 프로필 아이콘(→/me)은 유지.
- 검증: Vitest 237/237, ESLint 0 errors(기존 `game-preview.tsx` 경고 2개), `npm run build` 통과. 라이브 프리뷰 실측(it@naver.com) — 모바일(390px): 요약 한 줄·줄바꿈 없음, 캠퍼스/범례 숨김, 팝업 하단 카드, 시트 0→380px(45vh, 9행), 저작권 도크 위 노출, 레일=[내 조직·프로필·설정]에 줌 없음, "내 조직"→IT관에서 중앙도서관으로 flyTo(center 이동·zoom 17.1), 프로필 href `/ko/me`, 레벨 칩 제거(/ko/me 링크 1개). 데스크탑(1280px): 요약 카드·범례·캠퍼스·레일 히트맵/라벨 유지, 줌 없음, 칩 없음. 지도 라우트는 Mapbox 지속 렌더링으로 프리뷰 스크린샷이 타임아웃돼(기존 환경 한계) DOM/지오메트리 측정으로 검증.
- 사용자 지시로 `feat/mobile-map-ui-cleanup`(10 커밋)을 `main`에 fast-forward 머지(`8c32955→f870614`)하고 `origin/main`에 푸시 → Vercel 자동 배포. feature 브랜치 삭제, 로컬·원격 모두 단일 `main`. `.claude/launch.json`·`.superpowers/`는 계속 untracked.

### 같은 날 — 개인 프로필 인스타 리디자인 + 에너지 잔디

- 사용자가 "개인 프로필 페이지(`/me`) 디자인이 너무 투박하다 → 인스타그램 개인 프로필 느낌으로 전반 강화 + 깃허브 잔디 심기 기능을 가볍게" 요청(`/superpowers:writing-plans`), 이어서 "구현 진행 + 새 브랜치"를 지시.
- AskUserQuestion으로 확정한 방향: (1) **편집 가능한 한 줄 소개·핸들** 채택(프로필 사진 업로드는 범위 밖) → `profiles`에 `handle`/`bio` 컬럼만 추가. (2) 깃허브 잔디 한 칸의 진하기 = **그날 획득 포인트** 합. (3) 인스타 헤더 스탯 = **총 포인트·레벨**(+자연스러운 3번째로 연속일/streak). 배지는 "최우수 학생 등 관리자 수여를 **나중에**" 하기로 → 지금은 보유 데이터에서 파생한 성취 메달 + 잠금된 `top-student` 슬롯만, 실제 수여 메커니즘은 범위 밖.
- 계획 문서 `docs/superpowers/plans/2026-06-26-personal-profile-instagram-redesign.md`. 새 로컬 브랜치 `feat/profile-instagram-redesign`에서 TDD·태스크 단위로 구현(미푸시).
- 마이그레이션 `profile_bio_handle`(기록 `docs/superpowers/migrations/2026-06-26-profile-bio-handle.sql`): `profiles`에 `handle`/`bio` text 컬럼, `handle` 부분 unique 인덱스(`where handle is not null`), CHECK(`handle ~ '^[a-z0-9_]{3,20}$'`, `char_length(bio) <= 80`). 경제·affiliation 컬럼이 아니라 기존 불변-affiliation 트리거와 무관하고, 온보딩과 동일한 own-row 직접 update로 처리.
- 신규 도메인(순수·TDD): `contribution.ts`(서울 UTC+9 결정적 일 버킷 `seoulDayLabel`, 포인트→0~4단계 `contributionLevel`, `buildContributionGraph`=주×요일 격자+totals+current/longest streak), `achievements.ts`(`deriveAchievements`로 레벨·streak·인증횟수 임계 기반 6배지), `profile-edit.ts`(`validateProfileEdit` 핸들 정규화·형식·길이 검증), `points.ts`에 `countMissionCheckIns` 추가.
- 신규 UI: `profile-hero.tsx`(원형 아바타+레벨 진행 링 conic-gradient, 총포인트·레벨·연속일 스탯 줄, `@handle`, 칭호·한 줄 소개, 편집 버튼), `achievement-highlights.tsx`(인스타 스토리형 원형 배지, 잠금=자물쇠+"곧 공개"), `contribution-graph.tsx`+CSS Module(절약=초록 농도 5단계, 가로 스크롤, 빈 상태, `role="img"`+셀 title a11y), `profile-edit-form.tsx`(useActionState), 신규 라우트 `/[locale]/me/edit`. `/me`를 헤더→배지→잔디→목표→영지기여→이력로 재조립하고 기존 `ProfileSummary` 삭제. 잔디는 기존 `getMyPointEvents`(전량 반환) 재사용으로 **새 DB 쿼리 0개**. 기존 카드 섹션 헤더에 lucide 아이콘 통일.
- 부수 정리: `eslint.config.mjs` `globalIgnores`에 `.ds-sync/**`·`ds-bundle/**`(이미 git-ignored인 design-sync 산출물·벤더 번들) 추가 — ESLint가 벤더 `react.js`를 린트해 14 errors가 뜨던 것을 해소(내 코드 무관).
- 검증: Vitest 263/263(신규 26: profile-edit 7·contribution 9·points +2·achievements 4·contribution-graph 2·profile-hero 2), ESLint 0 errors(기존 `game-preview.tsx` 경고 2개만), `npm run build` 통과(`/[locale]/me`·`/[locale]/me/edit` 라우트 생성). DB 실측(자체 롤백 DO 블록): 실계정 `it@naver.com`에 유효 update 적용·잘못된 핸들 CHECK 거부 확인 후 rollback → 잔여 0(핸들/소개 null 유지, display_name 보존). HTTP 실측(dev): 미로그인 `/ko/me`·`/ko/me/edit`·`/en/me/edit` → `/{locale}/login?next=…` 307, 임의 경로 404. 푸시는 사용자 요청 시까지 보류.
- 첫 구현을 라이브로 본 사용자 피드백 3건: (1) 모바일에서 디자인이 깨진다, (2) 색감이 별로다, (3) 카드가 너무 분리돼 보인다 → 일체형을 원한다. frontend-design 스킬로 재작업.
- AskUserQuestion으로 색감·무드 확정: **"따뜻한 잔디 정원 (라이트)"** — 그린 그라데이션 커버(#0b5e3f→#6bbf93), 따뜻한 크림 면(#fbfaf6), 꿀(#e8a13a)·잔디(#2f9e6b) 액센트. ('잔디 심기'·성장 메타포 및 영지 warm 팔레트와 일관.)
- 재작업(커밋 `7a6068e`): 신규 `profile-surface.module.css`가 `.surface`에서 전역 `--color-*` 토큰을 로컬로 재정의해 /me 하위 전 섹션을 warm 팔레트로 리테마(지도/영지/대시보드 토큰 불변, 영지 방식과 동일). 카드 스택 → **카드 없는 한 장짜리 연속 시트**(모바일 풀블리드, sm+에서 중앙 떠 있는 둥근 컬럼), 섹션은 hairline divider로 구분. `ProfileHero` 재구성: 그라데이션 커버 + 글래스 뒤로/로그아웃 오버레이 + 겹친 아바타(꿀 레벨 진행 링) + **모바일에서 안 깨지는 3열 스탯 스트립**(grid-cols-3). 한글 배지 라벨 mid-word 깨짐을 `break-keep`로 해결, 잠긴 `top-student` 배지는 꿀 점선 처리. `SignOutButton`에 선택 `className` prop 추가.
- 검증: Vitest 263/263 유지, ESLint 0 errors, `npm run build` 통과. 라이브 프리뷰(`next start` :3007, `it@naver.com`)로 **모바일 375px·데스크탑 1280px 모두 스크린샷 확인** — 스탯 오버플로 해소, 배지 줄바꿈 정상, 일체형 시트·warm 팔레트 적용. `/me/edit`도 warm 면으로 통일. 미푸시 유지.

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
