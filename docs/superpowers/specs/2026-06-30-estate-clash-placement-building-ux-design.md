# 영지 배치·건물 UI 클래시오브클랜화 설계 (Estate Clash-style Placement & Building UX)

**작성일:** 2026-06-30
**브랜치:** `feat/estate-clash-placement-building-ux`
**상태:** 설계 승인 완료 (사용자: "이대로 진행")

## 1. 배경과 목표

영지(`src/features/estate/`)는 아이소메트릭 HTML 캔버스 빌더다. 현재 아이템 이동/배치 흐름과 건물 기능 UI의 완성도가 클래시오브클랜류 빌더에 미치지 못하고, 특히 **이동 중 UI가 옮기려는 칸을 가리는 겹침 문제**가 있다.

이 작업의 목표는 다음과 같다.

- 배치·이동을 **클래시오브클랜식 직접 드래그**로 바꾸고, 겹침을 구조적으로 제거한다.
- 건물을 탭하면 뜨는 정보/기능 UI(레벨업·기여자 명단·에코 수확)를 **한 곳에 통합**하고 투박함을 없앤다.
- 배치 중 **격자/초록·빨강 발판** 같은 시각 보조로 "어디에 놓을 수 있는지"를 명확히 보여준다.
- 자원 수확을 **건물 위 수확 버블**로 살아 있게 만든다.

## 2. 비목표 (Non-goals)

- **새로운 건물·아이템 종류 추가 안 함.** (사용자 명시) 기존 12 꾸미기 아이템 + 4 발전 건물 + 본관 + 지면 타일 + 어워드 엠블럼 카탈로그를 그대로 둔다.
- 에코 크레딧/절감 포인트 **경제 공식·서버 권위(`save_estate` RPC) 변경 없음.** 이미 구현된 두 화폐 모델 위에 UI/상호작용만 얹는다.
- 새 Supabase 마이그레이션/RPC 없음. (수확 버블·드래그·패널은 전부 클라이언트 상호작용/렌더링)
- 본관 레벨업의 게임 의미 변경 없음(여전히 외형 + 포인트 싱크 + 에코 생산율).

## 3. 현재 상태와 문제점 (근거: 코드)

### 3.1 이동/배치 흐름 (탭 4단계 + 떠다니는 클러스터)
- 상태기계 `EstateEditorMode`: `view | placing{definitionId,rotation} | selected{instanceId} | moving{instanceId,rotation,targetCell?} | painting-ground | expanding` (`domain/editor.ts`).
- 이동: 아이템 탭 → `selected` → "이동" 버튼 → `moving` → 목표 칸 탭(`targetCell`) → "확인" 버튼. (`components/estate-game-client.tsx:751-775, 691-711`)
- 컨트롤은 아이템 위에 떠 있는 아이콘 클러스터(`ContextualItemActions`)이며, 앵커는 풋프린트 뒤(위) 모서리(`isometric/action-anchor.ts:37-39`), 메뉴는 그 위로 배치(`components/contextual-item-actions.tsx:192-195`). → **옮기려는 칸 바로 위를 가린다(high).**
- 아이템이 화면 상단에 가까우면 클러스터가 `topReserved=72`로 클램프되며 **아이템 위에 겹쳐 앉는다**(`contextual-item-actions.tsx:55-57,186-190`).
- `placing/moving`에서는 탭 허용오차가 없어, 유효 칸에서 시작한 드래그(팬 의도)가 즉시 배치/타겟이 된다(`estate-canvas.tsx:663-672`). 모바일 한 손가락 이동은 무조건 팬으로 처리돼(`estate-canvas.tsx:573-592`) **고스트가 손가락을 따라오지 못한다(high).**
- 발판 유효성 `canPlaceEstateItem`은 이미 매 프레임 계산돼 미리보기 `valid`로 전달된다(`estate-canvas.tsx:184-205,220-243`; 렌더러 `renderer.ts`의 `EstateRenderPlacementPreview.valid`). 단 **칸별이 아닌 단일 다이아몬드 한 장**으로만 약하게 표시(`renderer.ts` 미리보기, alpha 0.3/0.36).

### 3.2 HUD 겹침
- 좌상단 상시 `EstateBuildingCard`(레벨업), 상단 중앙 토스트(`top-[4.5rem]`), 본관 선택 시 상단 중앙 `EstateMemberPanel`(`top-[4.25rem] z-40`)이 **같은 상단 띠를 공유**해 좁은 화면에서 충돌(`estate-game-client.tsx:889-917`). 사용자가 "본인 기여 + 건물 레벨업 UI가 겹친다"고 지적한 부분.

### 3.3 건물 기능 UI (투박함)
- 본관 탭 → `EstateMemberPanel`이 그룹 기여자 명단을 상단 중앙에 띄움(`components/estate-member-panel.tsx`). 레벨/업그레이드는 분리된 좌상단 카드, 에코 수확은 상단 새싹 칩(`handleCollectEco`)으로 흩어져 있다. 사용자가 "팀원 명단 UI가 투박하다"고 지적.

## 4. 설계

전체 원칙: **편집 컨트롤·건물 정보 패널은 화면 하단(모바일 시트 / 데스크탑 우측 도크)에 도킹**해 상단 HUD와 절대 겹치지 않게 한다. 떠다니는 `ContextualItemActions` 클러스터는 폐기한다.

### 4.1 A — 화면 레이아웃·HUD 재정리 (겹침 제거)

- 상단 바: 좌측(뒤로 + 건물명), 우측(포인트·에코·저장 칩)만 유지(현행).
- **좌상단 상시 `EstateBuildingCard` 제거** → 레벨/업그레이드는 4.3의 건물 패널로 이동.
- **토스트 위치 조정**: 상단 바 바로 아래 한 줄, 하단 패널/바와 z·위치가 겹치지 않게.
- 동시에 두 개의 하단 패널이 뜨지 않도록 상호배타: `편집 액션 바`(placing/moving) ↔ `건물 정보 패널`(selected) ↔ `인벤토리 시트`는 한 번에 하나만.

### 4.2 B — 배치·이동 상호작용 (클래시화)

확정된 이동 제스처: **드래그 + 탭-들기 둘 다 지원.**

상태기계 확장(`domain/editor.ts`): `moving`에 진행 중 드래그를 표현할 수단을 추가한다. 권장: `moving` 모드에 `targetCell?`을 유지하되, 캔버스가 "드래그 진행 중"을 자체적으로 추적하고 매 프레임 `targetCell`을 갱신(라이브 고스트). 별도 모드 추가가 필요하면 `moving`에 `dragging?: boolean` 플래그를 둔다. (정확한 형태는 구현 계획에서 확정)

제스처 정의(캔버스 `components/estate-canvas.tsx`):
- **드래그(꾹 눌러 끌기):** 이동 가능한 아이템 위에서 pointer-down → 허용오차(10px) 초과로 움직이면 카메라 팬 대신 **그 아이템의 드래그**로 전환. 매 이동마다 손가락 아래 셀을 hit-test해 `moving` + 라이브 `targetCell`로 갱신, 고스트가 따라온다. pointer-up 시 유효하면 그 자리에 커밋(`move-item`), `selected`로 복귀. 보호 본관은 드래그 불가(팬으로 처리).
- **탭-들기:** 아이템을 짧게 탭 → `selected`(하단 액션 바). 액션 바의 "이동" → `moving`(targetCell 없음). 칸을 탭하면 `targetCell` 설정(라이브 고스트), "확인"으로 커밋. moving 중에도 드래그가 동작한다.
- **건물이 손가락 위로 들림:** 드래그/이동 중 고스트 스프라이트를 손가락보다 위로 살짝 띄워(yOffset) 손에 가리지 않게.

배치(상점/인벤토리에서):
- 기존 `placing` 모드 + 같은 드래그/탭 파이프라인. pointer-down on 캔버스 → 고스트 표시 → 드래그로 위치 → 떼면 배치(유효 시), 재고가 남으면 `placing` 유지(연속 배치) 아니면 `view`.
- **상점·인벤토리 카드 → 캔버스 드래그 배치:** 카드에서 끌기 시작 → `placing` 진입 + 캔버스 고스트가 포인터를 따라옴 → 캔버스에서 떼면 배치. (HTML 드래그가 캔버스로 넘어가는 좌표 변환 포함)

시각 보조(렌더러 `isometric/renderer.ts`):
- **칸별 초록/빨강 발판:** 미리보기를 단일 다이아몬드 대신 `getRenderFootprintCells(preview)`로 칸마다 `getCellDiamondPoints`를 그려 valid=초록 / invalid=빨강으로 채운다. (헬퍼 전부 존재)
- **격자 오버레이:** placing/moving 중에만, 해당 구역(unlocked 셀)에 옅은 셀 외곽선을 그린다(`drawBuildGrid` 신설, `scene`에 표시 플래그 추가).
- **스냅/배치 펄스:** 커밋 시 가벼운 스케일/알파 펄스(기존 rAF 애니메이션 패턴 재사용).
- **모바일 호버 수정:** placing/moving일 때 `handleTouchMove`가 무조건 팬하지 않고 손가락 셀을 hit-test해 `hoverCell`/드래그 타겟을 갱신.

### 4.3 C — 건물 탭 → 통합 정보 패널 (멤버 패널·레벨 카드 대체)

- 배치: **하단 시트(모바일) / 우측 도크 카드(데스크탑)**, 기존 인벤토리 도크와 동일한 도킹 패턴으로 상단과 안 겹침.
- 본관 탭 → 통합 패널: 히어로(스프라이트 + 이름 + 레벨 배지) · 업그레이드 행(다음 레벨·비용·버튼, 최대 레벨 시 비활성) · 에코 생산/수확 행 · **팀 기여 랭킹**(내 기여 `is_me` 강조, 깔끔한 카드 리스트로 `EstateMemberPanel` 리디자인).
- 발전/일반 아이템 탭 → 같은 패널 패턴: 헤더(이름·풋프린트) + 액션(이동/회전/보관) + (발전이면) 생산율·수확.
- 컴포넌트 경계: `EstateBuildingPanel`(신설, 프레젠테이션) — `selected` 대상의 종류(본관/발전/일반)에 따라 섹션을 구성. `EstateMemberPanel`은 이 패널의 "기여 랭킹" 섹션으로 흡수·리디자인. 기존 `EstateBuildingCard`는 패널의 업그레이드 섹션으로 흡수 후 제거.

### 4.4 D — 수확 버블 (자원 수집)

- 발전 아이템·본관 위에 누적 에코가 임계 이상이면 **수확 버블**(작은 떠오르는 칩)을 캔버스에 그린다. 탭하면 해당 생산분(또는 전체)을 수집하고 펄스/토스트.
- 기존 상단 새싹 칩(`handleCollectEco`)은 **"전체 수확" 보조**로 유지.
- 버블 위치는 풋프린트 앵커(`action-anchor.ts`의 풋프린트 바운즈) 기준 화면 좌표로 계산. 수집 판정은 버블의 화면 히트박스 또는 해당 아이템 탭으로 처리.
- 구현 메모: 현재 에코는 영지 전체 단위로 누적(`domain/eco-credit.ts`)되어 "건물별 분배"가 없다. 버블은 시각 연출 + "탭하면 전체 collect" 트리거로 시작하고, 건물별 분배 누적이 필요하면 후속 과제로 둔다(비목표 경계 유지).

### 4.5 E — 검증 전략

- 도메인/렌더러/제스처는 단위 테스트(Vitest + jsdom). 신규: 칸별 발판 렌더(`isometric-renderer-*`), 드래그→커밋 제스처(`estate-canvas.test.tsx`), 통합 패널(`estate-building-panel.test.tsx`), 수확 버블 히트.
- 기존 보장 유지: 전체 Vitest green, `npx eslint` 0 errors(기존 `game-preview.tsx` 경고 2 허용), `npm run build` 통과.
- **도구 제약(기존):** 영지 풀블리드 캔버스 라우트는 프리뷰 스크린샷이 멈춘다 → 픽셀 캡처 대신 렌더러/제스처 단위 테스트 + 빌드로 검증하고, 실제 느낌(드래그·버블·패널)은 사용자 dev 서버 확인 몫.

## 5. 영향 받는 파일 (개요)

**수정**
- `domain/editor.ts` — 이동/드래그 상태 표현 보강.
- `components/estate-canvas.tsx` — 드래그-투-무브/탭-들기 제스처, placing/moving 탭 허용오차, 모바일 호버, 상점 드래그 드롭 좌표, 수확 버블 히트.
- `components/estate-game-client.tsx` — HUD 정리(건물 카드 제거), 토스트 위치, 통합 패널 배선, 편집 액션 바 배선, 모드 상호배타.
- `isometric/renderer.ts` — 칸별 초록/빨강 발판, 격자 오버레이, 스냅 펄스, 수확 버블 그리기.
- `isometric/render-order.ts` / `projection.ts` — 필요한 헬퍼 노출(대부분 존재).
- `components/estate-member-panel.tsx` — 통합 패널의 기여 랭킹 섹션으로 리디자인.
- `components/estate-shop-client.tsx` — 카드 → 캔버스 드래그 시작.
- `components/estate-shell.module.css` — 하단 도크/시트·액션 바·버블·발판 스타일, 떠다니는 클러스터 스타일 제거.
- i18n `ko.ts`/`en.ts` — 신규 키(액션 바/패널/버블 라벨), 대칭 유지.

**신설**
- `components/estate-building-panel.tsx` (+ 테스트) — 통합 건물 정보/기능 패널.
- `components/estate-edit-action-bar.tsx` (+ 테스트) — 편집(placing/moving) 하단 고정 액션 바.
- 필요 시 `isometric/harvest-bubble.ts` — 버블 화면 좌표/히트 헬퍼.

**제거**
- `components/estate-building-card.tsx`(패널로 흡수), `components/contextual-item-actions.tsx`(액션 바/드래그로 대체) — 참조 정리 후 삭제.

## 6. 엣지 케이스 / 에러 처리

- 드래그 중 유효하지 않은 칸에서 떼면: 커밋하지 않고 `moving` 유지(또는 원위치 복귀) + 빨강 발판 유지.
- 보호 본관: 드래그/이동/보관 불가 — 드래그 제스처는 팬으로 폴백, 탭은 정보 패널.
- 작은 화면/가장자리: 모든 컨트롤이 하단 도킹이라 상단 HUD/지도 컨트롤과 겹치지 않음.
- 동시 저장 충돌(`conflict`): 기존 낙관적 동시성 로직 유지(서버 스냅샷 리로드).
- 모드 전환: placing/moving 진입 시 인벤토리 시트/건물 패널 닫기(상호배타).
- 접근성: 모든 액션 버튼 `aria-label`, 키보드 단축키(Esc/R/F/Delete) 유지, 라이브 영역 유지.

## 7. 미해결 질문 (해소됨)

- 이동 제스처: **드래그 + 탭-들기 둘 다** (확정).
- 건물 패널 위치: **하단 시트/우측 도크** (추천 채택, 확정).
- 범위: A·B·C·D + 상점→캔버스 드래그 (전부 포함, 확정). 새 건물/아이템 종류는 제외 (확정).
