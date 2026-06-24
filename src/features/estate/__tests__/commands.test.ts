import { describe, expect, it } from "vitest";
import { estateExpansionCatalog } from "../data/estate-expansion-catalog";
import { estateItemCatalog } from "../data/estate-item-catalog";
import {
  createInitialEstateSnapshot,
  paintEstateGround,
  placeEstateItem,
  purchaseEstateItem,
  removeEstateItem,
  unlockEstateParcel,
} from "../domain/commands";
import type { EstateCommandContext, EstateSnapshot } from "../domain/types";

function createContext(
  earnedPoints: number,
  ids: string[] = ["id-1", "id-2", "id-3", "id-4"],
): EstateCommandContext {
  let index = 0;

  return {
    earnedPoints,
    itemDefinitions: estateItemCatalog,
    parcelDefinitions: estateExpansionCatalog,
    createId: () => ids[index++] ?? `id-${index}`,
    now: () => "2026-06-24T00:00:00.000Z",
  };
}

function withInventory(
  snapshot: EstateSnapshot,
  definitionId: string,
  quantity: number,
): EstateSnapshot {
  return {
    ...snapshot,
    inventory: [{ definitionId, quantity }],
  };
}

describe("estate commands", () => {
  it("rejects item purchases when available points are insufficient", () => {
    const snapshot = createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    });

    const result = purchaseEstateItem(
      snapshot,
      { definitionId: "fountain" },
      createContext(100),
    );

    expect(result).toEqual({
      ok: false,
      snapshot,
      reason: "insufficient-points",
    });
  });

  it("adds purchased items to inventory and records point spending", () => {
    const snapshot = createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    });

    const result = purchaseEstateItem(
      snapshot,
      { definitionId: "bench" },
      createContext(1_000, ["tx-bench"]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.inventory).toEqual([
      { definitionId: "bench", quantity: 1 },
    ]);
    expect(result.snapshot.transactions).toEqual([
      {
        id: "tx-bench",
        kind: "purchase-item",
        pointDelta: -180,
        itemDefinitionId: "bench",
        createdAt: "2026-06-24T00:00:00.000Z",
      },
    ]);
    expect(snapshot.inventory).toEqual([]);
  });

  it("decreases inventory when an item is placed", () => {
    const snapshot = withInventory(
      createInitialEstateSnapshot("yu-e21", {
        now: () => "2026-06-24T00:00:00.000Z",
      }),
      "bench",
      1,
    );

    const result = placeEstateItem(
      snapshot,
      {
        definitionId: "bench",
        x: 0,
        y: 0,
        rotation: 0,
      },
      createContext(1_000, ["instance-bench"]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.inventory).toEqual([]);
    expect(result.snapshot.items).toContainEqual({
      id: "instance-bench",
      definitionId: "bench",
      x: 0,
      y: 0,
      rotation: 0,
      placedAt: "2026-06-24T00:00:00.000Z",
    });
  });

  it("returns removed placed items to inventory without refunding points", () => {
    const purchased = purchaseEstateItem(
      createInitialEstateSnapshot("yu-e21", {
        now: () => "2026-06-24T00:00:00.000Z",
      }),
      { definitionId: "bench" },
      createContext(1_000, ["tx-bench"]),
    );
    if (!purchased.ok) throw new Error("purchase failed");

    const placed = placeEstateItem(
      purchased.snapshot,
      {
        definitionId: "bench",
        x: 0,
        y: 0,
        rotation: 0,
      },
      createContext(1_000, ["instance-bench"]),
    );
    if (!placed.ok) throw new Error("place failed");

    const removed = removeEstateItem(
      placed.snapshot,
      { instanceId: "instance-bench" },
      createContext(1_000),
    );

    expect(removed.ok).toBe(true);
    if (!removed.ok) return;

    expect(removed.snapshot.items).toEqual(
      placed.snapshot.items.filter((item) => item.id !== "instance-bench"),
    );
    expect(removed.snapshot.inventory).toEqual([
      { definitionId: "bench", quantity: 1 },
    ]);
    expect(removed.snapshot.transactions).toEqual(
      purchased.snapshot.transactions,
    );
  });

  it("overwrites ground tiles and does not repurchase the same ground kind", () => {
    const snapshot = withInventory(
      {
        ...createInitialEstateSnapshot("yu-e21", {
          now: () => "2026-06-24T00:00:00.000Z",
        }),
        groundTiles: [{ x: 1, y: 1, definitionId: "stone-path" }],
      },
      "stone-path",
      1,
    );

    const result = paintEstateGround(
      snapshot,
      { definitionId: "stone-path", x: 1, y: 1 },
      createContext(1_000),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.groundTiles).toEqual(snapshot.groundTiles);
    expect(result.snapshot.inventory).toEqual(snapshot.inventory);
  });

  it("overwrites an existing ground tile with a different owned ground kind", () => {
    const snapshot = withInventory(
      {
        ...createInitialEstateSnapshot("yu-e21", {
          now: () => "2026-06-24T00:00:00.000Z",
        }),
        groundTiles: [{ x: 1, y: 1, definitionId: "stone-path" }],
      },
      "bright-sidewalk-block",
      1,
    );

    const result = paintEstateGround(
      snapshot,
      { definitionId: "bright-sidewalk-block", x: 1, y: 1 },
      createContext(1_000),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.groundTiles).toEqual([
      { x: 1, y: 1, definitionId: "bright-sidewalk-block" },
    ]);
    expect(result.snapshot.inventory).toEqual([]);
  });

  it("rejects expansion when no unlocked parcel is adjacent", () => {
    const snapshot: EstateSnapshot = {
      schemaVersion: 1,
      subjectId: "yu-e21",
      unlockedParcelIds: ["remote-island"],
      items: [],
      inventory: [],
      groundTiles: [],
      transactions: [],
      updatedAt: "2026-06-24T00:00:00.000Z",
    };

    const result = unlockEstateParcel(
      snapshot,
      { parcelId: "east-yard" },
      createContext(5_000),
    );

    expect(result).toEqual({
      ok: false,
      snapshot,
      reason: "parcel-not-adjacent",
    });
  });

  it("rejects duplicate parcel expansion", () => {
    const snapshot = {
      ...createInitialEstateSnapshot("yu-e21", {
        now: () => "2026-06-24T00:00:00.000Z",
      }),
      unlockedParcelIds: ["central-campus", "east-yard"],
    };

    const result = unlockEstateParcel(
      snapshot,
      { parcelId: "east-yard" },
      createContext(5_000),
    );

    expect(result).toEqual({
      ok: false,
      snapshot,
      reason: "already-unlocked",
    });
  });

  it("returns the original snapshot when a command fails", () => {
    const snapshot = createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    });

    const result = placeEstateItem(
      snapshot,
      {
        definitionId: "bench",
        x: 0,
        y: 0,
        rotation: 0,
      },
      createContext(1_000),
    );

    expect(result).toEqual({
      ok: false,
      snapshot,
      reason: "missing-inventory",
    });
    expect(result.snapshot).toBe(snapshot);
  });
});
