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
};

export function deriveAchievements(input: {
  level: number;
  longestStreak: number;
  totalCheckIns: number;
}): Achievement[] {
  const { level, longestStreak, totalCheckIns } = input;
  return [
    { key: "campus-saver", earned: true, locked: false },
    { key: "energy-hero", earned: level >= 5, locked: false },
    { key: "grid-guardian", earned: level >= 10, locked: false },
    { key: "streak-7", earned: longestStreak >= 7, locked: false },
    { key: "check-in-10", earned: totalCheckIns >= 10, locked: false },
    { key: "top-student", earned: false, locked: true },
  ];
}
