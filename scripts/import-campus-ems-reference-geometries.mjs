#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const CATALOG_PATH =
  "src/features/campus-energy/data/yeungnam-building-catalog.json";
const CURRENT_GEOMETRIES_PATH =
  "src/features/campus-energy/data/yeungnam-building-geometries.json";
const OSM_GEOJSON_PATH = "data/raw/yeungnam-osm-buildings.geojson";
const MATCHES_PATH = "data/raw/yeungnam-building-matches.json";
const MANUAL_GEOJSON_PATH =
  "data/raw/yeungnam-manual-building-geometries.geojson";
const REFERENCE_GEOJSON_PATH =
  "data/reference/campus-ems-yu-buildings.geojson";

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

  return typeof value === "string" && value.trim()
    ? value.trim().toUpperCase()
    : undefined;
}

function isPolygonal(feature) {
  return feature?.geometry?.type === "Polygon" || feature?.geometry?.type === "MultiPolygon";
}

function isCurrentPointFallback(feature) {
  return feature?.geometry?.type === "Point";
}

function getCatalogIndex(catalog) {
  return new Map(
    asArray(catalog.buildings)
      .filter((building) => typeof building.officialCode === "string")
      .map((building) => [building.officialCode, building]),
  );
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

function referenceOsmId(feature) {
  const value = feature?.properties?.osm_id;

  if (typeof value === "number" && Number.isFinite(value)) {
    return `way/${value}`;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return `way/${value.trim()}`;
  }

  return undefined;
}

function referencePolygonSource(feature) {
  const value = feature?.properties?.polygon_source;

  return typeof value === "string" && value.trim() ? value.trim() : "unknown";
}

function isCampusEmsReferenceMethod(value) {
  return (
    typeof value === "string" && value.startsWith("campus-ems-reference-")
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

    if (referencePolygonSource(referenceFeature) === "fallback_square") {
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
    const polygonSource = referencePolygonSource(referenceFeature);
    const catalogBuilding = officialCode ? catalogByCode.get(officialCode) : undefined;
    const currentFeature = officialCode ? currentByCode.get(officialCode) : undefined;

    if (
      !officialCode ||
      !catalogBuilding ||
      !currentFeature ||
      !isCurrentPointFallback(currentFeature) ||
      !isPolygonal(referenceFeature)
    ) {
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
    const osmId = referenceOsmId(referenceFeature);

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
        notes:
          "Imported from local campus-ems reference GeoJSON because it maps this current point fallback to a non-fallback polygon.",
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
  const [
    catalog,
    currentGeometries,
    currentOsmGeoJson,
    matchesJson,
    manualGeoJson,
    referenceGeoJson,
  ] = await Promise.all([
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

  matchesJson.matches = [...asArray(matchesJson.matches), ...result.matches].sort(
    (left, right) =>
      String(left.officialCode).localeCompare(String(right.officialCode), "en", {
        numeric: true,
      }),
  );
  manualGeoJson.features = [
    ...asArray(manualGeoJson.features),
    ...result.manualFeatures,
  ];
  const totalReferenceMatchCount = matchesJson.matches.filter((match) =>
    isCampusEmsReferenceMethod(match.matchMethod),
  ).length;
  const totalReferenceManualFeatureCount = manualGeoJson.features.filter((feature) =>
    isCampusEmsReferenceMethod(feature.properties?.matchMethod),
  ).length;
  matchesJson.metadata = {
    ...matchesJson.metadata,
    campusEmsReferenceImport: {
      importedMatchCount: totalReferenceMatchCount,
      importedManualFeatureCount: totalReferenceManualFeatureCount,
      lastRunImportedMatchCount: result.matches.length,
      lastRunImportedManualFeatureCount: result.manualFeatures.length,
      excludedFallbackSquareCount: result.excludedFallbackSquares.length,
    },
  };
  manualGeoJson.metadata = {
    ...manualGeoJson.metadata,
    campusEmsReferenceImport: {
      importedManualFeatureCount: totalReferenceManualFeatureCount,
      lastRunImportedManualFeatureCount: result.manualFeatures.length,
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
