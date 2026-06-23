import buildingCatalog from "./yeungnam-building-catalog.json";
import buildingGeometries from "./yeungnam-building-geometries.json";
import { getGeometryCenter } from "../domain/geojson";
import type {
  BuildingHeightSource,
  CampusPlaceKind,
  Coordinate,
  EnergySubject,
  FloorCountSource,
  GeometryConfidence,
  GeometrySource,
  GeometrySourceKind,
  SubjectGeometry,
} from "../domain/types";

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

export type YeungnamBuildingSubject = EnergySubject & {
  campusPlaceKind: CampusPlaceKind;
  nameKo?: string;
  nameEn?: string;
};

type GeneratedGeometryFeature = {
  properties: {
    subjectId?: string;
    officialCode?: string;
    geometrySource: string;
    geometryConfidence: string;
    sourceUrl?: string;
    displayHeightMeters?: number;
    aboveGroundFloors?: number;
    basementFloors?: number;
    floorCountSource?: string;
    heightSource?: string;
  };
  geometry: {
    type: string;
    coordinates: unknown;
  };
};

const catalogBuildings = readCatalogBuildings(buildingCatalog);
const geometryFeatures = readGeneratedGeometryFeatures(buildingGeometries);

const catalogById = new Map(catalogBuildings.map((building) => [building.id, building]));
const catalogByOfficialCode = new Map(
  catalogBuildings
    .filter((building): building is CatalogBuilding & { officialCode: string } =>
      Boolean(building.officialCode),
    )
    .map((building) => [building.officialCode, building]),
);
const geometryBySubjectId = createGeometryBySubjectId(geometryFeatures);
const geometryByOfficialCode = createGeometryByOfficialCode(geometryFeatures);

export const yeungnamBuildingSubjects: YeungnamBuildingSubject[] =
  catalogBuildings.map((catalogBuilding) => {
    const geometry =
      geometryBySubjectId.get(catalogBuilding.id) ??
      (catalogBuilding.officialCode
        ? geometryByOfficialCode.get(catalogBuilding.officialCode)
        : undefined);
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
      ...(catalogBuilding.officialCode
        ? { officialCode: catalogBuilding.officialCode }
        : {}),
      campusPlaceKind: catalogBuilding.kind,
    };
  });

function createGeometryBySubjectId(features: GeneratedGeometryFeature[]) {
  const geometriesBySubjectId = new Map<string, SubjectGeometry>();

  features.forEach((feature) => {
    const subjectId = feature.properties.subjectId;

    if (!subjectId) {
      return;
    }

    if (!catalogById.has(subjectId)) {
      throw new Error(
        `Unknown Yeungnam subject id in generated geometry: ${subjectId}`,
      );
    }

    if (geometriesBySubjectId.has(subjectId)) {
      throw new Error(
        `Duplicate Yeungnam geometry feature for subject id: ${subjectId}`,
      );
    }

    geometriesBySubjectId.set(subjectId, createSubjectGeometry(feature));
  });

  return geometriesBySubjectId;
}

function createGeometryByOfficialCode(features: GeneratedGeometryFeature[]) {
  const geometriesByOfficialCode = new Map<string, SubjectGeometry>();

  features.forEach((feature) => {
    const officialCode = feature.properties.officialCode;

    if (!officialCode || feature.properties.subjectId) {
      return;
    }

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
  const context = geometryFeatureContext(feature);
  const geometrySource = createGeometrySource(feature);
  const geometryConfidence = toGeometryConfidence(
    feature.properties.geometryConfidence,
    context,
  );

  switch (feature.geometry.type) {
    case "Point":
      rejectPointHeightMetadata(feature, context);

      return {
        type: "Point",
        coordinates: toCoordinate(
          feature.geometry.coordinates,
          context,
        ),
        geometrySource,
        geometryConfidence,
      };
    case "Polygon":
      return {
        type: "Polygon",
        coordinates: toPolygonCoordinates(
          feature.geometry.coordinates,
          context,
        ),
        geometrySource,
        geometryConfidence,
        ...createBuildingHeightMetadata(feature, context),
      };
    case "MultiPolygon":
      return {
        type: "MultiPolygon",
        coordinates: toMultiPolygonCoordinates(
          feature.geometry.coordinates,
          context,
        ),
        geometrySource,
        geometryConfidence,
        ...createBuildingHeightMetadata(feature, context),
      };
    default:
      throw new Error(
        `Unsupported Yeungnam geometry type for ${context}: ${feature.geometry.type}`,
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
  const officialCode = readOptionalString(
    building,
    "officialCode",
    `Invalid Yeungnam catalog building at index ${index}`,
  );
  const context = officialCode
    ? `Invalid Yeungnam catalog building ${officialCode} at index ${index}`
    : `Invalid Yeungnam catalog building at index ${index}`;

  return {
    id: readRequiredString(building, "id", context),
    schoolId: readRequiredString(building, "schoolId", context),
    campusId: readRequiredString(building, "campusId", context),
    ...(officialCode ? { officialCode } : {}),
    officialMapUuid: readOptionalString(building, "officialMapUuid", context),
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
  const subjectId = readOptionalString(
    properties,
    "subjectId",
    `Invalid Yeungnam geometry feature at index ${index} properties`,
  );
  const officialCode = readOptionalString(
    properties,
    "officialCode",
    `Invalid Yeungnam geometry feature at index ${index} properties`,
  );
  if (!subjectId && !officialCode) {
    throw new Error(
      `Invalid Yeungnam geometry feature at index ${index} properties: expected subjectId or officialCode.`,
    );
  }

  const context = `Invalid Yeungnam geometry feature ${subjectId ?? officialCode} at index ${index}`;
  const geometry = toRecord(feature.geometry, `${context} geometry`);

  if (!("coordinates" in geometry)) {
    throw new Error(`${context} geometry: expected coordinates.`);
  }

  return {
    properties: {
      ...(subjectId ? { subjectId } : {}),
      ...(officialCode ? { officialCode } : {}),
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
      displayHeightMeters: readOptionalFiniteNumber(
        properties,
        "displayHeightMeters",
        `${context} properties`,
      ),
      aboveGroundFloors: readOptionalFiniteNumber(
        properties,
        "aboveGroundFloors",
        `${context} properties`,
      ),
      basementFloors: readOptionalFiniteNumber(
        properties,
        "basementFloors",
        `${context} properties`,
      ),
      floorCountSource: readOptionalString(
        properties,
        "floorCountSource",
        `${context} properties`,
      ),
      heightSource: readOptionalString(
        properties,
        "heightSource",
        `${context} properties`,
      ),
    },
    geometry: {
      type: readRequiredString(geometry, "type", `${context} geometry`),
      coordinates: geometry.coordinates,
    },
  };
}

function readOptionalFiniteNumber(
  record: Record<string, unknown>,
  field: string,
  context: string,
): number | undefined {
  const value = record[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${context}: expected finite number ${field}.`);
  }

  return value;
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
    geometryFeatureContext(feature),
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
  context: string,
): GeometrySourceKind {
  switch (value) {
    case "official-campus-map":
    case "openstreetmap":
    case "public-data":
    case "manual":
      return value;
    default:
      throw new Error(
        `Unsupported Yeungnam geometry source for ${context}: ${value}`,
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
  context: string,
): GeometryConfidence {
  switch (value) {
    case "verified":
    case "estimated":
    case "needs-review":
      return value;
    default:
      throw new Error(
        `Unsupported Yeungnam geometry confidence for ${context}: ${value}`,
      );
  }
}

function createBuildingHeightMetadata(
  feature: GeneratedGeometryFeature,
  context: string,
): Pick<
  Exclude<SubjectGeometry, { type: "Point" }>,
  | "displayHeightMeters"
  | "aboveGroundFloors"
  | "basementFloors"
  | "floorCountSource"
  | "heightSource"
> {
  const {
    displayHeightMeters,
    aboveGroundFloors,
    basementFloors,
    floorCountSource,
    heightSource,
  } = feature.properties;
  const metadata: Pick<
    Exclude<SubjectGeometry, { type: "Point" }>,
    | "displayHeightMeters"
    | "aboveGroundFloors"
    | "basementFloors"
    | "floorCountSource"
    | "heightSource"
  > = {};

  if (displayHeightMeters !== undefined) {
    if (displayHeightMeters <= 0) {
      throw new Error(
        `${context} properties: expected positive finite displayHeightMeters.`,
      );
    }

    metadata.displayHeightMeters = displayHeightMeters;
  }

  if (aboveGroundFloors !== undefined) {
    if (!Number.isInteger(aboveGroundFloors) || aboveGroundFloors <= 0) {
      throw new Error(
        `${context} properties: expected positive integer aboveGroundFloors.`,
      );
    }

    metadata.aboveGroundFloors = aboveGroundFloors;
  }

  if (basementFloors !== undefined) {
    if (!Number.isInteger(basementFloors) || basementFloors < 0) {
      throw new Error(
        `${context} properties: expected non-negative integer basementFloors.`,
      );
    }

    metadata.basementFloors = basementFloors;
  }

  if (floorCountSource !== undefined) {
    if (aboveGroundFloors === undefined) {
      throw new Error(
        `${context} properties: expected aboveGroundFloors with floorCountSource.`,
      );
    }

    metadata.floorCountSource = toFloorCountSource(floorCountSource, context);
  }

  if (heightSource !== undefined) {
    if (displayHeightMeters === undefined) {
      throw new Error(
        `${context} properties: expected displayHeightMeters with heightSource.`,
      );
    }

    metadata.heightSource = toBuildingHeightSource(heightSource, context);
  }

  if (displayHeightMeters !== undefined && heightSource === undefined) {
    throw new Error(
      `${context} properties: expected heightSource with displayHeightMeters.`,
    );
  }

  return metadata;
}

function rejectPointHeightMetadata(
  feature: GeneratedGeometryFeature,
  context: string,
) {
  const {
    displayHeightMeters,
    aboveGroundFloors,
    basementFloors,
    floorCountSource,
    heightSource,
  } = feature.properties;

  if (
    displayHeightMeters !== undefined ||
    aboveGroundFloors !== undefined ||
    basementFloors !== undefined ||
    floorCountSource !== undefined ||
    heightSource !== undefined
  ) {
    throw new Error(
      `${context} properties: point geometry cannot include building height metadata.`,
    );
  }
}

function toFloorCountSource(
  value: string,
  context: string,
): FloorCountSource {
  switch (value) {
    case "official-bFloor":
    case "official-fList":
      return value;
    default:
      throw new Error(
        `Unsupported Yeungnam floor count source for ${context}: ${value}`,
      );
  }
}

function toBuildingHeightSource(
  value: string,
  context: string,
): BuildingHeightSource {
  switch (value) {
    case "official-floor-count":
    case "manual-height":
    case "osm-height":
    case "osm-building-levels":
      return value;
    default:
      throw new Error(
        `Unsupported Yeungnam building height source for ${context}: ${value}`,
      );
  }
}

function geometryFeatureContext(feature: GeneratedGeometryFeature) {
  return feature.properties.subjectId ?? feature.properties.officialCode ?? "unknown";
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
