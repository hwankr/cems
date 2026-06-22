# Extensible Building Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an extensible map data structure that can start with every Yeungnam University building and later support regional elementary, middle, and other school maps without redesigning the app.

**Architecture:** Keep energy subjects as the stable business identity and attach optional GeoJSON geometry to each subject. Use Yeungnam University's official campus building list as the canonical building catalog, OpenStreetMap building footprints as the first geometry source, and validation tests to prevent unmapped or unconnected subjects from silently entering the app. Render Point, Polygon, and MultiPolygon subjects in Mapbox through one normalized feature collection so future school-level point maps and building-level polygon maps use the same pipeline.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.4, TypeScript, Mapbox GL JS v3, Vitest, Node scripts using built-in `fetch` and `fs`, GeoJSON.

**Execution note:** The implemented adapter keeps all official Yeungnam catalog entries as stable subjects, even when geometry is not reviewed yet. Current generated data has 101 catalog subjects and 48 mapped campus geometries; geometry-less subjects are omitted from the Mapbox FeatureCollection until coordinates are reviewed. Official non-building places keep their `campusPlaceKind` (`landmark`, `outdoor`, or `utility`) instead of being labeled as buildings.

---

## External Source Baseline

- Official Yeungnam University campus map page: `https://www.yu.ac.kr/main/intro/campus-map.do`
- Official Yeungnam University campus tour building list: `https://www.yu.ac.kr/campus_vr-e/vr_eng.php`
- Future regional school point data source: `https://www.data.go.kr/data/15021148/standard.do`
- Future NEIS school metadata source: `https://open.neis.go.kr/portal/data/service/selectServicePage.do?infId=OPEN17020190531110010104913&infSeq=2`

Use official Yeungnam pages for building codes and names. Use OSM only for building footprint geometry. If an OSM footprint is missing or wrong, add a manually traced feature with `geometrySource.kind` set to `manual`.

## Target File Structure

- Modify: `src/features/campus-energy/domain/types.ts`
  - Add reusable GeoJSON geometry types, geometry source metadata, and optional geometry on `EnergySubject`.
- Create: `src/features/campus-energy/domain/geojson.ts`
  - Convert energy subjects and comparisons into a Mapbox-ready FeatureCollection.
  - Compute subject centers for Point, Polygon, and MultiPolygon geometry.
- Create: `src/features/campus-energy/__tests__/geojson.test.ts`
  - Verify geometry conversion, status properties, selected properties, and center calculation.
- Create: `scripts/fetch-yeungnam-campus-catalog.mjs`
  - Fetch the official Yeungnam campus tour page and generate a canonical building catalog JSON.
- Create: `scripts/fetch-yeungnam-osm-buildings.mjs`
  - Fetch OSM building footprints inside the Yeungnam Gyeongsan campus bounding box through Overpass.
- Create: `scripts/build-yeungnam-building-geometries.mjs`
  - Merge official building catalog, OSM features, and reviewed match data into app-ready GeoJSON.
- Create: `data/raw/yeungnam-building-matches.json`
  - Human-reviewed mapping from official Yeungnam building code to OSM feature ID or manual feature ID.
- Create: `data/raw/yeungnam-manual-building-geometries.geojson`
  - Manual fallback features for buildings not available or not reliable in OSM.
- Create generated file: `src/features/campus-energy/data/yeungnam-building-catalog.json`
  - Official Yeungnam building code/name catalog.
- Create generated file: `src/features/campus-energy/data/yeungnam-building-geometries.json`
  - App-ready FeatureCollection keyed by `subjectId`.
- Create: `src/features/campus-energy/data/yeungnam-buildings.ts`
  - Convert catalog and geometry JSON into `EnergySubject[]`.
- Modify: `src/features/campus-energy/data/demo-campus.ts`
  - Use the Yeungnam generated subjects while preserving current demo readings.
- Modify: `src/features/campus-energy/data/localized-demo-campus.ts`
  - Fall back to canonical subject names when an i18n dictionary does not yet have a per-building translation.
- Modify: `src/features/campus-energy/components/campus-map.tsx`
  - Render polygon fills, polygon outlines, point circles, and labels from the normalized feature collection.
- Modify: `src/features/campus-energy/__tests__/energy.test.ts`
  - Validate that every Yeungnam geometry maps to a known subject and every demo reading maps to a known subject.
- Modify: `docs/product/campus-energy-platform.md`
  - Document the subject hierarchy: region, school, campus, building.
- Modify: `docs/technical/campus-energy-mvp.md`
  - Document Yeungnam building geometry sources and validation commands.

---

### Task 1: Confirm Next.js local docs before code changes

**Files:**
- Read: `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
- Read: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- Read: `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`

- [ ] **Step 1: Read the relevant local Next.js 16 docs**

Run:

```powershell
Get-Content -Raw node_modules\next\dist\docs\01-app\01-getting-started\02-project-structure.md
Get-Content -Raw node_modules\next\dist\docs\01-app\01-getting-started\05-server-and-client-components.md
Get-Content -Raw node_modules\next\dist\docs\01-app\02-guides\environment-variables.md
```

Expected: the docs are available locally and confirm that browser-only Mapbox code must remain in a Client Component.

- [ ] **Step 2: Commit nothing**

Expected: no file has changed.

---

### Task 2: Add reusable subject geometry types

**Files:**
- Modify: `src/features/campus-energy/domain/types.ts`
- Test: `src/features/campus-energy/__tests__/geojson.test.ts`

- [ ] **Step 1: Write the failing geometry type usage test**

Create `src/features/campus-energy/__tests__/geojson.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getEnergySubjectCenter } from "../domain/geojson";
import type { EnergySubject } from "../domain/types";

describe("getEnergySubjectCenter", () => {
  it("uses point geometry when a subject has explicit point geometry", () => {
    const subject: EnergySubject = {
      id: "school-001",
      schoolId: "school-001",
      campusId: "main",
      type: "school",
      name: "Sample Elementary School",
      shortName: "Sample ES",
      lng: 128.6,
      lat: 35.8,
      geometry: {
        type: "Point",
        coordinates: [128.61, 35.81],
        geometrySource: {
          kind: "public-data",
          name: "National school location standard data",
          url: "https://www.data.go.kr/data/15021148/standard.do",
        },
        geometryConfidence: "verified",
      },
    };

    expect(getEnergySubjectCenter(subject)).toEqual([128.61, 35.81]);
  });

  it("falls back to legacy lng and lat when geometry is not attached", () => {
    const subject: EnergySubject = {
      id: "yu-it",
      schoolId: "yeungnam",
      campusId: "gyeongsan",
      type: "building",
      name: "IT Building",
      shortName: "IT",
      lng: 128.75859,
      lat: 35.83393,
    };

    expect(getEnergySubjectCenter(subject)).toEqual([128.75859, 35.83393]);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/geojson.test.ts
```

Expected: FAIL because `src/features/campus-energy/domain/geojson.ts` does not exist.

- [ ] **Step 3: Add geometry types to the domain**

Modify `src/features/campus-energy/domain/types.ts` so the geometry-related section reads:

```ts
export type EnergySubjectType =
  | "building"
  | "department"
  | "college"
  | "school"
  | "region";

export type EnergyStatus = "saving" | "neutral" | "overuse";

export type Coordinate = [number, number];

export type GeometrySourceKind =
  | "official-campus-map"
  | "openstreetmap"
  | "public-data"
  | "manual";

export type GeometryConfidence = "verified" | "estimated" | "needs-review";

export type GeometrySource = {
  kind: GeometrySourceKind;
  name: string;
  url?: string;
  capturedAt?: string;
};

export type SubjectGeometry =
  | {
      type: "Point";
      coordinates: Coordinate;
      geometrySource: GeometrySource;
      geometryConfidence: GeometryConfidence;
    }
  | {
      type: "Polygon";
      coordinates: Coordinate[][];
      geometrySource: GeometrySource;
      geometryConfidence: GeometryConfidence;
    }
  | {
      type: "MultiPolygon";
      coordinates: Coordinate[][][];
      geometrySource: GeometrySource;
      geometryConfidence: GeometryConfidence;
    };
```

Then extend `EnergySubject` in the same file:

```ts
export type EnergySubject = {
  id: string;
  schoolId: string;
  campusId: string;
  type: EnergySubjectType;
  name: string;
  shortName: string;
  lng: number;
  lat: number;
  groupId?: string;
  geometry?: SubjectGeometry;
  officialCode?: string;
};
```

- [ ] **Step 4: Create the geometry helper module**

Create `src/features/campus-energy/domain/geojson.ts`:

```ts
import type {
  Coordinate,
  EnergyComparison,
  EnergySubject,
  EnergyStatus,
  SubjectGeometry,
} from "./types";

export type EnergySubjectFeature = {
  type: "Feature";
  geometry: Pick<SubjectGeometry, "type" | "coordinates">;
  properties: {
    id: string;
    name: string;
    shortName: string;
    type: EnergySubject["type"];
    status: EnergyStatus;
    deltaKwh: number;
    selected: boolean;
    officialCode?: string;
  };
};

export type EnergySubjectFeatureCollection = {
  type: "FeatureCollection";
  features: EnergySubjectFeature[];
};

export function getEnergySubjectCenter(subject: EnergySubject): Coordinate {
  if (!subject.geometry) {
    return [subject.lng, subject.lat];
  }

  return getGeometryCenter(subject.geometry);
}

export function getGeometryCenter(geometry: SubjectGeometry): Coordinate {
  if (geometry.type === "Point") {
    return geometry.coordinates;
  }

  const positions = flattenGeometryCoordinates(geometry);
  const total = positions.reduce(
    (sum, position) => ({
      lng: sum.lng + position[0],
      lat: sum.lat + position[1],
    }),
    { lng: 0, lat: 0 },
  );

  return [total.lng / positions.length, total.lat / positions.length];
}

export function createEnergySubjectFeatureCollection(
  subjects: EnergySubject[],
  comparisons: EnergyComparison[],
  selectedSubjectId: string,
): EnergySubjectFeatureCollection {
  return {
    type: "FeatureCollection",
    features: subjects.map((subject) => {
      const comparison = comparisons.find((item) => item.subjectId === subject.id);
      return {
        type: "Feature",
        geometry: subject.geometry
          ? {
              type: subject.geometry.type,
              coordinates: subject.geometry.coordinates,
            }
          : {
              type: "Point",
              coordinates: [subject.lng, subject.lat],
            },
        properties: {
          id: subject.id,
          name: subject.name,
          shortName: subject.shortName,
          type: subject.type,
          status: comparison?.status ?? "neutral",
          deltaKwh: comparison?.deltaKwh ?? 0,
          selected: subject.id === selectedSubjectId,
          officialCode: subject.officialCode,
        },
      };
    }),
  };
}

function flattenGeometryCoordinates(geometry: SubjectGeometry): Coordinate[] {
  if (geometry.type === "Point") {
    return [geometry.coordinates];
  }

  if (geometry.type === "Polygon") {
    return geometry.coordinates.flat();
  }

  return geometry.coordinates.flat(2);
}
```

- [ ] **Step 5: Run the geometry test and verify it passes**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/geojson.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/features/campus-energy/domain/types.ts src/features/campus-energy/domain/geojson.ts src/features/campus-energy/__tests__/geojson.test.ts
git commit -m "feat: add energy subject geometry model"
```

---

### Task 3: Add feature collection tests for Mapbox data

**Files:**
- Modify: `src/features/campus-energy/__tests__/geojson.test.ts`
- Modify: `src/features/campus-energy/domain/geojson.ts`

- [ ] **Step 1: Add tests for polygon and selected feature properties**

Append to `src/features/campus-energy/__tests__/geojson.test.ts`:

```ts
import { compareEnergy } from "../domain/energy";
import { createEnergySubjectFeatureCollection } from "../domain/geojson";

describe("createEnergySubjectFeatureCollection", () => {
  it("keeps polygon geometry and attaches comparison status", () => {
    const subject: EnergySubject = {
      id: "yu-b04",
      schoolId: "yeungnam",
      campusId: "gyeongsan",
      type: "building",
      name: "Central Library",
      shortName: "B04",
      lng: 128.757416,
      lat: 35.83287,
      officialCode: "B04",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [128.757, 35.832],
            [128.758, 35.832],
            [128.758, 35.833],
            [128.757, 35.833],
            [128.757, 35.832],
          ],
        ],
        geometrySource: {
          kind: "openstreetmap",
          name: "OpenStreetMap",
          url: "https://www.openstreetmap.org/",
        },
        geometryConfidence: "estimated",
      },
    };

    const collection = createEnergySubjectFeatureCollection(
      [subject],
      [
        compareEnergy({
          subjectId: "yu-b04",
          actualKwh: 2100,
          forecastKwh: 2000,
          periodLabel: "2026-W25",
        }),
      ],
      "yu-b04",
    );

    expect(collection.features[0]).toMatchObject({
      geometry: { type: "Polygon" },
      properties: {
        id: "yu-b04",
        status: "overuse",
        selected: true,
        officialCode: "B04",
      },
    });
  });
});
```

- [ ] **Step 2: Run the test**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/geojson.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

Run:

```powershell
git add src/features/campus-energy/__tests__/geojson.test.ts src/features/campus-energy/domain/geojson.ts
git commit -m "test: cover energy subject feature collection"
```

---

### Task 4: Add official Yeungnam building catalog fetcher

**Files:**
- Create: `scripts/fetch-yeungnam-campus-catalog.mjs`
- Generated: `src/features/campus-energy/data/yeungnam-building-catalog.json`

- [ ] **Step 1: Create the catalog fetcher**

Create `scripts/fetch-yeungnam-campus-catalog.mjs`:

```js
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_URL = "https://www.yu.ac.kr/campus_vr-e/vr_eng.php";
const OUTPUT_PATH = path.join(
  "src",
  "features",
  "campus-energy",
  "data",
  "yeungnam-building-catalog.json",
);

const KIND_BY_NAME = [
  [/gate|tower|clock/i, "landmark"],
  [/tennis|baseball|soccer|basketball|arena|gymnasium|field/i, "outdoor"],
  [/pond|water work|filtration/i, "utility"],
  [/dormitory|restaurant|cafeteria|center|hall|building|library|institute|office|museum|school|college|laboratory|auditorium/i, "building"],
];

function htmlToTextLines(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8545;/g, "Ⅱ")
    .replace(/&#8546;/g, "Ⅲ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function classifyKind(name) {
  const match = KIND_BY_NAME.find(([pattern]) => pattern.test(name));
  return match ? match[1] : "building";
}

function slugifyCode(code) {
  return `yu-${code.toLowerCase()}`;
}

const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status}`);
}

const html = await response.text();
const lines = htmlToTextLines(html);
let currentArea = "";
const catalog = [];

for (const line of lines) {
  const areaMatch = line.match(/^Area\s+([A-H])(?:\b|\()/i);
  if (areaMatch) {
    currentArea = areaMatch[1].toUpperCase();
    continue;
  }

  const buildingMatch = line.match(/^([A-H]\d{2})\s+(.+)$/);
  if (!buildingMatch || !currentArea) continue;

  const [, code, rawName] = buildingMatch;
  const name = rawName.replace(/\s+/g, " ").trim();
  catalog.push({
    id: slugifyCode(code),
    schoolId: "yeungnam",
    campusId: code.startsWith("H") ? "daemyeong" : "gyeongsan",
    area: currentArea,
    officialCode: code,
    name,
    shortName: code,
    kind: classifyKind(name),
    sourceUrl: SOURCE_URL,
  });
}

if (catalog.length < 50) {
  throw new Error(`Expected at least 50 official buildings, found ${catalog.length}`);
}

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify({ sourceUrl: SOURCE_URL, generatedAt: new Date().toISOString(), buildings: catalog }, null, 2)}\n`,
);

console.log(`Wrote ${catalog.length} Yeungnam catalog entries to ${OUTPUT_PATH}`);
```

- [ ] **Step 2: Run the catalog fetcher**

Run:

```powershell
node scripts/fetch-yeungnam-campus-catalog.mjs
```

Expected: prints `Wrote` with at least 50 catalog entries and creates `src/features/campus-energy/data/yeungnam-building-catalog.json`.

- [ ] **Step 3: Inspect generated catalog shape**

Run:

```powershell
node -e "const c=require('./src/features/campus-energy/data/yeungnam-building-catalog.json'); console.log(c.buildings.length, c.buildings[0])"
```

Expected: first entry has `id`, `schoolId`, `campusId`, `area`, `officialCode`, `name`, `shortName`, `kind`, and `sourceUrl`.

- [ ] **Step 4: Commit**

Run:

```powershell
git add scripts/fetch-yeungnam-campus-catalog.mjs src/features/campus-energy/data/yeungnam-building-catalog.json
git commit -m "feat: add Yeungnam building catalog"
```

---

### Task 5: Fetch raw Yeungnam OSM building footprints

**Files:**
- Create: `scripts/fetch-yeungnam-osm-buildings.mjs`
- Generated: `data/raw/yeungnam-osm-buildings.geojson`
- Generated: `data/raw/yeungnam-osm-building-review.csv`

- [ ] **Step 1: Create the OSM fetch script**

Create `scripts/fetch-yeungnam-osm-buildings.mjs`:

```js
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OUTPUT_DIR = path.join("data", "raw");
const GEOJSON_OUTPUT = path.join(OUTPUT_DIR, "yeungnam-osm-buildings.geojson");
const REVIEW_OUTPUT = path.join(OUTPUT_DIR, "yeungnam-osm-building-review.csv");
const SOURCE_URL = "https://www.openstreetmap.org/";

const bbox = {
  south: 35.8255,
  west: 128.7465,
  north: 35.8395,
  east: 128.7705,
};

const query = `
[out:json][timeout:60];
(
  way["building"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out geom;
`;

function toFeature(element) {
  if (!element.geometry || element.geometry.length < 4) return null;

  const ring = element.geometry.map((point) => [point.lon, point.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closedRing =
    first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [closedRing],
    },
    properties: {
      osmId: `${element.type}/${element.id}`,
      osmName: element.tags?.name ?? "",
      osmNameEn: element.tags?.["name:en"] ?? "",
      building: element.tags?.building ?? "",
      sourceUrl: SOURCE_URL,
    },
  };
}

const response = await fetch(OVERPASS_URL, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ data: query }),
});

if (!response.ok) {
  throw new Error(`Overpass request failed: ${response.status}`);
}

const data = await response.json();
const features = data.elements.map(toFeature).filter(Boolean);

if (features.length < 30) {
  throw new Error(`Expected at least 30 OSM building footprints, found ${features.length}`);
}

const featureCollection = {
  type: "FeatureCollection",
  sourceUrl: SOURCE_URL,
  bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
  generatedAt: new Date().toISOString(),
  features,
};

const csvLines = [
  "osmId,osmName,osmNameEn,building",
  ...features.map((feature) =>
    [
      feature.properties.osmId,
      JSON.stringify(feature.properties.osmName),
      JSON.stringify(feature.properties.osmNameEn),
      JSON.stringify(feature.properties.building),
    ].join(","),
  ),
];

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(GEOJSON_OUTPUT, `${JSON.stringify(featureCollection, null, 2)}\n`);
await writeFile(REVIEW_OUTPUT, `${csvLines.join("\n")}\n`);

console.log(`Wrote ${features.length} OSM building footprints to ${GEOJSON_OUTPUT}`);
console.log(`Wrote review CSV to ${REVIEW_OUTPUT}`);
```

- [ ] **Step 2: Run the OSM fetch script**

Run:

```powershell
node scripts/fetch-yeungnam-osm-buildings.mjs
```

Expected: creates `data/raw/yeungnam-osm-buildings.geojson` with at least 30 features and `data/raw/yeungnam-osm-building-review.csv`.

- [ ] **Step 3: Commit**

Run:

```powershell
git add scripts/fetch-yeungnam-osm-buildings.mjs data/raw/yeungnam-osm-buildings.geojson data/raw/yeungnam-osm-building-review.csv
git commit -m "chore: fetch Yeungnam OSM building footprints"
```

---

### Task 6: Add reviewed building matching inputs

**Files:**
- Create: `data/raw/yeungnam-building-matches.json`
- Create: `data/raw/yeungnam-manual-building-geometries.geojson`

- [ ] **Step 1: Create an initial match file**

Create `data/raw/yeungnam-building-matches.json`:

```json
{
  "source": {
    "officialCatalog": "src/features/campus-energy/data/yeungnam-building-catalog.json",
    "osmFootprints": "data/raw/yeungnam-osm-buildings.geojson",
    "manualFootprints": "data/raw/yeungnam-manual-building-geometries.geojson"
  },
  "matches": {}
}
```

- [ ] **Step 2: Create an empty manual geometry file**

Create `data/raw/yeungnam-manual-building-geometries.geojson`:

```json
{
  "type": "FeatureCollection",
  "features": []
}
```

- [ ] **Step 3: Fill matches by reviewing official codes against OSM footprints**

Open `data/raw/yeungnam-osm-building-review.csv` and the official campus map in a browser. Add one match per official code in `data/raw/yeungnam-building-matches.json` using this exact shape:

```json
{
  "source": {
    "officialCatalog": "src/features/campus-energy/data/yeungnam-building-catalog.json",
    "osmFootprints": "data/raw/yeungnam-osm-buildings.geojson",
    "manualFootprints": "data/raw/yeungnam-manual-building-geometries.geojson"
  },
  "matches": {
    "B04": {
      "featureId": "way/123456789",
      "source": "openstreetmap",
      "confidence": "estimated"
    }
  }
}
```

Expected: every official building that should be an energy subject has one `matches` entry. Outdoor-only entries such as tennis courts and soccer fields can remain unmatched until they are explicitly needed as energy subjects.

- [ ] **Step 4: Commit**

Run:

```powershell
git add data/raw/yeungnam-building-matches.json data/raw/yeungnam-manual-building-geometries.geojson
git commit -m "chore: add Yeungnam building match inputs"
```

---

### Task 7: Build app-ready Yeungnam geometry JSON

**Files:**
- Create: `scripts/build-yeungnam-building-geometries.mjs`
- Generated: `src/features/campus-energy/data/yeungnam-building-geometries.json`
- Generated: `data/raw/yeungnam-building-mapping-report.json`

- [ ] **Step 1: Create the geometry builder**

Create `scripts/build-yeungnam-building-geometries.mjs`:

```js
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const catalogPath = path.join("src", "features", "campus-energy", "data", "yeungnam-building-catalog.json");
const osmPath = path.join("data", "raw", "yeungnam-osm-buildings.geojson");
const manualPath = path.join("data", "raw", "yeungnam-manual-building-geometries.geojson");
const matchesPath = path.join("data", "raw", "yeungnam-building-matches.json");
const outputPath = path.join("src", "features", "campus-energy", "data", "yeungnam-building-geometries.json");
const reportPath = path.join("data", "raw", "yeungnam-building-mapping-report.json");

const ENERGY_SUBJECT_KINDS = new Set(["building", "utility"]);

function readJson(filePath) {
  return readFile(filePath, "utf8").then(JSON.parse);
}

function getFeatureId(feature) {
  return feature.properties?.osmId ?? feature.properties?.manualId;
}

function toSubjectId(code) {
  return `yu-${code.toLowerCase()}`;
}

const [catalog, osm, manual, matchData] = await Promise.all([
  readJson(catalogPath),
  readJson(osmPath),
  readJson(manualPath),
  readJson(matchesPath),
]);

const featuresById = new Map(
  [...osm.features, ...manual.features].map((feature) => [getFeatureId(feature), feature]),
);

const outputFeatures = [];
const missing = [];
const unmatchedFeatureIds = new Set(featuresById.keys());

for (const building of catalog.buildings) {
  if (!ENERGY_SUBJECT_KINDS.has(building.kind)) continue;

  const match = matchData.matches[building.officialCode];
  if (!match) {
    missing.push({
      officialCode: building.officialCode,
      name: building.name,
      reason: "no-reviewed-match",
    });
    continue;
  }

  const feature = featuresById.get(match.featureId);
  if (!feature) {
    missing.push({
      officialCode: building.officialCode,
      name: building.name,
      reason: `missing-feature:${match.featureId}`,
    });
    continue;
  }

  unmatchedFeatureIds.delete(match.featureId);

  outputFeatures.push({
    type: "Feature",
    geometry: feature.geometry,
    properties: {
      subjectId: toSubjectId(building.officialCode),
      officialCode: building.officialCode,
      name: building.name,
      shortName: building.shortName,
      schoolId: building.schoolId,
      campusId: building.campusId,
      geometrySource: {
        kind: match.source,
        name: match.source === "openstreetmap" ? "OpenStreetMap" : "Manual campus mapping",
        url: match.source === "openstreetmap" ? "https://www.openstreetmap.org/" : undefined,
      },
      geometryConfidence: match.confidence,
    },
  });
}

const output = {
  type: "FeatureCollection",
  generatedAt: new Date().toISOString(),
  features: outputFeatures,
};

const report = {
  generatedAt: output.generatedAt,
  mappedCount: outputFeatures.length,
  missingCount: missing.length,
  missing,
  unmatchedFeatureIds: [...unmatchedFeatureIds].sort(),
};

await mkdir(path.dirname(outputPath), { recursive: true });
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Mapped ${report.mappedCount} Yeungnam building geometries`);
console.log(`Missing ${report.missingCount} reviewed building geometries`);

if (process.argv.includes("--strict") && report.missingCount > 0) {
  throw new Error(`Missing ${report.missingCount} Yeungnam building geometries`);
}
```

- [ ] **Step 2: Run the builder in non-strict mode**

Run:

```powershell
node scripts/build-yeungnam-building-geometries.mjs
```

Expected: creates `src/features/campus-energy/data/yeungnam-building-geometries.json` and `data/raw/yeungnam-building-mapping-report.json`.

- [ ] **Step 3: Complete match review until strict mode passes**

Run:

```powershell
node scripts/build-yeungnam-building-geometries.mjs --strict
```

Expected: PASS only after every `building` and `utility` catalog entry that should be an energy subject has reviewed geometry.

- [ ] **Step 4: Commit**

Run:

```powershell
git add scripts/build-yeungnam-building-geometries.mjs src/features/campus-energy/data/yeungnam-building-geometries.json data/raw/yeungnam-building-mapping-report.json data/raw/yeungnam-building-matches.json data/raw/yeungnam-manual-building-geometries.geojson
git commit -m "feat: add Yeungnam building geometries"
```

---

### Task 8: Convert Yeungnam catalog and geometry into energy subjects

**Files:**
- Create: `src/features/campus-energy/data/yeungnam-buildings.ts`
- Modify: `src/features/campus-energy/__tests__/energy.test.ts`

- [ ] **Step 1: Add failing data validation tests**

Append to `src/features/campus-energy/__tests__/energy.test.ts`:

```ts
import { yeungnamBuildingSubjects } from "../data/yeungnam-buildings";

describe("Yeungnam building geometry data", () => {
  it("creates a subject for every mapped Yeungnam building geometry", () => {
    expect(yeungnamBuildingSubjects.length).toBeGreaterThan(30);
    expect(
      yeungnamBuildingSubjects.every(
        (subject) => subject.type === "building" && subject.geometry,
      ),
    ).toBe(true);
  });

  it("keeps official codes unique", () => {
    const codes = yeungnamBuildingSubjects.map((subject) => subject.officialCode);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/energy.test.ts
```

Expected: FAIL because `src/features/campus-energy/data/yeungnam-buildings.ts` does not exist.

- [ ] **Step 3: Create Yeungnam building subject adapter**

Create `src/features/campus-energy/data/yeungnam-buildings.ts`:

```ts
import catalogJson from "./yeungnam-building-catalog.json";
import geometryJson from "./yeungnam-building-geometries.json";
import { getGeometryCenter } from "../domain/geojson";
import type { EnergySubject, SubjectGeometry } from "../domain/types";

type CatalogBuilding = {
  id: string;
  schoolId: string;
  campusId: string;
  officialCode: string;
  name: string;
  shortName: string;
  kind: string;
};

type GeometryFeature = {
  type: "Feature";
  geometry: Pick<SubjectGeometry, "type" | "coordinates">;
  properties: {
    subjectId: string;
    officialCode: string;
    geometrySource: SubjectGeometry["geometrySource"];
    geometryConfidence: SubjectGeometry["geometryConfidence"];
  };
};

const catalogByCode = new Map(
  (catalogJson.buildings as CatalogBuilding[]).map((building) => [
    building.officialCode,
    building,
  ]),
);

export const yeungnamBuildingSubjects: EnergySubject[] =
  (geometryJson.features as GeometryFeature[]).map((feature) => {
    const catalogItem = catalogByCode.get(feature.properties.officialCode);
    if (!catalogItem) {
      throw new Error(
        `Unknown Yeungnam official code: ${feature.properties.officialCode}`,
      );
    }

    const geometry = {
      ...feature.geometry,
      geometrySource: feature.properties.geometrySource,
      geometryConfidence: feature.properties.geometryConfidence,
    } as SubjectGeometry;
    const [lng, lat] = getGeometryCenter(geometry);

    return {
      id: feature.properties.subjectId,
      schoolId: catalogItem.schoolId,
      campusId: catalogItem.campusId,
      type: "building",
      name: catalogItem.name,
      shortName: catalogItem.shortName,
      lng,
      lat,
      geometry,
      officialCode: catalogItem.officialCode,
    };
  });
```

- [ ] **Step 4: Run the tests and verify they pass**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/energy.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/features/campus-energy/data/yeungnam-buildings.ts src/features/campus-energy/__tests__/energy.test.ts
git commit -m "feat: create Yeungnam building subjects from geometry"
```

---

### Task 9: Use generated Yeungnam subjects in demo data

**Files:**
- Modify: `src/features/campus-energy/data/demo-campus.ts`
- Modify: `src/features/campus-energy/data/localized-demo-campus.ts`
- Modify: `src/features/campus-energy/__tests__/localized-demo-campus.test.ts`

- [ ] **Step 1: Update demo data imports and readings**

Modify `src/features/campus-energy/data/demo-campus.ts`:

```ts
import { compareEnergy } from "../domain/energy";
import { rankSubjects } from "../domain/scoring";
import type {
  AffiliationGroup,
  EnergyReading,
  EnergySubject,
  ParticipantProfile,
  School,
} from "../domain/types";
import { yeungnamBuildingSubjects } from "./yeungnam-buildings";
```

Replace the current `demoSubjects` export with:

```ts
const demoGroupByOfficialCode = new Map<string, string>([
  ["E21", "engineering"],
  ["E22", "engineering"],
  ["E23", "engineering"],
  ["E24", "engineering"],
  ["E29", "engineering"],
  ["B03", "humanities"],
  ["B04", "student-services"],
]);

export const demoSubjects: EnergySubject[] = yeungnamBuildingSubjects.map(
  (subject) => ({
    ...subject,
    groupId: subject.officialCode
      ? demoGroupByOfficialCode.get(subject.officialCode)
      : undefined,
  }),
);
```

Replace the current `demoEnergyReadings` export with readings that use official codes from the generated subjects:

```ts
export const demoEnergyReadings: EnergyReading[] = [
  {
    subjectId: "yu-e21",
    actualKwh: 1360,
    forecastKwh: 1500,
    periodLabel: "2026-W25",
  },
  {
    subjectId: "yu-e29",
    actualKwh: 1710,
    forecastKwh: 1600,
    periodLabel: "2026-W25",
  },
  {
    subjectId: "yu-b03",
    actualKwh: 980,
    forecastKwh: 1120,
    periodLabel: "2026-W25",
  },
  {
    subjectId: "yu-b04",
    actualKwh: 2140,
    forecastKwh: 2050,
    periodLabel: "2026-W25",
  },
];
```

- [ ] **Step 2: Make localization tolerate unmapped message keys**

Modify the `subjects` mapping inside `src/features/campus-energy/data/localized-demo-campus.ts`:

```ts
    subjects: demoSubjects.map((subject) => {
      const localized =
        messages.demo.subjects[
          subject.id as keyof typeof messages.demo.subjects
        ];

      return {
        ...subject,
        name: localized?.name ?? subject.name,
        shortName: localized?.shortName ?? subject.shortName,
      };
    }),
```

- [ ] **Step 3: Update localized tests for the new seed IDs**

Modify the first test in `src/features/campus-energy/__tests__/localized-demo-campus.test.ts`:

```ts
  it("uses Korean names for subjects that have explicit message entries", () => {
    const localized = localizeDemoCampus(koMessages);

    expect(localized.school.name).toBe("영남대학교");
    expect(
      localized.subjects.find((subject) => subject.id === "yu-e21")?.name,
    ).toBeTruthy();
    expect(
      localized.groups.find((group) => group.id === "engineering")?.name,
    ).toBe("공과대학");
  });
```

- [ ] **Step 4: Run targeted tests**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/energy.test.ts src/features/campus-energy/__tests__/localized-demo-campus.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/features/campus-energy/data/demo-campus.ts src/features/campus-energy/data/localized-demo-campus.ts src/features/campus-energy/__tests__/localized-demo-campus.test.ts
git commit -m "feat: use Yeungnam building subjects in demo data"
```

---

### Task 10: Render polygons and points in the Mapbox component

**Files:**
- Modify: `src/features/campus-energy/components/campus-map.tsx`

- [ ] **Step 1: Replace local feature collection creation**

Modify imports in `src/features/campus-energy/components/campus-map.tsx`:

```ts
import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef } from "react";
import { useI18n } from "@/i18n/client";
import {
  createEnergySubjectFeatureCollection,
  getEnergySubjectCenter,
} from "../domain/geojson";
import type { EnergyComparison, EnergySubject, School } from "../domain/types";
```

Replace the existing `featureCollection` `useMemo` with:

```ts
  const featureCollection = useMemo(
    () =>
      createEnergySubjectFeatureCollection(
        subjects,
        comparisons,
        selectedSubjectId,
      ),
    [comparisons, selectedSubjectId, subjects],
  );
```

- [ ] **Step 2: Add polygon, line, point, and label layers**

Inside `map.on("load", () => { ... })`, replace the current `map.addLayer` calls with:

```ts
      map.addLayer({
        id: "energy-subject-fills",
        type: "fill",
        source: "energy-subjects",
        filter: [
          "any",
          ["==", ["geometry-type"], "Polygon"],
          ["==", ["geometry-type"], "MultiPolygon"],
        ],
        paint: {
          "fill-color": [
            "match",
            ["get", "status"],
            "saving",
            "#059669",
            "overuse",
            "#e11d48",
            "#64748b",
          ],
          "fill-opacity": ["case", ["get", "selected"], 0.72, 0.42],
        },
      });
      map.addLayer({
        id: "energy-subject-outlines",
        type: "line",
        source: "energy-subjects",
        filter: [
          "any",
          ["==", ["geometry-type"], "Polygon"],
          ["==", ["geometry-type"], "MultiPolygon"],
        ],
        paint: {
          "line-color": ["case", ["get", "selected"], "#0f172a", "#ffffff"],
          "line-width": ["case", ["get", "selected"], 3, 1.25],
          "line-opacity": 0.92,
        },
      });
      map.addLayer({
        id: "energy-subject-circles",
        type: "circle",
        source: "energy-subjects",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 4, 17, 14],
          "circle-color": [
            "match",
            ["get", "status"],
            "saving",
            "#059669",
            "overuse",
            "#e11d48",
            "#64748b",
          ],
          "circle-opacity": 0.78,
          "circle-stroke-color": ["case", ["get", "selected"], "#0f172a", "#ffffff"],
          "circle-stroke-width": ["case", ["get", "selected"], 3, 2],
        },
      });
      map.addLayer({
        id: "energy-subject-labels",
        type: "symbol",
        source: "energy-subjects",
        minzoom: 15,
        layout: {
          "text-field": ["coalesce", ["get", "officialCode"], ["get", "shortName"]],
          "text-size": 12,
          "text-offset": [0, 0.9],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.25,
        },
      });
```

- [ ] **Step 3: Add click and cursor handlers for both geometry layer types**

Replace the current click and cursor handlers with:

```ts
      const interactiveLayers = [
        "energy-subject-fills",
        "energy-subject-circles",
      ];

      interactiveLayers.forEach((layerId) => {
        map.on("click", layerId, (event) => {
          const id = getFeatureStringProperty(event.features?.[0], "id");
          if (id) onSelectSubject(id);
        });
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      });
```

- [ ] **Step 4: Fly to geometry center**

Replace the selected subject `flyTo` center:

```ts
    mapRef.current.flyTo({
      center: getEnergySubjectCenter(selectedSubject),
      zoom: selectedSubject.geometry?.type === "Point" ? 16.4 : 16.8,
      pitch: school.pitch,
      essential: true,
    });
```

- [ ] **Step 5: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/features/campus-energy/components/campus-map.tsx
git commit -m "feat: render energy subject polygons on Mapbox"
```

---

### Task 11: Update docs for extensible mapping

**Files:**
- Modify: `docs/product/campus-energy-platform.md`
- Modify: `docs/technical/campus-energy-mvp.md`

- [ ] **Step 1: Append product mapping direction**

Append to `docs/product/campus-energy-platform.md`:

```md
## Spatial Subject Hierarchy

The map model should support multiple geographic scales:

- region
- school
- campus
- building

Yeungnam University starts at building scale because it is the first concrete demo school. Regional elementary and middle school maps can start at school-point scale using public location datasets, then add building polygons only for schools that need detailed energy analysis.

All spatial targets should keep a stable `subjectId`. Geometry and energy readings are separate data sources connected through that ID.
```

- [ ] **Step 2: Append technical mapping notes**

Append to `docs/technical/campus-energy-mvp.md`:

```md
## Yeungnam Building Mapping

The Yeungnam building map uses three data layers:

- official Yeungnam campus building catalog from `https://www.yu.ac.kr/campus_vr-e/vr_eng.php`
- OSM building footprints fetched into `data/raw/yeungnam-osm-buildings.geojson`
- reviewed matches in `data/raw/yeungnam-building-matches.json`

Generated app data lives in:

- `src/features/campus-energy/data/yeungnam-building-catalog.json`
- `src/features/campus-energy/data/yeungnam-building-geometries.json`

Regenerate the map data with:

```powershell
node scripts/fetch-yeungnam-campus-catalog.mjs
node scripts/fetch-yeungnam-osm-buildings.mjs
node scripts/build-yeungnam-building-geometries.mjs --strict
```
```

- [ ] **Step 3: Commit**

Run:

```powershell
git add docs/product/campus-energy-platform.md docs/technical/campus-energy-mvp.md
git commit -m "docs: document extensible campus mapping"
```

---

### Task 12: Final verification

**Files:**
- Verify the whole repository.

- [ ] **Step 1: Run all tests**

Run:

```powershell
npm run test
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 4: Check whitespace**

Run:

```powershell
git diff --check
```

Expected: no output.

- [ ] **Step 5: Run the app and visually inspect the map**

Run:

```powershell
npm run dev
```

Expected: app starts successfully. With `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` set in `.env.local`, `/ko` shows Yeungnam building polygons with status colors. Without the token, the existing missing-token fallback appears.

- [ ] **Step 6: Commit any verification-only docs changes**

If verification changes docs, run:

```powershell
git add docs/product/campus-energy-platform.md docs/technical/campus-energy-mvp.md
git commit -m "docs: update mapping verification notes"
```

Expected: skip this commit when no files changed.

---

## Scope Notes

- This plan maps Yeungnam University buildings first.
- It prepares the geometry model for regional elementary and middle school point maps.
- It does not add a database, authentication, real electricity ingestion, or an ML forecast pipeline.
- It does not require all regional schools now; those come after Yeungnam building geometry proves the map pipeline.

## Self-Review

- Spec coverage: the plan covers extensible subject geometry, Yeungnam official building catalog acquisition, OSM footprint acquisition, reviewed matching, Mapbox polygon rendering, and docs.
- Placeholder scan: no deferred labels or empty work markers remain.
- Type consistency: `SubjectGeometry`, `GeometrySource`, `GeometryConfidence`, `officialCode`, `createEnergySubjectFeatureCollection`, and `getEnergySubjectCenter` are defined before use.
