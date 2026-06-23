# Mapbox Building Click Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the uncomfortable visible Mapbox building floor/circle overlays and make selecting a campus subject work by clicking the building area, fallback hit area, or label.

**Architecture:** Keep Mapbox isolated in the existing Client Component, `src/features/campus-energy/components/campus-map.tsx`, as required by the local Next.js 16 Server/Client Components guide. Replace visible polygon fills and point circles with transparent hit layers, keep lightweight polygon outlines and labels for orientation, and preserve the existing `selectedSubjectId -> flyTo()` focus behavior. Point-only official campus-map fallback subjects remain clickable through invisible hit targets until those entries receive reviewed polygon geometry.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.4, TypeScript, Mapbox GL JS 3.25.0, Vitest, jsdom, Tailwind CSS v4.

---

## Scope Check

This is one UI subsystem: the admin Mapbox campus map. It does not regenerate Yeungnam geometry data, add new building matching, change energy scoring, or change participant mode. A later data-quality plan can convert more official point fallback subjects into reviewed building polygons so every subject can be clicked by its exact footprint.

## File Structure

- Modify: `src/features/campus-energy/components/mapbox-style.ts`
  - Replace the visible point-circle paint export with transparent hit-layer and outline paint exports.
- Modify: `src/features/campus-energy/components/campus-map.tsx`
  - Remove the visible polygon fill layer and visible circle marker layer.
  - Add invisible polygon and point hit layers.
  - Keep labels clickable.
  - Keep selected subject focus using `getEnergySubjectCenter()` and `map.flyTo()`.
- Modify: `src/features/campus-energy/__tests__/mapbox-style.test.ts`
  - Validate the new Mapbox style expressions.
  - Assert polygon and point hit layers are visually transparent.
- Modify: `src/features/campus-energy/__tests__/campus-map.test.tsx`
  - Assert no visible floor/circle marker layers are registered.
  - Assert clicking a polygon hit layer focuses the clicked subject.
  - Assert clicking a point fallback hit layer focuses the clicked subject without creating a visible marker.
- Modify: `docs/technical/campus-energy-mvp.md`
  - Update the Mapbox implementation note so it no longer claims the map renders visible polygon fills or point circles.

---

### Task 1: Confirm Framework and Current Map Baseline

**Files:**
- Read: `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
- Read: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- Read: `src/features/campus-energy/components/campus-map.tsx`
- Read: `src/features/campus-energy/components/mapbox-style.ts`
- Read: `src/features/campus-energy/__tests__/campus-map.test.tsx`
- Read: `src/features/campus-energy/__tests__/mapbox-style.test.ts`

- [ ] **Step 1: Read the relevant local Next.js docs**

Run:

```powershell
Get-Content -LiteralPath 'node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md'
Get-Content -LiteralPath 'node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md'
```

Expected: the docs are available locally and confirm browser-only Mapbox logic belongs in a Client Component with `"use client"`.

- [ ] **Step 2: Inspect the current Mapbox layers and tests**

Run:

```powershell
rg -n "energy-subject|circle|fill|addLayer|click|flyTo" src/features/campus-energy/components src/features/campus-energy/__tests__ -S
```

Expected: the current implementation has `energy-subject-fills`, `energy-subject-circles`, `ENERGY_SUBJECT_CIRCLE_PAINT`, and tests that click `energy-subject-circles`.

- [ ] **Step 3: Commit nothing**

Expected: `git status --short` shows no changes from this task.

---

### Task 2: Replace Visible Circle Style With Invisible Hit-Layer Styles

**Files:**
- Modify: `src/features/campus-energy/components/mapbox-style.ts`
- Modify: `src/features/campus-energy/__tests__/mapbox-style.test.ts`

- [ ] **Step 1: Write the failing style test**

Replace `src/features/campus-energy/__tests__/mapbox-style.test.ts` with:

```ts
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  ENERGY_SUBJECT_OUTLINE_PAINT,
  ENERGY_SUBJECT_POINT_HIT_PAINT,
  ENERGY_SUBJECT_POLYGON_HIT_PAINT,
} from "../components/mapbox-style";

const require = createRequire(import.meta.url);
const mapboxStyleSpec = require("mapbox-gl/dist/style-spec/index.cjs") as {
  validate: (style: unknown) => Array<{ message: string }>;
};

describe("Mapbox style expressions", () => {
  it("uses valid transparent hit-layer and outline expressions", () => {
    const errors = mapboxStyleSpec.validate({
      version: 8,
      sources: {
        subjects: {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        },
      },
      layers: [
        {
          id: "energy-subject-polygon-hit-areas",
          type: "fill",
          source: "subjects",
          paint: ENERGY_SUBJECT_POLYGON_HIT_PAINT,
        },
        {
          id: "energy-subject-point-hit-areas",
          type: "circle",
          source: "subjects",
          paint: ENERGY_SUBJECT_POINT_HIT_PAINT,
        },
        {
          id: "energy-subject-outlines",
          type: "line",
          source: "subjects",
          paint: ENERGY_SUBJECT_OUTLINE_PAINT,
        },
      ],
    });

    expect(errors.map((error) => error.message)).toEqual([]);
  });

  it("keeps polygon hit areas visually transparent", () => {
    expect(ENERGY_SUBJECT_POLYGON_HIT_PAINT).toMatchObject({
      "fill-opacity": 0,
    });
  });

  it("keeps point fallback hit areas visually transparent", () => {
    expect(ENERGY_SUBJECT_POINT_HIT_PAINT).toMatchObject({
      "circle-opacity": 0,
      "circle-stroke-opacity": 0,
    });
  });
});
```

- [ ] **Step 2: Run the style test and verify it fails**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/mapbox-style.test.ts
```

Expected: FAIL because `ENERGY_SUBJECT_OUTLINE_PAINT`, `ENERGY_SUBJECT_POINT_HIT_PAINT`, and `ENERGY_SUBJECT_POLYGON_HIT_PAINT` are not exported yet.

- [ ] **Step 3: Replace the map style constants**

Replace `src/features/campus-energy/components/mapbox-style.ts` with:

```ts
import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
} from "mapbox-gl";

export const ENERGY_SUBJECT_POLYGON_HIT_PAINT: FillLayerSpecification["paint"] =
  {
    "fill-color": "#ffffff",
    "fill-opacity": 0,
  };

export const ENERGY_SUBJECT_POINT_HIT_PAINT: CircleLayerSpecification["paint"] =
  {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      14,
      10,
      17,
      24,
    ],
    "circle-opacity": 0,
    "circle-stroke-opacity": 0,
  };

export const ENERGY_SUBJECT_OUTLINE_PAINT: LineLayerSpecification["paint"] = {
  "line-color": [
    "match",
    ["get", "status"],
    "saving",
    "#047857",
    "overuse",
    "#be123c",
    "#64748b",
  ],
  "line-opacity": ["case", ["get", "selected"], 0.95, 0.56],
  "line-width": ["case", ["get", "selected"], 3, 1.2],
};
```

- [ ] **Step 4: Run the style test and verify it passes**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/mapbox-style.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/features/campus-energy/components/mapbox-style.ts src/features/campus-energy/__tests__/mapbox-style.test.ts
git commit -m "test: cover transparent campus map hit layers"
```

Expected: commit succeeds if the user has asked for commits during execution. Otherwise, leave changes unstaged.

---

### Task 3: Add CampusMap Tests for Building Click Focus Without Visible Markers

**Files:**
- Modify: `src/features/campus-energy/__tests__/campus-map.test.tsx`

- [ ] **Step 1: Replace the subject fixture with polygon and point fallback subjects**

In `src/features/campus-energy/__tests__/campus-map.test.tsx`, replace the existing `subjects` constant with:

```ts
const manualGeometrySource = {
  kind: "manual" as const,
  name: "Manual campus mapping",
};

const officialGeometrySource = {
  kind: "official-campus-map" as const,
  name: "Yeungnam University campus map",
};

const subjects: EnergySubject[] = [
  {
    id: "yu-e21",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "building",
    name: "Engineering Building 1",
    shortName: "E21",
    officialCode: "E21",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [128.7588, 35.8328],
          [128.7592, 35.8328],
          [128.7592, 35.8332],
          [128.7588, 35.8332],
          [128.7588, 35.8328],
        ],
      ],
      geometrySource: manualGeometrySource,
      geometryConfidence: "verified",
    },
  },
  {
    id: "yu-e22",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "building",
    name: "Engineering Building 2",
    shortName: "E22",
    officialCode: "E22",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [128.7608, 35.8338],
          [128.7612, 35.8338],
          [128.7612, 35.8342],
          [128.7608, 35.8342],
          [128.7608, 35.8338],
        ],
      ],
      geometrySource: manualGeometrySource,
      geometryConfidence: "verified",
    },
  },
  {
    id: "yu-official-dd73bbe1",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "landmark",
    name: "Cheonma Honors Park",
    shortName: "Cheonma Honors Park",
    geometry: {
      type: "Point",
      coordinates: [128.7601738129029, 35.8308105775303],
      geometrySource: officialGeometrySource,
      geometryConfidence: "verified",
    },
  },
];
```

- [ ] **Step 2: Replace the comparisons fixture**

Replace the existing `comparisons` constant with:

```ts
const comparisons = [
  compareEnergy({
    subjectId: "yu-e21",
    actualKwh: 900,
    forecastKwh: 1000,
    periodLabel: "2026-W25",
  }),
  compareEnergy({
    subjectId: "yu-e22",
    actualKwh: 1200,
    forecastKwh: 1000,
    periodLabel: "2026-W25",
  }),
  compareEnergy({
    subjectId: "yu-official-dd73bbe1",
    actualKwh: 1000,
    forecastKwh: 1000,
    periodLabel: "2026-W25",
  }),
];
```

- [ ] **Step 3: Add a layer registration regression test**

Append this test inside the existing `describe("CampusMap", () => { ... })` block:

```ts
  it("registers invisible hit layers instead of visible floor fills or circle markers", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => renderMap(root));

    const firstMap = mockMapbox.instances[0];
    const layerIds = firstMap.addLayer.mock.calls.map(
      ([layer]) => (layer as { id: string }).id,
    );
    const polygonHitLayer = firstMap.addLayer.mock.calls.find(
      ([layer]) =>
        (layer as { id: string }).id === "energy-subject-polygon-hit-areas",
    )?.[0] as { paint?: Record<string, unknown> } | undefined;
    const pointHitLayer = firstMap.addLayer.mock.calls.find(
      ([layer]) =>
        (layer as { id: string }).id === "energy-subject-point-hit-areas",
    )?.[0] as { paint?: Record<string, unknown> } | undefined;

    expect(layerIds).not.toContain("energy-subject-fills");
    expect(layerIds).not.toContain("energy-subject-circles");
    expect(layerIds).toContain("energy-subject-polygon-hit-areas");
    expect(layerIds).toContain("energy-subject-point-hit-areas");
    expect(polygonHitLayer?.paint).toMatchObject({ "fill-opacity": 0 });
    expect(pointHitLayer?.paint).toMatchObject({
      "circle-opacity": 0,
      "circle-stroke-opacity": 0,
    });

    await act(async () => root.unmount());
  });
```

- [ ] **Step 4: Replace the existing circle-click test with a polygon-click test**

Replace the current test named `keeps the existing Mapbox instance when a map building click changes selection` with:

```ts
  it("keeps the existing Mapbox instance when a polygon building click changes selection", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => renderMap(root));

    expect(mockMapbox.MapConstructor).toHaveBeenCalledTimes(1);
    const firstMap = mockMapbox.instances[0];
    const source = firstMap.sources.get("energy-subjects");
    const polygonClickHandler = firstMap.handlers.get(
      "click:energy-subject-polygon-hit-areas",
    );

    expect(source).toBeDefined();
    expect(polygonClickHandler).toBeDefined();

    await act(async () =>
      polygonClickHandler?.({
        features: [{ properties: { id: "yu-e22" } }],
      }),
    );

    expect(mockMapbox.MapConstructor).toHaveBeenCalledTimes(1);
    expect(firstMap.remove).not.toHaveBeenCalled();
    expect(source?.setData).toHaveBeenCalled();
    expect(firstMap.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [128.761, 35.834],
        essential: true,
      }),
    );

    await act(async () => root.unmount());

    expect(firstMap.remove).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 5: Add a point fallback hit-area click test**

Append this test inside the same `describe("CampusMap", () => { ... })` block:

```ts
  it("keeps point fallback subjects clickable without rendering visible circles", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => renderMap(root));

    const firstMap = mockMapbox.instances[0];
    const source = firstMap.sources.get("energy-subjects");
    const pointClickHandler = firstMap.handlers.get(
      "click:energy-subject-point-hit-areas",
    );

    expect(source).toBeDefined();
    expect(pointClickHandler).toBeDefined();

    await act(async () =>
      pointClickHandler?.({
        features: [{ properties: { id: "yu-official-dd73bbe1" } }],
      }),
    );

    expect(mockMapbox.MapConstructor).toHaveBeenCalledTimes(1);
    expect(firstMap.remove).not.toHaveBeenCalled();
    expect(source?.setData).toHaveBeenCalled();
    expect(firstMap.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [128.7601738129029, 35.8308105775303],
        essential: true,
      }),
    );

    await act(async () => root.unmount());
  });
```

- [ ] **Step 6: Run the CampusMap test and verify it fails**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/campus-map.test.tsx
```

Expected: FAIL because `campus-map.tsx` still registers `energy-subject-fills`, `energy-subject-circles`, and circle click handlers.

---

### Task 4: Replace CampusMap Visible Fill and Circle Layers With Click Hit Layers

**Files:**
- Modify: `src/features/campus-energy/components/campus-map.tsx`

- [ ] **Step 1: Update the style import**

In `src/features/campus-energy/components/campus-map.tsx`, replace:

```ts
import { ENERGY_SUBJECT_CIRCLE_PAINT } from "./mapbox-style";
```

with:

```ts
import {
  ENERGY_SUBJECT_OUTLINE_PAINT,
  ENERGY_SUBJECT_POINT_HIT_PAINT,
  ENERGY_SUBJECT_POLYGON_HIT_PAINT,
} from "./mapbox-style";
```

- [ ] **Step 2: Replace the layer ID constants**

Replace:

```ts
const ENERGY_SUBJECT_FILL_LAYER_ID = "energy-subject-fills";
const ENERGY_SUBJECT_OUTLINE_LAYER_ID = "energy-subject-outlines";
const ENERGY_SUBJECT_CIRCLE_LAYER_ID = "energy-subject-circles";
const ENERGY_SUBJECT_LABEL_LAYER_ID = "energy-subject-labels";
```

with:

```ts
const ENERGY_SUBJECT_POLYGON_HIT_LAYER_ID =
  "energy-subject-polygon-hit-areas";
const ENERGY_SUBJECT_OUTLINE_LAYER_ID = "energy-subject-outlines";
const ENERGY_SUBJECT_POINT_HIT_LAYER_ID = "energy-subject-point-hit-areas";
const ENERGY_SUBJECT_LABEL_LAYER_ID = "energy-subject-labels";
```

- [ ] **Step 3: Replace the visible fill/circle layers**

Inside `map.on("load", () => { ... })`, replace the current fill, outline, and circle `map.addLayer` calls with:

```ts
      map.addLayer({
        id: ENERGY_SUBJECT_POLYGON_HIT_LAYER_ID,
        type: "fill",
        source: ENERGY_SUBJECT_SOURCE_ID,
        filter: POLYGON_FILTER,
        paint: ENERGY_SUBJECT_POLYGON_HIT_PAINT,
      });
      map.addLayer({
        id: ENERGY_SUBJECT_OUTLINE_LAYER_ID,
        type: "line",
        source: ENERGY_SUBJECT_SOURCE_ID,
        filter: POLYGON_FILTER,
        paint: ENERGY_SUBJECT_OUTLINE_PAINT,
      });
      map.addLayer({
        id: ENERGY_SUBJECT_POINT_HIT_LAYER_ID,
        type: "circle",
        source: ENERGY_SUBJECT_SOURCE_ID,
        filter: POINT_FILTER,
        paint: ENERGY_SUBJECT_POINT_HIT_PAINT,
      });
```

Expected: there is no longer an `energy-subject-fills` layer and no longer an `energy-subject-circles` layer. The remaining circle layer is intentionally named `energy-subject-point-hit-areas` and has zero opacity.

- [ ] **Step 4: Keep the label layer and make the label sit closer to the selected subject**

In the existing label layer, use this layout block:

```ts
        layout: {
          "text-field": [
            "coalesce",
            ["get", "officialCode"],
            ["get", "shortName"],
          ],
          "text-size": ["case", ["get", "selected"], 13, 11],
          "text-offset": [0, 0.75],
          "text-anchor": "top",
        },
```

Keep the existing text paint:

```ts
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.25,
        },
```

- [ ] **Step 5: Replace interactive layer registration**

Replace:

```ts
      [ENERGY_SUBJECT_FILL_LAYER_ID, ENERGY_SUBJECT_CIRCLE_LAYER_ID].forEach(
        (layerId) => {
          map.on("click", layerId, (event) => {
            const id = getFeatureStringProperty(event.features?.[0], "id");
            if (id) onSelectSubjectRef.current(id);
          });
          map.on("mouseenter", layerId, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layerId, () => {
            map.getCanvas().style.cursor = "";
          });
        },
      );
```

with:

```ts
      [
        ENERGY_SUBJECT_POLYGON_HIT_LAYER_ID,
        ENERGY_SUBJECT_POINT_HIT_LAYER_ID,
        ENERGY_SUBJECT_LABEL_LAYER_ID,
      ].forEach((layerId) => {
        map.on("click", layerId, (event) => {
          const id = getFeatureStringProperty(event.features?.[0], "id");
          if (id) onSelectSubjectRef.current(id);
        });
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      });
```

- [ ] **Step 6: Run targeted map tests**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/mapbox-style.test.ts src/features/campus-energy/__tests__/campus-map.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/features/campus-energy/components/campus-map.tsx src/features/campus-energy/components/mapbox-style.ts src/features/campus-energy/__tests__/mapbox-style.test.ts src/features/campus-energy/__tests__/campus-map.test.tsx
git commit -m "feat: focus campus buildings without visible map markers"
```

Expected: commit succeeds if the user has asked for commits during execution. Otherwise, leave changes unstaged.

---

### Task 5: Update Technical Mapbox Notes

**Files:**
- Modify: `docs/technical/campus-energy-mvp.md`

- [ ] **Step 1: Replace the Mapbox runtime description**

In `docs/technical/campus-energy-mvp.md`, replace this sentence:

```md
When a valid token is provided, Mapbox renders the Yeungnam campus view with reviewed polygon fills, outlines, point fallback support, and labels based on official campus codes.
```

with:

```md
When a valid token is provided, Mapbox renders the Yeungnam campus view with transparent polygon click hit areas, lightweight status outlines, invisible point fallback hit areas, and labels based on official campus codes. The admin map intentionally avoids visible polygon floor fills and visible point circles so users can click campus subjects without extra marker clutter.
```

- [ ] **Step 2: Add a point fallback limitation note**

Append this paragraph to the `## Yeungnam Building Mapping` section:

```md
Official campus-map point fallbacks are still data fallbacks, not exact building footprints. The UI keeps them clickable through invisible hit areas, but exact building-footprint clicking for those entries requires adding reviewed polygon geometry in `data/raw/yeungnam-building-matches.json` or `data/raw/yeungnam-manual-building-geometries.geojson`.
```

- [ ] **Step 3: Run docs diff check**

Run:

```powershell
git diff -- docs/technical/campus-energy-mvp.md
```

Expected: only the Mapbox rendering and point fallback limitation notes changed.

- [ ] **Step 4: Commit**

Run:

```powershell
git add docs/technical/campus-energy-mvp.md
git commit -m "docs: describe markerless campus map interaction"
```

Expected: commit succeeds if the user has asked for commits during execution. Otherwise, leave changes unstaged.

---

### Task 6: Final Verification

**Files:**
- Verify repository behavior.

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/mapbox-style.test.ts src/features/campus-energy/__tests__/campus-map.test.tsx src/features/campus-energy/__tests__/geojson.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run all tests**

Run:

```powershell
npm run test
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 5: Check whitespace**

Run:

```powershell
git diff --check
```

Expected: no output.

- [ ] **Step 6: Run the app for visual verification**

Run:

```powershell
npm run dev
```

Open `/ko` with `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` set.

Expected:

- The Yeungnam map loads without visible black polygon floor fills from the app overlay.
- The Yeungnam map loads without visible circular building markers from the app overlay.
- Reviewed polygon buildings can be clicked by their building area.
- Point fallback subjects can still be selected by clicking their label or invisible hit area around the official point.
- Selecting a subject still focuses the map on that subject with `flyTo()`.
- The right-side selected building detail updates after a map click.

- [ ] **Step 7: Verify missing-token behavior remains unchanged**

Run the app without `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.

Expected: the map area still renders the existing missing-token configuration state instead of constructing a Mapbox instance.

## Self-Review

- Spec coverage: the plan removes visible black/filled floor overlays, removes visible circular building markers, and keeps map-click selection/focus through building polygon hit areas, labels, and invisible point fallback hit areas.
- Placeholder scan: no task uses deferred labels or empty work markers; each changed file has concrete code or exact text.
- Type consistency: layer IDs are consistently named `energy-subject-polygon-hit-areas`, `energy-subject-point-hit-areas`, `energy-subject-outlines`, and `energy-subject-labels`; tests and implementation use the same IDs.
- Known limitation: point fallback entries do not have exact building footprints yet, so exact footprint clicking for those subjects depends on future geometry review rather than this marker-removal UI change.
