import { hashString } from "./hash";
import type {
  Coordinate,
  EnergyComparison,
  EnergySubject,
  SubjectGeometry,
} from "./types";

// A normalized weekday load curve (0..~0.92) used to shape the synthesized
// hourly profile. It only illustrates intraday shape; magnitude comes from the
// building's actual usage.
const HOURLY_BASE = [
  0.18, 0.15, 0.13, 0.12, 0.12, 0.16, 0.24, 0.38, 0.58, 0.74, 0.86, 0.9, 0.88,
  0.85, 0.89, 0.92, 0.88, 0.81, 0.78, 0.83, 0.72, 0.52, 0.35, 0.24,
];

const METERS_PER_DEGREE_LAT = 110_540;

export type BuildingDetail = {
  /** 24 synthesized hourly usage values (kWh-scale), index = hour of day. */
  hourly: number[];
  maxHourly: number;
  floors: number;
  /** Real footprint area derived from polygon geometry; 0 for point subjects. */
  footprintAreaM2: number;
  grossFloorAreaM2: number;
  completionYear: number;
};

/**
 * Floors from official metadata when available, otherwise derived from display
 * height (1 floor ≈ 3.6 m), otherwise a neutral default.
 */
export function resolveBuildingFloors(subject: EnergySubject): number {
  const geometry = subject.geometry;
  if (geometry && geometry.type !== "Point") {
    if (
      typeof geometry.aboveGroundFloors === "number" &&
      geometry.aboveGroundFloors > 0
    ) {
      return geometry.aboveGroundFloors;
    }
    if (
      typeof geometry.displayHeightMeters === "number" &&
      geometry.displayHeightMeters > 0
    ) {
      return Math.max(1, Math.round(geometry.displayHeightMeters / 3.6));
    }
  }
  return 4;
}

/**
 * Builds the popup detail for a building. Real where we can (floors, footprint
 * area from geometry); deterministically synthesized where we have no data
 * (hourly curve, gross floor area for point subjects, completion year). Seeded
 * by subject id so the values never change between reloads.
 */
export function buildBuildingDetail(
  subject: EnergySubject,
  comparison?: EnergyComparison,
): BuildingDetail {
  const seed = hashString(subject.id);
  const floors = resolveBuildingFloors(subject);
  const footprintAreaM2 = subject.geometry
    ? Math.round(polygonFootprintAreaM2(subject.geometry))
    : 0;
  const grossFloorAreaM2 =
    footprintAreaM2 > 0
      ? Math.round(footprintAreaM2 * floors)
      : 4_000 + (seed % 26_000);
  const completionYear = 1990 + (seed % 31);
  const actualKwh = comparison?.actualKwh ?? 600 + (seed % 1_600);
  const hourly = buildHourlyUsage(actualKwh, seed);

  return {
    hourly,
    maxHourly: Math.max(1, ...hourly),
    floors,
    footprintAreaM2,
    grossFloorAreaM2,
    completionYear,
  };
}

function buildHourlyUsage(actualKwh: number, seed: number): number[] {
  const phase = ((seed % 100) / 100) * Math.PI * 2;
  const amplitude = 0.04 + (seed % 5) / 100;
  return HOURLY_BASE.map((base, hour) => {
    const wave = amplitude * Math.sin(hour * 0.7 + phase);
    return Math.max(0, Math.round((base + wave) * (actualKwh / 9)));
  });
}

function polygonFootprintAreaM2(geometry: SubjectGeometry): number {
  if (geometry.type === "Polygon") {
    return ringsAreaM2(geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.reduce(
      (total, rings) => total + ringsAreaM2(rings),
      0,
    );
  }
  return 0;
}

function ringsAreaM2(rings: Coordinate[][]): number {
  if (rings.length === 0) return 0;
  const outer = ringAreaM2(rings[0]);
  const holes = rings
    .slice(1)
    .reduce((total, ring) => total + ringAreaM2(ring), 0);
  return Math.max(0, outer - holes);
}

// Planar shoelace over a local equirectangular projection — accurate enough at
// campus scale to ground the displayed floor area in real footprint size.
function ringAreaM2(ring: Coordinate[]): number {
  if (ring.length < 3) return 0;
  const metersPerLng =
    METERS_PER_DEGREE_LAT * Math.cos((ring[0][1] * Math.PI) / 180);
  let sum = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const [lng1, lat1] = ring[index];
    const [lng2, lat2] = ring[(index + 1) % ring.length];
    const x1 = lng1 * metersPerLng;
    const y1 = lat1 * METERS_PER_DEGREE_LAT;
    const x2 = lng2 * metersPerLng;
    const y2 = lat2 * METERS_PER_DEGREE_LAT;
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}
