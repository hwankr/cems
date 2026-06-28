# Estate Contextual Item Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make placed estate items easier to manage by showing move, rotate, collect, and close actions next to the selected item instead of only in a bottom selection bar.

**Architecture:** Keep the existing estate command model: item selection still starts in `EstateCanvas`, and move, rotate, and remove still flow through `EstateGameClient` into the existing `move-item` and `remove-item` commands. Add a small canvas-to-HTML bridge that calculates the selected item's current screen anchor from the isometric scene and camera, then render an accessible HTML action menu clamped inside the viewport. No Supabase, RPC, snapshot schema, or point-economy changes are needed.

**Tech Stack:** Next.js 16.2.9 App Router, React 19, TypeScript, CSS Modules, lucide-react, Vitest/jsdom.

---

## Current Behavior

- `src/features/estate/components/estate-canvas.tsx` detects an unmoved tap/click on a rendered item and calls `onItemSelect(instanceId)`.
- `src/features/estate/components/estate-game-client.tsx` stores `{ type: "selected", instanceId }`, then renders `SelectionBar` near the bottom of the viewport.
- Existing actions already work: `handleMoveSelected()`, `rotateActiveItem()`, and `removeSelectedItem()`.
- The uncomfortable part is spatial: after selecting an item, the action UI appears away from the item, competing with the mobile bottom dock and making item management feel disconnected.

## Design Decision

Recommended approach: **anchored HTML action menu**.

- It appears just above the selected item's rendered footprint and stays inside the viewport while panning or zooming.
- It uses real buttons, titles, disabled states, and screen-reader labels.
- It reuses the current command handlers, so persistence and point accounting stay unchanged.
- It avoids drawing UI controls into the canvas, which would be harder to make accessible and test.

Alternatives considered:

- **Canvas-drawn radial controls:** visually direct, but inaccessible without duplicated DOM controls and more fragile on mobile.
- **Right-click / long-press context menu:** discoverability is poor on mobile and conflicts with panning/touch gestures.
- **Only restyle the bottom selection bar:** fastest, but it does not solve the user's main complaint that actions are not near the selected item.

## Global Constraints

- Do not commit or push unless the user explicitly asks.
- Keep the change scoped to `src/features/estate`, `src/i18n/messages`, and tests.
- Do not change Supabase tables, RPCs, RLS policies, or snapshot schema.
- Do not change the existing item economy: collect/remove returns the item to inventory and does not refund points.
- If implementation later touches Next.js App Router files, read the relevant local docs under `node_modules/next/dist/docs/` first per `AGENTS.md`.
- Use TDD: add failing tests for anchor calculation, canvas anchor emission, and contextual actions before implementation.

---

## File Structure

- Create: `src/features/estate/isometric/action-anchor.ts`
  - Pure helper that converts a selected render item into a viewport-relative anchor.
- Create: `src/features/estate/__tests__/action-anchor.test.ts`
  - Unit coverage for anchor calculation and missing item behavior.
- Create: `src/features/estate/components/contextual-item-actions.tsx`
  - Accessible anchored action menu component.
- Create: `src/features/estate/__tests__/contextual-item-actions.test.tsx`
  - Unit coverage for visible actions, disabled protected-item actions, moving-state actions, and viewport clamping.
- Modify: `src/features/estate/components/estate-canvas.tsx`
  - Adds `onSelectedItemAnchorChange` prop and emits anchor updates when selection, camera, or viewport changes.
- Modify: `src/features/estate/components/estate-game-client.tsx`
  - Stores the selected item anchor, passes the callback to `EstateCanvas`, replaces `SelectionBar` with `ContextualItemActions`, and keeps current handlers.
- Modify: `src/features/estate/components/estate-shell.module.css`
  - Adds warm-glass contextual menu styles matching the current sunny-garden estate theme.
- Modify: `src/i18n/messages/ko.ts`
  - Updates item action copy from destructive "철거" wording to "회수" where the item returns to inventory.
- Modify: `src/i18n/messages/en.ts`
  - Updates matching English copy from "Remove" to "Collect".
- Modify: `src/features/estate/__tests__/estate-canvas.test.tsx`
  - Adds coverage that the canvas emits the selected item anchor and clears it when the item is not selected.
- Modify: `src/features/estate/__tests__/estate-game-client.a11y.test.tsx`
  - Extends the canvas mock so selecting an item shows the contextual menu and keyboard/click actions remain reachable.

---

## Task 1: Add Pure Anchor Calculation

**Files:**
- Create: `src/features/estate/isometric/action-anchor.ts`
- Create: `src/features/estate/__tests__/action-anchor.test.ts`

**Interfaces:**
- Consumes: `EstateRenderScene`, `IsometricCamera`, `ViewportSize`.
- Produces: `EstateItemActionAnchor | null`.

- [ ] **Step 1: Write the failing anchor tests**

Create `src/features/estate/__tests__/action-anchor.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  baseEstateItemDefinitions,
  estateItemCatalog,
} from "../data/estate-item-catalog";
import { estateExpansionCatalog } from "../data/estate-expansion-catalog";
import { createInitialEstateSnapshot } from "../domain/commands";
import { getSelectedItemActionAnchor } from "../isometric/action-anchor";
import { createEstateRenderScene } from "../isometric/renderer";

describe("selected estate item action anchor", () => {
  const snapshot = {
    ...createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-28T00:00:00.000Z",
    }),
    items: [
      {
        id: "bench-1",
        definitionId: "bench",
        x: 2,
        y: 3,
        rotation: 0,
        placedAt: "2026-06-28T00:00:00.000Z",
      },
    ],
  };
  const scene = createEstateRenderScene({
    snapshot,
    itemDefinitions: [...baseEstateItemDefinitions, ...estateItemCatalog],
    parcelDefinitions: estateExpansionCatalog,
  });

  it("returns a viewport-relative anchor for the selected item", () => {
    const anchor = getSelectedItemActionAnchor(scene, {
      itemId: "bench-1",
      camera: { x: 0, y: 0, zoom: 1 },
      viewport: { width: 720, height: 360 },
    });

    expect(anchor).toEqual({
      x: expect.any(Number),
      y: expect.any(Number),
      viewportWidth: 720,
      viewportHeight: 360,
    });
    expect(anchor?.x).toBeGreaterThan(0);
    expect(anchor?.x).toBeLessThan(720);
  });

  it("returns null when the selected item is no longer in the scene", () => {
    expect(
      getSelectedItemActionAnchor(scene, {
        itemId: "missing-item",
        camera: { x: 0, y: 0, zoom: 1 },
        viewport: { width: 720, height: 360 },
      }),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
npx vitest run src/features/estate/__tests__/action-anchor.test.ts
```

Expected: FAIL because `src/features/estate/isometric/action-anchor.ts` does not exist.

- [ ] **Step 3: Add the minimal anchor helper**

Create `src/features/estate/isometric/action-anchor.ts`:

```ts
import type { ViewportSize, IsometricCamera } from "./camera";
import { worldToCanvas } from "./camera";
import { getCellsWorldBounds } from "./projection";
import { getRenderFootprintCells } from "./render-order";
import type { EstateRenderScene } from "./renderer";

export type EstateItemActionAnchor = {
  x: number;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
};

type SelectedItemActionAnchorInput = {
  itemId: string;
  camera: IsometricCamera;
  viewport: ViewportSize;
};

export function getSelectedItemActionAnchor(
  scene: EstateRenderScene,
  input: SelectedItemActionAnchorInput,
): EstateItemActionAnchor | null {
  const item = scene.items.find((candidate) => candidate.id === input.itemId);
  if (!item) return null;

  const bounds = getCellsWorldBounds(
    getRenderFootprintCells(item),
    scene.metrics,
  );
  const canvas = worldToCanvas(
    {
      x: bounds.minX + (bounds.maxX - bounds.minX) / 2,
      y: bounds.minY,
    },
    input.camera,
    input.viewport,
  );

  return {
    x: canvas.x,
    y: canvas.y,
    viewportWidth: input.viewport.width,
    viewportHeight: input.viewport.height,
  };
}
```

- [ ] **Step 4: Re-run the anchor test**

Run:

```bash
npx vitest run src/features/estate/__tests__/action-anchor.test.ts
```

Expected: PASS.

---

## Task 2: Emit Selected Item Anchors From The Canvas

**Files:**
- Modify: `src/features/estate/components/estate-canvas.tsx`
- Modify: `src/features/estate/__tests__/estate-canvas.test.tsx`

**Interfaces:**
- Adds optional prop: `onSelectedItemAnchorChange?: (anchor: EstateItemActionAnchor | null) => void`.

- [ ] **Step 1: Add the failing canvas test**

Append this test to `src/features/estate/__tests__/estate-canvas.test.tsx`:

```ts
it("emits a screen anchor for the selected estate item", async () => {
  const snapshot = createDemoEstateSeedSnapshot("yu-e21");
  const onSelectedItemAnchorChange = vi.fn();
  const container = document.createElement("div");
  const root: Root = createRoot(container);
  document.body.append(container);

  await act(async () =>
    root.render(
      <EstateCanvas
        snapshot={snapshot}
        selectedItemId="yu-e21:landmark"
        ariaLabel="Interactive isometric estate canvas"
        ariaSummary="4 placed objects, 1 unlocked parcel, and 6 ground tiles."
        controls={{
          assetsLoading: "Estate assets loading",
          fitView: "Fit view",
          zoomIn: "Zoom in",
          zoomOut: "Zoom out",
        }}
        onSelectedItemAnchorChange={onSelectedItemAnchorChange}
      />,
    ),
  );
  await flushAnimationFrames();

  expect(onSelectedItemAnchorChange).toHaveBeenLastCalledWith({
    x: expect.any(Number),
    y: expect.any(Number),
    viewportWidth: 720,
    viewportHeight: 360,
  });

  await act(async () => root.unmount());
});
```

Expected before implementation: FAIL because `onSelectedItemAnchorChange` is not a prop.

- [ ] **Step 2: Extend the canvas prop type and import the helper**

In `src/features/estate/components/estate-canvas.tsx`, add:

```ts
import {
  getSelectedItemActionAnchor,
  type EstateItemActionAnchor,
} from "../isometric/action-anchor";
```

Extend `EstateCanvasProps`:

```ts
onSelectedItemAnchorChange?: (anchor: EstateItemActionAnchor | null) => void;
```

Add it to the component destructuring:

```ts
onSelectedItemAnchorChange,
```

- [ ] **Step 3: Emit anchor updates from canvas state**

Add this effect after the existing refs are synchronized:

```ts
useEffect(() => {
  if (!onSelectedItemAnchorChange) return;

  if (!selectedItemId) {
    onSelectedItemAnchorChange(null);
    return;
  }

  onSelectedItemAnchorChange(
    getSelectedItemActionAnchor(scene, {
      itemId: selectedItemId,
      camera,
      viewport,
    }),
  );
}, [
  camera,
  onSelectedItemAnchorChange,
  scene,
  selectedItemId,
  viewport,
]);
```

- [ ] **Step 4: Re-run the canvas test**

Run:

```bash
npx vitest run src/features/estate/__tests__/estate-canvas.test.tsx
```

Expected: PASS.

---

## Task 3: Build The Contextual Action Menu Component

**Files:**
- Create: `src/features/estate/components/contextual-item-actions.tsx`
- Create: `src/features/estate/__tests__/contextual-item-actions.test.tsx`
- Modify: `src/features/estate/components/estate-shell.module.css`

**Interfaces:**
- Consumes selected item definition, instance, mode, protected status, anchor, and action handlers.
- Produces a viewport-clamped action toolbar.

- [ ] **Step 1: Write failing component tests**

Create `src/features/estate/__tests__/contextual-item-actions.test.tsx`:

```ts
// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { baseEstateBuildingDefinition, estateItemCatalog } from "../data/estate-item-catalog";
import { ContextualItemActions, getContextualActionMenuPosition } from "../components/contextual-item-actions";
import type { EstateItemInstance } from "../domain/types";
import { enMessages } from "@/i18n/messages/en";

const bench = estateItemCatalog.find((item) => item.id === "bench");
if (!bench) throw new Error("Expected bench definition.");

const instance: EstateItemInstance = {
  id: "bench-1",
  definitionId: "bench",
  x: 2,
  y: 3,
  rotation: 0,
  placedAt: "2026-06-28T00:00:00.000Z",
};

describe("ContextualItemActions", () => {
  it("renders selected item actions near the provided anchor", async () => {
    const onMove = vi.fn();
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => {
      root.render(
        <ContextualItemActions
          copy={enMessages.estate}
          definition={bench}
          instance={instance}
          mode={{ type: "selected", instanceId: "bench-1" }}
          protectedItem={false}
          anchor={{ x: 180, y: 140, viewportWidth: 720, viewportHeight: 360 }}
          onCancel={vi.fn()}
          onMove={onMove}
          onRotate={vi.fn()}
          onCollect={vi.fn()}
        />,
      );
    });

    const toolbar = document.querySelector('[role="toolbar"]');
    expect(toolbar?.textContent).toContain("Bench");
    expect(toolbar?.textContent).toContain("Move");
    expect(toolbar?.textContent).toContain("Collect");

    await click(getButton("Move"));
    expect(onMove).toHaveBeenCalledTimes(1);

    await act(async () => root.unmount());
  });

  it("disables protected item actions", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => {
      root.render(
        <ContextualItemActions
          copy={enMessages.estate}
          definition={baseEstateBuildingDefinition}
          instance={{ ...instance, definitionId: baseEstateBuildingDefinition.id }}
          mode={{ type: "selected", instanceId: baseEstateBuildingDefinition.id }}
          protectedItem={true}
          anchor={{ x: 180, y: 140, viewportWidth: 720, viewportHeight: 360 }}
          onCancel={vi.fn()}
          onMove={vi.fn()}
          onRotate={vi.fn()}
          onCollect={vi.fn()}
        />,
      );
    });

    expect(getButton("Move")).toBeDisabled();
    expect(getButton("Collect")).toBeDisabled();

    await act(async () => root.unmount());
  });

  it("clamps the menu inside the viewport", () => {
    expect(
      getContextualActionMenuPosition({
        anchor: { x: 4, y: 10, viewportWidth: 320, viewportHeight: 240 },
        menuWidth: 248,
        menuHeight: 76,
        topReserved: 72,
        bottomReserved: 92,
      }),
    ).toEqual({ left: 12, top: 72 });
  });
});

async function click(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function getButton(name: string): HTMLButtonElement {
  const button = [...document.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.includes(name),
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected button ${name}.`);
  }

  return button;
}
```

Expected before implementation: FAIL because the component does not exist.

- [ ] **Step 2: Add CSS module classes**

Append to `src/features/estate/components/estate-shell.module.css`:

```css
.contextMenu {
  position: absolute;
  z-index: 45;
  width: min(17rem, calc(100vw - 1rem));
  border: 1px solid var(--es-line);
  background: var(--es-panel-strong);
  box-shadow: var(--es-shadow);
  backdrop-filter: blur(14px) saturate(130%);
}

.contextMenuMoving {
  border-color: color-mix(in srgb, var(--es-gold) 42%, var(--es-line));
}

.contextMenuTitle {
  color: var(--es-ink);
}

.contextMenuMeta {
  color: var(--es-ink-subtle);
}

.contextAction {
  color: var(--es-ink-muted);
  transition:
    background 150ms ease,
    color 150ms ease,
    transform 150ms ease;
}

.contextAction:hover:not(:disabled) {
  background: var(--es-accent-soft);
  color: var(--es-accent-strong);
  transform: translateY(-1px);
}

.contextAction:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}
```

- [ ] **Step 3: Implement the contextual menu**

Create `src/features/estate/components/contextual-item-actions.tsx`:

```tsx
"use client";

import { Move, RotateCw, PackageCheck, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { EstateItemActionAnchor } from "../isometric/action-anchor";
import type { EstateEditorMode } from "../domain/editor";
import type { EstateItemDefinition, EstateItemInstance } from "../domain/types";
import { getItemName, type EstateMessages } from "./estate-copy";
import styles from "./estate-shell.module.css";

type ContextualItemActionsProps = {
  copy: EstateMessages;
  definition: EstateItemDefinition;
  instance: EstateItemInstance;
  mode: EstateEditorMode;
  protectedItem: boolean;
  anchor: EstateItemActionAnchor | null;
  onCancel: () => void;
  onMove: () => void;
  onRotate: () => void;
  onCollect: () => void;
};

type MenuPositionInput = {
  anchor: EstateItemActionAnchor;
  menuWidth: number;
  menuHeight: number;
  topReserved: number;
  bottomReserved: number;
};

const menuWidth = 272;
const menuHeight = 78;
const edgePadding = 12;

export function ContextualItemActions({
  copy,
  definition,
  instance,
  mode,
  protectedItem,
  anchor,
  onCancel,
  onMove,
  onRotate,
  onCollect,
}: ContextualItemActionsProps) {
  if (!anchor) return null;

  const moving = mode.type === "moving";
  const position = getContextualActionMenuPosition({
    anchor,
    menuWidth,
    menuHeight,
    topReserved: 76,
    bottomReserved: 96,
  });
  const style = {
    left: `${position.left}px`,
    top: `${position.top}px`,
  } satisfies CSSProperties;

  return (
    <div
      role="toolbar"
      aria-label={copy.selection.itemActions}
      className={`${styles.contextMenu} ${
        moving ? styles.contextMenuMoving : ""
      } rounded-2xl p-1.5`}
      style={style}
    >
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1 px-2">
          <p className={`${styles.contextMenuTitle} truncate text-[13px] font-semibold`}>
            {getItemName(definition, copy)}
          </p>
          <p className={`${styles.contextMenuMeta} truncate text-[11px]`}>
            {moving ? copy.selection.choosingMoveTarget : `${instance.x}, ${instance.y}`}
          </p>
        </div>
        {moving ? null : (
          <ContextAction
            disabled={protectedItem}
            icon={<Move size={15} aria-hidden="true" />}
            label={copy.selection.move}
            onClick={onMove}
          />
        )}
        <ContextAction
          disabled={protectedItem || !definition.canRotate}
          icon={<RotateCw size={15} aria-hidden="true" />}
          label={copy.selection.rotate}
          onClick={onRotate}
        />
        {moving ? null : (
          <ContextAction
            disabled={protectedItem}
            icon={<PackageCheck size={15} aria-hidden="true" />}
            label={copy.selection.collect}
            onClick={onCollect}
          />
        )}
        <ContextAction
          icon={<X size={15} aria-hidden="true" />}
          label={copy.selection.cancel}
          onClick={onCancel}
        />
      </div>
    </div>
  );
}

export function getContextualActionMenuPosition({
  anchor,
  menuWidth,
  menuHeight,
  topReserved,
  bottomReserved,
}: MenuPositionInput) {
  const minLeft = edgePadding;
  const maxLeft = Math.max(minLeft, anchor.viewportWidth - menuWidth - edgePadding);
  const minTop = topReserved;
  const maxTop = Math.max(
    minTop,
    anchor.viewportHeight - bottomReserved - menuHeight,
  );

  return {
    left: clamp(anchor.x - menuWidth / 2, minLeft, maxLeft),
    top: clamp(anchor.y - menuHeight - 14, minTop, maxTop),
  };
}

function ContextAction({
  disabled = false,
  icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.contextAction} grid h-10 w-10 shrink-0 place-items-center rounded-xl`}
      disabled={disabled}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

- [ ] **Step 4: Run the component test**

Run:

```bash
npx vitest run src/features/estate/__tests__/contextual-item-actions.test.tsx
```

Expected: PASS.

---

## Task 4: Wire The Menu Into EstateGameClient

**Files:**
- Modify: `src/features/estate/components/estate-game-client.tsx`
- Modify: `src/features/estate/__tests__/estate-game-client.a11y.test.tsx`

**Interfaces:**
- Uses the existing selected/moving modes and action handlers.
- Replaces the bottom `SelectionBar` rendering path.

- [ ] **Step 1: Extend the a11y canvas mock**

In `src/features/estate/__tests__/estate-game-client.a11y.test.tsx`, replace the current mock with one that can select an item and emit anchors:

```tsx
vi.mock("../components/estate-canvas", () => {
  const Canvas = (props: {
    snapshot: { items: Array<{ id: string; definitionId: string }> };
    selectedItemId?: string | null;
    onItemSelect?: (instanceId: string) => void;
    onLockedParcelClick?: (parcelId: string) => void;
    onSelectedItemAnchorChange?: (anchor: {
      x: number;
      y: number;
      viewportWidth: number;
      viewportHeight: number;
    } | null) => void;
  }) => {
    const movable = props.snapshot.items.find(
      (item) => item.definitionId !== "base-campus-building",
    );

    if (props.selectedItemId) {
      props.onSelectedItemAnchorChange?.({
        x: 180,
        y: 140,
        viewportWidth: 720,
        viewportHeight: 360,
      });
    } else {
      props.onSelectedItemAnchorChange?.(null);
    }

    return (
      <div>
        <button
          type="button"
          data-testid="estate-locked-parcel"
          onClick={() => props.onLockedParcelClick?.("north")}
        >
          Open locked parcel
        </button>
        <button
          type="button"
          onClick={() => movable && props.onItemSelect?.(movable.id)}
        >
          Select movable item
        </button>
      </div>
    );
  };

  return { default: Canvas, EstateCanvas: Canvas };
});
```

- [ ] **Step 2: Add an a11y regression for contextual actions**

Append this test in the same file:

```ts
it("shows contextual item actions after selecting an estate item", async () => {
  const data = await getEstatePageData("en", "yu-e21", {
    getProfileGroupId: async () => "engineering",
    getGroupEarnedPoints: async () => 100000,
  });
  if (!data) throw new Error("Expected estate page data.");

  root = createRoot(container);
  await act(async () => {
    root?.render(
      <I18nProvider locale="en" messages={enMessages}>
        <EstateGameClient
          data={data}
          repository={new MemoryEstateRepository()}
        />
      </I18nProvider>,
    );
  });

  await click(getButton("Select movable item"));

  const toolbar = document.querySelector('[role="toolbar"]');
  expect(toolbar).not.toBeNull();
  expect(toolbar?.textContent).toContain("Move");
  expect(toolbar?.textContent).toContain("Collect");
});
```

Expected before wiring: FAIL because no contextual toolbar exists.

- [ ] **Step 3: Add anchor state and imports**

In `src/features/estate/components/estate-game-client.tsx`, import:

```ts
import type { EstateItemActionAnchor } from "../isometric/action-anchor";
import { ContextualItemActions } from "./contextual-item-actions";
```

Add state next to the existing UI state:

```ts
const [selectedActionAnchor, setSelectedActionAnchor] =
  useState<EstateItemActionAnchor | null>(null);
```

- [ ] **Step 4: Pass the anchor callback into EstateCanvas**

Add this prop to the `EstateCanvas` element:

```tsx
onSelectedItemAnchorChange={setSelectedActionAnchor}
```

- [ ] **Step 5: Replace the bottom SelectionBar render**

Replace the current `SelectionBar` block with:

```tsx
{selectedInstance && selectedDefinition ? (
  <ContextualItemActions
    copy={copy}
    definition={selectedDefinition}
    instance={selectedInstance}
    mode={mode}
    protectedItem={selectedIsProtected}
    anchor={selectedActionAnchor}
    onCancel={cancelEditing}
    onMove={handleMoveSelected}
    onRotate={mode.type === "placing" ? handleRotatePlacing : rotateActiveItem}
    onCollect={removeSelectedItem}
  />
) : null}
```

Then remove the local `SelectionBar`, `SelectionButton`, and the now-unused `Trash2` import. Keep `Move`, `RotateCw`, and `X` only if still used elsewhere in this file; otherwise remove them too.

- [ ] **Step 6: Re-run the a11y test**

Run:

```bash
npx vitest run src/features/estate/__tests__/estate-game-client.a11y.test.tsx
```

Expected: PASS.

---

## Task 5: Update Copy From Remove To Collect

**Files:**
- Modify: `src/i18n/messages/ko.ts`
- Modify: `src/i18n/messages/en.ts`

**Interfaces:**
- Existing keys may remain stable for code compatibility, but visible labels should say collect/recover instead of destructive removal.

- [ ] **Step 1: Update Korean selection and message copy**

In `src/i18n/messages/ko.ts`, inside `estate.selection`, use:

```ts
itemActions: "아이템 작업",
move: "이동",
collect: "회수",
remove: "회수",
rotate: "회전",
cancel: "닫기",
choosingMoveTarget: "이동 위치 선택 중",
```

Inside `estate.messages`, update the relevant remove strings:

```ts
removeConfirm: "{item}을(를) 회수할까요? 포인트는 환급되지 않습니다.",
removed: "회수했습니다. 아이템이 인벤토리로 돌아갔습니다.",
```

- [ ] **Step 2: Update English selection and message copy**

In `src/i18n/messages/en.ts`, inside `estate.selection`, use:

```ts
itemActions: "Item actions",
move: "Move",
collect: "Collect",
remove: "Collect",
rotate: "Rotate",
cancel: "Close",
choosingMoveTarget: "Choosing move target",
```

Inside `estate.messages`, update:

```ts
removeConfirm: "Collect {item}? Points will not be refunded.",
removed: "Collected. The item returned to inventory.",
```

- [ ] **Step 3: Run TypeScript-aware tests that import messages**

Run:

```bash
npx vitest run src/features/estate/__tests__/contextual-item-actions.test.tsx src/features/estate/__tests__/estate-game-client.a11y.test.tsx
```

Expected: PASS.

---

## Task 6: Estate Surface Verification

**Files:**
- No source changes unless verification exposes a regression.

- [ ] **Step 1: Run focused estate tests**

Run:

```bash
npx vitest run src/features/estate/__tests__
```

Expected: PASS.

- [ ] **Step 2: Run full repository verification**

Run:

```bash
npm run test
npm run lint
npm run build
```

Expected: all commands exit 0. Existing `src/features/campus-energy/components/game-preview.tsx` lint warnings may still appear, but no new lint errors should be introduced.

- [ ] **Step 3: Manual interaction check**

Run the app:

```bash
npm run dev
```

Open an estate route for a logged-in user and verify:

```text
1. Tap/click a placed non-protected item.
2. A compact action menu appears visually near that item, not at the bottom dock.
3. Pan and zoom the canvas; the menu follows the selected item and remains within the viewport.
4. Move enters the existing target-selection mode, shows the move preview, and commits on a valid cell click.
5. Rotate works for rotatable items and is disabled for non-rotatable items.
6. Collect returns the item to inventory without refunding points.
7. The central campus building still cannot be moved, rotated, or collected.
8. On mobile width, the menu does not overlap the top header or bottom dock in a way that blocks core controls.
9. Reload after a successful move or collect and confirm the saved estate state remains consistent.
```

Stop the dev server after the check if it was started only for this task.

---

## Self-Review

- Spec coverage: The plan addresses the user's request by making item actions available next to selected items and preserving existing move/collect semantics.
- Placeholder scan: No placeholder tasks remain; every source change has a concrete file path and test command.
- Type consistency: `EstateItemActionAnchor` is introduced once and shared by canvas and UI; the contextual component consumes existing `EstateEditorMode`, `EstateItemDefinition`, and `EstateItemInstance` types.
- Scope check: This is one UI/interaction slice. It does not require DB changes, item catalog changes, shop changes, or a new estate snapshot version.
- Risk: The only meaningful risk is menu position drift during frequent hover-induced scene updates. The effect is still bounded to canvas state changes, and the final manual check includes pan/zoom/mobile verification.
