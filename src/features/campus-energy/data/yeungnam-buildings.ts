import buildingCatalog from "./yeungnam-building-catalog.json";
import buildingGeometries from "./yeungnam-building-geometries.json";
import { getGeometryCenter } from "../domain/geojson";
import type {
  CampusPlaceKind,
  Coordinate,
  EnergySubject,
  GeometryConfidence,
  GeometrySource,
  GeometrySourceKind,
  SubjectGeometry,
} from "../domain/types";

type CatalogBuilding = {
  id: string;
  schoolId: string;
  campusId: string;
  officialCode: string;
  name: string;
  nameKo?: string;
  nameEn?: string;
  shortName: string;
  kind: CampusPlaceKind;
};

export type YeungnamBuildingSubject = EnergySubject & {
  campusPlaceKind: CampusPlaceKind;
  nameKo?: string;
  nameEn?: string;
};

type GeneratedGeometryFeature = {
  properties: {
    officialCode: string;
    geometrySource: string;
    geometryConfidence: string;
    sourceUrl?: string;
  };
  geometry: {
    type: string;
    coordinates: unknown;
  };
};

const catalogBuildings = readCatalogBuildings(buildingCatalog);
const geometryFeatures = readGeneratedGeometryFeatures(buildingGeometries);

const catalogByOfficialCode = new Map(
  catalogBuildings.map((building) => [building.officialCode, building]),
);
const geometryByOfficialCode = createGeometryByOfficialCode(geometryFeatures);

export const yeungnamBuildingSubjects: YeungnamBuildingSubject[] =
  catalogBuildings.map((catalogBuilding) => {
    const geometry = geometryByOfficialCode.get(catalogBuilding.officialCode);
    const center = geometry ? getGeometryCenter(geometry) : undefined;

    return {
      id: catalogBuilding.id,
      schoolId: catalogBuilding.schoolId,
      campusId: catalogBuilding.campusId,
      type: catalogBuilding.kind,
      name: catalogBuilding.name,
      ...(catalogBuilding.nameKo ? { nameKo: catalogBuilding.nameKo } : {}),
      ...(catalogBuilding.nameEn ? { nameEn: catalogBuilding.nameEn } : {}),
      shortName: catalogBuilding.shortName,
      ...(center ? { lng: center[0], lat: center[1] } : {}),
      ...(geometry ? { geometry } : {}),
      officialCode: catalogBuilding.officialCode,
      campusPlaceKind: catalogBuilding.kind,
    };
  });

function createGeometryByOfficialCode(features: GeneratedGeometryFeature[]) {
  const geometriesByOfficialCode = new Map<string, SubjectGeometry>();

  features.forEach((feature) => {
    const officialCode = feature.properties.officialCode;

    if (!catalogByOfficialCode.has(officialCode)) {
      throw new Error(
        `Unknown Yeungnam building official code in generated geometry: ${officialCode}`,
      );
    }

    if (geometriesByOfficialCode.has(officialCode)) {
      throw new Error(
        `Duplicate Yeungnam geometry feature for official code: ${officialCode}`,
      );
    }

    geometriesByOfficialCode.set(officialCode, createSubjectGeometry(feature));
  });

  return geometriesByOfficialCode;
}

function createSubjectGeometry(feature: GeneratedGeometryFeature): SubjectGeometry {
  const geometrySource = createGeometrySource(feature);
  const geometryConfidence = toGeometryConfidence(
    feature.properties.geometryConfidence,
    feature.properties.officialCode,
  );

  switch (feature.geometry.type) {
    case "Point":
      return {
        type: "Point",
        coordinates: toCoordinate(
          feature.geometry.coordinates,
          feature.properties.officialCode,
        ),
        geometrySource,
        geometryConfidence,
      };
    case "Polygon":
      return {
        type: "Polygon",
        coordinates: toPolygonCoordinates(
          feature.geometry.coordinates,
          feature.properties.officialCode,
        ),
        geometrySource,
        geometryConfidence,
      };
    case "MultiPolygon":
      return {
        type: "MultiPolygon",
        coordinates: toMultiPolygonCoordinates(
          feature.geometry.coordinates,
          feature.properties.officialCode,
        ),
        geometrySource,
        geometryConfidence,
      };
    default:
      throw new Error(
        `Unsupported Yeungnam geometry type for ${feature.properties.officialCode}: ${feature.geometry.type}`,
      );
  }
}

function readCatalogBuildings(value: unknown): CatalogBuilding[] {
  const root = toRecord(value, "Invalid Yeungnam building catalog root");

  if (!Array.isArray(root.buildings)) {
    throw new Error(
      "Invalid Yeungnam building catalog root: expected buildings array.",
    );
  }

  return root.buildings.map(readCatalogBuilding);
}

function readCatalogBuilding(value: unknown, index: number): CatalogBuilding {
  const building = toRecord(
    value,
    `Invalid Yeungnam catalog building at index ${index}`,
  );
  const officialCode = readRequiredString(
    building,
    "officialCode",
    `Invalid Yeungnam catalog building at index ${index}`,
  );
  const context = `Invalid Yeungnam catalog building ${officialCode} at index ${index}`;

  return {
    id: readRequiredString(building, "id", context),
    schoolId: readRequiredString(building, "schoolId", context),
    campusId: readRequiredString(building, "campusId", context),
    officialCode,
    name: readRequiredString(building, "name", context),
    nameKo: readOptionalString(building, "nameKo", context),
    nameEn: readOptionalString(building, "nameEn", context),
    shortName: readRequiredString(building, "shortName", context),
    kind: readCampusPlaceKind(
      readRequiredString(building, "kind", context),
      context,
    ),
  };
}

function readCampusPlaceKind(
  value: string,
  context: string,
): CampusPlaceKind {
  switch (value) {
    case "building":
    case "landmark":
    case "outdoor":
    case "utility":
      return value;
    default:
      throw new Error(`${context}: unsupported campus place kind ${value}.`);
  }
}

function readGeneratedGeometryFeatures(
  value: unknown,
): GeneratedGeometryFeature[] {
  const root = toRecord(value, "Invalid Yeungnam building geometries root");

  if (!Array.isArray(root.features)) {
    throw new Error(
      "Invalid Yeungnam building geometries root: expected features array.",
    );
  }

  return root.features.map(readGeneratedGeometryFeature);
}

function readGeneratedGeometryFeature(
  value: unknown,
  index: number,
): GeneratedGeometryFeature {
  const feature = toRecord(
    value,
    `Invalid Yeungnam geometry feature at index ${index}`,
  );
  const properties = toRecord(
    feature.properties,
    `Invalid Yeungnam geometry feature at index ${index} properties`,
  );
  const officialCode = readRequiredString(
    properties,
    "officialCode",
    `Invalid Yeungnam geometry feature at index ${index} properties`,
  );
  const context = `Invalid Yeungnam geometry feature ${officialCode} at index ${index}`;
  const geometry = toRecord(feature.geometry, `${context} geometry`);

  if (!("coordinates" in geometry)) {
    throw new Error(`${context} geometry: expected coordinates.`);
  }

  return {
    properties: {
      officialCode,
      geometrySource: readRequiredString(
        properties,
        "geometrySource",
        `${context} properties`,
      ),
      geometryConfidence: readRequiredString(
        properties,
        "geometryConfidence",
        `${context} properties`,
      ),
      sourceUrl: readOptionalString(
        properties,
        "sourceUrl",
        `${context} properties`,
      ),
    },
    geometry: {
      type: readRequiredString(geometry, "type", `${context} geometry`),
      coordinates: geometry.coordinates,
    },
  };
}

function toRecord(
  value: unknown,
  context: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${context}: expected object.`);
  }

  return value as Record<string, unknown>;
}

function readRequiredString(
  record: Record<string, unknown>,
  field: string,
  context: string,
): string {
  const value = record[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${context}: expected string ${field}.`);
  }

  return value;
}

function readOptionalString(
  record: Record<string, unknown>,
  field: string,
  context: string,
): string | undefined {
  const value = record[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${context}: expected string ${field}.`);
  }

  return value;
}

function createGeometrySource(feature: GeneratedGeometryFeature): GeometrySource {
  const kind = toGeometrySourceKind(
    feature.properties.geometrySource,
    feature.properties.officialCode,
  );
  const source: GeometrySource = {
    kind,
    name: getGeometrySourceName(kind),
  };

  if (feature.properties.sourceUrl) {
    source.url = feature.properties.sourceUrl;
  }

  return source;
}

function toGeometrySourceKind(
  value: string,
  officialCode: string,
): GeometrySourceKind {
  switch (value) {
    case "official-campus-map":
    case "openstreetmap":
    case "public-data":
    case "manual":
      return value;
    default:
      throw new Error(
        `Unsupported Yeungnam geometry source for ${officialCode}: ${value}`,
      );
  }
}

function getGeometrySourceName(kind: GeometrySourceKind) {
  switch (kind) {
    case "official-campus-map":
      return "Yeungnam University campus map";
    case "openstreetmap":
      return "OpenStreetMap";
    case "public-data":
      return "Public data";
    case "manual":
      return "Manual campus mapping";
    default:
      return assertNever(kind);
  }
}

function toGeometryConfidence(
  value: string,
  officialCode: string,
): GeometryConfidence {
  switch (value) {
    case "verified":
    case "estimated":
    case "needs-review":
      return value;
    default:
      throw new Error(
        `Unsupported Yeungnam geometry confidence for ${officialCode}: ${value}`,
      );
  }
}

function toMultiPolygonCoordinates(
  value: unknown,
  officialCode: string,
): Coordinate[][][] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid MultiPolygon coordinates for ${officialCode}.`);
  }

  return value.map((polygon) => toPolygonCoordinates(polygon, officialCode));
}

function toPolygonCoordinates(
  value: unknown,
  officialCode: string,
): Coordinate[][] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid Polygon coordinates for ${officialCode}.`);
  }

  return value.map((ring) => toLinearRing(ring, officialCode));
}

function toLinearRing(value: unknown, officialCode: string): Coordinate[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid linear ring coordinates for ${officialCode}.`);
  }

  return value.map((coordinate) => toCoordinate(coordinate, officialCode));
}

function toCoordinate(value: unknown, officialCode: string): Coordinate {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== "number" ||
    typeof value[1] !== "number"
  ) {
    throw new Error(`Invalid coordinate for ${officialCode}.`);
  }

  return [value[0], value[1]];
}

function assertNever(value: never): never {
  throw new Error(`Unsupported geometry source kind: ${value}`);
}
