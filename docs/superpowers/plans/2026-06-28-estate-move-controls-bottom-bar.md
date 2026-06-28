# Estate Move Controls Bottom Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When relocating an installed estate item, dock the item action controls to a fixed bar at the bottom of the screen (instead of a popup floating over the item) so the popup no longer hides or intercepts taps on the destination cells.

**Architecture:** The estate uses a full-bleed isometric `<canvas>` with floating glass overlays (`EstateGameClient`). Selecting an item shows `ContextualItemActions`, an item-anchored popup positioned by `getContextualActionMenuPosition` from a canvas-space anchor (`getSelectedItemActionAnchor`). The anchor is computed from the item's **current** cell in `scene.items`, which is not updated until a move is confirmed — so during a move the popup sits on top of the cells the player is aiming at. The fix splits `ContextualItemActions` into two render paths: the existing anchored popup for the (non-moving) `selected` state, and a new **fixed bottom bar** for the `moving` state that ignores the anchor entirely. No domain, reducer, canvas-interaction, or i18n changes are required.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, CSS Modules (`estate-shell.module.css`), Vitest + jsdom + `react-dom/client`, lucide-react icons.

> **Revision (2026-06-28) — superseded approach below.** The fixed bottom-bar (commit `cd853a9`) was implemented and reviewed live, then the user decided it was too heavy and asked instead for a **compact, semi-transparent, icon-only cluster anchored near the item**. The final implementation (commit on the same branch) does this for **both** the selected and moving states:
> - `ContextualItemActions` now renders a single row of icon-only buttons (Move / Rotate / Collect / Cancel when selected; Confirm / Rotate / Cancel while moving) — no title, no coordinate readout. The item name is a `title` tooltip; each button keeps an `aria-label`.
> - The cluster stays **anchored above the item** (`getSelectedItemActionAnchor` + `getContextualActionMenuPosition`, with `menuWidth` computed from the icon count and `menuHeight` = the 52px cluster height), and returns `null` without an anchor (no off-screen special case).
> - New CSS `.contextCluster` (semi-transparent `opacity: 0.62`, full opacity on `:hover`/`:focus-within`) + `.contextClusterMoving` (gold tint) replace `.contextMenu`/`.contextMenuMoving`/`.contextMenuTitle`/`.contextMenuMeta` and the bottom-bar `.moveBar`. Because the pill is small and see-through and `opacity` does not block pointer events, taps outside its icons fall through to the canvas, so the destination cells are no longer covered or intercepted.
> - Tests reflect the icon-only API: component buttons are queried by `aria-label`, the toolbar exposes the item name via `title`, and the moving controls are asserted to be anchored (inline `left`/`top`) rather than a fixed bar. The `estate-game-client.a11y.test.tsx` move-flow switched its `Move`/`Collect`/`Confirm` lookups to `aria-label`.
>
> **Follow-up (2026-06-28):** the user then asked that the cluster **travel with the move preview** rather than stay over the item's original cell. `action-anchor.ts` gained `getFootprintActionAnchor(footprintHost, metrics, camera, viewport)` (works for a placed item or a placement/move preview); `getSelectedItemActionAnchor` now delegates to it. `estate-canvas.tsx`'s anchor effect, while `mode.type === "moving"` and a `placementPreview` exists, anchors to that preview (the ghost at the target/hovered cell), falling back to the item otherwise (`mode` + `placementPreview` added to the effect deps). Tests: `action-anchor.test.ts` covers the preview anchor; `estate-canvas.test.tsx` asserts the emitted anchor moves to the preview while moving.
>
> **Follow-up 2 (2026-06-28):** two more refinements requested together:
> 1. The cluster is now **fully opaque in the selected (pre-move) state**; only `.contextClusterMoving` is semi-transparent (`opacity: 0.62`, still fading to opaque on hover/focus). The transparency only helps while placing, so the pre-move state no longer dims.
> 2. **Tap-to-deselect:** an unmoved left tap on empty ground/background clears the current selection (a drag still pans). `estate-canvas.tsx` gained an `onBackgroundTap` prop and a `clear-selection` pending-press (same tap-vs-drag mechanism as item/parcel presses); `estate-game-client.tsx` wires it to `handleClearSelection` (selected → view). Covered by two `estate-canvas.test.tsx` tests (tap fires it, pan does not) and an `estate-game-client.a11y.test.tsx` deselect test.
>
> Verification (final): Vitest **340 passed**, ESLint **0 errors** (2 pre-existing `game-preview.tsx` warnings), `npm run build` passes. The sections below describe the original bottom-bar plan and are kept for history only.

## Global Constraints

- Next.js 16 is not the Next.js in training data — per `AGENTS.md`, read the relevant guide under `node_modules/next/dist/docs/` before writing any Next-specific code. (This change touches only a client React component + CSS module + Vitest tests; no Next.js API surface is used, so no doc lookup is required for it.)
- Korean is the default product language; English is also supported. This change reuses existing `estate.selection` copy keys (`cancel`, `choosingMoveTarget`, `confirm`, `itemActions`, `move`, `moveTargetSelected`, `rotate`) and the `estate.messages.moveInstruction` toast — **no new i18n keys**.
- Estate styling rule (see header comment in `estate-shell.module.css`): self-contained `--es-*` tokens only, **no `!important`, no descendant overrides**. Add flat token-based rules.
- Verification bar (every prior estate change held to this): `npm run test` green, `npm run lint` reports **0 errors** (the 2 pre-existing `game-preview.tsx` warnings are allowed), `npm run build` passes.
- `git diff --check` for touched files may report CRLF warnings only — that is pre-existing on this repo and acceptable.
- Do **not** commit or push beyond the per-task commits below unless the user explicitly asks; do not merge to `main`.

## File Structure

| File | Responsibility | Change |
| --- | --- | --- |
| `src/features/estate/components/contextual-item-actions.tsx` | Renders the item action toolbar. Owns the choice between anchored popup (selected) and fixed bar (moving). | **Modify** — restructure the render into two paths. |
| `src/features/estate/components/estate-shell.module.css` | Estate "sunny garden" design tokens + component styles. | **Modify** — add a `.moveBar` rule (+ `lg` media query). |
| `src/features/estate/__tests__/contextual-item-actions.test.tsx` | Unit tests for the toolbar component. | **Modify** — add 2 tests for the moving bar. |
| `src/features/estate/__tests__/estate-game-client.a11y.test.tsx` | Integration/a11y test of the select → move → confirm flow. | **No change** — verified still green (the mock always supplies an anchor; the toolbar keeps `role="toolbar"`, the same button labels, and the X `aria-label="Cancel"`). |

**Why no other files change:** `getContextualActionMenuPosition` stays exported with the same signature (still used by the selected-state popup and its existing test); the only consumers of `ContextualItemActions` are `estate-game-client.tsx` (which already passes `mode`) and the two test files; there are no snapshot tests over this component.

---

### Task 1: Dock the moving controls to a fixed bottom bar

**Files:**
- Modify: `src/features/estate/components/contextual-item-actions.tsx` (full rewrite of the component body; helpers below it unchanged)
- Modify: `src/features/estate/components/estate-shell.module.css` (add `.moveBar`)
- Test: `src/features/estate/__tests__/contextual-item-actions.test.tsx`

**Interfaces:**
- Consumes (unchanged): `ContextualItemActions` props — `{ copy, definition, instance, mode, protectedItem, anchor, onCancel, onConfirmMove, onMove, onRotate, onCollect }`; `EstateEditorMode` (the `moving` variant carries `instanceId`, `rotation`, optional `targetCell`); `EstateItemActionAnchor`.
- Produces (unchanged public API): `ContextualItemActions` (named export) and `getContextualActionMenuPosition` (named export, same signature/behavior). New CSS class `.moveBar` in `estate-shell.module.css`.
- Behavioral contract added: when `mode.type === "moving"` and `mode.instanceId === instance.id`, the component renders a `role="toolbar"` element **with no inline `left`/`top`** (fixed via `.moveBar`), and it renders **even when `anchor` is `null`**. In the `selected` (non-moving) state, behavior is byte-for-byte the same as today, including returning `null` when `anchor` is `null`.

- [ ] **Step 1: Write the failing tests**

Add these two tests to `src/features/estate/__tests__/contextual-item-actions.test.tsx`, inside the `describe("ContextualItemActions", ...)` block, immediately after the existing `it("shows a confirm action after a move target is selected", ...)` test (before the closing `});` of that `describe`). They reuse the file's existing helpers (`renderActions`, `getToolbar`, `getButton`, `getButtonByAriaLabel`, `estateCopy`).

```tsx
  it("docks the moving controls as a fixed bar without anchor positioning", async () => {
    await renderActions({
      mode: { type: "moving", instanceId: "bench-1", rotation: 0 },
    });

    const toolbar = getToolbar();

    // The moving controls are a fixed bottom bar, not the item-anchored
    // popup, so they carry no inline left/top derived from the anchor.
    expect(toolbar.style.left).toBe("");
    expect(toolbar.style.top).toBe("");
    expect(toolbar.textContent).toContain(
      estateCopy.selection.choosingMoveTarget,
    );
  });

  it("keeps the moving controls visible when the item has no anchor", async () => {
    await renderActions({
      anchor: null,
      mode: { type: "moving", instanceId: "bench-1", rotation: 0 },
    });

    const toolbar = getToolbar();

    expect(toolbar.textContent).toContain(
      estateCopy.selection.choosingMoveTarget,
    );
    expect(getButton("Rotate")).toBeInstanceOf(HTMLButtonElement);
    expect(getButtonByAriaLabel("Cancel")).toBeInstanceOf(HTMLButtonElement);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/estate/__tests__/contextual-item-actions.test.tsx`

Expected: FAIL.
- "docks the moving controls as a fixed bar without anchor positioning" fails because today the moving popup is positioned with an inline `style={{ left, top }}`, so `toolbar.style.left` is e.g. `"184px"`, not `""`.
- "keeps the moving controls visible when the item has no anchor" fails because today the component does `if (!anchor) return null;` first, so `getToolbar()` throws `"Expected contextual action toolbar."`.

- [ ] **Step 3: Rewrite the component to add the fixed move bar**

Replace the **entire contents** of `src/features/estate/components/contextual-item-actions.tsx` with the following. (The exported `getContextualActionMenuPosition`, `getMovingMeta`, `ContextActionButton`, and `clamp` helpers are unchanged from today — included here so the file is complete.)

```tsx
"use client";

import type { ReactNode } from "react";
import { Check, Move, PackageCheck, RotateCw, X } from "lucide-react";
import type { EstateEditorMode } from "../domain/editor";
import type { EstateItemDefinition, EstateItemInstance } from "../domain/types";
import type { EstateItemActionAnchor } from "../isometric/action-anchor";
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
  onConfirmMove: () => void;
  onMove: () => void;
  onRotate: () => void;
  onCollect: () => void;
};

type ContextualActionMenuPositionInput = {
  anchor: EstateItemActionAnchor;
  menuWidth: number;
  menuHeight: number;
  topReserved: number;
  bottomReserved: number;
};

type ContextualSelectionCopy = EstateMessages["selection"] & {
  itemActions?: string;
  collect?: string;
  confirm?: string;
  moveTargetSelected?: string;
};

const contextMenuWidth = 272;
const contextMenuHeight = 76;
const topReserved = 72;
const bottomReserved = 92;
const edgePadding = 12;

export function ContextualItemActions({
  copy,
  definition,
  instance,
  mode,
  protectedItem,
  anchor,
  onCancel,
  onConfirmMove,
  onMove,
  onRotate,
  onCollect,
}: ContextualItemActionsProps) {
  const moving = mode.type === "moving" && mode.instanceId === instance.id;
  const targetCell = moving ? mode.targetCell : undefined;
  const itemName = getItemName(definition, copy);
  const selectionCopy = copy.selection as ContextualSelectionCopy;
  const confirmLabel = selectionCopy.confirm ?? "Confirm";
  const collectLabel = selectionCopy.collect ?? copy.selection.remove;
  const visibleActionLabels = moving
    ? [
        ...(targetCell ? [confirmLabel] : []),
        copy.selection.rotate,
        copy.selection.cancel,
      ]
    : [
        copy.selection.move,
        copy.selection.rotate,
        collectLabel,
        copy.selection.cancel,
      ];
  const toolbarLabel =
    selectionCopy.itemActions ?? visibleActionLabels.join(", ");

  const heading = (
    <div className="flex items-center gap-2 px-1">
      <div className="min-w-0 flex-1">
        <p
          className={`${styles.contextMenuTitle} truncate text-[13px] font-semibold`}
        >
          {itemName}
        </p>
        <p className={`${styles.contextMenuMeta} truncate text-[11px]`}>
          {moving
            ? getMovingMeta(selectionCopy, targetCell)
            : `${instance.x}, ${instance.y}`}
        </p>
      </div>
      <button
        type="button"
        className={`${styles.contextAction} grid h-8 w-8 shrink-0 place-items-center rounded-lg`}
        aria-label={copy.selection.cancel}
        title={copy.selection.cancel}
        onClick={onCancel}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );

  const actionGrid = (
    <div
      className={`mt-1 grid gap-1 ${
        moving ? (targetCell ? "grid-cols-2" : "grid-cols-1") : "grid-cols-3"
      }`}
    >
      {!moving ? (
        <ContextActionButton
          disabled={protectedItem}
          icon={<Move size={14} aria-hidden="true" />}
          label={copy.selection.move}
          onClick={onMove}
        />
      ) : null}
      {moving && targetCell ? (
        <ContextActionButton
          disabled={protectedItem}
          icon={<Check size={14} aria-hidden="true" />}
          label={confirmLabel}
          onClick={onConfirmMove}
        />
      ) : null}
      <ContextActionButton
        disabled={protectedItem || !definition.canRotate}
        icon={<RotateCw size={14} aria-hidden="true" />}
        label={copy.selection.rotate}
        onClick={onRotate}
      />
      {!moving ? (
        <ContextActionButton
          disabled={protectedItem}
          icon={<PackageCheck size={14} aria-hidden="true" />}
          label={collectLabel}
          onClick={onCollect}
        />
      ) : null}
    </div>
  );

  // While moving, the controls dock to a fixed bar pinned to the bottom of the
  // screen instead of floating over the item. The anchored popup would sit
  // directly on top of the destination cells the player is trying to tap, so it
  // is reserved for the (non-moving) selected state only. The bar renders even
  // when the item scrolls off-screen (anchor === null) so Confirm/Cancel stay
  // reachable.
  if (moving) {
    return (
      <div
        role="toolbar"
        aria-label={toolbarLabel}
        className={`${styles.moveBar} ${styles.contextMenuMoving} rounded-2xl p-1.5`}
      >
        {heading}
        {actionGrid}
      </div>
    );
  }

  if (!anchor) return null;

  const position = getContextualActionMenuPosition({
    anchor,
    menuWidth: contextMenuWidth,
    menuHeight: contextMenuHeight,
    topReserved,
    bottomReserved,
  });

  return (
    <div
      role="toolbar"
      aria-label={toolbarLabel}
      className={`${styles.contextMenu} rounded-lg p-1.5`}
      style={{ left: position.left, top: position.top }}
    >
      {heading}
      {actionGrid}
    </div>
  );
}

function getMovingMeta(
  selectionCopy: ContextualSelectionCopy,
  targetCell: { x: number; y: number } | undefined,
): string {
  if (!targetCell) return selectionCopy.choosingMoveTarget;

  return `${selectionCopy.moveTargetSelected ?? "Move target"}: ${targetCell.x}, ${targetCell.y}`;
}

export function getContextualActionMenuPosition({
  anchor,
  menuWidth,
  menuHeight,
  topReserved,
  bottomReserved,
}: ContextualActionMenuPositionInput): { left: number; top: number } {
  const minLeft = edgePadding;
  const maxLeft = Math.max(
    minLeft,
    anchor.viewportWidth - edgePadding - menuWidth,
  );
  const minTop = Math.max(edgePadding, topReserved);
  const maxTop = Math.max(
    minTop,
    anchor.viewportHeight - bottomReserved - menuHeight,
  );

  return {
    left: clamp(anchor.x - menuWidth / 2, minLeft, maxLeft),
    top: clamp(anchor.y - menuHeight - edgePadding, minTop, maxTop),
  };
}

function ContextActionButton({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.contextAction} inline-flex h-8 items-center justify-center gap-1 rounded-lg px-1.5 text-[11px] font-semibold`}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
```

What changed vs. today: the early `if (!anchor) return null;` no longer runs before the moving branch; the shared `heading` + `actionGrid` markup is extracted once and reused by both render paths; the moving path returns a `.moveBar` element with no inline `style`; the selected path is otherwise identical (still uses `.contextMenu`, still clamps with `getContextualActionMenuPosition`, still returns `null` without an anchor). The `.contextMenuMoving` accent class now rides on the move bar instead of the popup.

- [ ] **Step 4: Add the `.moveBar` style**

In `src/features/estate/components/estate-shell.module.css`, insert the following rule **immediately after the `.contextMenuMeta { ... }` block** (it currently ends at the line with the closing `}` before `.contextAction {`). This keeps all `contextMenu`/move styles together.

```css
/*
 * Move mode controls. Unlike the item-anchored .contextMenu popup, these dock
 * to a fixed bar at the bottom-center of the screen so they never cover the
 * destination cells the player is tapping. On mobile the bar clears the bottom
 * inventory dock; at lg+ the builder console is docked on the right, so the bar
 * centers within the remaining width and drops toward the bottom.
 */
.moveBar {
  position: fixed;
  left: 50%;
  bottom: calc(6rem + env(safe-area-inset-bottom));
  z-index: 46;
  width: min(22rem, calc(100vw - 1.5rem));
  transform: translateX(-50%);
  border: 1px solid var(--es-line);
  background: var(--es-panel-strong);
  box-shadow: var(--es-shadow);
  backdrop-filter: blur(14px) saturate(130%);
  pointer-events: auto;
}

@media (min-width: 1024px) {
  .moveBar {
    left: calc((100vw - 23.5rem) / 2);
    bottom: calc(1.5rem + env(safe-area-inset-bottom));
  }
}
```

Positioning rationale (do not change without re-checking): the mobile bottom dock (`aside`, `fixed ... bottom-2`, collapsed) is ≈ `0.5rem + 4rem (tab row) + ~0.6rem (sheet padding)` ≈ `5.1rem` tall, so `bottom: 6rem` clears it with a small gap. At `lg+` the dock becomes the right console (`lg:right-3 lg:w-[22rem]`), so the bar centers within `100vw − 23.5rem` (22rem console + 0.75rem right gap + ~0.75rem breathing room) to avoid overlapping it, and drops to `bottom: 1.5rem`. `.estate` sets no `transform`/`filter`/`contain`, so it does not establish a containing block — the `position: fixed` bar is positioned against the viewport and is not clipped by `.estate`'s `overflow: hidden` (the existing `fixed` bottom dock already relies on this).

- [ ] **Step 5: Run the component tests to verify they pass**

Run: `npx vitest run src/features/estate/__tests__/contextual-item-actions.test.tsx`

Expected: PASS (all tests, including the 2 new ones and every pre-existing one — the selected-state position test still returns `{ left: "184px", top: "112px" }`, and the existing moving-state content/button tests still find the same text and buttons).

- [ ] **Step 6: Run the estate integration/a11y suite to verify no regression**

Run: `npx vitest run src/features/estate/__tests__/estate-game-client.a11y.test.tsx src/features/estate/__tests__/action-anchor.test.ts src/features/estate/__tests__/estate-canvas.test.tsx`

Expected: PASS. The a11y move-flow test still selects the item (mock supplies an anchor → selected popup), clicks **Move** (now the fixed bar, still `role="toolbar"`), clicks **Choose move target**, sees **Confirm**, and confirms — the queried `role="toolbar"`, the `Move`/`Confirm` button text, and the X `aria-label="Cancel"` are all unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/features/estate/components/contextual-item-actions.tsx src/features/estate/components/estate-shell.module.css src/features/estate/__tests__/contextual-item-actions.test.tsx
git commit -m "fix(estate): dock item move controls to a fixed bottom bar

The contextual actions popup stayed anchored above the item being moved,
covering and intercepting taps on the destination cells. While moving, the
controls now render as a fixed bottom-center bar (clearing the inventory
dock on mobile and the right console at lg+) and stay visible even when the
item scrolls off-screen. The anchored popup is kept for the selected state."
```

---

### Task 2: Full verification gate

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`

Expected: PASS. Test count is the previous total **+2** (the two tests added in Task 1; the repo was at 303 before this change, so expect 305).

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: **0 errors.** Only the 2 pre-existing warnings in `game-preview.tsx` may appear; no new warnings or errors from the touched files.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: PASS (Next.js build completes, including its TypeScript check; the estate routes build as before).

- [ ] **Step 4: Manual / live confirmation (best-effort)**

Confirm in a running dev/preview build (e.g. with the demo account `it@naver.com`, which holds enough points; the estate is reached at `/[locale]/subjects/<subjectId>/estate`):
1. Select a non-protected placed item → the **anchored popup** still appears above it with Move / Rotate / Collect.
2. Tap **Move** → the controls relocate to a **bottom-center bar** with a gold accent border; the item area is no longer covered.
3. Tap cells that sit where the popup used to be → they register as the move target (preview follows), and **Confirm** appears in the bar.
4. Tap **Confirm** → the item moves; the bar returns to the anchored selected popup. Tap the bar's **✕** (or `Esc`) to cancel.
5. On mobile width, the bar sits above the bottom inventory dock; at desktop width it sits bottom-center, clear of the right builder console.

Known environment limitation (documented across prior estate work): the full-bleed estate canvas route hangs the preview-screenshot tool, so pixel screenshots may not be capturable here. If so, rely on the passing tests + build and the user's own dev-server check, and record that in the session notes — do **not** claim a screenshot was taken.

- [ ] **Step 5: No commit**

Task 2 changes no files; there is nothing to commit. If `npm run build` produced incidental artifacts, do not stage them.

---

## Self-Review

**1. Spec coverage** — The complaint ("the item display popup hides the screen and makes moving hard") maps to Task 1: in `moving` mode the popup is replaced by a fixed bottom bar that neither covers nor intercepts the destination cells. The selected (pre-move) popup is deliberately preserved per the chosen approach. Covered.

**2. Placeholder scan** — No `TBD`/`later`/"handle edge cases"/"similar to". Every code step has complete, paste-ready content: the full component file, the exact CSS block with insertion point, and the two full test cases. Commands have explicit expected output.

**3. Type consistency** — Props and exports are unchanged: `ContextualItemActions(props)` keeps the same prop names/types; `getContextualActionMenuPosition` keeps its `ContextualActionMenuPositionInput` signature and return `{ left, top }`. The new CSS class is referenced as `styles.moveBar`, matching the added `.moveBar` rule. `mode` is the existing `EstateEditorMode` (`moving` variant: `instanceId`, `rotation`, optional `targetCell`). `getMovingMeta`, `ContextActionButton`, and `clamp` retain their current signatures. The moving branch reuses the same `heading`/`actionGrid` JSX as the selected branch, so labels/handlers cannot drift between the two paths.

**4. i18n** — Only existing `estate.selection.*` keys and the `estate.messages.moveInstruction` toast are used; no key added or renamed, so `ko.ts`/`en.ts` need no edits.
