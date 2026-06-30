# Estate Clash-style Placement & Building UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make estate item placement/movement feel like Clash of Clans (direct drag, green/red per-cell footprint, fixed bottom controls) and consolidate the building tap UI into one non-overlapping panel, on a new branch `feat/estate-clash-placement-building-ux`.

**Architecture:** Layer interaction + presentation changes on top of the existing isometric canvas estate. The pure domain (`canPlaceEstateItem`, `move-item`/`place-item` reducers, eco-credit module) and the server-authoritative economy are unchanged. We (1) strengthen the renderer's placement preview into a per-cell green/red tint + a placement grid overlay, (2) replace the floating `ContextualItemActions` cluster with a fixed bottom edit action bar, (3) add a drag-to-move/tap-lift gesture to `EstateCanvas`, (4) consolidate the main-building member panel + the always-on building level card into one docked `EstateBuildingPanel`, (5) add on-canvas harvest bubbles over eco producers, and (6) allow dragging shop/inventory items straight onto the canvas. All overlay surfaces dock at the bottom (mobile sheet / desktop side dock) so they never collide with the top HUD.

**Tech Stack:** Next.js 16.2.9, React 19.2.4, TypeScript, Tailwind CSS v4, Vitest (+ jsdom for component/canvas tests), HTML5 Canvas 2D.

## Global Constraints

- **No new building or item types.** (User-confirmed non-goal.) Do not add catalog ids, sprites, or i18n item names.
- **No economy / server / Supabase / RPC change.** Eco-credit accrual, `save_estate`, point math, and the two-currency model are unchanged. New work is interaction + rendering + presentation only.
- **i18n is Korean-first and ko/en must stay symmetric in the same key order.** `Messages` derives from `koMessages`; `src/i18n/__tests__/messages.test.ts` asserts `Object.keys(enMessages.estate)` deep-equals (order-sensitive) `Object.keys(koMessages.estate)`. Add every new `estate.*` key in the **identical position** in `ko.ts` and `en.ts`.
- **Estate palette is self-contained** via `--es-*` tokens in `estate-shell.module.css` (`.surface`). New UI uses those tokens + the existing `styles.*` classes (`panel`, `panelStrong`, `chip`, `primaryBtn`, `ghostBtn`, `card`, `selectionCard`, `priceTag`, `coin`, `muted`, `subtle`, `divider`, `handle`). Do not introduce blue map tokens.
- **All editing controls and building info dock at the bottom** (mobile) / side dock (desktop). Nothing floats over the target cell or the top HUD.
- **Verification baseline:** full Vitest green; `npx eslint` 0 errors with the 2 pre-existing `game-preview.tsx` hook warnings; `npm run build` passes. The full-bleed canvas route cannot be screenshotted by the preview tool (pre-existing, hangs) — verify rendering/gestures by unit tests + build; the live feel is the user's dev-server check.
- **Tap vs drag threshold** stays `tapMovementTolerancePx = 10` (existing, `estate-canvas.tsx:120`).
- **Commit after every task** (do not push; the user merges/pushes explicitly).

---

## File Structure

**Create**
- `src/features/estate/components/estate-edit-action-bar.tsx` — fixed bottom action bar for placing/moving/selected-movable states (one responsibility: render the current edit actions, bottom-docked).
- `src/features/estate/__tests__/estate-edit-action-bar.test.tsx` — jsdom tests.
- `src/features/estate/components/estate-building-panel.tsx` — docked building info panel (level/upgrade + eco production/collect + contributor ranking) replacing the floating member panel and the always-on level card (one responsibility: present a selected building's info/actions).
- `src/features/estate/__tests__/estate-building-panel.test.tsx` — jsdom tests.
- `src/features/estate/isometric/harvest-bubble.ts` — pure helpers: which items show a harvest bubble and the bubble's screen anchor + hit test.
- `src/features/estate/__tests__/harvest-bubble.test.ts` — unit tests.

**Modify**
- `src/features/estate/isometric/renderer.ts` — per-cell placement tint (`getPlacementPreviewCellDiamonds` + `drawPlacementPreview`), build-grid overlay (`showBuildGrid` scene flag + `drawBuildGrid`), placement pulse, harvest-bubble drawing.
- `src/features/estate/components/estate-canvas.tsx` — drag-to-move/tap-lift gesture + mobile ghost-follow (modeRef-gated native pan), `placementActive` into the scene, harvest-bubble hit, shop-drop coordinate mapping, placement-pulse state.
- `src/features/estate/components/estate-game-client.tsx` — render the edit action bar + building panel instead of the floating cluster + member panel + level card; wire drag callbacks; bottom-dock mutual exclusion; toast reposition; harvest collect.
- `src/features/estate/components/estate-shop-client.tsx` — drag-from-card start (HTML drag → canvas drop) [Task 7].
- `src/features/estate/components/estate-shell.module.css` — bottom action bar, building panel, harvest-bubble (none — bubble is canvas-drawn), remove `.contextCluster*` after cleanup; toast tweak.
- `src/i18n/messages/ko.ts` + `src/i18n/messages/en.ts` — small additions under `estate.building` and `estate.selection` (symmetric).
- Tests updated: `isometric-renderer-assets.test.ts` (per-cell preview), `estate-canvas.test.tsx` (drag callbacks), `estate-game-client.a11y.test.tsx` (panel/bar wiring), `messages.test.ts` (auto via symmetric keys).

**Delete (Task 8, after references removed)**
- `src/features/estate/components/contextual-item-actions.tsx` + `src/features/estate/__tests__/contextual-item-actions.test.tsx`
- `src/features/estate/components/estate-building-card.tsx` + `src/features/estate/__tests__/estate-building-card.test.tsx`
- `.contextCluster`, `.contextClusterMoving`, `.contextAction*` rules in `estate-shell.module.css`.

---

## Task 1: Per-cell green/red placement footprint tint (renderer)

**Files:**
- Modify: `src/features/estate/isometric/renderer.ts` (`drawPlacementPreview` ~937-999; add exported helper near `getFootprintDiamondPoints` ~1316)
- Test: `src/features/estate/__tests__/isometric-renderer-assets.test.ts`

**Interfaces:**
- Produces: `getPlacementPreviewCellDiamonds(preview: RenderFootprintItem, metrics: IsometricTileMetrics): ScreenPoint[][]` — one diamond (4 points) per occupied footprint cell. Consumed by `drawPlacementPreview` and Task 2/7 nothing else.

- [ ] **Step 1: Write the failing pure-helper test**

In `src/features/estate/__tests__/isometric-renderer-assets.test.ts`, add `getPlacementPreviewCellDiamonds` to the import from `../isometric/renderer`, and add this test inside the `describe`:

```ts
it("returns one diamond per occupied placement-preview cell", () => {
  const diamonds = getPlacementPreviewCellDiamonds(
    {
      id: "__placement-preview__",
      x: 0,
      y: 0,
      rotation: 0,
      footprintWidth: 2,
      footprintHeight: 2,
    },
    { tileWidth: 128, tileHeight: 64 },
  );

  // 2x2 footprint => 4 cell diamonds, each with 4 corner points.
  expect(diamonds).toHaveLength(4);
  expect(diamonds[0]).toHaveLength(4);
  // First cell (0,0) top corner is the grid origin.
  expect(diamonds[0][0]).toEqual({ x: 0, y: 0 });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/features/estate/__tests__/isometric-renderer-assets.test.ts`
Expected: FAIL (`getPlacementPreviewCellDiamonds` is not exported).

- [ ] **Step 3: Add the exported helper**

In `src/features/estate/isometric/renderer.ts`, add after `getFootprintDiamondPoints` (~line 1331):

```ts
export function getPlacementPreviewCellDiamonds(
  preview: RenderFootprintItem,
  metrics: IsometricTileMetrics,
): ScreenPoint[][] {
  return getRenderFootprintCells(preview).map((cell) =>
    getCellDiamondPoints(cell, metrics),
  );
}
```

- [ ] **Step 4: Repaint the preview footprint per cell**

In `drawPlacementPreview` (~lines 944-954), replace the single-diamond fill:

```ts
    const preview = scene.placementPreview;
    const footprint = getFootprintDiamondPoints(preview, scene.metrics);

    drawWorldPolygon(this.context, footprint, camera, viewport, {
      fill: preview.valid ? "#6ee7b7" : "#fca5a5",
      stroke: preview.valid ? "#059669" : "#dc2626",
      alpha: preview.valid ? 0.3 : 0.36,
      lineWidth: 2.5,
    });
```

with a per-cell loop (keep the rest of the function — sprite + marker — unchanged):

```ts
    const preview = scene.placementPreview;

    for (const cellDiamond of getPlacementPreviewCellDiamonds(
      preview,
      scene.metrics,
    )) {
      drawWorldPolygon(this.context, cellDiamond, camera, viewport, {
        fill: preview.valid ? "#6ee7b7" : "#fca5a5",
        stroke: preview.valid ? "#059669" : "#dc2626",
        alpha: preview.valid ? 0.32 : 0.4,
        lineWidth: 1.5,
      });
    }
```

- [ ] **Step 5: Run renderer tests to confirm green**

Run: `npx vitest run src/features/estate/__tests__/isometric-renderer-assets.test.ts src/features/estate/__tests__/isometric-renderer-scene.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/estate/isometric/renderer.ts src/features/estate/__tests__/isometric-renderer-assets.test.ts
git commit -m "feat(estate): tint placement preview green/red per footprint cell"
```

---

## Task 2: Build-grid overlay during placement (renderer + scene flag)

**Files:**
- Modify: `src/features/estate/isometric/renderer.ts` (`EstateRenderScene`, `CreateEstateRenderSceneInput`, `createEstateRenderScene`, `draw`, new `drawBuildGrid`)
- Modify: `src/features/estate/components/estate-canvas.tsx` (pass `placementActive` into `createEstateRenderScene`, ~line 250)
- Test: `src/features/estate/__tests__/isometric-renderer-scene.test.ts`

**Interfaces:**
- Produces: `EstateRenderScene.showBuildGrid: boolean`; `CreateEstateRenderSceneInput.placementActive?: boolean` (default false). The canvas sets `placementActive: mode.type === "placing" || mode.type === "moving"`.

- [ ] **Step 1: Write the failing scene-flag test**

In `src/features/estate/__tests__/isometric-renderer-scene.test.ts`, add (use the file's existing `createEstateRenderScene` import + seed/demo helpers it already uses):

```ts
it("marks the build grid visible only while placement is active", () => {
  const base = {
    snapshot: createDemoEstateSeedSnapshot("yu-e21"),
    itemDefinitions: [...baseEstateItemDefinitions, ...estateItemCatalog],
    parcelDefinitions: estateExpansionCatalog,
  };

  expect(createEstateRenderScene(base).showBuildGrid).toBe(false);
  expect(
    createEstateRenderScene({ ...base, placementActive: true }).showBuildGrid,
  ).toBe(true);
});
```

(Ensure the test file imports `createDemoEstateSeedSnapshot`, `baseEstateItemDefinitions`, `estateItemCatalog`, `estateExpansionCatalog` — copy any missing import from `estate-canvas.test.tsx` lines 8-11.)

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/features/estate/__tests__/isometric-renderer-scene.test.ts`
Expected: FAIL (`showBuildGrid` undefined).

- [ ] **Step 3: Thread the flag through the scene**

In `src/features/estate/isometric/renderer.ts`:

Add to `EstateRenderScene` (after `mainBuildingLevel`):

```ts
  mainBuildingLevel: number;
  showBuildGrid: boolean;
};
```

Add to `CreateEstateRenderSceneInput` (after `animationProgress?`):

```ts
  animationProgress?: number;
  placementActive?: boolean;
};
```

In `createEstateRenderScene`, destructure `placementActive = false` and return `showBuildGrid: placementActive`:

```ts
  recentlyUnlockedParcelId = null,
  animationProgress = 1,
  placementActive = false,
}: CreateEstateRenderSceneInput): EstateRenderScene {
```

```ts
    recentlyUnlockedParcelId,
    animationProgress,
    mainBuildingLevel,
    showBuildGrid: placementActive,
  };
}
```

- [ ] **Step 4: Fix any scene literals in tests**

Run: `npx vitest run src/features/estate/__tests__/isometric-renderer-assets.test.ts`
Expected: may FAIL — the hand-built `EstateRenderScene` literals in `isometric-renderer-assets.test.ts` (e.g. line 219, 272, 323) now miss `showBuildGrid`. Add `showBuildGrid: false,` next to each `mainBuildingLevel: 1,` in those literals. Re-run to PASS.

- [ ] **Step 5: Draw the grid overlay**

In `renderer.ts` `draw()`, add the grid pass right after `drawGroundTiles(...)` (so it sits under items/preview) — insert at ~line 239:

```ts
    this.drawGroundTiles(
      scene,
      camera,
      viewport,
      assets,
      loadedAssets,
      visibleWorldBounds,
    );
    this.drawBuildGrid(scene, camera, viewport, visibleWorldBounds);
    this.drawParcelHoverGlow(scene, camera, viewport);
```

Add the method (next to `drawHoverOverlay`):

```ts
  private drawBuildGrid(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
    visibleWorldBounds: WorldBounds,
  ) {
    if (!scene.showBuildGrid) return;

    for (const cell of getSceneUnlockedCells(scene)) {
      if (
        !intersectsWorldBounds(
          getCellsWorldBounds([cell], scene.metrics),
          visibleWorldBounds,
        )
      ) {
        continue;
      }

      strokeWorldPolygon(
        this.context,
        getCellDiamondPoints(cell, scene.metrics),
        camera,
        viewport,
        { stroke: "#ffffff", alpha: 0.16, lineWidth: 1 },
      );
    }
  }
```

- [ ] **Step 6: Pass `placementActive` from the canvas**

In `src/features/estate/components/estate-canvas.tsx`, in the `scene` `useMemo` `createEstateRenderScene({...})` call (~line 250), add the flag and dependency:

```ts
      createEstateRenderScene({
        snapshot,
        itemDefinitions,
        parcelDefinitions: estateExpansionCatalog,
        hoverCell,
        selectedItemId,
        placementPreview,
        recentlyUnlockedParcelId,
        animationProgress: unlockAnimationProgress,
        placementActive: mode.type === "placing" || mode.type === "moving",
      }),
```

Add `mode` to the `useMemo` dependency array (the array at ~line 260-268) — append `mode,` (it currently lists `hoverCell, placementPreview, recentlyUnlockedParcelId, selectedItemId, snapshot, unlockAnimationProgress`).

- [ ] **Step 7: Run renderer + canvas tests + lint the canvas**

Run: `npx vitest run src/features/estate/__tests__/isometric-renderer-scene.test.ts src/features/estate/__tests__/isometric-renderer-assets.test.ts src/features/estate/__tests__/estate-canvas.test.tsx`
Expected: PASS.
Run: `npx eslint src/features/estate/components/estate-canvas.tsx src/features/estate/isometric/renderer.ts`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/estate/isometric/renderer.ts src/features/estate/components/estate-canvas.tsx src/features/estate/__tests__/isometric-renderer-scene.test.ts src/features/estate/__tests__/isometric-renderer-assets.test.ts
git commit -m "feat(estate): show a build grid overlay while placing or moving"
```

---

## Task 3: Fixed bottom edit action bar (replaces the floating cluster)

**Files:**
- Create: `src/features/estate/components/estate-edit-action-bar.tsx`
- Create: `src/features/estate/__tests__/estate-edit-action-bar.test.tsx`
- Modify: `src/features/estate/components/estate-game-client.tsx` (render the bar instead of `ContextualItemActions` for placing/moving/selected-movable; hide the inventory dock while editing)
- Modify: `src/i18n/messages/ko.ts` + `en.ts` (`estate.selection.done` for the placing hint button — optional reuse)

**Interfaces:**
- Consumes: `EstateEditorMode` (`domain/editor.ts`), `EstateMessages` (`components/estate-copy.ts`), `EstateItemDefinition` (`domain/types.ts`).
- Produces: `EstateEditActionBar` — a bottom-docked `role="toolbar"` with mode-dependent buttons. Props:

```ts
type EstateEditActionBarProps = {
  copy: EstateMessages;
  mode: EstateEditorMode;
  canRotate: boolean;
  canConfirm: boolean; // moving + a valid target chosen
  onMove: () => void;
  onRotate: () => void;
  onCollect: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};
```

- [ ] **Step 1: Write the failing component test**

Create `src/features/estate/__tests__/estate-edit-action-bar.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enMessages } from "@/i18n/messages/en";
import { EstateEditActionBar } from "../components/estate-edit-action-bar";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null;
let container: HTMLDivElement;

const baseProps = {
  copy: enMessages.estate,
  canRotate: true,
  canConfirm: false,
  onMove: () => {},
  onRotate: () => {},
  onCollect: () => {},
  onConfirm: () => {},
  onCancel: () => {},
};

describe("EstateEditActionBar", () => {
  beforeEach(() => {
    root = null;
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    document.body.replaceChildren();
  });

  it("shows move/rotate/collect/cancel when an item is selected", async () => {
    await render({ mode: { type: "selected", instanceId: "bench-1" } });
    expect(button("Move")).toBeInstanceOf(HTMLButtonElement);
    expect(button("Rotate")).toBeInstanceOf(HTMLButtonElement);
    expect(button("Collect")).toBeInstanceOf(HTMLButtonElement);
    expect(button("Cancel")).toBeInstanceOf(HTMLButtonElement);
  });

  it("shows confirm/rotate/cancel while moving and fires confirm", async () => {
    const onConfirm = vi.fn();
    await render({
      mode: { type: "moving", instanceId: "bench-1", rotation: 0 },
      canConfirm: true,
      onConfirm,
    });
    expect(query("Move")).toBeNull();
    await click(button("Confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables confirm until a valid target is chosen", async () => {
    await render({
      mode: { type: "moving", instanceId: "bench-1", rotation: 0 },
      canConfirm: false,
    });
    expect(button("Confirm").disabled).toBe(true);
  });
});

async function render(
  overrides: Partial<Parameters<typeof EstateEditActionBar>[0]>,
) {
  root = createRoot(container);
  await act(async () => {
    root?.render(<EstateEditActionBar {...baseProps} {...overrides} />);
  });
}

function query(label: string) {
  return container.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );
}

function button(label: string): HTMLButtonElement {
  const found = query(label);
  if (!found) throw new Error(`Expected ${label} button.`);
  return found;
}

async function click(el: HTMLElement) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/features/estate/__tests__/estate-edit-action-bar.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the action bar**

Create `src/features/estate/components/estate-edit-action-bar.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { Check, Move, PackageCheck, RotateCw, X } from "lucide-react";
import type { EstateEditorMode } from "../domain/editor";
import type { EstateMessages } from "./estate-copy";
import styles from "./estate-shell.module.css";

type EstateEditActionBarProps = {
  copy: EstateMessages;
  mode: EstateEditorMode;
  canRotate: boolean;
  canConfirm: boolean;
  onMove: () => void;
  onRotate: () => void;
  onCollect: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

type BarAction = {
  key: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  primary?: boolean;
  onClick: () => void;
};

export function EstateEditActionBar({
  copy,
  mode,
  canRotate,
  canConfirm,
  onMove,
  onRotate,
  onCollect,
  onConfirm,
  onCancel,
}: EstateEditActionBarProps) {
  const selection = copy.selection;
  const rotate: BarAction = {
    key: "rotate",
    label: selection.rotate,
    icon: <RotateCw size={18} aria-hidden="true" />,
    disabled: !canRotate,
    onClick: onRotate,
  };
  const cancel: BarAction = {
    key: "cancel",
    label: selection.cancel,
    icon: <X size={18} aria-hidden="true" />,
    onClick: onCancel,
  };

  const actions: BarAction[] =
    mode.type === "placing" || mode.type === "moving"
      ? [
          {
            key: "confirm",
            label: selection.confirm,
            icon: <Check size={18} aria-hidden="true" />,
            disabled: !canConfirm,
            primary: true,
            onClick: onConfirm,
          },
          rotate,
          cancel,
        ]
      : [
          {
            key: "move",
            label: selection.move,
            icon: <Move size={18} aria-hidden="true" />,
            primary: true,
            onClick: onMove,
          },
          rotate,
          {
            key: "collect",
            label: selection.collect ?? selection.remove,
            icon: <PackageCheck size={18} aria-hidden="true" />,
            onClick: onCollect,
          },
          cancel,
        ];

  return (
    <div
      role="toolbar"
      aria-label={selection.itemActions ?? selection.move}
      className={`${styles.panelStrong} pointer-events-auto fixed inset-x-2 bottom-2 z-40 mx-auto flex max-w-sm items-center justify-around gap-1 rounded-2xl p-1.5 lg:absolute lg:inset-x-auto lg:bottom-3 lg:left-1/2 lg:-translate-x-1/2`}
    >
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          aria-label={action.label}
          title={action.label}
          disabled={action.disabled}
          onClick={action.onClick}
          className={`flex h-12 min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
            action.primary ? styles.tabActive : styles.tab
          }`}
        >
          {action.icon}
          <span className="truncate">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/features/estate/__tests__/estate-edit-action-bar.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Render the bar in the game client (replace the floating cluster usage)**

In `src/features/estate/components/estate-game-client.tsx`:

Add the import (near the `ContextualItemActions` import ~line 84):

```ts
import { EstateEditActionBar } from "./estate-edit-action-bar";
```

Replace the JSX block that renders `EstateMemberPanel` / `ContextualItemActions` (~lines 909-934). Keep the protected-building member panel for now (Task 5 replaces it), and swap the `ContextualItemActions` branch for the bar:

```tsx
      {selectedIsProtected ? (
        <div className="pointer-events-none absolute left-1/2 top-[4.25rem] z-40 -translate-x-1/2 px-2">
          <EstateMemberPanel
            contributors={contributors}
            copy={copy}
            locale={locale}
            onClose={handleClearSelection}
          />
        </div>
      ) : null}

      {isEditingActive ? (
        <EstateEditActionBar
          copy={copy}
          mode={mode}
          canRotate={Boolean(activeDefinition?.canRotate) && !selectedIsProtected}
          canConfirm={canConfirmEdit}
          onMove={handleMoveSelected}
          onRotate={mode.type === "placing" ? handleRotatePlacing : rotateActiveItem}
          onCollect={removeSelectedItem}
          onConfirm={mode.type === "placing" ? undefined! : confirmMoveSelected}
          onCancel={cancelEditing}
        />
      ) : null}
```

Add the derived values near the other `const` derivations (after `selectedIsProtected`, ~line 191):

```ts
  const activeDefinition =
    mode.type === "placing"
      ? findEstateItemDefinition(itemDefinitions, mode.definitionId)
      : selectedDefinition;
  const isEditingActive =
    mode.type === "placing" ||
    mode.type === "moving" ||
    (mode.type === "selected" && !selectedIsProtected);
  const canConfirmEdit =
    mode.type === "moving" ? Boolean(mode.targetCell) : false;
```

Note: for `placing` mode the bar's Confirm should not appear (placing commits by tapping/dropping a cell). Simplify by only enabling Confirm in `moving`; in `placing` show Rotate + Cancel only. Adjust the action bar's placing branch to omit Confirm:

In `estate-edit-action-bar.tsx`, change the placing/moving branch condition so **placing** shows `[rotate, cancel]` and **moving** shows `[confirm, rotate, cancel]`:

```ts
  const actions: BarAction[] =
    mode.type === "placing"
      ? [rotate, cancel]
      : mode.type === "moving"
        ? [
            {
              key: "confirm",
              label: selection.confirm,
              icon: <Check size={18} aria-hidden="true" />,
              disabled: !canConfirm,
              primary: true,
              onClick: onConfirm,
            },
            rotate,
            cancel,
          ]
        : [/* selected: move/rotate/collect/cancel as above */];
```

(Update the test's "selected" expectations accordingly — they already target the `selected` branch.) Pass `onConfirm={confirmMoveSelected}` unconditionally from the client (placing never calls it).

Stop rendering `ContextualItemActions` (remove its JSX usage and the now-unused `selectedActionAnchor`/`onSelectedItemAnchorChange` wiring **only in Task 8** to keep this task green; for now leaving the import unused will trip lint, so also remove the `ContextualItemActions` JSX import here and delete the dead `selectedActionAnchor` state + `onSelectedItemAnchorChange` prop usage). To keep Task 3 self-contained and lint-clean:
- Remove `import { ContextualItemActions } from "./contextual-item-actions";`
- Remove `const [selectedActionAnchor, setSelectedActionAnchor] = useState<EstateItemActionAnchor | null>(null);` and its `onSelectedItemAnchorChange={setSelectedActionAnchor}` on `<EstateCanvas>` and the `anchor={selectedActionAnchor}` usage (gone with the cluster).
- Leave `EstateItemActionAnchor` import only if still referenced; otherwise drop it.

- [ ] **Step 6: Hide the inventory dock while editing**

In `estate-game-client.tsx`, gate the inventory `<aside>` (the `${styles.panelStrong} fixed inset-x-2 bottom-2 ...` block ~line 936) so it only shows in `view` mode (it would otherwise overlap the bottom action bar):

Wrap the `<aside>...</aside>` in:

```tsx
      {mode.type === "view" ? (
        <aside className={/* unchanged */}>
          {/* unchanged */}
        </aside>
      ) : null}
```

- [ ] **Step 7: Run targeted tests + lint**

Run: `npx vitest run src/features/estate/__tests__/estate-edit-action-bar.test.tsx src/features/estate/__tests__/estate-game-client.a11y.test.tsx`
Expected: PASS (update any a11y assertion that referenced the old cluster `role="toolbar"` anchor; the bar still exposes `role="toolbar"`).
Run: `npx eslint src/features/estate/components/estate-game-client.tsx src/features/estate/components/estate-edit-action-bar.tsx`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/estate/components/estate-edit-action-bar.tsx src/features/estate/__tests__/estate-edit-action-bar.test.tsx src/features/estate/components/estate-game-client.tsx
git commit -m "feat(estate): dock edit controls in a fixed bottom action bar"
```

---

## Task 4: Drag-to-move + tap-lift gesture + mobile ghost-follow (canvas + game client)

**Files:**
- Modify: `src/features/estate/components/estate-canvas.tsx` (new drag props + `itemDragRef` + `modeRef`; pointer + native-touch handling)
- Modify: `src/features/estate/components/estate-game-client.tsx` (wire drag callbacks to moving mode + commit)
- Test: `src/features/estate/__tests__/estate-canvas.test.tsx`

**Interfaces:**
- Produces (new optional `EstateCanvasProps`): `onItemDragStart?: (instanceId: string) => void`, `onItemDragMove?: (cell: EstateGridCell) => void`, `onItemDragEnd?: (committed: boolean) => void`.
- Behavior: pointer-down on a **movable** item then a drag past tolerance → `onItemDragStart` then `onItemDragMove` per cell, `onItemDragEnd(true)` on release; an unmoved press still → `onItemSelect`. In `moving` mode, dragging the ghost updates the target each cell and commits on release; a tap sets the target (confirm via the bar). On touch, single-finger pan is suppressed while `placing`/`moving` so the ghost tracks the finger.

- [ ] **Step 1: Write the failing drag test**

In `src/features/estate/__tests__/estate-canvas.test.tsx`, add (mirrors the existing `getInitialCanvasPointForCell`/`dispatchPointer` helpers):

```ts
it("drags a movable item to a new cell and commits on release", async () => {
  const snapshot = createDemoEstateSeedSnapshot("yu-e21");
  const onItemDragStart = vi.fn();
  const onItemDragMove = vi.fn();
  const onItemDragEnd = vi.fn();
  const onItemSelect = vi.fn();
  const container = document.createElement("div");
  const root: Root = createRoot(container);
  document.body.append(container);

  await act(async () =>
    root.render(
      <EstateCanvas
        snapshot={snapshot}
        ariaLabel="Interactive isometric estate canvas"
        ariaSummary="1 placed object, 1 unlocked parcel, and 0 ground tiles."
        controls={{
          assetsLoading: "Estate assets loading",
          fitView: "Fit view",
          zoomIn: "Zoom in",
          zoomOut: "Zoom out",
        }}
        onItemSelect={onItemSelect}
        onItemDragStart={onItemDragStart}
        onItemDragMove={onItemDragMove}
        onItemDragEnd={onItemDragEnd}
      />,
    ),
  );
  await flushAnimationFrames();

  const canvas = getCanvas();
  const from = getInitialCanvasPointForCell(snapshot, { x: 7, y: 7 });

  await dispatchPointer(canvas, "pointerdown", from);
  await dispatchPointer(canvas, "pointermove", { x: from.x + 60, y: from.y });
  await dispatchPointer(canvas, "pointerup", { x: from.x + 60, y: from.y });

  expect(onItemDragStart).toHaveBeenCalledWith("yu-e21:landmark");
  expect(onItemDragMove).toHaveBeenCalled();
  expect(onItemDragEnd).toHaveBeenCalledWith(true);
  expect(onItemSelect).not.toHaveBeenCalled();

  await act(async () => root.unmount());
});
```

(Note: `yu-e21:landmark` is the seed's base building. The base building is protected from moving — for this gesture test we still emit drag callbacks; the **client** decides protection. To keep the unit test about the canvas mechanics, the canvas emits `onItemDragStart` for any item; the client's `onItemDragStart` ignores the protected base building. If you prefer the canvas to gate it, pass a `movableItemIds` set — but the simpler client-side gate is used here.)

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/features/estate/__tests__/estate-canvas.test.tsx`
Expected: FAIL (drag callbacks never fire).

- [ ] **Step 3: Add the props + refs**

In `estate-canvas.tsx`, extend `EstateCanvasProps`:

```ts
  onItemSelect?: (instanceId: string) => void;
  onItemDragStart?: (instanceId: string) => void;
  onItemDragMove?: (cell: EstateGridCell) => void;
  onItemDragEnd?: (committed: boolean) => void;
  onBackgroundTap?: () => void;
```

Destructure them in the component signature alongside `onItemSelect`.

Add a `modeRef` (so native touch handlers see the live mode) after the other refs (~line 158):

```ts
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
```

Add an item-drag ref next to `pendingCanvasPressRef` (~line 151):

```ts
  const itemDragRef = useRef<{
    pointerId: number;
    instanceId: string;
    fromMoving: boolean;
    moved: boolean;
    lastCellKey: string | null;
  } | null>(null);
```

- [ ] **Step 4: Convert a select-press into a drag past tolerance**

In `handlePointerDown`, in the **item branch** (currently ~674-688, the `if (item && event.button === 0)` block), it already records a `select-item` pending press — keep it. The conversion happens in `handlePointerMove`.

Add a new **moving-mode** branch at the top of `handlePointerDown` replacing the existing combined `placing || moving` block (~663-672). Split them:

```ts
    if (event.button === 0 && mode.type === "placing") {
      if (cell) {
        setHoverCell(cell);
        onCellClick?.(cell);
      }
      return;
    }

    if (event.button === 0 && mode.type === "moving") {
      if (cell) {
        event.currentTarget.setPointerCapture(event.pointerId);
        itemDragRef.current = {
          pointerId: event.pointerId,
          instanceId: mode.instanceId,
          fromMoving: true,
          moved: false,
          lastCellKey: `${cell.x}:${cell.y}`,
        };
        setHoverCell(cell);
        onCellClick?.(cell); // sets the target cell (tap-to-target)
      }
      return;
    }
```

In `handlePointerMove`, handle an active item drag **before** the pending-press logic (insert after the `paintPointerRef` block ~745):

```ts
    const itemDrag = itemDragRef.current;
    if (itemDrag?.pointerId === event.pointerId) {
      if (!itemDrag.moved && isPastTapMovementTolerance(/* start */ itemDrag, point)) {
        itemDrag.moved = true;
      }
      if (cell) {
        const key = `${cell.x}:${cell.y}`;
        if (key !== itemDrag.lastCellKey) {
          itemDrag.lastCellKey = key;
          setHoverCell(cell);
          if (itemDrag.fromMoving) {
            onCellClick?.(cell); // moving: update target each cell
          } else {
            onItemDragMove?.(cell);
          }
        }
      }
      return;
    }
```

`isPastTapMovementTolerance` takes `(start, end)`. The `itemDrag` ref has no `start` — store the start point. Extend the ref shape to include `start: TouchPoint` and set it in `handlePointerDown` (`start: point`). Then the move check is `isPastTapMovementTolerance(itemDrag.start, point)`.

For the **select→drag** conversion (a movable item pressed in view/selected), update the existing pending-press handling in `handlePointerMove` (~747-771). When the pending press is a `select-item` and movement passes tolerance, instead of converting to a pan, convert to an item drag:

```ts
    if (pendingPress?.pointerId === event.pointerId) {
      pendingPress.last = point;

      if (isPastTapMovementTolerance(pendingPress.start, point)) {
        if (pendingPress.action.type === "select-item") {
          const instanceId = pendingPress.action.instanceId;
          pendingCanvasPressRef.current = null;
          itemDragRef.current = {
            pointerId: event.pointerId,
            instanceId,
            fromMoving: false,
            moved: true,
            lastCellKey: cell ? `${cell.x}:${cell.y}` : null,
            start: pendingPress.start,
          };
          onItemDragStart?.(instanceId);
          if (cell) {
            setHoverCell(cell);
            onItemDragMove?.(cell);
          }
          return;
        }

        // open-locked-parcel / clear-selection: convert to a camera pan (unchanged).
        pendingCanvasPressRef.current = null;
        pointerPanRef.current = { pointerId: event.pointerId, last: point };
        setCamera((current) =>
          panCameraByCanvasDelta(
            current,
            { x: point.x - pendingPress.start.x, y: point.y - pendingPress.start.y },
            { sensitivity: estateDragPanSensitivity },
          ),
        );
      }

      return;
    }
```

In `handlePointerUp`, handle the item drag release **before** the pending-press block (~804):

```ts
    if (itemDragRef.current?.pointerId === event.pointerId) {
      const drag = itemDragRef.current;
      itemDragRef.current = null;
      if (drag.fromMoving) {
        // moving: a real drag commits; an unmoved tap leaves the target set.
        if (drag.moved) onItemDragEnd?.(true);
      } else {
        onItemDragEnd?.(drag.moved);
      }
      return;
    }
```

Also handle it in `handlePointerCancel`: if `itemDragRef.current?.pointerId === event.pointerId`, call `onItemDragEnd?.(false)` and clear the ref.

Update the `PendingCanvasPress` type and `itemDragRef` type to include `start: TouchPoint` where referenced (the drag ref needs `start`).

- [ ] **Step 5: Suppress native single-finger pan while placing/moving (mobile ghost-follow)**

In the native touch effect (`handleTouchStart` ~558, `handleTouchMove` ~573), gate single-finger pan on the live mode via `modeRef`:

In `handleTouchStart`, the `event.touches.length === 1` branch — only start a pan when not placing/moving:

```ts
      if (event.touches.length === 1) {
        const editing =
          modeRef.current.type === "placing" || modeRef.current.type === "moving";
        touchPanRef.current = editing ? null : getTouchPoint(event.touches[0], canvas);
        pinchRef.current = null;
        return;
      }
```

In `handleTouchMove`, the `event.touches.length === 1 && touchPanRef.current` branch is already guarded by `touchPanRef.current` being set, so suppressing it in start is enough (pointer events drive the ghost). No further change needed there.

- [ ] **Step 6: Run the canvas test to confirm pass**

Run: `npx vitest run src/features/estate/__tests__/estate-canvas.test.tsx`
Expected: PASS (the new drag test + all existing tests — the unmoved-press select test still passes because a press with no move never converts to a drag).

- [ ] **Step 7: Wire the drag callbacks in the game client**

In `estate-game-client.tsx`, add handlers near `handleItemSelect` (~751):

```ts
  function handleItemDragStart(instanceId: string) {
    const instance = snapshotRef.current.items.find((item) => item.id === instanceId);
    const definition = instance
      ? findEstateItemDefinition(allItemDefinitions, instance.definitionId)
      : null;
    if (!instance || !definition) return;
    if (instance.definitionId === baseEstateBuildingDefinition.id) {
      // Protected base building: a drag selects it (shows the panel) instead of moving.
      setMode({ type: "selected", instanceId });
      return;
    }
    setSheetOpen(false);
    setMode({
      type: "moving",
      instanceId,
      rotation: instance.rotation,
      targetCell: { x: instance.x, y: instance.y },
    });
  }

  function handleItemDragMove(cell: EstateGridCell) {
    setMode((current) =>
      current.type === "moving" ? { ...current, targetCell: cell } : current,
    );
  }

  function handleItemDragEnd(committed: boolean) {
    if (!committed) return;
    confirmMoveSelected();
  }
```

Pass them to `<EstateCanvas>` (alongside `onItemSelect`, ~811):

```tsx
          onItemSelect={handleItemSelect}
          onItemDragStart={handleItemDragStart}
          onItemDragMove={handleItemDragMove}
          onItemDragEnd={handleItemDragEnd}
          onBackgroundTap={handleClearSelection}
```

(`confirmMoveSelected` already reads `mode.targetCell` and applies the `move-item` command; with drag it commits at the released cell. `baseEstateBuildingDefinition` is already imported.)

- [ ] **Step 8: Run targeted tests + lint + a11y**

Run: `npx vitest run src/features/estate/__tests__/estate-canvas.test.tsx src/features/estate/__tests__/estate-game-client.a11y.test.tsx`
Expected: PASS.
Run: `npx eslint src/features/estate/components/estate-canvas.tsx src/features/estate/components/estate-game-client.tsx`
Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add src/features/estate/components/estate-canvas.tsx src/features/estate/components/estate-game-client.tsx src/features/estate/__tests__/estate-canvas.test.tsx
git commit -m "feat(estate): drag-to-move and tap-lift item placement with mobile ghost-follow"
```

---

## Task 5: Unified building panel (replaces member panel + level card)

**Files:**
- Create: `src/features/estate/components/estate-building-panel.tsx`
- Create: `src/features/estate/__tests__/estate-building-panel.test.tsx`
- Modify: `src/features/estate/components/estate-game-client.tsx` (render the panel for selected items; remove the floating member panel + the always-on `EstateBuildingCard`)
- Modify: `src/i18n/messages/ko.ts` + `en.ts` (`estate.building.production`, `estate.building.tapHint`)

**Interfaces:**
- Consumes: `SubjectContributor[]`, `EstateMessages`, `Locale`, eco helpers (`getAvailableEcoCredits`), `getEstateEcoRatePerHour` (from `domain/eco-credit.ts`), main-building helpers.
- Produces: `EstateBuildingPanel` — a bottom-docked panel. Props:

```ts
type EstateBuildingPanelProps = {
  copy: EstateMessages;
  locale: Locale;
  variant: "main-building" | "item";
  title: string;
  level?: number;
  maxLevel?: number;
  nextCost?: number | null;
  availablePoints?: number;
  ecoRatePerHour?: number;
  ecoAvailable?: number;
  contributors?: SubjectContributor[];
  onUpgrade?: () => void;
  onCollectEco?: () => void;
  onClose: () => void;
};
```

- [ ] **Step 1: Write the failing panel test**

Create `src/features/estate/__tests__/estate-building-panel.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enMessages } from "@/i18n/messages/en";
import { EstateBuildingPanel } from "../components/estate-building-panel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null;
let container: HTMLDivElement;

const base = {
  copy: enMessages.estate,
  locale: "en" as const,
  title: "Central library",
  onClose: () => {},
};

describe("EstateBuildingPanel", () => {
  beforeEach(() => {
    root = null;
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    document.body.replaceChildren();
  });

  it("shows the level, an upgrade button, and the contributor list for the main building", async () => {
    const onUpgrade = vi.fn();
    await render({
      variant: "main-building",
      level: 3,
      maxLevel: 5,
      nextCost: 4500,
      availablePoints: 1000070,
      ecoRatePerHour: 18,
      ecoAvailable: 240,
      contributors: [
        { userId: "u1", displayName: "Demo", points: 1000070, rank: 1, isMe: true },
      ],
      onUpgrade,
    });

    expect(container.textContent).toContain("Central library");
    expect(container.textContent).toContain("Demo");
    await click(button(enMessages.estate.building.upgrade));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("hides upgrade/contributors for an ordinary item", async () => {
    await render({ variant: "item", title: "Bench" });
    expect(query(enMessages.estate.building.upgrade)).toBeNull();
  });
});

async function render(
  overrides: Partial<Parameters<typeof EstateBuildingPanel>[0]>,
) {
  root = createRoot(container);
  await act(async () => {
    root?.render(<EstateBuildingPanel {...base} variant="item" {...overrides} />);
  });
}

function query(label: string) {
  return container.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"], button[title="${label}"]`,
  );
}

function button(label: string): HTMLButtonElement {
  const found = query(label);
  if (!found) throw new Error(`Expected ${label} button.`);
  return found;
}

async function click(el: HTMLElement) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/features/estate/__tests__/estate-building-panel.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Add the i18n keys (ko then en, symmetric)**

In `src/i18n/messages/ko.ts`, `estate.building` (after `insufficient`, ~line 171):

```ts
      insufficient: "포인트가 부족합니다",
      production: "에코 생산",
```

In `src/i18n/messages/en.ts`, the matching `estate.building` block, same positions:

```ts
      insufficient: "Not enough points",
      production: "Eco output",
```

(Match the existing en wording for the keys already present; only `production` is new.)

- [ ] **Step 4: Implement the panel**

Create `src/features/estate/components/estate-building-panel.tsx`:

```tsx
"use client";

import { Building2, ChevronUp, Coins, Crown, Sprout, Users, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { SubjectContributor } from "@/features/account/domain/contributor-ranking";
import type { EstateMessages } from "./estate-copy";
import styles from "./estate-shell.module.css";

type EstateBuildingPanelProps = {
  copy: EstateMessages;
  locale: Locale;
  variant: "main-building" | "item";
  title: string;
  level?: number;
  maxLevel?: number;
  nextCost?: number | null;
  availablePoints?: number;
  ecoRatePerHour?: number;
  ecoAvailable?: number;
  contributors?: SubjectContributor[];
  onUpgrade?: () => void;
  onCollectEco?: () => void;
  onClose: () => void;
};

export function EstateBuildingPanel({
  copy,
  locale,
  variant,
  title,
  level,
  maxLevel,
  nextCost,
  availablePoints = 0,
  ecoRatePerHour = 0,
  ecoAvailable = 0,
  contributors = [],
  onUpgrade,
  onCollectEco,
  onClose,
}: EstateBuildingPanelProps) {
  const isMain = variant === "main-building";
  const affordable = nextCost != null && availablePoints >= nextCost;

  return (
    <section
      className={`${styles.panelStrong} pointer-events-auto fixed inset-x-2 bottom-2 z-40 mx-auto flex max-w-md flex-col gap-3 rounded-3xl p-3.5 lg:absolute lg:inset-x-auto lg:bottom-3 lg:right-3 lg:w-[22rem]`}
      aria-label={title}
    >
      <header className="flex items-center gap-2.5">
        <span className={`${styles.chip} grid h-10 w-10 place-items-center rounded-xl`}>
          <Building2 size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold leading-tight">{title}</h2>
          {isMain && level != null && maxLevel != null ? (
            <p className={`${styles.muted} text-[11px]`}>
              {interpolate(copy.building.levelProgress, { level, max: maxLevel })}
            </p>
          ) : null}
        </div>
        {isMain && level != null ? (
          <span className={`${styles.chip} flex h-7 items-center rounded-lg px-2 text-xs font-bold tabular-nums`}>
            {interpolate(copy.building.level, { level })}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.member.close}
          title={copy.member.close}
          className={`${styles.ghostBtn} grid h-8 w-8 place-items-center rounded-lg`}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      {isMain ? (
        nextCost == null ? (
          <div className={`${styles.selectionCard} flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold`}>
            <Crown size={15} aria-hidden="true" />
            {copy.building.maxLevel}
          </div>
        ) : (
          <button
            type="button"
            className={`${styles.primaryBtn} flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55`}
            disabled={!affordable}
            onClick={onUpgrade}
            aria-label={copy.building.upgrade}
            title={affordable ? copy.building.upgrade : copy.building.insufficient}
          >
            <ChevronUp size={16} aria-hidden="true" />
            <span>{copy.building.upgrade}</span>
            <span className={`${styles.divider} mx-1 h-4 w-px`} aria-hidden="true" />
            <Coins size={14} className={styles.coin} aria-hidden="true" />
            <span className="font-mono tabular-nums">{formatPoints(locale, nextCost)}</span>
          </button>
        )
      ) : null}

      {isMain ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--es-line-soft)] bg-[var(--es-inset)] px-3 py-2">
          <span className={`${styles.muted} flex items-center gap-1.5 text-xs`}>
            <Sprout size={14} className={styles.coin} aria-hidden="true" />
            {copy.building.production}
            <strong className="font-mono tabular-nums">+{ecoRatePerHour}/h</strong>
          </span>
          <button
            type="button"
            className={`${styles.primaryBtn} inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold`}
            onClick={onCollectEco}
            aria-label={copy.eco.collect}
          >
            <Sprout size={13} aria-hidden="true" />
            {formatPoints(locale, ecoAvailable)}
          </button>
        </div>
      ) : null}

      {isMain ? (
        <div className="flex min-h-0 flex-col gap-1.5">
          <span className={`${styles.muted} flex items-center gap-1.5 text-[11px] font-medium`}>
            <Users size={13} aria-hidden="true" />
            {copy.member.title}
          </span>
          {contributors.length === 0 ? (
            <p className={`${styles.muted} ${styles.miniMetric} rounded-xl px-3 py-3 text-center text-[12px]`}>
              {copy.member.empty}
            </p>
          ) : (
            <ol className="flex max-h-[28vh] flex-col gap-1 overflow-y-auto">
              {contributors.map((contributor) => (
                <li
                  key={contributor.userId}
                  className={`${contributor.isMe ? styles.selectionCard : styles.chip} flex items-center gap-2 rounded-xl px-2 py-1.5`}
                >
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-bold tabular-nums">
                    {contributor.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                    {contributor.displayName}
                    {contributor.isMe ? (
                      <span className={`${styles.priceTag} ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold`}>
                        {copy.member.you}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex-none text-[13px] font-bold tabular-nums">
                    {formatPoints(locale, contributor.points)}
                    <span className={`${styles.muted} ml-0.5 text-[11px] font-semibold`}>
                      {copy.member.pointsUnit}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 5: Run to confirm pass**

Run: `npx vitest run src/features/estate/__tests__/estate-building-panel.test.tsx src/i18n/__tests__/messages.test.ts`
Expected: PASS.

- [ ] **Step 6: Render the panel from the game client; drop the floating member panel + level card**

In `estate-game-client.tsx`:

Add imports:

```ts
import { EstateBuildingPanel } from "./estate-building-panel";
import { getEstateEcoRatePerHour } from "../domain/eco-credit";
```

Remove the always-on building-level card block (`<div className="pointer-events-none absolute left-2 top-[4.25rem] ...">` wrapping `<EstateBuildingCard>` ~lines 889-899) and the `EstateBuildingCard` import.

Replace the protected-building `EstateMemberPanel` block (~909-917) and add a panel for any selected building. The panel shows for `selected` mode (both main building and movable items show a panel; movable items also get the edit action bar from Task 3). Render after the HUD:

```tsx
      {mode.type === "selected" && selectedInstance && selectedDefinition ? (
        <EstateBuildingPanel
          copy={copy}
          locale={locale}
          variant={selectedIsProtected ? "main-building" : "item"}
          title={
            selectedIsProtected
              ? copy.building.cardTitle
              : getItemName(selectedDefinition, copy)
          }
          level={selectedIsProtected ? mainBuildingLevel : undefined}
          maxLevel={selectedIsProtected ? MAIN_BUILDING_MAX_LEVEL : undefined}
          nextCost={selectedIsProtected ? nextUpgradeCost : undefined}
          availablePoints={pointAccount.availablePoints}
          ecoRatePerHour={
            selectedIsProtected
              ? getEstateEcoRatePerHour(snapshot, allItemDefinitions)
              : undefined
          }
          ecoAvailable={selectedIsProtected ? availableEco : undefined}
          contributors={selectedIsProtected ? contributors : undefined}
          onUpgrade={handleUpgradeBuilding}
          onCollectEco={handleCollectEco}
          onClose={handleClearSelection}
        />
      ) : null}
```

Because the panel now owns the selected-building info AND a movable item shows BOTH a panel and the bottom action bar, avoid stacking: when an ordinary item is selected, show the **action bar** only (move/rotate/collect/cancel) and a slim title — do not also show the full panel. Refine: render `EstateBuildingPanel` only for the **main building** (`selectedIsProtected`), and let movable selected items use the action bar alone:

```tsx
      {mode.type === "selected" && selectedIsProtected ? (
        <EstateBuildingPanel
          copy={copy}
          locale={locale}
          variant="main-building"
          title={copy.building.cardTitle}
          level={mainBuildingLevel}
          maxLevel={MAIN_BUILDING_MAX_LEVEL}
          nextCost={nextUpgradeCost}
          availablePoints={pointAccount.availablePoints}
          ecoRatePerHour={getEstateEcoRatePerHour(snapshot, allItemDefinitions)}
          ecoAvailable={availableEco}
          contributors={contributors}
          onUpgrade={handleUpgradeBuilding}
          onCollectEco={handleCollectEco}
          onClose={handleClearSelection}
        />
      ) : null}
```

The main building is protected, so `isEditingActive` (Task 3) is false for it (its `selected` is `selectedIsProtected`), meaning the action bar does not show for the main building — only this panel does. Movable items show only the action bar. No overlap.

Remove the now-unused `EstateMemberPanel` import + JSX. (Leave `estate-member-panel.tsx` file deletion to Task 8 if still imported anywhere; grep shows it is only used here, so remove the import now and delete the file in Task 8.)

- [ ] **Step 7: Run targeted tests + lint**

Run: `npx vitest run src/features/estate/__tests__/estate-building-panel.test.tsx src/features/estate/__tests__/estate-game-client.a11y.test.tsx`
Expected: PASS (update any a11y assertion referencing the old member-panel `aria-label` to the panel's `aria-label={title}`).
Run: `npx eslint src/features/estate/components/estate-game-client.tsx src/features/estate/components/estate-building-panel.tsx`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/estate/components/estate-building-panel.tsx src/features/estate/__tests__/estate-building-panel.test.tsx src/features/estate/components/estate-game-client.tsx src/i18n/messages/ko.ts src/i18n/messages/en.ts
git commit -m "feat(estate): consolidate building level/eco/contributors into one docked panel"
```

---

## Task 6: Harvest bubbles over eco producers

**Files:**
- Create: `src/features/estate/isometric/harvest-bubble.ts`
- Create: `src/features/estate/__tests__/harvest-bubble.test.ts`
- Modify: `src/features/estate/isometric/renderer.ts` (draw bubbles when `scene.harvestBubbleVisible`)
- Modify: `src/features/estate/components/estate-canvas.tsx` (bubble hit-test on tap → `onHarvest`)
- Modify: `src/features/estate/components/estate-game-client.tsx` (pass `harvestable` + `onHarvest` → `handleCollectEco`)

**Interfaces:**
- Produces:
  - `EstateRenderScene.harvestBubbleItemIds: string[]` (item ids that should show a bubble) — set in `createEstateRenderScene` from a new input `harvestBubbleItemIds`.
  - `harvest-bubble.ts`: `getHarvestBubbleScreenAnchor(item: RenderFootprintItem, metrics, camera, viewport): ScreenPoint` (footprint top-center lifted above the sprite), and `isPointOnHarvestBubble(point: ScreenPoint, anchor: ScreenPoint, radius?: number): boolean`.
- Behavior: when eco is available (`availableEco > 0`), the main building (and any generator) shows a small bubble; tapping a bubble calls `onHarvest()` → `handleCollectEco()`.

- [ ] **Step 1: Write the failing helper test**

Create `src/features/estate/__tests__/harvest-bubble.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getHarvestBubbleScreenAnchor,
  isPointOnHarvestBubble,
} from "../isometric/harvest-bubble";

describe("harvest bubble", () => {
  const item = {
    id: "g1",
    x: 0,
    y: 0,
    rotation: 0 as const,
    footprintWidth: 2,
    footprintHeight: 2,
  };

  it("anchors the bubble above the footprint top center", () => {
    const anchor = getHarvestBubbleScreenAnchor(
      item,
      { tileWidth: 128, tileHeight: 64 },
      { x: 0, y: 0, zoom: 1 },
      { width: 400, height: 300 },
    );
    // Footprint top corner (0,0) projects to world (0,0); canvas center offset
    // applies, then the bubble lifts upward (smaller y).
    expect(anchor.x).toBeCloseTo(200); // viewport center x
    expect(anchor.y).toBeLessThan(150);
  });

  it("hits within the bubble radius and misses outside", () => {
    const anchor = { x: 200, y: 100 };
    expect(isPointOnHarvestBubble({ x: 205, y: 104 }, anchor)).toBe(true);
    expect(isPointOnHarvestBubble({ x: 260, y: 160 }, anchor)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/features/estate/__tests__/harvest-bubble.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the helper**

Create `src/features/estate/isometric/harvest-bubble.ts`:

```ts
import { worldToCanvas, type IsometricCamera, type ViewportSize } from "./camera";
import {
  getCellsWorldBounds,
  type IsometricTileMetrics,
  type ScreenPoint,
} from "./projection";
import { getRenderFootprintCells, type RenderFootprintItem } from "./render-order";

export const HARVEST_BUBBLE_RADIUS = 18;

/** Screen point just above a footprint's top corner where the bubble floats. */
export function getHarvestBubbleScreenAnchor(
  item: RenderFootprintItem,
  metrics: IsometricTileMetrics,
  camera: IsometricCamera,
  viewport: ViewportSize,
): ScreenPoint {
  const bounds = getCellsWorldBounds(getRenderFootprintCells(item), metrics);
  const canvas = worldToCanvas(
    { x: bounds.minX + (bounds.maxX - bounds.minX) / 2, y: bounds.minY },
    camera,
    viewport,
  );
  return { x: canvas.x, y: canvas.y - 54 * camera.zoom };
}

export function isPointOnHarvestBubble(
  point: ScreenPoint,
  anchor: ScreenPoint,
  radius: number = HARVEST_BUBBLE_RADIUS,
): boolean {
  return Math.hypot(point.x - anchor.x, point.y - anchor.y) <= radius + 6;
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/features/estate/__tests__/harvest-bubble.test.ts`
Expected: PASS.

- [ ] **Step 5: Draw bubbles in the renderer**

In `renderer.ts`, add `harvestBubbleItemIds: string[]` to `EstateRenderScene` and `CreateEstateRenderSceneInput` (`harvestBubbleItemIds?: string[]`, default `[]`); set it in `createEstateRenderScene` return (`harvestBubbleItemIds: harvestBubbleItemIds`). Update the `isometric-renderer-assets.test.ts` scene literals to add `harvestBubbleItemIds: []` next to `showBuildGrid: false` (added in Task 2).

Add the draw pass in `draw()` after `drawMainBuildingBadge` (~line 252):

```ts
    this.drawMainBuildingBadge(scene, camera, viewport);
    this.drawHarvestBubbles(scene, camera, viewport);
```

Add the method (and import the helper at the top: `import { getHarvestBubbleScreenAnchor, HARVEST_BUBBLE_RADIUS } from "./harvest-bubble";`):

```ts
  private drawHarvestBubbles(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
  ) {
    if (scene.harvestBubbleItemIds.length === 0) return;
    const ids = new Set(scene.harvestBubbleItemIds);
    const ctx = this.context;

    for (const item of scene.items) {
      if (!ids.has(item.id)) continue;
      const anchor = getHarvestBubbleScreenAnchor(
        item,
        scene.metrics,
        camera,
        viewport,
      );
      const radius = HARVEST_BUBBLE_RADIUS * Math.max(0.8, camera.zoom);

      ctx.save();
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#f2b53c";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      // a small leaf/sprout mark
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(anchor.x, anchor.y, radius * 0.32, radius * 0.5, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
```

- [ ] **Step 6: Hit-test bubbles on tap (canvas)**

In `estate-canvas.tsx`, add prop `onHarvest?: (instanceId: string) => void`. In `handlePointerDown`, before the item/parcel/clear-selection branches (after the placing/moving branches), check bubbles when in `view`/`selected`:

```ts
    if (event.button === 0 && (mode.type === "view" || mode.type === "selected")) {
      const bubbleId = findHarvestBubbleAtPoint(scene, point, camera, viewport);
      if (bubbleId) {
        event.currentTarget.setPointerCapture(event.pointerId);
        pendingCanvasPressRef.current = {
          pointerId: event.pointerId,
          start: point,
          last: point,
          action: { type: "harvest-bubble", instanceId: bubbleId },
        };
        return;
      }
    }
```

Add `{ type: "harvest-bubble"; instanceId: string }` to the `PendingCanvasPress` action union, handle it in `commitPendingCanvasPress` (`if (pendingPress.action.type === "harvest-bubble") { onHarvest?.(pendingPress.action.instanceId); return; }`), and add the local helper:

```ts
function findHarvestBubbleAtPoint(
  scene: EstateRenderScene,
  point: TouchPoint,
  camera: IsometricCamera,
  viewport: ViewportSize,
): string | null {
  for (const id of scene.harvestBubbleItemIds) {
    const item = scene.items.find((candidate) => candidate.id === id);
    if (!item) continue;
    const anchor = getHarvestBubbleScreenAnchor(item, scene.metrics, camera, viewport);
    if (isPointOnHarvestBubble(point, anchor)) return item.id;
  }
  return null;
}
```

Import `getHarvestBubbleScreenAnchor, isPointOnHarvestBubble` from `../isometric/harvest-bubble`. Pass `harvestBubbleItemIds` into `createEstateRenderScene` from a new `EstateCanvasProps.harvestBubbleItemIds?: string[]` (default `[]`) and add it to the `scene` `useMemo` deps.

- [ ] **Step 7: Wire from the game client**

In `estate-game-client.tsx`, compute the harvestable item ids (the main building instance when eco is available) and pass them down:

```ts
  const harvestBubbleItemIds = useMemo(() => {
    if (availableEco <= 0) return [];
    const main = snapshot.items.find(
      (item) => item.definitionId === baseEstateBuildingDefinition.id,
    );
    return main ? [main.id] : [];
  }, [availableEco, snapshot.items]);
```

On `<EstateCanvas>`, add `harvestBubbleItemIds={harvestBubbleItemIds}` and `onHarvest={handleCollectEco}` (the existing collect handler ignores its argument).

- [ ] **Step 8: Run targeted tests + lint**

Run: `npx vitest run src/features/estate/__tests__/harvest-bubble.test.ts src/features/estate/__tests__/estate-canvas.test.tsx src/features/estate/__tests__/isometric-renderer-assets.test.ts`
Expected: PASS.
Run: `npx eslint src/features/estate/isometric/harvest-bubble.ts src/features/estate/isometric/renderer.ts src/features/estate/components/estate-canvas.tsx src/features/estate/components/estate-game-client.tsx`
Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add src/features/estate/isometric/harvest-bubble.ts src/features/estate/__tests__/harvest-bubble.test.ts src/features/estate/isometric/renderer.ts src/features/estate/components/estate-canvas.tsx src/features/estate/components/estate-game-client.tsx src/features/estate/__tests__/isometric-renderer-assets.test.ts
git commit -m "feat(estate): tap-to-collect harvest bubbles over eco producers"
```

---

## Task 7: Drag a shop/inventory item straight onto the canvas

**Files:**
- Modify: `src/features/estate/components/estate-game-client.tsx` (inventory "Place" cards become draggable; canvas drop → start placing at the dropped cell)
- Modify: `src/features/estate/components/estate-canvas.tsx` (accept HTML drop → map to a cell → `onCanvasDropDefinition`)

**Interfaces:**
- Produces: `EstateCanvasProps.onCanvasDropDefinition?: (definitionId: string, cell: EstateGridCell) => void`. The canvas listens for `dragover`/`drop`, reads `dataTransfer.getData("application/x-estate-item")`, maps the drop point to a cell, and calls the callback.
- The client's inventory card sets `draggable` + `onDragStart` writing the definition id; `onCanvasDropDefinition` enters `placing` then immediately attempts placement at the cell (reusing `applyCommand` `place-item`).

- [ ] **Step 1: Write the failing canvas drop test**

In `estate-canvas.test.tsx`, add:

```ts
it("maps an HTML drop to a grid cell and reports the dropped definition", async () => {
  const snapshot = createDemoEstateSeedSnapshot("yu-e21");
  const onCanvasDropDefinition = vi.fn();
  const container = document.createElement("div");
  const root: Root = createRoot(container);
  document.body.append(container);

  await act(async () =>
    root.render(
      <EstateCanvas
        snapshot={snapshot}
        ariaLabel="Interactive isometric estate canvas"
        ariaSummary="1 placed object, 1 unlocked parcel, and 0 ground tiles."
        controls={{
          assetsLoading: "Estate assets loading",
          fitView: "Fit view",
          zoomIn: "Zoom in",
          zoomOut: "Zoom out",
        }}
        onCanvasDropDefinition={onCanvasDropDefinition}
      />,
    ),
  );
  await flushAnimationFrames();

  const canvas = getCanvas();
  const point = getInitialCanvasPointForCell(snapshot, { x: 8, y: 8 });

  await act(async () => {
    const event = new Event("drop", { bubbles: true, cancelable: true }) as Event & {
      dataTransfer: DataTransfer;
      clientX: number;
      clientY: number;
    };
    Object.defineProperties(event, {
      clientX: { value: point.x },
      clientY: { value: point.y },
      dataTransfer: {
        value: { getData: () => "broadleaf-tree" } as unknown as DataTransfer,
      },
    });
    canvas.dispatchEvent(event);
  });

  expect(onCanvasDropDefinition).toHaveBeenCalledWith(
    "broadleaf-tree",
    expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
  );

  await act(async () => root.unmount());
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/features/estate/__tests__/estate-canvas.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Handle drop on the canvas element**

In `estate-canvas.tsx`, add the prop `onCanvasDropDefinition?: (definitionId: string, cell: EstateGridCell) => void` to `EstateCanvasProps` + destructure. Add handlers on the `<canvas>` element:

```tsx
        onPointerCancel={handlePointerCancel}
        onDragOver={(event) => {
          if (onCanvasDropDefinition) event.preventDefault();
        }}
        onDrop={handleCanvasDrop}
```

Add the handler:

```ts
  const handleCanvasDrop = (event: ReactDragEvent<HTMLCanvasElement>) => {
    if (!onCanvasDropDefinition) return;
    const definitionId = event.dataTransfer.getData("application/x-estate-item");
    if (!definitionId) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const point = getPointerCanvasPosition(event, rect, 1).css;
    const cell = hitTestDiamondCellAtCanvasPoint(point, camera, viewport, {
      allowedCells: getSceneCellList(scene),
    });
    if (cell) onCanvasDropDefinition(definitionId, cell);
  };
```

Import the React type: `import { ..., type DragEvent as ReactDragEvent } from "react";`. (`getPointerCanvasPosition` accepts `{ clientX, clientY }`, which the drag event provides.)

- [ ] **Step 4: Run the canvas test to confirm pass**

Run: `npx vitest run src/features/estate/__tests__/estate-canvas.test.tsx`
Expected: PASS.

- [ ] **Step 5: Make inventory cards draggable + wire the drop in the client**

In `estate-game-client.tsx`, in `InventoryPanel`'s `<div className={...card...}>` per entry (~1141), make the placement entries draggable (skip ground items, which paint):

```tsx
          <div
            key={definition.id}
            draggable={definition.placementRule !== "ground"}
            onDragStart={(event) => {
              event.dataTransfer.setData("application/x-estate-item", definition.id);
              event.dataTransfer.effectAllowed = "copy";
            }}
            className={`${styles.card} flex items-center gap-3 rounded-2xl p-2.5`}
            ...
```

Add a drop handler near `handleCellClick` and pass it to the canvas:

```ts
  function handleCanvasDropDefinition(definitionId: string, cell: EstateGridCell) {
    const definition = findEstateItemDefinition(itemDefinitions, definitionId);
    if (!definition || definition.placementRule === "ground") return;
    if (getInventoryQuantity(snapshotRef.current.inventory, definition.id) < 1) {
      showMessage(copy.commandFailures["missing-inventory"]);
      return;
    }
    setSheetOpen(false);
    const result = applyCommand({
      type: "place-item",
      definitionId: definition.id,
      x: cell.x,
      y: cell.y,
      rotation: 0,
    });
    if (result.ok) {
      setMode({ type: "view" });
      showMessage(copy.messages.placed);
    }
  }
```

On `<EstateCanvas>`, add `onCanvasDropDefinition={handleCanvasDropDefinition}`.

- [ ] **Step 6: Run targeted tests + lint**

Run: `npx vitest run src/features/estate/__tests__/estate-canvas.test.tsx src/features/estate/__tests__/estate-game-client.a11y.test.tsx`
Expected: PASS.
Run: `npx eslint src/features/estate/components/estate-canvas.tsx src/features/estate/components/estate-game-client.tsx`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/estate/components/estate-canvas.tsx src/features/estate/components/estate-game-client.tsx src/features/estate/__tests__/estate-canvas.test.tsx
git commit -m "feat(estate): drag inventory items onto the canvas to place them"
```

---

## Task 8: Cleanup, HUD/toast reposition, delete dead components, full verification

**Files:**
- Modify: `src/features/estate/components/estate-game-client.tsx` (toast position; remove leftover imports)
- Modify: `src/features/estate/components/estate-shell.module.css` (remove `.contextCluster*`/`.contextAction*`)
- Delete: `src/features/estate/components/contextual-item-actions.tsx`, `src/features/estate/__tests__/contextual-item-actions.test.tsx`
- Delete: `src/features/estate/components/estate-building-card.tsx`, `src/features/estate/__tests__/estate-building-card.test.tsx`
- Delete: `src/features/estate/components/estate-member-panel.tsx`, `src/features/estate/__tests__/estate-member-panel.test.tsx`
- Modify: `src/features/estate/isometric/action-anchor.ts` + `src/features/estate/__tests__/action-anchor.test.ts` — keep only if still used; otherwise delete.

- [ ] **Step 1: Confirm the dead modules have no importers**

Run: `npx grep -rn "contextual-item-actions\|estate-building-card\|estate-member-panel\|action-anchor" src/features/estate --include=*.ts --include=*.tsx` (or use ripgrep). Expected: only the files themselves + their tests reference them now (the game client no longer imports them after Tasks 3 & 5). If `action-anchor` is still imported by `estate-canvas.tsx` (it was used for the floating cluster), remove that usage — the drag gesture no longer needs the per-frame selected-item anchor. Delete the `onSelectedItemAnchorChange` prop, the anchor-emitting `useEffect`, and the `lastSelectedItemAnchorRef` machinery from `estate-canvas.tsx`, and the `selectedActionAnchor` state from the client (already removed in Task 3). Update `estate-canvas.test.tsx` to drop the now-removed anchor tests ("emits a screen anchor…", "moves the action anchor…", "emits null…", "does not re-emit…").

- [ ] **Step 2: Reposition the toast clear of the bottom docks**

In `estate-game-client.tsx`, the toast (`${styles.toast} ... absolute left-1/2 top-[4.5rem] ...` ~line 901) stays top-centered but must clear the building card removal — it already sits below the HUD. Keep `top-[4.5rem]`; no bottom collision since docks are at the bottom. No change required unless the a11y test asserts otherwise; verify visually on dev.

- [ ] **Step 3: Delete the dead files**

```bash
git rm src/features/estate/components/contextual-item-actions.tsx src/features/estate/__tests__/contextual-item-actions.test.tsx src/features/estate/components/estate-building-card.tsx src/features/estate/__tests__/estate-building-card.test.tsx src/features/estate/components/estate-member-panel.tsx src/features/estate/__tests__/estate-member-panel.test.tsx
```

If `action-anchor.ts` is now unused (grep returns nothing outside its test): `git rm src/features/estate/isometric/action-anchor.ts src/features/estate/__tests__/action-anchor.test.ts`.

- [ ] **Step 4: Remove the dead CSS**

In `estate-shell.module.css`, delete the `.contextCluster`, `.contextCluster:hover`, `.contextCluster:focus-within`, `.contextClusterMoving`, `.contextAction`, `.contextAction:hover…`, `.contextAction:disabled` rules (lines ~128-174).

- [ ] **Step 5: TypeScript + lint + full test sweep**

Run: `npx tsc --noEmit`
Expected: no new errors from estate files (pre-existing unrelated errors, if any, ignored).
Run: `npx eslint src/features/estate`
Expected: 0 errors.
Run: `npm run test`
Expected: all green (deleted tests gone; new tests pass).

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(estate): remove floating cluster/level-card/member-panel and dead anchor code"
```

---

## Self-Review

**1. Spec coverage:**
- Spec A (HUD cleanup, remove level card, toast, bottom dock, no double overlay) → Tasks 3, 5, 8.
- Spec B (drag + tap-lift, per-cell green/red, grid overlay, mobile ghost-follow, snap pulse, shop→canvas drag) → Tasks 1 (tint), 2 (grid), 4 (drag/tap-lift/mobile), 7 (shop drag). **Snap/placement pulse** from the spec is not its own task — it is optional polish; if desired, add a short pulse in Task 4 Step 4 by storing a `placementPulse` ref on commit and drawing a fading ring (reuse `animateCameraTo`'s rAF pattern). Marked optional to keep the core green; **note for the implementer: the pulse is the one spec item intentionally deferred to a follow-up if time-boxed.**
- Spec C (unified building panel, redesign member panel, absorb level card) → Task 5.
- Spec D (harvest bubbles, keep header chip as collect-all) → Task 6 (the header Sprout chip in the HUD is untouched, so "collect all" remains).
- Spec E (verification) → each task + Task 8.

**2. Placeholder scan:** No "TBD/TODO". The pulse is explicitly flagged as optional (not a hidden placeholder). The `onConfirm={...undefined!}` early draft was corrected to always pass `confirmMoveSelected`.

**3. Type consistency:** New props (`onItemDragStart/Move/End`, `onHarvest`, `onCanvasDropDefinition`, `harvestBubbleItemIds`) are declared in `EstateCanvasProps` and consumed by the client with matching signatures. `EstateRenderScene` gains `showBuildGrid` (Task 2) and `harvestBubbleItemIds` (Task 6) — both added to `CreateEstateRenderSceneInput` and to the hand-built scene literals in `isometric-renderer-assets.test.ts`. `getEstateEcoRatePerHour`/`getAvailableEcoCredits`/`collectEcoCredits` already exist in `domain/eco-credit.ts`.

**Note on test-literal churn:** Tasks 2 and 6 each add a required field to `EstateRenderScene`; every hand-built scene literal in `isometric-renderer-assets.test.ts` (3 of them) must gain `showBuildGrid: false` then `harvestBubbleItemIds: []`. This is called out in each task's steps.
