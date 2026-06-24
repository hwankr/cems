import { describe, expect, it } from "vitest";
import { estateExpansionCatalog } from "../data/estate-expansion-catalog";
import { estateItemCatalog } from "../data/estate-item-catalog";
import {
  canPlaceEstateItem,
  getEstateItemFootprint,
  getRotatedFootprint,
} from "../domain/placement";
import type { EstateItemInstance, EstateSnapshot } from "../domain/types";

const baseSnapshot: EstateSnapshot = {
  schemaVersion: 1,
  subjectId: "yu-e21",
  unlockedParcelIds: ["central-campus"],
  items: [],
  inventory: [],
  groundTiles: [],
  transactions: [],
  updatedAt: "2026-06-24T00:00:00.000Z",
};

describe("estate placement", () => {
  it("swaps footprint width and height for quarter turns 1 and 3", () => {
    expect(getRotatedFootprint({ width: 2, height: 3 }, 1)).toEqual({
      width: 3,
      height: 2,
    });
    expect(getRotatedFootprint({ width: 2, height: 3 }, 3)).toEqual({
      width: 3,
      height: 2,
    });
    expect(getRotatedFootprint({ width: 2, height: 3 }, 2)).toEqual({
      width: 2,
      height: 3,
    });
  });

  it("rejects placement outside unlocked cells", () => {
    const pavilion = getEstateItemFootprint("solar-pavilion", estateItemCatalog);

    expect(pavilion).toEqual({ width: 3, height: 2 });

    expect(
      canPlaceEstateItem(
        baseSnapshot,
        {
          definitionId: "solar-pavilion",
          x: 7,
          y: 7,
          rotation: 0,
        },
        estateItemCatalog,
        estateExpansionCatalog,
      ),
    ).toEqual({ ok: false, reason: "out-of-bounds" });
  });

  it("rejects collisions with other non-ground items", () => {
    const existingItem: EstateItemInstance = {
      id: "item-1",
      definitionId: "bench",
      x: 2,
      y: 2,
      rotation: 0,
      placedAt: "2026-06-24T00:00:00.000Z",
    };

    expect(
      canPlaceEstateItem(
        {
          ...baseSnapshot,
          items: [existingItem],
        },
        {
          definitionId: "small-greenhouse",
          x: 2,
          y: 2,
          rotation: 0,
        },
        estateItemCatalog,
        estateExpansionCatalog,
      ),
    ).toEqual({ ok: false, reason: "collision" });
  });
});
