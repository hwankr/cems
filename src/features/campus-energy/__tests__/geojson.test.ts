import { describe, expect, it } from "vitest";
import { demoSubjects, getDemoEnergyComparisons } from "../data/demo-campus";
import { compareEnergy } from "../domain/energy";
import {
  createEnergySubjectFeatureCollection,
  getEnergySubjectCenter,
  getGeometryCenter,
} from "../domain/geojson";
import type { EnergySubject } from "../domain/types";

const baseSubject: EnergySubject = {
  id: "subject-a",
  schoolId: "school-a",
  campusId: "main",
  type: "building",
  name: "Subject A",
  shortName: "A",
  lng: 128.1,
  lat: 35.1,
};

describe("getEnergySubjectCenter", () => {
  it("uses point geometry center before legacy coordinates", () => {
    const subject: EnergySubject = {
      ...baseSubject,
      lng: 128.1,
      lat: 35.1,
      geometry: {
        type: "Point",
        coordinates: [128.9, 35.9],
        geometrySource: {
          kind: "public-data",
          name: "National school location standard data",
          url: "https://www.data.go.kr/data/15021148/standard.do",
        },
        geometryConfidence: "verified",
      },
    };

    expect(getEnergySubjectCenter(subject)).toEqual([128.9, 35.9]);
  });

  it("falls back to legacy coordinates when geometry is missing", () => {
    expect(getEnergySubjectCenter(baseSubject)).toEqual([128.1, 35.1]);
  });
});

describe("getGeometryCenter", () => {
  it("averages polygon coordinates without duplicated closing vertices", () => {
    expect(
      getGeometryCenter({
        type: "Polygon",
        coordinates: [
          [
            [128, 35],
            [130, 35],
            [130, 37],
            [128, 37],
            [128, 35],
          ],
        ],
        geometrySource: {
          kind: "manual",
          name: "Manual campus mapping",
        },
        geometryConfidence: "needs-review",
      }),
    ).toEqual([129, 36]);
  });

  it("averages MultiPolygon coordinates without duplicated closing vertices", () => {
    expect(
      getGeometryCenter({
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
          [
            [
              [10, 10],
              [12, 10],
              [12, 12],
              [10, 12],
              [10, 10],
            ],
          ],
        ],
        geometrySource: {
          kind: "manual",
          name: "Manual campus mapping",
        },
        geometryConfidence: "needs-review",
      }),
    ).toEqual([6, 6]);
  });
});

describe("createEnergySubjectFeatureCollection", () => {
  it("omits subjects without geometry or legacy coordinates", () => {
    const unmappedSubject: EnergySubject = {
      id: "subject-unmapped",
      schoolId: "school-a",
      campusId: "main",
      type: "building",
      name: "Subject without geometry",
      shortName: "NO-GEO",
    };

    const collection = createEnergySubjectFeatureCollection(
      [unmappedSubject],
      [],
      "subject-unmapped",
    );

    expect(collection).toEqual({
      type: "FeatureCollection",
      features: [],
    });
  });

  it("preserves polygon geometry and attaches comparison, selected, and official code properties", () => {
    const polygonSubject: EnergySubject = {
      ...baseSubject,
      id: "subject-polygon",
      officialCode: "BLDG-001",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [128.7, 35.7],
            [128.8, 35.7],
            [128.8, 35.8],
            [128.7, 35.8],
            [128.7, 35.7],
          ],
        ],
        geometrySource: {
          kind: "openstreetmap",
          name: "OpenStreetMap",
          url: "https://www.openstreetmap.org/",
        },
        geometryConfidence: "estimated",
        displayHeightMeters: 10.8,
        aboveGroundFloors: 3,
        basementFloors: 1,
        floorCountSource: "official-bFloor",
        heightSource: "official-floor-count",
        footprintSource: "campus-ems-reference",
        footprintConfidence: "estimated",
      },
    };
    const comparison = compareEnergy({
      subjectId: "subject-polygon",
      actualKwh: 1120,
      forecastKwh: 1000,
      periodLabel: "2026-W25",
    });

    const collection = createEnergySubjectFeatureCollection(
      [polygonSubject],
      [comparison],
      "subject-polygon",
    );

    expect(collection).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [128.7, 35.7],
                [128.8, 35.7],
                [128.8, 35.8],
                [128.7, 35.8],
                [128.7, 35.7],
              ],
            ],
          },
          properties: {
            id: "subject-polygon",
            name: "Subject A",
            shortName: "A",
            type: "building",
            status: "overuse",
            deltaKwh: 120,
            selected: true,
            officialCode: "BLDG-001",
            displayHeightMeters: 10.8,
            aboveGroundFloors: 3,
            basementFloors: 1,
            floorCountSource: "official-bFloor",
            heightSource: "official-floor-count",
            footprintSource: "campus-ems-reference",
            footprintConfidence: "estimated",
          },
        },
      ],
    });
  });

  it("creates a map feature for every generated Yeungnam demo subject", () => {
    const collection = createEnergySubjectFeatureCollection(
      demoSubjects,
      getDemoEnergyComparisons(),
      demoSubjects[0]?.id ?? "",
    );

    expect(collection.features).toHaveLength(demoSubjects.length);
    expect(
      collection.features.some((feature) => feature.geometry.type === "Point"),
    ).toBe(true);
    expect(
      collection.features.some((feature) => feature.geometry.type === "Polygon"),
    ).toBe(true);
  });
});
