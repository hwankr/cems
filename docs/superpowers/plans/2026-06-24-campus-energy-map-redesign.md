# 캠퍼스 에너지 맵 리디자인 (몰입형 전체화면)

**날짜:** 2026-06-24
**브랜치:** `feat/campus-energy-map-redesign`
**근거 디자인:** claude.ai design 프로젝트 "Mapbox 전체화면 레이아웃" (`캠퍼스 에너지 맵.dc.html`)

## 목표

관리자(admin) 화면을 **전체화면 몰입형 지도 + 떠 있는 패널** 형태로 재구성한다.
디자인의 원형 마커 대신 **기존 3D 돌출 건물을 그대로 유지**하고, 그 위에 디자인의 떠 있는
UI(상단 바·요약 칩·우측 컨트롤·범례·절감 순위 패널·건물 팝업)를 올린다.

## 확정된 결정 (사용자)

1. **레이아웃**: 전체화면 몰입형. admin 모드에서 앱 헤더/하단 내비를 숨기고 지도를 화면 전체로.
2. **베이스맵/테마**: 라이트·다크 모두 유지. Mapbox Standard를 `resolvedTheme`로 day/night 전환.
   떠 있는 패널은 기존 테마 토큰으로 두 테마에 자동 대응.
3. **팝업 데이터**: 디자인 그대로 전부 합성 — 시간대별 24h 차트 + 연면적 + 준공까지 표시.

## 데이터 합성 (데모 seam)

현재 실측 readings는 4개 건물뿐. 디자인처럼 보이려면 색상·히트맵·순위가 풍부해야 하므로:

- `data/demo-energy.ts`: `generateDemoEnergyReadings(subjects)` — 클릭 가능한(높이 있는 폴리곤)
  모든 건물에 **결정론적**(id 해시 기반) readings 생성. 손으로 쓴 4개(`demoEnergyReadings`)가 우선.
- `domain/building-detail.ts`: `buildBuildingDetail(subject, comparison)` 순수 함수 —
  - `hourly[24]`: 고정 기준 곡선 × 실사용량 + id 시드 변주 (새로고침에도 안정).
  - `grossFloorAreaM2`: 가능하면 **실제 폴리곤 면적 × 층수**(지오메트리 기반), 점-폴백은 합성.
  - `completionYear`: 데이터 없음 → id 해시로 1990–2020 합성.
  - 모두 결정론적 → 단위 테스트 가능.

> 실 ingestion이 생기면 generator/synthesizer만 교체하면 되는 격리된 seam으로 둔다.

## 컴포넌트 구조

**변경**
- `campus-map.tsx`: `forwardRef`로 `zoomIn/zoomOut` 노출, `showHeat`/`showLabels`/`query` props,
  건물 중심점 히트맵 레이어(실사용량 가중), 검색 시 비매칭 건물 dim(`setPaintProperty`),
  선택 건물 좌표를 화면에 투영해 `BuildingPopup` 렌더(지도 이동 시 재배치).
- `campus-energy-app.tsx` (shell): admin이면 `fixed inset-0` 몰입형(`AdminMapView`), 헤더/하단 내비 숨김.
  participant면 기존 헤더+메인+하단 내비 유지.
- `mapbox-style.ts`: 건물 색을 디자인 팔레트(절감 `#10b981`·초과 `#f43f5e`·보통 `#94a3b8`)로 정렬,
  히트맵 paint 추가.
- `i18n/messages/ko.ts` + `en.ts`: `mapView` 그룹 추가(검색·캠퍼스·요약·컨트롤·팝업·설정 문구). ko/en 키 패리티 유지.
- `data/demo-campus.ts`: `getDemoEnergyComparisons()`가 generator 병합 결과를 반환.

**신규 (프레젠테이션)**
- `admin-map-view.tsx` — 몰입형 레이아웃 컨테이너 + admin 상태(선택/검색/히트맵/라벨/패널/설정).
- `map-top-bar.tsx` — 로고 + 건물 검색 + 캠퍼스 선택.
- `map-summary-chips.tsx` — 캠퍼스 실시간 사용량 / 예측 대비 순절감.
- `map-controls.tsx` — 줌 ±, 히트맵 토글, 라벨 토글, 설정(⚙).
- `map-legend.tsx` — 절감/보통/초과 (테마 글래스).
- `building-rank-panel.tsx` — 접이식 "건물 절감 순위" (기존 `building-rank-table` 대체).
- `building-popup.tsx` — 순수 프레젠테이션(상태 바/사용량/예측 대비/24h 차트/규모·연면적·준공).
- `map-settings-popover.tsx` — 테마/언어/모드 전환을 모은 팝오버(기존 스위처 재사용).

**제거/대체**: `admin-dashboard.tsx`(2열 레이아웃)는 `admin-map-view.tsx`로 대체. participant 영향 없음.

## 앱 고유 컨트롤 배치

디자인에 없는 모드 전환·테마·언어는 우측 **⚙ 설정 팝오버**에 모은다. 모드 전환은 상단 바에도 작게 노출.
Mapbox 약관상 **저작권 표기는 유지**(작게) — 디자인처럼 완전 숨기지 않는다.

## 검증

- 단위: `building-detail`(합성 결정성/면적), 갱신된 `campus-map.test.tsx`(heat/labels/popup/forwardRef),
  `messages.test.ts`(ko/en 패리티) 통과.
- 전체: `npm run test`, `npm run lint`, `npm run build`, `git diff --check`.
- 브라우저 프리뷰: 라이트/다크 각각 — 건물 클릭→팝업, 검색 dim, 히트맵/라벨 토글, 순위 패널, 설정 팝오버.
