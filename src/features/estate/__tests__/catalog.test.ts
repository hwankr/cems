import { describe, expect, it } from "vitest";
import {
  baseEstateBuildingDefinition,
  estateItemCatalog,
} from "../data/estate-item-catalog";

const requiredItemIds = [
  "broadleaf-tree",
  "pine-tree",
  "flower-bed",
  "bench",
  "solar-street-light",
  "campus-flag",
  "fountain",
  "small-greenhouse",
  "solar-pavilion",
  "recycling-station",
  "stone-path",
  "bright-sidewalk-block",
  "grass-decoration",
  "decorative-shrub",
  "small-sculpture",
] as const;

describe("estate item catalog", () => {
  it("contains the required starter purchase items with positive costs", () => {
    expect(estateItemCatalog.map((item) => item.id)).toEqual(requiredItemIds);
    expect(estateItemCatalog.every((item) => item.cost > 0)).toBe(true);
  });

  it("keeps the fixed base building out of the purchase catalog", () => {
    expect(baseEstateBuildingDefinition.cost).toBe(0);
    expect(
      estateItemCatalog.some(
        (item) => item.id === baseEstateBuildingDefinition.id,
      ),
    ).toBe(false);
  });

  it("keeps street lights placeable on land while flags remain edge-only", () => {
    const placementRules = new Map(
      estateItemCatalog.map((item) => [item.id, item.placementRule]),
    );

    expect(placementRules.get("solar-street-light")).toBe("land");
    expect(placementRules.get("campus-flag")).toBe("edge");
  });
});
