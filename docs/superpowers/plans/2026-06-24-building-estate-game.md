# Building Estate Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a participant-facing flow from the campus Mapbox building selector into an independent `EnergySubject` estate where energy-saving points buy decorations and land expansion on a 2.5D isometric Canvas.

**Architecture:** Keep the existing admin Mapbox selection, focus, and popup behavior unchanged. Add a separate participant estate map route for building-to-estate navigation, then keep the actual estate route Mapbox-free with a Server Component that validates locale/subject and a Client Component that owns localStorage persistence, Canvas rendering, shop, inventory, placement, and expansion state. Store estate progress behind an `EstateRepository` interface, with localStorage as the first adapter and subject-specific state keyed by `subjectId`.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.4, TypeScript strict mode, Tailwind CSS v4, Mapbox GL JS 3.25.0 for the participant selector route only, Canvas 2D for the estate game, lucide-react, Vitest with jsdom.

---

## Scope And Non-Scope

### Scope

- Add `/[locale]/estates` as a participant-facing Mapbox building selector hub.
- Add `/[locale]/subjects/[subjectId]/estate` as the independent estate game route.
- Add a participant dashboard entry point to the estate selector hub.
- Route participant map clicks directly to the clicked subject's estate.
- Keep admin Mapbox selection, focus, popup, rank panel, controls, and reset behavior unchanged.
- Model estate state independently per `subjectId`.
- Derive `earnedPoints` from existing energy savings scoring only.
- Track spending through estate purchases and expansions as `spentPoints`.
- Render the estate with original 2:1 isometric Canvas graphics.
- Persist MVP state through a repository interface backed by localStorage.
- Keep Korean as the default UI language and add matching English messages.
- Cover pure domain behavior with focused Vitest tests before UI wiring.

### Non-Scope

- Real authentication, verified membership, database writes, API routes, server-side authority, or anti-tamper enforcement.
- New energy ingestion, ML prediction, LightGBM, or changed scoring formula.
- Passive point generation, decoration-produced income, auto-battle rewards, or loot systems.
- Replacing or refactoring the existing admin `CampusMap`.
- Copying copyrighted game art, characters, textures, UI layouts, or proprietary assets.
- Using Mapbox inside the actual estate game route.
- Committing or pushing changes unless the user explicitly asks during implementation.

## Screen Flow

1. User opens `/ko` or `/en`; existing admin/participant mode stays as-is.
2. In participant mode, `ParticipantDashboard` shows an estate entry action that links to `/${locale}/estates`.
3. `/[locale]/estates` renders a participant selector hub:
   - Uses localized Yeungnam demo subjects and current energy comparisons.
   - Uses Mapbox only on this selector route.
   - Shows a missing-token fallback when `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is absent.
   - Clicking a clickable building polygon routes directly to `/${locale}/subjects/${subjectId}/estate`.
4. `/[locale]/subjects/[subjectId]/estate` validates:
   - `locale` is one of `ko | en`.
   - `subjectId` exists in `demoSubjects`.
   - Unknown locale or subject uses `notFound()`.
5. The estate page displays:
   - Header with subject name, campus name, earned/spent/available points, and links back to the selector and dashboard.
   - Canvas estate view with pan/zoom and tile/object hit testing.
   - Toolbar for select, move, rotate, inventory, shop, and expansion modes.
   - Shop and inventory panels.
   - Selection panel for placed items.
   - Expansion confirmation dialog.
6. Opening another subject route loads a separate estate state. Items placed on `yu-e21` do not appear on `yu-e22`.

## Route Structure

```text
src/app/[locale]/estates/page.tsx
src/app/[locale]/estates/loading.tsx
src/app/[locale]/subjects/[subjectId]/estate/page.tsx
src/app/[locale]/subjects/[subjectId]/estate/loading.tsx
```

Route rules from the installed Next.js 16 docs:

- Pages and layouts are Server Components by default.
- Dynamic route `params` is a Promise and must be awaited.
- Runtime validation narrows `[locale]` from `string` to the local `Locale` type.
- `<Link>` is the primary navigation primitive.
- `useRouter` from `next/navigation` is only used in Client Components when a map click must navigate programmatically.
- `next/dynamic` with `ssr: false` is used only inside Client Components when loading browser-only Mapbox UI.

## File Structure

### Create

- `src/app/[locale]/estates/page.tsx`
  - Server Component. Validates locale, loads messages, localizes demo campus, passes Mapbox token to the selector shell.
- `src/app/[locale]/estates/loading.tsx`
  - Route loading UI for dynamic selector navigation.
- `src/app/[locale]/subjects/[subjectId]/estate/page.tsx`
  - Server Component. Validates locale and subject, computes earned points, renders the Mapbox-free estate game.
- `src/app/[locale]/subjects/[subjectId]/estate/loading.tsx`
  - Route loading UI for dynamic estate navigation.
- `src/features/estate/components/estate-app-providers.tsx`
  - Client wrapper for `I18nProvider` and `ThemeProvider` reuse on estate routes.
- `src/features/estate/components/estate-map-hub-client.tsx`
  - Client shell for the participant estate selector route. Dynamically loads the Mapbox selector.
- `src/features/estate/components/participant-estate-map.tsx`
  - Client-only Mapbox component for participant building clicks. It does not change admin map behavior.
- `src/features/estate/components/estate-game-client.tsx`
  - Client owner of repository loading, reducer dispatch, derived point account, and UI composition.
- `src/features/estate/components/estate-canvas.tsx`
  - Canvas lifecycle, pointer events, camera state, animation frame loop, and renderer calls.
- `src/features/estate/components/estate-header.tsx`
  - Subject title, point account, locale-aware navigation links.
- `src/features/estate/components/estate-toolbar.tsx`
  - Stable icon controls for select, move, rotate, shop, inventory, and expand.
- `src/features/estate/components/estate-shop-panel.tsx`
  - Catalog purchase UI.
- `src/features/estate/components/estate-inventory-panel.tsx`
  - Inventory item selection and placement mode entry.
- `src/features/estate/components/estate-selection-panel.tsx`
  - Selected placement details, rotate, move, remove-to-inventory actions.
- `src/features/estate/components/expansion-confirm-dialog.tsx`
  - Next expansion cost and confirmation.
- `src/features/estate/components/estate-loading-state.tsx`
  - Loading state shared by route and repository hydration.
- `src/features/estate/components/estate-error-state.tsx`
  - Recoverable repository or migration error display.
- `src/features/estate/data/estate-item-catalog.ts`
  - Original decoration catalog with tile footprint, cost, draw spec, and category.
- `src/features/estate/data/estate-expansion-catalog.ts`
  - Land sizes and expansion costs by level.
- `src/features/estate/data/demo-estate-data.ts`
  - Route data helpers that connect `demoSubjects`, localized subjects, and comparisons to estate props.
- `src/features/estate/data/estate-asset-manifest.ts`
  - Original Canvas draw specs; no third-party or copyrighted game assets.
- `src/features/estate/domain/types.ts`
  - Estate state, items, placements, transactions, commands, repository result types.
- `src/features/estate/domain/point-account.ts`
  - Earned/spent/available calculations and overspend checks.
- `src/features/estate/domain/placement.ts`
  - Footprint rotation, occupied cell map, bounds checks, collision checks.
- `src/features/estate/domain/expansion.ts`
  - Expansion availability, next level lookup, cost checks.
- `src/features/estate/domain/inventory.ts`
  - Inventory count updates for purchase, placement, and remove-to-inventory.
- `src/features/estate/domain/commands.ts`
  - Pure command helpers for purchase, place, move, rotate, remove, and expand.
- `src/features/estate/domain/reducer.ts`
  - Reducer that applies validated commands to `EstateState`.
- `src/features/estate/domain/serialization.ts`
  - Versioned localStorage envelope parsing, migration, and validation.
- `src/features/estate/domain/routes.ts`
  - Locale-aware route builders with `encodeURIComponent(subjectId)`.
- `src/features/estate/isometric/projection.ts`
  - 2:1 tile-to-screen and screen-to-tile conversion.
- `src/features/estate/isometric/camera.ts`
  - Pan, zoom, clamp, and resize helpers.
- `src/features/estate/isometric/hit-testing.ts`
  - Pointer-to-tile and topmost placement hit testing.
- `src/features/estate/isometric/render-order.ts`
  - Stable tile/object painter order.
- `src/features/estate/isometric/renderer.ts`
  - Canvas tile, object, hover, selection, and shadow rendering.
- `src/features/estate/persistence/estate-repository.ts`
  - Storage interface.
- `src/features/estate/persistence/local-storage-estate-repository.ts`
  - `localStorage` implementation with migration and corrupt-record recovery.
- `src/features/estate/persistence/memory-estate-repository.ts`
  - Test and story-like in-memory implementation.
- `src/features/estate/__tests__/point-account.test.ts`
- `src/features/estate/__tests__/placement.test.ts`
- `src/features/estate/__tests__/expansion.test.ts`
- `src/features/estate/__tests__/inventory.test.ts`
- `src/features/estate/__tests__/serialization.test.ts`
- `src/features/estate/__tests__/projection.test.ts`
- `src/features/estate/__tests__/hit-testing.test.ts`
- `src/features/estate/__tests__/estate-route-data.test.ts`
- `src/features/estate/__tests__/estate-repository.test.ts`
- `src/features/estate/__tests__/estate-routes.test.ts`
- `src/features/estate/__tests__/participant-dashboard-estate-link.test.tsx`

### Modify

- `src/features/campus-energy/components/participant-dashboard.tsx`
  - Add a localized link to `/${locale}/estates`.
- `src/i18n/messages/ko.ts`
  - Add Korean estate messages.
- `src/i18n/messages/en.ts`
  - Add matching English estate messages.
- `src/i18n/__tests__/messages.test.ts`
  - Assert the new top-level estate message group is mirrored.

### Do Not Modify Unless A Test Proves It Is Needed

- `src/features/campus-energy/components/admin-map-view.tsx`
- `src/features/campus-energy/components/campus-map.tsx`
- `src/features/campus-energy/components/building-popup.tsx`
- `src/features/campus-energy/domain/scoring.ts`
- `src/features/campus-energy/domain/energy.ts`
- `src/features/campus-energy/data/demo-campus.ts`

## Estate State Model

```ts
export const ESTATE_STATE_VERSION = 1;

export type EstateRotation = 0 | 90 | 180 | 270;

export type EstateGridPoint = {
  x: number;
  y: number;
};

export type EstatePlacement = {
  instanceId: string;
  itemId: EstateItemId;
  origin: EstateGridPoint;
  rotation: EstateRotation;
  placedAt: string;
};

export type EstateTransaction =
  | {
      id: string;
      type: "purchase";
      itemId: EstateItemId;
      amount: number;
      createdAt: string;
    }
  | {
      id: string;
      type: "expansion";
      expansionLevel: number;
      amount: number;
      createdAt: string;
    };

export type EstateState = {
  version: 1;
  subjectId: string;
  landLevel: number;
  inventory: Partial<Record<EstateItemId, number>>;
  placements: EstatePlacement[];
  transactions: EstateTransaction[];
  updatedAt: string;
};
```

State rules:

- `subjectId` is immutable after state creation.
- `earnedPoints` is not stored in `EstateState`.
- `spentPoints` is derived from `transactions`.
- Inventory stores owned, unplaced decoration counts.
- Placements store only instances currently on the land.
- Removing a placement returns one item to inventory and does not refund points.
- Moving and rotating are free but must pass collision and land-bound checks.
- All writes replace the full subject state through `EstateRepository.save()`.

Default state:

```ts
export function createDefaultEstateState(subjectId: string): EstateState {
  return {
    version: 1,
    subjectId,
    landLevel: 0,
    inventory: {},
    placements: [],
    transactions: [],
    updatedAt: new Date(0).toISOString(),
  };
}
```

## Point Accounting Rules

```ts
export type EstatePointAccount = {
  earnedPoints: number;
  spentPoints: number;
  availablePoints: number;
};

export function getEstatePointAccount(
  earnedPoints: number,
  transactions: EstateTransaction[],
): EstatePointAccount {
  const spentPoints = transactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  return {
    earnedPoints: Math.max(0, Math.floor(earnedPoints)),
    spentPoints: Math.max(0, spentPoints),
    availablePoints: Math.max(0, Math.floor(earnedPoints) - spentPoints),
  };
}
```

Rules:

- `earnedPoints = calculatePoints(subjectComparison)`.
- If a subject has no comparison, `earnedPoints = 0`.
- UI never provides a way to increase `earnedPoints`.
- Decorations have no point production, no timer income, and no compounding bonus.
- Purchase command rejects when `item.cost > availablePoints`.
- Expansion command rejects when `expansion.cost > availablePoints`.
- A failed command returns a typed error and leaves `EstateState` unchanged.
- localStorage is a convenience store only. The future server repository must recompute earned points server-side and treat client state as non-authoritative.

## Isometric Coordinate Conversion

Constants:

```ts
export const TILE_WIDTH = 96;
export const TILE_HEIGHT = 48;
```

Projection:

```ts
export function tileToWorld(point: EstateGridPoint, elevationPx = 0) {
  return {
    x: (point.x - point.y) * (TILE_WIDTH / 2),
    y: (point.x + point.y) * (TILE_HEIGHT / 2) - elevationPx,
  };
}

export function worldToTile(world: { x: number; y: number }): EstateGridPoint {
  return {
    x: Math.floor(world.y / TILE_HEIGHT + world.x / TILE_WIDTH),
    y: Math.floor(world.y / TILE_HEIGHT - world.x / TILE_WIDTH),
  };
}
```

Camera transform:

```ts
export function screenToWorld(
  screen: { x: number; y: number },
  camera: EstateCamera,
) {
  return {
    x: (screen.x - camera.viewportCenterX) / camera.zoom - camera.offsetX,
    y: (screen.y - camera.viewportTop) / camera.zoom - camera.offsetY,
  };
}
```

Rendering order:

- Draw land tiles by ascending `x + y`, then ascending `y`.
- Draw grid overlays after tiles.
- Draw placed objects by ascending `origin.x + origin.y + footprintDepth`, then `origin.y`, then `origin.x`.
- Draw hover/selection outlines after objects.
- Draw HUD and panels in React, not inside Canvas.

## Placement Collision Rules

Catalog footprint:

```ts
export type EstateItem = {
  id: EstateItemId;
  nameKey: string;
  category: "tree" | "garden" | "solar" | "bench" | "landmark";
  cost: number;
  footprint: { width: number; depth: number };
  heightPx: number;
  drawSpecKey: EstateAssetKey;
};
```

Footprint rotation:

```ts
export function getRotatedFootprint(
  footprint: { width: number; depth: number },
  rotation: EstateRotation,
) {
  return rotation === 90 || rotation === 270
    ? { width: footprint.depth, depth: footprint.width }
    : footprint;
}
```

Rules:

- A placement occupies every cell from `origin.x` to `origin.x + width - 1` and `origin.y` to `origin.y + depth - 1`.
- Every occupied cell must be inside the current land bounds.
- Two placements collide if any occupied cell key matches.
- Moving an existing placement ignores its own current occupied cells while validating the new origin.
- Rotation is allowed only if the rotated footprint stays inside land and does not collide.
- Inventory placement consumes one count only after placement validation succeeds.
- Remove-to-inventory deletes the placement and increments that item count by one.

## Land Expansion Rules

Expansion catalog:

```ts
export const estateExpansionCatalog = [
  { level: 0, size: 8, cost: 0 },
  { level: 1, size: 10, cost: 1200 },
  { level: 2, size: 12, cost: 2600 },
  { level: 3, size: 14, cost: 4800 },
] as const;
```

Rules:

- Initial land is an `8 x 8` square.
- Land is always a square from `(0, 0)` through `(size - 1, size - 1)`.
- Only the next level is purchasable.
- Levels cannot be skipped.
- Expansion never moves or removes existing placements.
- Expansion transaction amount is recorded once.
- Re-purchasing the same expansion level is rejected.
- At max level, the expand control is disabled and explains that all available land is unlocked.

## localStorage Version And Migration Strategy

Storage keys:

```ts
const ESTATE_STORAGE_PREFIX = "cems.estate";

export function getEstateStorageKey(subjectId: string) {
  return `${ESTATE_STORAGE_PREFIX}.${encodeURIComponent(subjectId)}`;
}
```

Envelope:

```ts
export type EstateStorageEnvelope = {
  version: number;
  savedAt: string;
  state: EstateState;
};
```

Repository interface:

```ts
export type EstateRepository = {
  load(subjectId: string): Promise<EstateState>;
  save(state: EstateState): Promise<void>;
  clear(subjectId: string): Promise<void>;
};
```

Migration rules:

- `version === 1`: validate and return.
- Missing version: treat as version `0`, then create a v1 state with the same `subjectId` if present and safe defaults for missing fields.
- Invalid JSON: preserve the raw string under `cems.estate.corrupt.${encodedSubjectId}.${timestamp}` and return default state.
- Future version greater than `ESTATE_STATE_VERSION`: return default state and surface a recoverable warning in `EstateErrorState`.
- All migrated saves write the current v1 envelope back to the primary key.
- `local-storage-estate-repository.ts` is the only file that touches `window.localStorage`.

## Implementation Tasks

### Task 1: Confirm Framework Baseline And Protect Existing Map Behavior

**Files:**
- Read: `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
- Read: `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- Read: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- Read: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`
- Read: `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
- Read: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`
- Read: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`
- Read: `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`
- Read: `src/features/campus-energy/components/admin-map-view.tsx`
- Read: `src/features/campus-energy/components/campus-map.tsx`
- Read: `src/features/campus-energy/__tests__/campus-map.test.tsx`

- [ ] **Step 1: Re-read the local Next.js docs**

Run:

```powershell
Get-Content -LiteralPath 'node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md' -Encoding utf8
Get-Content -LiteralPath 'node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md' -Encoding utf8
Get-Content -LiteralPath 'node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md' -Encoding utf8
Get-Content -LiteralPath 'node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md' -Encoding utf8
Get-Content -LiteralPath 'node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md' -Encoding utf8
Get-Content -LiteralPath 'node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md' -Encoding utf8
Get-Content -LiteralPath 'node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md' -Encoding utf8
Get-Content -LiteralPath 'node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md' -Encoding utf8
```

Expected:

- `params` is a Promise.
- Browser APIs and `localStorage` belong in Client Components.
- `useRouter` is imported from `next/navigation`.
- `ssr: false` for dynamic imports belongs inside a Client Component.

- [ ] **Step 2: Run the current map regression tests before edits**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/campus-map.test.tsx src/features/campus-energy/__tests__/mapbox-style.test.ts
```

Expected: PASS before any estate work starts.

- [ ] **Step 3: Search for existing game prototype imports**

Run:

```powershell
rg -n "game-preview|mapbox-gl|useRouter|subjects/.*/estate|estates" src
```

Expected:

- `/game-preview` exists as a separate prototype.
- No current `/[locale]/estates` or `/subjects/[subjectId]/estate` route exists.
- Only map components import `mapbox-gl`.

### Task 2: Add Estate Domain Types And Point Accounting Tests

**Files:**
- Create: `src/features/estate/domain/types.ts`
- Create: `src/features/estate/domain/point-account.ts`
- Create: `src/features/estate/__tests__/point-account.test.ts`

- [ ] **Step 1: Write point accounting tests**

Create `src/features/estate/__tests__/point-account.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  canSpendEstatePoints,
  getEstatePointAccount,
} from "../domain/point-account";
import type { EstateTransaction } from "../domain/types";

const transactions: EstateTransaction[] = [
  {
    id: "tx-1",
    type: "purchase",
    itemId: "young-tree",
    amount: 300,
    createdAt: "2026-06-24T00:00:00.000Z",
  },
  {
    id: "tx-2",
    type: "expansion",
    expansionLevel: 1,
    amount: 1200,
    createdAt: "2026-06-24T00:01:00.000Z",
  },
];

describe("estate point accounting", () => {
  it("derives available points from earned energy points minus spending", () => {
    expect(getEstatePointAccount(2000, transactions)).toEqual({
      earnedPoints: 2000,
      spentPoints: 1500,
      availablePoints: 500,
    });
  });

  it("never exposes a negative available balance", () => {
    expect(getEstatePointAccount(100, transactions)).toMatchObject({
      earnedPoints: 100,
      spentPoints: 1500,
      availablePoints: 0,
    });
  });

  it("rejects spending above the available energy-saving balance", () => {
    expect(canSpendEstatePoints(2000, transactions, 501)).toBe(false);
    expect(canSpendEstatePoints(2000, transactions, 500)).toBe(true);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```powershell
npm run test -- src/features/estate/__tests__/point-account.test.ts
```

Expected: FAIL because estate domain files do not exist.

- [ ] **Step 3: Add `types.ts` and `point-account.ts`**

Implement the state and point account types exactly as described in the state model and point accounting sections above.

- [ ] **Step 4: Run and verify pass**

Run:

```powershell
npm run test -- src/features/estate/__tests__/point-account.test.ts
```

Expected: PASS.

### Task 3: Add Catalogs, Inventory, Placement, And Expansion Domain

**Files:**
- Create: `src/features/estate/data/estate-item-catalog.ts`
- Create: `src/features/estate/data/estate-expansion-catalog.ts`
- Create: `src/features/estate/domain/inventory.ts`
- Create: `src/features/estate/domain/placement.ts`
- Create: `src/features/estate/domain/expansion.ts`
- Create: `src/features/estate/domain/commands.ts`
- Create: `src/features/estate/domain/reducer.ts`
- Create: `src/features/estate/__tests__/inventory.test.ts`
- Create: `src/features/estate/__tests__/placement.test.ts`
- Create: `src/features/estate/__tests__/expansion.test.ts`

- [ ] **Step 1: Write inventory tests**

Create tests that verify:

- Purchasing increments inventory only after a successful spend check.
- Placing an inventory item decrements its count.
- Removing a placement returns one count to inventory.
- Counts never drop below zero.

- [ ] **Step 2: Write placement tests**

Create tests with:

```ts
const land = { width: 8, height: 8 };
const oneByOne = { width: 1, depth: 1 };
const twoByOne = { width: 2, depth: 1 };
```

Expected assertions:

- `(0, 0)` with `1 x 1` is valid.
- `(-1, 0)` is invalid.
- `(7, 7)` with `2 x 1` is invalid.
- A `2 x 1` item at `(2, 2)` rotated `90` occupies `(2,2)` and `(2,3)`.
- A new placement cannot overlap an existing occupied cell.
- Moving a placement can reuse its own current cells.

- [ ] **Step 3: Write expansion tests**

Expected assertions:

- Level `0` resolves to `8 x 8`.
- Next expansion from level `0` is level `1`, size `10`, cost `1200`.
- Level skipping is rejected.
- Re-purchasing level `1` after state already has `landLevel: 1` is rejected.
- Max level has no next expansion.

- [ ] **Step 4: Implement domain modules and catalog files**

Catalog minimum:

```ts
export const estateItemCatalog = [
  {
    id: "young-tree",
    nameKey: "youngTree",
    category: "tree",
    cost: 300,
    footprint: { width: 1, depth: 1 },
    heightPx: 54,
    drawSpecKey: "youngTree",
  },
  {
    id: "solar-bench",
    nameKey: "solarBench",
    category: "bench",
    cost: 650,
    footprint: { width: 2, depth: 1 },
    heightPx: 34,
    drawSpecKey: "solarBench",
  },
  {
    id: "micro-garden",
    nameKey: "microGarden",
    category: "garden",
    cost: 900,
    footprint: { width: 2, depth: 2 },
    heightPx: 28,
    drawSpecKey: "microGarden",
  },
] as const;
```

- [ ] **Step 5: Run focused domain tests**

Run:

```powershell
npm run test -- src/features/estate/__tests__/inventory.test.ts src/features/estate/__tests__/placement.test.ts src/features/estate/__tests__/expansion.test.ts
```

Expected: PASS.

### Task 4: Add Serialization And Repository Adapters

**Files:**
- Create: `src/features/estate/domain/serialization.ts`
- Create: `src/features/estate/persistence/estate-repository.ts`
- Create: `src/features/estate/persistence/local-storage-estate-repository.ts`
- Create: `src/features/estate/persistence/memory-estate-repository.ts`
- Create: `src/features/estate/__tests__/serialization.test.ts`
- Create: `src/features/estate/__tests__/estate-repository.test.ts`

- [ ] **Step 1: Write serialization tests**

Expected assertions:

- A valid v1 envelope round-trips.
- Missing storage returns `createDefaultEstateState(subjectId)`.
- Invalid JSON returns default state and reports a recoverable error.
- Missing version migrates to v1 with safe defaults.
- Version greater than current returns default state and reports a recoverable error.

- [ ] **Step 2: Write repository tests**

Use jsdom `localStorage` and `MemoryEstateRepository`.

Expected assertions:

- `save()` then `load()` returns the same subject state.
- Saving `yu-e21` does not affect `yu-e22`.
- `clear("yu-e21")` removes only that subject.
- The repository never writes an `earnedPoints` field.

- [ ] **Step 3: Implement serialization and repositories**

Implementation constraints:

- `local-storage-estate-repository.ts` must start with `"use client"` only if it is imported by Client Components directly.
- No Server Component should import `local-storage-estate-repository.ts`.
- `EstateRepository` methods return Promises even though localStorage is synchronous.

- [ ] **Step 4: Run focused persistence tests**

Run:

```powershell
npm run test -- src/features/estate/__tests__/serialization.test.ts src/features/estate/__tests__/estate-repository.test.ts
```

Expected: PASS.

### Task 5: Add Isometric Projection, Camera, Hit Testing, And Renderer

**Files:**
- Create: `src/features/estate/isometric/projection.ts`
- Create: `src/features/estate/isometric/camera.ts`
- Create: `src/features/estate/isometric/hit-testing.ts`
- Create: `src/features/estate/isometric/render-order.ts`
- Create: `src/features/estate/isometric/renderer.ts`
- Create: `src/features/estate/data/estate-asset-manifest.ts`
- Create: `src/features/estate/__tests__/projection.test.ts`
- Create: `src/features/estate/__tests__/hit-testing.test.ts`

- [ ] **Step 1: Write projection tests**

Expected assertions:

- `tileToWorld({ x: 0, y: 0 })` returns `{ x: 0, y: 0 }`.
- `tileToWorld({ x: 1, y: 0 })` returns `{ x: 48, y: 24 }`.
- `tileToWorld({ x: 0, y: 1 })` returns `{ x: -48, y: 24 }`.
- `worldToTile(tileToWorld({ x: 3, y: 4 }))` returns `{ x: 3, y: 4 }`.

- [ ] **Step 2: Write hit-testing tests**

Expected assertions:

- A pointer at the center of tile `(2, 3)` returns tile `(2, 3)`.
- A placed `2 x 2` object is hit from any occupied cell.
- When two object draw bounds overlap on screen, the object later in render order is selected.

- [ ] **Step 3: Implement projection, camera, and hit-testing helpers**

Use the formulas in the isometric coordinate conversion section. Keep helpers pure and DOM-free.

- [ ] **Step 4: Implement renderer with original Canvas shapes**

Renderer rules:

- Draw land tiles as 2:1 diamonds.
- Use a consistent light direction from upper-left.
- Draw original decoration silhouettes with Canvas primitives.
- Do not load third-party game sprites.
- Keep selected/hover outlines readable at mobile sizes.

- [ ] **Step 5: Run focused isometric tests**

Run:

```powershell
npm run test -- src/features/estate/__tests__/projection.test.ts src/features/estate/__tests__/hit-testing.test.ts
```

Expected: PASS.

### Task 6: Add Estate Route Data And Locale-Aware Routes

**Files:**
- Create: `src/features/estate/data/demo-estate-data.ts`
- Create: `src/features/estate/domain/routes.ts`
- Create: `src/features/estate/__tests__/estate-route-data.test.ts`
- Create: `src/features/estate/__tests__/estate-routes.test.ts`

- [ ] **Step 1: Write route helper tests**

Expected assertions:

- `getEstatesPath("ko")` returns `/ko/estates`.
- `getSubjectEstatePath("ko", "yu-e21")` returns `/ko/subjects/yu-e21/estate`.
- `getSubjectEstatePath("en", "yu e21")` encodes the subject id segment.

- [ ] **Step 2: Write estate route data tests**

Expected assertions:

- Known subject `yu-e21` returns localized subject data and earned points from `calculatePoints`.
- Unknown subject returns `null`.
- Korean route data uses generated Korean catalog fallback names when message entries are absent.
- English route data uses generated English catalog fallback names when message entries are absent.

- [ ] **Step 3: Implement route helpers and route data**

`demo-estate-data.ts` should use:

- `localizeDemoCampus(locale, messages)`
- `getDemoEnergyComparisons()`
- `calculatePoints(comparison)`

No localStorage or browser API belongs in this file.

- [ ] **Step 4: Run focused route data tests**

Run:

```powershell
npm run test -- src/features/estate/__tests__/estate-route-data.test.ts src/features/estate/__tests__/estate-routes.test.ts
```

Expected: PASS.

### Task 7: Add Estate Game Route And Client UI

**Files:**
- Create: `src/app/[locale]/subjects/[subjectId]/estate/page.tsx`
- Create: `src/app/[locale]/subjects/[subjectId]/estate/loading.tsx`
- Create: `src/features/estate/components/estate-app-providers.tsx`
- Create: `src/features/estate/components/estate-game-client.tsx`
- Create: `src/features/estate/components/estate-canvas.tsx`
- Create: `src/features/estate/components/estate-header.tsx`
- Create: `src/features/estate/components/estate-toolbar.tsx`
- Create: `src/features/estate/components/estate-shop-panel.tsx`
- Create: `src/features/estate/components/estate-inventory-panel.tsx`
- Create: `src/features/estate/components/estate-selection-panel.tsx`
- Create: `src/features/estate/components/expansion-confirm-dialog.tsx`
- Create: `src/features/estate/components/estate-loading-state.tsx`
- Create: `src/features/estate/components/estate-error-state.tsx`

- [ ] **Step 1: Add Server Component route**

`page.tsx` must:

- Await `params`.
- Validate `locale` with `isLocale`.
- Load messages with `getMessages(locale)`.
- Resolve estate route data.
- Call `notFound()` for invalid locale or subject.
- Pass only serializable props to `EstateGameClient`.
- Not import `mapbox-gl`.

- [ ] **Step 2: Add client shell**

`EstateGameClient` must:

- Create `LocalStorageEstateRepository` in a Client Component.
- Load state by `subjectId` in `useEffect`.
- Derive point account from server-provided `earnedPoints` plus loaded transactions.
- Dispatch pure reducer commands.
- Save state after successful command changes.
- Render loading and recoverable error states.

- [ ] **Step 3: Add Canvas interaction**

`EstateCanvas` must:

- Resize for device pixel ratio.
- Convert pointer events through camera and projection helpers.
- Support hover tile, selected placement, placement preview, pan, and wheel/pinch-friendly zoom.
- Keep text out of Canvas except optional tiny debug-free labels; React panels handle UI text.

- [ ] **Step 4: Add panels and controls**

Controls must:

- Use lucide icons for toolbar actions.
- Keep fixed button dimensions to avoid layout shifts.
- Disable unaffordable purchases and expansions.
- Show current earned, spent, and available points.
- Never show an action that increases earned points.

- [ ] **Step 5: Run build-type verification**

Run:

```powershell
npm run lint
npm run build
```

Expected: PASS after route and component wiring.

### Task 8: Add Participant Estate Map Hub

**Files:**
- Create: `src/app/[locale]/estates/page.tsx`
- Create: `src/app/[locale]/estates/loading.tsx`
- Create: `src/features/estate/components/estate-map-hub-client.tsx`
- Create: `src/features/estate/components/participant-estate-map.tsx`

- [ ] **Step 1: Add Server Component selector route**

`/[locale]/estates/page.tsx` must:

- Await `params`.
- Validate locale.
- Load messages.
- Localize demo campus.
- Pass `process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""`.
- Render providers and `EstateMapHubClient`.

- [ ] **Step 2: Add dynamic Mapbox loading inside a Client Component**

`estate-map-hub-client.tsx` should use:

```ts
const ParticipantEstateMap = dynamic(
  () =>
    import("./participant-estate-map").then(
      (module) => module.ParticipantEstateMap,
    ),
  {
    ssr: false,
    loading: () => <EstateLoadingState />,
  },
);
```

Expected: `participant-estate-map.tsx` is the only new estate file that imports `mapbox-gl`.

- [ ] **Step 3: Implement participant map click routing**

`participant-estate-map.tsx` must:

- Use `useRouter` from `next/navigation`.
- Create a Mapbox map only when a token exists.
- Reuse existing energy feature data through `createEnergySubjectFeatureCollection`.
- Register click handlers only for polygon or multipolygon features with positive `displayHeightMeters`.
- On click, route with `router.push(getSubjectEstatePath(locale, subjectId))`.
- Avoid changing `selectedSubjectId` state in the admin map.

- [ ] **Step 4: Verify no Mapbox import leaks into actual estate route**

Run:

```powershell
rg -n "mapbox-gl|CampusMap" src/app/[locale]/subjects src/features/estate
```

Expected:

- `mapbox-gl` appears only in `src/features/estate/components/participant-estate-map.tsx`.
- The actual estate game components do not import `CampusMap` or `mapbox-gl`.

### Task 9: Wire Participant Dashboard Entry Point And Messages

**Files:**
- Modify: `src/features/campus-energy/components/participant-dashboard.tsx`
- Modify: `src/i18n/messages/ko.ts`
- Modify: `src/i18n/messages/en.ts`
- Modify: `src/i18n/__tests__/messages.test.ts`
- Create: `src/features/estate/__tests__/participant-dashboard-estate-link.test.tsx`

- [ ] **Step 1: Add message tests**

Extend `messages.test.ts` to assert:

```ts
expect(Object.keys(enMessages.estate)).toEqual(Object.keys(koMessages.estate));
expect(enMessages.estate.actions.openEstateMap).toBe("Open estate map");
expect(koMessages.estate.actions.openEstateMap).toBe("영지 지도 열기");
```

- [ ] **Step 2: Add participant link test**

Mock `useI18n()` with locale `ko` and assert the rendered participant dashboard contains a link with:

```text
href="/ko/estates"
```

- [ ] **Step 3: Add estate messages**

Minimum message shape:

```ts
estate: {
  actions: {
    backToDashboard: string;
    backToEstateMap: string;
    buy: string;
    expand: string;
    openEstateMap: string;
    place: string;
    remove: string;
    rotate: string;
  };
  labels: {
    availablePoints: string;
    earnedPoints: string;
    inventory: string;
    land: string;
    shop: string;
    spentPoints: string;
  };
  states: {
    loading: string;
    mapMissingToken: string;
    maxExpansion: string;
    notEnoughPoints: string;
  };
}
```

- [ ] **Step 4: Add dashboard link**

Use `useI18n()` in `ParticipantDashboard` to get `locale` and render a `Link` to `getEstatesPath(locale)`.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npm run test -- src/i18n/__tests__/messages.test.ts src/features/estate/__tests__/participant-dashboard-estate-link.test.tsx
```

Expected: PASS.

### Task 10: Regression Tests And Full Verification

**Files:**
- Verify all changed code.

- [ ] **Step 1: Run estate-focused tests**

Run:

```powershell
npm run test -- src/features/estate
```

Expected: PASS.

- [ ] **Step 2: Run campus map regression tests**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/campus-map.test.tsx src/features/campus-energy/__tests__/mapbox-style.test.ts
```

Expected: PASS, with no admin Mapbox behavior regressions.

- [ ] **Step 3: Run final required commands**

Run:

```powershell
npm run test
npm run lint
npm run build
git diff --check
```

Expected:

- Tests pass.
- Lint passes.
- Production build succeeds.
- `git diff --check` prints no whitespace errors.

## Test Plan

- Domain:
  - Point accounting rejects overspending and never stores earned points.
  - Placement handles bounds, collision, movement, rotation, and occupancy.
  - Expansion handles sequential levels, max level, and cost checks.
  - Inventory handles purchase, placement consumption, and remove-to-inventory.
  - Serialization handles v1, missing version, corrupt JSON, and future versions.
- Isometric:
  - Projection round-trips representative tiles.
  - Camera transform maps screen pointers to world coordinates.
  - Hit testing selects tiles and topmost objects.
  - Render order is stable for multi-tile objects.
- Persistence:
  - localStorage keys are subject-specific.
  - `yu-e21` and `yu-e22` states stay isolated.
  - Repository does not write `earnedPoints`.
- Routing:
  - Route helpers create locale-aware, encoded URLs.
  - Unknown subject route data returns `null`.
  - Estate game route calls `notFound()` for invalid locale or subject through route data guard.
- i18n:
  - Korean and English estate message groups have matching keys.
  - Participant dashboard link uses active locale.
- Mapbox:
  - Existing admin `CampusMap` tests keep passing.
  - Participant selector map click calls `router.push()` with the estate route.
  - Actual estate route and components do not import Mapbox.

## Manual Verification Scenarios

1. No Mapbox token:
   - Open `/ko/estates`.
   - Expected: clear missing-token state, no Mapbox construction crash.
   - Open `/ko/subjects/yu-e21/estate`.
   - Expected: Canvas estate loads because the game route does not need Mapbox.
2. Participant selector with Mapbox token:
   - Open `/ko`, switch to participant mode, click estate map entry.
   - Click a visible building polygon on `/ko/estates`.
   - Expected: browser navigates directly to `/ko/subjects/<subjectId>/estate`.
3. Admin regression:
   - Open `/ko` admin mode with token.
   - Click an existing clickable building.
   - Expected: selected building focuses, popup appears, rank panel selection still works, reset view still works.
4. Subject isolation:
   - On `/ko/subjects/yu-e21/estate`, buy and place `young-tree`.
   - Open `/ko/subjects/yu-e22/estate`.
   - Expected: `yu-e22` estate has no `yu-e21` placement.
   - Return to `yu-e21`.
   - Expected: placement persists.
5. Point accounting:
   - Buy an affordable decoration.
   - Expected: available points decrease by item cost.
   - Wait and interact with decorations.
   - Expected: points do not increase from decorations.
   - Try unaffordable item or expansion.
   - Expected: action disabled or rejected without state mutation.
6. Collision:
   - Place a `2 x 2` item.
   - Try placing another item over any occupied cell.
   - Expected: preview marks invalid and placement is rejected.
   - Rotate near a border.
   - Expected: rotation is rejected if footprint leaves land.
7. Expansion:
   - Buy next expansion when enough points exist.
   - Expected: land grows from `8 x 8` to `10 x 10`, existing items remain in place.
   - Try buying the same expansion again.
   - Expected: rejected.
8. Localization:
   - Open `/ko/estates` and `/ko/subjects/yu-e21/estate`.
   - Open `/en/estates` and `/en/subjects/yu-e21/estate`.
   - Expected: Korean is default; English routes show English UI text and subject catalog fallback names where available.
9. Mobile:
   - Test at a narrow viewport.
   - Expected: Canvas remains usable, panels do not overlap, buttons keep stable dimensions, text fits inside controls.

## Conflict Possibilities Found During Planning

- The current working tree is not clean: `.claude/launch.json` and `cems.md` are untracked. Do not modify or remove them unless the user asks.
- `/game-preview` already contains a Mapbox/RPG prototype, but it mixes Mapbox, battle, static building IDs, and non-localized text in one feature. Treat it as a separate prototype and do not build the new estate system on top of it.
- The admin map has detailed regression coverage around layer registration, selection, `easeTo()`, and point fallback non-clickability. Avoid changing `CampusMap` unless a failing test requires it.
- Generated Yeungnam subjects outnumber hand-written message entries. Estate route data must rely on `localizeDemoCampus()` so generated Korean/English catalog fallback names work.
- Some official campus entries are point fallbacks or non-height polygons. The participant selector should route only from clickable height-bearing polygon/multipolygon buildings; direct URL entry can still load a known subject estate with zero earned points if no comparison exists.
- localStorage cannot enforce point integrity. The repository interface is included so a server-backed implementation can later enforce earned/spent accounting.

## Proposed Step Order

1. Protect existing admin Mapbox behavior with current tests.
2. Build pure estate domain modules and tests.
3. Add versioned serialization and repository adapters.
4. Add isometric projection, camera, hit testing, render ordering, and Canvas renderer.
5. Add route data helpers and locale-aware path helpers.
6. Add the Mapbox-free estate game route and client UI.
7. Add the participant estate selector Mapbox route with dynamic client-only loading.
8. Wire the participant dashboard entry point and i18n messages.
9. Run focused regressions, then the final required command set.

## Final Commands

```powershell
npm run test
npm run lint
npm run build
git diff --check
```

## Self-Review

- Spec coverage: The plan covers scope/non-scope, screen flow, route structure, file creation/modification, state model, point accounting, isometric projection, collision, expansion, localStorage migration, tests, manual verification, and final commands.
- Deferred-work scan: no empty implementation markers or unspecified validation steps remain.
- Type consistency: `EstateState`, `EstatePlacement`, `EstateTransaction`, `EstateRepository`, point account, route helpers, and catalog field names are used consistently across tasks.
- Risk note: The first implementation remains a client-side MVP; the plan keeps accounting logic isolated so a future server repository can replace localStorage without rewriting UI commands.
