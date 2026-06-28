# 리그 수상 시스템 — Plan C: 영지 우승자 휘장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Depends on Plan A** (`2026-06-28-league-awards-core-and-hall-of-fame.md`): `leagues/domain/types.ts`(`AwardTier`/`SubjectAwardTiers`), `leagues/data/leagues-dal.ts`(`getSubjectAwardTiers`), 그리고 적용된 `league_awards` 테이블 + 확정된 데모 리그(student-services=gold, 건물 `yu-b04`)가 있어야 한다.

**Goal:** 리그에서 수상한 그룹이 자기 영지에 **우승자 휘장**(금·은·동) 아이템을 배치할 수 있게 한다. 휘장은 구매가 아니라 **수여**(0포인트, 수상 그룹만)되며, 무단 배치는 서버(`save_estate`)가 차단한다.

**Architecture:** 휘장은 일반 영지 아이템과 같은 스프라이트/배치 시스템을 쓰되, **상점 카탈로그(`estateItemCatalog`)에는 넣지 않는다**(별도 `awardEmblemDefinitions`). 영지 페이지가 `getSubjectAwardTiers()`로 그 건물 소유 그룹의 티어를 조회해 `EstatePageData.grantedEmblemDefinitionId`로 내려보낸다. `EstateGameClient`는 수여된 휘장 정의를 아이템 정의 목록에 합치고, 로드 시 인벤토리에 수량 1을 주입(이미 배치/보유면 생략)해 기존 인벤토리→배치 흐름으로 놓을 수 있게 한다. 권위 게이팅은 `save_estate` RPC에 "배치된 `award-emblem-<tier>`는 소유 그룹이 그 티어 팀상을 보유해야 함" 검사를 추가해 닫는다. 휘장 PNG는 사용자가 이미지 AI로 생성(프롬프트 포함).

**Tech Stack:** Next.js 16(서버 컴포넌트), React 19, TypeScript, Supabase(SECURITY DEFINER RPC), HTML Canvas 아이소메트릭 렌더러, Vitest + jsdom.

## Global Constraints

- 휘장은 **상점 비노출**(구매 불가) — `estateItemCatalog`에 추가하지 않는다. 별도 `awardEmblemDefinitions`(cost 0).
- 수여 판정은 클라이언트(노출)와 서버(`save_estate` 게이팅) **양쪽**. 서버가 최종 권위.
- 기존 영지 경제/배치/저장 로직은 보존한다. 휘장은 cost 0이라 거래(transaction)를 만들지 않으며 그룹 풀 지출에 영향 없음.
- 한국어 우선. `estate.items`는 **정의 id(kebab) → 이름 문자열** 레코드다(`getItemName`은 `copy.items[definition.id]` 사용). ko/en 양쪽에 추가.
- 신규 비트맵(휘장 3종 PNG)은 사용자가 생성한다(Task 2의 프롬프트). 매니페스트 src는 `/estate-assets/award-emblem-<tier>.png`, 저작 해상도는 logical의 정확히 2배.
- Next.js 코드 작성 전 `AGENTS.md`에 따라 관련 로컬 문서 확인. Supabase 적용은 MCP, 적용 SQL은 `docs/superpowers/migrations/`에 기록.
- 검증 베이스라인: `npm run lint` errors 0(기존 `game-preview.tsx` 경고 2개), `npm run test`/`npm run build` 통과. 영지 풀블리드 캔버스는 프리뷰 스크린샷이 멈추는 기존 제약 → 시각 확인은 사용자 몫, 검증은 테스트·빌드·DB 프로브.

## File Structure

**Create:**
- `src/features/estate/domain/award-emblem.ts` — 휘장 정의·id 헬퍼·`applyEmblemGrant`(순수).
- `src/features/estate/__tests__/award-emblem.test.ts` — 도메인 테스트.
- `docs/superpowers/migrations/2026-06-28-league-awards-save-estate-emblem-gating.sql` — 기록.
- `public/estate-assets/award-emblem-{gold,silver,bronze}.png` — 사용자 생성 에셋.

**Modify:**
- `src/features/estate/data/estate-asset-manifest.ts` — 휘장 3 스프라이트 + `requiredEstateSpriteAssetIds`.
- `src/features/estate/__tests__/asset-manifest.test.ts` — 휘장 에셋 검사.
- `src/i18n/messages/ko.ts`·`en.ts` — `estate.items` 휘장 이름.
- `src/features/estate/data/get-estate-page-data.ts` — `grantedEmblemDefinitionId` + dep.
- `src/app/[locale]/subjects/[subjectId]/estate/page.tsx` — dep 주입(`getSubjectAwardTiers`).
- `src/features/estate/components/estate-game-client.tsx` — 휘장 정의 합치기 + 인벤토리 패널 prop + 로드 시 수여 주입.

---

## Task 1: 휘장 도메인 — 정의 + 수여 헬퍼 (순수, TDD)

**Files:**
- Create: `src/features/estate/domain/award-emblem.ts`
- Test: `src/features/estate/__tests__/award-emblem.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/estate/__tests__/award-emblem.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  applyEmblemGrant,
  awardEmblemDefinitionById,
  awardEmblemDefinitionId,
  awardEmblemDefinitions,
} from "../domain/award-emblem";
import { createDemoEstateSeedSnapshot } from "../data/demo-estate-data";

describe("award emblem definitions", () => {
  it("derives the definition id from a tier", () => {
    expect(awardEmblemDefinitionId("gold")).toBe("award-emblem-gold");
    expect(awardEmblemDefinitionId("silver")).toBe("award-emblem-silver");
    expect(awardEmblemDefinitionId("bronze")).toBe("award-emblem-bronze");
  });

  it("exposes one zero-cost definition per tier", () => {
    expect(awardEmblemDefinitions).toHaveLength(3);
    for (const def of awardEmblemDefinitions) {
      expect(def.cost).toBe(0);
      expect(def.id).toMatch(/^award-emblem-(gold|silver|bronze)$/);
      expect(def.assetId).toBe(def.id);
    }
  });

  it("looks up a definition by id, or null", () => {
    expect(awardEmblemDefinitionById("award-emblem-gold")?.id).toBe(
      "award-emblem-gold",
    );
    expect(awardEmblemDefinitionById("nope")).toBeNull();
  });
});

describe("applyEmblemGrant", () => {
  const base = createDemoEstateSeedSnapshot("yu-b04");

  it("returns the snapshot unchanged when nothing is granted", () => {
    expect(applyEmblemGrant(base, null)).toBe(base);
  });

  it("injects one emblem into inventory when granted and not owned/placed", () => {
    const next = applyEmblemGrant(base, "award-emblem-gold");
    const entry = next.inventory.find(
      (e) => e.definitionId === "award-emblem-gold",
    );
    expect(entry?.quantity).toBe(1);
  });

  it("does not duplicate when already in inventory", () => {
    const withEmblem = {
      ...base,
      inventory: [{ definitionId: "award-emblem-gold", quantity: 1 }],
    };
    const next = applyEmblemGrant(withEmblem, "award-emblem-gold");
    const total = next.inventory
      .filter((e) => e.definitionId === "award-emblem-gold")
      .reduce((sum, e) => sum + e.quantity, 0);
    expect(total).toBe(1);
  });

  it("does not re-grant when the emblem is already placed", () => {
    const withPlaced = {
      ...base,
      items: [
        ...base.items,
        {
          id: "placed-emblem",
          definitionId: "award-emblem-gold",
          x: 10,
          y: 10,
          rotation: 0 as const,
          placedAt: "2026-05-15T00:00:00.000Z",
        },
      ],
    };
    const next = applyEmblemGrant(withPlaced, "award-emblem-gold");
    expect(
      next.inventory.find((e) => e.definitionId === "award-emblem-gold"),
    ).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/estate/__tests__/award-emblem.test.ts`
Expected: FAIL — `Cannot find module '../domain/award-emblem'`.

- [ ] **Step 3: Write the implementation**

Create `src/features/estate/domain/award-emblem.ts`:

```ts
import type { AwardTier } from "@/features/leagues/domain/types";
import { getInventoryQuantity, increaseInventory } from "./inventory";
import type { EstateItemDefinition, EstateSnapshot } from "./types";

export const AWARD_EMBLEM_PREFIX = "award-emblem-";

export function awardEmblemDefinitionId(tier: AwardTier): string {
  return `${AWARD_EMBLEM_PREFIX}${tier}`;
}

function emblemDefinition(tier: AwardTier): EstateItemDefinition {
  const id = awardEmblemDefinitionId(tier);
  return {
    id,
    nameKey: id,
    descriptionKey: id,
    category: "landmark",
    cost: 0,
    footprintWidth: 1,
    footprintHeight: 1,
    canRotate: false,
    assetId: id,
    placementRule: "land",
  };
}

export const awardEmblemDefinitions: readonly EstateItemDefinition[] = [
  emblemDefinition("gold"),
  emblemDefinition("silver"),
  emblemDefinition("bronze"),
];

export function awardEmblemDefinitionById(
  definitionId: string,
): EstateItemDefinition | null {
  return (
    awardEmblemDefinitions.find((def) => def.id === definitionId) ?? null
  );
}

/**
 * If a winner emblem is granted and the estate neither already owns (inventory)
 * nor has placed it, inject exactly one into inventory so it can be placed
 * through the normal inventory → place flow. Otherwise returns the snapshot
 * unchanged (referentially equal when nothing is granted).
 */
export function applyEmblemGrant(
  snapshot: EstateSnapshot,
  grantedDefinitionId: string | null,
): EstateSnapshot {
  if (!grantedDefinitionId) return snapshot;

  const placed = snapshot.items.some(
    (item) => item.definitionId === grantedDefinitionId,
  );
  const owned =
    getInventoryQuantity(snapshot.inventory, grantedDefinitionId) > 0;
  if (placed || owned) return snapshot;

  return {
    ...snapshot,
    inventory: increaseInventory(snapshot.inventory, grantedDefinitionId, 1),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/estate/__tests__/award-emblem.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/estate/domain/award-emblem.ts src/features/estate/__tests__/award-emblem.test.ts
git commit -m "feat(estate): add winner emblem definitions and grant helper"
```

---

## Task 2: 에셋 매니페스트 + 휘장 스프라이트 + i18n (생성 프롬프트 포함)

**Files:**
- Modify: `src/features/estate/data/estate-asset-manifest.ts`
- Modify: `src/features/estate/__tests__/asset-manifest.test.ts`
- Modify: `src/i18n/messages/ko.ts`, `src/i18n/messages/en.ts`
- Add (user-generated): `public/estate-assets/award-emblem-{gold,silver,bronze}.png`

- [ ] **Step 1: Generate the 3 emblem PNGs (USER STEP)**

사용자가 이미지 AI로 생성한다. 공통 스타일 블록 + 티어별:

- 공통: `"Isometric 2:1 dimetric game asset, single ceremonial monument centered on a fully transparent background, painted to match a warm cream-stone-and-gold campus building set (ivory/cream stone pedestal, polished gold/brass accents, emerald banner cloth, glowing trim), soft studio lighting, gentle ambient occlusion, crisp clean edges, no baked ground shadow, no text watermark, high detail, PNG with alpha."`
- gold: `"+ A FIRST-PLACE winner's standard: a tall banner on a cream-stone pedestal topped by a large laurel-wreathed GOLDEN crest/medallion emitting a soft golden glow, a single star on the crest, rich emerald banner cloth with gold trim."`
- silver: `"+ A SECOND-PLACE winner's standard: the same pedestal and banner, a laurel-wreathed SILVER/platinum crest with a cool silver glow, a single star, slate-blue banner cloth with silver trim."`
- bronze: `"+ A THIRD-PLACE winner's standard: the same pedestal and banner, a laurel-wreathed BRONZE/copper crest with a warm bronze sheen, a single star, deep-green banner cloth with bronze trim."`

저장: `public/estate-assets/award-emblem-gold.png`, `…-silver.png`, `…-bronze.png`. 권장 저작 해상도 248×344(=logical 124×172의 2배), 다이아몬드 바닥 없이 단일 오브젝트. 생성 후 구현자가 sharp로 trim/팔레트 최적화(기존 상점 PNG 워크플로우와 동일)하고 정확한 dims를 매니페스트에 반영. **에셋이 없으면** 매니페스트 `fallback`(아래)으로 절차적 렌더되어 빌드·테스트는 통과한다(시각만 임시).

- [ ] **Step 2: Add the manifest entries**

In `src/features/estate/data/estate-asset-manifest.ts`, add three emblem ids to `requiredEstateSpriteAssetIds` (after `"campus-flag"`):

```ts
  "award-emblem-gold",
  "award-emblem-silver",
  "award-emblem-bronze",
```

Then add three sprite entries inside the `items: { … }` object (e.g., after the `"campus-flag"` entry). Each uses the `sprite()` helper (bottom-center anchor auto-set) with a fallback so it renders even before the PNG lands:

```ts
    "award-emblem-gold": sprite(
      "award-emblem-gold",
      "/estate-assets/award-emblem-gold.png",
      124,
      172,
      {
        renderLayer: 2,
        shadow: smallShadow,
        fallback: {
          kind: "decor",
          height: 70,
          renderLayer: 2,
          fill: "#f5c518",
          accent: "#a07a00",
          shadow: "#3a2c00",
        },
      },
    ),
    "award-emblem-silver": sprite(
      "award-emblem-silver",
      "/estate-assets/award-emblem-silver.png",
      124,
      172,
      {
        renderLayer: 2,
        shadow: smallShadow,
        fallback: {
          kind: "decor",
          height: 70,
          renderLayer: 2,
          fill: "#c3cad3",
          accent: "#5b6470",
          shadow: "#2b3138",
        },
      },
    ),
    "award-emblem-bronze": sprite(
      "award-emblem-bronze",
      "/estate-assets/award-emblem-bronze.png",
      124,
      172,
      {
        renderLayer: 2,
        shadow: smallShadow,
        fallback: {
          kind: "decor",
          height: 70,
          renderLayer: 2,
          fill: "#cd7f32",
          accent: "#8a5320",
          shadow: "#3a2410",
        },
      },
    ),
```

(`sprite` and `smallShadow` are already defined in this file. The asset `src` uses `.png`; the manifest test regex already allows `.svg|.png`.)

- [ ] **Step 3: Add an asset-manifest test for the emblems**

In `src/features/estate/__tests__/asset-manifest.test.ts`, add the import and a test:

```ts
import { awardEmblemDefinitions } from "../domain/award-emblem";

// …inside describe("estate asset manifest", () => { … }) add:

  it("defines a render asset for every award emblem", () => {
    for (const def of awardEmblemDefinitions) {
      const asset = estateAssetManifest.items[def.assetId];
      expect(asset).toBeDefined();
      expect(asset.src).toMatch(/^\/estate-assets\/award-emblem-.+\.png$/);
      expect(asset.anchorX).toBe(asset.logicalWidth / 2);
    }
  });
```

- [ ] **Step 4: Add the i18n names**

In `src/i18n/messages/ko.ts`, inside `estate.items` (the record keyed by definition id), add:

```ts
      "award-emblem-gold": "금 우승 휘장",
      "award-emblem-silver": "은 우승 휘장",
      "award-emblem-bronze": "동 우승 휘장",
```

In `src/i18n/messages/en.ts`, inside `estate.items`, add:

```ts
      "award-emblem-gold": "Gold Winner's Emblem",
      "award-emblem-silver": "Silver Winner's Emblem",
      "award-emblem-bronze": "Bronze Winner's Emblem",
```

> NOTE: `getItemName` reads `messages.estate.items[definition.id]` (id → name string). If `estate.items` also has a parallel description record consumed by the shop, the emblems are not in the shop catalog so no description entry is required; if the type demands symmetric description keys, add the same three keys to that record too with the same strings.

- [ ] **Step 5: Run tests + type-check**

Run: `npx vitest run src/features/estate/__tests__/asset-manifest.test.ts`
Expected: PASS (existing + new emblem test).

Run: `npx tsc --noEmit`
Expected: no new errors (the new `estate.items` keys are part of the `Messages` type via `koMessages`).

- [ ] **Step 6: Commit**

```bash
git add src/features/estate/data/estate-asset-manifest.ts src/features/estate/__tests__/asset-manifest.test.ts src/i18n/messages/ko.ts src/i18n/messages/en.ts public/estate-assets/award-emblem-gold.png public/estate-assets/award-emblem-silver.png public/estate-assets/award-emblem-bronze.png
git commit -m "feat(estate): add winner emblem sprites, manifest entries, and names"
```

(If the PNGs are not yet generated, commit the manifest/i18n/test changes alone — the procedural fallback keeps the build green — and add the PNGs in a follow-up commit.)

---

## Task 3: 영지 페이지 데이터 — 수여 티어 해석

**Files:**
- Modify: `src/features/estate/data/get-estate-page-data.ts`
- Modify: `src/app/[locale]/subjects/[subjectId]/estate/page.tsx`

- [ ] **Step 1: Extend EstatePageData + deps**

In `src/features/estate/data/get-estate-page-data.ts`:

Add imports:

```ts
import type { AwardTier } from "@/features/leagues/domain/types";
import { awardEmblemDefinitionId } from "@/features/estate/domain/award-emblem";
```

Add to `EstatePageData`:

```ts
  grantedEmblemDefinitionId: string | null;
```

Add to `EstatePageDataDeps`:

```ts
  getSubjectAwardTier: (subjectId: string) => Promise<AwardTier | null>;
```

In `getEstatePageData`, after `ownerGroupId`/`earnedPoints` are computed (before the `return`), resolve the tier and emblem:

```ts
  const awardTier = await deps.getSubjectAwardTier(subjectId);
  const grantedEmblemDefinitionId = awardTier
    ? awardEmblemDefinitionId(awardTier)
    : null;
```

Add it to the returned object:

```ts
  return {
    school: { /* unchanged */ },
    subject: { /* unchanged */ },
    comparison,
    pointAccount: calculateEstatePointAccount(earnedPoints, []),
    initialSnapshot: createDemoEstateSeedSnapshot(subjectId),
    ownerGroupId,
    grantedEmblemDefinitionId,
  };
```

- [ ] **Step 2: Inject the dep from the page**

In `src/app/[locale]/subjects/[subjectId]/estate/page.tsx`:

Add the import:

```ts
import { getSubjectAwardTiers } from "@/features/leagues/data/leagues-dal";
```

Update the `getEstatePageData` deps to include `getSubjectAwardTier`:

```ts
  const data = await getEstatePageData(locale, subjectId, {
    getProfileGroupId: async () => profile.groupId,
    getGroupEarnedPoints: async (groupId) =>
      (await getGroupPointPool(groupId)).earnedPoints,
    getSubjectAwardTier: async (sid) =>
      (await getSubjectAwardTiers())[sid]?.tier ?? null,
  });
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/estate/data/get-estate-page-data.ts src/app/[locale]/subjects/[subjectId]/estate/page.tsx
git commit -m "feat(estate): resolve the granted winner emblem for the estate's owning group"
```

---

## Task 4: 영지 클라이언트 — 수여 휘장 노출 + 배치

`EstateGameClient`가 수여된 휘장 정의를 아이템 정의 목록에 합치고, 인벤토리 패널이 그 정의를 해석하게 하며, 로드 시 인벤토리에 수량 1을 주입한다.

**Files:**
- Modify: `src/features/estate/components/estate-game-client.tsx`

- [ ] **Step 1: Import the emblem helpers**

In `src/features/estate/components/estate-game-client.tsx`, add to the imports:

```ts
import {
  applyEmblemGrant,
  awardEmblemDefinitionById,
} from "../domain/award-emblem";
```

- [ ] **Step 2: Make item-definition lists include the granted emblem**

Replace the two module-level consts:

```ts
const itemDefinitions = estateItemCatalog;
const allItemDefinitions = [baseEstateBuildingDefinition, ...estateItemCatalog];
```

with component-scoped memoized values. Inside `EstateGameClient`, near the top of the component body (after `const copy = messages.estate;`), add:

```ts
  const grantedEmblemDefinition = useMemo(
    () =>
      data.grantedEmblemDefinitionId
        ? awardEmblemDefinitionById(data.grantedEmblemDefinitionId)
        : null,
    [data.grantedEmblemDefinitionId],
  );
  const itemDefinitions = useMemo(
    () =>
      grantedEmblemDefinition
        ? [...estateItemCatalog, grantedEmblemDefinition]
        : [...estateItemCatalog],
    [grantedEmblemDefinition],
  );
  const allItemDefinitions = useMemo(
    () => [baseEstateBuildingDefinition, ...itemDefinitions],
    [itemDefinitions],
  );
```

Then update every reference that used the old module consts so they use these in-scope values. They are already referenced by name (`itemDefinitions`, `allItemDefinitions`) inside the component, so the in-scope `const`s shadow correctly — **but** `createCommandContext` and the handlers are `useCallback`s: add `itemDefinitions`/`allItemDefinitions` to their dependency arrays where referenced:
  - `createCommandContext` deps: add `itemDefinitions`.
  - `rotateActiveItem`, `removeSelectedItem` deps: add `allItemDefinitions`.
  - `handleStartInventoryAction`, `handleRotatePlacing` reference `itemDefinitions` (these are plain functions, not memoized — no dep array needed).
  - `selectedDefinition` is computed inline each render from `allItemDefinitions` — fine.

(`InventoryPanel` currently reads the module const; Step 4 passes it as a prop instead.)

- [ ] **Step 3: Apply the grant when a snapshot loads**

In the load `useEffect`, the `.then((result) => { … })` callback sets the snapshot. Wrap the effective snapshot with `applyEmblemGrant`. Replace the block:

```ts
        if (result.snapshot) {
          snapshotRef.current = result.snapshot;
          setSnapshot(result.snapshot);
        }
```

with:

```ts
        const loaded = result.snapshot ?? snapshotRef.current;
        const granted = applyEmblemGrant(loaded, data.grantedEmblemDefinitionId);
        snapshotRef.current = granted;
        setSnapshot(granted);
```

Add `data.grantedEmblemDefinitionId` to that `useEffect`'s dependency array (alongside `data.initialSnapshot`, `data.subject.id`, …).

(When the server has no row, `loaded` is the already-set `data.initialSnapshot`; the grant injects the emblem into the working snapshot. The emblem persists only once the player edits/saves; on every load it is re-derived, so exactly one unplaced emblem is always available.)

- [ ] **Step 4: Pass `itemDefinitions` into `InventoryPanel`**

Update the `<InventoryPanel … />` usage to pass the in-scope definitions:

```tsx
          <InventoryPanel
            copy={copy}
            snapshot={snapshot}
            itemDefinitions={itemDefinitions}
            onUseItem={handleStartInventoryAction}
          />
```

Update the `InventoryPanel` function signature + the lookup. Change its props and the `findEstateItemDefinition` call:

```tsx
function InventoryPanel({
  copy,
  snapshot,
  itemDefinitions,
  onUseItem,
}: {
  copy: EstateMessages;
  snapshot: EstateSnapshot;
  itemDefinitions: readonly EstateItemDefinition[];
  onUseItem: (definitionId: string) => void;
}) {
  const entries = snapshot.inventory
    .map((entry) => ({
      ...entry,
      definition: findEstateItemDefinition(itemDefinitions, entry.definitionId),
    }))
    // …rest unchanged…
```

(`EstateItemDefinition` is already imported in this file.)

- [ ] **Step 5: Type-check + lint**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npm run lint`
Expected: 0 errors (2 pre-existing `game-preview.tsx` warnings). Watch for exhaustive-deps warnings on the updated `useCallback`/`useEffect` arrays — add the dependencies noted in Step 2/3 to clear them.

- [ ] **Step 6: Commit**

```bash
git add src/features/estate/components/estate-game-client.tsx
git commit -m "feat(estate): grant and place the winner emblem in awarded group estates"
```

---

## Task 5: DB — `save_estate` 휘장 게이팅

배치된 `award-emblem-<tier>`는 소유 그룹이 그 티어 팀상을 보유할 때만 저장되게 한다. `save_estate`를 `create or replace`로 갱신(기존 로직 유지 + 검사 1블록 추가).

**Files:**
- Create: `docs/superpowers/migrations/2026-06-28-league-awards-save-estate-emblem-gating.sql`

- [ ] **Step 1: Write the migration SQL**

Create `docs/superpowers/migrations/2026-06-28-league-awards-save-estate-emblem-gating.sql` (this reproduces the current `save_estate` body and adds the emblem-gating loop; `league_awards` must exist — Plan A):

```sql
-- Add winner-emblem gating to save_estate (applied to zvuqmagfpdyrrzyjntue, 2026-06-28).
-- A placed 'award-emblem-<tier>' item is only allowed if the estate's owning
-- group actually holds that tier's team award in some finalized league. Closes
-- the cosmetic cheat for emblems specifically (other items' cost legality stays
-- a documented MVP limitation). Body is otherwise identical to the
-- harden_economy_server_authoritative version.
create or replace function public.save_estate(
  p_subject_id text,
  p_snapshot jsonb,
  p_expected_version int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_group text;
  v_owner text;
  v_current_version int;
  v_spend numeric := 0;
  v_pool int;
  tx jsonb;
  v_delta numeric;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select group_id into v_group from public.profiles where id = v_user;
  if v_group is null then raise exception 'no profile'; end if;

  select owner_group_id into v_owner from public.estate_subjects where subject_id = p_subject_id;
  v_owner := coalesce(v_owner, v_group);
  if v_owner <> v_group then
    raise exception 'subject % is owned by another group', p_subject_id;
  end if;

  if (p_snapshot->>'subjectId') is distinct from p_subject_id then
    raise exception 'snapshot subjectId mismatch';
  end if;

  -- Winner-emblem gating: any placed award emblem requires the owning group to
  -- hold that tier's team award.
  for tx in select * from jsonb_array_elements(coalesce(p_snapshot->'items', '[]'::jsonb))
  loop
    if (tx->>'definitionId') like 'award-emblem-%' then
      if not exists (
        select 1 from public.league_awards la
        where la.award_type = 'team'
          and la.competitor_id = v_owner
          and la.tier = split_part(tx->>'definitionId', '-', 3)
      ) then
        raise exception 'estate not awarded emblem %', tx->>'definitionId';
      end if;
    end if;
  end loop;

  for tx in select * from jsonb_array_elements(coalesce(p_snapshot->'transactions', '[]'::jsonb))
  loop
    v_delta := (tx->>'pointDelta')::numeric;
    if v_delta > 0 then
      raise exception 'positive transaction delta not allowed';
    end if;
    v_spend := v_spend + abs(v_delta);
  end loop;

  select coalesce(sum(points), 0) into v_pool
  from public.point_events
  where user_id in (select id from public.profiles where group_id = v_owner);

  if v_spend > v_pool then
    raise exception 'estate spend % exceeds group pool %', v_spend, v_pool;
  end if;

  select version into v_current_version from public.estates where subject_id = p_subject_id;
  if v_current_version is not null
     and p_expected_version is not null
     and v_current_version <> p_expected_version then
    raise exception 'conflict: estate was modified (current %, expected %)',
      v_current_version, p_expected_version;
  end if;

  insert into public.estates (subject_id, owner_group_id, snapshot, version, updated_at)
  values (p_subject_id, v_owner, p_snapshot, 1, now())
  on conflict (subject_id) do update
    set snapshot = excluded.snapshot,
        owner_group_id = excluded.owner_group_id,
        version = public.estates.version + 1,
        updated_at = now()
  returning version into v_current_version;

  return v_current_version;
end;
$$;
revoke all on function public.save_estate(text, jsonb, int) from public;
revoke execute on function public.save_estate(text, jsonb, int) from anon;
grant execute on function public.save_estate(text, jsonb, int) to authenticated;
```

- [ ] **Step 2: Apply via the Supabase MCP**

Use `apply_migration` (name `save_estate_emblem_gating`) with the SQL above.
Expected: success.

- [ ] **Step 3: Probe the gating (negative + positive)**

Use `execute_sql` to confirm the rule (use the demo: `yu-b04` is owned by student-services = gold; `yu-c02` is humanities = silver). As a quick structural probe (no auth context in raw SQL, so assert via the league_awards table the function reads):

```sql
-- student-services holds gold → a gold emblem on yu-b04 is allowed.
select exists (
  select 1 from public.league_awards
  where award_type='team' and competitor_id='student-services' and tier='gold'
) as gold_allowed_for_student_services;
-- student-services does NOT hold silver/bronze → those emblems would be rejected.
select exists (
  select 1 from public.league_awards
  where award_type='team' and competitor_id='student-services' and tier='silver'
) as silver_allowed_for_student_services;
```

Expected: `gold_allowed_for_student_services = true`, `silver_allowed_for_student_services = false`. (Full end-to-end: a logged-in student-services member saving a `yu-b04` snapshot containing `award-emblem-gold` succeeds; the same with `award-emblem-silver` raises `estate not awarded emblem award-emblem-silver`.)

- [ ] **Step 4: Check advisors**

Use `get_advisors` (type `security`).
Expected: `save_estate` keeps its existing benign "executable by authenticated" WARN (unchanged signature). No new ERROR-level findings.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/migrations/2026-06-28-league-awards-save-estate-emblem-gating.sql
git commit -m "feat(db): gate placed winner emblems on the owning group's team award"
```

---

## Task 6: 전체 검증 (Plan C)

**Files:** none (검증만).

- [ ] **Step 1: Full Vitest**

Run: `npm run test`
Expected: all pass, including `award-emblem` (7) and the updated `asset-manifest` test.

- [ ] **Step 2: Lint + build**

Run: `npm run lint` → 0 errors (2 pre-existing warnings).
Run: `npm run build` → success.

- [ ] **Step 3: Live smoke (recommended)**

With `it@naver.com` (student-services = gold, building `yu-b04` 중앙도서관) logged in, open `/ko/subjects/yu-b04/estate`:
- 인벤토리에 "금 우승 휘장"이 수량 1로 나타난다(상점엔 없음).
- 배치 → 캔버스에 휘장이 놓이고 저장 성공(SaveChip "저장됨").
- (대조) 비수상 그룹 건물의 영지에는 휘장이 인벤토리에 없다.
- (서버 게이팅) 임의로 silver 휘장을 넣은 스냅샷 저장 시도는 `save_estate`가 거부(개발자 도구/스크립트로만 확인 가능 — 일반 UI로는 노출되지 않음).

- [ ] **Step 4: Final commit (if fixups were needed)**

```bash
git add -A
git commit -m "test: verify estate winner emblem grant and gating"
```

---

## Self-Review Notes (author)

- **Spec coverage (Plan C = P4):** 영지 우승자 휘장 — 정의/수여 헬퍼(Task 1), 에셋·매니페스트·i18n + 생성 프롬프트(Task 2), 페이지 데이터의 티어 해석(Task 3), 클라이언트 노출·배치(Task 4), 서버 게이팅(Task 5). "구매 아니라 수여(0포인트, 수상 그룹만)" + "무단 배치 차단" 충족.
- **Type consistency:** `AwardTier`는 `leagues/domain/types.ts`에서. `awardEmblemDefinitionId`/`awardEmblemDefinitionById`/`applyEmblemGrant`/`awardEmblemDefinitions`는 `estate/domain/award-emblem.ts` 단일 출처, 페이지 데이터·클라이언트가 import. 정의 id 형식 `award-emblem-<tier>`이 매니페스트 assetId·i18n 키·`save_estate`의 `split_part(...,'-',3)`·GeoJSON과 무관하게 일관. cost 0 → 거래 없음 → 그룹 풀 영향 없음.
- **No placeholders:** 모든 코드/SQL/테스트 완성. `save_estate`는 기존 본문을 그대로 재현하고 게이팅 1블록만 추가(부분 발췌 아님). 에셋 PNG는 사용자 생성이나 fallback이 있어 빌드/테스트 무중단.
- **Reuses existing systems:** 인벤토리→배치 흐름·`save_estate` RPC·sprite 매니페스트·`getItemName(copy.items[id])`를 그대로 사용. 상점 미노출(별도 `awardEmblemDefinitions`)·서버 게이팅으로 방어.
- **Documented limitations:** 휘장 외 일반 아이템 원가 정합성은 기존대로 범위 밖. 수여 주입은 매 로드 재계산(미배치 시 항상 1개) — 영구 인벤토리 누적 없음. 수상 취소(revoke) 시 이미 배치된 휘장은 다음 저장에서 `save_estate`가 막지만 자동 제거는 안 함(데모 범위 밖).
```
