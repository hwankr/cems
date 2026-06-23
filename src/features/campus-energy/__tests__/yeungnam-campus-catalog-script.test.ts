import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildOfficialCampusCatalog,
  ENGLISH_CAMPUS_MAP_URL,
  KOREAN_CAMPUS_MAP_URL,
  parseOfficialFloorList,
  parseOfficialFloorText,
  parseOfficialCampusMapHtml,
} from "../../../../scripts/fetch-yeungnam-campus-catalog.mjs";
import { overpassJsonToGeoJson } from "../../../../scripts/fetch-yeungnam-osm-buildings.mjs";
import buildingGeometries from "../data/yeungnam-building-geometries.json";

const koHtml = `
<script>
  var campusList = [{
    "cName": "Gyeongsan Campus",
    "dList": [{
      "dName": "A Area",
      "dClassName": "area-a",
      "bList": [{
        "bNo": "A06",
        "bName": "Arts Design Building",
        "bGPS": "128.75724314289113,35.83515409112729",
        "bFloor": "지상: 3 층, 지하: 1층",
        "bUse": "Lecture hall",
        "@UUID@": "a06-ko"
      }]
    }, {
      "dName": "Etc",
      "dClassName": "area-etc",
      "bList": [{
        "bName": "Cheonma Tennis Field",
        "bGPS": "128.7601738129029,35.8308105775303",
        "bUse": "gymnasium",
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
        "bName": "Arts Design Building",
        "bEngName": "College of Arts-Design Building",
        "bGPS": "128.75724314289113,35.83515409112729",
        "@UUID@": "a06-en"
      }, {
        "bName": "Cheonma Partner Spark",
        "bEngName": "Cheonma Partner Spark",
        "bGPS": "128.7601738129029,35.8308105775303",
        "@UUID@": "en-code-less"
      }]
    }]
  }];
  var gateList = [];
</script>`;

describe("official Yeungnam campus-map parser", () => {
  it("exports the official Korean and English campus-map URLs", () => {
    expect(KOREAN_CAMPUS_MAP_URL).toBe("https://www.yu.ac.kr/main/intro/campus-map.do");
    expect(ENGLISH_CAMPUS_MAP_URL).toBe(
      "https://www.yu.ac.kr/english/about/campus-map.do",
    );
  });

  it("extracts coded and code-less entries with GPS", () => {
    const entries = parseOfficialCampusMapHtml(koHtml, "ko");

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      officialCode: "A06",
      nameKo: "Arts Design Building",
      gps: [128.75724314289113, 35.83515409112729],
      campusId: "gyeongsan",
      officialFloorText: "지상: 3 층, 지하: 1층",
      aboveGroundFloors: 3,
      basementFloors: 1,
      floorCountSource: "official-bFloor",
    });
    expect(entries[1]).toMatchObject({
      nameKo: "Cheonma Tennis Field",
      gps: [128.7601738129029, 35.8308105775303],
      campusId: "gyeongsan",
    });
    expect(entries[1].officialCode).toBeUndefined();
  });

  it("parses official bFloor text into above-ground and basement floors", () => {
    expect(parseOfficialFloorText("지상: 3 층, 지하: 1층")).toEqual({
      officialFloorText: "지상: 3 층, 지하: 1층",
      aboveGroundFloors: 3,
      basementFloors: 1,
      floorCountSource: "official-bFloor",
    });
    expect(parseOfficialFloorText("지상: 1층, 지하: 0층")).toEqual({
      officialFloorText: "지상: 1층, 지하: 0층",
      aboveGroundFloors: 1,
      basementFloors: 0,
      floorCountSource: "official-bFloor",
    });
  });

  it("falls back to fList floor labels when bFloor cannot be parsed", () => {
    expect(parseOfficialFloorList(["B1", "1F", "2F"])).toEqual({
      aboveGroundFloors: 2,
      basementFloors: 1,
      floorCountSource: "official-fList",
    });
  });

  it("extracts campusList by array boundary when other variables appear before gateList", () => {
    const html = `
    <script>
      var campusList = [{
        "cName": "Gyeongsan Campus",
        "dList": [{
          "dName": "A Area",
          "bList": [{
            "bNo": "A01",
            "bName": "Main Gate",
            "bGPS": "128.7532976281431,35.83563976723486",
            "@UUID@": "a01-ko"
          }]
        }]
      }, // Yeungnam pages are JavaScript, not guaranteed strict JSON.
      ];
      var campusMapOptions = { "gateList": ["not the boundary"] };
      var gateList = [];
    </script>`;

    expect(parseOfficialCampusMapHtml(html, "ko")).toHaveLength(1);
  });

  it("builds stable subject ids, official points, and merged English names", () => {
    const catalog = buildOfficialCampusCatalog({
      koEntries: parseOfficialCampusMapHtml(koHtml, "ko"),
      enEntries: parseOfficialCampusMapHtml(enHtml, "en"),
      capturedAt: "2026-06-22T00:00:00.000Z",
    });

    expect(catalog.buildings).toHaveLength(2);
    expect(catalog.buildings[0]).toMatchObject({
      id: "yu-a06",
      officialCode: "A06",
      nameKo: "Arts Design Building",
      nameEn: "College of Arts-Design Building",
      shortName: "A06",
      kind: "building",
      officialFloorText: "지상: 3 층, 지하: 1층",
      aboveGroundFloors: 3,
      basementFloors: 1,
      floorCountSource: "official-bFloor",
      officialPoint: {
        type: "Point",
        coordinates: [128.75724314289113, 35.83515409112729],
        geometrySource: {
          kind: "official-campus-map",
          url: KOREAN_CAMPUS_MAP_URL,
          capturedAt: "2026-06-22T00:00:00.000Z",
        },
        geometryConfidence: "verified",
      },
    });
    expect(catalog.buildings[1]).toMatchObject({
      id: "yu-official-dd73bbe1",
      nameKo: "Cheonma Tennis Field",
      nameEn: "Cheonma Partner Spark",
      shortName: "Cheonma Tennis Field",
      kind: "outdoor",
    });
    expect(catalog.buildings[1].officialCode).toBeUndefined();
  });

  it("classifies official folklore places as landmarks, not buildings", () => {
    const folkloreKoHtml = `
    <script>
      var campusList = [{
        "cName": "Gyeongsan Campus",
        "dList": [{
          "dName": "G Area",
          "bList": [{
            "bName": "Folklore",
            "bGPS": "128.76176814778245,35.82784729283406",
            "@UUID@": "eed44f7f-f236-4378-baaf-798a7fef780b"
          }]
        }]
      }];
      var gateList = [];
    </script>`;
    const folkloreEnHtml = `
    <script>
      var campusList = [{
        "cName": "Gyeongsan Campus",
        "dList": [{
          "dName": "G Area",
          "bList": [{
            "bName": "Folklore",
            "bEngName": "Folklore",
            "bGPS": "128.76176814778245,35.82784729283406",
            "@UUID@": "eed44f7f-f236-4378-baaf-798a7fef780b"
          }]
        }]
      }];
      var gateList = [];
    </script>`;

    const catalog = buildOfficialCampusCatalog({
      koEntries: parseOfficialCampusMapHtml(folkloreKoHtml, "ko"),
      enEntries: parseOfficialCampusMapHtml(folkloreEnHtml, "en"),
      capturedAt: "2026-06-22T00:00:00.000Z",
    });

    expect(catalog.buildings[0]).toMatchObject({
      id: "yu-official-eed44f7f",
      name: "Folklore",
      kind: "landmark",
    });
  });

  it("keeps H-zone official entries on the Daegu campus without overclassifying words", () => {
    const hZoneKoHtml = `
    <script>
      var campusList = [{
        "cName": "Medical Center",
        "dList": [{
          "dName": "H Area",
          "bList": [{
            "bNo": "H19",
            "bName": "Respiratory Specialty Center",
            "bGPS": "128.58527930845457,35.846444951783404",
            "@UUID@": "h19-ko"
          }]
        }]
      }];
      var gateList = [];
    </script>`;
    const hZoneEnHtml = `
    <script>
      var campusList = [{
        "cName": "Medical Center",
        "dList": [{
          "dName": "H Area",
          "bList": [{
            "bNo": "H19",
            "bName": "Respiratory Specialty Center",
            "bEngName": "Yeungnam University Medical Center Respiratory Center",
            "bGPS": "128.58527930845457,35.846444951783404",
            "@UUID@": "h19-en"
          }]
        }]
      }];
      var gateList = [];
    </script>`;

    const [entry] = parseOfficialCampusMapHtml(hZoneKoHtml, "ko");
    const catalog = buildOfficialCampusCatalog({
      koEntries: [entry],
      enEntries: parseOfficialCampusMapHtml(hZoneEnHtml, "en"),
      capturedAt: "2026-06-22T00:00:00.000Z",
    });

    expect(entry).toMatchObject({
      officialCode: "H19",
      campusId: "daemyeong",
    });
    expect(catalog.buildings[0]).toMatchObject({
      id: "yu-h19",
      campusId: "daemyeong",
      kind: "building",
    });
  });
});

describe("OSM Yeungnam building footprint parser", () => {
  it("preserves OSM height and building:levels without treating level as building height", () => {
    const geojson = overpassJsonToGeoJson({
      elements: [
        { type: "node", id: 1, lon: 128, lat: 35 },
        { type: "node", id: 2, lon: 129, lat: 35 },
        { type: "node", id: 3, lon: 129, lat: 36 },
        { type: "node", id: 4, lon: 128, lat: 36 },
        {
          type: "way",
          id: 153003650,
          nodes: [1, 2, 3, 4, 1],
          tags: {
            building: "yes",
            level: "1",
            height: "12 m",
            "building:levels": "4",
            name: "천마아트센터",
          },
        },
      ],
    });

    expect(geojson.features[0].properties).toMatchObject({
      osmId: "way/153003650",
      osmHeightMeters: 12,
      osmBuildingLevels: 4,
    });
    expect(geojson.features[0].properties).not.toHaveProperty("level");
  });

  it("does not derive height metadata from OSM level alone", () => {
    const geojson = overpassJsonToGeoJson({
      elements: [
        { type: "node", id: 1, lon: 128, lat: 35 },
        { type: "node", id: 2, lon: 129, lat: 35 },
        { type: "node", id: 3, lon: 129, lat: 36 },
        { type: "node", id: 4, lon: 128, lat: 36 },
        {
          type: "way",
          id: 2,
          nodes: [1, 2, 3, 4, 1],
          tags: {
            building: "yes",
            level: "1",
          },
        },
      ],
    });

    expect(geojson.features[0].properties).not.toHaveProperty("osmHeightMeters");
    expect(geojson.features[0].properties).not.toHaveProperty("osmBuildingLevels");
  });
});

describe("official point fallback geometry", () => {
  it("uses reviewed geometry before official point geometry", () => {
    const result = runGeometryHelper(`const building = {
      id: "yu-a06",
      schoolId: "yeungnam",
      campusId: "gyeongsan",
      officialCode: "A06",
      name: "College of Arts-Design Building",
      nameKo: "Arts Design Building",
      shortName: "A06",
      kind: "building",
      aboveGroundFloors: 3,
      basementFloors: 1,
      floorCountSource: "official-bFloor",
      officialPoint: {
        type: "Point",
        coordinates: [128.75724314289113, 35.83515409112729],
        geometrySource: {
          kind: "official-campus-map",
          name: "Yeungnam University campus map",
          url: "${KOREAN_CAMPUS_MAP_URL}",
        },
        geometryConfidence: "verified",
      },
    };
    const reviewedFeature = {
      type: "Feature",
      properties: {
        geometrySource: "openstreetmap",
        geometryConfidence: "estimated",
        sourceUrl: "https://www.openstreetmap.org/way/1",
        osmIds: ["way/1"],
        matchMethod: "normalized-exact-name",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[128, 35], [129, 35], [129, 36], [128, 35]]],
      },
    };
    console.log(JSON.stringify(buildGeometryFeatureForCatalogEntry(building, reviewedFeature)));`);

    expect(result).toMatchObject({
      geometry: { type: "Polygon" },
      properties: {
        subjectId: "yu-a06",
        officialCode: "A06",
        geometrySource: "openstreetmap",
        geometryConfidence: "estimated",
        aboveGroundFloors: 3,
        basementFloors: 1,
        floorCountSource: "official-bFloor",
        displayHeightMeters: 10.8,
        heightSource: "official-floor-count",
      },
    });
  });

  it("prefers manual and OSM height sources before official floor count", () => {
    const result = runGeometryHelper(`const building = {
      id: "yu-a06",
      schoolId: "yeungnam",
      campusId: "gyeongsan",
      officialCode: "A06",
      name: "College of Arts-Design Building",
      nameKo: "Arts Design Building",
      shortName: "A06",
      kind: "building",
      aboveGroundFloors: 3,
      floorCountSource: "official-bFloor",
    };
    const geometry = {
      type: "Polygon",
      coordinates: [[[128, 35], [129, 35], [129, 36], [128, 35]]],
    };
    const features = [
      buildGeometryFeatureForCatalogEntry(building, {
        type: "Feature",
        properties: {
          geometrySource: "manual",
          geometryConfidence: "verified",
          displayHeightMeters: 12,
        },
        geometry,
      }),
      buildGeometryFeatureForCatalogEntry(building, {
        type: "Feature",
        properties: {
          geometrySource: "openstreetmap",
          geometryConfidence: "estimated",
          osmHeightMeters: 15,
          osmBuildingLevels: 4,
        },
        geometry,
      }),
      buildGeometryFeatureForCatalogEntry(building, {
        type: "Feature",
        properties: {
          geometrySource: "openstreetmap",
          geometryConfidence: "estimated",
          osmBuildingLevels: 4,
        },
        geometry,
      }),
    ];
    console.log(JSON.stringify(features.map((feature) => ({
      displayHeightMeters: feature.properties.displayHeightMeters,
      heightSource: feature.properties.heightSource,
    }))));`);

    expect(result).toEqual([
      { displayHeightMeters: 12, heightSource: "manual-height" },
      { displayHeightMeters: 15, heightSource: "osm-height" },
      { displayHeightMeters: 14.4, heightSource: "osm-building-levels" },
    ]);
  });

  it("uses official point geometry when reviewed geometry is missing", () => {
    const result = runGeometryHelper(`const building = {
      id: "yu-official-dd73bbe1",
      schoolId: "yeungnam",
      campusId: "gyeongsan",
      name: "Cheonma Honors Park",
      nameKo: "Cheonma Honors Park",
      shortName: "Cheonma Honors Park",
      kind: "building",
      aboveGroundFloors: 2,
      basementFloors: 1,
      floorCountSource: "official-bFloor",
      officialPoint: {
        type: "Point",
        coordinates: [128.7601738129029, 35.8308105775303],
        geometrySource: {
          kind: "official-campus-map",
          name: "Yeungnam University campus map",
          url: "${KOREAN_CAMPUS_MAP_URL}",
        },
        geometryConfidence: "verified",
      },
    };
    console.log(JSON.stringify(buildGeometryFeatureForCatalogEntry(building, undefined)));`);

    expect(result).toMatchObject({
      geometry: {
        type: "Point",
        coordinates: [128.7601738129029, 35.8308105775303],
      },
      properties: {
        subjectId: "yu-official-dd73bbe1",
        geometrySource: "official-campus-map",
        geometryConfidence: "verified",
        sourceUrl: KOREAN_CAMPUS_MAP_URL,
        matchMethod: "official-campus-map-point",
      },
    });

    expect(result.properties).not.toHaveProperty("displayHeightMeters");
    expect(result.properties).not.toHaveProperty("heightSource");
    expect(result.properties).not.toHaveProperty("aboveGroundFloors");
  });

  it("does not add extrusion height to non-building polygons", () => {
    const result = runGeometryHelper(`const building = {
      id: "yu-a01",
      schoolId: "yeungnam",
      campusId: "gyeongsan",
      officialCode: "A01",
      name: "Main Gate",
      nameKo: "Main Gate",
      shortName: "A01",
      kind: "landmark",
      aboveGroundFloors: 3,
      floorCountSource: "official-bFloor",
    };
    const reviewedFeature = {
      type: "Feature",
      properties: {
        geometrySource: "manual",
        geometryConfidence: "verified",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[128, 35], [129, 35], [129, 36], [128, 35]]],
      },
    };
    console.log(JSON.stringify(buildGeometryFeatureForCatalogEntry(building, reviewedFeature)));`);

    expect(result.properties).not.toHaveProperty("displayHeightMeters");
    expect(result.properties).not.toHaveProperty("heightSource");
  });

  it("requires explicit acceptance for official point fallbacks in strict mode", () => {
    const result = runGeometryHelper(`const report = {
      strict: true,
      missingCount: 0,
      officialPointFallbackCount: 73,
      officialPointFallbackAcceptanceAllowed: false,
    };
    console.log(JSON.stringify({
      denied: getStrictMappingFailureMessage(report),
      accepted: getStrictMappingFailureMessage({
        ...report,
        officialPointFallbackAcceptanceAllowed: true,
      }),
    }));`);

    expect(result).toEqual({
      denied:
        "Strict mapping failed: 73 official campus-map point fallbacks require --allow-official-point-fallbacks.",
      accepted: null,
    });
  });

  it("does not write runtime geometry artifacts when strict mode rejects point fallbacks", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "yu-strict-"));
    const outputGeoJsonPath = join(tempDir, "yeungnam-building-geometries.json");
    const reportPath = join(tempDir, "yeungnam-building-mapping-report.json");
    const reviewCsvPath = join(tempDir, "yeungnam-osm-building-review.csv");
    const repoOutputPath =
      "src/features/campus-energy/data/yeungnam-building-geometries.json";
    const repoReportPath = "data/raw/yeungnam-building-mapping-report.json";
    const repoReviewCsvPath = "data/raw/yeungnam-osm-building-review.csv";
    const originalOutput = readFileSync(repoOutputPath, "utf8");
    const originalReport = readFileSync(repoReportPath, "utf8");
    const originalReviewCsv = readFileSync(repoReviewCsvPath, "utf8");
    const sentinel = '{"sentinel":true}\n';
    writeFileSync(outputGeoJsonPath, sentinel, "utf8");

    try {
      let failureOutput = "";
      try {
        execFileSync(
          "node",
          [
            "--input-type=module",
            "-e",
            `import { buildYeungnamBuildingGeometries } from "./scripts/build-yeungnam-building-geometries.mjs";
             await buildYeungnamBuildingGeometries({
               strict: true,
               allowOfficialPointFallbacks: false,
               outputGeoJsonUrl: new URL(${JSON.stringify(pathToFileURL(outputGeoJsonPath).href)}),
               reportUrl: new URL(${JSON.stringify(pathToFileURL(reportPath).href)}),
               reviewCsvUrl: new URL(${JSON.stringify(pathToFileURL(reviewCsvPath).href)}),
             });`,
          ],
          { cwd: process.cwd(), encoding: "utf8", stdio: "pipe" },
        );
      } catch (error) {
        failureOutput = String(
          (error as { stderr?: string; stdout?: string }).stderr ??
            (error as { stdout?: string }).stdout ??
            error,
        );
      }

      expect(failureOutput).toContain(
        "Strict mapping failed: 73 official campus-map point fallbacks require --allow-official-point-fallbacks.",
      );

      expect(readFileSync(outputGeoJsonPath, "utf8")).toBe(sentinel);
      expect(JSON.parse(readFileSync(reportPath, "utf8"))).toMatchObject({
        strict: true,
        officialPointFallbackAcceptanceAllowed: false,
        officialPointFallbackCount: 73,
      });
      expect(existsSync(reviewCsvPath)).toBe(true);
    } finally {
      writeFileSync(repoOutputPath, originalOutput, "utf8");
      writeFileSync(repoReportPath, originalReport, "utf8");
      writeFileSync(repoReviewCsvPath, originalReviewCsv, "utf8");
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("describes generated geometry metadata as multi-campus", () => {
    expect(buildingGeometries.metadata).toMatchObject({
      schoolId: "yeungnam",
      campusIds: ["daemyeong", "gyeongsan"],
    });
    expect(buildingGeometries.metadata).not.toHaveProperty("campusId");
  });
});

function runGeometryHelper(snippet: string) {
  const output = execFileSync(
    "node",
    [
      "--input-type=module",
      "-e",
      `import { buildGeometryFeatureForCatalogEntry, getStrictMappingFailureMessage } from "./scripts/build-yeungnam-building-geometries.mjs"; ${snippet}`,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  return JSON.parse(output);
}
