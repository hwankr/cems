import type {
  BuildingHeightSource,
  Coordinate,
  EnergyComparison,
  EnergyStatus,
  EnergySubject,
  FloorCountSource,
  SubjectGeometry,
} from "./types";

type EnergySubjectFeatureGeometry = Pick<
  SubjectGeometry,
  "type" | "coordinates"
>;

export type EnergySubjectFeatureProperties = {
  id: string;
  name: string;
  shortName: string;
  type: EnergySubject["type"];
  status: EnergyStatus;
  deltaKwh: number;
  selected: boolean;
  officialCode?: string;
  displayHeightMeters?: number;
  aboveGroundFloors?: number;
  basementFloors?: number;
  floorCountSource?: FloorCountSource;
  heightSource?: BuildingHeightSource;
};

export type EnergySubjectFeature = {
  type: "Feature";
  geometry: EnergySubjectFeatureGeometry;
  properties: EnergySubjectFeatureProperties;
};

export type EnergySubjectFeatureCollection = {
  type: "FeatureCollection";
  features: EnergySubjectFeature[];
};

export function getGeometryCenter(geometry: SubjectGeometry): Coordinate {
  if (geometry.type === "Point") {
    return geometry.coordinates;
  }

  return averageCoordinates(flattenGeometryCoordinates(geometry));
}

export function getEnergySubjectCenter(
  subject: EnergySubject,
): Coordinate | undefined {
  if (subject.geometry) {
    return getGeometryCenter(subject.geometry);
  }

  if (typeof subject.lng === "number" && typeof subject.lat === "number") {
    return [subject.lng, subject.lat];
  }

  return undefined;
}

export function createEnergySubjectFeatureCollection(
  subjects: EnergySubject[],
  comparisons: EnergyComparison[],
  selectedSubjectId: string,
): EnergySubjectFeatureCollection {
  const comparisonsBySubjectId = new Map(
    comparisons.map((comparison) => [comparison.subjectId, comparison]),
  );

  return {
    type: "FeatureCollection",
    features: subjects.flatMap((subject) => {
      const geometry = getFeatureGeometry(subject);

      if (!geometry) {
        return [];
      }

      const comparison = comparisonsBySubjectId.get(subject.id);
      const properties: EnergySubjectFeatureProperties = {
        id: subject.id,
        name: subject.name,
        shortName: subject.shortName,
        type: subject.type,
        status: comparison?.status ?? "neutral",
        deltaKwh: comparison?.deltaKwh ?? 0,
        selected: subject.id === selectedSubjectId,
      };

      if (subject.officialCode !== undefined) {
        properties.officialCode = subject.officialCode;
      }

      if (subject.geometry && subject.geometry.type !== "Point") {
        attachHeightProperties(properties, subject.geometry);
      }

      return [{
        type: "Feature",
        geometry,
        properties,
      }];
    }),
  };
}

function attachHeightProperties(
  properties: EnergySubjectFeatureProperties,
  geometry: Exclude<SubjectGeometry, { type: "Point" }>,
) {
  if (geometry.displayHeightMeters !== undefined) {
    properties.displayHeightMeters = geometry.displayHeightMeters;
  }

  if (geometry.aboveGroundFloors !== undefined) {
    properties.aboveGroundFloors = geometry.aboveGroundFloors;
  }

  if (geometry.basementFloors !== undefined) {
    properties.basementFloors = geometry.basementFloors;
  }

  if (geometry.floorCountSource !== undefined) {
    properties.floorCountSource = geometry.floorCountSource;
  }

  if (geometry.heightSource !== undefined) {
    properties.heightSource = geometry.heightSource;
  }
}

function getFeatureGeometry(
  subject: EnergySubject,
): EnergySubjectFeatureGeometry | undefined {
  if (!subject.geometry) {
    if (typeof subject.lng !== "number" || typeof subject.lat !== "number") {
      return undefined;
    }

    return {
      type: "Point",
      coordinates: [subject.lng, subject.lat],
    };
  }

  return {
    type: subject.geometry.type,
    coordinates: subject.geometry.coordinates,
  };
}

function flattenGeometryCoordinates(geometry: SubjectGeometry): Coordinate[] {
  switch (geometry.type) {
    case "Point":
      return [geometry.coordinates];
    case "Polygon":
      return geometry.coordinates.flatMap(normalizeLinearRing);
    case "MultiPolygon":
      return geometry.coordinates.flatMap((polygon) =>
        polygon.flatMap(normalizeLinearRing),
      );
    default:
      return assertNever(geometry);
  }
}

function averageCoordinates(coordinates: Coordinate[]): Coordinate {
  if (coordinates.length === 0) {
    throw new Error("Cannot calculate center for geometry with no coordinates.");
  }

  const [lngTotal, latTotal] = coordinates.reduce<Coordinate>(
    ([lngSum, latSum], [lng, lat]) => [lngSum + lng, latSum + lat],
    [0, 0],
  );

  return [lngTotal / coordinates.length, latTotal / coordinates.length];
}

function normalizeLinearRing(ring: Coordinate[]): Coordinate[] {
  if (ring.length < 2) {
    return ring;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];

  if (first[0] === last[0] && first[1] === last[1]) {
    return ring.slice(0, -1);
  }

  return ring;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported geometry type: ${JSON.stringify(value)}`);
}
