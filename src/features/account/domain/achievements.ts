import type { AwardTier } from "@/features/leagues/domain/types";

export type AchievementKey =
  | "campus-saver"
  | "energy-hero"
  | "grid-guardian"
  | "streak-7"
  | "check-in-10"
  | "top-student";

export type Achievement = {
  key: AchievementKey;
  earned: boolean;
  locked: boolean; // future / admin-awarded, not yet available
  tier?: AwardTier; // set for an earned top-student award
};

export function deriveAchievements(input: {
  level: number;
  longestStreak: number;
  totalCheckIns: number;
  hasTopStudentAward?: boolean;
  topStudentTier?: AwardTier;
}): Achievement[] {
  const {
    level,
    longestStreak,
    totalCheckIns,
    hasTopStudentAward = false,
    topStudentTier,
  } = input;

  const topStudent: Achievement = hasTopStudentAward
    ? {
        key: "top-student",
        earned: true,
        locked: false,
        ...(topStudentTier ? { tier: topStudentTier } : {}),
      }
    : { key: "top-student", earned: false, locked: true };

  return [
    { key: "campus-saver", earned: true, locked: false },
    { key: "energy-hero", earned: level >= 5, locked: false },
    { key: "grid-guardian", earned: level >= 10, locked: false },
    { key: "streak-7", earned: longestStreak >= 7, locked: false },
    { key: "check-in-10", earned: totalCheckIns >= 10, locked: false },
    topStudent,
  ];
}
