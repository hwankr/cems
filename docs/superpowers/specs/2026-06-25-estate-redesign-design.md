# Estate redesign — sunny-garden elevation (design spec)

**Date:** 2026-06-25
**Status:** Approved by user (chat). Not committed (per AGENTS.md, commit only on explicit request).

## Context

The estate ("영지 꾸미기") was rebuilt on 2026-06-25 into a full-bleed sunny-garden world
(`fcac1cb`). The user is still unhappy with several aspects. Captured complaints:

1. **기본 영지 디자인** — the user flagged all four sub-areas:
   - 시작 영지가 휑함 — a fresh estate is one building + a few trees on plain grass.
   - 아트/색감 품질 — buildings/trees/items and the overall palette feel flat/washed out.
   - 바닥·땅·잠긴 구역 표현 — busy cell grid, drab grey locked land with dark cost boxes.
   - 떠 있는 패널/UI 배치 — the floating chrome wants another polish pass.
2. **상점 미리보기 없음** — shop cards show only text (name, size, price); no item preview.
3. **확장이 비직관적** — locked-parcel cost boxes + an expansion tab; not obvious where/how
   the estate grows.

User decisions (from clarifying questions):
- Shop preview → **thumbnail added to each card**.
- Expansion → **expand directly on the canvas**.

## Goals

Raise the visual craft and intuitiveness of the estate without changing its proven
architecture or any domain behavior. Specifically: warmer sunny palette, cleaner world
rendering, a fuller default estate, shop/inventory thumbnails, and on-canvas expansion.

## Non-goals

- No new high-fidelity hand-drawn asset set (keep the procedural SVG + canvas pipeline).
- No change to domain logic (points, placement, expansion rules, serialization), i18n keys,
  routing, or persistence.
- No change to accessibility contracts (focus trap, aria-live, R/F/Delete shortcuts, the
  keyboard-reachable expansion panel).
- The garden stays light regardless of app dark mode (existing decision).

## Approach

**A — sunny-garden elevation (chosen).** Keep the full-bleed canvas + floating cream-glass
shell and the procedural-SVG/canvas renderer. Improve only the palette, world rendering,
seed data, card presentation, and expansion affordance. Lowest risk, covers every complaint.

Rejected: (B) brand-new illustrated asset set — too large, consistency risk; (C) minimal
thumbnail+hotspot only — ignores the world/seed/UI complaints the user explicitly raised.

## Design details

### 1. Sunny-garden palette

Self-contained, always-light. Concrete token targets (final values may be nudged ±a shade
during implementation to read well on canvas):

- Sky (CSS `--es-sky-*` and renderer `drawBackground`, kept in sync):
  top `#fbf3e2` (warm cream) → mid `#eef4e0` → bottom `#d8e8d2` (soft sky-mint).
- Grass: base `#8fc46a`, alt `#84bd63` (subtle two-tone checker), edge `#6aa24e`,
  bright inset `#a6da7f`.
- Honey point (`--es-gold*`): `#f2b53c`, soft `#fdeecb`, ink `#8a5a12` — used for price
  pills and the expansion badge.
- Leaf-green action (`--es-accent*`): keep `#46924f` / `#3a7b42`.

Files: `estate-shell.module.css`, `estate-asset-manifest.ts` (ground fills), `renderer.ts`.

### 2. World rendering (`isometric/renderer.ts`)

- Internal cell borders very faint or removed; only **parcel outlines** read strongly →
  removes grid noise.
- Two-tone grass checker on unlocked floors instead of a single flat green.
- Stronger, softer **contact shadows** under items/trees for depth.
- `drawBackground` / `drawForegroundEffect` retuned to the sunny palette.

### 3. Friendly locked plots + on-canvas expansion (`renderer.ts`, `estate-canvas.tsx`, `estate-game-client.tsx`)

- Add an `unlockable` flag to render parcels in `createEstateRenderScene` (parcel is
  `initial` or adjacent to an unlocked parcel via `isParcelAdjacentToUnlockedParcel`).
- Locked + **unlockable** parcels: warm dashed "future plot" floor + a **honey circular
  `+` badge with a price pill** at the parcel centroid (replaces the dark cost box).
- Locked + **not** unlockable: faint dormant plot, small lock glyph, no badge — so only
  actionable land draws the eye.
- Clicking the badge already works: it sits on a parcel cell, so the existing
  `onLockedParcelClick` → confirm-dialog path fires unchanged.
- Update (2026-06-25): the redundant expansion **tab/panel** was removed. Expansion is now
  reached only by tapping a locked plot on the canvas; the confirm dialog (focus trap +
  Escape) still carries keyboard/a11y. The dock is Shop / Inventory / Fit.
- Badge position: **parcel center** (matches the approved mockup).

### 4. Fuller default estate seed (`data/demo-estate-data.ts`)

Redesign `createDemoEstateSeedSnapshot` so a fresh central 8×8 parcel already reads as a
designed garden, with no collisions and all items inside bounds:

- Central landmark building (kept).
- A small **courtyard/path** (light-pavement + stone-path tiles) leading to the entrance.
- A **focal feature** near center (fountain or small sculpture).
- **Corner tree clusters** (broadleaf + pine) framing the plot.
- A few decorations: flower bed, bench, solar street light.

Seeds place item *instances* directly (not purchases), so cost is irrelevant; only footprint
fit and collision matter. Keep the `yu-e21` vs generic split.

### 5. Shop/inventory thumbnails + UI polish (`estate-game-client.tsx`, `estate-shell.module.css`)

- Map `definition.assetId` → `estateAssetManifest.items[assetId].src` (small accessor) and
  render an isometric **thumbnail** on a rounded grass-tile background in each shop and
  inventory card (`<img>`; alt = item name).
- Price → honey pill; tidy the card row, the mini-metrics, tabs, and the right console chrome.
- Empty/owned states keep current copy.

### 6. Tests & verification (`__tests__/*`)

- Update `estate-quality.test.ts` and any renderer/scene guards to the new structure
  (e.g. `unlockable` flag, thumbnail presence, palette tokens) — adapt guards, do not weaken
  coverage.
- Keep the a11y test (`estate-game-client.a11y.test.tsx`) green.
- Run `npm run test`, `npm run lint`; preview-verify desktop (1280) and mobile (375),
  checking console for errors and that assets load.

## Preserved invariants

Domain (`domain/*`), persistence, i18n message keys, routing, and the accessibility model
are untouched. This is a visual/layout/seed-data change only.
