import { describe, expect, it } from "vitest";
import {
  generateDemoEnergyReadings,
  isClickableBuildingSubject,
} from "../data/demo-energy";
import type { EnergyReading, EnergySubject } from "../domain/types";

const polygonRing = [
  [128, 35],
  [128.001, 35],
  [128.001, 35.001],
  [128, 35.001],
  [128, 35],
] as [number, number][];

const clickable: EnergySubject = {
  id: "yu-a",
  schoolId: "yeungnam",
  campusId: "gyeongsan",
  type: "building",
  name: "Alpha",
  shortName: "A",
  geometry: {
    type: "Polygon",
    coordinates: [polygonRing],
    geometrySource: { kind: "manual", name: "Manual campus mapping" },
    geometryConfidence: "verified",
    displayHeightMeters: 12,
    aboveGroundFloors: 3,
  },
};

const pointSubject: EnergySubject = {
  id: "yu-p",
  schoolId: "yeungnam",
  campusId: "gyeongsan",
  type: "landmark",
  name: "Plaza",
  shortName: "P",
  geometry: {
    type: "Point",
    coordinates: [128, 35],
    geometrySource: { kind: "official-campus-map", name: "Campus map" },
    geometryConfidence: "verified",
  },
};

const flatPolygon: EnergySubject = {
  ...clickable,
  id: "yu-f",
  geometry: {
    type: "Polygon",
    coordinates: [polygonRing],
    geometrySource: { kind: "manual", name: "Manual campus mapping" },
    geometryConfidence: "verified",
    displayHeightMeters: 0,
  },
};

describe("isClickableBuildingSubject", () => {
  it("accepts height-bearing polygons and rejects points and flat polygons", () => {
    expect(isClickableBuildingSubject(clickable)).toBe(true);
    expect(isClickableBuildingSubject(pointSubject)).toBe(false);
    expect(isClickableBuildingSubject(flatPolygon)).toBe(false);
  });
});

describe("generateDemoEnergyReadings", () => {
  const authored: EnergyReading[] = [
    { subjectId: "yu-a", actualKwh: 1000, forecastKwh: 1200, periodLabel: "2026-W25" },
  ];

  it("keeps authored readings and adds one per other clickable building", () => {
    const clickable2: EnergySubject = { ...clickable, id: "yu-a2" };
    const readings = generateDemoEnergyReadings(
      [clickable, clickable2, pointSubject, flatPolygon],
      authored,
    );

    expect(readings.map((reading) => reading.subjectId).sort()).toEqual([
      "yu-a",
      "yu-a2",
    ]);
    expect(readings.find((reading) => reading.subjectId === "yu-a")).toEqual(
      authored[0],
    );
  });

  it("is deterministic", () => {
    const subjects = [clickable, { ...clickable, id: "yu-a2" }];
    expect(generateDemoEnergyReadings(subjects, [])).toEqual(
      generateDemoEnergyReadings(subjects, []),
    );
  });
});
