// Single source of truth for the leveled main building. Leveling is visual
// prestige only: it changes the building's sprite and a level badge, and spends
// points; it does not gate content or change the economy formula.
export const MAIN_BUILDING_MAX_LEVEL = 5;

// Cost to advance from level N to N+1. Index 0 = Lv.1 -> Lv.2, etc. Escalates
// ~2.2x so the building is a meaningful long-term point sink.
export const MAIN_BUILDING_UPGRADE_COSTS: readonly number[] = [
  800, 2_000, 4_500, 9_000,
];

export const MAIN_BUILDING_LEVEL_ASSET_IDS: readonly string[] = Array.from(
  { length: MAIN_BUILDING_MAX_LEVEL },
  (_unused, index) => `campus-building-lv${index + 1}`,
);

export function clampMainBuildingLevel(level: unknown): number {
  const numeric =
    typeof level === "number" && Number.isFinite(level)
      ? Math.floor(level)
      : 1;

  return Math.min(MAIN_BUILDING_MAX_LEVEL, Math.max(1, numeric));
}

export function isMainBuildingMaxLevel(level: number): boolean {
  return clampMainBuildingLevel(level) >= MAIN_BUILDING_MAX_LEVEL;
}

export function getMainBuildingUpgradeCost(level: number): number | null {
  const current = clampMainBuildingLevel(level);
  if (current >= MAIN_BUILDING_MAX_LEVEL) return null;

  return MAIN_BUILDING_UPGRADE_COSTS[current - 1] ?? null;
}

export function getMainBuildingAssetId(level: number): string {
  return MAIN_BUILDING_LEVEL_ASSET_IDS[clampMainBuildingLevel(level) - 1];
}
