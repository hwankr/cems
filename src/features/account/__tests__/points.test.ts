import { describe, expect, it } from "vitest";
import {
  calculateMemberPeriodReward,
  sumPersonalPoints,
} from "../domain/points";
import type { PointEvent } from "../domain/points";
import type { EnergyComparison } from "@/features/campus-energy/domain/types";

const event = (points: number): PointEvent => ({
  id: `e-${points}`,
  userId: "u1",
  points,
  reason: "verified-savings",
  periodLabel: "2026-W25",
  createdAt: "2026-06-26T00:00:00.000Z",
});

describe("sumPersonalPoints", () => {
  it("returns 0 for no events", () => {
    expect(sumPersonalPoints([])).toBe(0);
  });

  it("adds every event's points", () => {
    expect(sumPersonalPoints([event(120), event(80)])).toBe(200);
  });
});

describe("calculateMemberPeriodReward", () => {
  it("returns 0 when there is no comparison", () => {
    expect(calculateMemberPeriodReward(null)).toBe(0);
  });

  it("mirrors calculatePoints for a saving comparison", () => {
    const comparison: EnergyComparison = {
      subjectId: "yu-e21",
      actualKwh: 1360,
      forecastKwh: 1500,
      periodLabel: "2026-W25",
      deltaKwh: -140,
      savingsKwh: 140,
      overuseKwh: 0,
      savingsRate: 140 / 1500,
      status: "saving",
    };

    // calculatePoints = round(savingsKwh * 10) = 1400
    expect(calculateMemberPeriodReward(comparison)).toBe(1400);
  });
});
