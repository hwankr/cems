# Mapbox Campus EMS Geometry Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the current `cems` Mapbox Yeungnam campus rendering closer to `C:\Users\fabro\Desktop\영남대학교\영남대 해커톤\campus-ems` by importing verified/reference polygon footprints where that project already maps them well, while preserving the current rule that footprint-less point fallbacks are not rendered as arbitrary 3D buildings.

**Architecture:** Use the `campus-ems/public/data/yu_buildings.geojson` file as an offline reference input, not as a runtime dependency. Convert non-`fallback_square` reference polygons into reviewed match/manual geometry data, regenerate the existing `yeungnam-building-geometries.json`, then improve the Mapbox layer setup to match the better camera, label, light, and extrusion conventions from `campus-ems`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Mapbox GL JS, Vitest, Node ESM data scripts.

---

## Confirmed Differences

- `campus-ems` renders `96` Gyeongsan-campus features, all as `Polygon`; `cems` renders `121` official entries as `48` polygons and `73` point fallbacks.
- `campus-ems` has `72` OSM-backed polygons and `24` `fallback_square` polygons; `cems` currently has `48` OSM-backed polygons.
- For the `96` shared official building codes, `48` are point fallbacks in `cems` but polygons in `campus-ems`.
- Of those `48`, exactly `24` are non-`fallback_square` reference polygons:
  - `18` `spatial`
  - `3` `name_exact`
  - `3` `name_partial`
- The remaining `24` are `fallback_square`; do not import them into 3D extrusion in this plan because that would contradict the current product decision that items without real footprint should not become arbitrary 3D buildings.
- Two non-`fallback_square` reference OSM ids, `G16` and `G18`, are not present in the current `data/raw/yeungnam-osm-buildings.geojson`; import those as manual reference geometries from the `campus-ems` GeoJSON instead of as OSM-id matches.
- After importing the 24 non-fallback reference polygons, expected generated geometry counts are approximately:
  - `121` total features
  - `72` polygon/multipolygon features
  - `49` point fallback features

## Files

- Create: `data/reference/campus-ems-yu-buildings.geojson`
  - Offline copy of `C:\Users\fabro\Desktop\영남대학교\영남대 해커톤\campus-ems\public\data\yu_buildings.geojson`.
- Create: `scripts/import-campus-ems-reference-geometries.mjs`
  - Imports non-fallback reference polygons into `data/raw/yeungnam-building-matches.json` or `data/raw/yeungnam-manual-building-geometries.geojson`.
- Modify: `data/raw/yeungnam-building-matches.json`
  - Add match entries for reference polygons whose `osm_id` exists in current raw OSM data.
- Modify: `data/raw/yeungnam-manual-building-geometries.geojson`
  - Add manual reference geometry entries for non-fallback reference polygons whose `osm_id` is missing from current raw OSM data.
- Modify: `scripts/build-yeungnam-building-geometries.mjs`
  - Preserve match/manual method metadata enough for Mapbox to distinguish imported reference geometry from existing normalized exact matches.
- Modify: `src/features/campus-energy/domain/types.ts`
  - Add optional polygon metadata for `footprintSource` and `footprintConfidence` if the rendering task needs layer separation.
- Modify: `src/features/campus-energy/data/yeungnam-buildings.ts`
  - Validate and load new optional footprint metadata.
- Modify: `src/features/campus-energy/domain/geojson.ts`
  - Pass footprint metadata into Mapbox feature properties.
- Modify: `src/features/campus-energy/components/mapbox-style.ts`
  - Add richer extrusion paint expressions and keep opacity constant per layer.
- Modify: `src/features/campus-energy/components/campus-map.tsx`
  - Adopt the better Mapbox setup from `campus-ems`: `dark-v11`, `minZoom`, default building layer hiding, `setLight`, centered Korean labels, reset view button if desired.
- Modify: `src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts`
  - Add import-script and geometry-count regression tests.
- Modify: `src/features/campus-energy/__tests__/energy.test.ts`
  - Add runtime adapter validation for footprint metadata.
- Modify: `src/features/campus-energy/__tests__/geojson.test.ts`
  - Add feature-property propagation tests for footprint metadata.
- Modify: `src/features/campus-energy/__tests__/mapbox-style.test.ts`
  - Validate the revised fill-extrusion paint expressions.
- Modify: `src/features/campus-energy/__tests__/campus-map.test.tsx`
  - Verify layer registration, default building layer hiding, `setLight`, labels, and click/fly behavior.
- Modify: `docs/technical/campus-energy-mvp.md`
  - Document the `campus-ems` reference import and the fallback-square exclusion rule.
- Modify: `docs/working/current-state.md`
  - Update current map geometry counts after regeneration.
- Modify: `docs/working/meeting-notes.md`
  - Record the user-requested comparison and verified differences.

---

### Task 1: Add Reference GeoJSON And Importer Tests

**Files:**
- Create: `data/reference/campus-ems-yu-buildings.geojson`
- Create: `scripts/import-campus-ems-reference-geometries.mjs`
- Modify: `src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts`

- [ ] **Step 1: Copy the reference GeoJSON into this repo**

Run:

```powershell
New-Item -ItemType Directory -Force data/reference
Copy-Item -LiteralPath "C:\Users\fabro\Desktop\영남대학교\영남대 해커톤\campus-ems\public\data\yu_buildings.geojson" -Destination "data\reference\campus-ems-yu-buildings.geojson"
```

Expected:

```text
data/reference/campus-ems-yu-buildings.geojson exists
```

- [ ] **Step 2: Add importer test cases**

Add this import to `src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts`:

```ts
import {
  createCampusEmsReferenceGeometryUpdates,
  summarizeCampusEmsReferenceComparison,
} from "../../../../scripts/import-campus-ems-reference-geometries.mjs";
```

Add this test block:

```ts
describe("campus-ems reference geometry importer", () => {
  const catalog = {
    buildings: [
      {
        id: "yu-a06",
        schoolId: "yeungnam",
        campusId: "gyeongsan",
        officialCode: "A06",
        name: "College of Arts-Design Building",
        nameKo: "예술대학 디자인관",
        shortName: "A06",
        kind: "building",
      },
      {
        id: "yu-a09",
        schoolId: "yeungnam",
        campusId: "gyeongsan",
        officialCode: "A09",
        name: "Tennis Court",
        nameKo: "중앙테니스장",
        shortName: "A09",
        kind: "outdoor",
      },
      {
        id: "yu-g16",
        schoolId: "yeungnam",
        campusId: "gyeongsan",
        officialCode: "G16",
        name: "Automotive Building",
        nameKo: "자동차관",
        shortName: "G16",
        kind: "building",
      },
    ],
  };
  const currentGeometries = {
    features: [
      {
        type: "Feature",
        properties: {
          subjectId: "yu-a06",
          officialCode: "A06",
          geometrySource: "official-campus-map",
        },
        geometry: { type: "Point", coordinates: [128, 35] },
      },
      {
        type: "Feature",
        properties: {
          subjectId: "yu-a09",
          officialCode: "A09",
          geometrySource: "official-campus-map",
        },
        geometry: { type: "Point", coordinates: [128, 35] },
      },
      {
        type: "Feature",
        properties: {
          subjectId: "yu-g16",
          officialCode: "G16",
          geometrySource: "official-campus-map",
        },
        geometry: { type: "Point", coordinates: [128, 35] },
      },
    ],
  };
  const currentOsmGeoJson = {
    features: [
      {
        type: "Feature",
        properties: { osmId: "way/348365622" },
        geometry: {
          type: "Polygon",
          coordinates: [[[128, 35], [129, 35], [129, 36], [128, 35]]],
        },
      },
    ],
  };
  const referenceGeoJson = {
    features: [
      {
        type: "Feature",
        properties: {
          bNo: "A06",
          bName: "예술대학 디자인관",
          polygon_source: "spatial",
          osm_id: 348365622,
        },
        geometry: {
          type: "Polygon",
          coordinates: [[[128, 35], [129, 35], [129, 36], [128, 35]]],
        },
      },
      {
        type: "Feature",
        properties: {
          bNo: "A09",
          bName: "중앙테니스장",
          polygon_source: "fallback_square",
        },
        geometry: {
          type: "Polygon",
          coordinates: [[[128, 35], [129, 35], [129, 36], [128, 35]]],
        },
      },
      {
        type: "Feature",
        properties: {
          bNo: "G16",
          bName: "자동차관",
          polygon_source: "name_exact",
          osm_id: 236156797,
        },
        geometry: {
          type: "Polygon",
          coordinates: [[[128, 35], [129, 35], [129, 36], [128, 35]]],
        },
      },
    ],
  };

  it("summarizes current point fallbacks that campus-ems maps as polygons", () => {
    expect(
      summarizeCampusEmsReferenceComparison({
        catalog,
        currentGeometries,
        referenceGeoJson,
      }),
    ).toMatchObject({
      sharedOfficialCodes: 3,
      pointFallbackReferencePolygons: 3,
      nonFallbackReferencePolygons: 2,
      fallbackSquareReferencePolygons: 1,
    });
  });

  it("imports non-fallback reference polygons and excludes fallback squares by default", () => {
    const result = createCampusEmsReferenceGeometryUpdates({
      catalog,
      currentGeometries,
      currentOsmGeoJson,
      existingMatches: [],
      existingManualFeatures: [],
      referenceGeoJson,
    });

    expect(result.matches).toEqual([
      expect.objectContaining({
        officialCode: "A06",
        catalogId: "yu-a06",
        osmId: "way/348365622",
        geometrySource: "openstreetmap",
        geometryConfidence: "estimated",
        matchMethod: "campus-ems-reference-spatial",
      }),
    ]);
    expect(result.manualFeatures).toEqual([
      expect.objectContaining({
        properties: expect.objectContaining({
          subjectId: "yu-g16",
          officialCode: "G16",
          geometrySource: "manual",
          geometryConfidence: "estimated",
          matchMethod: "campus-ems-reference-name_exact",
        }),
        geometry: referenceGeoJson.features[2].geometry,
      }),
    ]);
    expect(result.excludedFallbackSquares).toEqual([
      expect.objectContaining({ officialCode: "A09" }),
    ]);
  });
});
```

- [ ] **Step 3: Run the new tests and verify they fail**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts
```

Expected:

```text
FAIL createCampusEmsReferenceGeometryUpdates is not exported
```

---

### Task 2: Implement The Reference Import Script

**Files:**
- Create: `scripts/import-campus-ems-reference-geometries.mjs`
- Modify: `data/raw/yeungnam-building-matches.json`
- Modify: `data/raw/yeungnam-manual-building-geometries.geojson`

- [ ] **Step 1: Implement script exports**

Create `scripts/import-campus-ems-reference-geometries.mjs` with these exported functions:

```js
#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const CATALOG_PATH = "src/features/campus-energy/data/yeungnam-building-catalog.json";
const CURRENT_GEOMETRIES_PATH = "src/features/campus-energy/data/yeungnam-building-geometries.json";
const OSM_GEOJSON_PATH = "data/raw/yeungnam-osm-buildings.geojson";
const MATCHES_PATH = "data/raw/yeungnam-building-matches.json";
const MANUAL_GEOJSON_PATH = "data/raw/yeungnam-manual-building-geometries.geojson";
const REFERENCE_GEOJSON_PATH = "data/reference/campus-ems-yu-buildings.geojson";

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function officialCodeForReferenceFeature(feature) {
  const value = feature?.properties?.bNo;
  return typeof value === "string" && value.trim() ? value.trim().toUpperCase() : undefined;
}

function isPolygonal(feature) {
  return feature?.geometry?.type === "Polygon" || feature?.geometry?.type === "MultiPolygon";
}

function isCurrentPointFallback(feature) {
  return feature?.geometry?.type === "Point";
}

function getCatalogIndex(catalog) {
  return new Map(asArray(catalog.buildings).map((building) => [building.officialCode, building]));
}

function getGeometryIndex(geometries) {
  return new Map(
    asArray(geometries.features)
      .filter((feature) => feature.properties?.officialCode)
      .map((feature) => [feature.properties.officialCode, feature]),
  );
}

function getOsmIdSet(osmGeoJson) {
  return new Set(asArray(osmGeoJson.features).map((feature) => feature.properties?.osmId));
}

function getExistingMatchCodes(matches) {
  return new Set(asArray(matches).map((match) => match.officialCode).filter(Boolean));
}

function getExistingManualCodes(manualFeatures) {
  return new Set(
    asArray(manualFeatures)
      .map((feature) => feature.properties?.officialCode)
      .filter(Boolean),
  );
}

export function summarizeCampusEmsReferenceComparison({
  catalog,
  currentGeometries,
  referenceGeoJson,
}) {
  const catalogByCode = getCatalogIndex(catalog);
  const currentByCode = getGeometryIndex(currentGeometries);
  let sharedOfficialCodes = 0;
  let pointFallbackReferencePolygons = 0;
  let nonFallbackReferencePolygons = 0;
  let fallbackSquareReferencePolygons = 0;

  for (const referenceFeature of asArray(referenceGeoJson.features)) {
    const officialCode = officialCodeForReferenceFeature(referenceFeature);
    if (!officialCode || !catalogByCode.has(officialCode) || !currentByCode.has(officialCode)) {
      continue;
    }

    sharedOfficialCodes += 1;
    const currentFeature = currentByCode.get(officialCode);

    if (!isCurrentPointFallback(currentFeature) || !isPolygonal(referenceFeature)) {
      continue;
    }

    pointFallbackReferencePolygons += 1;

    if (referenceFeature.properties?.polygon_source === "fallback_square") {
      fallbackSquareReferencePolygons += 1;
    } else {
      nonFallbackReferencePolygons += 1;
    }
  }

  return {
    sharedOfficialCodes,
    pointFallbackReferencePolygons,
    nonFallbackReferencePolygons,
    fallbackSquareReferencePolygons,
  };
}

export function createCampusEmsReferenceGeometryUpdates({
  catalog,
  currentGeometries,
  currentOsmGeoJson,
  existingMatches,
  existingManualFeatures,
  referenceGeoJson,
}) {
  const catalogByCode = getCatalogIndex(catalog);
  const currentByCode = getGeometryIndex(currentGeometries);
  const currentOsmIds = getOsmIdSet(currentOsmGeoJson);
  const existingMatchCodes = getExistingMatchCodes(existingMatches);
  const existingManualCodes = getExistingManualCodes(existingManualFeatures);
  const matches = [];
  const manualFeatures = [];
  const excludedFallbackSquares = [];

  for (const referenceFeature of asArray(referenceGeoJson.features)) {
    const officialCode = officialCodeForReferenceFeature(referenceFeature);
    const polygonSource = referenceFeature.properties?.polygon_source;
    const catalogBuilding = officialCode ? catalogByCode.get(officialCode) : undefined;
    const currentFeature = officialCode ? currentByCode.get(officialCode) : undefined;

    if (!officialCode || !catalogBuilding || !currentFeature || !isCurrentPointFallback(currentFeature) || !isPolygonal(referenceFeature)) {
      continue;
    }

    if (polygonSource === "fallback_square") {
      excludedFallbackSquares.push({
        officialCode,
        catalogId: catalogBuilding.id,
        name: catalogBuilding.name,
        referenceName: referenceFeature.properties?.bName ?? null,
      });
      continue;
    }

    if (existingMatchCodes.has(officialCode) || existingManualCodes.has(officialCode)) {
      continue;
    }

    const matchMethod = `campus-ems-reference-${polygonSource}`;
    const osmId = Number.isFinite(referenceFeature.properties?.osm_id)
      ? `way/${referenceFeature.properties.osm_id}`
      : undefined;

    if (osmId && currentOsmIds.has(osmId)) {
      matches.push({
        officialCode,
        catalogId: catalogBuilding.id,
        osmId,
        geometrySource: "openstreetmap",
        geometryConfidence: "estimated",
        reviewStatus: "estimated",
        matchMethod,
        catalogName: catalogBuilding.name,
        catalogNameKo: catalogBuilding.nameKo ?? null,
        catalogNameEn: catalogBuilding.nameEn ?? null,
        osmName: referenceFeature.properties?.bName ?? null,
        osmNameKo: null,
        osmNameEn: null,
        notes: "Imported from local campus-ems reference GeoJSON because it maps this current point fallback to a non-fallback polygon.",
      });
    } else {
      manualFeatures.push({
        type: "Feature",
        properties: {
          subjectId: catalogBuilding.id,
          officialCode,
          geometrySource: "manual",
          geometryConfidence: "estimated",
          sourceUrl: "local-reference:data/reference/campus-ems-yu-buildings.geojson",
          matchMethod,
          referenceName: referenceFeature.properties?.bName ?? null,
          referencePolygonSource: polygonSource,
          referenceOsmId: osmId ?? null,
        },
        geometry: referenceFeature.geometry,
      });
    }
  }

  return { matches, manualFeatures, excludedFallbackSquares };
}

async function main() {
  const [catalog, currentGeometries, currentOsmGeoJson, matchesJson, manualGeoJson, referenceGeoJson] =
    await Promise.all([
      readJson(CATALOG_PATH),
      readJson(CURRENT_GEOMETRIES_PATH),
      readJson(OSM_GEOJSON_PATH),
      readJson(MATCHES_PATH),
      readJson(MANUAL_GEOJSON_PATH),
      readJson(REFERENCE_GEOJSON_PATH),
    ]);

  const result = createCampusEmsReferenceGeometryUpdates({
    catalog,
    currentGeometries,
    currentOsmGeoJson,
    existingMatches: matchesJson.matches,
    existingManualFeatures: manualGeoJson.features,
    referenceGeoJson,
  });

  matchesJson.matches = [...asArray(matchesJson.matches), ...result.matches].sort((left, right) =>
    String(left.officialCode).localeCompare(String(right.officialCode), "en", { numeric: true }),
  );
  matchesJson.metadata = {
    ...matchesJson.metadata,
    campusEmsReferenceImport: {
      importedMatchCount: result.matches.length,
      importedManualFeatureCount: result.manualFeatures.length,
      excludedFallbackSquareCount: result.excludedFallbackSquares.length,
    },
  };
  manualGeoJson.features = [...asArray(manualGeoJson.features), ...result.manualFeatures];
  manualGeoJson.metadata = {
    ...manualGeoJson.metadata,
    campusEmsReferenceImport: {
      importedManualFeatureCount: result.manualFeatures.length,
      excludedFallbackSquareCount: result.excludedFallbackSquares.length,
    },
  };

  await Promise.all([
    writeJson(MATCHES_PATH, matchesJson),
    writeJson(MANUAL_GEOJSON_PATH, manualGeoJson),
  ]);

  console.log(
    `Imported ${result.matches.length} OSM matches and ${result.manualFeatures.length} manual geometries; excluded ${result.excludedFallbackSquares.length} fallback squares.`,
  );
}

if (isMainModule()) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
```

- [ ] **Step 2: Run the focused test**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts
```

Expected:

```text
PASS
```

- [ ] **Step 3: Run the importer against real data**

Run:

```powershell
node scripts/import-campus-ems-reference-geometries.mjs
```

Expected:

```text
Imported 22 OSM matches and 2 manual geometries; excluded 24 fallback squares.
```

---

### Task 3: Regenerate Geometry And Preserve Footprint Metadata

**Files:**
- Modify: `scripts/build-yeungnam-building-geometries.mjs`
- Modify: `src/features/campus-energy/domain/types.ts`
- Modify: `src/features/campus-energy/data/yeungnam-buildings.ts`
- Modify: `src/features/campus-energy/domain/geojson.ts`
- Modify: `src/features/campus-energy/__tests__/energy.test.ts`
- Modify: `src/features/campus-energy/__tests__/geojson.test.ts`
- Modify: `src/features/campus-energy/data/yeungnam-building-geometries.json`
- Modify: `data/raw/yeungnam-building-mapping-report.json`

- [ ] **Step 1: Add failing runtime metadata tests**

In `src/features/campus-energy/__tests__/energy.test.ts`, add `footprintSource` and `footprintConfidence` to the valid generated polygon fixture:

```ts
footprintSource: "campus-ems-reference",
footprintConfidence: "estimated",
```

Add an assertion:

```ts
expect(subject?.geometry).toMatchObject({
  type: "Polygon",
  footprintSource: "campus-ems-reference",
  footprintConfidence: "estimated",
});
```

Add rejection tests:

```ts
await expect(
  importYeungnamBuildingsWithGeneratedData({
    geometries: {
      features: [
        {
          ...validGeneratedGeometries.features[0],
          properties: {
            ...validGeneratedGeometries.features[0].properties,
            footprintSource: "unknown-source",
          },
        },
      ],
    },
  }),
).rejects.toThrow("Unsupported Yeungnam footprint source for E21: unknown-source");
```

- [ ] **Step 2: Add failing GeoJSON propagation test**

In `src/features/campus-energy/__tests__/geojson.test.ts`, add these fields to the polygon subject geometry:

```ts
footprintSource: "campus-ems-reference",
footprintConfidence: "estimated",
```

Expect these feature properties:

```ts
footprintSource: "campus-ems-reference",
footprintConfidence: "estimated",
```

- [ ] **Step 3: Implement footprint metadata types**

In `src/features/campus-energy/domain/types.ts`, add:

```ts
export type FootprintSource =
  | "openstreetmap"
  | "manual"
  | "campus-ems-reference";

export type FootprintConfidence = "verified" | "estimated" | "needs-review";
```

Extend polygon and multipolygon geometry metadata:

```ts
type BuildingFootprintMetadata = {
  footprintSource?: FootprintSource;
  footprintConfidence?: FootprintConfidence;
};
```

Intersect `BuildingFootprintMetadata` into `PolygonSubjectGeometry` and `MultiPolygonSubjectGeometry`.

- [ ] **Step 4: Preserve metadata from build script**

In `scripts/build-yeungnam-building-geometries.mjs`, when returning reviewed feature properties, add:

```js
footprintSource:
  properties.matchMethod?.startsWith("campus-ems-reference-")
    ? "campus-ems-reference"
    : properties.geometrySource,
footprintConfidence: properties.geometryConfidence,
```

For manual features in `featureFromManual`, pass through:

```js
matchMethod: properties.matchMethod ?? null,
referencePolygonSource: properties.referencePolygonSource ?? null,
referenceOsmId: properties.referenceOsmId ?? null,
```

- [ ] **Step 5: Validate runtime metadata**

In `src/features/campus-energy/data/yeungnam-buildings.ts`, add optional generated properties:

```ts
footprintSource?: string;
footprintConfidence?: string;
```

Add validators:

```ts
function toFootprintSource(value: string, context: string): FootprintSource {
  switch (value) {
    case "openstreetmap":
    case "manual":
    case "campus-ems-reference":
      return value;
    default:
      throw new Error(`Unsupported Yeungnam footprint source for ${context}: ${value}`);
  }
}

function toFootprintConfidence(value: string, context: string): FootprintConfidence {
  switch (value) {
    case "verified":
    case "estimated":
    case "needs-review":
      return value;
    default:
      throw new Error(`Unsupported Yeungnam footprint confidence for ${context}: ${value}`);
  }
}
```

Include those fields only for polygon/multipolygon geometry and reject them on point geometry in the same place as height metadata.

- [ ] **Step 6: Propagate metadata into Mapbox features**

In `src/features/campus-energy/domain/geojson.ts`, add optional properties:

```ts
footprintSource?: FootprintSource;
footprintConfidence?: FootprintConfidence;
```

In `attachHeightProperties`, also copy:

```ts
if (geometry.footprintSource !== undefined) {
  properties.footprintSource = geometry.footprintSource;
}

if (geometry.footprintConfidence !== undefined) {
  properties.footprintConfidence = geometry.footprintConfidence;
}
```

- [ ] **Step 7: Run tests and regenerate data**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/energy.test.ts src/features/campus-energy/__tests__/geojson.test.ts src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts
node scripts/build-yeungnam-building-geometries.mjs --strict --allow-official-point-fallbacks
```

Expected:

```text
PASS
Wrote 121 mapped geometries ...
official point fallbacks: 49
```

---

### Task 4: Upgrade Mapbox Visual Layer Setup

**Files:**
- Modify: `src/features/campus-energy/components/mapbox-style.ts`
- Modify: `src/features/campus-energy/components/campus-map.tsx`
- Modify: `src/features/campus-energy/__tests__/mapbox-style.test.ts`
- Modify: `src/features/campus-energy/__tests__/campus-map.test.tsx`

- [ ] **Step 1: Add failing style tests for campus-ems-like extrusion expressions**

In `src/features/campus-energy/__tests__/mapbox-style.test.ts`, assert:

```ts
expect(ENERGY_SUBJECT_EXTRUSION_PAINT).toMatchObject({
  "fill-extrusion-base": 0,
  "fill-extrusion-opacity": 0.86,
  "fill-extrusion-vertical-gradient": true,
});
expect(ENERGY_SUBJECT_EXTRUSION_PAINT["fill-extrusion-height"]).toEqual([
  "+",
  3,
  ["coalesce", ["to-number", ["get", "displayHeightMeters"]], 0],
]);
```

The `+ 3` base lift keeps 1-floor buildings visually visible without changing `displayHeightMeters` semantics.

- [ ] **Step 2: Update extrusion paint**

In `src/features/campus-energy/components/mapbox-style.ts`, replace `ENERGY_SUBJECT_EXTRUSION_PAINT` with:

```ts
export const ENERGY_SUBJECT_EXTRUSION_PAINT: FillExtrusionLayerSpecification["paint"] =
  {
    "fill-extrusion-color": [
      "match",
      ["get", "status"],
      "saving",
      "#38bdf8",
      "overuse",
      "#f97316",
      "#64748b",
    ],
    "fill-extrusion-height": [
      "+",
      3,
      ["coalesce", ["to-number", ["get", "displayHeightMeters"]], 0],
    ],
    "fill-extrusion-base": 0,
    "fill-extrusion-opacity": 0.86,
    "fill-extrusion-vertical-gradient": true,
    "fill-extrusion-ambient-occlusion-intensity": 0.35,
    "fill-extrusion-cast-shadows": false,
  };
```

- [ ] **Step 3: Add failing Mapbox setup tests**

In `src/features/campus-energy/__tests__/campus-map.test.tsx`, extend `MockMapInstance` with:

```ts
getLayer: ReturnType<typeof vi.fn>;
setLayoutProperty: ReturnType<typeof vi.fn>;
setLight: ReturnType<typeof vi.fn>;
easeTo: ReturnType<typeof vi.fn>;
stop: ReturnType<typeof vi.fn>;
getZoom: ReturnType<typeof vi.fn>;
```

Initialize them:

```ts
getLayer: vi.fn((id: string) =>
  ["building", "building-outline", "building-extrusion"].includes(id)
    ? { id }
    : undefined,
),
setLayoutProperty: vi.fn(),
setLight: vi.fn(),
easeTo: vi.fn(),
stop: vi.fn(),
getZoom: vi.fn(() => 16.2),
```

Add assertions:

```ts
expect(mapOptions).toMatchObject({
  style: "mapbox://styles/mapbox/dark-v11",
  minZoom: 15.3,
  localIdeographFontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
});
expect(firstMap.setLayoutProperty).toHaveBeenCalledWith("building", "visibility", "none");
expect(firstMap.setLayoutProperty).toHaveBeenCalledWith("building-outline", "visibility", "none");
expect(firstMap.setLayoutProperty).toHaveBeenCalledWith("building-extrusion", "visibility", "none");
expect(firstMap.setLight).toHaveBeenCalledWith({
  anchor: "viewport",
  color: "#ffffff",
  intensity: 0.35,
  position: [1.5, 210, 30],
});
```

- [ ] **Step 4: Implement Mapbox setup changes**

In `src/features/campus-energy/components/campus-map.tsx`, change map options:

```ts
style: "mapbox://styles/mapbox/dark-v11",
minZoom: 15.3,
localIdeographFontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
```

Keep `show3dObjects: false` only if Mapbox Standard remains in use. If switching to `dark-v11`, remove `config.basemap` because `dark-v11` does not use the Standard basemap config.

Inside `map.on("load", ...)`, before app layers:

```ts
["building", "building-outline", "building-extrusion"].forEach((id) => {
  if (map.getLayer(id)) {
    map.setLayoutProperty(id, "visibility", "none");
  }
});

map.setLight({
  anchor: "viewport",
  color: "#ffffff",
  intensity: 0.35,
  position: [1.5, 210, 30],
});
```

- [ ] **Step 5: Improve labels using full building names**

In the label layer layout, replace the code-first label with:

```ts
"text-field": ["coalesce", ["get", "name"], ["get", "officialCode"], ["get", "shortName"]],
"text-size": ["interpolate", ["linear"], ["zoom"], 15, 9, 16.5, 11, 18, 13],
"text-anchor": "center",
"text-justify": "center",
"text-padding": 2,
"text-allow-overlap": false,
"text-ignore-placement": false,
```

Use darker label halo for dark map:

```ts
"text-color": "#f8fafc",
"text-halo-color": "rgba(2, 6, 23, 0.85)",
"text-halo-width": 1.4,
"text-halo-blur": 0.4,
```

- [ ] **Step 6: Use `easeTo` for selected polygon focus**

Replace selected subject `flyTo` with:

```ts
mapRef.current.stop();
mapRef.current.easeTo({
  center: selectedSubjectCenter,
  zoom,
  pitch: school.pitch,
  bearing: -24,
  duration: 800,
});
```

Keep the existing selected subject state flow. Do not recreate the Mapbox instance on selection changes.

- [ ] **Step 7: Run focused Mapbox tests**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/mapbox-style.test.ts src/features/campus-energy/__tests__/campus-map.test.tsx
```

Expected:

```text
PASS
```

---

### Task 5: Update Documentation And Verification

**Files:**
- Modify: `docs/technical/campus-energy-mvp.md`
- Modify: `docs/working/current-state.md`
- Modify: `docs/working/meeting-notes.md`

- [ ] **Step 1: Document the source comparison**

Add to `docs/technical/campus-energy-mvp.md` under `Yeungnam Building Mapping`:

```markdown
The local `campus-ems` project was used as an offline reference for improving Gyeongsan-campus footprint coverage. Only non-`fallback_square` reference polygons are imported into the main geometry pipeline. `fallback_square` entries remain excluded from 3D extrusion unless the product explicitly accepts approximate artificial footprints later.
```

- [ ] **Step 2: Update current generated counts**

After regeneration, update `docs/technical/campus-energy-mvp.md` and `docs/working/current-state.md` with actual counts from:

```powershell
node --input-type=module -e "import geo from './src/features/campus-energy/data/yeungnam-building-geometries.json' with { type: 'json' }; const counts={}; for (const f of geo.features) counts[f.geometry.type]=(counts[f.geometry.type]??0)+1; console.log(counts)"
```

Expected count target:

```text
{ Polygon: 72, Point: 49 }
```

- [ ] **Step 3: Run full verification**

Run:

```powershell
node scripts/import-campus-ems-reference-geometries.mjs
node scripts/build-yeungnam-building-geometries.mjs --strict --allow-official-point-fallbacks
npm run test
npm run lint
npm run build
git diff --check
```

Expected:

```text
test: 13 files pass
lint: 0 errors; existing game-preview warnings may remain
build: succeeds
git diff --check: no whitespace errors
```

- [ ] **Step 4: Manual Mapbox verification**

With a valid Mapbox token:

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:3000/ko
```

Verify in browser console:

```js
window.__map?.getStyle().layers.filter((layer) => layer.id.includes("energy-subject"))
```

Expected layer ids include:

```text
energy-subject-building-extrusions
energy-subject-polygon-hit-areas
energy-subject-outlines
energy-subject-point-hit-areas
energy-subject-labels
```

Visual checks:

- More Gyeongsan campus buildings show real footprint polygons than before.
- Point fallback count is visibly reduced.
- Imported `fallback_square` approximations are not shown as 3D buildings.
- Labels show readable building names on dark map style.
- Clicking an extrusion updates the selected subject and recenters without recreating the Mapbox instance.

---

## Explicit Non-Goals

- Do not import `fallback_square` features as 3D buildings in this plan.
- Do not drop Daemyeong/H-zone official entries; `campus-ems` does not cover them, so they remain official point fallbacks unless separately mapped.
- Do not make the external `campus-ems` path a runtime dependency.
- Do not replace the current official Yeungnam catalog with the `campus-ems` dataset; use it only as a geometry reference.

## Self-Review

- Spec coverage: The plan compares `campus-ems` and `cems`, identifies data and style differences, imports only high-value non-fallback geometry, improves Mapbox visual setup, and includes verification.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: `footprintSource`, `footprintConfidence`, `displayHeightMeters`, and existing `heightSource` names are consistent across script, runtime adapter, GeoJSON conversion, and Mapbox tests.
