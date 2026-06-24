import { describe, expect, it } from "vitest";
import {
  getInventoryQuantity,
  increaseInventory,
  decreaseInventory,
} from "../domain/inventory";
import type { EstateInventoryEntry } from "../domain/types";

describe("estate inventory helpers", () => {
  it("increases inventory without mutating the original entries", () => {
    const inventory: EstateInventoryEntry[] = [
      { definitionId: "bench", quantity: 1 },
    ];

    const nextInventory = increaseInventory(inventory, "bench", 2);

    expect(nextInventory).toEqual([{ definitionId: "bench", quantity: 3 }]);
    expect(inventory).toEqual([{ definitionId: "bench", quantity: 1 }]);
  });

  it("decreases inventory and removes zero-quantity entries", () => {
    const inventory: EstateInventoryEntry[] = [
      { definitionId: "bench", quantity: 1 },
      { definitionId: "pine-tree", quantity: 2 },
    ];

    const nextInventory = decreaseInventory(inventory, "bench", 1);

    expect(nextInventory).toEqual([
      { definitionId: "pine-tree", quantity: 2 },
    ]);
    expect(getInventoryQuantity(nextInventory, "bench")).toBe(0);
  });
});
