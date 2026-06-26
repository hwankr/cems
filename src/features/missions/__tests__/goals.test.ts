import { describe, expect, it } from "vitest";
import { computeGoalProgress, type Goal } from "../domain/goals";

const daily: Goal = { id: "daily-3", scope: "daily", targetCount: 3, bonusPoints: 80 };
const weekly: Goal = { id: "weekly-10", scope: "weekly", targetCount: 10, bonusPoints: 300 };

describe("computeGoalProgress", () => {
  it("returns [] for no goals", () => {
    expect(computeGoalProgress([], { todayCount: 0, weekCount: 0 }, new Set())).toEqual([]);
  });

  it("uses today count for daily goals and stays unmet below target", () => {
    const [p] = computeGoalProgress([daily], { todayCount: 2, weekCount: 9 }, new Set());
    expect(p.current).toBe(2);
    expect(p.met).toBe(false);
    expect(p.claimable).toBe(false);
  });

  it("marks a met, unclaimed daily goal claimable", () => {
    const [p] = computeGoalProgress([daily], { todayCount: 3, weekCount: 0 }, new Set());
    expect(p.met).toBe(true);
    expect(p.claimed).toBe(false);
    expect(p.claimable).toBe(true);
  });

  it("marks a met but claimed goal not claimable", () => {
    const [p] = computeGoalProgress([daily], { todayCount: 5, weekCount: 0 }, new Set(["daily-3"]));
    expect(p.met).toBe(true);
    expect(p.claimed).toBe(true);
    expect(p.claimable).toBe(false);
  });

  it("uses week count for weekly goals", () => {
    const [p] = computeGoalProgress([weekly], { todayCount: 1, weekCount: 10 }, new Set());
    expect(p.current).toBe(10);
    expect(p.met).toBe(true);
  });
});
