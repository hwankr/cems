# Yeungnam Campus Map Complete Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register every Yeungnam University campus-map entry that has official coordinates so all mappable buildings and campus places appear in the app data.

**Architecture:** Treat the official Yeungnam campus-map page as the canonical location source, because its embedded `campusList` has GPS values for every listed entry. Keep existing OSM/manual polygon geometry when it is already reviewed, and add official campus-map Point geometry as the fallback for every remaining catalog entry. Keep `EnergySubject` as the app identity and allow subjects with no official building code by keying geometry with `subjectId`.

**Tech Stack:** Next.js 16.2.9, React 19.2.4, TypeScript, Mapbox GL JS, Vitest, Node.js ESM scripts, GeoJSON.

---

## Verified Source Baseline

- Korean official campus map: `https://www.yu.ac.kr/main/intro/campus-map.do`
- English official campus map: `https://www.yu.ac.kr/english/about/campus-map.do`
- Current app catalog: `src/features/campus-energy/data/yeungnam-building-catalog.json`
- Current app geometry: `src/features/campus-energy/data/yeungnam-building-geometries.json`

Observed on 2026-06-22:

- Korean official `campusList`: 121 entries, 121 entries with `bGPS`.
- English official `campusList`: 120 entries, 120 entries with `bGPS`, 120 entries with `bEngName`.
- Current app catalog: 101 entries.
- Current app geometry: 48 polygon features.
- Current app real buildings: 86 building entries, 45 with geometry, 41 without geometry.

Important data differences:

- The official page adds 23 entries not in the current catalog.
- Some official `기타` entries have no `bNo`; they still have stable `@UUID@`, name, campus, area, and GPS.
- The official page includes Daegu campus H-zone entries. Keep their `campusId` as `daemyeong`; keep Gyeongsan entries as `gyeongsan`.
- Current catalog entries absent from the official page are legacy VR-source entries and should not block strict official-map completeness.

## Target File Structure

- Modify: `scripts/fetch-yeungnam-campus-catalog.mjs`
  - Parse official campus-map `campusList` from Korean and English pages.
  - Generate 121 active catalog entries.
  - Preserve existing English names when available from the English page or legacy VR catalog.
  - Support entries with no `officialCode` by generating stable ids from official UUID/name/GPS.
- Modify: `scripts/build-yeungnam-building-geometries.mjs`
  - Keep source priority: manual geometry, OSM polygon geometry, official campus-map point geometry.
  - Emit one geometry feature per active catalog entry.
  - Report point fallbacks and legacy excluded entries.
- Modify: `src/features/campus-energy/data/yeungnam-buildings.ts`
  - Accept optional `officialCode`.
  - Match geometry by `subjectId` first, then by `officialCode`.
  - Load code-less official places as subjects.
- Modify: `src/features/campus-energy/domain/types.ts`
  - Add optional source metadata only if needed by the adapter.
- Modify: `src/features/campus-energy/__tests__/energy.test.ts`
  - Add regression coverage for 121 official entries, complete geometry coverage, and code-less entries.
- Modify: `src/features/campus-energy/__tests__/geojson.test.ts`
  - Add point fallback coverage for official campus-map geometries.
- Modify: `docs/technical/campus-energy-mvp.md`
  - Document the official campus-map source and regeneration commands.

---

### Task 1: Add Official Campus-Map Parser Tests

**Files:**
- Create: `src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts`
- Modify: `scripts/fetch-yeungnam-campus-catalog.mjs`

- [ ] **Step 1: Write the failing parser test**

Create `src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildOfficialCampusCatalog,
  parseOfficialCampusMapHtml,
} from "../../../../scripts/fetch-yeungnam-campus-catalog.mjs";

const koHtml = `
<script>
  var campusList = [{
    "cName": "경산캠퍼스",
    "dList": [{
      "dName": "A구역",
      "dClassName": "area-a",
      "bList": [{
        "bNo": "A06",
        "bName": "예술대학 디자인관",
        "bGPS": "128.75724314289113,35.83515409112729",
        "bUse": "사무실,실기실,강의실",
        "@UUID@": "a06-ko"
      }]
    }, {
      "dName": "기타",
      "dClassName": "area-etc",
      "bList": [{
        "bName": "천마아너스파크",
        "bGPS": "128.7601738129029,35.8308105775303",
        "bUse": "체육시설",
        "@UUID@": "dd73bbe1-4438-4641-8a35-b5f03d701f4a"
      }]
    }]
  }];
  var gateList = [];
</script>`;

const enHtml = `
<script>
  var campusList = [{
    "cName": "Gyeongsan Campus",
    "dList": [{
      "dName": "Area A",
      "dClassName": "area-a",
      "bList": [{
        "bNo": "A06",
        "bName": "예술대학 디자인관",
        "bEngName": "College of Arts-Design Building",
        "bGPS": "128.75724314289113,35.83515409112729",
        "@UUID@": "a06-en"
      }]
    }]
  }];
  var gateList = [];
</script>`;

describe("official Yeungnam campus-map parser", () => {
  it("extracts coded and code-less entries with GPS", () => {
    const entries = parseOfficialCampusMapHtml(koHtml, "ko");

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      officialCode: "A06",
      nameKo: "예술대학 디자인관",
      gps: [128.75724314289113, 35.83515409112729],
      campusId: "gyeongsan",
    });
    expect(entries[1]).toMatchObject({
      officialCode: undefined,
      nameKo: "천마아너스파크",
      gps: [128.7601738129029, 35.8308105775303],
      campusId: "gyeongsan",
    });
  });

  it("builds stable subject ids and merges English names", () => {
    const catalog = buildOfficialCampusCatalog({
      koEntries: parseOfficialCampusMapHtml(koHtml, "ko"),
      enEntries: parseOfficialCampusMapHtml(enHtml, "en"),
      capturedAt: "2026-06-22T00:00:00.000Z",
    });

    expect(catalog.buildings).toHaveLength(2);
    expect(catalog.buildings[0]).toMatchObject({
      id: "yu-a06",
      officialCode: "A06",
      nameKo: "예술대학 디자인관",
      nameEn: "College of Arts-Design Building",
      shortName: "A06",
      kind: "building",
    });
    expect(catalog.buildings[1]).toMatchObject({
      id: "yu-official-dd73bbe1",
      nameKo: "천마아너스파크",
      shortName: "천마아너스파크",
      kind: "outdoor",
    });
    expect(catalog.buildings[1].officialCode).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts
```

Expected: FAIL because `parseOfficialCampusMapHtml` and `buildOfficialCampusCatalog` are not exported yet.

- [ ] **Step 3: Export parser placeholders that still fail the assertions**

Add these exports near the top of `scripts/fetch-yeungnam-campus-catalog.mjs`:

```js
export function parseOfficialCampusMapHtml() {
  return [];
}

export function buildOfficialCampusCatalog({ capturedAt }) {
  return {
    metadata: {
      schoolId: "yeungnam",
      generatedAt: capturedAt,
      sourceUrls: [],
    },
    buildings: [],
  };
}
```

- [ ] **Step 4: Run the test and verify assertion failures are specific**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts
```

Expected: FAIL with length mismatch, proving the test imports the script correctly.

- [ ] **Step 5: Commit the failing test only if working in a TDD branch**

Run:

```powershell
git add src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts scripts/fetch-yeungnam-campus-catalog.mjs
git commit -m "test: cover official Yeungnam campus map parsing"
```

Expected: commit succeeds in a feature branch. If executing inline without intermediate commits, keep changes unstaged until Task 2 passes.

---

### Task 2: Rewrite Catalog Generation Around Official Campus-Map Data

**Files:**
- Modify: `scripts/fetch-yeungnam-campus-catalog.mjs`
- Generated: `src/features/campus-energy/data/yeungnam-building-catalog.json`

- [ ] **Step 1: Replace source constants**

In `scripts/fetch-yeungnam-campus-catalog.mjs`, replace the current VR source constants with:

```js
export const KOREAN_CAMPUS_MAP_URL =
  "https://www.yu.ac.kr/main/intro/campus-map.do";
export const ENGLISH_CAMPUS_MAP_URL =
  "https://www.yu.ac.kr/english/about/campus-map.do";
export const LEGACY_KOREAN_CATALOG_URL = "https://www.yu.ac.kr/campus_vr-k/vr.php";
export const LEGACY_ENGLISH_CATALOG_URL =
  "https://www.yu.ac.kr/campus_vr-e/vr_eng.php";
```

- [ ] **Step 2: Implement official `campusList` extraction**

Add this implementation to `scripts/fetch-yeungnam-campus-catalog.mjs`:

```js
function extractCampusListJson(html) {
  const startToken = "var campusList = ";
  const start = html.indexOf(startToken);

  if (start < 0) {
    throw new Error("Official Yeungnam campus map did not contain campusList.");
  }

  const jsonStart = start + startToken.length;
  const end = html.indexOf(";\n\tvar gateList", jsonStart);

  if (end < 0) {
    throw new Error("Official Yeungnam campus map did not contain gateList after campusList.");
  }

  return JSON.parse(html.slice(jsonStart, end));
}

function parseGps(value, context) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing bGPS for official Yeungnam campus-map entry: ${context}`);
  }

  const [lngText, latText] = value.split(",");
  const lng = Number(lngText);
  const lat = Number(latText);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new Error(`Invalid bGPS for official Yeungnam campus-map entry: ${context}`);
  }

  return [lng, lat];
}

function campusIdFromName(campusName) {
  return String(campusName).includes("대구") ||
    String(campusName).toLowerCase().includes("daegu")
    ? "daemyeong"
    : "gyeongsan";
}

function areaFromName(areaName, officialCode) {
  const codeArea = officialCode?.match(/^[A-Z]/)?.[0];
  const nameArea = String(areaName).match(/[A-H]/)?.[0];
  return codeArea ?? nameArea ?? "ETC";
}

function stableIdForOfficialEntry(entry) {
  if (entry.officialCode) {
    return `yu-${entry.officialCode.toLowerCase()}`;
  }

  return `yu-official-${entry.officialMapUuid.slice(0, 8).toLowerCase()}`;
}

function classifyOfficialEntry(entry) {
  const code = entry.officialCode;
  const haystack = `${entry.nameKo ?? ""} ${entry.nameEn ?? ""}`.toLowerCase();

  if (code && new Set(["A01", "G41", "G42", "G43", "G44", "G45", "G46", "G47", "G48", "G49"]).has(code)) {
    return "landmark";
  }

  if (/gate|square|clock|park|pond|못|공원|시계탑|천마로/.test(haystack)) {
    return "landmark";
  }

  if (/tennis|baseball|soccer|basketball|field|gymnasium|테니스|야구장|축구장|농구장|체육/.test(haystack)) {
    return "outdoor";
  }

  if (/water|filtration|상수도|여과지/.test(haystack)) {
    return "utility";
  }

  return "building";
}

export function parseOfficialCampusMapHtml(html, locale) {
  return extractCampusListJson(html).flatMap((campus) =>
    (campus.dList ?? []).flatMap((district) =>
      (district.bList ?? []).map((building) => {
        const officialCode =
          typeof building.bNo === "string" && building.bNo.trim()
            ? building.bNo.trim().toUpperCase()
            : undefined;
        const nameKo = typeof building.bName === "string" ? building.bName.trim() : "";
        const nameEn =
          typeof building.bEngName === "string" && building.bEngName.trim()
            ? building.bEngName.trim()
            : undefined;
        const officialMapUuid =
          typeof building["@UUID@"] === "string" && building["@UUID@"].trim()
            ? building["@UUID@"].trim()
            : `${officialCode ?? nameKo}-${building.bGPS}`;

        return {
          officialCode,
          officialMapUuid,
          campusId: campusIdFromName(campus.cName),
          campusName: campus.cName,
          area: areaFromName(district.dName, officialCode),
          areaName: district.dName,
          nameKo,
          ...(nameEn ? { nameEn } : {}),
          gps: parseGps(building.bGPS, officialCode ?? nameKo),
          sourceUse: building.bUse ?? "",
          locale,
        };
      }),
    ),
  );
}
```

- [ ] **Step 3: Implement Korean and English merge**

Add this implementation:

```js
function entryKey(entry) {
  if (entry.officialCode) {
    return `code:${entry.officialCode}`;
  }

  return `uuid:${entry.officialMapUuid}`;
}

function findEnglishEntry(koEntry, englishByKey, englishByGps) {
  return (
    englishByKey.get(entryKey(koEntry)) ??
    englishByGps.get(`${koEntry.gps[0]},${koEntry.gps[1]}`)
  );
}

export function buildOfficialCampusCatalog({ koEntries, enEntries, capturedAt }) {
  const englishByKey = new Map(enEntries.map((entry) => [entryKey(entry), entry]));
  const englishByGps = new Map(
    enEntries.map((entry) => [`${entry.gps[0]},${entry.gps[1]}`, entry]),
  );

  const buildings = koEntries
    .map((koEntry) => {
      const enEntry = findEnglishEntry(koEntry, englishByKey, englishByGps);
      const nameEn = enEntry?.nameEn;
      const id = stableIdForOfficialEntry(koEntry);
      const base = {
        id,
        schoolId: "yeungnam",
        campusId: koEntry.campusId,
        area: koEntry.area,
        officialMapUuid: koEntry.officialMapUuid,
        name: nameEn ?? koEntry.nameKo,
        nameKo: koEntry.nameKo,
        shortName: koEntry.officialCode ?? koEntry.nameKo,
        kind: classifyOfficialEntry({ ...koEntry, nameEn }),
        sourceUrl: KOREAN_CAMPUS_MAP_URL,
        sourceUrls: [KOREAN_CAMPUS_MAP_URL, ENGLISH_CAMPUS_MAP_URL],
        officialPoint: {
          type: "Point",
          coordinates: koEntry.gps,
          geometrySource: {
            kind: "official-campus-map",
            name: "Yeungnam University campus map",
            url: KOREAN_CAMPUS_MAP_URL,
            capturedAt,
          },
          geometryConfidence: "verified",
        },
      };

      return {
        ...base,
        ...(koEntry.officialCode ? { officialCode: koEntry.officialCode } : {}),
        ...(nameEn ? { nameEn } : {}),
      };
    })
    .sort((left, right) =>
      left.area.localeCompare(right.area, "en", { numeric: true }) ||
      left.shortName.localeCompare(right.shortName, "ko", { numeric: true }),
    );

  return {
    metadata: {
      schoolId: "yeungnam",
      generatedAt: capturedAt,
      sourceUrls: [KOREAN_CAMPUS_MAP_URL, ENGLISH_CAMPUS_MAP_URL],
      koreanEntryCount: koEntries.length,
      englishEntryCount: enEntries.length,
      officialGpsEntryCount: buildings.filter((building) => building.officialPoint).length,
    },
    buildings,
  };
}
```

- [ ] **Step 4: Update `generateCatalog`**

Replace `generateCatalog` with:

```js
export async function generateCatalog() {
  const capturedAt = new Date().toISOString();
  const [koHtml, enHtml] = await Promise.all([
    fetchText(KOREAN_CAMPUS_MAP_URL),
    fetchText(ENGLISH_CAMPUS_MAP_URL),
  ]);
  const koEntries = parseOfficialCampusMapHtml(koHtml, "ko");
  const enEntries = parseOfficialCampusMapHtml(enHtml, "en");
  const catalog = buildOfficialCampusCatalog({ koEntries, enEntries, capturedAt });

  if (catalog.buildings.length < 120) {
    throw new Error(
      `Expected at least 120 official Yeungnam campus-map entries, found ${catalog.buildings.length}`,
    );
  }

  const missingGps = catalog.buildings.filter((building) => !building.officialPoint);
  if (missingGps.length > 0) {
    throw new Error(
      `Expected every official Yeungnam campus-map entry to have GPS, missing ${missingGps.length}`,
    );
  }

  return catalog;
}
```

- [ ] **Step 5: Run parser tests**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts
```

Expected: PASS.

- [ ] **Step 6: Regenerate catalog**

Run:

```powershell
node scripts/fetch-yeungnam-campus-catalog.mjs
```

Expected: prints `Wrote 121 catalog entries` or a larger number if the official source changed after this plan was written.

- [ ] **Step 7: Verify generated catalog counts**

Run:

```powershell
node -e "const c=require('./src/features/campus-energy/data/yeungnam-building-catalog.json'); console.log({entries:c.buildings.length, withGps:c.buildings.filter(b=>b.officialPoint).length, withCode:c.buildings.filter(b=>b.officialCode).length, withoutCode:c.buildings.filter(b=>!b.officialCode).length})"
```

Expected for the 2026-06-22 source snapshot:

```text
{ entries: 121, withGps: 121, withCode: 104, withoutCode: 17 }
```

---

### Task 3: Add Official Point Fallbacks to Geometry Builder

**Files:**
- Modify: `scripts/build-yeungnam-building-geometries.mjs`
- Generated: `src/features/campus-energy/data/yeungnam-building-geometries.json`
- Generated: `data/raw/yeungnam-building-mapping-report.json`

- [ ] **Step 1: Add geometry-builder regression test**

Append this test to `src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts`:

```ts
import { buildGeometryFeatureForCatalogEntry } from "../../../../scripts/build-yeungnam-building-geometries.mjs";

describe("official point fallback geometry", () => {
  it("uses reviewed geometry before official point geometry", () => {
    const building = {
      id: "yu-a06",
      schoolId: "yeungnam",
      campusId: "gyeongsan",
      officialCode: "A06",
      name: "College of Arts-Design Building",
      nameKo: "예술대학 디자인관",
      shortName: "A06",
      kind: "building",
      officialPoint: {
        type: "Point",
        coordinates: [128.75724314289113, 35.83515409112729],
        geometrySource: {
          kind: "official-campus-map",
          name: "Yeungnam University campus map",
        },
        geometryConfidence: "verified",
      },
    };
    const reviewedFeature = {
      type: "Feature",
      properties: { geometrySource: "openstreetmap", geometryConfidence: "estimated" },
      geometry: { type: "Polygon", coordinates: [[[128, 35], [129, 35], [129, 36], [128, 35]]] },
    };

    expect(buildGeometryFeatureForCatalogEntry(building, reviewedFeature)).toMatchObject({
      geometry: { type: "Polygon" },
      properties: {
        subjectId: "yu-a06",
        officialCode: "A06",
        geometrySource: "openstreetmap",
      },
    });
  });

  it("uses official point geometry when reviewed geometry is missing", () => {
    const building = {
      id: "yu-official-dd73bbe1",
      schoolId: "yeungnam",
      campusId: "gyeongsan",
      name: "천마아너스파크",
      nameKo: "천마아너스파크",
      shortName: "천마아너스파크",
      kind: "outdoor",
      officialPoint: {
        type: "Point",
        coordinates: [128.7601738129029, 35.8308105775303],
        geometrySource: {
          kind: "official-campus-map",
          name: "Yeungnam University campus map",
        },
        geometryConfidence: "verified",
      },
    };

    expect(buildGeometryFeatureForCatalogEntry(building, undefined)).toMatchObject({
      geometry: {
        type: "Point",
        coordinates: [128.7601738129029, 35.8308105775303],
      },
      properties: {
        subjectId: "yu-official-dd73bbe1",
        officialCode: undefined,
        geometrySource: "official-campus-map",
        geometryConfidence: "verified",
      },
    });
  });
});
```

- [ ] **Step 2: Export `buildGeometryFeatureForCatalogEntry`**

Add this function to `scripts/build-yeungnam-building-geometries.mjs`:

```js
export function buildGeometryFeatureForCatalogEntry(building, reviewedFeature) {
  if (reviewedFeature) {
    return {
      type: "Feature",
      properties: {
        ...commonProperties(
          building,
          reviewedFeature.properties.geometrySource,
          reviewedFeature.properties.geometryConfidence,
        ),
        ...(building.officialCode ? { officialCode: building.officialCode } : {}),
        sourceUrl: reviewedFeature.properties.sourceUrl ?? null,
        osmIds: reviewedFeature.properties.osmIds ?? undefined,
        matchMethod: reviewedFeature.properties.matchMethod ?? null,
      },
      geometry: reviewedFeature.geometry,
    };
  }

  if (!building.officialPoint) {
    return undefined;
  }

  return {
    type: "Feature",
    properties: {
      ...commonProperties(
        building,
        "official-campus-map",
        building.officialPoint.geometryConfidence,
      ),
      ...(building.officialCode ? { officialCode: building.officialCode } : {}),
      sourceUrl: building.officialPoint.geometrySource.url ?? null,
      matchMethod: "official-campus-map-point",
    },
    geometry: {
      type: "Point",
      coordinates: building.officialPoint.coordinates,
    },
  };
}
```

- [ ] **Step 3: Make `commonProperties` tolerate missing official code**

Replace `commonProperties` with:

```js
function commonProperties(building, source, confidence) {
  return {
    subjectId: building.id,
    name: building.name,
    shortName: building.shortName,
    schoolId: building.schoolId,
    campusId: building.campusId,
    kind: building.kind,
    geometrySource: source,
    geometryConfidence: confidence,
    ...(building.officialCode ? { officialCode: building.officialCode } : {}),
  };
}
```

- [ ] **Step 4: Use official fallback in `buildGeometryCollection`**

Inside the `for (const building of catalogBuildings)` loop, replace the missing push path with:

```js
    const officialPointFeature = buildGeometryFeatureForCatalogEntry(building, undefined);

    if (officialPointFeature) {
      features.push(officialPointFeature);
      officialPointFallbacks.push({
        subjectId: building.id,
        officialCode: building.officialCode ?? null,
        name: building.name,
        nameKo: building.nameKo,
        kind: building.kind,
      });
      continue;
    }

    missing.push({
      subjectId: building.id,
      officialCode: building.officialCode ?? null,
      name: building.name,
      nameKo: building.nameKo,
      nameEn: building.nameEn ?? null,
      kind: building.kind,
    });
```

Initialize `officialPointFallbacks` next to `features`, `missing`, and `usedOsmIds`:

```js
  const officialPointFallbacks = [];
```

Return it:

```js
  return { features, missing, usedOsmIds, officialPointFallbacks };
```

- [ ] **Step 5: Add report fields**

In `buildYeungnamBuildingGeometries`, destructure and report fallback counts:

```js
  const { features, missing, usedOsmIds, officialPointFallbacks } =
    buildGeometryCollection(catalogBuildings, osmFeatures, manualFeatures, matches);
```

Add these fields to `report`:

```js
    officialPointFallbackCount: officialPointFallbacks.length,
    officialPointFallbacks,
```

- [ ] **Step 6: Run tests**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts
```

Expected: PASS.

- [ ] **Step 7: Regenerate geometries in strict mode**

Run:

```powershell
node scripts/build-yeungnam-building-geometries.mjs --strict
```

Expected for the 2026-06-22 source snapshot:

```text
Catalog entries: 121; missing: 0
```

The exact mapped count should equal the generated catalog length. Existing reviewed polygons remain polygons; remaining entries become official-campus-map points.

---

### Task 4: Make Runtime Loading Accept Code-Less Official Places

**Files:**
- Modify: `src/features/campus-energy/data/yeungnam-buildings.ts`
- Modify: `src/features/campus-energy/__tests__/energy.test.ts`

- [ ] **Step 1: Add failing runtime data tests**

Append to `src/features/campus-energy/__tests__/energy.test.ts`:

```ts
it("maps every generated Yeungnam catalog entry to geometry", () => {
  expect(yeungnamBuildingSubjects).toHaveLength(
    (buildingCatalog as { buildings: unknown[] }).buildings.length,
  );
  expect(yeungnamBuildingSubjects.every((subject) => subject.geometry)).toBe(true);
});

it("loads official campus-map entries that do not have an official building code", () => {
  const codeLessSubjects = yeungnamBuildingSubjects.filter(
    (subject) => !subject.officialCode,
  );

  expect(codeLessSubjects.length).toBeGreaterThan(0);
  expect(
    codeLessSubjects.every(
      (subject) =>
        subject.id.startsWith("yu-official-") &&
        subject.geometry?.type === "Point" &&
        typeof subject.lng === "number" &&
        typeof subject.lat === "number",
    ),
  ).toBe(true);
});
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/energy.test.ts
```

Expected: FAIL because the current reader requires `officialCode` and only indexes geometry by official code.

- [ ] **Step 3: Update catalog reader type**

In `src/features/campus-energy/data/yeungnam-buildings.ts`, change `CatalogBuilding` to:

```ts
type CatalogBuilding = {
  id: string;
  schoolId: string;
  campusId: string;
  officialCode?: string;
  officialMapUuid?: string;
  name: string;
  nameKo?: string;
  nameEn?: string;
  shortName: string;
  kind: CampusPlaceKind;
};
```

- [ ] **Step 4: Add subject-key geometry index**

Replace the current geometry map creation with:

```ts
const geometryBySubjectId = new Map(
  geometryFeatures.map((feature) => [feature.properties.subjectId, feature]),
);
const geometryByOfficialCode = createGeometryByOfficialCode(geometryFeatures);
```

Inside `yeungnamBuildingSubjects`, replace geometry lookup with:

```ts
    const geometryFeature =
      geometryBySubjectId.get(catalogBuilding.id) ??
      (catalogBuilding.officialCode
        ? geometryByOfficialCode.get(catalogBuilding.officialCode)
        : undefined);
    const geometry = geometryFeature
      ? createSubjectGeometry(geometryFeature)
      : undefined;
```

- [ ] **Step 5: Relax duplicate and unknown checks**

In `createGeometryByOfficialCode`, skip features without official code:

```ts
    const officialCode = feature.properties.officialCode;

    if (!officialCode) {
      return;
    }
```

Keep the unknown-code and duplicate-code errors for features that do have an official code.

- [ ] **Step 6: Make `readCatalogBuilding` accept optional official code**

Replace the required official-code read with:

```ts
  const officialCode = readOptionalString(
    building,
    "officialCode",
    `Invalid Yeungnam catalog building at index ${index}`,
  );
```

Return it conditionally:

```ts
    ...(officialCode ? { officialCode } : {}),
```

- [ ] **Step 7: Run runtime data tests**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/energy.test.ts
```

Expected: PASS.

---

### Task 5: Keep Demo Group Mappings Valid

**Files:**
- Modify: `src/features/campus-energy/data/demo-campus.ts`
- Modify: `src/features/campus-energy/__tests__/energy.test.ts`

- [ ] **Step 1: Verify current demo mappings still point to official coded subjects**

Run:

```powershell
node -e "const c=require('./src/features/campus-energy/data/yeungnam-building-catalog.json'); const codes=new Set(c.buildings.map(b=>b.officialCode).filter(Boolean)); for (const code of ['E21','E22','E23','E24','C02','B04']) console.log(code, codes.has(code));"
```

Expected:

```text
E21 true
E22 true
E23 true
E24 true
C02 true
B04 true
```

- [ ] **Step 2: Keep `demoGroupIdsByOfficialCode` restricted to coded subjects**

If current mappings still exist, keep this block unchanged:

```ts
export const demoGroupIdsByOfficialCode: ReadonlyMap<string, string> = new Map([
  ["E21", "engineering"],
  ["E22", "engineering"],
  ["E23", "engineering"],
  ["E24", "engineering"],
  ["C02", "humanities"],
  ["B04", "student-services"],
]);
```

- [ ] **Step 3: Update stale negative assertions**

If `energy.test.ts` still has this assertion:

```ts
expect(demoGroupIdsByOfficialCode.has("E29")).toBe(false);
expect(demoGroupIdsByOfficialCode.has("B03")).toBe(false);
```

Keep it only if `E29` and `B03` remain ungrouped by product choice. This check is about demo affiliation groups, not geometry completeness.

- [ ] **Step 4: Run demo data tests**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/energy.test.ts src/features/campus-energy/__tests__/localized-demo-campus.test.ts
```

Expected: PASS.

---

### Task 6: Verify Mapbox Feature Output for All Official Entries

**Files:**
- Modify: `src/features/campus-energy/__tests__/geojson.test.ts`
- Modify: `src/features/campus-energy/components/campus-map.tsx` only if the test exposes a rendering gap.

- [ ] **Step 1: Add generated data feature-collection test**

Append to `src/features/campus-energy/__tests__/geojson.test.ts`:

```ts
import { demoSubjects, getDemoEnergyComparisons } from "../data/demo-campus";

it("creates a map feature for every generated Yeungnam demo subject", () => {
  const collection = createEnergySubjectFeatureCollection(
    demoSubjects,
    getDemoEnergyComparisons(),
    demoSubjects[0]?.id ?? "",
  );

  expect(collection.features).toHaveLength(demoSubjects.length);
  expect(collection.features.some((feature) => feature.geometry.type === "Point")).toBe(true);
  expect(collection.features.some((feature) => feature.geometry.type === "Polygon")).toBe(true);
});
```

- [ ] **Step 2: Run the geojson test**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/geojson.test.ts
```

Expected: PASS.

- [ ] **Step 3: Confirm the map label fallback works for code-less places**

Inspect `src/features/campus-energy/components/campus-map.tsx`. The label layer should use:

```ts
"text-field": [
  "coalesce",
  ["get", "officialCode"],
  ["get", "shortName"],
],
```

Expected: coded buildings label with codes like `E21`; code-less official places label with their `shortName`.

---

### Task 7: Regenerate Data and Capture Counts

**Files:**
- Generated: `src/features/campus-energy/data/yeungnam-building-catalog.json`
- Generated: `src/features/campus-energy/data/yeungnam-building-geometries.json`
- Generated: `data/raw/yeungnam-building-mapping-report.json`
- Generated: `data/raw/yeungnam-osm-building-review.csv`

- [ ] **Step 1: Regenerate official catalog**

Run:

```powershell
node scripts/fetch-yeungnam-campus-catalog.mjs
```

Expected for the 2026-06-22 source snapshot: `Wrote 121 catalog entries`.

- [ ] **Step 2: Regenerate geometry collection**

Run:

```powershell
node scripts/build-yeungnam-building-geometries.mjs --strict
```

Expected for the 2026-06-22 source snapshot:

```text
Catalog entries: 121; missing: 0
```

- [ ] **Step 3: Verify catalog and geometry counts match**

Run:

```powershell
node -e "const c=require('./src/features/campus-energy/data/yeungnam-building-catalog.json'); const g=require('./src/features/campus-energy/data/yeungnam-building-geometries.json'); const r=require('./data/raw/yeungnam-building-mapping-report.json'); console.log({catalog:c.buildings.length, geometry:g.features.length, missing:r.missingCount, pointFallbacks:r.officialPointFallbackCount}); if(c.buildings.length!==g.features.length || r.missingCount!==0) process.exit(1);"
```

Expected:

```text
{ catalog: 121, geometry: 121, missing: 0, pointFallbacks: 73 }
```

The fallback count may differ if additional OSM/manual polygons are reviewed before execution.

- [ ] **Step 4: Commit generated data**

Run:

```powershell
git add src/features/campus-energy/data/yeungnam-building-catalog.json src/features/campus-energy/data/yeungnam-building-geometries.json data/raw/yeungnam-building-mapping-report.json data/raw/yeungnam-osm-building-review.csv
git commit -m "data: map all official Yeungnam campus entries"
```

Expected: commit succeeds with only mapping data changes.

---

### Task 8: Update Technical Documentation

**Files:**
- Modify: `docs/technical/campus-energy-mvp.md`
- Modify: `docs/working/current-state.md` only if this implementation is completed in the same session.
- Modify: `docs/working/meeting-notes.md` only if the user asks for session recording.

- [ ] **Step 1: Add mapping-source note**

Append this section to `docs/technical/campus-energy-mvp.md`:

```md
## Yeungnam Campus Map Data

Yeungnam building and campus-place subjects are generated from the official campus-map pages:

- Korean source: `https://www.yu.ac.kr/main/intro/campus-map.do`
- English source: `https://www.yu.ac.kr/english/about/campus-map.do`

The generated catalog keeps all official entries with GPS coordinates. Reviewed OSM or manual polygons are preferred when available. Entries without reviewed polygon geometry use the official campus-map GPS value as Point geometry with `geometrySource.kind = "official-campus-map"`.

Regenerate the data with:

```powershell
node scripts/fetch-yeungnam-campus-catalog.mjs
node scripts/build-yeungnam-building-geometries.mjs --strict
```

Strict mode should report `missing: 0` because every active official campus-map entry has either reviewed geometry or official point fallback geometry.
```

- [ ] **Step 2: Commit docs**

Run:

```powershell
git add docs/technical/campus-energy-mvp.md
git commit -m "docs: document official Yeungnam map source"
```

Expected: commit succeeds.

---

### Task 9: Final Verification

**Files:**
- Verify full repository behavior.

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/yeungnam-campus-catalog-script.test.ts src/features/campus-energy/__tests__/energy.test.ts src/features/campus-energy/__tests__/geojson.test.ts src/features/campus-energy/__tests__/campus-map.test.tsx
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

- [ ] **Step 6: Browser check with Mapbox token**

Run:

```powershell
npm run dev
```

Open `/ko` with `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` set.

Expected:

- The map still loads at Yeungnam Gyeongsan campus.
- Existing reviewed buildings render as polygon fills.
- Previously missing buildings render as point markers.
- Code-less official places render as points with `shortName` labels at high zoom.
- Selecting a point subject flies to its official campus-map coordinate.

## Self-Review

- Spec coverage: the plan maps all official Yeungnam campus-map entries that have GPS, including code-less official places and Daegu campus entries.
- Placeholder scan: every task has concrete files, commands, expected outputs, and code-level changes.
- Type consistency: catalog entries use `officialCode?: string`, `officialMapUuid`, `officialPoint`, `subjectId`, `CampusPlaceKind`, `SubjectGeometry`, and existing Mapbox feature conversion consistently.
