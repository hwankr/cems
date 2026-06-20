import { describe, expect, it } from "vitest";
import {
  demoEnergyReadings,
  demoGroups,
  demoSubjects,
  getDemoGroupRankings,
} from "../data/demo-campus";
import { compareEnergy, summarizeEnergy } from "../domain/energy";
import type { EnergyReading } from "../domain/types";

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
  it("connects every reading to a subject", () => {
    const subjectIds = new Set(demoSubjects.map((subject) => subject.id));
    expect(
      demoEnergyReadings.every((reading) => subjectIds.has(reading.subjectId)),
    ).toBe(true);
  });

  it("connects every subject group to a known affiliation group", () => {
    const groupIds = new Set(demoGroups.map((group) => group.id));
    expect(
      demoSubjects.every(
        (subject) => subject.groupId && groupIds.has(subject.groupId),
      ),
    ).toBe(true);
  });

  it("creates ranked affiliation groups", () => {
    const rankings = getDemoGroupRankings();
    expect(rankings).toHaveLength(demoGroups.length);
    expect(rankings[0].rank).toBe(1);
  });
});
