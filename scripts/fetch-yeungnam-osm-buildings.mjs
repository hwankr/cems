import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
export const BBOX = {
  south: 35.8255,
  west: 128.7465,
  north: 35.8395,
  east: 128.7705,
};

const GEOJSON_OUTPUT_URL = new URL(
  "../data/raw/yeungnam-osm-buildings.geojson",
  import.meta.url,
);
const REVIEW_OUTPUT_URL = new URL(
  "../data/raw/yeungnam-osm-building-review.csv",
  import.meta.url,
);
const USER_AGENT =
  "cems-data-pipeline/0.1 (Yeungnam OSM building mapping; local development)";

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

export function buildOverpassQuery() {
  return `
[out:json][timeout:45];
way["building"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
out body;
>;
out skel qt;
`.trim();
}

function closeRing(coordinates) {
  if (coordinates.length === 0) {
    return coordinates;
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  if (first[0] === last[0] && first[1] === last[1]) {
    return coordinates;
  }

  return [...coordinates, first];
}

function parsePositiveNumber(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const match = String(value)
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*(?:m|meter|meters)?$/i);

  if (!match) {
    return undefined;
  }

  const number = Number(match[1]);

  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function parsePositiveInteger(value) {
  const number = parsePositiveNumber(value);

  return Number.isInteger(number) ? number : undefined;
}

function wayToFeature(way, nodesById) {
  const coordinates = [];

  for (const nodeId of way.nodes ?? []) {
    const node = nodesById.get(nodeId);

    if (!node) {
      return undefined;
    }

    coordinates.push([node.lon, node.lat]);
  }

  const ring = closeRing(coordinates);

  if (ring.length < 4) {
    return undefined;
  }

  const tags = way.tags ?? {};
  const osmId = `way/${way.id}`;
  const osmHeightMeters = parsePositiveNumber(tags.height);
  const osmBuildingLevels = parsePositiveInteger(tags["building:levels"]);

  return {
    type: "Feature",
    properties: {
      osmId,
      osmName: tags.name ?? null,
      osmNameEn: tags["name:en"] ?? null,
      osmNameKo: tags["name:ko"] ?? null,
      building: tags.building ?? null,
      ...(osmHeightMeters !== undefined ? { osmHeightMeters } : {}),
      ...(osmBuildingLevels !== undefined ? { osmBuildingLevels } : {}),
      sourceUrl: `https://www.openstreetmap.org/way/${way.id}`,
    },
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}

export function overpassJsonToGeoJson(overpassJson) {
  const elements = overpassJson.elements ?? [];
  const nodesById = new Map(
    elements
      .filter((element) => element.type === "node")
      .map((node) => [node.id, node]),
  );
  const features = elements
    .filter((element) => element.type === "way" && element.tags?.building)
    .map((way) => wayToFeature(way, nodesById))
    .filter(Boolean)
    .sort((left, right) =>
      left.properties.osmId.localeCompare(right.properties.osmId, "en", {
        numeric: true,
      }),
    );

  return {
    type: "FeatureCollection",
    metadata: {
      generatedAt: new Date().toISOString(),
      sourceUrl: OVERPASS_URL,
      query: buildOverpassQuery(),
      bbox: BBOX,
    },
    features,
  };
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

export function buildReviewCsv(features) {
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
  const rows = features.map((feature) => [
    feature.properties.osmId,
    feature.properties.osmName,
    feature.properties.osmNameKo,
    feature.properties.osmNameEn,
    feature.properties.building,
    feature.properties.osmHeightMeters,
    feature.properties.osmBuildingLevels,
    feature.properties.sourceUrl,
    "unreviewed",
    "",
    "",
    "",
  ]);

  return [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

async function fetchOverpassBuildings() {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": USER_AGENT,
    },
    body: new URLSearchParams({
      data: buildOverpassQuery(),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Overpass request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

async function main() {
  const overpassJson = await fetchOverpassBuildings();
  const geojson = overpassJsonToGeoJson(overpassJson);

  if (geojson.features.length < 30) {
    throw new Error(
      `Expected at least 30 OSM building footprints, found ${geojson.features.length}`,
    );
  }

  await mkdir(dirname(fileURLToPath(GEOJSON_OUTPUT_URL)), { recursive: true });
  await writeFile(GEOJSON_OUTPUT_URL, `${JSON.stringify(geojson, null, 2)}\n`, "utf8");
  await writeFile(REVIEW_OUTPUT_URL, `${buildReviewCsv(geojson.features)}\n`, "utf8");

  console.log(
    `Wrote ${geojson.features.length} OSM building footprints to ${fileURLToPath(
      GEOJSON_OUTPUT_URL,
    )}`,
  );
  console.log(`Wrote OSM review CSV to ${fileURLToPath(REVIEW_OUTPUT_URL)}`);
}

if (isMainModule()) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
