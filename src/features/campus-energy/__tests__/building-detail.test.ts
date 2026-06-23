import { describe, expect, it } from "vitest";
import {
  buildBuildingDetail,
  resolveBuildingFloors,
} from "../domain/building-detail";
import { compareEnergy } from "../domain/energy";
import type { EnergySubject } from "../domain/types";

const polygonRing = [
  [128.7588, 35.8328],
  [128.7592, 35.8328],
  [128.7592, 35.8332],
  [128.7588, 35.8332],
  [128.7588, 35.8328],
] as [number, number][];

const polygonSubject: EnergySubject = {
  id: "yu-test-1",
  schoolId: "yeungnam",
  campusId: "gyeongsan",
  type: "building",
  name: "Test Hall",
  shortName: "TH",
  geometry: {
    type: "Polygon",
    coordinates: [polygonRing],
    geometrySource: { kind: "manual", name: "Manual campus mapping" },
    geometryConfidence: "verified",
    displayHeightMeters: 18,
    aboveGroundFloors: 5,
  },
};

const heightOnlySubject: EnergySubject = {
  id: "yu-test-height",
  schoolId: "yeungnam",
  campusId: "gyeongsan",
  type: "building",
  name: "Height Hall",
  shortName: "HH",
  geometry: {
    type: "Polygon",
    coordinates: [polygonRing],
    geometrySource: { kind: "manual", name: "Manual campus mapping" },
    geometryConfidence: "verified",
    displayHeightMeters: 18,
  },
};

const pointSubject: EnergySubject = {
  id: "yu-test-point",
  schoolId: "yeungnam",
  campusId: "gyeongsan",
  type: "landmark",
  name: "Plaza",
  shortName: "PL",
  geometry: {
    type: "Point",
    coordinates: [128.76, 35.83],
    geometrySource: { kind: "official-campus-map", name: "Campus map" },
    geometryConfidence: "verified",
  },
};

describe("buildBuildingDetail", () => {
  it("is deterministic for the same subject", () => {
    expect(buildBuildingDetail(polygonSubject)).toEqual(
      buildBuildingDetail(polygonSubject),
    );
  });

  it("produces 24 non-negative hourly values with a positive max", () => {
    const comparison = compareEnergy({
      subjectId: polygonSubject.id,
      actualKwh: 1800,
      forecastKwh: 1600,
      periodLabel: "2026-W25",
    });
    const detail = buildBuildingDetail(polygonSubject, comparison);

    expect(detail.hourly).toHaveLength(24);
    expect(detail.hourly.every((value) => value >= 0)).toBe(true);
    expect(detail.maxHourly).toBeGreaterThan(0);
  });

  it("uses official floors and grounds floor area in real footprint", () => {
    const detail = buildBuildingDetail(polygonSubject);

    expect(detail.floors).toBe(5);
    expect(detail.footprintAreaM2).toBeGreaterThan(0);
    expect(detail.grossFloorAreaM2).toBe(detail.footprintAreaM2 * 5);
    expect(detail.completionYear).toBeGreaterThanOrEqual(1990);
    expect(detail.completionYear).toBeLessThanOrEqual(2020);
  });

  it("synthesizes floor area for point subjects without a footprint", () => {
    const detail = buildBuildingDetail(pointSubject);

    expect(detail.footprintAreaM2).toBe(0);
    expect(detail.grossFloorAreaM2).toBeGreaterThanOrEqual(4000);
    expect(detail.grossFloorAreaM2).toBeLessThan(30000);
  });
});

describe("resolveBuildingFloors", () => {
  it("derives floors from display height when official floors are absent", () => {
    // 18 m / 3.6 m-per-floor = 5 floors
    expect(resolveBuildingFloors(heightOnlySubject)).toBe(5);
  });
});
