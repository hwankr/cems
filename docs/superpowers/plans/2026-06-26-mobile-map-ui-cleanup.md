# Mobile Map UI Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin map screen (`/[locale]`) clean and readable on phones — stop Korean labels from breaking one character per line, and cut the amount of floating chrome shown at once.

**Architecture:** The map is a full-bleed Mapbox canvas with floating overlay chrome rendered by `AdminMapView`. None of that chrome currently has phone-specific rules, so it renders at desktop density on a ~390px screen. We add a mobile breakpoint (`< 640px`, Tailwind `sm`) that: (1) replaces the two wrapping summary cards with one no-wrap compact bar, (2) shrinks the top bar to icon-brand + search, (3) reduces the right rail to zoom + settings and moves heatmap/label toggles into the settings popover, (4) hides the legend, (5) turns the building-rank panel into a collapsed-by-default bottom sheet, and (6) renders the building popup as a bottom card. Desktop (`sm` and up) stays byte-for-byte identical.

**Tech Stack:** Next.js 16.2.9, React 19.2.7, TypeScript, Tailwind CSS v4, lucide-react, Vitest 4 (jsdom).

## Global Constraints

- **Breakpoint:** mobile = `< 640px` (below Tailwind `sm`). `sm` and up MUST keep the exact current desktop layout. Use mobile-first base classes + `sm:` to restore desktop.
- **No new dependencies.** Use existing Tailwind tokens (`bg-surface`, `border-line`, `shadow-pop`, `text-ink`, `text-ink-subtle`, `STATUS_COLOR`) and lucide-react icons already in the repo.
- **Tailwind arbitrary-value caution:** this repo has hit JIT misses on exotic arbitrary values (notably `dvh` units — see `docs/working/meeting-notes.md` 2026-06-25). Reuse arbitrary values that already exist in the codebase (`max-h-[19rem]`, `max-w-[calc(100vw-2rem)]`, `vh`, `rem`). Do not introduce `dvh`. For anything that must override an inline `style`, use a class in `globals.css` (Tailwind can't beat inline styles).
- **Mapbox attribution must stay visible** in the default (collapsed) mobile state — covering it violates Mapbox ToS. The mobile bottom sheet's collapsed dock lifts the Mapbox logo/attribution above it via a `globals.css` media query.
- **Code style:** double quotes, `import` ordering and component patterns matching neighboring files. Client components keep `"use client";`.
- **Next.js docs:** per root `AGENTS.md`, before editing anything Next.js-specific read the relevant guide under `node_modules/next/dist/docs/`. These tasks only touch client components and CSS (no routing/server/Next API changes), so no Next.js API reading is required — but do not introduce server/client boundary changes.
- **Commits:** the project rule (`AGENTS.md`) is "commit/push only when the user explicitly asks." The per-task commit steps below follow the TDD ritual; if the user has not asked to commit, make the local commits but do not push. End commit messages with the `Co-Authored-By` trailer used in this repo.
- **i18n:** Korean is default. Every user-visible string goes through `useI18n()` / `messages`. Adding a key to `src/i18n/messages/ko.ts` widens the `Messages` type, which forces `src/i18n/messages/en.ts` (`satisfies Messages`) to add the same key — both files must change together.

## Testing Strategy (read before starting)

jsdom does **not** evaluate CSS media queries or layout, so "hidden on mobile" cannot be asserted by computed style. This plan therefore tests two things:

1. **Logic in leaf components** (summary sign/values, toggle handlers, sheet/floating variant, panel open/close) — real behavioral unit tests using the repo's `createRoot` + `act` + `vi.mock("@/i18n/client")` pattern (see `src/features/campus-energy/__tests__/map-controls.test.tsx`).
2. **Responsive class regressions** — assert that the responsive utility classes (`hidden sm:flex`, `w-full sm:w-32`, `whitespace-nowrap`, sheet container classes) are present, as a guard against accidental removal.

`AdminMapView` itself is **not** unit-rendered (it constructs `CampusMap` → mapbox-gl, which the existing test suite never mounts). Its wiring changes are verified by `npm run build` + the Task 8 preview pass. Note the map route is **auth-gated** (`/ko` → `/ko/login` when logged out); seeing the live map in preview requires logging in with a test account.

---

## File Structure

**New files:**
- `src/features/campus-energy/components/map-summary-bar.tsx` — mobile-only one-line summary pill (realtime kWh + net saving), no wrap.
- `src/features/campus-energy/components/map-display-toggles.tsx` — heatmap/label toggle rows for the mobile settings popover.
- `src/features/campus-energy/__tests__/map-summary-bar.test.tsx`
- `src/features/campus-energy/__tests__/map-display-toggles.test.tsx`

**Modified files:**
- `src/i18n/messages/ko.ts`, `src/i18n/messages/en.ts` — add `summaryRealtimeShort`, `summaryNetSavingShort` under `mapView`.
- `src/features/campus-energy/components/admin-map-view.tsx` — top-container restructure, mobile summary bar, desktop-only chips, hide legend on mobile, two rank panels (floating/sheet), pass toggle props to settings popover, popup wrapper class swap.
- `src/features/campus-energy/components/map-top-bar.tsx` — icon-only brand + flexible search on mobile, hide campus select on mobile.
- `src/features/campus-energy/components/map-controls.tsx` — hide heatmap/label buttons on mobile (keep zoom + settings).
- `src/features/campus-energy/components/map-settings-popover.tsx` — accept toggle props, render mobile-only `MapDisplayToggles`.
- `src/features/campus-energy/components/building-rank-panel.tsx` — add `variant: "floating" | "sheet"`.
- `src/features/campus-energy/__tests__/map-controls.test.tsx` — add mobile-hidden assertions.
- `src/features/campus-energy/__tests__/building-rank-panel.test.tsx` *(new if absent)* — variant + toggle behavior.
- `src/app/globals.css` — Mapbox attribution lift on mobile; `.cems-popup-anchor` responsive popup positioning.

---

## Task 1: Mobile compact summary bar (fixes the vertical text breaking)

This is the headline fix. The two summary cards (`MapSummaryChips`) get squeezed on phones and their Korean labels wrap one glyph per line. We hide those cards on mobile and show a single no-wrap pill instead, and restructure the top container so the pill gets its own line.

**Files:**
- Create: `src/features/campus-energy/components/map-summary-bar.tsx`
- Create: `src/features/campus-energy/__tests__/map-summary-bar.test.tsx`
- Modify: `src/i18n/messages/ko.ts:291` (add two keys after `summaryNetSaving`)
- Modify: `src/i18n/messages/en.ts:290` (add two keys after `summaryNetSaving`)
- Modify: `src/features/campus-energy/components/admin-map-view.tsx:95-110` (top container) and the import block at `:8-20`

**Interfaces:**
- Consumes: `EnergySummary` from `../domain/types` (`{ actualKwh: number; forecastKwh: number; netDeltaKwh: number; ... }`); `formatNumber(locale, value)` from `@/i18n/format`; `STATUS_COLOR` from `./status-color`; `useI18n()` returning `{ locale, messages }`.
- Produces: `export function MapSummaryBar({ summary }: { summary: EnergySummary }): JSX.Element`. New message keys `messages.mapView.summaryRealtimeShort` and `messages.mapView.summaryNetSavingShort`.

- [ ] **Step 1: Write the failing test**

Create `src/features/campus-energy/__tests__/map-summary-bar.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { MapSummaryBar } from "../components/map-summary-bar";
import type { EnergySummary } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      mapView: {
        summaryRealtimeShort: "실시간",
        summaryNetSavingShort: "순절감",
      },
    },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function makeSummary(actualKwh: number, forecastKwh: number): EnergySummary {
  return {
    actualKwh,
    forecastKwh,
    savingsKwh: Math.max(0, forecastKwh - actualKwh),
    overuseKwh: Math.max(0, actualKwh - forecastKwh),
    netDeltaKwh: actualKwh - forecastKwh,
    netSavingsRate: 0,
  };
}

describe("MapSummaryBar", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("shows realtime usage and a saving as one no-wrap line", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(<MapSummaryBar summary={makeSummary(64_480, 64_536)} />),
    );

    const root_el = container.firstElementChild as HTMLElement;
    expect(root_el.className).toContain("whitespace-nowrap");
    expect(container.textContent).toContain("64,480");
    // net = forecast - actual = 56 → saving → leading "−"
    expect(container.textContent).toContain("−56");
    expect(container.textContent).not.toContain("+56");

    await act(async () => root.unmount());
  });

  it("marks an overuse with a leading +", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(<MapSummaryBar summary={makeSummary(100, 60)} />),
    );

    // net = 60 - 100 = -40 → overuse → leading "+40"
    expect(container.textContent).toContain("+40");

    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/campus-energy/__tests__/map-summary-bar.test.tsx`
Expected: FAIL — `Cannot find module '../components/map-summary-bar'`.

- [ ] **Step 3: Create the component**

Create `src/features/campus-energy/components/map-summary-bar.tsx`:

```tsx
"use client";

import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import type { EnergySummary } from "../domain/types";
import { STATUS_COLOR } from "./status-color";

// Mobile-only one-line summary. Mirrors MapSummaryChips' sign logic (positive
// net = used less than forecast = a saving, shown with a leading "−"), but on a
// single no-wrap line so Korean labels never break one glyph per row.
export function MapSummaryBar({ summary }: { summary: EnergySummary }) {
  const { locale, messages } = useI18n();
  const net = summary.forecastKwh - summary.actualKwh;
  const saved = net >= 0;
  const netColor = saved ? STATUS_COLOR.saving.base : STATUS_COLOR.overuse.base;

  return (
    <div className="inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-surface/90 px-3 py-1.5 text-[12px] shadow-pop backdrop-blur">
      <span className="font-semibold text-ink-subtle">
        {messages.mapView.summaryRealtimeShort}
      </span>
      <span className="font-bold tabular-nums text-ink">
        {formatNumber(locale, summary.actualKwh)}
        <span className="ml-0.5 font-semibold text-ink-subtle">kWh</span>
      </span>
      <span className="h-3 w-px bg-line" aria-hidden="true" />
      <span className="font-semibold text-ink-subtle">
        {messages.mapView.summaryNetSavingShort}
      </span>
      <span className="font-bold tabular-nums" style={{ color: netColor }}>
        {saved ? "−" : "+"}
        {formatNumber(locale, Math.abs(net))}
        <span className="ml-0.5 font-semibold text-ink-subtle">kWh</span>
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/campus-energy/__tests__/map-summary-bar.test.tsx`
Expected: PASS (2 passed).

- [ ] **Step 5: Add the i18n short keys (ko + en)**

In `src/i18n/messages/ko.ts`, immediately after the `summaryNetSaving: "예측 대비 순절감",` line (around line 291) add:

```ts
    summaryRealtimeShort: "실시간",
    summaryNetSavingShort: "순절감",
```

In `src/i18n/messages/en.ts`, immediately after the `summaryNetSaving: "Net saved vs forecast",` line (around line 290) add:

```ts
    summaryRealtimeShort: "Live",
    summaryNetSavingShort: "Net saved",
```

- [ ] **Step 6: Restructure the top container in `admin-map-view.tsx`**

Add the import next to the other component imports (keep alphabetical-ish grouping near `MapSummaryChips`):

```tsx
import { MapSummaryBar } from "./map-summary-bar";
```

Replace the top-container block (current lines 95–110):

```tsx
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto">
          <MapTopBar
            query={query}
            onQueryChange={setQuery}
            schoolName={school.name}
          />
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <MapSummaryChips summary={summary} />
          <ProfileChip
            displayName={account.displayName}
            personalPoints={account.personalPoints}
          />
        </div>
      </div>
```

with:

```tsx
      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="pointer-events-auto min-w-0 flex-1 sm:flex-none">
            <MapTopBar
              query={query}
              onQueryChange={setQuery}
              schoolName={school.name}
            />
          </div>
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="hidden sm:block">
              <MapSummaryChips summary={summary} />
            </div>
            <ProfileChip
              displayName={account.displayName}
              personalPoints={account.personalPoints}
            />
          </div>
        </div>
        <div className="pointer-events-auto mt-2 sm:hidden">
          <MapSummaryBar summary={summary} />
        </div>
      </div>
```

- [ ] **Step 7: Verify types/lint/build**

Run: `npm run lint`
Expected: no new errors (pre-existing `game-preview.tsx` warnings may remain).

Run: `npm run build`
Expected: build succeeds. (Catches any missing en/ko key via `satisfies Messages`.)

- [ ] **Step 8: Commit**

```bash
git add src/features/campus-energy/components/map-summary-bar.tsx \
  src/features/campus-energy/__tests__/map-summary-bar.test.tsx \
  src/i18n/messages/ko.ts src/i18n/messages/en.ts \
  src/features/campus-energy/components/admin-map-view.tsx
git commit -m "feat(map): add mobile compact summary bar, fix vertical label wrapping"
```

---

## Task 2: Mobile-compact top bar (icon-only brand, flexible search, no campus select)

`MapTopBar` shows a 2-line brand card + search + a single-option campus dropdown. On phones the user wants the brand reduced to its icon, the search to fill the row, and the campus selector hidden (only one school exists).

**Files:**
- Modify: `src/features/campus-energy/components/map-top-bar.tsx` (whole component)
- Create: `src/features/campus-energy/__tests__/map-top-bar.test.tsx`

**Interfaces:**
- Consumes: `useI18n()` → `messages.mapView.{brandTitle, brandSubtitle, searchPlaceholder, campusSelectLabel}`; props `{ query: string; onQueryChange: (q: string) => void; schoolName: string }` (unchanged).
- Produces: same `MapTopBar` signature; no API change — only responsive classes.

- [ ] **Step 1: Write the failing test**

Create `src/features/campus-energy/__tests__/map-top-bar.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapTopBar } from "../components/map-top-bar";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    messages: {
      mapView: {
        brandTitle: "Campus Energy",
        brandSubtitle: "Live power monitoring",
        searchPlaceholder: "Search buildings",
        campusSelectLabel: "Select campus",
      },
    },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("MapTopBar", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("hides brand text and the campus select below sm, keeps the search input", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(
        <MapTopBar query="" onQueryChange={() => {}} schoolName="Yeungnam" />,
      ),
    );

    // Brand title text lives in a wrapper that is hidden until sm.
    const title = Array.from(container.querySelectorAll("span")).find(
      (s) => s.textContent === "Campus Energy",
    );
    expect(title?.closest(".hidden")).not.toBeNull();

    // Campus select wrapper is hidden until sm.
    const select = container.querySelector("select");
    expect(select?.closest(".hidden")).not.toBeNull();

    // Search input fills the row on mobile, fixed width on desktop.
    const input = container.querySelector("input");
    expect(input?.className).toContain("w-full");
    expect(input?.className).toContain("sm:w-32");

    await act(async () => root.unmount());
  });

  it("forwards typing to onQueryChange", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    const onQueryChange = vi.fn();

    await act(async () =>
      root.render(
        <MapTopBar query="" onQueryChange={onQueryChange} schoolName="Yeungnam" />,
      ),
    );

    const input = container.querySelector("input") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, "lib");
    await act(async () =>
      input.dispatchEvent(new Event("input", { bubbles: true })),
    );

    expect(onQueryChange).toHaveBeenCalledWith("lib");

    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/campus-energy/__tests__/map-top-bar.test.tsx`
Expected: FAIL — brand title wrapper has no `hidden` ancestor; input className lacks `w-full`.

- [ ] **Step 3: Update `map-top-bar.tsx`**

Replace the whole component body's returned JSX with:

```tsx
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
      <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface/95 px-2.5 py-2 shadow-pop backdrop-blur sm:px-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-on-accent">
          <Zap size={15} fill="currentColor" aria-hidden="true" />
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-[13px] font-bold text-ink">
            {mapView.brandTitle}
          </span>
          <span className="block text-[11px] text-ink-subtle">
            {mapView.brandSubtitle}
          </span>
        </span>
      </div>

      <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 shadow-pop backdrop-blur sm:flex-none">
        <Search size={16} className="text-ink-subtle" aria-hidden="true" />
        <span className="sr-only">{mapView.searchPlaceholder}</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={mapView.searchPlaceholder}
          className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-subtle sm:w-32"
        />
      </label>

      <div className="hidden h-11 items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 shadow-pop backdrop-blur sm:flex">
        <MapPin size={15} className="text-accent" aria-hidden="true" />
        <span className="sr-only">{mapView.campusSelectLabel}</span>
        <select
          aria-label={mapView.campusSelectLabel}
          className="cursor-pointer appearance-none bg-transparent pr-1 text-[13px] font-semibold text-ink outline-none"
        >
          <option className="bg-surface text-ink">{schoolName}</option>
        </select>
        <ChevronDown size={14} className="text-ink-subtle" aria-hidden="true" />
      </div>
    </div>
  );
```

Changes vs. original: container `gap-2 sm:gap-2.5`; brand padding `px-2.5 sm:px-3` and brand text wrapper `hidden ... sm:block`; search label `min-w-0 flex-1 sm:flex-none` and input `w-full sm:w-32`; campus wrapper `hidden ... sm:flex`. Imports (`ChevronDown, MapPin, Search, Zap`) are unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/campus-energy/__tests__/map-top-bar.test.tsx`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add src/features/campus-energy/components/map-top-bar.tsx \
  src/features/campus-energy/__tests__/map-top-bar.test.tsx
git commit -m "feat(map): compact top bar on mobile (icon brand, fluid search, hide campus select)"
```

---

## Task 3: Trim the right rail on mobile (hide heat/label buttons + the legend)

On phones the right rail should be just zoom + a settings button; the heatmap/label toggles move into settings (Task 4). The bottom-right legend is hidden on mobile (color meaning is secondary and it overlaps the sheet/attribution).

**Files:**
- Modify: `src/features/campus-energy/components/map-controls.tsx:47-67` (second control group)
- Modify: `src/features/campus-energy/components/admin-map-view.tsx:131-133` (legend wrapper)
- Modify: `src/features/campus-energy/__tests__/map-controls.test.tsx` (add assertions)

**Interfaces:**
- Consumes/Produces: `MapControls` props unchanged (`onZoomIn, onZoomOut, onResetView, showHeat, onToggleHeat, showLabels, onToggleLabels, onOpenSettings`). Behavior unchanged on desktop; on mobile the heat/label buttons are CSS-hidden but still mounted (their handlers still wire up — they are reused by the settings popover in Task 4).

- [ ] **Step 1: Add the failing assertions to the existing test**

Append these two `it` blocks inside the `describe("MapControls", ...)` in `src/features/campus-energy/__tests__/map-controls.test.tsx` (the file already mocks i18n and sets up `createRoot`):

```tsx
  it("keeps the settings button always visible but hides heat/label buttons below sm", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(
        <MapControls
          onZoomIn={() => {}}
          onZoomOut={() => {}}
          onResetView={() => {}}
          showHeat={false}
          onToggleHeat={() => {}}
          showLabels
          onToggleLabels={() => {}}
          onOpenSettings={() => {}}
        />,
      ),
    );

    const heat = container.querySelector('button[aria-label="Usage heatmap"]');
    const labels = container.querySelector('button[aria-label="Building labels"]');
    const settings = container.querySelector('button[aria-label="Map settings"]');

    // Heat + labels sit inside a wrapper hidden below sm.
    expect(heat?.closest(".hidden")).not.toBeNull();
    expect(labels?.closest(".hidden")).not.toBeNull();
    // Settings is not inside that hidden wrapper.
    expect(settings?.closest(".hidden")).toBeNull();

    await act(async () => root.unmount());
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/campus-energy/__tests__/map-controls.test.tsx`
Expected: FAIL — heat/labels are not inside a `.hidden` wrapper yet.

- [ ] **Step 3: Restructure the second control group in `map-controls.tsx`**

Replace the second group (current lines 47–67):

```tsx
      <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface/95 shadow-pop backdrop-blur">
        <ControlButton
          label={controls.heatmap}
          active={showHeat}
          onClick={onToggleHeat}
        >
          <Flame size={18} aria-hidden="true" />
        </ControlButton>
        <span className="h-px bg-line" aria-hidden="true" />
        <ControlButton
          label={controls.labels}
          active={showLabels}
          onClick={onToggleLabels}
        >
          <Tag size={18} aria-hidden="true" />
        </ControlButton>
        <span className="h-px bg-line" aria-hidden="true" />
        <ControlButton label={controls.settings} onClick={onOpenSettings}>
          <Settings size={18} aria-hidden="true" />
        </ControlButton>
      </div>
```

with (wrap heat/labels + their dividers in a `hidden ... sm:flex` block; settings stays):

```tsx
      <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface/95 shadow-pop backdrop-blur">
        <div className="hidden flex-col sm:flex">
          <ControlButton
            label={controls.heatmap}
            active={showHeat}
            onClick={onToggleHeat}
          >
            <Flame size={18} aria-hidden="true" />
          </ControlButton>
          <span className="h-px bg-line" aria-hidden="true" />
          <ControlButton
            label={controls.labels}
            active={showLabels}
            onClick={onToggleLabels}
          >
            <Tag size={18} aria-hidden="true" />
          </ControlButton>
          <span className="h-px bg-line" aria-hidden="true" />
        </div>
        <ControlButton label={controls.settings} onClick={onOpenSettings}>
          <Settings size={18} aria-hidden="true" />
        </ControlButton>
      </div>
```

- [ ] **Step 4: Hide the legend on mobile in `admin-map-view.tsx`**

Replace (current lines 131–133):

```tsx
      <div className="absolute bottom-4 right-4">
        <MapLegend />
      </div>
```

with:

```tsx
      <div className="absolute bottom-4 right-4 hidden sm:block">
        <MapLegend />
      </div>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/features/campus-energy/__tests__/map-controls.test.tsx`
Expected: PASS (existing reset test + new test).

- [ ] **Step 6: Commit**

```bash
git add src/features/campus-energy/components/map-controls.tsx \
  src/features/campus-energy/components/admin-map-view.tsx \
  src/features/campus-energy/__tests__/map-controls.test.tsx
git commit -m "feat(map): trim mobile rail to zoom+settings and hide legend below sm"
```

---

## Task 4: Move heatmap/label toggles into the settings popover (mobile only)

Because Task 3 hides the heat/label buttons on mobile, the popover must surface them on mobile so the controls remain reachable. Desktop keeps them in the rail (popover unchanged on desktop).

**Files:**
- Create: `src/features/campus-energy/components/map-display-toggles.tsx`
- Create: `src/features/campus-energy/__tests__/map-display-toggles.test.tsx`
- Modify: `src/features/campus-energy/components/map-settings-popover.tsx` (props + mobile-only section)
- Modify: `src/features/campus-energy/components/admin-map-view.tsx:162-167` (pass toggle props)

**Interfaces:**
- Consumes: `useI18n()` → `messages.mapView.controls.{heatmap, labels}`; lucide `Flame`, `Tag`.
- Produces:
  - `export function MapDisplayToggles(props: { showHeat: boolean; onToggleHeat: () => void; showLabels: boolean; onToggleLabels: () => void }): JSX.Element`
  - `MapSettingsPopover` props extended to: `{ open, onClose, mode, onModeChange, showHeat: boolean, onToggleHeat: () => void, showLabels: boolean, onToggleLabels: () => void }`.

- [ ] **Step 1: Write the failing test**

Create `src/features/campus-energy/__tests__/map-display-toggles.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapDisplayToggles } from "../components/map-display-toggles";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    messages: {
      mapView: {
        controls: { heatmap: "Usage heatmap", labels: "Building labels" },
      },
    },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("MapDisplayToggles", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("reflects active state and calls the handlers", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    const onToggleHeat = vi.fn();
    const onToggleLabels = vi.fn();

    await act(async () =>
      root.render(
        <MapDisplayToggles
          showHeat
          onToggleHeat={onToggleHeat}
          showLabels={false}
          onToggleLabels={onToggleLabels}
        />,
      ),
    );

    const heat = container.querySelector(
      'button[aria-label="Usage heatmap"]',
    ) as HTMLButtonElement;
    const labels = container.querySelector(
      'button[aria-label="Building labels"]',
    ) as HTMLButtonElement;

    expect(heat.getAttribute("aria-pressed")).toBe("true");
    expect(labels.getAttribute("aria-pressed")).toBe("false");

    await act(async () => heat.click());
    await act(async () => labels.click());

    expect(onToggleHeat).toHaveBeenCalledTimes(1);
    expect(onToggleLabels).toHaveBeenCalledTimes(1);

    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/campus-energy/__tests__/map-display-toggles.test.tsx`
Expected: FAIL — `Cannot find module '../components/map-display-toggles'`.

- [ ] **Step 3: Create the component**

Create `src/features/campus-energy/components/map-display-toggles.tsx`:

```tsx
"use client";

import { Flame, Tag } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";

type MapDisplayTogglesProps = {
  showHeat: boolean;
  onToggleHeat: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
};

// The heatmap/label toggles surfaced inside the settings popover on mobile,
// where they are removed from the always-on map rail to cut clutter.
export function MapDisplayToggles({
  showHeat,
  onToggleHeat,
  showLabels,
  onToggleLabels,
}: MapDisplayTogglesProps) {
  const { messages } = useI18n();
  const controls = messages.mapView.controls;

  return (
    <div className="flex flex-col">
      <ToggleRow label={controls.heatmap} active={showHeat} onClick={onToggleHeat}>
        <Flame size={16} aria-hidden="true" />
      </ToggleRow>
      <ToggleRow
        label={controls.labels}
        active={showLabels}
        onClick={onToggleLabels}
      >
        <Tag size={16} aria-hidden="true" />
      </ToggleRow>
    </div>
  );
}

function ToggleRow({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={`grid h-8 w-8 place-items-center rounded-lg transition ${
          active
            ? "bg-accent-soft text-accent"
            : "bg-surface-3 text-ink-subtle hover:text-ink"
        }`}
      >
        {children}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/campus-energy/__tests__/map-display-toggles.test.tsx`
Expected: PASS (1 passed).

- [ ] **Step 5: Wire the toggles into `map-settings-popover.tsx`**

Add the import:

```tsx
import { MapDisplayToggles } from "./map-display-toggles";
```

Extend the props type:

```tsx
type MapSettingsPopoverProps = {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  showHeat: boolean;
  onToggleHeat: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
};
```

Update the destructure:

```tsx
export function MapSettingsPopover({
  open,
  onClose,
  mode,
  onModeChange,
  showHeat,
  onToggleHeat,
  showLabels,
  onToggleLabels,
}: MapSettingsPopoverProps) {
```

Inside the dialog `<div role="dialog" ...>`, immediately after the header block (after the closing `</div>` of the `mb-2 flex items-center justify-between` row and before `<Row label={settings.mode}>`), insert the mobile-only section:

```tsx
        <div className="sm:hidden">
          <MapDisplayToggles
            showHeat={showHeat}
            onToggleHeat={onToggleHeat}
            showLabels={showLabels}
            onToggleLabels={onToggleLabels}
          />
          <div className="my-1 h-px bg-line" aria-hidden="true" />
        </div>
```

- [ ] **Step 6: Pass the props from `admin-map-view.tsx`**

Replace the `MapSettingsPopover` usage (current lines 162–167):

```tsx
      <MapSettingsPopover
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        mode={mode}
        onModeChange={onModeChange}
      />
```

with:

```tsx
      <MapSettingsPopover
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        mode={mode}
        onModeChange={onModeChange}
        showHeat={showHeat}
        onToggleHeat={() => setShowHeat((value) => !value)}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((value) => !value)}
      />
```

- [ ] **Step 7: Verify build (popover now requires the new props everywhere)**

Run: `npm run build`
Expected: succeeds. (TypeScript confirms the only `MapSettingsPopover` call site passes the new required props.)

- [ ] **Step 8: Commit**

```bash
git add src/features/campus-energy/components/map-display-toggles.tsx \
  src/features/campus-energy/__tests__/map-display-toggles.test.tsx \
  src/features/campus-energy/components/map-settings-popover.tsx \
  src/features/campus-energy/components/admin-map-view.tsx
git commit -m "feat(map): surface heatmap/label toggles in settings popover on mobile"
```

---

## Task 5: Building-rank panel as a collapsed bottom sheet on mobile

Desktop keeps the floating bottom-left panel (open by default). Mobile renders the same panel as a full-width bottom sheet that is **collapsed by default** (just a dock header), expanding on tap. Two instances toggled by `sm:hidden` / `hidden sm:block` keep per-viewport default-open state without a media-query hook (avoids hydration/flash). Mapbox attribution is lifted above the collapsed dock via `globals.css`.

**Files:**
- Modify: `src/features/campus-energy/components/building-rank-panel.tsx` (add `variant`)
- Create: `src/features/campus-energy/__tests__/building-rank-panel.test.tsx`
- Modify: `src/features/campus-energy/components/admin-map-view.tsx` (state + two wrappers, lines 53-57 and 135-145)
- Modify: `src/app/globals.css` (Mapbox attribution lift)

**Interfaces:**
- Consumes: existing `BuildingRankPanelProps` + new optional `variant?: "floating" | "sheet"` (default `"floating"`). `EnergySubject`, `EnergyComparison` from `../domain/types`.
- Produces: `BuildingRankPanel` accepting `variant`. `admin-map-view` gains `rankOpenMobile` state (`useState(false)`) alongside existing `rankOpen` (`useState(true)`).

- [ ] **Step 1: Write the failing test**

Create `src/features/campus-energy/__tests__/building-rank-panel.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuildingRankPanel } from "../components/building-rank-panel";
import type { EnergyComparison, EnergySubject } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: { mapView: { rankTitle: "건물 절감 순위" } },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const subjects: EnergySubject[] = [
  {
    id: "a",
    schoolId: "yu",
    campusId: "yu-main",
    type: "building",
    name: "International Center",
    shortName: "IC",
  },
];

const comparisons: EnergyComparison[] = [
  {
    subjectId: "a",
    actualKwh: 650,
    forecastKwh: 812,
    periodLabel: "2026-06",
    deltaKwh: -162,
    savingsKwh: 162,
    overuseKwh: 0,
    savingsRate: 0.2,
    status: "saving",
  },
];

function renderPanel(root: Root, variant: "floating" | "sheet", onToggle = () => {}) {
  return root.render(
    <BuildingRankPanel
      subjects={subjects}
      comparisons={comparisons}
      selectedSubjectId=""
      onSelectSubject={() => {}}
      open
      onToggle={onToggle}
      query=""
      variant={variant}
    />,
  );
}

describe("BuildingRankPanel", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("uses the floating container by default", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => renderPanel(root, "floating"));

    const panel = container.firstElementChild as HTMLElement;
    expect(panel.className).toContain("rounded-2xl");
    expect(panel.className).toContain("w-[19.5rem]");

    await act(async () => root.unmount());
  });

  it("uses a full-width rounded-top container in sheet variant and toggles", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    const onToggle = vi.fn();

    await act(async () => renderPanel(root, "sheet", onToggle));

    const panel = container.firstElementChild as HTMLElement;
    expect(panel.className).toContain("w-full");
    expect(panel.className).toContain("rounded-t-2xl");

    const toggle = container.querySelector(
      'button[aria-expanded="true"]',
    ) as HTMLButtonElement;
    await act(async () => toggle.click());
    expect(onToggle).toHaveBeenCalledTimes(1);

    await act(async () => root.unmount());
  });
});
```

> The fixtures above are fully typed against `src/features/campus-energy/domain/types.ts` (`EnergySubject` requires `id/schoolId/campusId/type/name/shortName`; `EnergyComparison` extends `EnergyReading`, so `periodLabel` is required) — no casts needed.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/campus-energy/__tests__/building-rank-panel.test.tsx`
Expected: FAIL — `variant` is not a valid prop; sheet container classes absent.

- [ ] **Step 3: Add the `variant` prop to `building-rank-panel.tsx`**

Add to `BuildingRankPanelProps`:

```tsx
  variant?: "floating" | "sheet";
```

Add `variant = "floating"` to the destructured params:

```tsx
export function BuildingRankPanel({
  subjects,
  comparisons,
  selectedSubjectId,
  onSelectSubject,
  open,
  onToggle,
  query,
  variant = "floating",
}: BuildingRankPanelProps) {
```

Just before `return (`, add:

```tsx
  const isSheet = variant === "sheet";
```

Replace the outer container opening tag (current line 68):

```tsx
    <div className="w-[19.5rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
```

with:

```tsx
    <div
      className={
        isSheet
          ? "w-full overflow-hidden rounded-t-2xl border-t border-line bg-surface shadow-pop"
          : "w-[19.5rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
      }
    >
      {isSheet ? (
        <div className="flex justify-center pt-2" aria-hidden="true">
          <span className="h-1 w-9 rounded-full bg-line-strong" />
        </div>
      ) : null}
```

Replace the scroll-area wrapper (current lines 89–93) to give the sheet a taller open height:

```tsx
      <div
        className={`overflow-y-auto transition-[max-height] duration-300 ${
          open ? "max-h-[19rem]" : "max-h-0"
        }`}
      >
```

with:

```tsx
      <div
        className={`overflow-y-auto transition-[max-height] duration-300 ${
          open ? (isSheet ? "max-h-[45vh]" : "max-h-[19rem]") : "max-h-0"
        }`}
      >
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/campus-energy/__tests__/building-rank-panel.test.tsx`
Expected: PASS (2 passed).

- [ ] **Step 5: Render both variants in `admin-map-view.tsx`**

Add mobile state next to the existing `rankOpen` state (current line 56 `const [rankOpen, setRankOpen] = useState(true);`):

```tsx
  const [rankOpenMobile, setRankOpenMobile] = useState(false);
```

Replace the rank block (current lines 135–145):

```tsx
      <div className="absolute bottom-4 left-4">
        <BuildingRankPanel
          subjects={subjects}
          comparisons={comparisons}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={onSelectSubject}
          open={rankOpen}
          onToggle={() => setRankOpen((value) => !value)}
          query={query}
        />
      </div>
```

with:

```tsx
      <div className="absolute bottom-4 left-4 hidden sm:block">
        <BuildingRankPanel
          subjects={subjects}
          comparisons={comparisons}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={onSelectSubject}
          open={rankOpen}
          onToggle={() => setRankOpen((value) => !value)}
          query={query}
          variant="floating"
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 sm:hidden">
        <BuildingRankPanel
          subjects={subjects}
          comparisons={comparisons}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={onSelectSubject}
          open={rankOpenMobile}
          onToggle={() => setRankOpenMobile((value) => !value)}
          query={query}
          variant="sheet"
        />
      </div>
```

- [ ] **Step 6: Lift Mapbox attribution above the collapsed dock**

Append to `src/app/globals.css` (after the existing `.mapboxgl-ctrl-attrib` rules, near line 132):

```css
/* On phones the building-rank dock sits flush at the bottom edge; lift Mapbox's
   logo + attribution above the collapsed dock so they stay visible (ToS). */
@media (max-width: 639px) {
  .mapboxgl-ctrl-bottom-left,
  .mapboxgl-ctrl-bottom-right {
    bottom: 3.5rem;
  }
}
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/features/campus-energy/components/building-rank-panel.tsx \
  src/features/campus-energy/__tests__/building-rank-panel.test.tsx \
  src/features/campus-energy/components/admin-map-view.tsx \
  src/app/globals.css
git commit -m "feat(map): mobile building-rank bottom sheet, collapsed by default"
```

---

## Task 6: Building popup as a bottom card on mobile

When a building is selected, the popup is a fixed 344px card anchored to the building's screen point — on a ~360px phone it overflows and can land off-screen. On mobile, dock it as a bottom card instead; desktop keeps the anchored behavior. The anchor uses inline `left`/`top` styles, which Tailwind cannot override, so positioning lives in a `globals.css` class.

**Files:**
- Modify: `src/app/globals.css` (`.cems-popup-anchor`)
- Modify: `src/features/campus-energy/components/admin-map-view.tsx:147-160` (popup wrapper)

**Interfaces:**
- Consumes: `popupPosition: { left: number; top: number }` (existing `ScreenPosition`).
- Produces: no API change to `BuildingPopup`; only the wrapper's class/positioning changes.

- [ ] **Step 1: Add the popup positioning class to `globals.css`**

Append to `src/app/globals.css`:

```css
/* Building popup: anchored to the map point on desktop, a bottom card on phones.
   The anchor's left/top are set via inline style, so the mobile override must
   use !important to win over them. */
.cems-popup-anchor {
  position: absolute;
  z-index: 55;
  width: 21.5rem; /* 344px */
}

@media (max-width: 639px) {
  .cems-popup-anchor {
    position: fixed;
    left: 0.75rem !important;
    right: 0.75rem;
    top: auto !important;
    bottom: 0.75rem;
    width: auto;
  }
}
```

- [ ] **Step 2: Swap the popup wrapper in `admin-map-view.tsx`**

Replace the popup wrapper (current lines 147–160):

```tsx
      {selectedSubject && selectedDetail && popupPosition ? (
        <div
          className="pointer-events-none absolute z-[55] w-[344px]"
          style={{ left: popupPosition.left, top: popupPosition.top }}
        >
          <BuildingPopup
            subject={selectedSubject}
            comparison={selectedComparison}
            detail={selectedDetail}
            campusName={school.name}
            onClose={() => onSelectSubject("")}
          />
        </div>
      ) : null}
```

with (only the wrapper's `className` changes — `absolute z-[55] w-[344px]` moves into `.cems-popup-anchor`):

```tsx
      {selectedSubject && selectedDetail && popupPosition ? (
        <div
          className="cems-popup-anchor pointer-events-none"
          style={{ left: popupPosition.left, top: popupPosition.top }}
        >
          <BuildingPopup
            subject={selectedSubject}
            comparison={selectedComparison}
            detail={selectedDetail}
            campusName={school.name}
            onClose={() => onSelectSubject("")}
          />
        </div>
      ) : null}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/features/campus-energy/components/admin-map-view.tsx
git commit -m "feat(map): dock building popup as a bottom card on mobile"
```

---

## Task 7: Full suite + mobile preview verification

Evidence-based completion: run the whole test/lint/build suite, then verify the mobile layout visually.

**Files:** none (verification only).

- [ ] **Step 1: Full unit suite**

Run: `npm run test`
Expected: all pass (previous totals + the new tests from Tasks 1, 2, 3, 4, 5).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors. (Pre-existing `game-preview.tsx` warnings may remain — do not "fix" unrelated files.)

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: succeeds; routes unchanged.

- [ ] **Step 4: Mobile preview (requires a logged-in session)**

The map route is auth-gated. With a dev server running and a logged-in test account (e.g. the existing `it@naver.com`; the user provides the password):

1. `preview_start` (or reuse the running dev server).
2. `preview_resize` to **390 × 844**.
3. Navigate to `/ko`, log in if redirected to `/ko/login`.
4. `preview_screenshot` the top of the screen. Confirm: brand is **icon-only**, search fills the row, the two summary cards are replaced by **one no-wrap line** (e.g. `실시간 64,480 kWh · 순절감 −56 kWh`) with **no glyph-per-line wrapping**, no campus dropdown.
5. `preview_screenshot` the bottom. Confirm: the **building-rank dock** is collapsed (header only), the Mapbox logo/attribution are visible above it, and there is **no legend**.
6. Tap the dock header (`preview_click`), `preview_screenshot`: the sheet expands to ~45vh.
7. Tap a building, `preview_screenshot`: the popup is a **bottom card** within the screen, not an off-screen 344px box.
8. Open settings (gear), `preview_screenshot`: **heatmap/label toggles** are present and toggle.
9. `preview_resize` to **1280 × 800**, `preview_screenshot`: desktop layout is **unchanged** (brand title+subtitle, two summary cards top-right, legend bottom-right, floating rank panel bottom-left, heat/label/settings in the rail).

If logging in is not possible in this environment, record that the visual checks are deferred and rely on the unit tests (text-no-wrap, toggle handlers, sheet/floating variant) + a clean build as the available evidence. Do **not** claim the visual result is verified if it was not observed.

- [ ] **Step 5: Final completion summary**

Report: test counts (before → after), lint/build status, and which preview checks were observed vs. deferred. Use real command output — no success claims without evidence (superpowers:verification-before-completion).

---

## Self-Review

**1. Spec coverage** (from the confirmed direction):

| Requirement | Task |
| --- | --- |
| Fix vertical text breaking | Task 1 (no-wrap compact bar replaces squeezed cards) |
| Structural mobile redesign (bottom-sheet pattern) | Task 5 (rank sheet), Task 6 (popup card), Task 1 (top restructure) |
| Summary metrics → single-line compact top bar | Task 1 |
| Hide campus selector on mobile | Task 2 |
| Hide map legend on mobile | Task 3 |
| Brand icon-only on mobile | Task 2 |
| Move heatmap/label toggles into settings | Task 3 (hide from rail) + Task 4 (add to popover) |
| Keep desktop identical | All tasks use mobile-first base + `sm:` restores; Task 7 Step 4.9 verifies |

No gaps.

**2. Placeholder scan:** No "TBD"/"handle edge cases"/"similar to" — every code step has full content. The only conditional instruction is the test fixture cast note in Task 5 Step 1, which gives the exact fallback (match `domain/types.ts`).

**3. Type consistency:**
- `MapSummaryBar({ summary })` — used identically in Task 1 component and admin-map-view.
- New i18n keys `summaryRealtimeShort` / `summaryNetSavingShort` — added to ko (source of `Messages`) and en (`satisfies Messages`); consumed in `MapSummaryBar`. Build enforces parity (Task 1 Step 7).
- `MapDisplayToggles` prop names (`showHeat`, `onToggleHeat`, `showLabels`, `onToggleLabels`) match `MapSettingsPopover`'s new props and the values passed from admin-map-view (`showHeat`, `setShowHeat`, …).
- `BuildingRankPanel` `variant?: "floating" | "sheet"` — same literal union in the prop type, the `isSheet` check, the test, and both admin-map-view call sites.
- `.cems-popup-anchor` — defined in globals.css, referenced once in admin-map-view; replaces the inline `absolute z-[55] w-[344px]` (now in the class) while inline `left`/`top` remain for the desktop anchor.

All consistent.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-26-mobile-map-ui-cleanup.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
