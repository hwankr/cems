import { describe, expect, it } from "vitest";
import { estateExpansionCatalog } from "../data/estate-expansion-catalog";
import { createDemoEstateSeedSnapshot } from "../data/demo-estate-data";
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
  upgradeMainBuilding,
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
  it("rejects eco item purchases when eco-credits are insufficient", () => {
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
      reason: "insufficient-eco",
    });
  });

  it("adds purchased points-currency items to inventory and records point spending", () => {
    const snapshot = createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    });

    const result = purchaseEstateItem(
      snapshot,
      { definitionId: "solar-array" },
      createContext(100_000, ["tx-solar-array"]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.inventory).toEqual([
      { definitionId: "solar-array", quantity: 1 },
    ]);
    expect(result.snapshot.transactions).toEqual([
      {
        id: "tx-solar-array",
        kind: "purchase-item",
        pointDelta: -600,
        itemDefinitionId: "solar-array",
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
    // Inject bench into inventory directly (bench is eco-currency; no point transaction recorded)
    const withBench = withInventory(
      createInitialEstateSnapshot("yu-e21", {
        now: () => "2026-06-24T00:00:00.000Z",
      }),
      "bench",
      1,
    );

    const placed = placeEstateItem(
      withBench,
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
    // No transactions because bench was injected directly (eco purchase leaves no transaction)
    expect(removed.snapshot.transactions).toEqual([]);
  });

  it("supports the full purchase, place, move, rotate, and remove flow", () => {
    // Give the snapshot enough eco-credits so the eco purchase of bench succeeds.
    // Eco purchase does not consume a createId call, so placeEstateItem gets
    // "instance-bench" as the first id from its own context.
    const seed = {
      ...createInitialEstateSnapshot("yu-e21", {
        now: () => "2026-06-24T00:00:00.000Z",
      }),
      ecoCredits: 100_000,
    };

    const purchaseCtx = createContext(1_000, []);
    const purchased = purchaseEstateItem(
      seed,
      { definitionId: "bench" },
      purchaseCtx,
    );
    expect(purchased.ok).toBe(true);
    if (!purchased.ok) return;

    const placeCtx = createContext(1_000, ["instance-bench"]);
    const placed = placeEstateItem(
      purchased.snapshot,
      { definitionId: "bench", x: 0, y: 0, rotation: 0 },
      placeCtx,
    );
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const moveCtx = createContext(1_000);
    const moved = moveEstateItem(
      placed.snapshot,
      { instanceId: "instance-bench", x: 1, y: 0, rotation: 0 },
      moveCtx,
    );
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;

    const rotated = moveEstateItem(
      moved.snapshot,
      { instanceId: "instance-bench", x: 1, y: 0, rotation: 1 },
      moveCtx,
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
    // Eco purchase produces no transaction
    expect(rotated.snapshot.transactions).toHaveLength(0);

    const removed = removeEstateItem(
      rotated.snapshot,
      { instanceId: "instance-bench" },
      moveCtx,
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

  it("places and moves solar street lights on interior land cells", () => {
    const seed = withInventory(
      createInitialEstateSnapshot("yu-e21", {
        now: () => "2026-06-24T00:00:00.000Z",
      }),
      "solar-street-light",
      1,
    );

    const placed = placeEstateItem(
      seed,
      {
        definitionId: "solar-street-light",
        x: 1,
        y: 1,
        rotation: 0,
      },
      createContext(1_000, ["instance-light"]),
    );

    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const moved = moveEstateItem(
      placed.snapshot,
      {
        instanceId: "instance-light",
        x: 2,
        y: 1,
        rotation: 0,
      },
      createContext(1_000),
    );

    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.snapshot.items).toContainEqual(
      expect.objectContaining({
        id: "instance-light",
        definitionId: "solar-street-light",
        x: 2,
        y: 1,
        rotation: 0,
      }),
    );
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
          { x: 15, y: 0 },
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
    expect(result.skippedCells).toEqual([{ x: 15, y: 0 }]);
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

  it("rejects expansion when available points are below the parcel cost", () => {
    const snapshot = createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    });

    const result = unlockEstateParcel(
      snapshot,
      { parcelId: "east" },
      createContext(3_999),
    );

    expect(result).toEqual({
      ok: false,
      snapshot,
      reason: "insufficient-points",
    });
  });

  it("records one unlock transaction and spends points after successful expansion", () => {
    const snapshot = createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    });

    const result = unlockEstateParcel(
      snapshot,
      { parcelId: "east" },
      createContext(4_000, ["tx-east"]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.unlockedParcelIds).toEqual([
      "central-campus",
      "east",
    ]);
    expect(result.snapshot.transactions).toEqual([
      {
        id: "tx-east",
        kind: "unlock-parcel",
        pointDelta: -4_000,
        parcelId: "east",
        createdAt: "2026-06-24T00:00:00.000Z",
      },
    ]);
  });

  it("rejects expansion when no unlocked parcel is adjacent", () => {
    const snapshot: EstateSnapshot = {
      schemaVersion: 1,
      subjectId: "yu-e21",
      unlockedParcelIds: ["central-campus"],
      items: [],
      inventory: [],
      groundTiles: [],
      transactions: [],
      updatedAt: "2026-06-24T00:00:00.000Z",
    };

    const result = unlockEstateParcel(
      snapshot,
      { parcelId: "south-east" },
      createContext(20_000),
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
      unlockedParcelIds: ["central-campus", "east"],
    };

    const result = unlockEstateParcel(
      snapshot,
      { parcelId: "east" },
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

  it("upgrades the main building and records a spend transaction", () => {
    const context = createContext(5_000, ["tx-upgrade"]);
    const seed = createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    });

    const result = upgradeMainBuilding(
      seed,
      { type: "upgrade-main-building" },
      context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.mainBuildingLevel).toBe(2);
    expect(result.snapshot.transactions).toEqual([
      {
        id: "tx-upgrade",
        kind: "upgrade-building",
        pointDelta: -800,
        createdAt: "2026-06-24T00:00:00.000Z",
      },
    ]);
  });

  it("rejects an upgrade when points are insufficient", () => {
    const context = createContext(100);
    const seed = createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    });

    expect(
      upgradeMainBuilding(seed, { type: "upgrade-main-building" }, context),
    ).toEqual({ ok: false, snapshot: seed, reason: "insufficient-points" });
  });

  it("rejects an upgrade once the building is at the max level", () => {
    const context = createContext(1_000_000);
    const maxed = {
      ...createInitialEstateSnapshot("yu-e21", {
        now: () => "2026-06-24T00:00:00.000Z",
      }),
      mainBuildingLevel: 5,
    };

    expect(
      upgradeMainBuilding(maxed, { type: "upgrade-main-building" }, context),
    ).toEqual({ ok: false, snapshot: maxed, reason: "building-max-level" });
  });

  it("buys an eco-priced decoration from accrued eco-credits without a point transaction", () => {
    const start = "2026-06-24T00:00:00.000Z";
    const later = new Date(Date.parse(start) + 24 * 3_600_000).toISOString();
    const seed = {
      ...createDemoEstateSeedSnapshot("yu-e21"),
      ecoCollectedAt: start,
    };
    const context: EstateCommandContext = {
      earnedPoints: 0, // no points at all
      itemDefinitions: estateItemCatalog,
      parcelDefinitions: estateExpansionCatalog,
      createId: () => "tx-eco",
      now: () => later,
    };

    const result = purchaseEstateItem(
      seed,
      { definitionId: "broadleaf-tree" }, // eco cost 30
      context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.inventory).toEqual([
      { definitionId: "broadleaf-tree", quantity: 1 },
    ]);
    expect(result.snapshot.transactions).toEqual([]); // eco does not touch the pool
    expect(result.snapshot.ecoCredits).toBeGreaterThanOrEqual(0);
  });

  it("fails an eco purchase when eco-credits are insufficient", () => {
    const start = "2026-06-24T00:00:00.000Z";
    const seed = {
      ...createDemoEstateSeedSnapshot("yu-e21"),
      ecoCollectedAt: start,
    };
    const context: EstateCommandContext = {
      earnedPoints: 0,
      itemDefinitions: estateItemCatalog,
      parcelDefinitions: estateExpansionCatalog,
      createId: () => "tx-eco",
      now: () => start, // no time elapsed => 0 pending, 0 banked
    };

    const result = purchaseEstateItem(seed, { definitionId: "fountain" }, context);
    expect(result).toMatchObject({ ok: false, reason: "insufficient-eco" });
  });
});
