# Estate Main Building Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the estate a single leveled "main building" that starts at Lv.1 and can be upgraded by spending pooled points (visual prestige only), and replace the cluttered starter garden with a clean Lv.1-building-on-grass initial state, with new escalating per-level building art.

**Architecture:** The main building stays a single protected item (`base-campus-building`) but the estate snapshot gains a `mainBuildingLevel: number` field (schema bumped v1→v2 with migration). A new `upgrade-main-building` command spends points via a negative `upgrade-building` transaction — flowing through the existing server-authoritative `save_estate` net-spend validation, so **no Supabase migration is needed**. The renderer maps the building instance to a per-level sprite (`campus-building-lv1..5`); a floating DOM card is the upgrade affordance. The starter seed is stripped to just the centered Lv.1 building.

**Tech Stack:** Next.js 16 / React 19 / TypeScript, isometric HTML-canvas renderer, Vitest + Testing Library, hand-authored SVG sprites, Tailwind v4 + CSS-module estate tokens, i18n (ko/en) dictionaries.

**Confirmed product decisions (2026-06-27, via AskUserQuestion):**
1. Leveling is **visual prestige only** — no content gating, no economy bonus.
2. Initial estate = **Lv.1 building on clean grass** (remove all seed trees/benches/fountain/flowers/lamps/paths).
3. Decoration items are removed **from the seed only** — they stay purchasable in the shop; the item catalog, item assets, and item i18n are untouched.
4. **5 levels, fixed 2×2 footprint** — growth is shown via taller, more detailed art (no footprint change, no collision logic). Upgrades are **instant point spend** (no build timers).

**Economy / persistence notes (read before starting):**
- `toPersistableEstateSnapshot` (in `estate-repository.ts`) hardcodes the snapshot shape and **drops any field not explicitly listed** — it MUST be updated to carry `schemaVersion: 2` and `mainBuildingLevel`, or the level silently disappears on save.
- `validateTransactions` + `isEstateTransactionKind` (same file) only accept `purchase-item`/`purchase-ground`/`unlock-parcel`. The new `upgrade-building` kind MUST be added in both the repository validator and `serialization.ts`, or any saved snapshot containing it fails validation and bounces back to the seed.
- The `estate release quality gates` test asserts `enMessages.estate` and `koMessages.estate` have **identical leaf paths** — every new i18n key MUST be added to both `ko.ts` and `en.ts`.
- Keep the seed building's instance id as `"<subjectId>:landmark"` — `estate-canvas.test.tsx` and `isometric-renderer-scene.test.ts` reference `yu-e21:landmark`.

---

## File Structure

**New files**
- `src/features/estate/domain/main-building.ts` — pure level/cost/asset helpers (single source of truth for level constants).
- `src/features/estate/__tests__/main-building.test.ts` — unit tests for the helpers.
- `src/features/estate/components/estate-building-card.tsx` — floating "main building" upgrade card (DOM).
- `src/features/estate/__tests__/estate-building-card.test.tsx` — component tests.
- `public/estate-assets/campus-building-lv1.svg` … `campus-building-lv5.svg` — 5 escalating building sprites.

**Modified files**
- `src/features/estate/domain/types.ts` — `EstateSnapshot.schemaVersion: 2` + `mainBuildingLevel`; `EstateTransaction.kind` += `"upgrade-building"`; `EstateCommandFailureReason` += `"building-max-level"`; new `EstateUpgradeMainBuildingCommand` in `EstateCommand`.
- `src/features/estate/domain/commands.ts` — `upgradeMainBuilding()` + reducer case; `createInitialEstateSnapshot` gains v2 + `mainBuildingLevel: 1`.
- `src/features/estate/data/demo-estate-data.ts` — strip seed to the single centered Lv.1 building.
- `src/features/estate/domain/serialization.ts` — accept/upgrade v1→v2; validate `mainBuildingLevel`.
- `src/features/estate/persistence/estate-repository.ts` — migrate v1→v2; validate v2 + `upgrade-building`; persist level.
- `src/features/estate/data/estate-asset-manifest.ts` — register 5 leveled sprites + required ids.
- `src/features/estate/isometric/renderer.ts` — map the main building to its leveled sprite; expose `mainBuildingLevel`; draw a level badge.
- `src/features/estate/components/estate-game-client.tsx` — upgrade handler + render the building card.
- `src/i18n/messages/ko.ts` & `src/i18n/messages/en.ts` — `estate.building.*`, `estate.messages.upgraded`, `estate.commandFailures["building-max-level"]`.
- Tests updated for the new seed/schema: `isometric-renderer-scene.test.ts`, `estate-repository.test.ts`, `serialization.test.ts`, `commands.test.ts`.

---

## Task 1: Level helpers + schema v2 + `mainBuildingLevel` field (foundation)

This task is atomic: it first creates the pure level helpers that everything else imports, then bumps the `schemaVersion` literal — which forces every snapshot constructor/validator to update together so the project keeps compiling. It introduces the field defaulting to level 1 everywhere and the v1→v2 migration. No upgrade command or art yet — after this task the build is green and every existing estate renders at level 1.

**Files:**
- Create: `src/features/estate/domain/main-building.ts`
- Create: `src/features/estate/__tests__/main-building.test.ts`
- Modify: `src/features/estate/domain/types.ts`
- Modify: `src/features/estate/domain/commands.ts:32-57` (`createInitialEstateSnapshot`)
- Modify: `src/features/estate/data/demo-estate-data.ts:74-85` (`createDemoEstateSeedSnapshot` — version/level only; seed contents stripped in Task 3)
- Modify: `src/features/estate/domain/serialization.ts`
- Modify: `src/features/estate/persistence/estate-repository.ts`
- Test: `src/features/estate/__tests__/serialization.test.ts`, `src/features/estate/__tests__/estate-repository.test.ts`

- [ ] **Step 1: Write the failing level-helper tests**

Create `src/features/estate/__tests__/main-building.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  MAIN_BUILDING_LEVEL_ASSET_IDS,
  MAIN_BUILDING_MAX_LEVEL,
  MAIN_BUILDING_UPGRADE_COSTS,
  clampMainBuildingLevel,
  getMainBuildingAssetId,
  getMainBuildingUpgradeCost,
  isMainBuildingMaxLevel,
} from "../domain/main-building";

describe("main building level helpers", () => {
  it("clamps levels into the legal 1..max range", () => {
    expect(clampMainBuildingLevel(0)).toBe(1);
    expect(clampMainBuildingLevel(1)).toBe(1);
    expect(clampMainBuildingLevel(5)).toBe(5);
    expect(clampMainBuildingLevel(99)).toBe(MAIN_BUILDING_MAX_LEVEL);
    expect(clampMainBuildingLevel(3.7)).toBe(3);
    expect(clampMainBuildingLevel(Number.NaN)).toBe(1);
    expect(clampMainBuildingLevel(undefined)).toBe(1);
  });

  it("returns the next upgrade cost or null at max level", () => {
    expect(getMainBuildingUpgradeCost(1)).toBe(MAIN_BUILDING_UPGRADE_COSTS[0]);
    expect(getMainBuildingUpgradeCost(4)).toBe(MAIN_BUILDING_UPGRADE_COSTS[3]);
    expect(getMainBuildingUpgradeCost(5)).toBeNull();
    expect(getMainBuildingUpgradeCost(0)).toBe(MAIN_BUILDING_UPGRADE_COSTS[0]);
  });

  it("reports the max level", () => {
    expect(isMainBuildingMaxLevel(4)).toBe(false);
    expect(isMainBuildingMaxLevel(5)).toBe(true);
    expect(isMainBuildingMaxLevel(99)).toBe(true);
  });

  it("maps each level to a sprite asset id", () => {
    expect(getMainBuildingAssetId(1)).toBe("campus-building-lv1");
    expect(getMainBuildingAssetId(5)).toBe("campus-building-lv5");
    expect(getMainBuildingAssetId(99)).toBe("campus-building-lv5");
    expect(MAIN_BUILDING_LEVEL_ASSET_IDS).toHaveLength(MAIN_BUILDING_MAX_LEVEL);
  });

  it("keeps one upgrade cost per gap between levels", () => {
    expect(MAIN_BUILDING_UPGRADE_COSTS).toHaveLength(MAIN_BUILDING_MAX_LEVEL - 1);
    for (const cost of MAIN_BUILDING_UPGRADE_COSTS) {
      expect(Number.isInteger(cost)).toBe(true);
      expect(cost).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run the helper tests to verify they fail**

Run: `npx vitest run src/features/estate/__tests__/main-building.test.ts`
Expected: FAIL with "Cannot find module '../domain/main-building'".

- [ ] **Step 3: Create the level helper module**

Create `src/features/estate/domain/main-building.ts`:
```ts
// Single source of truth for the leveled main building. Leveling is visual
// prestige only: it changes the building's sprite and a level badge, and spends
// points; it does not gate content or change the economy formula.
export const MAIN_BUILDING_MAX_LEVEL = 5;

// Cost to advance from level N to N+1. Index 0 = Lv.1 -> Lv.2, etc. Escalates
// ~2.2x so the building is a meaningful long-term point sink.
export const MAIN_BUILDING_UPGRADE_COSTS: readonly number[] = [
  800, 2_000, 4_500, 9_000,
];

export const MAIN_BUILDING_LEVEL_ASSET_IDS: readonly string[] = Array.from(
  { length: MAIN_BUILDING_MAX_LEVEL },
  (_unused, index) => `campus-building-lv${index + 1}`,
);

export function clampMainBuildingLevel(level: unknown): number {
  const numeric =
    typeof level === "number" && Number.isFinite(level)
      ? Math.floor(level)
      : 1;

  return Math.min(MAIN_BUILDING_MAX_LEVEL, Math.max(1, numeric));
}

export function isMainBuildingMaxLevel(level: number): boolean {
  return clampMainBuildingLevel(level) >= MAIN_BUILDING_MAX_LEVEL;
}

export function getMainBuildingUpgradeCost(level: number): number | null {
  const current = clampMainBuildingLevel(level);
  if (current >= MAIN_BUILDING_MAX_LEVEL) return null;

  return MAIN_BUILDING_UPGRADE_COSTS[current - 1] ?? null;
}

export function getMainBuildingAssetId(level: number): string {
  return MAIN_BUILDING_LEVEL_ASSET_IDS[clampMainBuildingLevel(level) - 1];
}
```

- [ ] **Step 4: Run the helper tests to verify they pass**

Run: `npx vitest run src/features/estate/__tests__/main-building.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing migration tests**

Append to `src/features/estate/__tests__/estate-repository.test.ts` (inside the top-level `describe`):

```ts
it("migrates a v1 snapshot to v2 with a default main building level of 1", () => {
  const v1 = {
    schemaVersion: 1,
    subjectId: "yu-e21",
    unlockedParcelIds: ["central-campus"],
    items: [],
    inventory: [],
    groundTiles: [],
    transactions: [],
    updatedAt: "2026-06-24T00:00:00.000Z",
  };

  const result = migrateEstateSnapshot(v1, { subjectId: "yu-e21" });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.snapshot.schemaVersion).toBe(2);
  expect(result.snapshot.mainBuildingLevel).toBe(1);
});

it("accepts a v2 snapshot and clamps an out-of-range main building level", () => {
  const v2 = {
    schemaVersion: 2,
    subjectId: "yu-e21",
    mainBuildingLevel: 99,
    unlockedParcelIds: ["central-campus"],
    items: [],
    inventory: [],
    groundTiles: [],
    transactions: [
      {
        id: "tx-1",
        kind: "upgrade-building",
        pointDelta: -800,
        createdAt: "2026-06-24T00:00:00.000Z",
      },
    ],
    updatedAt: "2026-06-24T00:00:00.000Z",
  };

  const result = migrateEstateSnapshot(v2, { subjectId: "yu-e21" });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.snapshot.mainBuildingLevel).toBe(5);
  expect(result.snapshot.transactions[0]).toMatchObject({
    kind: "upgrade-building",
    pointDelta: -800,
  });
});

it("persists the schema version and main building level for the wire format", () => {
  const persisted = toPersistableEstateSnapshot({
    ...createDemoEstateSeedSnapshot("yu-e21"),
    mainBuildingLevel: 3,
  });

  expect(persisted.schemaVersion).toBe(2);
  expect(persisted.mainBuildingLevel).toBe(3);
});
```

Add `toPersistableEstateSnapshot` to the existing import from `../persistence/estate-repository` at the top of the file if it is not already imported.

- [ ] **Step 6: Run the migration tests to verify they fail**

Run: `npx vitest run src/features/estate/__tests__/estate-repository.test.ts`
Expected: FAIL — `migrateEstateSnapshot` rejects `schemaVersion: 2` / `upgrade-building`, and `mainBuildingLevel` is `undefined`.

- [ ] **Step 7: Add the field and new union members in `types.ts`**

In `src/features/estate/domain/types.ts`:

Change `EstateTransaction.kind`:
```ts
export type EstateTransaction = {
  id: string;
  kind: "purchase-item" | "purchase-ground" | "unlock-parcel" | "upgrade-building";
  pointDelta: number;
  itemDefinitionId?: string;
  parcelId?: string;
  createdAt: string;
};
```

Change `EstateSnapshot` (bump version, add level):
```ts
export type EstateSnapshot = {
  schemaVersion: 2;
  subjectId: string;
  mainBuildingLevel: number;
  unlockedParcelIds: string[];
  items: EstateItemInstance[];
  inventory: EstateInventoryEntry[];
  groundTiles: EstateGroundTile[];
  transactions: EstateTransaction[];
  updatedAt: string;
};
```

Add `"building-max-level"` to `EstateCommandFailureReason`:
```ts
export type EstateCommandFailureReason =
  | "insufficient-points"
  | "out-of-bounds"
  | "locked-cell"
  | "collision"
  | "missing-inventory"
  | "parcel-not-adjacent"
  | "already-unlocked"
  | "protected-item"
  | "invalid-definition"
  | "building-max-level";
```

Add the upgrade command and include it in the union (place after `EstateUnlockParcelCommand`):
```ts
export type EstateUpgradeMainBuildingCommand = {
  type: "upgrade-main-building";
};

export type EstateCommand =
  | EstatePurchaseItemCommand
  | EstatePlaceItemCommand
  | EstatePaintGroundCommand
  | EstatePaintGroundCellsCommand
  | EstateMoveItemCommand
  | EstateRemoveItemCommand
  | EstateUnlockParcelCommand
  | EstateUpgradeMainBuildingCommand;
```

- [ ] **Step 8: Update `createInitialEstateSnapshot` in `commands.ts`**

In `src/features/estate/domain/commands.ts`, update the returned object (keep the building at `x: 3, y: 3` so existing placement tests stay valid):
```ts
  return {
    schemaVersion: 2,
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
    updatedAt: now,
  };
```

- [ ] **Step 9: Update `createDemoEstateSeedSnapshot` version/level in `demo-estate-data.ts`**

In `src/features/estate/data/demo-estate-data.ts`, update only the `schemaVersion` and add `mainBuildingLevel` in the returned object (seed item stripping happens in Task 3; for now the garden still exists but must carry the new fields so the file type-checks):
```ts
export function createDemoEstateSeedSnapshot(subjectId: string): EstateSnapshot {
  return {
    schemaVersion: 2,
    subjectId,
    mainBuildingLevel: 1,
    unlockedParcelIds: ["central-campus"],
    items: createGardenSeedItems(subjectId),
    inventory: [],
    groundTiles: createGardenGroundTiles(),
    transactions: [],
    updatedAt: seedTimestamp,
  };
}
```

- [ ] **Step 10: Upgrade-aware validation in `serialization.ts`**

Replace the body of `src/features/estate/domain/serialization.ts` with:
```ts
import type { EstateParseResult, EstateSnapshot } from "./types";
import { clampMainBuildingLevel } from "./main-building";

export function serializeEstateSnapshot(snapshot: EstateSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseEstateSnapshot(serialized: string): EstateParseResult {
  let value: unknown;

  try {
    value = JSON.parse(serialized);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  if (!isRecord(value)) {
    return { ok: false, reason: "invalid-shape" };
  }

  if (value.schemaVersion !== 1 && value.schemaVersion !== 2) {
    return { ok: false, reason: "unsupported-schema-version" };
  }

  if (!hasEstateSnapshotShape(value)) {
    return { ok: false, reason: "invalid-shape" };
  }

  return {
    ok: true,
    snapshot: {
      schemaVersion: 2,
      subjectId: value.subjectId,
      mainBuildingLevel: clampMainBuildingLevel(value.mainBuildingLevel),
      unlockedParcelIds: value.unlockedParcelIds,
      items: value.items,
      inventory: value.inventory,
      groundTiles: value.groundTiles,
      transactions: value.transactions,
      updatedAt: value.updatedAt,
    } as EstateSnapshot,
  };
}

type EstateSnapshotShape = {
  subjectId: string;
  mainBuildingLevel?: unknown;
  unlockedParcelIds: unknown[];
  items: unknown[];
  inventory: unknown[];
  groundTiles: unknown[];
  transactions: unknown[];
  updatedAt: string;
};

function hasEstateSnapshotShape(
  value: Record<string, unknown>,
): value is Record<string, unknown> & EstateSnapshotShape {
  return (
    typeof value.subjectId === "string" &&
    Array.isArray(value.unlockedParcelIds) &&
    Array.isArray(value.items) &&
    Array.isArray(value.inventory) &&
    Array.isArray(value.groundTiles) &&
    Array.isArray(value.transactions) &&
    typeof value.updatedAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
```

> Note: `clampMainBuildingLevel` is the helper created in Step 3 above, so this import resolves within this task.

- [ ] **Step 11: Migrate v1→v2 in `estate-repository.ts`**

In `src/features/estate/persistence/estate-repository.ts`:

Add the import at the top:
```ts
import { clampMainBuildingLevel } from "../domain/main-building";
```

Replace the `switch (raw.schemaVersion)` block inside `migrateEstateSnapshot`:
```ts
  switch (raw.schemaVersion) {
    case 1:
      return validateEstateSnapshot(raw, subjectId, options.subjectId, 1);
    case 2:
      return validateEstateSnapshot(raw, subjectId, options.subjectId, 2);
    default:
      return {
        ok: false,
        error: {
          code: "unsupported-schema-version",
          subjectId,
          message: `Unsupported estate snapshot schema version: ${String(
            raw.schemaVersion,
          )}.`,
        },
      };
  }
```

Rename `validateEstateSnapshotV1` to `validateEstateSnapshot`, add a `sourceVersion` parameter, and produce a v2 snapshot with a clamped level (v1 rows default to level 1 because `raw.mainBuildingLevel` is `undefined`):
```ts
function validateEstateSnapshot(
  raw: Record<string, unknown>,
  subjectId: string,
  expectedSubjectId: string | undefined,
  sourceVersion: 1 | 2,
): EstateMigrationResult {
  if (typeof raw.subjectId !== "string" || raw.subjectId.length === 0) {
    return invalidShape(subjectId);
  }

  if (expectedSubjectId && raw.subjectId !== expectedSubjectId) {
    return {
      ok: false,
      error: {
        code: "subject-mismatch",
        subjectId: expectedSubjectId,
        message: "Stored estate snapshot belongs to another subject.",
      },
    };
  }

  if (
    !Array.isArray(raw.unlockedParcelIds) ||
    !Array.isArray(raw.items) ||
    !Array.isArray(raw.inventory) ||
    !Array.isArray(raw.groundTiles) ||
    !Array.isArray(raw.transactions) ||
    typeof raw.updatedAt !== "string"
  ) {
    return invalidShape(raw.subjectId);
  }

  const unlockedParcelIds = validateUnlockedParcelIds(raw.unlockedParcelIds);
  if (!unlockedParcelIds) return invalidShape(raw.subjectId);

  const itemDefinitions = [baseEstateBuildingDefinition, ...estateItemCatalog];
  const items = validateItems(raw.items, unlockedParcelIds, itemDefinitions);
  if (!items) return invalidShape(raw.subjectId);

  const inventory = validateInventory(raw.inventory, itemDefinitions);
  if (!inventory) return invalidShape(raw.subjectId);

  const groundTiles = validateGroundTiles(raw.groundTiles, unlockedParcelIds);
  if (!groundTiles) return invalidShape(raw.subjectId);

  const transactions = validateTransactions(raw.transactions, itemDefinitions);
  if (!transactions) return invalidShape(raw.subjectId);

  // v1 rows have no level field; default to 1. v2 rows clamp to the legal range.
  const mainBuildingLevel =
    sourceVersion === 1 ? 1 : clampMainBuildingLevel(raw.mainBuildingLevel);

  return {
    ok: true,
    snapshot: {
      schemaVersion: 2,
      subjectId: raw.subjectId,
      mainBuildingLevel,
      unlockedParcelIds,
      items,
      inventory,
      groundTiles,
      transactions,
      updatedAt: raw.updatedAt,
    },
  };
}
```

Update `toPersistableEstateSnapshot` to carry the version and level:
```ts
export function toPersistableEstateSnapshot(
  snapshot: EstateSnapshot,
): EstateSnapshot {
  return {
    schemaVersion: 2,
    subjectId: snapshot.subjectId,
    mainBuildingLevel: clampMainBuildingLevel(snapshot.mainBuildingLevel),
    unlockedParcelIds: snapshot.unlockedParcelIds.map((parcelId) => parcelId),
    items: snapshot.items.map((item) => ({ ...item })),
    inventory: snapshot.inventory.map((entry) => ({ ...entry })),
    groundTiles: snapshot.groundTiles.map((tile) => ({ ...tile })),
    transactions: snapshot.transactions.map((transaction) => ({
      ...transaction,
    })),
    updatedAt: snapshot.updatedAt,
  };
}
```

Allow the `upgrade-building` transaction kind. Update `isEstateTransactionKind`:
```ts
function isEstateTransactionKind(
  value: unknown,
): value is EstateTransaction["kind"] {
  return (
    value === "purchase-item" ||
    value === "purchase-ground" ||
    value === "unlock-parcel" ||
    value === "upgrade-building"
  );
}
```

And in `validateTransactions`, add a branch for the bare upgrade transaction **before** the `itemDefinitionId` requirement (right after the `unlock-parcel` branch):
```ts
    if (kind === "upgrade-building") {
      transactions.push({ id, kind, pointDelta, createdAt });
      continue;
    }
```

- [ ] **Step 12: Run the migration tests to verify they pass**

Run: `npx vitest run src/features/estate/__tests__/estate-repository.test.ts src/features/estate/__tests__/serialization.test.ts`
Expected: PASS (all new + existing).

If `serialization.test.ts` has an assertion that `schemaVersion: 2` is `unsupported-schema-version`, update it to expect a valid parse that yields `schemaVersion: 2` and `mainBuildingLevel: 1`.

- [ ] **Step 13: Commit**

```bash
git add src/features/estate/domain/main-building.ts src/features/estate/__tests__/main-building.test.ts src/features/estate/domain/types.ts src/features/estate/domain/commands.ts src/features/estate/data/demo-estate-data.ts src/features/estate/domain/serialization.ts src/features/estate/persistence/estate-repository.ts src/features/estate/__tests__/estate-repository.test.ts src/features/estate/__tests__/serialization.test.ts
git commit -m "feat(estate): add main building level helpers and schema v2 migration"
```

---

## Task 2: Upgrade-main-building command

The level helpers (`main-building.ts`) already exist from Task 1; this task adds the player-facing upgrade command on top of them.

**Files:**
- Modify: `src/features/estate/domain/commands.ts` (add `upgradeMainBuilding` + reducer case)
- Test: `src/features/estate/__tests__/commands.test.ts`

- [ ] **Step 1: Write the failing upgrade-command tests**

Append to `src/features/estate/__tests__/commands.test.ts` (inside the existing top-level `describe`). The existing `createContext`/`createInitialEstateSnapshot` helpers in that file are reused:
```ts
it("upgrades the main building and records a spend transaction", () => {
  const context = createContext(5_000, ["tx-upgrade"]);
  const seed = createInitialEstateSnapshot("yu-e21", {
    now: () => "2026-06-24T00:00:00.000Z",
  });

  const result = upgradeMainBuilding(seed, { type: "upgrade-main-building" }, context);

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.snapshot.mainBuildingLevel).toBe(2);
  expect(result.snapshot.transactions).toEqual([
    {
      id: "tx-upgrade",
      kind: "upgrade-building",
      pointDelta: -800,
      createdAt: "2026-06-24T00:00:00.000Z",
    },
  ]);
});

it("rejects an upgrade when points are insufficient", () => {
  const context = createContext(100);
  const seed = createInitialEstateSnapshot("yu-e21", {
    now: () => "2026-06-24T00:00:00.000Z",
  });

  expect(
    upgradeMainBuilding(seed, { type: "upgrade-main-building" }, context),
  ).toEqual({ ok: false, snapshot: seed, reason: "insufficient-points" });
});

it("rejects an upgrade once the building is at the max level", () => {
  const context = createContext(1_000_000);
  const maxed = {
    ...createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    }),
    mainBuildingLevel: 5,
  };

  expect(
    upgradeMainBuilding(maxed, { type: "upgrade-main-building" }, context),
  ).toEqual({ ok: false, snapshot: maxed, reason: "building-max-level" });
});
```

Add `upgradeMainBuilding` to the existing import from `../domain/commands` at the top of the test file.

- [ ] **Step 2: Run the command tests to verify they fail**

Run: `npx vitest run src/features/estate/__tests__/commands.test.ts`
Expected: FAIL — `upgradeMainBuilding` is not exported.

- [ ] **Step 3: Implement `upgradeMainBuilding` + reducer case in `commands.ts`**

Add the import near the top of `src/features/estate/domain/commands.ts`:
```ts
import {
  clampMainBuildingLevel,
  getMainBuildingUpgradeCost,
} from "./main-building";
```

Add the command function (place it after `unlockEstateParcel`):
```ts
export function upgradeMainBuilding(
  snapshot: EstateSnapshot,
  _command: { type: "upgrade-main-building" },
  context: EstateCommandContext,
): EstateCommandResult {
  const currentLevel = clampMainBuildingLevel(snapshot.mainBuildingLevel);
  const cost = getMainBuildingUpgradeCost(currentLevel);

  if (cost === null) {
    return fail(snapshot, "building-max-level");
  }

  if (
    !hasEnoughEstatePoints(context.earnedPoints, snapshot.transactions, cost)
  ) {
    return fail(snapshot, "insufficient-points");
  }

  const now = context.now();

  return succeed({
    ...snapshot,
    mainBuildingLevel: currentLevel + 1,
    transactions: [
      ...snapshot.transactions,
      {
        id: context.createId(),
        kind: "upgrade-building",
        pointDelta: -cost,
        createdAt: now,
      },
    ],
    updatedAt: now,
  });
}
```

Add the reducer case in `reduceEstateCommand`:
```ts
    case "upgrade-main-building":
      return upgradeMainBuilding(snapshot, command, context);
```

- [ ] **Step 4: Run the command tests to verify they pass**

Run: `npx vitest run src/features/estate/__tests__/commands.test.ts src/features/estate/__tests__/main-building.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/estate/domain/commands.ts src/features/estate/__tests__/commands.test.ts
git commit -m "feat(estate): add upgrade-main-building command"
```

---

## Task 3: Strip the starter seed to the Lv.1 building

**Files:**
- Modify: `src/features/estate/data/demo-estate-data.ts`
- Test: `src/features/estate/__tests__/estate-repository.test.ts:317-338`
- Test: `src/features/estate/__tests__/isometric-renderer-scene.test.ts:17-43`

- [ ] **Step 1: Rewrite the seed-content test (failing)**

In `src/features/estate/__tests__/estate-repository.test.ts`, replace the test titled `"seeds yu-e21 with a central landmark, paved axis, and framing trees"` (around line 317) with:
```ts
it("seeds a subject with only a centered level-1 main building on clean grass", () => {
  const snapshot = createDemoEstateSeedSnapshot("yu-e21");

  expect(snapshot.schemaVersion).toBe(2);
  expect(snapshot.mainBuildingLevel).toBe(1);
  expect(snapshot.unlockedParcelIds).toEqual(["central-campus"]);
  expect(snapshot.items).toEqual([
    expect.objectContaining({
      id: "yu-e21:landmark",
      definitionId: "base-campus-building",
      x: 7,
      y: 7,
      rotation: 0,
    }),
  ]);
  expect(snapshot.groundTiles).toEqual([]);
  expect(snapshot.inventory).toEqual([]);
  expect(snapshot.transactions).toEqual([]);
});
```

The neighbouring test `"places every seed item inside the central parcel without overlaps"` (around line 340) stays as-is — it iterates `snapshot.items` generically and still passes with one item.

- [ ] **Step 2: Update the renderer-scene test (failing)**

In `src/features/estate/__tests__/isometric-renderer-scene.test.ts`, update the first test's assertions (lines ~31-41). Replace the `scene.groundTiles` and landmark-item assertions with:
```ts
    expect(scene.groundTiles).toEqual([]);
    expect(scene.items.find((item) => item.id === "yu-e21:landmark"))
      .toMatchObject({
        assetId: "campus-building-lv1",
        footprintWidth: 2,
        footprintHeight: 2,
      });
```

(The `assetId: "campus-building-lv1"` mapping is implemented in Task 5; this test will stay red until then. That is expected — note it and proceed; it goes green at the end of Task 5.)

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/features/estate/__tests__/estate-repository.test.ts`
Expected: FAIL — the seed still contains trees and ground tiles.

- [ ] **Step 4: Strip the seed in `demo-estate-data.ts`**

Replace the entire contents of `src/features/estate/data/demo-estate-data.ts` with:
```ts
import { baseEstateBuildingDefinition } from "./estate-item-catalog";
import type { EstateSnapshot } from "../domain/types";

export type DemoHistoricalEarnedPointsBySubjectId = Readonly<
  Partial<Record<string, number>>
>;

// Demo-only carryover until a server API can return verified long-term accounts.
export const demoHistoricalEarnedPointsBySubjectId: DemoHistoricalEarnedPointsBySubjectId =
  {
    "yu-e21": 3200,
  };

const seedTimestamp = "2026-06-24T00:00:00.000Z";

// A fresh estate starts clean: a single level-1 main building centered in the
// 16x16 core, on bare grass. Players grow the estate by upgrading the building
// and buying decorations from the shop. The 2x2 footprint at (7,7) covers
// cells (7..8, 7..8), centered in the 0..15 core.
export function createDemoEstateSeedSnapshot(subjectId: string): EstateSnapshot {
  return {
    schemaVersion: 2,
    subjectId,
    mainBuildingLevel: 1,
    unlockedParcelIds: ["central-campus"],
    items: [
      {
        id: `${subjectId}:landmark`,
        definitionId: baseEstateBuildingDefinition.id,
        x: 7,
        y: 7,
        rotation: 0,
        placedAt: seedTimestamp,
      },
    ],
    inventory: [],
    groundTiles: [],
    transactions: [],
    updatedAt: seedTimestamp,
  };
}
```

- [ ] **Step 5: Run the seed tests to verify they pass**

Run: `npx vitest run src/features/estate/__tests__/estate-repository.test.ts`
Expected: PASS (seed-content + no-overlap). `isometric-renderer-scene.test.ts` stays red on the `campus-building-lv1` assetId until Task 5 — that is expected.

- [ ] **Step 6: Commit**

```bash
git add src/features/estate/data/demo-estate-data.ts src/features/estate/__tests__/estate-repository.test.ts src/features/estate/__tests__/isometric-renderer-scene.test.ts
git commit -m "feat(estate): reset starter estate to a clean level-1 building"
```

---

## Task 4: Per-level building art (5 SVG sprites + manifest)

5 sprites share a warm campus palette (cream walls `#f6ecd6`/`#e7d3a8`, honey roof `#e6a93c`/`#cf8a26`, wood door `#9a6b3c`, soft glass `#bfe3ea`, gold/flag accents `#f3cd6a`/`#3fa86a`). All are `viewBox="0 0 256 H"` with the building's ground contact centered at the bottom (x=128). Width stays 256 across levels so the 2×2 base stays tile-aligned; only height grows so taller levels rise upward. `logicalHeight` in the manifest MUST equal each SVG's viewBox height.

**Files:**
- Create: `public/estate-assets/campus-building-lv1.svg` (H=232)
- Create: `public/estate-assets/campus-building-lv2.svg` (H=252)
- Create: `public/estate-assets/campus-building-lv3.svg` (H=280)
- Create: `public/estate-assets/campus-building-lv4.svg` (H=312)
- Create: `public/estate-assets/campus-building-lv5.svg` (H=348)
- Modify: `src/features/estate/data/estate-asset-manifest.ts`

- [ ] **Step 1: Create `campus-building-lv1.svg` (small lodge)**

`public/estate-assets/campus-building-lv1.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 232">
  <ellipse cx="128" cy="206" rx="92" ry="22" fill="#3a2f1d" opacity=".16"/>
  <!-- plinth -->
  <path d="M44 178 128 134 212 178 128 222Z" fill="#d9c8a2"/>
  <path d="M44 178 128 222 128 230 44 186Z" fill="#b89e72"/>
  <path d="M212 178 128 222 128 230 212 186Z" fill="#a78d63"/>
  <!-- single storey walls -->
  <path d="M64 168 128 138 192 168 128 198Z" fill="#f6ecd6"/>
  <path d="M64 168 128 198 128 150 64 120Z" fill="#e7d3a8"/>
  <path d="M192 168 128 198 128 150 192 120Z" fill="#d3b888"/>
  <!-- hip roof -->
  <path d="M64 120 128 150 192 120 128 96Z" fill="#f0d9a6"/>
  <path d="M64 120 128 96 128 70 56 104Z" fill="#e6a93c"/>
  <path d="M192 120 128 96 128 70 200 104Z" fill="#cf8a26"/>
  <path d="M56 104 128 70 200 104 128 84Z" fill="#b5741d"/>
  <!-- door + windows -->
  <path d="M120 192 128 188 136 192 136 168 120 164Z" fill="#9a6b3c"/>
  <path d="M96 176 104 172 104 158 96 162Z" fill="#bfe3ea"/>
  <path d="M152 172 160 176 160 162 152 158Z" fill="#bfe3ea"/>
</svg>
```

- [ ] **Step 2: Create `campus-building-lv2.svg` (two storeys + banner)**

`public/estate-assets/campus-building-lv2.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 252">
  <ellipse cx="128" cy="226" rx="94" ry="22" fill="#3a2f1d" opacity=".16"/>
  <path d="M44 198 128 154 212 198 128 242Z" fill="#d9c8a2"/>
  <path d="M44 198 128 242 128 250 44 206Z" fill="#b89e72"/>
  <path d="M212 198 128 242 128 250 212 206Z" fill="#a78d63"/>
  <!-- taller walls -->
  <path d="M62 186 128 154 194 186 128 218Z" fill="#f6ecd6"/>
  <path d="M62 186 128 218 128 132 62 100Z" fill="#e7d3a8"/>
  <path d="M194 186 128 218 128 132 194 100Z" fill="#d3b888"/>
  <!-- roof -->
  <path d="M62 100 128 132 194 100 128 68Z" fill="#f0d9a6"/>
  <path d="M62 100 128 68 128 38 54 84Z" fill="#e6a93c"/>
  <path d="M194 100 128 68 128 38 202 84Z" fill="#cf8a26"/>
  <path d="M54 84 128 38 202 84 128 52Z" fill="#b5741d"/>
  <!-- banner flag -->
  <path d="M128 38 128 12" stroke="#7c5430" stroke-width="2"/>
  <path d="M128 14 150 20 128 28Z" fill="#3fa86a"/>
  <!-- windows (two rows) + door -->
  <path d="M118 214 128 209 138 214 138 186 118 181Z" fill="#9a6b3c"/>
  <path d="M92 196 102 191 102 176 92 180Z" fill="#bfe3ea"/>
  <path d="M154 191 164 196 164 180 154 176Z" fill="#bfe3ea"/>
  <path d="M96 168 106 163 106 150 96 154Z" fill="#bfe3ea"/>
  <path d="M150 163 160 168 160 154 150 150Z" fill="#bfe3ea"/>
</svg>
```

- [ ] **Step 3: Create `campus-building-lv3.svg` (setback upper floor + clock)**

`public/estate-assets/campus-building-lv3.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 280">
  <ellipse cx="128" cy="254" rx="96" ry="23" fill="#3a2f1d" opacity=".16"/>
  <path d="M42 226 128 182 214 226 128 270Z" fill="#d9c8a2"/>
  <path d="M42 226 128 270 128 278 42 234Z" fill="#b89e72"/>
  <path d="M214 226 128 270 128 278 214 234Z" fill="#a78d63"/>
  <!-- lower storey -->
  <path d="M60 214 128 180 196 214 128 248Z" fill="#f6ecd6"/>
  <path d="M60 214 128 248 128 168 60 134Z" fill="#e7d3a8"/>
  <path d="M196 214 128 248 128 168 196 134Z" fill="#d3b888"/>
  <!-- setback upper storey -->
  <path d="M86 166 128 145 170 166 128 187Z" fill="#f6ecd6"/>
  <path d="M86 166 128 187 128 124 86 103Z" fill="#e7d3a8"/>
  <path d="M170 166 128 187 128 124 170 103Z" fill="#d3b888"/>
  <!-- roof on upper storey -->
  <path d="M86 103 128 124 170 103 128 82Z" fill="#f0d9a6"/>
  <path d="M86 103 128 82 128 50 74 90Z" fill="#e6a93c"/>
  <path d="M170 103 128 82 128 50 182 90Z" fill="#cf8a26"/>
  <path d="M74 90 128 50 182 90 128 66Z" fill="#b5741d"/>
  <!-- gold finial -->
  <circle cx="128" cy="46" r="5" fill="#f3cd6a" stroke="#b5741d"/>
  <!-- clock emblem on lower front -->
  <circle cx="128" cy="210" r="11" fill="#fff3d6" stroke="#cf8a26" stroke-width="2"/>
  <path d="M128 210 128 203M128 210 133 213" stroke="#7c5430" stroke-width="1.6" stroke-linecap="round"/>
  <!-- windows -->
  <path d="M92 206 102 201 102 184 92 188Z" fill="#bfe3ea"/>
  <path d="M154 201 164 206 164 188 154 184Z" fill="#bfe3ea"/>
</svg>
```

- [ ] **Step 4: Create `campus-building-lv4.svg` (wings + side turret + flags)**

`public/estate-assets/campus-building-lv4.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 312">
  <ellipse cx="128" cy="286" rx="104" ry="25" fill="#3a2f1d" opacity=".17"/>
  <path d="M34 258 128 210 222 258 128 306Z" fill="#d9c8a2"/>
  <path d="M34 258 128 306 128 314 34 266Z" fill="#b89e72"/>
  <path d="M222 258 128 306 128 314 222 266Z" fill="#a78d63"/>
  <!-- main mass -->
  <path d="M58 246 128 210 198 246 128 282Z" fill="#f6ecd6"/>
  <path d="M58 246 128 282 128 196 58 160Z" fill="#e7d3a8"/>
  <path d="M198 246 128 282 128 196 198 160Z" fill="#d3b888"/>
  <!-- side turret (right) -->
  <path d="M176 232 206 216 226 226 196 242Z" fill="#efe2c4"/>
  <path d="M196 242 226 226 226 150 196 166Z" fill="#d3b888"/>
  <path d="M176 232 196 242 196 166 176 156Z" fill="#e7d3a8"/>
  <path d="M176 156 201 142 226 150 201 164Z" fill="#cf8a26"/>
  <path d="M201 142 201 120" stroke="#7c5430" stroke-width="2"/>
  <path d="M201 122 221 128 201 134Z" fill="#3fa86a"/>
  <!-- upper storey on main mass -->
  <path d="M82 198 128 177 174 198 128 219Z" fill="#f6ecd6"/>
  <path d="M82 198 128 219 128 156 82 135Z" fill="#e7d3a8"/>
  <path d="M174 198 128 219 128 156 174 135Z" fill="#d3b888"/>
  <!-- crowning roof -->
  <path d="M82 135 128 156 174 135 128 114Z" fill="#f0d9a6"/>
  <path d="M82 135 128 114 128 78 70 122Z" fill="#e6a93c"/>
  <path d="M174 135 128 114 128 78 186 122Z" fill="#cf8a26"/>
  <path d="M70 122 128 78 186 122 128 96Z" fill="#b5741d"/>
  <circle cx="128" cy="74" r="5" fill="#f3cd6a" stroke="#b5741d"/>
  <path d="M128 74 128 50" stroke="#7c5430" stroke-width="2"/>
  <path d="M128 52 150 58 128 64Z" fill="#f2b53c"/>
  <!-- emblem + windows -->
  <circle cx="128" cy="244" r="10" fill="#fff3d6" stroke="#cf8a26" stroke-width="2"/>
  <path d="M122 244 134 244M128 238 128 250" stroke="#cf8a26" stroke-width="1.6"/>
  <path d="M92 240 102 235 102 214 92 218Z" fill="#bfe3ea"/>
  <path d="M154 235 164 240 164 218 154 214Z" fill="#bfe3ea"/>
</svg>
```

- [ ] **Step 5: Create `campus-building-lv5.svg` (grand hall: tower + dome + gold trim)**

`public/estate-assets/campus-building-lv5.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 348">
  <ellipse cx="128" cy="322" rx="112" ry="26" fill="#3a2f1d" opacity=".18"/>
  <path d="M26 294 128 244 230 294 128 344Z" fill="#d9c8a2"/>
  <path d="M26 294 128 344 128 352 26 302Z" fill="#b89e72"/>
  <path d="M230 294 128 344 128 352 230 302Z" fill="#a78d63"/>
  <!-- gold trim band on plinth -->
  <path d="M26 294 128 244 230 294 128 304 26 304Z" fill="#f3cd6a" opacity=".5"/>
  <!-- grand main mass -->
  <path d="M50 282 128 244 206 282 128 320Z" fill="#f6ecd6"/>
  <path d="M50 282 128 320 128 214 50 176Z" fill="#e7d3a8"/>
  <path d="M206 282 128 320 128 214 206 176Z" fill="#d3b888"/>
  <!-- columns hint on left face -->
  <path d="M70 250 70 300M90 260 90 310M110 270 110 318" stroke="#d3b888" stroke-width="3" opacity=".7"/>
  <!-- twin wing turrets -->
  <path d="M40 268 40 200 58 192 58 260Z" fill="#e7d3a8"/>
  <path d="M40 200 49 188 58 192 49 196Z" fill="#cf8a26"/>
  <path d="M198 260 198 192 216 200 216 268Z" fill="#d3b888"/>
  <path d="M198 192 207 188 216 200 207 196Z" fill="#cf8a26"/>
  <!-- central tower -->
  <path d="M98 214 128 198 158 214 128 230Z" fill="#f6ecd6"/>
  <path d="M98 214 128 230 128 150 98 134Z" fill="#e7d3a8"/>
  <path d="M158 214 128 230 128 150 158 134Z" fill="#d3b888"/>
  <!-- dome -->
  <path d="M98 134 128 150 158 134 128 118Z" fill="#f3cd6a"/>
  <path d="M104 132 C104 104 152 104 152 132 Z" fill="#e6a93c" stroke="#b5741d"/>
  <path d="M104 132 C108 112 148 112 152 132" fill="#f0d9a6" opacity=".6"/>
  <circle cx="128" cy="98" r="6" fill="#fff3c4" stroke="#cf8a26"/>
  <path d="M128 92 128 66" stroke="#7c5430" stroke-width="2"/>
  <path d="M128 68 154 74 128 82Z" fill="#f2b53c"/>
  <!-- glowing entrance emblem -->
  <circle cx="128" cy="292" r="13" fill="#fff3c4" stroke="#cf8a26" stroke-width="2"/>
  <path d="M128 284 128 300M120 292 136 292" stroke="#cf8a26" stroke-width="2" stroke-linecap="round"/>
  <!-- grand windows -->
  <path d="M80 286 92 280 92 250 80 256Z" fill="#bfe3ea"/>
  <path d="M164 280 176 286 176 256 164 250Z" fill="#bfe3ea"/>
</svg>
```

- [ ] **Step 6: Register the sprites in the manifest**

In `src/features/estate/data/estate-asset-manifest.ts`:

Add the import at the top:
```ts
import { MAIN_BUILDING_LEVEL_ASSET_IDS } from "../domain/main-building";
```

Add the 5 ids to `requiredEstateSpriteAssetIds` (spread the shared list so they never drift):
```ts
export const requiredEstateSpriteAssetIds = [
  ...MAIN_BUILDING_LEVEL_ASSET_IDS,
  "generic-campus-building",
  "it-technology-building",
  "broadleaf-tree",
  "pine-tree",
  "flower-bed",
  "bench",
  "solar-street-light",
  "campus-flag",
  "fountain",
  "greenhouse",
  "solar-pavilion",
  "recycling-station",
  "small-sculpture",
  "decorative-shrub",
  "locked-parcel-icon",
  "placement-valid-marker",
  "placement-invalid-marker",
] as const;
```

Add the 5 sprite entries inside `estateAssetManifest.items` (next to `base-campus-building`). Each `logicalHeight` matches its SVG viewBox height; warm building fallbacks grow per level:
```ts
    "campus-building-lv1": sprite(
      "campus-building-lv1",
      "/estate-assets/campus-building-lv1.svg",
      256,
      232,
      {
        renderLayer: 2,
        shadow: buildingShadow,
        fallback: {
          kind: "building",
          height: 70,
          renderLayer: 2,
          top: "#f4e7cd",
          left: "#dcc08a",
          right: "#c39a5e",
          stroke: "#8a6a3c",
          shadow: "#5e4427",
        },
      },
    ),
    "campus-building-lv2": sprite(
      "campus-building-lv2",
      "/estate-assets/campus-building-lv2.svg",
      256,
      252,
      {
        renderLayer: 2,
        shadow: buildingShadow,
        fallback: {
          kind: "building",
          height: 88,
          renderLayer: 2,
          top: "#f4e7cd",
          left: "#dcc08a",
          right: "#c39a5e",
          stroke: "#8a6a3c",
          shadow: "#5e4427",
        },
      },
    ),
    "campus-building-lv3": sprite(
      "campus-building-lv3",
      "/estate-assets/campus-building-lv3.svg",
      256,
      280,
      {
        renderLayer: 2,
        shadow: buildingShadow,
        fallback: {
          kind: "building",
          height: 108,
          renderLayer: 2,
          top: "#f4e7cd",
          left: "#dcc08a",
          right: "#c39a5e",
          stroke: "#8a6a3c",
          shadow: "#5e4427",
        },
      },
    ),
    "campus-building-lv4": sprite(
      "campus-building-lv4",
      "/estate-assets/campus-building-lv4.svg",
      256,
      312,
      {
        renderLayer: 2,
        shadow: buildingShadow,
        fallback: {
          kind: "building",
          height: 128,
          renderLayer: 2,
          top: "#f4e7cd",
          left: "#dcc08a",
          right: "#c39a5e",
          stroke: "#8a6a3c",
          shadow: "#5e4427",
        },
      },
    ),
    "campus-building-lv5": sprite(
      "campus-building-lv5",
      "/estate-assets/campus-building-lv5.svg",
      256,
      348,
      {
        renderLayer: 2,
        shadow: buildingShadow,
        fallback: {
          kind: "building",
          height: 150,
          renderLayer: 2,
          top: "#f6ecd6",
          left: "#e0c694",
          right: "#caa066",
          stroke: "#8a6a3c",
          shadow: "#5e4427",
        },
      },
    ),
```

- [ ] **Step 7: Run the manifest test to verify it passes**

Run: `npx vitest run src/features/estate/__tests__/asset-manifest.test.ts`
Expected: PASS — the 5 ids resolve, `src` matches `/estate-assets/*.svg`, anchors satisfy `anchorX === logicalWidth/2` and `anchorY > logicalHeight*0.72` (the `sprite()` helper sets `anchorY = logicalHeight`).

- [ ] **Step 8: Commit**

```bash
git add public/estate-assets/campus-building-lv1.svg public/estate-assets/campus-building-lv2.svg public/estate-assets/campus-building-lv3.svg public/estate-assets/campus-building-lv4.svg public/estate-assets/campus-building-lv5.svg src/features/estate/data/estate-asset-manifest.ts
git commit -m "feat(estate): add 5 escalating main-building sprites"
```

---

## Task 5: Render the building at its level + on-canvas level badge

**Files:**
- Modify: `src/features/estate/isometric/renderer.ts`
- Test: `src/features/estate/__tests__/isometric-renderer-scene.test.ts`

- [ ] **Step 1: Write the failing scene tests**

Append to `src/features/estate/__tests__/isometric-renderer-scene.test.ts` (inside the existing `describe`):
```ts
it("renders the main building with its level sprite and exposes the level", () => {
  const level1 = createEstateRenderScene({
    snapshot: createDemoEstateSeedSnapshot("yu-e21"),
    itemDefinitions,
    parcelDefinitions: estateExpansionCatalog,
  });
  expect(level1.mainBuildingLevel).toBe(1);
  expect(level1.items.find((item) => item.id === "yu-e21:landmark")?.assetId).toBe(
    "campus-building-lv1",
  );

  const level3 = createEstateRenderScene({
    snapshot: { ...createDemoEstateSeedSnapshot("yu-e21"), mainBuildingLevel: 3 },
    itemDefinitions,
    parcelDefinitions: estateExpansionCatalog,
  });
  expect(level3.mainBuildingLevel).toBe(3);
  expect(level3.items.find((item) => item.id === "yu-e21:landmark")?.assetId).toBe(
    "campus-building-lv3",
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/estate/__tests__/isometric-renderer-scene.test.ts`
Expected: FAIL — `scene.mainBuildingLevel` is `undefined` and the building still maps to `base-campus-building`.

- [ ] **Step 3: Map the building to its leveled sprite in `createEstateRenderScene`**

In `src/features/estate/isometric/renderer.ts`:

Add the imports near the top:
```ts
import { baseEstateBuildingDefinition } from "../data/estate-item-catalog";
import {
  clampMainBuildingLevel,
  getMainBuildingAssetId,
} from "../domain/main-building";
```

Add `mainBuildingLevel` to the `EstateRenderScene` type (after `animationProgress?`):
```ts
  mainBuildingLevel: number;
```

In `createEstateRenderScene`, compute the level + asset id and thread it into the item mapping and the returned scene. Replace the `items:` mapping and add `mainBuildingLevel` to the return object:
```ts
  const mainBuildingLevel = clampMainBuildingLevel(snapshot.mainBuildingLevel);
  const mainBuildingAssetId = getMainBuildingAssetId(mainBuildingLevel);

  return {
    metrics,
    parcels,
    groundTiles: snapshot.groundTiles.map((tile) =>
      createRenderGroundTile(tile, itemDefinitionById),
    ),
    items: snapshot.items.flatMap((item) =>
      createRenderItem(item, itemDefinitionById, mainBuildingAssetId),
    ),
    hoverCell,
    hoverParcelId: hoverCellKey
      ? (parcels.find((parcel) =>
          parcel.cells.some((cell) => getCellKey(cell) === hoverCellKey),
        )?.id ?? null)
      : null,
    selectedItemId,
    placementPreview,
    recentlyUnlockedParcelId,
    animationProgress,
    mainBuildingLevel,
  };
```

Update `createRenderItem` to accept the override and apply it to the main building:
```ts
function createRenderItem(
  item: EstateItemInstance,
  itemDefinitionById: ReadonlyMap<string, EstateItemDefinition>,
  mainBuildingAssetId: string,
): EstateRenderItem[] {
  const definition = itemDefinitionById.get(item.definitionId);
  if (!definition) return [];

  const assetId =
    item.definitionId === baseEstateBuildingDefinition.id
      ? mainBuildingAssetId
      : definition.assetId;

  return [
    {
      id: item.id,
      definitionId: item.definitionId,
      assetId,
      x: item.x,
      y: item.y,
      rotation: item.rotation,
      footprintWidth: definition.footprintWidth,
      footprintHeight: definition.footprintHeight,
    },
  ];
}
```

- [ ] **Step 4: Draw a level badge above the main building**

In `renderer.ts`, add a `drawMainBuildingBadge` call to the `draw()` pipeline, right after `this.drawItems(...)`:
```ts
    this.drawMainBuildingBadge(scene, camera, viewport);
```

Add the method to the `EstateIsometricRenderer` class (after `drawDecor`):
```ts
  private drawMainBuildingBadge(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
  ) {
    const building = scene.items.find((item) =>
      item.assetId.startsWith("campus-building-lv"),
    );
    if (!building) return;

    const anchor = worldToCanvas(
      getFootprintAnchorPoint(building, scene.metrics),
      camera,
      viewport,
    );
    const ctx = this.context;
    const zoom = camera.zoom;
    const label = `Lv.${scene.mainBuildingLevel}`;
    const fontSize = Math.max(11, Math.round(12 * zoom));
    const liftY = anchor.y - 96 * zoom;

    ctx.save();
    ctx.font = `700 ${fontSize}px sans-serif`;
    const pillHeight = Math.max(18, 20 * zoom);
    const pillWidth = label.length * fontSize * 0.62 + pillHeight;
    fillPill(
      ctx,
      anchor.x - pillWidth / 2,
      liftY - pillHeight / 2,
      pillWidth,
      pillHeight,
      "#fffdf7",
      "#e2a23a",
    );
    ctx.fillStyle = "#8a5a12";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, anchor.x, liftY + 0.5);
    ctx.restore();
  }
```

(`fillPill`, `getFootprintAnchorPoint`, and `worldToCanvas` already exist in this file.)

- [ ] **Step 5: Run the renderer tests to verify they pass**

Run: `npx vitest run src/features/estate/__tests__/isometric-renderer-scene.test.ts src/features/estate/__tests__/isometric-renderer-assets.test.ts`
Expected: PASS — including the `campus-building-lv1` assertion from Task 3 Step 2.

- [ ] **Step 6: Commit**

```bash
git add src/features/estate/isometric/renderer.ts src/features/estate/__tests__/isometric-renderer-scene.test.ts
git commit -m "feat(estate): render the main building per level with a level badge"
```

---

## Task 6: i18n keys for the building card (ko + en)

**Files:**
- Modify: `src/i18n/messages/ko.ts` (estate block, ~lines 155-237)
- Modify: `src/i18n/messages/en.ts` (estate block, starts ~line 129)

> Keep the two locales structurally identical — the `estate release quality gates` test compares their leaf paths. Add the same keys in the same nesting to both.

- [ ] **Step 1: Add keys to `ko.ts`**

In `src/i18n/messages/ko.ts`, add the `"building-max-level"` failure (inside `estate.commandFailures`, after `"invalid-definition"`):
```ts
      "building-max-level": "이미 최고 레벨입니다.",
```

Add an `upgraded` message (inside `estate.messages`, after `removed`):
```ts
      upgraded: "메인 건물을 Lv.{level}로 올렸습니다.",
```

Add a new `building` block inside `estate` (place it right after the `aria` block):
```ts
    building: {
      cardTitle: "메인 건물",
      level: "Lv.{level}",
      levelProgress: "{level} / {max}",
      nextLevel: "다음 레벨",
      upgrade: "레벨업",
      maxLevel: "최고 레벨 달성",
      insufficient: "포인트가 부족합니다",
    },
```

- [ ] **Step 2: Add the identical keys to `en.ts`**

In `src/i18n/messages/en.ts`, mirror each addition in the same positions:

`estate.commandFailures`:
```ts
      "building-max-level": "The building is already at its highest level.",
```

`estate.messages`:
```ts
      upgraded: "Upgraded the main building to Lv.{level}.",
```

`estate.building`:
```ts
    building: {
      cardTitle: "Main building",
      level: "Lv.{level}",
      levelProgress: "{level} / {max}",
      nextLevel: "Next level",
      upgrade: "Upgrade",
      maxLevel: "Max level reached",
      insufficient: "Not enough points",
    },
```

- [ ] **Step 3: Run the i18n parity + type check**

Run: `npx vitest run src/features/estate/__tests__/estate-quality.test.ts`
Expected: PASS — `getLeafPaths(enMessages.estate)` equals `getLeafPaths(koMessages.estate)`.

If the `Messages` type (`src/i18n/messages/types.ts`) is derived from one locale, no change is needed; if it is a hand-written interface, add the `building` block, `messages.upgraded`, and `commandFailures["building-max-level"]` there too. Verify with `npx tsc --noEmit` (ignore the 4 pre-existing unrelated test-file `tsc` errors noted in `docs/working/current-state.md`).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/messages/ko.ts src/i18n/messages/en.ts src/i18n/messages/types.ts
git commit -m "feat(estate): add i18n for the main building upgrade card"
```

---

## Task 7: Building upgrade card UI + game-client wiring

**Files:**
- Create: `src/features/estate/components/estate-building-card.tsx`
- Create: `src/features/estate/__tests__/estate-building-card.test.tsx`
- Modify: `src/features/estate/components/estate-game-client.tsx`

- [ ] **Step 1: Write the failing component test**

Create `src/features/estate/__tests__/estate-building-card.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { koMessages } from "@/i18n/messages/ko";
import { EstateBuildingCard } from "../components/estate-building-card";

const copy = koMessages.estate;

describe("EstateBuildingCard", () => {
  it("shows the level, progress, and an enabled upgrade button when affordable", () => {
    const onUpgrade = vi.fn();
    render(
      <EstateBuildingCard
        copy={copy}
        locale="ko"
        level={2}
        maxLevel={5}
        nextCost={2000}
        availablePoints={5000}
        onUpgrade={onUpgrade}
      />,
    );

    expect(screen.getByText(copy.building.cardTitle)).toBeTruthy();
    expect(screen.getByText("Lv.2")).toBeTruthy();
    expect(screen.getByText("2 / 5")).toBeTruthy();

    const button = screen.getByRole("button", { name: new RegExp(copy.building.upgrade) });
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("disables the upgrade button when points are insufficient", () => {
    const onUpgrade = vi.fn();
    render(
      <EstateBuildingCard
        copy={copy}
        locale="ko"
        level={1}
        maxLevel={5}
        nextCost={800}
        availablePoints={100}
        onUpgrade={onUpgrade}
      />,
    );

    const button = screen.getByRole("button", { name: new RegExp(copy.building.upgrade) });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(onUpgrade).not.toHaveBeenCalled();
  });

  it("renders a max-level state with no upgrade button when nextCost is null", () => {
    render(
      <EstateBuildingCard
        copy={copy}
        locale="ko"
        level={5}
        maxLevel={5}
        nextCost={null}
        availablePoints={999999}
        onUpgrade={vi.fn()}
      />,
    );

    expect(screen.getByText(copy.building.maxLevel)).toBeTruthy();
    expect(screen.queryByRole("button", { name: new RegExp(copy.building.upgrade) })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/estate/__tests__/estate-building-card.test.tsx`
Expected: FAIL — module `../components/estate-building-card` does not exist.

- [ ] **Step 3: Create the building card component**

Create `src/features/estate/components/estate-building-card.tsx`:
```tsx
"use client";

import { Building2, ChevronUp, Coins, Crown } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { EstateMessages } from "./estate-copy";
import styles from "./estate-shell.module.css";

export type EstateBuildingCardProps = {
  copy: EstateMessages;
  locale: Locale;
  level: number;
  maxLevel: number;
  nextCost: number | null;
  availablePoints: number;
  onUpgrade: () => void;
};

export function EstateBuildingCard({
  copy,
  locale,
  level,
  maxLevel,
  nextCost,
  availablePoints,
  onUpgrade,
}: EstateBuildingCardProps) {
  const affordable = nextCost !== null && availablePoints >= nextCost;

  return (
    <section
      className={`${styles.panel} pointer-events-auto w-[15rem] max-w-[calc(100vw_-_1rem)] rounded-2xl p-3`}
      aria-label={copy.building.cardTitle}
    >
      <div className="flex items-center gap-2">
        <span
          className={`${styles.chip} grid h-9 w-9 place-items-center rounded-xl`}
        >
          <Building2 size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold leading-tight">
            {copy.building.cardTitle}
          </h2>
          <p className={`${styles.muted} text-[11px]`}>
            {interpolate(copy.building.levelProgress, { level, max: maxLevel })}
          </p>
        </div>
        <span
          className={`${styles.chip} flex h-7 items-center rounded-lg px-2 text-xs font-bold tabular-nums`}
        >
          {interpolate(copy.building.level, { level })}
        </span>
      </div>

      <div className="mt-2 flex gap-1" aria-hidden="true">
        {Array.from({ length: maxLevel }, (_unused, index) => (
          <span
            key={index}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background:
                index < level ? "var(--es-accent)" : "var(--es-line)",
            }}
          />
        ))}
      </div>

      {nextCost === null ? (
        <div
          className={`${styles.selectionCard} mt-3 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold`}
        >
          <Crown size={15} aria-hidden="true" />
          {copy.building.maxLevel}
        </div>
      ) : (
        <button
          type="button"
          className={`${styles.primaryBtn} mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55`}
          disabled={!affordable}
          onClick={onUpgrade}
          title={affordable ? copy.building.upgrade : copy.building.insufficient}
        >
          <ChevronUp size={16} aria-hidden="true" />
          <span>{copy.building.upgrade}</span>
          <span className={`${styles.divider} mx-1 h-4 w-px`} aria-hidden="true" />
          <Coins size={14} className={styles.coin} aria-hidden="true" />
          <span className="font-mono tabular-nums">
            {formatPoints(locale, nextCost)}
          </span>
        </button>
      )}
    </section>
  );
}
```

> If `styles.selectionCard` is not present in `estate-shell.module.css`, substitute `styles.miniMetric` (already used in the client). Verify the class name exists before relying on it.

- [ ] **Step 4: Run the component test to verify it passes**

Run: `npx vitest run src/features/estate/__tests__/estate-building-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire the card + upgrade handler into the game client**

In `src/features/estate/components/estate-game-client.tsx`:

Add imports:
```ts
import {
  MAIN_BUILDING_MAX_LEVEL,
  clampMainBuildingLevel,
  getMainBuildingUpgradeCost,
} from "../domain/main-building";
import { EstateBuildingCard } from "./estate-building-card";
```

Inside the component, after `const pointAccount = useMemo(...)`, derive the level + cost:
```ts
  const mainBuildingLevel = clampMainBuildingLevel(snapshot.mainBuildingLevel);
  const nextUpgradeCost = getMainBuildingUpgradeCost(mainBuildingLevel);
```

Add the upgrade handler (near the other `useCallback` handlers, e.g. after `removeSelectedItem`):
```ts
  const handleUpgradeBuilding = useCallback(() => {
    const result = applyCommand({ type: "upgrade-main-building" });
    if (result.ok) {
      showMessage(
        interpolate(copy.messages.upgraded, {
          level: result.snapshot.mainBuildingLevel,
        }),
      );
    }
  }, [applyCommand, copy.messages.upgraded, showMessage]);
```

Render the card under the top header. Add this block immediately **after** the closing `</div>` of the top bar (`...justify-between gap-2 ...`) and **before** the `{message ? (` toast block:
```tsx
      <div className="pointer-events-none absolute left-2 top-[4.25rem] z-30 sm:left-3">
        <EstateBuildingCard
          copy={copy}
          locale={locale}
          level={mainBuildingLevel}
          maxLevel={MAIN_BUILDING_MAX_LEVEL}
          nextCost={nextUpgradeCost}
          availablePoints={pointAccount.availablePoints}
          onUpgrade={handleUpgradeBuilding}
        />
      </div>
```

(The card's own root is `pointer-events-auto`, so the wrapper stays click-through.)

- [ ] **Step 6: Run the estate suite + quality gate**

Run: `npx vitest run src/features/estate`
Expected: PASS — including `estate-quality.test.ts` (the client still lazy-loads the canvas, no Mapbox imports, locale parity holds) and the a11y test.

- [ ] **Step 7: Commit**

```bash
git add src/features/estate/components/estate-building-card.tsx src/features/estate/__tests__/estate-building-card.test.tsx src/features/estate/components/estate-game-client.tsx
git commit -m "feat(estate): add main-building upgrade card to the estate UI"
```

---

## Task 8: Full verification + manual check

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `npm run test`
Expected: PASS — all suites green (no `mainBuildingLevel`/schema regressions; ~5 new tests for main-building, ~3 for the card, plus updated seed/renderer/migration tests).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 errors (the 2 pre-existing `game-preview.tsx` warnings may remain — do not introduce new ones).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: PASS (includes the TypeScript compile of the new schema/types).

- [ ] **Step 4: Manual live check**

Before editing more, follow `AGENTS.md`: read the relevant Next.js 16 docs under `node_modules/next/dist/docs/` if any routing/data change is needed (none expected here).

Start the app (`npm run dev`), sign in with the test account, and open a building estate via the map popup "영지 이동" → `/{locale}/subjects/{subjectId}/estate`. Confirm:
- The estate opens to a clean grass core with a single centered Lv.1 building (no trees/benches/fountain/paths).
- The "메인 건물" card shows `Lv.1`, `1 / 5`, and an upgrade button priced at 800.
- Clicking upgrade (with enough pooled points) increments to `Lv.2`, swaps to the taller sprite, shows the toast, the canvas `Lv.2` badge updates, and the available-points chip drops by 800.
- Reload the page: the level persists (loaded from the server snapshot, not reseeded).
- At Lv.5 the card shows the max-level state and the upgrade button is gone.

> The estate canvas route cannot be screenshotted by the preview tool (documented pre-existing hang). Verify via the live DOM, the points/level chips, and a reload, as prior estate work did.

- [ ] **Step 5: Check the working tree**

Run: `git status --short` and `git diff --check`
Expected: only intended files changed; `git diff --check` reports only CRLF warnings (consistent with prior estate commits).

---

## Out of scope (documented limitations)

- **No server-side per-level cost enforcement.** Like the existing item-cost limitation, `save_estate` validates net spend ≤ group pool and rejects positive deltas but does not re-derive the upgrade cost catalog in the DB. A client could write its own group's snapshot with a higher `mainBuildingLevel` without the matching spend (a within-own-group cosmetic cheat — not a points-economy or cross-group breach). Full enforcement would require porting the cost catalog into a `save_estate` check. Note it in the session record.
- **No build timers / queues** — upgrades are instant point spend (confirmed).
- **No content gating or economy bonus** from level (confirmed: visual prestige only).
- **Decoration catalog untouched** — trees/benches/etc. remain purchasable; only the seed was cleaned.

## Self-review notes (addressed during planning)

- **Schema bump is atomic** (Task 1) so the build never sits red between tasks; the `mainBuildingLevel` field, `upgrade-building` kind, and migration land together, defaulting every existing/seed snapshot to level 1.
- **`toPersistableEstateSnapshot` carries the new fields** (the one place that would silently drop them) — explicitly handled.
- **Both parse layers** (`serialization.ts`, `estate-repository.ts`) migrate v1→v2 and accept `upgrade-building`.
- **Type/name consistency:** `mainBuildingLevel`, `getMainBuildingUpgradeCost`, `getMainBuildingAssetId`, `clampMainBuildingLevel`, `MAIN_BUILDING_MAX_LEVEL`, `campus-building-lv{n}`, command `"upgrade-main-building"`, transaction `"upgrade-building"`, failure `"building-max-level"` are used identically across every task.
- **i18n parity** (ko == en leaf paths) and the **seed item id `:landmark`** (keeps canvas tests stable) are preserved.
- **Cross-task ordering caveat called out:** `serialization.ts` imports `clampMainBuildingLevel` from the Task 2 module — Task 1 Step 6 flags this so the helper is created before the first full build.
```

