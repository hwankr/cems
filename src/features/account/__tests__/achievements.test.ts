import { describe, expect, it } from "vitest";
import { deriveAchievements } from "../domain/achievements";
import type { AwardTier } from "@/features/leagues/domain/types";

describe("deriveAchievements", () => {
  it("returns the fixed 6-badge set in order", () => {
    const list = deriveAchievements({ level: 1, longestStreak: 0, totalCheckIns: 0 });
    expect(list.map((a) => a.key)).toEqual([
      "campus-saver",
      "energy-hero",
      "grid-guardian",
      "streak-7",
      "check-in-10",
      "top-student",
    ]);
  });

  it("campus-saver is always earned; top-student is always locked", () => {
    const list = deriveAchievements({ level: 1, longestStreak: 0, totalCheckIns: 0 });
    const byKey = Object.fromEntries(list.map((a) => [a.key, a]));
    expect(byKey["campus-saver"]).toEqual({ key: "campus-saver", earned: true, locked: false });
    expect(byKey["top-student"]).toEqual({ key: "top-student", earned: false, locked: true });
  });

  it("unlocks level, streak and check-in milestones at their thresholds", () => {
    const list = deriveAchievements({ level: 10, longestStreak: 7, totalCheckIns: 10 });
    const byKey = Object.fromEntries(list.map((a) => [a.key, a.earned]));
    expect(byKey["energy-hero"]).toBe(true); // level >= 5
    expect(byKey["grid-guardian"]).toBe(true); // level >= 10
    expect(byKey["streak-7"]).toBe(true); // longestStreak >= 7
    expect(byKey["check-in-10"]).toBe(true); // totalCheckIns >= 10
  });

  it("keeps milestones locked below threshold", () => {
    const list = deriveAchievements({ level: 4, longestStreak: 6, totalCheckIns: 9 });
    const byKey = Object.fromEntries(list.map((a) => [a.key, a.earned]));
    expect(byKey["energy-hero"]).toBe(false);
    expect(byKey["grid-guardian"]).toBe(false);
    expect(byKey["streak-7"]).toBe(false);
    expect(byKey["check-in-10"]).toBe(false);
  });
});

describe("deriveAchievements top-student award", () => {
  const base = { level: 1, longestStreak: 0, totalCheckIns: 0 };

  it("keeps top-student locked when there is no award", () => {
    const achievements = deriveAchievements(base);
    const top = achievements.find((a) => a.key === "top-student");
    expect(top).toEqual({ key: "top-student", earned: false, locked: true });
  });

  it("unlocks top-student when a student award exists", () => {
    const achievements = deriveAchievements({
      ...base,
      hasTopStudentAward: true,
      topStudentTier: "gold" as AwardTier,
    });
    const top = achievements.find((a) => a.key === "top-student");
    expect(top).toEqual({
      key: "top-student",
      earned: true,
      locked: false,
      tier: "gold",
    });
  });

  it("does not affect the other achievements", () => {
    const achievements = deriveAchievements({
      ...base,
      hasTopStudentAward: true,
    });
    expect(achievements.find((a) => a.key === "campus-saver")?.earned).toBe(
      true,
    );
    expect(achievements).toHaveLength(6);
  });
});
