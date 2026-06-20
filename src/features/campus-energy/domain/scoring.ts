import type {
  CharacterProgress,
  EnergyComparison,
  RankedEnergySubject,
} from "./types";

const DEFAULT_POINT_MULTIPLIER = 10;
const POINTS_PER_LEVEL = 1000;

export function calculatePoints(
  comparison: EnergyComparison,
  multiplier = DEFAULT_POINT_MULTIPLIER,
): number {
  return Math.max(0, Math.round(comparison.savingsKwh * multiplier));
}

export function rankSubjects(
  comparisons: EnergyComparison[],
): RankedEnergySubject[] {
  return comparisons
    .map((comparison) => ({
      ...comparison,
      points: calculatePoints(comparison),
    }))
    .sort(
      (a, b) => b.points - a.points || a.subjectId.localeCompare(b.subjectId),
    )
    .map((comparison, index) => ({
      ...comparison,
      rank: index + 1,
    }));
}

function getTitle(level: number) {
  if (level >= 10) return "Grid Guardian";
  if (level >= 5) return "Energy Hero";
  return "Campus Saver";
}

export function getCharacterProgress(points: number): CharacterProgress {
  const normalizedPoints = Math.max(0, Math.floor(points));
  const level = Math.floor(normalizedPoints / POINTS_PER_LEVEL) + 1;
  const currentLevelPoints = normalizedPoints % POINTS_PER_LEVEL;
  const progressRate = currentLevelPoints / POINTS_PER_LEVEL;

  return {
    level,
    currentLevelPoints,
    nextLevelPoints: POINTS_PER_LEVEL,
    progressRate,
    title: getTitle(level),
  };
}
