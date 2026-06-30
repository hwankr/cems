import { describe, expect, it } from "vitest";
import { quizStreakBonus } from "../domain/quiz";

describe("quizStreakBonus", () => {
  it("awards milestone bonuses only at exact streak lengths", () => {
    expect(quizStreakBonus(3)).toBe(20);
    expect(quizStreakBonus(7)).toBe(50);
    expect(quizStreakBonus(14)).toBe(100);
    expect(quizStreakBonus(30)).toBe(200);
  });

  it("gives no bonus off-milestone", () => {
    expect(quizStreakBonus(1)).toBe(0);
    expect(quizStreakBonus(2)).toBe(0);
    expect(quizStreakBonus(8)).toBe(0);
    expect(quizStreakBonus(0)).toBe(0);
  });

  it("accepts a custom milestone table", () => {
    expect(quizStreakBonus(5, { 5: 99 })).toBe(99);
    expect(quizStreakBonus(6, { 5: 99 })).toBe(0);
  });
});
