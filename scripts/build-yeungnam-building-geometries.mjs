#!/usr/bin/env node

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CATALOG_PATH =
  "src/features/campus-energy/data/yeungnam-building-catalog.json";
const OSM_GEOJSON_PATH = "data/raw/yeungnam-osm-buildings.geojson";
const REVIEW_CSV_PATH = "data/raw/yeungnam-osm-building-review.csv";
const MATCHES_PATH = "data/raw/yeungnam-building-matches.json";
const MANUAL_GEOJSON_PATH =
  "data/raw/yeungnam-manual-building-geometries.geojson";
const OUTPUT_GEOJSON_PATH =
  "src/features/campus-energy/data/yeungnam-building-geometries.json";
const REPORT_PATH = "data/raw/yeungnam-building-mapping-report.json";

const CATALOG_URL = new URL(`../${CATALOG_PATH}`, import.meta.url);
const OSM_GEOJSON_URL = new URL(`../${OSM_GEOJSON_PATH}`, import.meta.url);
const REVIEW_CSV_URL = new URL(`../${REVIEW_CSV_PATH}`, import.meta.url);
const MATCHES_URL = new URL(`../${MATCHES_PATH}`, import.meta.url);
const MANUAL_GEOJSON_URL = new URL(`../${MANUAL_GEOJSON_PATH}`, import.meta.url);
const OUTPUT_GEOJSON_URL = new URL(`../${OUTPUT_GEOJSON_PATH}`, import.meta.url);
const REPORT_URL = new URL(`../${REPORT_PATH}`, import.meta.url);

const SCHOOL_PREFIX_KO = "\uC601\uB0A8\uB300\uD559\uAD50";
const ALLOWED_CONFIDENCE = new Set(["verified", "estimated", "needs-review"]);
const METERS_PER_OFFICIAL_FLOOR = 3.6;

const FALLBACK_SEEDS = [
  {
    officialCode: "E29",
    osmName: "\uAE30\uACC4\uACF5\uD559\uAD00",
    note: "Fallback seed for Mechanical Engineering Building when exact matches are too sparse.",
  },
];

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function readJson(url) {
  const text = await readFile(url, "utf8");
  return JSON.parse(text);
}

async function readJsonIfExists(url) {
  try {
    return await readJson(url);
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

async function writeJson(url, value) {
  await mkdir(dirname(fileURLToPath(url)), { recursive: true });
  await writeFile(url, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(url, value) {
  await mkdir(dirname(fileURLToPath(url)), { recursive: true });
  await writeFile(url, value, "utf8");
}

function stripParentheticalSegments(value) {
  return value.replace(
    /\([^)]*\)|\[[^\]]*\]|\{[^}]*\}|\uFF08[^\uFF09]*\uFF09/g,
    "",
  );
}

export function normalizeBuildingName(value) {
  if (!value) {
    return "";
  }

  return stripParentheticalSegments(String(value).normalize("NFKC").toLowerCase())
    .replaceAll(SCHOOL_PREFIX_KO, "")
    .replace(/\byeungnam\s+university\b/g, "")
    .replace(/\byu\b/g, "")
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function getCatalogBuildings(catalog) {
  return asArray(catalog.buildings).sort((left, right) =>
    (left.officialCode ?? left.id).localeCompare(
      right.officialCode ?? right.id,
      "en",
      { numeric: true },
    ),
  );
}

function getNamesForCatalogBuilding(building) {
  return [building.nameKo, building.nameEn, building.name].filter(Boolean);
}

function getNamesForOsmFeature(feature) {
  const properties = feature.properties ?? {};

  return [
    properties.osmName,
    properties.osmNameKo,
    properties.osmNameEn,
  ].filter(Boolean);
}

function addUniqueFeature(target, feature) {
  if (!target.some((candidate) => candidate.properties?.osmId === feature.properties?.osmId)) {
    target.push(feature);
  }
}

function indexOsmFeaturesByName(osmFeatures) {
  const index = new Map();

  for (const feature of osmFeatures) {
    const keys = new Set(
      getNamesForOsmFeature(feature)
        .map(normalizeBuildingName)
        .filter(Boolean),
    );

    for (const key of keys) {
      const features = index.get(key) ?? [];
      addUniqueFeature(features, feature);
      index.set(key, features);
    }
  }

  return index;
}

function findOsmFeaturesForBuilding(building, osmNameIndex) {
  const found = [];
  const keys = new Set(
    getNamesForCatalogBuilding(building)
      .map(normalizeBuildingName)
      .filter(Boolean),
  );

  for (const key of keys) {
    for (const feature of osmNameIndex.get(key) ?? []) {
      addUniqueFeature(found, feature);
    }
  }

  return found;
}

function createMatch(building, osmFeature, matchMethod, notes) {
  return {
    officialCode: building.officialCode,
    catalogId: building.id,
    osmId: osmFeature.properties.osmId,
    geometrySource: "openstreetmap",
    geometryConfidence: "estimated",
    reviewStatus: "estimated",
    matchMethod,
    catalogName: building.name,
    catalogNameKo: building.nameKo,
    catalogNameEn: building.nameEn ?? null,
    osmName: osmFeature.properties.osmName,
    osmNameKo: osmFeature.properties.osmNameKo,
    osmNameEn: osmFeature.properties.osmNameEn,
    notes,
  };
}

function createInitialMatches(catalogBuildings, osmFeatures) {
  const osmNameIndex = indexOsmFeaturesByName(osmFeatures);
  const usedOsmIds = new Set();
  const matches = [];
  const ambiguous = [];

  for (const building of catalogBuildings) {
    const features = findOsmFeaturesForBuilding(building, osmNameIndex);

    if (features.length === 1 && !usedOsmIds.has(features[0].properties.osmId)) {
      matches.push(
        createMatch(
          building,
          features[0],
          "normalized-exact-name",
          "Auto-filled from a unique normalized exact Korean or English name match.",
        ),
      );
      usedOsmIds.add(features[0].properties.osmId);
    } else if (features.length > 1) {
      ambiguous.push({
        officialCode: building.officialCode,
        catalogId: building.id,
        catalogName: building.name,
        candidateOsmIds: features.map((feature) => feature.properties.osmId),
      });
    }
  }

  if (matches.length < 10) {
    for (const seed of FALLBACK_SEEDS) {
      const building = catalogBuildings.find(
        (candidate) => candidate.officialCode === seed.officialCode,
      );
      const normalizedSeedName = normalizeBuildingName(seed.osmName);
      const candidates = osmNameIndex.get(normalizedSeedName) ?? [];

      if (!building || candidates.length !== 1) {
        continue;
      }

      const osmFeature = candidates[0];

      if (
        usedOsmIds.has(osmFeature.properties.osmId) ||
        matches.some((match) => match.officialCode === building.officialCode)
      ) {
        continue;
      }

      matches.push(
        createMatch(building, osmFeature, "manual-obvious-seed", seed.note),
      );
      usedOsmIds.add(osmFeature.properties.osmId);
    }
  }

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      matchPolicy:
        "Estimated matches are generated only for unique normalized exact Korean or English name matches. Ambiguous candidates are left unmatched.",
      matchCount: matches.length,
      ambiguousCount: ambiguous.length,
    },
    matches,
    ambiguous,
  };
}

function createEmptyManualGeoJson() {
  return {
    type: "FeatureCollection",
    metadata: {
      generatedAt: new Date().toISOString(),
      description:
        "Manual Yeungnam building geometries. Add reviewed GeoJSON features with officialCode or subjectId when OSM is missing or incorrect.",
    },
    features: [],
  };
}

async function ensureReviewInputs(catalogBuildings, osmFeatures) {
  let matchesJson = await readJsonIfExists(MATCHES_URL);
  let manualGeoJson = await readJsonIfExists(MANUAL_GEOJSON_URL);
  const created = {
    matches: false,
    manualGeometries: false,
  };

  if (!matchesJson) {
    matchesJson = createInitialMatches(catalogBuildings, osmFeatures);
    await writeJson(MATCHES_URL, matchesJson);
    created.matches = true;
  }

  if (!manualGeoJson) {
    manualGeoJson = createEmptyManualGeoJson();
    await writeJson(MANUAL_GEOJSON_URL, manualGeoJson);
    created.manualGeometries = true;
  }

  return { matchesJson, manualGeoJson, created };
}

function getMatches(matchesJson) {
  return asArray(matchesJson.matches).filter(
    (match) => match.officialCode || match.catalogId || match.subjectId,
  );
}

function getOsmIdsForMatch(match) {
  if (Array.isArray(match.osmIds)) {
    return match.osmIds;
  }

  return match.osmId ? [match.osmId] : [];
}

function normalizeConfidence(value, fallback = "estimated") {
  return ALLOWED_CONFIDENCE.has(value) ? value : fallback;
}

function buildMatchIndex(matches) {
  const byOfficialCode = new Map();
  const byCatalogId = new Map();
  const bySubjectId = new Map();

  for (const match of matches) {
    if (match.officialCode) {
      byOfficialCode.set(match.officialCode, match);
    }

    if (match.catalogId) {
      byCatalogId.set(match.catalogId, match);
    }

    if (match.subjectId) {
      bySubjectId.set(match.subjectId, match);
    }
  }

  return { byOfficialCode, byCatalogId, bySubjectId };
}

function findMatchForBuilding(building, matchIndex) {
  return (
    (building.officialCode
      ? matchIndex.byOfficialCode.get(building.officialCode)
      : undefined) ??
    matchIndex.byCatalogId.get(building.id) ??
    matchIndex.bySubjectId.get(building.id)
  );
}

function buildManualIndex(manualFeatures) {
  const byOfficialCode = new Map();
  const bySubjectId = new Map();

  for (const feature of manualFeatures) {
    const properties = feature.properties ?? {};

    if (properties.officialCode) {
      byOfficialCode.set(properties.officialCode, feature);
    }

    if (properties.subjectId) {
      bySubjectId.set(properties.subjectId, feature);
    }
  }

  return { byOfficialCode, bySubjectId };
}

function findManualFeatureForBuilding(building, manualIndex) {
  return (
    (building.officialCode
      ? manualIndex.byOfficialCode.get(building.officialCode)
      : undefined) ??
    manualIndex.bySubjectId.get(building.id)
  );
}

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

function isPolygonalGeometry(geometry) {
  return geometry?.type === "Polygon" || geometry?.type === "MultiPolygon";
}

function getPositiveFiniteNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return value;
}

function getNonNegativeInteger(value) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return undefined;
  }

  return value;
}

function getPositiveInteger(value) {
  const integer = getNonNegativeInteger(value);

  return integer && integer > 0 ? integer : undefined;
}

function getOfficialFloorMetadata(building) {
  const aboveGroundFloors = getPositiveInteger(building.aboveGroundFloors);
  const basementFloors = getNonNegativeInteger(building.basementFloors);

  return {
    ...(aboveGroundFloors !== undefined ? { aboveGroundFloors } : {}),
    ...(basementFloors !== undefined ? { basementFloors } : {}),
    ...(building.floorCountSource
      ? { floorCountSource: building.floorCountSource }
      : {}),
  };
}

function getPreferredHeightMetadata(building, properties) {
  const manualHeightMeters =
    getPositiveFiniteNumber(properties.displayHeightMeters) ??
    getPositiveFiniteNumber(properties.heightMeters);

  if (manualHeightMeters !== undefined) {
    return {
      displayHeightMeters: manualHeightMeters,
      heightSource: "manual-height",
    };
  }

  const osmHeightMeters = getPositiveFiniteNumber(properties.osmHeightMeters);

  if (osmHeightMeters !== undefined) {
    return {
      displayHeightMeters: osmHeightMeters,
      heightSource: "osm-height",
    };
  }

  const osmBuildingLevels = getPositiveInteger(properties.osmBuildingLevels);

  if (osmBuildingLevels !== undefined) {
    return {
      displayHeightMeters: osmBuildingLevels * METERS_PER_OFFICIAL_FLOOR,
      heightSource: "osm-building-levels",
    };
  }

  const officialFloors = getPositiveInteger(building.aboveGroundFloors);

  if (officialFloors !== undefined) {
    return {
      displayHeightMeters: officialFloors * METERS_PER_OFFICIAL_FLOOR,
      heightSource: "official-floor-count",
    };
  }

  return {};
}

function getHeightMetadata(building, reviewedFeature) {
  if (
    building.kind !== "building" ||
    !reviewedFeature ||
    !isPolygonalGeometry(reviewedFeature.geometry)
  ) {
    return {};
  }

  const properties = reviewedFeature.properties ?? {};

  return {
    ...getOfficialFloorMetadata(building),
    ...getPreferredHeightMetadata(building, properties),
  };
}

function combineOsmGeometries(osmFeatures) {
  if (osmFeatures.length === 1) {
    return osmFeatures[0].geometry;
  }

  return {
    type: "MultiPolygon",
    coordinates: osmFeatures.flatMap((feature) => {
      if (feature.geometry.type === "Polygon") {
        return [feature.geometry.coordinates];
      }

      if (feature.geometry.type === "MultiPolygon") {
        return feature.geometry.coordinates;
      }

      return [];
    }),
  };
}

function getSharedPositiveFeatureNumber(osmFeatures, propertyName) {
  const values = osmFeatures.map((feature) =>
    getPositiveFiniteNumber(feature.properties?.[propertyName]),
  );

  if (values.some((value) => value === undefined)) {
    return undefined;
  }

  const [firstValue] = values;

  return values.every((value) => value === firstValue) ? firstValue : undefined;
}

function featureFromManual(building, manualFeature) {
  const properties = manualFeature.properties ?? {};
  const confidence = normalizeConfidence(properties.geometryConfidence, "verified");

  return buildGeometryFeatureForCatalogEntry(building, {
    type: "Feature",
    properties: {
      geometrySource: "manual",
      geometryConfidence: confidence,
      sourceUrl: properties.sourceUrl ?? null,
      displayHeightMeters: properties.displayHeightMeters,
      heightMeters: properties.heightMeters,
    },
    geometry: manualFeature.geometry,
  });
}

function featureFromOsmMatch(building, match, osmFeaturesById) {
  const osmIds = getOsmIdsForMatch(match);
  const osmFeatures = osmIds
    .map((osmId) => osmFeaturesById.get(osmId))
    .filter(Boolean);

  if (osmFeatures.length === 0) {
    return undefined;
  }

  const confidence = normalizeConfidence(
    match.geometryConfidence ?? match.confidence ?? match.reviewStatus,
    "estimated",
  );

  return buildGeometryFeatureForCatalogEntry(building, {
    type: "Feature",
    properties: {
      geometrySource: "openstreetmap",
      geometryConfidence: confidence,
      osmIds: osmFeatures.map((feature) => feature.properties.osmId),
      osmHeightMeters: getSharedPositiveFeatureNumber(osmFeatures, "osmHeightMeters"),
      osmBuildingLevels: getSharedPositiveFeatureNumber(osmFeatures, "osmBuildingLevels"),
      sourceUrl:
        osmFeatures.length === 1 ? osmFeatures[0].properties.sourceUrl : null,
      matchMethod: match.matchMethod ?? null,
    },
    geometry: combineOsmGeometries(osmFeatures),
  });
}

export function buildGeometryFeatureForCatalogEntry(building, reviewedFeature) {
  if (reviewedFeature) {
    const properties = reviewedFeature.properties ?? {};

    return {
      type: "Feature",
      properties: {
        ...commonProperties(
          building,
          properties.geometrySource,
          properties.geometryConfidence,
        ),
        sourceUrl: properties.sourceUrl ?? null,
        osmIds: properties.osmIds ?? undefined,
        matchMethod: properties.matchMethod ?? null,
        ...getHeightMetadata(building, reviewedFeature),
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
      sourceUrl: building.officialPoint.geometrySource?.url ?? null,
      matchMethod: "official-campus-map-point",
    },
    geometry: {
      type: "Point",
      coordinates: building.officialPoint.coordinates,
    },
  };
}

function buildGeometryCollection(catalogBuildings, osmFeatures, manualFeatures, matches) {
  const osmFeaturesById = new Map(
    osmFeatures.map((feature) => [feature.properties?.osmId, feature]),
  );
  const manualIndex = buildManualIndex(manualFeatures);
  const matchIndex = buildMatchIndex(matches);
  const features = [];
  const missing = [];
  const officialPointFallbacks = [];
  const usedOsmIds = new Set();

  for (const building of catalogBuildings) {
    const manualFeature = findManualFeatureForBuilding(building, manualIndex);

    if (manualFeature) {
      features.push(featureFromManual(building, manualFeature));
      continue;
    }

    const match = findMatchForBuilding(building, matchIndex);
    const osmFeature = match
      ? featureFromOsmMatch(building, match, osmFeaturesById)
      : undefined;

    if (osmFeature) {
      features.push(osmFeature);
      for (const osmId of osmFeature.properties.osmIds ?? []) {
        usedOsmIds.add(osmId);
      }
      continue;
    }

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
  }

  return { features, missing, usedOsmIds, officialPointFallbacks };
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

function buildEnrichedReviewCsv(osmFeatures, matches, catalogBuildings) {
  const catalogByCode = new Map(
    catalogBuildings.map((building) => [building.officialCode, building]),
  );
  const matchesByOsmId = new Map();

  for (const match of matches) {
    for (const osmId of getOsmIdsForMatch(match)) {
      matchesByOsmId.set(osmId, match);
    }
  }

  const headers = [
    "osmId",
    "osmName",
    "osmNameKo",
    "osmNameEn",
    "building",
    "osmHeightMeters",
    "osmBuildingLevels",
    "sourceUrl",
    "reviewStatus",
    "matchedOfficialCode",
    "matchedCatalogName",
    "notes",
  ];
  const rows = osmFeatures.map((feature) => {
    const match = matchesByOsmId.get(feature.properties.osmId);
    const building = match ? catalogByCode.get(match.officialCode) : undefined;

    return [
      feature.properties.osmId,
      feature.properties.osmName,
      feature.properties.osmNameKo,
      feature.properties.osmNameEn,
      feature.properties.building,
      feature.properties.osmHeightMeters,
      feature.properties.osmBuildingLevels,
      feature.properties.sourceUrl,
      match?.reviewStatus ?? "unreviewed",
      match?.officialCode ?? "",
      building?.name ?? match?.catalogName ?? "",
      match?.notes ?? "",
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

export function getStrictMappingFailureMessage(report) {
  if (!report.strict) {
    return null;
  }

  if (report.missingCount > 0) {
    return `Strict mapping failed: ${report.missingCount} catalog entries need reviewed geometries.`;
  }

  if (
    report.officialPointFallbackCount > 0 &&
    !report.officialPointFallbackAcceptanceAllowed
  ) {
    return `Strict mapping failed: ${report.officialPointFallbackCount} official campus-map point fallbacks require --allow-official-point-fallbacks.`;
  }

  return null;
}

export async function buildYeungnamBuildingGeometries({
  strict = false,
  allowOfficialPointFallbacks = false,
  outputGeoJsonUrl = OUTPUT_GEOJSON_URL,
  reportUrl = REPORT_URL,
  reviewCsvUrl = REVIEW_CSV_URL,
} = {}) {
  const [catalog, osmGeoJson] = await Promise.all([
    readJson(CATALOG_URL),
    readJson(OSM_GEOJSON_URL),
  ]);
  const catalogBuildings = getCatalogBuildings(catalog);
  const osmFeatures = asArray(osmGeoJson.features);
  const { matchesJson, manualGeoJson, created } = await ensureReviewInputs(
    catalogBuildings,
    osmFeatures,
  );
  const matches = getMatches(matchesJson);
  const manualFeatures = asArray(manualGeoJson.features);
  const { features, missing, usedOsmIds, officialPointFallbacks } =
    buildGeometryCollection(
    catalogBuildings,
    osmFeatures,
    manualFeatures,
    matches,
    );
  const unmatchedOsmFeatures = osmFeatures.filter(
    (feature) => !usedOsmIds.has(feature.properties?.osmId),
  );
  const generatedAt =
    typeof catalog.metadata?.generatedAt === "string"
      ? catalog.metadata.generatedAt
      : new Date().toISOString();
  const campusIds = Array.from(
    new Set(catalogBuildings.map((building) => building.campusId).filter(Boolean)),
  ).sort();
  const featureCollection = {
    type: "FeatureCollection",
    metadata: {
      generatedAt,
      schoolId: "yeungnam",
      campusIds,
      catalogSource: CATALOG_PATH,
      osmSource: OSM_GEOJSON_PATH,
      matchSource: MATCHES_PATH,
      manualGeometrySource: MANUAL_GEOJSON_PATH,
    },
    features,
  };
  const report = {
    generatedAt,
    strict,
    sources: {
      catalog: CATALOG_PATH,
      osmBuildings: OSM_GEOJSON_PATH,
      matches: MATCHES_PATH,
      manualGeometries: MANUAL_GEOJSON_PATH,
      outputGeometries: OUTPUT_GEOJSON_PATH,
    },
    createdReviewInputs: created,
    catalogEntries: catalogBuildings.length,
    osmFootprints: osmFeatures.length,
    manualFeatures: manualFeatures.length,
    matchEntries: matches.length,
    mappedGeometries: features.length,
    officialPointFallbackCount: officialPointFallbacks.length,
    officialPointFallbackAcceptanceAllowed: allowOfficialPointFallbacks,
    officialPointFallbacks,
    missingCount: missing.length,
    unmatchedOsmFootprints: unmatchedOsmFeatures.length,
    missingCatalogEntries: missing,
    unmatchedOsmNamedFootprints: unmatchedOsmFeatures
      .filter((feature) =>
        [feature.properties?.osmName, feature.properties?.osmNameKo, feature.properties?.osmNameEn].some(Boolean),
      )
      .map((feature) => ({
        osmId: feature.properties.osmId,
        osmName: feature.properties.osmName,
        osmNameKo: feature.properties.osmNameKo,
        osmNameEn: feature.properties.osmNameEn,
        sourceUrl: feature.properties.sourceUrl,
      })),
    ambiguousAutoMatches: asArray(matchesJson.ambiguous),
  };

  const reviewCsv = `${buildEnrichedReviewCsv(osmFeatures, matches, catalogBuildings)}\n`;
  const strictFailureMessage = getStrictMappingFailureMessage(report);

  if (strictFailureMessage) {
    await Promise.all([
      writeJson(reportUrl, report),
      writeText(reviewCsvUrl, reviewCsv),
    ]);
    throw new Error(strictFailureMessage);
  }

  await Promise.all([
    writeJson(outputGeoJsonUrl, featureCollection),
    writeJson(reportUrl, report),
    writeText(reviewCsvUrl, reviewCsv),
  ]);

  return { featureCollection, report };
}

async function main() {
  const strict = process.argv.includes("--strict");
  const allowOfficialPointFallbacks = process.argv.includes(
    "--allow-official-point-fallbacks",
  );
  const { report } = await buildYeungnamBuildingGeometries({
    strict,
    allowOfficialPointFallbacks,
  });

  console.log(
    `Wrote ${report.mappedGeometries} mapped geometries to ${fileURLToPath(
      OUTPUT_GEOJSON_URL,
    )}`,
  );
  console.log(
    `Catalog entries: ${report.catalogEntries}; missing: ${report.missingCount}; official point fallbacks: ${report.officialPointFallbackCount}; unmatched OSM footprints: ${report.unmatchedOsmFootprints}`,
  );
}

if (isMainModule()) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
