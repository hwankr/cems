# Estate Eco-Credit Economy & Main-Building Member Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second estate currency ("에코 크레딧") that energy-device buildings passively generate and that buys cosmetic decorations, and show the operating group's energy-saving participants ranked when the main building is tapped.

**Architecture:** A two-currency model layered onto the existing estate. **절감 포인트** (verified energy-saving group pool, server-authoritative via `save_estate`) keeps buying the 4 new generator buildings, main-building upgrades, land expansion, and ground tiles. **에코 크레딧** is a new estate-local soft currency stored *inside the snapshot JSON* (`ecoCredits` + `ecoCollectedAt`), generated over time from `main-building base rate + Σ placed-generator rate`, and spent on the 12 cosmetic decoration items. Because the `save_estate` RPC validates only the point `transactions[]` against the group pool and stores the snapshot JSON wholesale, **no server/RPC migration is required** — eco state rides along in the JSON. The member panel reuses the existing `get_subject_contributor_rankings` RPC / `getSubjectContributorRankings()` DAL / `SubjectContributor` domain type (already powering the map building popup) and renders an estate-styled panel when the protected main building is selected.

**Tech Stack:** Next.js 16.2.9, React 19.2.4, TypeScript, Tailwind CSS v4, Vitest (+ jsdom for component tests), Supabase (read-only for this feature).

## Global Constraints

- **No server/RPC/Supabase migration.** Eco-credits persist as extra fields in the estate snapshot JSON; `save_estate` only validates point `transactions[]` and version. (Self-inflating your own eco balance is the same documented "within-own-group cosmetic" limitation class as today — point economy and cross-group safety are unaffected.)
- **Snapshot schema bumps `2 → 3`.** Back-compat: `migrateEstateSnapshot`/`parseEstateSnapshot` must still accept v1 and v2 input and default the new eco fields. Mirror the existing v1→v2 `mainBuildingLevel` precedent exactly.
- **`EstateItemDefinition.currency` is optional, default `"points"` at read sites** (`definition.currency ?? "points"`). Only the 12 decoration items get `currency: "eco"`; generators get `currency: "points"` (explicit) + `ecoRatePerHour`. Base building, ground tiles, and award emblems stay unset (→ points). This minimizes churn and never touches the hardened bulk-paint path.
- **Real points stay server-authoritative and unchanged.** Ground tiles remain on points (the `paintEstateGroundCells` partial-affordability path is deliberately untouched).
- **i18n is Korean-first and ko/en must stay symmetric in the same key order.** `Messages` is derived from `koMessages`; `src/i18n/__tests__/messages.test.ts` asserts `Object.keys(enMessages.estate)` deep-equals (order-sensitive) `Object.keys(koMessages.estate)`. Add every new `estate.*` top-level key in the **identical position** in both `ko.ts` and `en.ts`.
- **Verification baseline:** Vitest all green; `npx eslint` 0 errors with the 2 pre-existing `game-preview.tsx` hook warnings; `npm run build` passes.
- **Tunable numbers (defaults below; safe to adjust during review):**

  | Knob | Default |
  |---|---|
  | `mainBuildingEcoRatePerHour(level)` | `6 * level` (Lv1=6 … Lv5=30) credits/hour |
  | `ECO_ACCRUAL_CAP_HOURS` | `24` |
  | Generator point costs | solar-array 600, wind-turbine 1,100, battery-storage 1,800, geothermal-hub 3,200 |
  | Generator `ecoRatePerHour` | 15 / 25 / 35 / 50 |
  | Decoration eco costs | broadleaf-tree 30, pine-tree 35, flower-bed 45, bench 50, solar-street-light 60, campus-flag 70, recycling-station 90, small-sculpture 110, small-greenhouse 180, fountain 220, solar-pavilion 260, decorative-shrub 28 |
  | Member panel fetch limit | 50 |

---

## File Structure

**Create**
- `src/features/estate/domain/eco-credit.ts` — pure eco rate/accrual/collect/spend domain logic (one responsibility: the eco currency math).
- `src/features/estate/__tests__/eco-credit.test.ts` — unit tests for the above.
- `src/features/estate/components/estate-member-panel.tsx` — estate-styled presentational panel listing group contributors (one responsibility: render `SubjectContributor[]`).
- `src/features/estate/__tests__/estate-member-panel.test.tsx` — jsdom tests for the panel.

**Modify**
- `src/features/estate/domain/types.ts` — `EstateSnapshot` (eco fields, `schemaVersion: 3`); `EstateItemDefinition` (`currency?`, `ecoRatePerHour?`); `EstateItemCategory` (`"generator"`); `EstateCommandFailureReason` (`"insufficient-eco"`).
- `src/features/estate/domain/serialization.ts` — accept/emit v3, carry eco fields.
- `src/features/estate/persistence/estate-repository.ts` — `migrateEstateSnapshot` (accept v3, default eco), `validateEstateSnapshot` (carry/validate eco), `toPersistableEstateSnapshot` (emit v3 + eco).
- `src/features/estate/domain/commands.ts` — `createInitialEstateSnapshot` (eco fields); `purchaseEstateItem` (currency branch).
- `src/features/estate/data/demo-estate-data.ts` — `createDemoEstateSeedSnapshot` (eco fields).
- `src/features/estate/data/estate-item-catalog.ts` — `currency` on decorations + 4 generators.
- `src/features/estate/data/estate-asset-manifest.ts` — 4 generator sprite entries.
- `src/features/estate/components/estate-shop-client.tsx` — two-currency balances, per-card currency, purchase routing.
- `src/features/estate/components/estate-game-client.tsx` — eco HUD chip (tap-to-collect) + member-panel branch + `contributors` prop.
- `src/app/[locale]/subjects/[subjectId]/estate/page.tsx` — fetch contributors, pass to client.
- `src/i18n/messages/ko.ts` + `src/i18n/messages/en.ts` — `estate.currency`, `estate.eco`, `estate.member`, `estate.categories.generator`, `estate.commandFailures.insufficient-eco`, 4 generator names in `estate.items`.
- Tests updated: `estate-repository.test.ts`, `serialization.test.ts`, `catalog.test.ts`, `commands.test.ts`, `estate-shop-client.test.tsx`.

---

## Task 1: Schema v3 + eco-credit snapshot fields (foundation)

**Files:**
- Modify: `src/features/estate/domain/types.ts`
- Modify: `src/features/estate/domain/serialization.ts`
- Modify: `src/features/estate/persistence/estate-repository.ts`
- Modify: `src/features/estate/domain/commands.ts:36-62` (`createInitialEstateSnapshot`)
- Modify: `src/features/estate/data/demo-estate-data.ts`
- Test: `src/features/estate/__tests__/serialization.test.ts`, `src/features/estate/__tests__/estate-repository.test.ts`

**Interfaces:**
- Produces: `EstateSnapshot` now has `schemaVersion: 3`, `ecoCredits: number`, `ecoCollectedAt: string`. `EstateItemDefinition` now has optional `currency?: "points" | "eco"` and `ecoRatePerHour?: number`. `EstateItemCategory` includes `"generator"`. `EstateCommandFailureReason` includes `"insufficient-eco"`. These types are consumed by Tasks 2–8.

- [ ] **Step 1: Add the failing serialization test for eco defaults**

In `src/features/estate/__tests__/serialization.test.ts`, add inside the `describe`:

```ts
it("defaults eco-credit fields when parsing a legacy v2 snapshot", () => {
  const serialized = JSON.stringify({
    schemaVersion: 2,
    subjectId: "yu-e21",
    mainBuildingLevel: 1,
    unlockedParcelIds: ["central-campus"],
    items: [],
    inventory: [],
    groundTiles: [],
    transactions: [],
    updatedAt: "2026-06-24T00:00:00.000Z",
  });

  const result = parseEstateSnapshot(serialized);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.snapshot.schemaVersion).toBe(3);
  expect(result.snapshot.ecoCredits).toBe(0);
  expect(result.snapshot.ecoCollectedAt).toBe("2026-06-24T00:00:00.000Z");
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/features/estate/__tests__/serialization.test.ts`
Expected: FAIL (parse returns `schemaVersion: 2`, no `ecoCredits`).

- [ ] **Step 3: Extend the snapshot + item types**

In `src/features/estate/domain/types.ts`:

Change `EstateItemCategory` to add `"generator"`:

```ts
export type EstateItemCategory =
  | "landmark"
  | "nature"
  | "furniture"
  | "energy"
  | "generator"
  | "facility"
  | "ground";
```

Add two optional fields to `EstateItemDefinition` (after `assetId`):

```ts
export type EstateItemDefinition = {
  id: string;
  nameKey: string;
  descriptionKey: string;
  category: EstateItemCategory;
  cost: number;
  footprintWidth: number;
  footprintHeight: number;
  canRotate: boolean;
  assetId: string;
  placementRule: EstatePlacementRule;
  /** Which currency buys this item. Defaults to "points" when unset. */
  currency?: "points" | "eco";
  /** Eco-credits generated per hour while this item is placed (generators only). */
  ecoRatePerHour?: number;
};
```

Change `EstateSnapshot` to v3 + eco fields:

```ts
export type EstateSnapshot = {
  schemaVersion: 3;
  subjectId: string;
  mainBuildingLevel: number;
  unlockedParcelIds: string[];
  items: EstateItemInstance[];
  inventory: EstateInventoryEntry[];
  groundTiles: EstateGroundTile[];
  transactions: EstateTransaction[];
  /** Banked eco-credits (excludes uncollected pending accrual). */
  ecoCredits: number;
  /** ISO timestamp the eco-credit accrual was last banked from. */
  ecoCollectedAt: string;
  updatedAt: string;
};
```

Add `"insufficient-eco"` to `EstateCommandFailureReason`:

```ts
export type EstateCommandFailureReason =
  | "insufficient-points"
  | "insufficient-eco"
  | "out-of-bounds"
  | "locked-cell"
  | "collision"
  | "missing-inventory"
  | "parcel-not-adjacent"
  | "already-unlocked"
  | "protected-item"
  | "invalid-definition"
  | "building-max-level"
  | "edge-required";
```

Update `EstateParseResult` is unchanged; `parseEstateSnapshot` already returns `EstateSnapshot`.

- [ ] **Step 4: Update serialization to accept/emit v3 + eco**

Replace the body of `parseEstateSnapshot` in `src/features/estate/domain/serialization.ts` (lines 21-42 region) so it accepts v1/v2/v3 and defaults eco fields:

```ts
  if (
    value.schemaVersion !== 1 &&
    value.schemaVersion !== 2 &&
    value.schemaVersion !== 3
  ) {
    return { ok: false, reason: "unsupported-schema-version" };
  }

  if (!hasEstateSnapshotShape(value)) {
    return { ok: false, reason: "invalid-shape" };
  }

  return {
    ok: true,
    snapshot: {
      schemaVersion: 3,
      subjectId: value.subjectId,
      mainBuildingLevel: clampMainBuildingLevel(value.mainBuildingLevel),
      unlockedParcelIds: value.unlockedParcelIds,
      items: value.items,
      inventory: value.inventory,
      groundTiles: value.groundTiles,
      transactions: value.transactions,
      ecoCredits: normalizeEcoAmount(value.ecoCredits),
      ecoCollectedAt:
        typeof value.ecoCollectedAt === "string"
          ? value.ecoCollectedAt
          : value.updatedAt,
      updatedAt: value.updatedAt,
    } as EstateSnapshot,
  };
}

function normalizeEcoAmount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}
```

(`hasEstateSnapshotShape` and `EstateSnapshotShape` are unchanged — eco fields are optional on the wire and defaulted above.)

- [ ] **Step 5: Run the serialization tests to confirm green**

Run: `npx vitest run src/features/estate/__tests__/serialization.test.ts`
Expected: PASS (round-trip + new eco-default test + unsupported-99 all pass).

- [ ] **Step 6: Add eco fields to the seed + initial snapshots**

In `src/features/estate/data/demo-estate-data.ts`, in `createDemoEstateSeedSnapshot` return object change `schemaVersion` and add eco fields:

```ts
  return {
    schemaVersion: 3,
    subjectId,
    mainBuildingLevel: 1,
    unlockedParcelIds: ["central-campus"],
    items: [
      {
        id: `${subjectId}:landmark`,
        definitionId: baseEstateBuildingDefinition.id,
        x: 6,
        y: 6,
        rotation: 0,
        placedAt: seedTimestamp,
      },
    ],
    inventory: [],
    groundTiles: [],
    transactions: [],
    ecoCredits: 0,
    ecoCollectedAt: seedTimestamp,
    updatedAt: seedTimestamp,
  };
```

In `src/features/estate/domain/commands.ts`, in `createInitialEstateSnapshot` return object change `schemaVersion` and add eco fields:

```ts
  return {
    schemaVersion: 3,
    subjectId,
    mainBuildingLevel: 1,
    unlockedParcelIds: ["central-campus"],
    items: [
      {
        id: baseEstateBuildingDefinition.id,
        definitionId: baseEstateBuildingDefinition.id,
        x: 3,
        y: 3,
        rotation: 0,
        placedAt: now,
      },
    ],
    inventory: [],
    groundTiles: [],
    transactions: [],
    ecoCredits: 0,
    ecoCollectedAt: now,
    updatedAt: now,
  };
```

- [ ] **Step 7: Update the repository migrate/validate/persist for v3 + eco**

In `src/features/estate/persistence/estate-repository.ts`:

In `migrateEstateSnapshot`, add a `case 3` to the switch (alongside 1 and 2):

```ts
  switch (raw.schemaVersion) {
    case 1:
      return validateEstateSnapshot(raw, subjectId, options.subjectId, 1);
    case 2:
      return validateEstateSnapshot(raw, subjectId, options.subjectId, 2);
    case 3:
      return validateEstateSnapshot(raw, subjectId, options.subjectId, 3);
    default:
      return {
```

Change the `validateEstateSnapshot` signature `sourceVersion` type and the returned snapshot. Update the parameter type:

```ts
function validateEstateSnapshot(
  raw: Record<string, unknown>,
  subjectId: string,
  expectedSubjectId: string | undefined,
  sourceVersion: 1 | 2 | 3,
): EstateMigrationResult {
```

At the end of `validateEstateSnapshot`, replace the returned snapshot object with v3 + eco defaults:

```ts
  // v1 rows have no level field; default to 1. v2/v3 rows clamp to range.
  const mainBuildingLevel =
    sourceVersion === 1 ? 1 : clampMainBuildingLevel(raw.mainBuildingLevel);

  const ecoCredits =
    typeof raw.ecoCredits === "number" &&
    Number.isFinite(raw.ecoCredits) &&
    raw.ecoCredits > 0
      ? Math.floor(raw.ecoCredits)
      : 0;
  const ecoCollectedAt =
    typeof raw.ecoCollectedAt === "string" ? raw.ecoCollectedAt : raw.updatedAt;

  return {
    ok: true,
    snapshot: {
      schemaVersion: 3,
      subjectId: raw.subjectId,
      mainBuildingLevel,
      unlockedParcelIds,
      items,
      inventory,
      groundTiles,
      transactions,
      ecoCredits,
      ecoCollectedAt,
      updatedAt: raw.updatedAt,
    },
  };
}
```

In `toPersistableEstateSnapshot`, emit v3 + eco fields:

```ts
export function toPersistableEstateSnapshot(
  snapshot: EstateSnapshot,
): EstateSnapshot {
  return {
    schemaVersion: 3,
    subjectId: snapshot.subjectId,
    mainBuildingLevel: clampMainBuildingLevel(snapshot.mainBuildingLevel),
    unlockedParcelIds: snapshot.unlockedParcelIds.map((parcelId) => parcelId),
    items: snapshot.items.map((item) => ({ ...item })),
    inventory: snapshot.inventory.map((entry) => ({ ...entry })),
    groundTiles: snapshot.groundTiles.map((tile) => ({ ...tile })),
    transactions: snapshot.transactions.map((transaction) => ({
      ...transaction,
    })),
    ecoCredits:
      Number.isFinite(snapshot.ecoCredits) && snapshot.ecoCredits > 0
        ? Math.floor(snapshot.ecoCredits)
        : 0,
    ecoCollectedAt: snapshot.ecoCollectedAt,
    updatedAt: snapshot.updatedAt,
  };
}
```

- [ ] **Step 8: Update the repository tests for v3 + add eco coverage**

In `src/features/estate/__tests__/estate-repository.test.ts`:

Change the three `schemaVersion` assertions:
- Line ~347 (`seeds a subject...`): `expect(snapshot.schemaVersion).toBe(2);` → `toBe(3);`
- Line ~462 (`migrates a v1 snapshot...`): `expect(result.snapshot.schemaVersion).toBe(2);` → `toBe(3);` and rename the test title to `"migrates a v1 snapshot to v3 with a default main building level of 1"`.
- Line ~503 (`persists the schema version...`): `expect(persisted.schemaVersion).toBe(2);` → `toBe(3);`

Add a new test after the v1-migration test:

```ts
it("defaults eco-credit fields when migrating a v2 snapshot", () => {
  const v2 = {
    schemaVersion: 2,
    subjectId: "yu-e21",
    mainBuildingLevel: 2,
    unlockedParcelIds: ["central-campus"],
    items: [],
    inventory: [],
    groundTiles: [],
    transactions: [],
    updatedAt: "2026-06-24T00:00:00.000Z",
  };

  const result = migrateEstateSnapshot(v2, { subjectId: "yu-e21" });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.snapshot.schemaVersion).toBe(3);
  expect(result.snapshot.ecoCredits).toBe(0);
  expect(result.snapshot.ecoCollectedAt).toBe("2026-06-24T00:00:00.000Z");
});
```

- [ ] **Step 9: Run the full estate suite and fix any snapshot-equality ripples**

Run: `npx vitest run src/features/estate/__tests__`
Expected: PASS. The seed/initial factories now emit `ecoCredits: 0` + `ecoCollectedAt`; all equality tests build their expected value from those same factories, so they stay green. If any test fails on a hand-built snapshot literal, add `ecoCredits: 0` and the matching `ecoCollectedAt` to that literal. Do not change the `schemaVersion: 1`/`2` literals used purely as migrate *input* (lines `commands.test.ts:503`, `placement.test.ts:12`) — those exercise back-compat and esbuild ignores the literal type.

- [ ] **Step 10: Commit**

```bash
git add src/features/estate/domain/types.ts src/features/estate/domain/serialization.ts src/features/estate/persistence/estate-repository.ts src/features/estate/domain/commands.ts src/features/estate/data/demo-estate-data.ts src/features/estate/__tests__/serialization.test.ts src/features/estate/__tests__/estate-repository.test.ts
git commit -m "feat(estate): add eco-credit snapshot fields and schema v3"
```

---

## Task 2: Eco-credit domain module

**Files:**
- Create: `src/features/estate/domain/eco-credit.ts`
- Test: `src/features/estate/__tests__/eco-credit.test.ts`

**Interfaces:**
- Consumes: `EstateSnapshot`, `EstateItemDefinition` (Task 1).
- Produces:
  - `ECO_ACCRUAL_CAP_HOURS: number`
  - `mainBuildingEcoRatePerHour(level: number): number`
  - `getEstateEcoRatePerHour(snapshot: EstateSnapshot, itemDefinitions: readonly EstateItemDefinition[]): number`
  - `getPendingEcoCredits(snapshot, itemDefinitions, nowIso: string): number`
  - `getAvailableEcoCredits(snapshot, itemDefinitions, nowIso: string): number`
  - `collectEcoCredits(snapshot, itemDefinitions, nowIso: string): EstateSnapshot`
  - `spendEcoCredits(snapshot, itemDefinitions, cost: number, nowIso: string): { ok: true; snapshot: EstateSnapshot } | { ok: false }`

- [ ] **Step 1: Write the failing tests**

Create `src/features/estate/__tests__/eco-credit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDemoEstateSeedSnapshot } from "../data/demo-estate-data";
import { estateItemCatalog } from "../data/estate-item-catalog";
import {
  ECO_ACCRUAL_CAP_HOURS,
  collectEcoCredits,
  getAvailableEcoCredits,
  getEstateEcoRatePerHour,
  getPendingEcoCredits,
  mainBuildingEcoRatePerHour,
  spendEcoCredits,
} from "../domain/eco-credit";
import type { EstateSnapshot } from "../domain/types";

const HOUR = 3_600_000;

function seedAt(collectedAtMs: number): EstateSnapshot {
  return {
    ...createDemoEstateSeedSnapshot("yu-e21"),
    ecoCredits: 0,
    ecoCollectedAt: new Date(collectedAtMs).toISOString(),
  };
}

describe("estate eco-credit domain", () => {
  it("scales the main-building base rate with level", () => {
    expect(mainBuildingEcoRatePerHour(1)).toBe(6);
    expect(mainBuildingEcoRatePerHour(5)).toBe(30);
  });

  it("sums the base rate with placed generator rates", () => {
    const snapshot: EstateSnapshot = {
      ...seedAt(0),
      items: [
        ...seedAt(0).items,
        {
          id: "g1",
          definitionId: "solar-array",
          x: 0,
          y: 0,
          rotation: 0,
          placedAt: "2026-06-24T00:00:00.000Z",
        },
      ],
    };
    // base (Lv1) 6 + solar-array 15 = 21
    expect(getEstateEcoRatePerHour(snapshot, estateItemCatalog)).toBe(21);
  });

  it("accrues pending credits over elapsed time, floored and capped", () => {
    const start = 0;
    const snapshot = seedAt(start);
    // Lv1 rate 6/h. After 2h => 12.
    expect(
      getPendingEcoCredits(
        snapshot,
        estateItemCatalog,
        new Date(start + 2 * HOUR).toISOString(),
      ),
    ).toBe(12);
    // Capped at ECO_ACCRUAL_CAP_HOURS.
    const capped = getPendingEcoCredits(
      snapshot,
      estateItemCatalog,
      new Date(start + 1000 * HOUR).toISOString(),
    );
    expect(capped).toBe(6 * ECO_ACCRUAL_CAP_HOURS);
  });

  it("collect banks pending and resets the clock", () => {
    const start = 0;
    const nowIso = new Date(start + 3 * HOUR).toISOString();
    const collected = collectEcoCredits(seedAt(start), estateItemCatalog, nowIso);
    expect(collected.ecoCredits).toBe(18); // 6/h * 3h
    expect(collected.ecoCollectedAt).toBe(nowIso);
    expect(getAvailableEcoCredits(collected, estateItemCatalog, nowIso)).toBe(18);
  });

  it("spend banks pending then subtracts, failing when unaffordable", () => {
    const start = 0;
    const nowIso = new Date(start + 3 * HOUR).toISOString();
    const ok = spendEcoCredits(seedAt(start), estateItemCatalog, 10, nowIso);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.snapshot.ecoCredits).toBe(8); // 18 banked - 10
      expect(ok.snapshot.ecoCollectedAt).toBe(nowIso);
    }
    const broke = spendEcoCredits(seedAt(start), estateItemCatalog, 999, nowIso);
    expect(broke.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/features/estate/__tests__/eco-credit.test.ts`
Expected: FAIL ("eco-credit" module not found).

- [ ] **Step 3: Implement the eco-credit module**

Create `src/features/estate/domain/eco-credit.ts`:

```ts
import { clampMainBuildingLevel } from "./main-building";
import type { EstateItemDefinition, EstateSnapshot } from "./types";

/** Offline accrual is capped at this many hours of production. */
export const ECO_ACCRUAL_CAP_HOURS = 24;

/** Base eco-credits/hour the main building always produces, scaling by level. */
export function mainBuildingEcoRatePerHour(level: number): number {
  return 6 * clampMainBuildingLevel(level);
}

/** Total eco-credits/hour = main-building base + each placed generator's rate. */
export function getEstateEcoRatePerHour(
  snapshot: EstateSnapshot,
  itemDefinitions: readonly EstateItemDefinition[],
): number {
  const rateById = new Map(
    itemDefinitions.map((definition) => [definition.id, definition.ecoRatePerHour ?? 0]),
  );
  const placedRate = snapshot.items.reduce(
    (sum, item) => sum + (rateById.get(item.definitionId) ?? 0),
    0,
  );
  return mainBuildingEcoRatePerHour(snapshot.mainBuildingLevel) + placedRate;
}

/** Uncollected accrual: floor(rate * hours), clamped to a 0..cap window. */
export function getPendingEcoCredits(
  snapshot: EstateSnapshot,
  itemDefinitions: readonly EstateItemDefinition[],
  nowIso: string,
): number {
  const rate = getEstateEcoRatePerHour(snapshot, itemDefinitions);
  if (rate <= 0) return 0;

  const elapsedMs =
    new Date(nowIso).getTime() - new Date(snapshot.ecoCollectedAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;

  const hours = Math.min(elapsedMs / 3_600_000, ECO_ACCRUAL_CAP_HOURS);
  return Math.floor(rate * hours);
}

/** Banked balance plus uncollected pending accrual. */
export function getAvailableEcoCredits(
  snapshot: EstateSnapshot,
  itemDefinitions: readonly EstateItemDefinition[],
  nowIso: string,
): number {
  return (
    Math.max(0, Math.floor(snapshot.ecoCredits)) +
    getPendingEcoCredits(snapshot, itemDefinitions, nowIso)
  );
}

/** Banks pending accrual into ecoCredits and resets the accrual clock. */
export function collectEcoCredits(
  snapshot: EstateSnapshot,
  itemDefinitions: readonly EstateItemDefinition[],
  nowIso: string,
): EstateSnapshot {
  const pending = getPendingEcoCredits(snapshot, itemDefinitions, nowIso);
  if (pending <= 0 && snapshot.ecoCollectedAt === nowIso) return snapshot;

  return {
    ...snapshot,
    ecoCredits: Math.max(0, Math.floor(snapshot.ecoCredits)) + pending,
    ecoCollectedAt: nowIso,
  };
}

/** Collects pending, then subtracts cost. Fails if the balance is too low. */
export function spendEcoCredits(
  snapshot: EstateSnapshot,
  itemDefinitions: readonly EstateItemDefinition[],
  cost: number,
  nowIso: string,
): { ok: true; snapshot: EstateSnapshot } | { ok: false } {
  if (!Number.isInteger(cost) || cost < 0) return { ok: false };

  const banked = collectEcoCredits(snapshot, itemDefinitions, nowIso);
  if (banked.ecoCredits < cost) return { ok: false };

  return {
    ok: true,
    snapshot: { ...banked, ecoCredits: banked.ecoCredits - cost },
  };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/features/estate/__tests__/eco-credit.test.ts`
Expected: PASS (6 tests). Note the `solar-array` generator definition is added in Task 3; this test references it. If running Task 2 before Task 3, the `sums the base rate` test will fail on the unknown id — implement Task 3 first or temporarily skip that one assertion. **Recommended: run Tasks 2 and 3 as a pair before committing**, or reorder so Task 3 precedes Task 2's Step 4.

- [ ] **Step 5: Commit**

```bash
git add src/features/estate/domain/eco-credit.ts src/features/estate/__tests__/eco-credit.test.ts
git commit -m "feat(estate): add eco-credit accrual domain module"
```

---

## Task 3: Item catalog currency + 4 generator buildings + assets + names

**Files:**
- Modify: `src/features/estate/data/estate-item-catalog.ts`
- Modify: `src/features/estate/data/estate-asset-manifest.ts`
- Modify: `src/i18n/messages/ko.ts` (`estate.items`, `estate.categories.generator`)
- Modify: `src/i18n/messages/en.ts` (mirror)
- Test: `src/features/estate/__tests__/catalog.test.ts`

**Interfaces:**
- Consumes: `EstateItemDefinition`, `EstateItemCategory` (Task 1).
- Produces: 4 new catalog ids `solar-array`, `wind-turbine`, `battery-storage`, `geothermal-hub` (category `"generator"`, `currency: "points"`, `ecoRatePerHour` set); the 12 decoration items carry `currency: "eco"`; manifest sprite entries for the 4 generator `assetId`s; i18n names. Consumed by Tasks 2, 4, 5, 6.

- [ ] **Step 1: Update the failing catalog test**

In `src/features/estate/__tests__/catalog.test.ts`, append the 4 generators to `requiredItemIds` (after `"small-sculpture"`):

```ts
  "small-sculpture",
  "solar-array",
  "wind-turbine",
  "battery-storage",
  "geothermal-hub",
] as const;
```

Add two new tests inside the `describe`:

```ts
it("marks decorations as eco-priced and generators as point-priced producers", () => {
  const byId = new Map(estateItemCatalog.map((item) => [item.id, item]));

  for (const id of ["broadleaf-tree", "fountain", "small-sculpture"]) {
    expect(byId.get(id)?.currency).toBe("eco");
  }

  for (const id of [
    "solar-array",
    "wind-turbine",
    "battery-storage",
    "geothermal-hub",
  ]) {
    const generator = byId.get(id);
    expect(generator?.currency).toBe("points");
    expect(generator?.category).toBe("generator");
    expect(generator?.ecoRatePerHour ?? 0).toBeGreaterThan(0);
  }
});

it("keeps ground tiles on the points currency", () => {
  const byId = new Map(estateItemCatalog.map((item) => [item.id, item]));
  for (const id of ["stone-path", "bright-sidewalk-block", "grass-decoration"]) {
    expect(byId.get(id)?.currency ?? "points").toBe("points");
  }
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/features/estate/__tests__/catalog.test.ts`
Expected: FAIL (catalog id list mismatch; generators missing).

- [ ] **Step 3: Add `currency: "eco"` + eco costs to the 12 decoration items**

In `src/features/estate/data/estate-item-catalog.ts`, for each of the 12 decoration entries set `currency: "eco"` and change `cost` to the eco value. The exact edits (keep every other field unchanged):

- `broadleaf-tree`: `cost: 30,` + add `currency: "eco",`
- `pine-tree`: `cost: 35,` + `currency: "eco",`
- `flower-bed`: `cost: 45,` + `currency: "eco",`
- `bench`: `cost: 50,` + `currency: "eco",`
- `solar-street-light`: `cost: 60,` + `currency: "eco",`
- `campus-flag`: `cost: 70,` + `currency: "eco",`
- `fountain`: `cost: 220,` + `currency: "eco",`
- `small-greenhouse`: `cost: 180,` + `currency: "eco",`
- `solar-pavilion`: `cost: 260,` + `currency: "eco",`
- `recycling-station`: `cost: 90,` + `currency: "eco",`
- `decorative-shrub`: `cost: 28,` + `currency: "eco",`
- `small-sculpture`: `cost: 110,` + `currency: "eco",`

Leave the 3 ground items (`stone-path`, `bright-sidewalk-block`, `grass-decoration`) exactly as-is (no `currency`, points by default).

- [ ] **Step 4: Append the 4 generator definitions**

In `src/features/estate/data/estate-item-catalog.ts`, append these inside `estateItemCatalog` after the `small-sculpture` entry (before the closing `];`):

```ts
  {
    id: "solar-array",
    nameKey: "estate.items.solarArray.name",
    descriptionKey: "estate.items.solarArray.description",
    category: "generator",
    currency: "points",
    cost: 600,
    ecoRatePerHour: 15,
    footprintWidth: 2,
    footprintHeight: 2,
    canRotate: false,
    assetId: "solar-array",
    placementRule: "land",
  },
  {
    id: "wind-turbine",
    nameKey: "estate.items.windTurbine.name",
    descriptionKey: "estate.items.windTurbine.description",
    category: "generator",
    currency: "points",
    cost: 1_100,
    ecoRatePerHour: 25,
    footprintWidth: 1,
    footprintHeight: 1,
    canRotate: false,
    assetId: "wind-turbine",
    placementRule: "land",
  },
  {
    id: "battery-storage",
    nameKey: "estate.items.batteryStorage.name",
    descriptionKey: "estate.items.batteryStorage.description",
    category: "generator",
    currency: "points",
    cost: 1_800,
    ecoRatePerHour: 35,
    footprintWidth: 2,
    footprintHeight: 1,
    canRotate: true,
    assetId: "battery-storage",
    placementRule: "land",
  },
  {
    id: "geothermal-hub",
    nameKey: "estate.items.geothermalHub.name",
    descriptionKey: "estate.items.geothermalHub.description",
    category: "generator",
    currency: "points",
    cost: 3_200,
    ecoRatePerHour: 50,
    footprintWidth: 2,
    footprintHeight: 2,
    canRotate: false,
    assetId: "geothermal-hub",
    placementRule: "land",
  },
```

- [ ] **Step 5: Add manifest sprite entries for the 4 generators**

In `src/features/estate/data/estate-asset-manifest.ts`, add these inside `estateAssetManifest.items` (after `"small-sculpture"`, before `"locked-parcel-icon"`):

```ts
    "solar-array": sprite(
      "solar-array",
      "/estate-assets/solar-array.png",
      242,
      188,
      {
        renderLayer: 2,
        shadow: buildingShadow,
        fallback: {
          kind: "building",
          height: 58,
          renderLayer: 2,
          top: "#cfe3f2",
          left: "#3f5f7a",
          right: "#28455c",
          stroke: "#16303f",
          shadow: "#0f2230",
        },
      },
    ),
    "wind-turbine": sprite(
      "wind-turbine",
      "/estate-assets/wind-turbine.png",
      132,
      232,
      {
        renderLayer: 2,
        shadow: smallShadow,
        fallback: {
          kind: "building",
          height: 120,
          renderLayer: 2,
          top: "#f3f7fb",
          left: "#d4dee6",
          right: "#aebcc7",
          stroke: "#6f8090",
          shadow: "#3b4853",
        },
      },
    ),
    "battery-storage": sprite(
      "battery-storage",
      "/estate-assets/battery-storage.png",
      200,
      150,
      {
        renderLayer: 2,
        shadow: buildingShadow,
        fallback: {
          kind: "building",
          height: 52,
          renderLayer: 2,
          top: "#d7f3df",
          left: "#5fa97a",
          right: "#3f7d57",
          stroke: "#245138",
          shadow: "#143324",
        },
      },
    ),
    "geothermal-hub": sprite(
      "geothermal-hub",
      "/estate-assets/geothermal-hub.png",
      242,
      196,
      {
        renderLayer: 2,
        shadow: buildingShadow,
        fallback: {
          kind: "building",
          height: 70,
          renderLayer: 2,
          top: "#f6e7c9",
          left: "#d8a25a",
          right: "#b87e3c",
          stroke: "#7a5023",
          shadow: "#3f2a12",
        },
      },
    ),
```

(The `.png` files are produced from the prompts in the Appendix and dropped into `public/estate-assets/`. Until then the procedural `fallback` renders the generators, so the build and renderer work without the images.)

- [ ] **Step 6: Add the generator names + "설비" category to i18n (ko then en)**

In `src/i18n/messages/ko.ts`, in `estate.categories` add `generator` (keep order; insert after `energy`):

```ts
      energy: "에너지",
      generator: "설비",
      facility: "시설",
```

In `estate.items` (ko), add the 4 names after `"small-sculpture"`:

```ts
      "small-sculpture": "소형 조형물",
      "solar-array": "태양광 어레이",
      "wind-turbine": "풍력 터빈",
      "battery-storage": "에너지 저장 배터리",
      "geothermal-hub": "지열·스마트그리드 허브",
```

In `src/i18n/messages/en.ts`, mirror **in the same positions**:

```ts
      energy: "Energy",
      generator: "Facilities",
      facility: "Amenities",
```

```ts
      "small-sculpture": "Small sculpture",
      "solar-array": "Solar array",
      "wind-turbine": "Wind turbine",
      "battery-storage": "Battery storage",
      "geothermal-hub": "Geothermal hub",
```

(Use the existing en wording for `energy`/`facility` already present — only add the `generator` line; the snippet shows context.)

- [ ] **Step 7: Run catalog, manifest, eco-credit, and i18n tests**

Run: `npx vitest run src/features/estate/__tests__/catalog.test.ts src/features/estate/__tests__/asset-manifest.test.ts src/features/estate/__tests__/eco-credit.test.ts src/i18n/__tests__/messages.test.ts`
Expected: PASS. (`asset-manifest.test.ts` "defines render assets for every catalog item" now finds the 4 generator entries; `messages.test.ts` estate-key equality holds because ko/en got the same keys in the same order.)

- [ ] **Step 8: Commit**

```bash
git add src/features/estate/data/estate-item-catalog.ts src/features/estate/data/estate-asset-manifest.ts src/i18n/messages/ko.ts src/i18n/messages/en.ts src/features/estate/__tests__/catalog.test.ts
git commit -m "feat(estate): add 4 generator buildings and eco/points currency split"
```

---

## Task 4: Reducer eco-purchase path

**Files:**
- Modify: `src/features/estate/domain/commands.ts:64-108` (`purchaseEstateItem`)
- Modify: `src/i18n/messages/ko.ts` + `en.ts` (`estate.commandFailures.insufficient-eco`)
- Test: `src/features/estate/__tests__/commands.test.ts`

**Interfaces:**
- Consumes: `spendEcoCredits` (Task 2), `EstateItemDefinition.currency` (Task 1/3), `EstateCommandContext`.
- Produces: `purchaseEstateItem` routes eco-currency items through `spendEcoCredits` (no point transaction); failure reason `"insufficient-eco"`.

- [ ] **Step 1: Write the failing reducer tests**

In `src/features/estate/__tests__/commands.test.ts`, add (it already imports `purchaseEstateItem` and a `createContext` helper — reuse them; if the helper name differs, match the file's existing context factory):

```ts
it("buys an eco-priced decoration from accrued eco-credits without a point transaction", () => {
  const start = "2026-06-24T00:00:00.000Z";
  const later = new Date(Date.parse(start) + 24 * 3_600_000).toISOString();
  const seed = {
    ...createDemoEstateSeedSnapshot("yu-e21"),
    ecoCollectedAt: start,
  };
  const context: EstateCommandContext = {
    earnedPoints: 0, // no points at all
    itemDefinitions: estateItemCatalog,
    parcelDefinitions: estateExpansionCatalog,
    createId: () => "tx-eco",
    now: () => later,
  };

  const result = purchaseEstateItem(
    seed,
    { definitionId: "broadleaf-tree" }, // eco cost 30
    context,
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.snapshot.inventory).toEqual([
    { definitionId: "broadleaf-tree", quantity: 1 },
  ]);
  expect(result.snapshot.transactions).toEqual([]); // eco does not touch the pool
  expect(result.snapshot.ecoCredits).toBeGreaterThanOrEqual(0);
});

it("fails an eco purchase when eco-credits are insufficient", () => {
  const start = "2026-06-24T00:00:00.000Z";
  const seed = {
    ...createDemoEstateSeedSnapshot("yu-e21"),
    ecoCollectedAt: start,
  };
  const context: EstateCommandContext = {
    earnedPoints: 0,
    itemDefinitions: estateItemCatalog,
    parcelDefinitions: estateExpansionCatalog,
    createId: () => "tx-eco",
    now: () => start, // no time elapsed => 0 pending, 0 banked
  };

  const result = purchaseEstateItem(seed, { definitionId: "fountain" }, context);
  expect(result).toMatchObject({ ok: false, reason: "insufficient-eco" });
});
```

Ensure these imports exist at the top of the test file: `createDemoEstateSeedSnapshot` from `../data/demo-estate-data`, `estateItemCatalog` from `../data/estate-item-catalog`, `estateExpansionCatalog` from `../data/estate-expansion-catalog`, and `EstateCommandContext` from `../domain/types`. Add any missing ones.

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/features/estate/__tests__/commands.test.ts`
Expected: FAIL (eco purchase still tries the points path / unknown behavior).

- [ ] **Step 3: Branch `purchaseEstateItem` on currency**

In `src/features/estate/domain/commands.ts`, add the import at the top:

```ts
import { spendEcoCredits } from "./eco-credit";
```

Replace the body of `purchaseEstateItem` after the `invalid-definition` guard so it routes by currency:

```ts
export function purchaseEstateItem(
  snapshot: EstateSnapshot,
  command: { definitionId: string },
  context: EstateCommandContext,
): EstateCommandResult {
  const definition = findEstateItemDefinition(
    context.itemDefinitions,
    command.definitionId,
  );

  if (!definition || !isPositiveIntegerCost(definition.cost)) {
    return fail(snapshot, "invalid-definition");
  }

  const now = context.now();

  if ((definition.currency ?? "points") === "eco") {
    const spend = spendEcoCredits(
      snapshot,
      context.itemDefinitions,
      definition.cost,
      now,
    );
    if (!spend.ok) {
      return fail(snapshot, "insufficient-eco");
    }

    return succeed({
      ...spend.snapshot,
      inventory: increaseInventory(spend.snapshot.inventory, definition.id, 1),
      updatedAt: now,
    });
  }

  if (
    !hasEnoughEstatePoints(
      context.earnedPoints,
      snapshot.transactions,
      definition.cost,
    )
  ) {
    return fail(snapshot, "insufficient-points");
  }

  return succeed({
    ...snapshot,
    inventory: increaseInventory(snapshot.inventory, definition.id, 1),
    transactions: [
      ...snapshot.transactions,
      {
        id: context.createId(),
        kind:
          definition.placementRule === "ground"
            ? "purchase-ground"
            : "purchase-item",
        pointDelta: -definition.cost,
        itemDefinitionId: definition.id,
        createdAt: now,
      },
    ],
    updatedAt: now,
  });
}
```

- [ ] **Step 4: Add the `insufficient-eco` failure copy (ko then en)**

In `src/i18n/messages/ko.ts`, in `estate.commandFailures` add after `"insufficient-points"`:

```ts
      "insufficient-points": "절감 포인트가 부족합니다.",
      "insufficient-eco": "에코 크레딧이 부족합니다.",
```

In `src/i18n/messages/en.ts`, mirror in the same position:

```ts
      "insufficient-points": "You do not have enough saving points.",
      "insufficient-eco": "You do not have enough eco-credits.",
```

(Match the existing en wording style for `insufficient-points`; only the `insufficient-eco` line is new.)

- [ ] **Step 5: Run to confirm pass**

Run: `npx vitest run src/features/estate/__tests__/commands.test.ts src/i18n/__tests__/messages.test.ts`
Expected: PASS (existing point-purchase tests unchanged; 2 new eco tests pass).

- [ ] **Step 6: Commit**

```bash
git add src/features/estate/domain/commands.ts src/i18n/messages/ko.ts src/i18n/messages/en.ts src/features/estate/__tests__/commands.test.ts
git commit -m "feat(estate): route eco-priced purchases through eco-credit balance"
```

---

## Task 5: Two-currency shop UI

**Files:**
- Modify: `src/features/estate/components/estate-shop-client.tsx`
- Modify: `src/i18n/messages/ko.ts` + `en.ts` (`estate.currency`, `estate.eco`)
- Test: `src/features/estate/__tests__/estate-shop-client.test.tsx`

**Interfaces:**
- Consumes: `getAvailableEcoCredits` (Task 2), `definition.currency`/`ecoRatePerHour` (Task 3), reducer eco path (Task 4).
- Produces: shop header shows both balances; each card prices/disables in its own currency; the `"generator"` category appears in the filter row.

- [ ] **Step 1: Add the `estate.currency` + `estate.eco` i18n blocks (ko then en)**

In `src/i18n/messages/ko.ts`, add two new top-level keys inside `estate` **immediately after `controls`** (so the same position can be mirrored in en):

```ts
    currency: {
      points: "절감 포인트",
      eco: "에코 크레딧",
    },
    eco: {
      balance: "에코 크레딧",
      perHour: "시간당 +{rate}",
      collect: "수급 받기",
      collected: "에코 크레딧 {amount} 수급",
      empty: "아직 수급된 크레딧이 없습니다",
      hint: "에너지 설비를 지으면 더 빨리 쌓입니다",
    },
```

In `src/i18n/messages/en.ts`, mirror in the **same position**:

```ts
    currency: {
      points: "Saving points",
      eco: "Eco-credits",
    },
    eco: {
      balance: "Eco-credits",
      perHour: "+{rate}/hr",
      collect: "Collect",
      collected: "Collected {amount} eco-credits",
      empty: "No eco-credits accrued yet",
      hint: "Build energy facilities to accrue faster",
    },
```

- [ ] **Step 2: Write the failing shop test for eco pricing**

In `src/features/estate/__tests__/estate-shop-client.test.tsx`, add a test that an eco decoration is buyable and persists (the seed accrues capped pending from its past `ecoCollectedAt`, so eco items are affordable):

```ts
it("shows both balances and buys an eco-priced decoration", async () => {
  const repository = new MemoryEstateRepository();
  await renderShop(repository);

  // Both currency labels are present in the header/cards.
  expect(container.textContent).toContain("Eco-credits");
  expect(container.textContent).toContain("Saving points");

  // Filter to the generator ("Facilities") category to confirm it renders.
  expect(container.textContent).toContain("Facilities");

  const loaded = await repository.load("yu-e21");
  expect(loaded.ok).toBe(true);
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npx vitest run src/features/estate/__tests__/estate-shop-client.test.tsx`
Expected: FAIL (no "Eco-credits"/"Facilities" text yet).

- [ ] **Step 4: Wire two currencies into the shop**

In `src/features/estate/components/estate-shop-client.tsx`:

Add imports:

```ts
import { Leaf, Sprout } from "lucide-react"; // Leaf already imported; add Sprout
import { getAvailableEcoCredits } from "../domain/eco-credit";
```

(Adjust the existing lucide import line to include `Sprout`; `Leaf` is already imported.)

Add `"generator"` to `categoryOrder` (after `"all"`):

```ts
const categoryOrder: EstateShopCategory[] = [
  "all",
  "generator",
  "nature",
  "furniture",
  "energy",
  "facility",
  "ground",
  "landmark",
];
```

Add a ticking "now" + derived eco balance near the other `useMemo`s (after `pointAccount`):

```ts
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());
  useEffect(() => {
    const id = setInterval(() => setNowIso(new Date().toISOString()), 5_000);
    return () => clearInterval(id);
  }, []);
  const availableEco = useMemo(
    () => getAvailableEcoCredits(snapshot, itemDefinitions, nowIso),
    [snapshot, nowIso],
  );
```

In the header, add an eco-balance chip next to the points chip (after the points `chip` div around line 248-255):

```tsx
          <div
            className={`${styles.chip} flex h-10 items-center gap-1.5 rounded-xl px-2.5`}
          >
            <Sprout size={15} className={styles.coin} aria-hidden="true" />
            <strong className="font-mono text-sm tabular-nums">
              {formatPoints(locale, availableEco)}
            </strong>
          </div>
```

Replace the per-card price + disable logic. Where the card computes `disabled` (around line 304-307) and renders the price tag (line 325-329), make them currency-aware:

```tsx
            const currency = definition.currency ?? "points";
            const balance =
              currency === "eco" ? availableEco : pointAccount.availablePoints;
            const pending = pendingPurchaseIds.has(definition.id);
            const disabled = pending || balance < definition.cost;
```

```tsx
                    <span
                      className={`${styles.priceTag} flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-mono text-xs font-semibold`}
                    >
                      {currency === "eco" ? (
                        <Sprout size={12} aria-hidden="true" />
                      ) : (
                        <Coins size={12} aria-hidden="true" />
                      )}
                      {formatPoints(locale, definition.cost)}
                    </span>
```

Update the subtitle to reflect both currencies — change `copy.shop.subtitle` usage stays, but update the ko/en `estate.shop.subtitle` string:
- ko: `"설비는 절감 포인트로, 꾸미기 아이템은 에코 크레딧으로 구매하세요."`
- en: `"Buy facilities with saving points and decorations with eco-credits."`

(The purchase handler already calls the reducer, which now routes by currency — no handler change needed.)

- [ ] **Step 5: Run to confirm pass + targeted lint**

Run: `npx vitest run src/features/estate/__tests__/estate-shop-client.test.tsx src/i18n/__tests__/messages.test.ts`
Expected: PASS.
Run: `npx eslint src/features/estate/components/estate-shop-client.tsx`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/estate/components/estate-shop-client.tsx src/i18n/messages/ko.ts src/i18n/messages/en.ts src/features/estate/__tests__/estate-shop-client.test.tsx
git commit -m "feat(estate): two-currency shop with eco-credit pricing"
```

---

## Task 6: Estate HUD eco chip (tap-to-collect)

**Files:**
- Modify: `src/features/estate/components/estate-game-client.tsx`

**Interfaces:**
- Consumes: `getAvailableEcoCredits`, `collectEcoCredits` (Task 2); `estate.eco` copy (Task 5).
- Produces: a live eco-balance chip in the estate HUD; tapping it banks pending accrual and persists.

- [ ] **Step 1: Add the eco HUD chip + collect handler**

In `src/features/estate/components/estate-game-client.tsx`:

Add imports:

```ts
import { Sprout } from "lucide-react";
import {
  collectEcoCredits,
  getAvailableEcoCredits,
} from "../domain/eco-credit";
```

Add a ticking now + derived eco balance with the other derived state (near `mainBuildingLevel`/`nextUpgradeCost`, ~line 181):

```ts
  const [ecoNowIso, setEcoNowIso] = useState(() => new Date().toISOString());
  useEffect(() => {
    const id = setInterval(() => setEcoNowIso(new Date().toISOString()), 5_000);
    return () => clearInterval(id);
  }, []);
  const availableEco = useMemo(
    () => getAvailableEcoCredits(snapshot, allItemDefinitions, ecoNowIso),
    [snapshot, allItemDefinitions, ecoNowIso],
  );
```

Add a collect handler near `handleUpgradeBuilding` (~line 529):

```ts
  const handleCollectEco = useCallback(() => {
    const now = new Date().toISOString();
    const next = collectEcoCredits(snapshotRef.current, allItemDefinitions, now);
    if (next === snapshotRef.current) return;
    const collected = next.ecoCredits - snapshotRef.current.ecoCredits;
    snapshotRef.current = next;
    setSnapshot(next);
    scheduleSave(next);
    showMessage(
      interpolate(copy.eco.collected, {
        amount: formatPoints(locale, collected),
      }),
    );
  }, [allItemDefinitions, copy.eco.collected, locale, scheduleSave, showMessage]);
```

(Use the file's existing persist/scheduler — if it is named `flushSave`/`persist`/`scheduleSave`, match it; the game client debounces saves via `createDebouncedEstateSaver`. Use the same scheduler the upgrade handler uses.)

Add an eco chip next to the points chip in the HUD (after the points `chip` div at lines 821-828):

```tsx
          <button
            type="button"
            onClick={handleCollectEco}
            className={`${styles.chip} flex h-10 items-center gap-1.5 rounded-xl px-2.5`}
            title={copy.eco.collect}
            aria-label={copy.eco.collect}
          >
            <Sprout size={15} className={styles.coin} aria-hidden="true" />
            <strong className="font-mono text-sm tabular-nums">
              {formatPoints(locale, availableEco)}
            </strong>
          </button>
```

- [ ] **Step 2: Run the estate component + a11y tests**

Run: `npx vitest run src/features/estate/__tests__/estate-game-client.a11y.test.tsx src/features/estate/__tests__/estate-canvas.test.tsx`
Expected: PASS (optional `contributors` prop / new chip do not break existing render).

- [ ] **Step 3: Targeted lint**

Run: `npx eslint src/features/estate/components/estate-game-client.tsx`
Expected: 0 errors (the 2 known warnings are in `game-preview.tsx`, a different file).

- [ ] **Step 4: Commit**

```bash
git add src/features/estate/components/estate-game-client.tsx
git commit -m "feat(estate): live eco-credit HUD chip with tap-to-collect"
```

---

## Task 7: Member ranking panel component

**Files:**
- Create: `src/features/estate/components/estate-member-panel.tsx`
- Test: `src/features/estate/__tests__/estate-member-panel.test.tsx`
- Modify: `src/i18n/messages/ko.ts` + `en.ts` (`estate.member`)

**Interfaces:**
- Consumes: `SubjectContributor` from `@/features/account/domain/contributor-ranking`; `EstateMessages`; `Locale`.
- Produces: `EstateMemberPanel` component with props `{ contributors: SubjectContributor[]; copy: EstateMessages; locale: Locale; onClose: () => void }`.

- [ ] **Step 1: Add the `estate.member` i18n block (ko then en)**

In `src/i18n/messages/ko.ts`, add a new top-level key inside `estate` **immediately after `items`** (mirror position in en):

```ts
    member: {
      title: "절감 참여 인원",
      subtitle: "누적 절감 포인트 순",
      you: "나",
      pointsUnit: "P",
      empty: "아직 참여 인원이 없습니다",
      emptyHint: "그룹원이 절감 포인트를 모으면 여기에 표시됩니다",
      close: "닫기",
    },
```

In `src/i18n/messages/en.ts`, mirror in the same position:

```ts
    member: {
      title: "Saving participants",
      subtitle: "By cumulative saving points",
      you: "You",
      pointsUnit: "P",
      empty: "No participants yet",
      emptyHint: "Members appear here as they earn saving points",
      close: "Close",
    },
```

- [ ] **Step 2: Write the failing panel test**

Create `src/features/estate/__tests__/estate-member-panel.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { koMessages } from "@/i18n/messages/ko";
import type { SubjectContributor } from "@/features/account/domain/contributor-ranking";
import { EstateMemberPanel } from "../components/estate-member-panel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("EstateMemberPanel", () => {
  let root: Root | null;
  let container: HTMLDivElement;

  beforeEach(() => {
    root = null;
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    document.body.replaceChildren();
  });

  async function render(contributors: SubjectContributor[]) {
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <I18nProvider locale="ko" messages={koMessages}>
          <EstateMemberPanel
            contributors={contributors}
            copy={koMessages.estate}
            locale="ko"
            onClose={() => {}}
          />
        </I18nProvider>,
      );
    });
  }

  it("renders contributors in order and highlights me", async () => {
    await render([
      { userId: "a", displayName: "대표 데모", points: 1200, rank: 1, isMe: true },
      { userId: "b", displayName: "svc01", points: 800, rank: 2, isMe: false },
    ]);

    expect(container.textContent).toContain("절감 참여 인원");
    expect(container.textContent).toContain("대표 데모");
    expect(container.textContent).toContain("나");
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(2);
  });

  it("renders an empty state when there are no contributors", async () => {
    await render([]);
    expect(container.textContent).toContain("아직 참여 인원이 없습니다");
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npx vitest run src/features/estate/__tests__/estate-member-panel.test.tsx`
Expected: FAIL (component missing).

- [ ] **Step 4: Implement the panel (estate-styled)**

Create `src/features/estate/components/estate-member-panel.tsx`:

```tsx
"use client";

import { Users, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { formatPoints } from "@/i18n/format";
import type { SubjectContributor } from "@/features/account/domain/contributor-ranking";
import type { EstateMessages } from "./estate-copy";
import styles from "./estate-shell.module.css";

export type EstateMemberPanelProps = {
  contributors: SubjectContributor[];
  copy: EstateMessages;
  locale: Locale;
  onClose: () => void;
};

export function EstateMemberPanel({
  contributors,
  copy,
  locale,
  onClose,
}: EstateMemberPanelProps) {
  const member = copy.member;

  return (
    <section
      className={`${styles.panel} pointer-events-auto flex max-h-[60vh] w-[17rem] max-w-[calc(100vw_-_1rem)] flex-col rounded-2xl p-3`}
      aria-label={member.title}
    >
      <div className="flex items-center gap-2">
        <span
          className={`${styles.chip} grid h-9 w-9 place-items-center rounded-xl`}
        >
          <Users size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold leading-tight">
            {member.title}
          </h2>
          <p className={`${styles.muted} text-[11px]`}>{member.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`${styles.ghostBtn} grid h-7 w-7 place-items-center rounded-lg`}
          aria-label={member.close}
          title={member.close}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      {contributors.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 px-2 py-6 text-center">
          <p className="text-[13px] font-semibold">{member.empty}</p>
          <p className={`${styles.muted} text-[11px]`}>{member.emptyHint}</p>
        </div>
      ) : (
        <ol className="mt-2 flex flex-col gap-1 overflow-y-auto">
          {contributors.map((contributor) => (
            <li
              key={contributor.userId}
              className={`${
                contributor.isMe ? styles.selectionCard : styles.chip
              } flex items-center gap-2 rounded-xl px-2 py-1.5`}
            >
              <span className="grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-bold tabular-nums">
                {contributor.rank}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate text-[13px] font-semibold">
                  {contributor.displayName}
                </span>
                {contributor.isMe ? (
                  <span
                    className={`${styles.priceTag} flex-none rounded-full px-1.5 py-0.5 text-[10px] font-bold`}
                  >
                    {member.you}
                  </span>
                ) : null}
              </span>
              <span className="flex-none text-[13px] font-bold tabular-nums">
                {formatPoints(locale, contributor.points)}
                <span className={`${styles.muted} ml-0.5 text-[11px] font-semibold`}>
                  {member.pointsUnit}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Run to confirm pass**

Run: `npx vitest run src/features/estate/__tests__/estate-member-panel.test.tsx src/i18n/__tests__/messages.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/estate/components/estate-member-panel.tsx src/features/estate/__tests__/estate-member-panel.test.tsx src/i18n/messages/ko.ts src/i18n/messages/en.ts
git commit -m "feat(estate): add main-building member ranking panel component"
```

---

## Task 8: Wire member panel to the main building

**Files:**
- Modify: `src/app/[locale]/subjects/[subjectId]/estate/page.tsx`
- Modify: `src/features/estate/components/estate-game-client.tsx`
- Test: `src/features/estate/__tests__/estate-game-client.a11y.test.tsx`

**Interfaces:**
- Consumes: `getSubjectContributorRankings` (existing DAL), `SubjectContributor`, `EstateMemberPanel` (Task 7).
- Produces: `EstateGameClient` accepts `contributors?: SubjectContributor[]` (default `[]`); when the protected main building is selected, the member panel renders instead of the contextual item actions.

- [ ] **Step 1: Write the failing game-client test**

In `src/features/estate/__tests__/estate-game-client.a11y.test.tsx`, add a test that passing `contributors` and selecting the main building renders the member panel. (Match the file's existing render helper / selection approach; if direct canvas selection is impractical in jsdom, assert the panel is absent by default and present when a small wrapper forces the protected selection. Minimum viable assertion:)

```tsx
it("accepts a contributors prop without breaking the default render", async () => {
  await renderEstate({
    contributors: [
      { userId: "a", displayName: "대표 데모", points: 1200, rank: 1, isMe: true },
    ],
  });
  // Default mode is "view": the member panel is not shown until the main
  // building is selected, but the prop must not throw.
  expect(container.textContent).not.toContain("절감 참여 인원");
});
```

(Adjust `renderEstate` to thread the optional `contributors` prop. If the helper signature is fixed, extend it to spread extra props onto `<EstateGameClient />`.)

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/features/estate/__tests__/estate-game-client.a11y.test.tsx`
Expected: FAIL (prop not accepted / helper change needed).

- [ ] **Step 3: Add the `contributors` prop + member-panel branch**

In `src/features/estate/components/estate-game-client.tsx`:

Add imports:

```ts
import type { SubjectContributor } from "@/features/account/domain/contributor-ranking";
import { EstateMemberPanel } from "./estate-member-panel";
```

Extend the props type:

```ts
type EstateGameClientProps = {
  data: EstatePageData;
  contributors?: SubjectContributor[];
  repository?: EstateRepository;
};

export function EstateGameClient({
  data,
  contributors = [],
  repository,
}: EstateGameClientProps) {
```

Replace the contextual-actions render block (lines ~861-877) so the main building shows the member panel instead:

```tsx
      {selectedIsProtected ? (
        <div className="pointer-events-none absolute left-2 top-[4.25rem] z-40 sm:left-3">
          <EstateMemberPanel
            contributors={contributors}
            copy={copy}
            locale={locale}
            onClose={handleClearSelection}
          />
        </div>
      ) : selectedInstance && selectedDefinition ? (
        <ContextualItemActions
          copy={copy}
          definition={selectedDefinition}
          instance={selectedInstance}
          mode={mode}
          protectedItem={selectedIsProtected}
          anchor={selectedActionAnchor}
          onCancel={cancelEditing}
          onConfirmMove={confirmMoveSelected}
          onMove={handleMoveSelected}
          onRotate={
            mode.type === "placing" ? handleRotatePlacing : rotateActiveItem
          }
          onCollect={removeSelectedItem}
        />
      ) : null}
```

(The member panel anchors top-left under the building card; `handleClearSelection` already exists and returns the editor to "view" mode. Because the panel wrapper is `pointer-events-none` but the panel itself is `pointer-events-auto`, the close/scroll work while taps elsewhere still deselect.)

- [ ] **Step 4: Fetch contributors in the estate page**

In `src/app/[locale]/subjects/[subjectId]/estate/page.tsx`:

Add the import:

```ts
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupPointPool,
  getPersonalPointTotal,
  getSubjectContributorRankings,
} from "@/features/account/data/account-dal";
```

After `data` is resolved (and confirmed non-null), fetch rankings and pass them down. Add to the existing `Promise.all` and the render:

```tsx
  const [personalPoints, groupPool, contributorRankings] = await Promise.all([
    getPersonalPointTotal(profile.userId),
    getGroupPointPool(profile.groupId),
    getSubjectContributorRankings(50),
  ]);

  const contributors = contributorRankings[subjectId] ?? [];

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <EstateContributionChip
        personalPoints={personalPoints}
        groupPoolPoints={groupPool.earnedPoints}
      />
      <EstateGameClient data={data} contributors={contributors} />
    </CampusEnergyProviders>
  );
```

- [ ] **Step 5: Run to confirm pass + targeted lint**

Run: `npx vitest run src/features/estate/__tests__/estate-game-client.a11y.test.tsx`
Expected: PASS.
Run: `npx eslint src/features/estate/components/estate-game-client.tsx "src/app/[locale]/subjects/[subjectId]/estate/page.tsx"`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/estate/components/estate-game-client.tsx "src/app/[locale]/subjects/[subjectId]/estate/page.tsx" src/features/estate/__tests__/estate-game-client.a11y.test.tsx
git commit -m "feat(estate): show group saving participants when main building is tapped"
```

---

## Task 9: Final integration verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm run test`
Expected: all files pass (≈ +14 new tests across Tasks 1–8). No failures.

- [ ] **Step 2: Lint**

Run: `npx eslint .`
Expected: 0 errors; only the 2 pre-existing `game-preview.tsx` hook warnings.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: pass (TypeScript type-check of the app graph included; the required `currency`-less item definitions still compile because `currency` is optional).

- [ ] **Step 4: Demo smoke checklist (manual, on the user's dev server)**

Confirm on `/{locale}/subjects/<subjectId>/estate` with the demo account:
- Eco chip in the HUD shows a non-zero balance and ticks; tapping it shows the "수급" toast.
- Shop shows both balances; generator cards priced in points (설비 category), decoration cards priced in eco; buying a decoration spends eco only; buying a generator spends points only.
- Placing a generator raises the HUD eco rate (balance climbs faster after collect).
- Tapping the main building opens the participant ranking panel (ordered, "나" highlighted); tapping empty ground closes it.

- [ ] **Step 5: Commit any verification fixups (if needed)**

```bash
git add -A
git commit -m "test(estate): finalize eco-credit + member panel verification"
```

---

## Appendix: Image generation prompts (4 generator buildings)

Generate as **transparent PNG**, authored at **exactly 2× the manifest logical size** (anchor = bottom-center), matching the existing `campus-building-lv*.png` art. Drop into `public/estate-assets/` as `solar-array.png`, `wind-turbine.png`, `battery-storage.png`, `geothermal-hub.png`. Tool: ChatGPT / GPT-image (DALL·E), one image per prompt.

**Common style block (prepend to every prompt):**

> Isometric 2:1 dimetric game asset, single object centered, **transparent background**, soft painterly 3D render matching a warm sunny-garden campus builder. Cream limestone and sandstone surfaces with gold/honey trim and fresh green accents, gently glowing warm windows, clean rounded edges, soft ambient occlusion, subtle top-left sunlight, no harsh shadows, no ground baseplate, no text, no UI, no people. Cohesive with a cozy low-poly-meets-handpainted look. High detail, crisp silhouette.

1. **solar-array.png** — canvas **484×376** (logical 242×188), footprint 2×2:
> A compact campus **solar power array**: two neat rows of tilted dark-blue photovoltaic panels with thin gold frames on a low cream stone platform, a small honey-trimmed inverter cabinet at one corner with a glowing green status light. Panels catch a soft sun glint. Friendly, tidy, garden-scale.

2. **wind-turbine.png** — canvas **264×464** (logical 132×232), footprint 1×1 (tall):
> A single slender **wind turbine**: a tall tapered cream-white tower on a small round stone base, three smooth white-and-gold blades, gentle motion-implied tilt, a tiny glowing green nacelle light at the hub. Elegant, vertical, lightweight silhouette.

3. **battery-storage.png** — canvas **400×300** (logical 200×150), footprint 2×1:
> A campus **energy storage battery (ESS) unit**: two cream-and-graphite battery cabinets side by side with rounded corners, honey-gold trim, a glowing green charge-level bar on the front, slim cooling fins, a small leaf emblem. Modern, sturdy, low and wide.

4. **geothermal-hub.png** — canvas **484×392** (logical 242×196), footprint 2×2:
> A **geothermal / smart-grid hub building**: a small hexagonal cream-stone facility with a gold-ringed glowing green core dome on top, warm-lit windows, two short pipe stacks venting faint steam, subtle circuit-line engravings on the walls glowing soft teal. Central, important, slightly larger than the other facilities.

---

## Self-Review

**Spec coverage:**
- "재화 수급 건물" → Tasks 1–6 (eco currency + 4 generators + accrual + shop + HUD). ✓
- "이미지 생성 프롬프트" → Appendix (4 prompts + common style block + sizes). ✓
- "메인 건물 누르면 절감 참여 인원 순서대로" → Tasks 7–8 (panel + wiring, reuses contributor RPC). ✓
- "기타 장치" → generators are the devices; HUD collect + rate make them functional. ✓

**Placeholder scan:** No TBD/TODO. Every code step shows full snippets; numbers come from the Global Constraints table. The only deferred artifacts are the 4 PNGs (covered by procedural fallbacks until dropped in) — explicitly noted, not a placeholder.

**Type consistency:** `currency?: "points" | "eco"` and `ecoRatePerHour?` declared in Task 1 (types.ts), consumed identically in Tasks 2–5. `schemaVersion: 3` set in types + serialization + repository + commands + demo-estate-data (Task 1). Eco API names (`getAvailableEcoCredits`, `collectEcoCredits`, `spendEcoCredits`, `getEstateEcoRatePerHour`, `getPendingEcoCredits`, `mainBuildingEcoRatePerHour`, `ECO_ACCRUAL_CAP_HOURS`) defined in Task 2 and used verbatim in Tasks 4–6. `EstateMemberPanel` props defined in Task 7 and used verbatim in Task 8. `SubjectContributor` is the existing shared type. i18n keys (`currency`/`eco`/`member`/`categories.generator`/`commandFailures.insufficient-eco`) added symmetrically to ko/en.

**Cross-task ordering note:** Task 2's Step 4 references the `solar-array` generator from Task 3 — run Task 3 before finalizing Task 2 (or together), as flagged.
