# Meeting Notes

User-stated decisions and verified working facts are recorded here by date. Do not treat unstated product, architecture, ML, or deployment ideas as confirmed.

## 2026-06-25

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
