import { describe, expect, it } from "vitest";
import { estateExpansionCatalog } from "../data/estate-expansion-catalog";
import { estateItemCatalog } from "../data/estate-item-catalog";
import {
  createInitialEstateSnapshot,
  moveEstateItem,
  paintEstateGround,
  paintEstateGroundCells,
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

  it("supports the full purchase, place, move, rotate, and remove flow", () => {
    const context = createContext(1_000, [
      "tx-bench",
      "instance-bench",
      "unused",
    ]);
    const seed = createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    });

    const purchased = purchaseEstateItem(
      seed,
      { definitionId: "bench" },
      context,
    );
    expect(purchased.ok).toBe(true);
    if (!purchased.ok) return;

    const placed = placeEstateItem(
      purchased.snapshot,
      { definitionId: "bench", x: 0, y: 0, rotation: 0 },
      context,
    );
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const moved = moveEstateItem(
      placed.snapshot,
      { instanceId: "instance-bench", x: 1, y: 0, rotation: 0 },
      context,
    );
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;

    const rotated = moveEstateItem(
      moved.snapshot,
      { instanceId: "instance-bench", x: 1, y: 0, rotation: 1 },
      context,
    );
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;

    expect(rotated.snapshot.items).toContainEqual(
      expect.objectContaining({
        id: "instance-bench",
        definitionId: "bench",
        x: 1,
        y: 0,
        rotation: 1,
      }),
    );
    expect(rotated.snapshot.transactions).toHaveLength(1);

    const removed = removeEstateItem(
      rotated.snapshot,
      { instanceId: "instance-bench" },
      context,
    );
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;

    expect(removed.snapshot.inventory).toEqual([
      { definitionId: "bench", quantity: 1 },
    ]);
    expect(removed.snapshot.transactions).toEqual(
      purchased.snapshot.transactions,
    );
  });

  it("moves an item without colliding with its own current footprint", () => {
    const snapshot: EstateSnapshot = {
      ...createInitialEstateSnapshot("yu-e21", {
        now: () => "2026-06-24T00:00:00.000Z",
      }),
      items: [
        {
          id: "instance-bench",
          definitionId: "bench",
          x: 0,
          y: 0,
          rotation: 0,
          placedAt: "2026-06-24T00:00:00.000Z",
        },
      ],
    };

    const result = moveEstateItem(
      snapshot,
      { instanceId: "instance-bench", x: 0, y: 0, rotation: 1 },
      createContext(1_000),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.items[0]).toMatchObject({ rotation: 1 });
  });

  it("protects the central landmark from move, rotate, and remove commands", () => {
    const snapshot = createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    });
    const landmarkId = snapshot.items[0]?.id;
    if (!landmarkId) throw new Error("Expected initial landmark.");

    expect(
      moveEstateItem(
        snapshot,
        { instanceId: landmarkId, x: 0, y: 0, rotation: 0 },
        createContext(1_000),
      ),
    ).toEqual({ ok: false, snapshot, reason: "protected-item" });
    expect(
      removeEstateItem(snapshot, { instanceId: landmarkId }, createContext(1_000)),
    ).toEqual({ ok: false, snapshot, reason: "protected-item" });
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

  it("paint-drags ground cells once per visited cell without duplicate spending", () => {
    const snapshot = createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    });

    const result = paintEstateGroundCells(
      snapshot,
      {
        definitionId: "stone-path",
        cells: [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 8, y: 0 },
        ],
      },
      createContext(1_000, ["tx-ground"]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.paintedCells).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    expect(result.skippedCells).toEqual([{ x: 8, y: 0 }]);
    expect(result.snapshot.transactions).toContainEqual({
      id: "tx-ground",
      kind: "purchase-ground",
      pointDelta: -80,
      itemDefinitionId: "stone-path",
      createdAt: "2026-06-24T00:00:00.000Z",
    });
  });

  it("stops ground drag painting at the last affordable cell", () => {
    const snapshot = createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    });

    const result = paintEstateGroundCells(
      snapshot,
      {
        definitionId: "stone-path",
        cells: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      },
      createContext(60, ["tx-ground"]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.paintedCells).toEqual([{ x: 0, y: 0 }]);
    expect(result.stoppedReason).toBe("insufficient-points");
    expect(result.snapshot.transactions).toHaveLength(1);
    expect(result.snapshot.transactions[0]?.pointDelta).toBe(-40);
    expect(result.snapshot.groundTiles).toContainEqual({
      x: 0,
      y: 0,
      definitionId: "stone-path",
    });
    expect(result.snapshot.groundTiles).not.toContainEqual({
      x: 1,
      y: 0,
      definitionId: "stone-path",
    });
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
