# `hwankr/cems` 건물 영지 시스템 구현용 단계별 프롬프트

이 문서는 `hwankr/cems` 저장소에 다음 흐름을 실제로 추가하기 위한 코딩 에이전트용 프롬프트 모음이다.

> 캠퍼스 Mapbox 화면 → 건물 선택 → 해당 건물의 독립 영지로 이동 → 건물 구성원들의 에너지 절감 포인트로 영지를 꾸미고 확장

구현시에는 모바일 반응성도 항상 고려해줘.

---

## 1. 확정된 제품 요구사항

1. **Mapbox는 캠퍼스 탐색 및 건물 선택 UI다.**
    - Mapbox 위에서 영지를 직접 꾸미지 않는다.
    - 기존 관리자용 에너지 진단 기능은 깨뜨리지 않는다.
    - 참여자용 영지 지도에서는 건물을 클릭하면 해당 건물 영지로 직접 이동한다.

2. **영지는 Mapbox와 분리된 독립 게임 화면이다.**
    - URL 예시: `/ko/subjects/yu-e21/estate`
    - 영지 화면은 Mapbox를 import하지 않는다.
    - 고정 사선 시점의 **2.5D 아이소메트릭 Canvas**로 구현한다.
    - 평면 정사각형 격자나 단순 CSS 기울이기가 아니라, 2:1 다이아몬드 타일과 높이감 있는 오브젝트를 사용한다.

3. **영지는 건물별로 독립적이다.**
    - 상태 저장 키는 반드시 `subjectId` 기준이다.
    - IT관에서 배치한 물건은 다른 건물 영지에 나타나면 안 된다.

4. **포인트의 원천은 에너지 절감이다.**
    - 장식물이 자동으로 포인트를 생산하지 않는다.
    - `earnedPoints`는 검증된 절감 결과로부터 온다.
    - 구매·확장으로 사용한 값은 `spentPoints`다.
    - 화면 잔액은 `availablePoints = max(0, earnedPoints - spentPoints)`로 계산한다.
    - 클라이언트가 임의로 `earnedPoints`를 증가시키는 기능을 만들지 않는다.

5. **초기 MVP는 로컬 저장으로 동작하되 서버 전환이 쉬워야 한다.**
    - 현재 저장소에는 실 API·DB·인증이 없으므로 우선 `localStorage` 어댑터를 사용한다.
    - UI와 도메인 코드는 저장 방식에 직접 의존하지 않고 `EstateRepository` 인터페이스를 거친다.

6. **그래픽은 독창적으로 만든다.**
    - 클래시 오브 클랜·쿠키런 킹덤의 시점과 가독성만 참고한다.
    - 해당 게임의 캐릭터, 건물, UI, 텍스처를 복제하지 않는다.
    - 초기 자산은 동일한 조명 방향과 원근을 가진 자체 SVG/PNG/WebP로 구성한다.

---

## 2. 목표 구조

```text
src/app/[locale]/estates/page.tsx
  └─ 참여자용 Mapbox 영지 선택 허브

src/app/[locale]/subjects/[subjectId]/estate/page.tsx
  └─ Server Component: locale/subject 검증, 초기 데이터 구성
      └─ EstateGameClient
          ├─ Estate HUD
          ├─ Shop / Inventory / Expansion UI
          └─ EstateCanvas
              ├─ isometric projection
              ├─ renderer
              ├─ pointer hit testing
              └─ camera pan/zoom

src/features/estate/
  ├─ components/
  ├─ data/
  ├─ domain/
  ├─ isometric/
  ├─ persistence/
  └─ __tests__/
```

권장 상세 파일 구조:

```text
src/features/estate/
  components/
    estate-game-client.tsx
    estate-canvas.tsx
    estate-header.tsx
    estate-toolbar.tsx
    estate-shop-panel.tsx
    estate-inventory-panel.tsx
    estate-selection-panel.tsx
    expansion-confirm-dialog.tsx
    estate-loading-state.tsx
    estate-error-state.tsx

  data/
    estate-item-catalog.ts
    estate-expansion-catalog.ts
    demo-estate-data.ts
    estate-asset-manifest.ts

  domain/
    types.ts
    point-account.ts
    placement.ts
    expansion.ts
    inventory.ts
    commands.ts
    reducer.ts
    serialization.ts

  isometric/
    projection.ts
    camera.ts
    hit-testing.ts
    render-order.ts
    asset-loader.ts
    renderer.ts

  persistence/
    estate-repository.ts
    local-storage-estate-repository.ts
    memory-estate-repository.ts

  __tests__/
    point-account.test.ts
    placement.test.ts
    expansion.test.ts
    inventory.test.ts
    serialization.test.ts
    projection.test.ts
    hit-testing.test.ts
    estate-route-data.test.ts
    estate-repository.test.ts
```
