# Estate Street Light Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the solar street light estate item to be placed on ordinary unlocked land while preserving locked-cell, collision, and edge-only behavior for items that still need it.

**Architecture:** The current restriction is data-driven: `solar-street-light` is cataloged as an `edge` item, and `canPlaceEstateItem()` interprets `edge` as the outside perimeter of the currently unlocked parcel island. Keep the existing estate command flow and renderer unchanged; update the item catalog, add explicit regression tests, and make the remaining edge-only failure easier to understand.

**Tech Stack:** Next.js 16.2.9 App Router, React 19, TypeScript, Vitest.

## Root Cause

- `src/features/estate/data/estate-item-catalog.ts` defines `solar-street-light` with `placementRule: "edge"`.
- `src/features/estate/domain/placement.ts` rejects `edge` items unless one occupied cell has a four-way neighbor outside the unlocked cell set.
- In the initial 15x15 central parcel, that means a 1x1 street light works only on the unlocked-area perimeter, not in normal interior garden cells or beside painted path tiles.
- `src/features/estate/__tests__/placement.test.ts` currently covers locked cells, out-of-bounds cells, rotation, and collisions, but not the `edge` rule.

## Global Constraints

- Do not commit or push unless the user explicitly asks.
- Keep the fix scoped to `src/features/estate`, `src/i18n/messages`, and tests.
- Do not change persistence or Supabase RPC behavior. The server stores snapshots and does not validate item-specific placement legality.
- No Next.js API changes are required for this plan. If implementation later touches App Router files, read the relevant local docs under `node_modules/next/dist/docs/` first per `AGENTS.md`.
- Use TDD: add failing placement/catalog expectations first, then update implementation.

---

## File Structure

- Modify: `src/features/estate/__tests__/placement.test.ts`
  - Adds regression coverage for street light placement on interior unlocked land and preserves edge-only behavior for the campus flag.
- Modify: `src/features/estate/__tests__/catalog.test.ts`
  - Locks the intended placement rules for street light and campus flag at the catalog level.
- Modify: `src/features/estate/__tests__/commands.test.ts`
  - Confirms `placeEstateItem()` and `moveEstateItem()` use the same relaxed street-light rule and preserve collision behavior.
- Modify: `src/features/estate/data/estate-item-catalog.ts`
  - Changes only `solar-street-light` from `edge` to `land`.
- Modify: `src/features/estate/domain/types.ts`
  - Adds a specific `edge-required` command failure reason.
- Modify: `src/features/estate/domain/placement.ts`
  - Returns `edge-required` instead of reusing `out-of-bounds` for valid unlocked cells that fail an edge-only rule.
- Modify: `src/i18n/messages/ko.ts`
  - Adds Korean copy for `edge-required`.
- Modify: `src/i18n/messages/en.ts`
  - Adds English copy for `edge-required`.

## Alternatives Considered

- **Option A, recommended: street light becomes `land`, flag stays `edge`.** This matches player expectation for a decorative 1x1 light, keeps the existing model simple, and avoids new UI mode/state.
- **Option B: add a new `path-adjacent` placement rule.** This would allow street lights only on or next to `stone-path` / `bright-sidewalk-block` ground tiles. It is more simulation-like but would require ground-tile-aware placement logic, new failure copy, more tests, and a clearer placement hint in the UI.
- **Option C: remove `edge` entirely.** This is fastest but weakens the campus flag's current role as a perimeter/landmark item and removes an existing mechanic without a product decision.
- **Option D: keep `edge` but improve UI hints only.** This explains the current behavior but does not solve the user's reported placement friction.

---

## Task 1: Add Street Light Placement Regression Tests

**Files:**
- Modify: `src/features/estate/__tests__/placement.test.ts`
- Modify: `src/features/estate/__tests__/catalog.test.ts`
- Modify: `src/features/estate/__tests__/commands.test.ts`

**Interfaces:**
- Consumes: `canPlaceEstateItem()`, `estateItemCatalog`, `estateExpansionCatalog`.
- Produces: failing tests that describe the intended placement contract.

- [ ] **Step 1: Normalize the placement test fixture to schema version 2**

In `src/features/estate/__tests__/placement.test.ts`, update `baseSnapshot` so new tests do not copy the stale v1 shape:

```ts
const baseSnapshot: EstateSnapshot = {
  schemaVersion: 2,
  subjectId: "yu-e21",
  mainBuildingLevel: 1,
  unlockedParcelIds: ["central-campus"],
  items: [],
  inventory: [],
  groundTiles: [],
  transactions: [],
  updatedAt: "2026-06-24T00:00:00.000Z",
};
```

- [ ] **Step 2: Add a failing test for interior street light placement**

Append this test inside `describe("estate placement", () => { ... })` in `src/features/estate/__tests__/placement.test.ts`:

```ts
it("allows solar street lights on ordinary unlocked land cells", () => {
  expect(
    canPlaceEstateItem(
      baseSnapshot,
      {
        definitionId: "solar-street-light",
        x: 1,
        y: 1,
        rotation: 0,
      },
      estateItemCatalog,
      estateExpansionCatalog,
    ),
  ).toEqual({
    ok: true,
    occupiedCells: [{ x: 1, y: 1 }],
  });
});
```

Expected before implementation: FAIL because current code returns `{ ok: false, reason: "out-of-bounds" }`.

- [ ] **Step 3: Add a preserving test for edge-only campus flags**

Append this test in the same file:

```ts
it("keeps campus flags constrained to unlocked parcel edges", () => {
  expect(
    canPlaceEstateItem(
      baseSnapshot,
      {
        definitionId: "campus-flag",
        x: 1,
        y: 1,
        rotation: 0,
      },
      estateItemCatalog,
      estateExpansionCatalog,
    ),
  ).toEqual({ ok: false, reason: "edge-required" });

  expect(
    canPlaceEstateItem(
      baseSnapshot,
      {
        definitionId: "campus-flag",
        x: 0,
        y: 1,
        rotation: 0,
      },
      estateItemCatalog,
      estateExpansionCatalog,
    ),
  ).toEqual({
    ok: true,
    occupiedCells: [{ x: 0, y: 1 }],
  });
});
```

Expected before implementation: FAIL because current code returns `out-of-bounds` instead of `edge-required`.

- [ ] **Step 4: Add catalog-level placement rule assertions**

Append this test inside `describe("estate item catalog", () => { ... })` in `src/features/estate/__tests__/catalog.test.ts`:

```ts
it("keeps street lights placeable on land while flags remain edge-only", () => {
  const placementRules = new Map(
    estateItemCatalog.map((item) => [item.id, item.placementRule]),
  );

  expect(placementRules.get("solar-street-light")).toBe("land");
  expect(placementRules.get("campus-flag")).toBe("edge");
});
```

Expected before implementation: FAIL because `solar-street-light` is currently `edge`.

- [ ] **Step 5: Run the targeted tests and verify the intended failures**

Run:

```bash
npx vitest run src/features/estate/__tests__/placement.test.ts src/features/estate/__tests__/catalog.test.ts src/features/estate/__tests__/commands.test.ts
```

Expected: FAIL with the three new expectations described above.

- [ ] **Step 6: Add command-level placement and movement regressions**

Append this test inside `describe("estate commands", () => { ... })` in `src/features/estate/__tests__/commands.test.ts`:

```ts
it("places and moves solar street lights on interior land cells", () => {
  const seed = withInventory(
    createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    }),
    "solar-street-light",
    1,
  );

  const placed = placeEstateItem(
    seed,
    {
      definitionId: "solar-street-light",
      x: 1,
      y: 1,
      rotation: 0,
    },
    createContext(1_000, ["instance-light"]),
  );

  expect(placed.ok).toBe(true);
  if (!placed.ok) return;

  const moved = moveEstateItem(
    placed.snapshot,
    {
      instanceId: "instance-light",
      x: 2,
      y: 1,
      rotation: 0,
    },
    createContext(1_000),
  );

  expect(moved.ok).toBe(true);
  if (!moved.ok) return;
  expect(moved.snapshot.items).toContainEqual(
    expect.objectContaining({
      id: "instance-light",
      definitionId: "solar-street-light",
      x: 2,
      y: 1,
      rotation: 0,
    }),
  );
});
```

Expected before implementation: FAIL because the street light is still edge-only.

- [ ] **Step 7: Add a ground-layer coexistence regression**

Append this test in `src/features/estate/__tests__/placement.test.ts`:

```ts
it("allows non-ground items on cells that already have painted ground", () => {
  expect(
    canPlaceEstateItem(
      {
        ...baseSnapshot,
        groundTiles: [{ x: 1, y: 1, definitionId: "bright-sidewalk-block" }],
      },
      {
        definitionId: "solar-street-light",
        x: 1,
        y: 1,
        rotation: 0,
      },
      estateItemCatalog,
      estateExpansionCatalog,
    ),
  ).toEqual({
    ok: true,
    occupiedCells: [{ x: 1, y: 1 }],
  });
});
```

Expected before implementation: FAIL only because the street light is still edge-only. After implementation, this locks the current model where ground tiles are a separate paint layer, not a collision object.

---

## Task 2: Update Placement Rules And Failure Copy

**Files:**
- Modify: `src/features/estate/data/estate-item-catalog.ts`
- Modify: `src/features/estate/domain/types.ts`
- Modify: `src/features/estate/domain/placement.ts`
- Modify: `src/i18n/messages/ko.ts`
- Modify: `src/i18n/messages/en.ts`

**Interfaces:**
- Produces: street lights use existing `land` placement semantics; remaining `edge` items get a specific failure reason.

- [ ] **Step 1: Change the street light catalog rule**

In `src/features/estate/data/estate-item-catalog.ts`, update only the `solar-street-light` definition:

```ts
{
  id: "solar-street-light",
  nameKey: "estate.items.solarStreetLight.name",
  descriptionKey: "estate.items.solarStreetLight.description",
  category: "energy",
  cost: 220,
  footprintWidth: 1,
  footprintHeight: 1,
  canRotate: false,
  assetId: "solar-street-light",
  placementRule: "land",
},
```

- [ ] **Step 2: Add the edge-specific failure reason type**

In `src/features/estate/domain/types.ts`, extend `EstateCommandFailureReason`:

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
  | "building-max-level"
  | "edge-required";
```

- [ ] **Step 3: Return `edge-required` for edge rule failures**

In `src/features/estate/domain/placement.ts`, change the edge-rule failure branch:

```ts
if (
  definition.placementRule === "edge" &&
  !touchesUnlockedParcelEdge(occupiedCells, unlockedCells)
) {
  return { ok: false, reason: "edge-required" };
}
```

- [ ] **Step 4: Add localized command-failure copy**

In `src/i18n/messages/ko.ts`, inside `estate.commandFailures`, add:

```ts
"edge-required": "외곽선에 닿는 칸에만 배치할 수 있습니다.",
```

In `src/i18n/messages/en.ts`, inside `estate.commandFailures`, add:

```ts
"edge-required": "Place this item on a cell touching the estate edge.",
```

- [ ] **Step 5: Run targeted tests and verify they pass**

Run:

```bash
npx vitest run src/features/estate/__tests__/placement.test.ts src/features/estate/__tests__/catalog.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run command-level regressions**

Run:

```bash
npx vitest run src/features/estate/__tests__/commands.test.ts
```

Expected: PASS.

---

## Task 3: Verify The Estate Surface

**Files:**
- No additional source files unless verification exposes a regression.

- [ ] **Step 1: Run estate domain and component tests**

Run:

```bash
npx vitest run src/features/estate/__tests__
```

Expected: PASS.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run test
npm run lint
npm run build
```

Expected: all commands exit 0. Existing `game-preview.tsx` lint warnings may appear, but no lint errors should be introduced.

- [ ] **Step 3: Manual interaction check**

Run the app with the existing local setup:

```bash
npm run dev
```

Open an estate route for a logged-in user, buy or use an owned solar street light, and verify:

```text
1. Interior unlocked cells such as (1,1) show a valid placement preview.
2. Locked parcel cells still reject placement.
3. Cells occupied by the main building or another non-ground item still reject placement.
4. Campus flag still rejects interior cells and accepts perimeter cells.
5. A successful street light placement saves and remains after reload.
```

Stop the dev server after the check if it was started only for this task.

---

## Self-Review

- Spec coverage: The user-reported street light restriction is traced to the catalog `edge` rule and removed for `solar-street-light`; remaining placement constraints stay covered by placement and command-level tests.
- Placeholder scan: No placeholders remain.
- Type consistency: `edge-required` is added to the shared failure union and both i18n dictionaries so `copy.commandFailures[result.reason]` stays total.
- Risk: Existing saved snapshots with previously placed street lights remain valid because item instance shape does not store placement rules. The change only affects future placement and movement validation.
