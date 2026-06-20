import { describe, expect, it } from "vitest";
import { compareEnergy } from "../domain/energy";
import {
  calculatePoints,
  getCharacterProgress,
  rankSubjects,
} from "../domain/scoring";

describe("calculatePoints", () => {
  it("converts savings to points", () => {
    const comparison = compareEnergy({
      subjectId: "yu-it",
      actualKwh: 850,
      forecastKwh: 1000,
      periodLabel: "2026-W25",
    });

    expect(calculatePoints(comparison)).toBe(1500);
  });

  it("does not award points for overuse", () => {
    const comparison = compareEnergy({
      subjectId: "yu-mechanical",
      actualKwh: 1100,
      forecastKwh: 1000,
      periodLabel: "2026-W25",
    });

    expect(calculatePoints(comparison)).toBe(0);
  });
});

describe("rankSubjects", () => {
  it("orders subjects by savings points", () => {
    const rankings = rankSubjects([
      compareEnergy({
        subjectId: "a",
        actualKwh: 900,
        forecastKwh: 1000,
        periodLabel: "2026-W25",
      }),
      compareEnergy({
        subjectId: "b",
        actualKwh: 800,
        forecastKwh: 1000,
        periodLabel: "2026-W25",
      }),
    ]);

    expect(rankings.map((item) => item.subjectId)).toEqual(["b", "a"]);
    expect(rankings[0].rank).toBe(1);
    expect(rankings[0].points).toBe(2000);
  });
});

describe("getCharacterProgress", () => {
  it("maps points to a visible character level", () => {
    expect(getCharacterProgress(2750)).toEqual({
      level: 3,
      currentLevelPoints: 750,
      nextLevelPoints: 1000,
      progressRate: 0.75,
      title: "Campus Saver",
    });
  });
});
