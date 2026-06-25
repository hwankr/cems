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
