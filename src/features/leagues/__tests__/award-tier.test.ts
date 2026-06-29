import { describe, expect, it } from "vitest";
import {
  PODIUM_VISUAL_ORDER,
  TIER_PALETTE,
  TIER_PEDESTAL_REM,
} from "../domain/award-tier";

describe("award tier palette", () => {
  it("freezes the canonical tier fill hexes", () => {
    expect(TIER_PALETTE.gold.fill).toBe("#f5c518");
    expect(TIER_PALETTE.silver.fill).toBe("#c3cad3");
    expect(TIER_PALETTE.bronze.fill).toBe("#cd7f32");
  });

  it("exposes soft/text/outline tones for every tier", () => {
    for (const tier of ["gold", "silver", "bronze"] as const) {
      expect(TIER_PALETTE[tier].soft).toMatch(/^#/);
      expect(TIER_PALETTE[tier].text).toMatch(/^#/);
      expect(TIER_PALETTE[tier].outline).toMatch(/^#/);
    }
  });

  it("orders the podium silver, gold (center), bronze", () => {
    expect(PODIUM_VISUAL_ORDER).toEqual(["silver", "gold", "bronze"]);
  });

  it("makes the gold pedestal the tallest", () => {
    expect(TIER_PEDESTAL_REM.gold).toBeGreaterThan(TIER_PEDESTAL_REM.silver);
    expect(TIER_PEDESTAL_REM.silver).toBeGreaterThan(TIER_PEDESTAL_REM.bronze);
  });
});
