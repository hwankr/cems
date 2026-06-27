import { describe, expect, it } from "vitest";
import {
  MAIN_BUILDING_LEVEL_ASSET_IDS,
  MAIN_BUILDING_MAX_LEVEL,
  MAIN_BUILDING_UPGRADE_COSTS,
  clampMainBuildingLevel,
  getMainBuildingAssetId,
  getMainBuildingUpgradeCost,
  isMainBuildingMaxLevel,
} from "../domain/main-building";

describe("main building level helpers", () => {
  it("clamps levels into the legal 1..max range", () => {
    expect(clampMainBuildingLevel(0)).toBe(1);
    expect(clampMainBuildingLevel(1)).toBe(1);
    expect(clampMainBuildingLevel(5)).toBe(5);
    expect(clampMainBuildingLevel(99)).toBe(MAIN_BUILDING_MAX_LEVEL);
    expect(clampMainBuildingLevel(3.7)).toBe(3);
    expect(clampMainBuildingLevel(Number.NaN)).toBe(1);
    expect(clampMainBuildingLevel(undefined)).toBe(1);
  });

  it("returns the next upgrade cost or null at max level", () => {
    expect(getMainBuildingUpgradeCost(1)).toBe(MAIN_BUILDING_UPGRADE_COSTS[0]);
    expect(getMainBuildingUpgradeCost(4)).toBe(MAIN_BUILDING_UPGRADE_COSTS[3]);
    expect(getMainBuildingUpgradeCost(5)).toBeNull();
    expect(getMainBuildingUpgradeCost(0)).toBe(MAIN_BUILDING_UPGRADE_COSTS[0]);
  });

  it("reports the max level", () => {
    expect(isMainBuildingMaxLevel(4)).toBe(false);
    expect(isMainBuildingMaxLevel(5)).toBe(true);
    expect(isMainBuildingMaxLevel(99)).toBe(true);
  });

  it("maps each level to a sprite asset id", () => {
    expect(getMainBuildingAssetId(1)).toBe("campus-building-lv1");
    expect(getMainBuildingAssetId(5)).toBe("campus-building-lv5");
    expect(getMainBuildingAssetId(99)).toBe("campus-building-lv5");
    expect(MAIN_BUILDING_LEVEL_ASSET_IDS).toHaveLength(MAIN_BUILDING_MAX_LEVEL);
  });

  it("keeps one upgrade cost per gap between levels", () => {
    expect(MAIN_BUILDING_UPGRADE_COSTS).toHaveLength(MAIN_BUILDING_MAX_LEVEL - 1);
    for (const cost of MAIN_BUILDING_UPGRADE_COSTS) {
      expect(Number.isInteger(cost)).toBe(true);
      expect(cost).toBeGreaterThan(0);
    }
  });
});
