import { describe, expect, it } from "vitest";
import { estateExpansionCatalog } from "../data/estate-expansion-catalog";
import {
  getInitialEstateParcelIds,
  getParcelCells,
  getUnlockedEstateCells,
  isParcelAdjacentToUnlockedParcel,
  validateEstateParcelCatalog,
} from "../domain/expansion";
import type { EstateParcelDefinition } from "../domain/types";

describe("estate expansion catalog", () => {
  it("keeps exactly one free initial parcel unlocked by default", () => {
    expect(getInitialEstateParcelIds(estateExpansionCatalog)).toEqual([
      "central-campus",
    ]);
    expect(estateExpansionCatalog.find((parcel) => parcel.initial)).toMatchObject(
      {
        id: "central-campus",
        cost: 0,
        bounds: { minX: 0, minY: 0, width: 8, height: 8 },
      },
    );
  });

  it("uses explicit adjacency rules for unlock availability", () => {
    expect(
      isParcelAdjacentToUnlockedParcel(
        "east-yard",
        ["central-campus"],
        estateExpansionCatalog,
      ),
    ).toBe(true);
    expect(
      isParcelAdjacentToUnlockedParcel(
        "south-east-plaza",
        ["central-campus"],
        estateExpansionCatalog,
      ),
    ).toBe(false);
    expect(
      isParcelAdjacentToUnlockedParcel(
        "south-east-plaza",
        ["central-campus", "east-yard"],
        estateExpansionCatalog,
      ),
    ).toBe(true);
  });

  it("computes unlocked cells as the union of all unlocked parcel cells", () => {
    const cells = getUnlockedEstateCells(
      ["central-campus", "east-yard"],
      estateExpansionCatalog,
    );
    const cellKeys = new Set(cells.map((cell) => `${cell.x}:${cell.y}`));

    expect(cells).toHaveLength(96);
    expect(cellKeys.size).toBe(cells.length);
    expect(cells).toContainEqual({ x: 0, y: 0 });
    expect(cells).toContainEqual({ x: 11, y: 7 });
  });

  it("validates parcel catalog adjacency and rejects overlapping bounds", () => {
    expect(validateEstateParcelCatalog(estateExpansionCatalog)).toEqual([]);

    const overlappingCatalog: readonly EstateParcelDefinition[] = [
      {
        id: "first",
        bounds: { minX: 0, minY: 0, width: 3, height: 3 },
        cost: 0,
        adjacentParcelIds: ["second"],
        initial: true,
      },
      {
        id: "second",
        bounds: { minX: 2, minY: 2, width: 3, height: 3 },
        cost: 2_000,
        adjacentParcelIds: ["first"],
        initial: false,
      },
    ];

    expect(validateEstateParcelCatalog(overlappingCatalog)).toContainEqual(
      expect.objectContaining({
        code: "overlapping-cells",
        parcelIds: ["first", "second"],
      }),
    );
  });

  it("expands rectangular bounds from min coordinates", () => {
    const parcel = estateExpansionCatalog.find(
      (candidate) => candidate.id === "south-yard",
    );

    expect(parcel ? getParcelCells(parcel) : []).toContainEqual({ x: 0, y: 11 });
  });
});
