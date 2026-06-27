# Estate 15x15 Grid And 3x3 Main Building Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the estate parcel unit from 16x16 to 15x15 and make the fixed main building occupy a centered 3x3 footprint.

**Architecture:** Keep the existing estate domain model and expansion catalog shape. Update the parcel catalog, seed snapshot, and item definition constants, then align the boundary and render tests that encode the old 16x16 / 2x2 assumptions.

**Tech Stack:** Next.js 16.2.9 App Router, React 19, TypeScript, Vitest.

## Global Constraints

- Follow `AGENTS.md`: read `docs/working/current-state.md`, `docs/working/meeting-notes.md`, `docs/README.md`, and relevant `node_modules/next/dist/docs/` content before editing.
- Do not commit or push unless the user explicitly asks.
- Keep the estate change scoped to `src/features/estate` plus the required plan/docs records.
- Preserve the current expansion topology: 1 initial center parcel plus 8 surrounding lockable parcels.
- Apply TDD: update tests first, observe the intended failure, then update implementation.

---

## File Structure

- Modify: `src/features/estate/data/estate-expansion-catalog.ts`
  - Owns the 9 parcel definitions. The central, edge, and corner parcels all move from 16x16 to 15x15, forming a 45x45 map spanning x/y `-15..29`.
- Modify: `src/features/estate/data/estate-item-catalog.ts`
  - Owns the fixed base campus building definition. Change its footprint from `2x2` to `3x3`.
- Modify: `src/features/estate/data/demo-estate-data.ts`
  - Owns fresh estate seed snapshots. Center the 3x3 main building at `(6,6)` inside the `0..14` central parcel.
- Modify tests:
  - `src/features/estate/__tests__/expansion.test.ts`
  - `src/features/estate/__tests__/placement.test.ts`
  - `src/features/estate/__tests__/commands.test.ts`
  - `src/features/estate/__tests__/estate-canvas.test.tsx`
  - `src/features/estate/__tests__/estate-repository.test.ts`
  - `src/features/estate/__tests__/isometric-renderer-scene.test.ts`

## Task 1: Estate Grid And Main Building Footprint

**Files:**
- Modify: `src/features/estate/data/estate-expansion-catalog.ts`
- Modify: `src/features/estate/data/estate-item-catalog.ts`
- Modify: `src/features/estate/data/demo-estate-data.ts`
- Test: `src/features/estate/__tests__/expansion.test.ts`
- Test: `src/features/estate/__tests__/placement.test.ts`
- Test: `src/features/estate/__tests__/commands.test.ts`
- Test: `src/features/estate/__tests__/estate-canvas.test.tsx`
- Test: `src/features/estate/__tests__/estate-repository.test.ts`
- Test: `src/features/estate/__tests__/isometric-renderer-scene.test.ts`

**Interfaces:**
- Consumes: `estateExpansionCatalog`, `baseEstateBuildingDefinition`, `createDemoEstateSeedSnapshot(subjectId: string)`.
- Produces: 15x15 parcel bounds, a 3x3 base building definition, and seed snapshots with the main building at `x: 6`, `y: 6`.

- [ ] **Step 1: Update tests for the new 15x15 and 3x3 contract**

In `src/features/estate/__tests__/expansion.test.ts`, assert the new parcel size and boundary:

```ts
expect(estateExpansionCatalog.find((parcel) => parcel.initial)).toMatchObject({
  id: "central-campus",
  cost: 0,
  bounds: { minX: 0, minY: 0, width: 15, height: 15 },
});
expect(cells).toHaveLength(450);
expect(cells).toContainEqual({ x: 15, y: 0 });
expect(parcel ? getParcelCells(parcel) : []).toContainEqual({ x: 0, y: 15 });
```

In `src/features/estate/__tests__/placement.test.ts`, move the locked east-cell check from `x: 16` to `x: 15`:

```ts
{
  definitionId: "solar-pavilion",
  x: 15,
  y: 7,
  rotation: 0,
}
```

In `src/features/estate/__tests__/commands.test.ts`, move the skipped locked-cell paint coordinate from `x: 16` to `x: 15`:

```ts
cells: [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 15, y: 0 },
],
```

In `src/features/estate/__tests__/estate-canvas.test.tsx`, move the initial canvas point for the east parcel from `{ x: 16, y: 0 }` to `{ x: 15, y: 0 }`.

In `src/features/estate/__tests__/estate-repository.test.ts`, assert the centered 3x3 seed:

```ts
expect(snapshot.items).toEqual([
  expect.objectContaining({
    id: "yu-e21:landmark",
    definitionId: "base-campus-building",
    x: 6,
    y: 6,
    rotation: 0,
  }),
]);
```

In `src/features/estate/__tests__/isometric-renderer-scene.test.ts`, assert the rendered main building footprint and east hover boundary:

```ts
expect(scene.items.find((item) => item.id === "yu-e21:landmark")).toMatchObject({
  assetId: "campus-building-lv1",
  footprintWidth: 3,
  footprintHeight: 3,
});

hoverCell: { x: 15, y: 0 },
```

- [ ] **Step 2: Run targeted tests and verify they fail for the old constants**

Run:

```bash
npx vitest run src/features/estate/__tests__/expansion.test.ts src/features/estate/__tests__/placement.test.ts src/features/estate/__tests__/commands.test.ts src/features/estate/__tests__/estate-canvas.test.tsx src/features/estate/__tests__/estate-repository.test.ts src/features/estate/__tests__/isometric-renderer-scene.test.ts
```

Expected: FAIL with assertions showing old `16`, `512`, `x: 7`, or `footprintWidth: 2` values.

- [ ] **Step 3: Update the expansion catalog implementation**

In `src/features/estate/data/estate-expansion-catalog.ts`, replace the 16x16 bounds with 15x15 bounds:

```ts
bounds: { minX: 0, minY: 0, width: 15, height: 15 },
bounds: { minX: 0, minY: -15, width: 15, height: 15 },
bounds: { minX: 15, minY: 0, width: 15, height: 15 },
bounds: { minX: 0, minY: 15, width: 15, height: 15 },
bounds: { minX: -15, minY: 0, width: 15, height: 15 },
bounds: { minX: 15, minY: -15, width: 15, height: 15 },
bounds: { minX: 15, minY: 15, width: 15, height: 15 },
bounds: { minX: -15, minY: 15, width: 15, height: 15 },
bounds: { minX: -15, minY: -15, width: 15, height: 15 },
```

Update the file comment to say 15x15 parcels and 45x45 map.

- [ ] **Step 4: Update the main building definition and seed**

In `src/features/estate/data/estate-item-catalog.ts`:

```ts
footprintWidth: 3,
footprintHeight: 3,
```

In `src/features/estate/data/demo-estate-data.ts`:

```ts
x: 6,
y: 6,
```

Update the comment to say the `3x3` footprint at `(6,6)` covers cells `(6..8, 6..8)` inside the `0..14` core.

- [ ] **Step 5: Run targeted tests and verify they pass**

Run:

```bash
npx vitest run src/features/estate/__tests__/expansion.test.ts src/features/estate/__tests__/placement.test.ts src/features/estate/__tests__/commands.test.ts src/features/estate/__tests__/estate-canvas.test.tsx src/features/estate/__tests__/estate-repository.test.ts src/features/estate/__tests__/isometric-renderer-scene.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run full verification**

Run:

```bash
npm run test
npm run lint
npm run build
```

Expected: all commands exit 0. If lint is polluted by generated design-sync artifacts, use the existing source-only fallback documented in repo memory and report that explicitly.

## Self-Review

- Spec coverage: The estate grid size changes from 16x16 to 15x15 through the parcel catalog and boundary tests. The main building changes from 2x2 to 3x3 through the item catalog, seed snapshot, and render-scene tests.
- Placeholder scan: No placeholders remain in this plan.
- Type consistency: Existing names remain unchanged: `estateExpansionCatalog`, `baseEstateBuildingDefinition`, `createDemoEstateSeedSnapshot`, and `base-campus-building`.
