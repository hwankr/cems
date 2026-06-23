import { afterEach, describe, expect, it, vi } from "vitest";
import {
  demoEnergyReadings,
  demoGroupIdsByOfficialCode,
  demoGroups,
  demoSubjects,
  getDemoGroupRankings,
} from "../data/demo-campus";
import buildingCatalog from "../data/yeungnam-building-catalog.json";
import buildingGeometries from "../data/yeungnam-building-geometries.json";
import { yeungnamBuildingSubjects } from "../data/yeungnam-buildings";
import { compareEnergy, summarizeEnergy } from "../domain/energy";
import type { EnergyReading } from "../domain/types";

const validGeneratedCatalog = {
  buildings: [
    {
      id: "yu-e21",
      schoolId: "yeungnam",
      campusId: "gyeongsan",
      officialCode: "E21",
      name: "Engineering Building 1",
      nameKo: "Engineering Building 1 Korean",
      nameEn: "Engineering Building 1",
      shortName: "E21",
      kind: "building",
      officialFloorText: "지상: 3 층, 지하: 1층",
      aboveGroundFloors: 3,
      basementFloors: 1,
      floorCountSource: "official-bFloor",
    },
    {
      id: "yu-a09",
      schoolId: "yeungnam",
      campusId: "gyeongsan",
      officialCode: "A09",
      name: "Tennis Court",
      nameKo: "테니스장",
      nameEn: "Tennis Court",
      shortName: "A09",
      kind: "outdoor",
    },
    {
      id: "yu-official-dd73bbe1",
      schoolId: "yeungnam",
      campusId: "gyeongsan",
      name: "Cheonma Honors Park",
      nameKo: "Cheonma Honors Park",
      shortName: "Cheonma Honors Park",
      kind: "building",
    },
  ],
};

const validGeneratedGeometries = {
  features: [
    {
      properties: {
        officialCode: "E21",
        geometrySource: "manual",
        geometryConfidence: "verified",
        displayHeightMeters: 10.8,
        aboveGroundFloors: 3,
        basementFloors: 1,
        floorCountSource: "official-bFloor",
        heightSource: "official-floor-count",
        footprintSource: "campus-ems-reference",
        footprintConfidence: "estimated",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [128.1, 35.1],
            [128.2, 35.1],
            [128.2, 35.2],
            [128.1, 35.2],
            [128.1, 35.1],
          ],
        ],
      },
    },
    {
      properties: {
        subjectId: "yu-official-dd73bbe1",
        geometrySource: "official-campus-map",
        geometryConfidence: "verified",
      },
      geometry: {
        type: "Point",
        coordinates: [128.7601738129029, 35.8308105775303],
      },
    },
  ],
};

afterEach(() => {
  vi.doUnmock("../data/yeungnam-building-catalog.json");
  vi.doUnmock("../data/yeungnam-building-geometries.json");
  vi.resetModules();
});

async function importYeungnamBuildingsWithGeneratedData({
  catalog = validGeneratedCatalog,
  geometries = validGeneratedGeometries,
}: {
  catalog?: unknown;
  geometries?: unknown;
} = {}) {
  vi.resetModules();
  vi.doMock("../data/yeungnam-building-catalog.json", () => ({
    default: catalog,
  }));
  vi.doMock("../data/yeungnam-building-geometries.json", () => ({
    default: geometries,
  }));

  return import("../data/yeungnam-buildings");
}

describe("compareEnergy", () => {
  it("classifies a saving subject", () => {
    const reading: EnergyReading = {
      subjectId: "yu-it",
      actualKwh: 900,
      forecastKwh: 1000,
      periodLabel: "2026-W25",
    };

    expect(compareEnergy(reading)).toMatchObject({
      subjectId: "yu-it",
      deltaKwh: -100,
      savingsKwh: 100,
      overuseKwh: 0,
      savingsRate: 0.1,
      status: "saving",
    });
  });

  it("classifies an overuse subject", () => {
    const reading: EnergyReading = {
      subjectId: "yu-mechanical",
      actualKwh: 1160,
      forecastKwh: 1000,
      periodLabel: "2026-W25",
    };

    expect(compareEnergy(reading)).toMatchObject({
      deltaKwh: 160,
      savingsKwh: 0,
      overuseKwh: 160,
      savingsRate: 0,
      status: "overuse",
    });
  });

  it("summarizes comparison totals", () => {
    const summary = summarizeEnergy([
      compareEnergy({
        subjectId: "a",
        actualKwh: 900,
        forecastKwh: 1000,
        periodLabel: "2026-W25",
      }),
      compareEnergy({
        subjectId: "b",
        actualKwh: 1100,
        forecastKwh: 1000,
        periodLabel: "2026-W25",
      }),
    ]);

    expect(summary).toEqual({
      actualKwh: 2000,
      forecastKwh: 2000,
      savingsKwh: 100,
      overuseKwh: 100,
      netDeltaKwh: 0,
      netSavingsRate: 0,
    });
  });
});

describe("demo campus data", () => {
  it("rejects generated building catalog roots without a buildings array", async () => {
    await expect(
      importYeungnamBuildingsWithGeneratedData({
        catalog: {},
      }),
    ).rejects.toThrow(
      "Invalid Yeungnam building catalog root: expected buildings array.",
    );
  });

  it("rejects generated geometry roots without a features array", async () => {
    await expect(
      importYeungnamBuildingsWithGeneratedData({
        geometries: {},
      }),
    ).rejects.toThrow(
      "Invalid Yeungnam building geometries root: expected features array.",
    );
  });

  it("rejects generated catalog buildings with missing required string fields", async () => {
    await expect(
      importYeungnamBuildingsWithGeneratedData({
        catalog: {
          buildings: [
            {
              ...validGeneratedCatalog.buildings[0],
              name: undefined,
            },
          ],
        },
      }),
    ).rejects.toThrow(
      "Invalid Yeungnam catalog building E21 at index 0: expected string name.",
    );
  });

  it.each(["nameKo", "nameEn"] as const)(
    "rejects generated catalog buildings with invalid optional %s",
    async (field) => {
      await expect(
        importYeungnamBuildingsWithGeneratedData({
          catalog: {
            buildings: [
              {
                ...validGeneratedCatalog.buildings[0],
                [field]: "",
              },
            ],
          },
        }),
      ).rejects.toThrow(
        `Invalid Yeungnam catalog building E21 at index 0: expected string ${field}.`,
      );
    },
  );

  it("rejects generated features with missing required geometry metadata", async () => {
    await expect(
      importYeungnamBuildingsWithGeneratedData({
        geometries: {
          features: [
            {
              properties: {
                officialCode: "E21",
                geometryConfidence: "verified",
              },
              geometry: {
                type: "Point",
                coordinates: [128.1, 35.1],
              },
            },
          ],
        },
      }),
    ).rejects.toThrow(
      "Invalid Yeungnam geometry feature E21 at index 0 properties: expected string geometrySource.",
    );
  });

  it("rejects generated features with missing geometry coordinates", async () => {
    await expect(
      importYeungnamBuildingsWithGeneratedData({
        geometries: {
          features: [
            {
              properties: {
                officialCode: "E21",
                geometrySource: "manual",
                geometryConfidence: "verified",
              },
              geometry: {
                type: "Point",
              },
            },
          ],
        },
      }),
    ).rejects.toThrow(
      "Invalid Yeungnam geometry feature E21 at index 0 geometry: expected coordinates.",
    );
  });

  it("rejects generated polygon features with invalid display height values", async () => {
    await expect(
      importYeungnamBuildingsWithGeneratedData({
        geometries: {
          features: [
            {
              ...validGeneratedGeometries.features[0],
              properties: {
                ...validGeneratedGeometries.features[0].properties,
                displayHeightMeters: 0,
              },
            },
          ],
        },
      }),
    ).rejects.toThrow(
      "E21 properties: expected positive finite displayHeightMeters.",
    );
  });

  it("rejects generated polygon features with invalid floor values", async () => {
    await expect(
      importYeungnamBuildingsWithGeneratedData({
        geometries: {
          features: [
            {
              ...validGeneratedGeometries.features[0],
              properties: {
                ...validGeneratedGeometries.features[0].properties,
                aboveGroundFloors: 1.5,
              },
            },
          ],
        },
      }),
    ).rejects.toThrow(
      "E21 properties: expected positive integer aboveGroundFloors.",
    );
  });

  it("rejects generated polygon features with unsupported footprint source values", async () => {
    await expect(
      importYeungnamBuildingsWithGeneratedData({
        geometries: {
          features: [
            {
              ...validGeneratedGeometries.features[0],
              properties: {
                ...validGeneratedGeometries.features[0].properties,
                footprintSource: "unknown-source",
              },
            },
          ],
        },
      }),
    ).rejects.toThrow(
      "Unsupported Yeungnam footprint source for E21: unknown-source",
    );
  });

  it("rejects generated point fallback features with building height metadata", async () => {
    await expect(
      importYeungnamBuildingsWithGeneratedData({
        geometries: {
          features: [
            {
              properties: {
                subjectId: "yu-official-dd73bbe1",
                geometrySource: "official-campus-map",
                geometryConfidence: "verified",
                displayHeightMeters: 7.2,
                heightSource: "official-floor-count",
              },
              geometry: {
                type: "Point",
                coordinates: [128.7601738129029, 35.8308105775303],
              },
            },
          ],
        },
      }),
    ).rejects.toThrow(
      "yu-official-dd73bbe1 properties: point geometry cannot include building height metadata.",
    );
  });

  it("rejects generated point fallback features with building footprint metadata", async () => {
    await expect(
      importYeungnamBuildingsWithGeneratedData({
        geometries: {
          features: [
            {
              properties: {
                subjectId: "yu-official-dd73bbe1",
                geometrySource: "official-campus-map",
                geometryConfidence: "verified",
                footprintSource: "campus-ems-reference",
                footprintConfidence: "estimated",
              },
              geometry: {
                type: "Point",
                coordinates: [128.7601738129029, 35.8308105775303],
              },
            },
          ],
        },
      }),
    ).rejects.toThrow(
      "yu-official-dd73bbe1 properties: point geometry cannot include building footprint metadata.",
    );
  });

  it("loads every generated Yeungnam catalog entry as a subject with optional geometry", () => {
    const catalogEntries = (
      buildingCatalog as {
        buildings: Array<{ id: string; officialCode?: string; kind: string }>;
      }
    ).buildings;
    const geometryFeatures = (
      buildingGeometries as {
        features: Array<{ properties: { subjectId: string; officialCode?: string } }>;
      }
    ).features;
    const subjectsById = new Map(
      yeungnamBuildingSubjects.map((subject) => [subject.id, subject]),
    );
    const mappedSubjects = yeungnamBuildingSubjects.filter(
      (subject) => subject.geometry,
    );
    const subjectIds = yeungnamBuildingSubjects.map((subject) => subject.id);

    expect(yeungnamBuildingSubjects).toHaveLength(catalogEntries.length);
    catalogEntries.forEach((entry) => {
      expect(
        subjectsById.get(entry.id),
        `Expected catalog entry ${entry.id} to be loaded as a subject.`,
      ).toBeDefined();
    });
    expect(mappedSubjects).toHaveLength(geometryFeatures.length);
    expect(new Set(subjectIds).size).toBe(subjectIds.length);
  });

  it("loads generated catalog entries without official codes by subject id", async () => {
    const { yeungnamBuildingSubjects } =
      await importYeungnamBuildingsWithGeneratedData();
    const codeLessSubject = yeungnamBuildingSubjects.find(
      (subject) => subject.id === "yu-official-dd73bbe1",
    );

    expect(codeLessSubject).toMatchObject({
      id: "yu-official-dd73bbe1",
      geometry: {
        type: "Point",
        coordinates: [128.7601738129029, 35.8308105775303],
      },
      lng: 128.7601738129029,
      lat: 35.8308105775303,
    });
    expect(codeLessSubject?.officialCode).toBeUndefined();
  });

  it("preserves positive generated polygon building height metadata", async () => {
    const { yeungnamBuildingSubjects } =
      await importYeungnamBuildingsWithGeneratedData();
    const subject = yeungnamBuildingSubjects.find(
      (candidate) => candidate.id === "yu-e21",
    );

    expect(subject?.geometry).toMatchObject({
      type: "Polygon",
      displayHeightMeters: 10.8,
      aboveGroundFloors: 3,
      basementFloors: 1,
      floorCountSource: "official-bFloor",
      heightSource: "official-floor-count",
      footprintSource: "campus-ems-reference",
      footprintConfidence: "estimated",
    });
  });

  it("maps F29 to a polygon footprint with official floor height", () => {
    const f29Feature = (
      buildingGeometries as {
        features: Array<{
          properties: {
            officialCode?: string;
            displayHeightMeters?: number;
            heightSource?: string;
          };
          geometry: { type: string };
        }>;
      }
    ).features.find((feature) => feature.properties.officialCode === "F29");

    expect(f29Feature).toMatchObject({
      geometry: { type: "Polygon" },
      properties: {
        displayHeightMeters: 10.8,
        heightSource: "official-floor-count",
      },
    });
  });

  it("prefers subjectId geometry over officialCode geometry", async () => {
    const { yeungnamBuildingSubjects } = await importYeungnamBuildingsWithGeneratedData({
      geometries: {
        features: [
          {
            properties: {
              subjectId: "yu-e21",
              officialCode: "E21",
              geometrySource: "manual",
              geometryConfidence: "verified",
            },
            geometry: {
              type: "Point",
              coordinates: [128.2, 35.2],
            },
          },
          {
            properties: {
              officialCode: "E21",
              geometrySource: "openstreetmap",
              geometryConfidence: "estimated",
            },
            geometry: {
              type: "Point",
              coordinates: [128.1, 35.1],
            },
          },
        ],
      },
    });
    const subject = yeungnamBuildingSubjects.find(
      (candidate) => candidate.id === "yu-e21",
    );

    expect(subject?.geometry).toMatchObject({
      type: "Point",
      coordinates: [128.2, 35.2],
    });
  });

  it("preserves non-building campus place kinds instead of labeling them as buildings", () => {
    const tennisCourt = yeungnamBuildingSubjects.find(
      (subject) => subject.officialCode === "A09",
    );

    expect(tennisCourt).toMatchObject({
      campusPlaceKind: "outdoor",
      type: "outdoor",
    });
  });

  it("carries generated Korean and English catalog names onto building subjects", async () => {
    const { yeungnamBuildingSubjects } =
      await importYeungnamBuildingsWithGeneratedData();

    expect(yeungnamBuildingSubjects[0]).toMatchObject({
      nameKo: validGeneratedCatalog.buildings[0].nameKo,
      nameEn: validGeneratedCatalog.buildings[0].nameEn,
    });
    expect(yeungnamBuildingSubjects[1]).toMatchObject({
      campusPlaceKind: "outdoor",
      type: "outdoor",
    });
    expect(yeungnamBuildingSubjects[1].geometry).toBeUndefined();
    expect(yeungnamBuildingSubjects[1].lat).toBeUndefined();
    expect(yeungnamBuildingSubjects[1].lng).toBeUndefined();
  });

  it("connects every reading to a grouped subject", () => {
    const subjectsById = new Map(
      demoSubjects.map((subject) => [subject.id, subject]),
    );

    demoEnergyReadings.forEach((reading) => {
      const subject = subjectsById.get(reading.subjectId);

      expect(
        subject,
        `Expected reading ${reading.subjectId} to reference a generated subject.`,
      ).toBeDefined();
      expect(
        subject?.groupId,
        `Expected reading ${reading.subjectId} to reference a grouped subject.`,
      ).toBeDefined();
    });
  });

  it("connects every subject group to a known affiliation group", () => {
    const groupIds = new Set(demoGroups.map((group) => group.id));
    expect(
      demoSubjects.every(
        (subject) => !subject.groupId || groupIds.has(subject.groupId),
      ),
    ).toBe(true);
  });

  it("assigns demo groups for generated official-code subjects", () => {
    const subjectsByOfficialCode = new Map(
      demoSubjects
        .filter((subject) => subject.officialCode)
        .map((subject) => [subject.officialCode, subject]),
    );

    demoGroupIdsByOfficialCode.forEach((groupId, officialCode) => {
      const subject = subjectsByOfficialCode.get(officialCode);

      expect(
        subject,
        `Expected demo group mapping ${officialCode} to match a generated subject.`,
      ).toBeDefined();
      expect(subject?.groupId).toBe(groupId);
    });

    demoSubjects.forEach((subject) => {
      if (!subject.groupId) {
        return;
      }

      expect(
        subject.officialCode,
        `Expected grouped subject ${subject.id} to have an official code.`,
      ).toBeDefined();
      expect(
        demoGroupIdsByOfficialCode.get(subject.officialCode ?? ""),
        `Expected grouped subject ${subject.id} to be declared in the demo group mapping.`,
      ).toBe(subject.groupId);
    });
  });

  it("does not keep stale demo mappings for missing generated official codes", () => {
    expect(demoGroupIdsByOfficialCode.has("E29")).toBe(false);
    expect(demoGroupIdsByOfficialCode.has("B03")).toBe(false);
  });

  it("creates ranked affiliation groups", () => {
    const rankings = getDemoGroupRankings();
    expect(rankings).toHaveLength(demoGroups.length);
    expect(rankings[0].rank).toBe(1);
  });
});
