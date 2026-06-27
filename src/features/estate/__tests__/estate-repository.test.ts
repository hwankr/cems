import { describe, expect, it, vi } from "vitest";
import {
  createDemoEstateSeedSnapshot,
} from "../data/demo-estate-data";
import { estateExpansionCatalog } from "../data/estate-expansion-catalog";
import {
  baseEstateBuildingDefinition,
  estateItemCatalog,
} from "../data/estate-item-catalog";
import {
  createDebouncedEstateSaver,
  getEstateStorageKey,
  migrateEstateSnapshot,
  toPersistableEstateSnapshot,
  type EstateRepositoryLoadResult,
} from "../persistence/estate-repository";
import { LocalStorageEstateRepository } from "../persistence/local-storage-estate-repository";
import { MemoryEstateRepository } from "../persistence/memory-estate-repository";
import type { EstateSnapshot } from "../domain/types";

class TestStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class ThrowingWriteStorage extends TestStorage {
  override setItem(): void {
    throw new Error("write failed");
  }
}

function createSnapshot(subjectId: string): EstateSnapshot {
  return {
    ...createDemoEstateSeedSnapshot(subjectId),
    inventory: [{ definitionId: "bench", quantity: 2 }],
    transactions: [
      {
        id: `${subjectId}:tx:bench`,
        kind: "purchase-item",
        pointDelta: -180,
        itemDefinitionId: "bench",
        createdAt: "2026-06-24T00:00:00.000Z",
      },
    ],
  };
}

function expectLoadedSnapshot(
  result: EstateRepositoryLoadResult,
): EstateSnapshot {
  expect(result.ok).toBe(true);
  if (!result.ok || !result.snapshot) {
    throw new Error("Expected repository load to return a snapshot.");
  }

  return result.snapshot;
}

describe("estate persistence", () => {
  it("uses subject-specific v1 localStorage keys", () => {
    expect(getEstateStorageKey("yu-e21")).toBe("cems:estate:v1:yu-e21");
    expect(getEstateStorageKey("yu-e22")).toBe("cems:estate:v1:yu-e22");
  });

  it("keeps building A and B snapshots isolated", async () => {
    const storage = new TestStorage();
    const repository = new LocalStorageEstateRepository({ storage });

    const snapshotA = {
      ...createSnapshot("yu-e21"),
      unlockedParcelIds: ["central-campus", "east"],
    };
    const snapshotB = {
      ...createSnapshot("yu-e22"),
      inventory: [{ definitionId: "pine-tree", quantity: 1 }],
      unlockedParcelIds: ["central-campus", "south"],
    };

    await repository.save("yu-e21", snapshotA);
    await repository.save("yu-e22", snapshotB);

    expect(expectLoadedSnapshot(await repository.load("yu-e21"))).toEqual(
      snapshotA,
    );
    expect(expectLoadedSnapshot(await repository.load("yu-e22"))).toEqual(
      snapshotB,
    );
  });

  it("keeps an unlocked parcel after save and reload", async () => {
    const repository = new LocalStorageEstateRepository({
      storage: new TestStorage(),
    });
    const snapshot = {
      ...createSnapshot("yu-e21"),
      unlockedParcelIds: ["central-campus", "east"],
      transactions: [
        ...createSnapshot("yu-e21").transactions,
        {
          id: "tx-east",
          kind: "unlock-parcel" as const,
          pointDelta: -4_000,
          parcelId: "east",
          createdAt: "2026-06-24T00:00:00.000Z",
        },
      ],
    };

    await repository.save("yu-e21", snapshot);

    expect(expectLoadedSnapshot(await repository.load("yu-e21"))).toEqual(
      snapshot,
    );
  });

  it("loads the same snapshot after save", async () => {
    const repository = new LocalStorageEstateRepository({
      storage: new TestStorage(),
    });
    const snapshot = createSnapshot("yu-e21");

    await repository.save("yu-e21", snapshot);

    expect(expectLoadedSnapshot(await repository.load("yu-e21"))).toEqual(
      snapshot,
    );
  });

  it("returns a write failure without mutating the submitted snapshot", async () => {
    const repository = new LocalStorageEstateRepository({
      storage: new ThrowingWriteStorage(),
    });
    const snapshot = createSnapshot("yu-e21");
    const original = structuredClone(snapshot);

    await expect(repository.save("yu-e21", snapshot)).resolves.toEqual({
      ok: false,
      error: {
        code: "write-failed",
        subjectId: "yu-e21",
        message: "Estate snapshot could not be written to localStorage.",
      },
    });
    expect(snapshot).toEqual(original);
  });

  it("recovers corrupted JSON with the subject seed and error information", async () => {
    const storage = new TestStorage();
    const repository = new LocalStorageEstateRepository({ storage });

    storage.setItem(getEstateStorageKey("yu-e21"), "{bad json");

    const result = await repository.load("yu-e21");

    expect(result).toEqual({
      ok: true,
      snapshot: createDemoEstateSeedSnapshot("yu-e21"),
      recovered: true,
      error: {
        code: "invalid-json",
        subjectId: "yu-e21",
        message: "Stored estate snapshot is not valid JSON.",
      },
    });
  });

  it("rejects unsupported schema versions instead of interpreting them", () => {
    expect(
      migrateEstateSnapshot(
        {
          ...createSnapshot("yu-e21"),
          schemaVersion: 99,
        },
        { subjectId: "yu-e21" },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: "unsupported-schema-version",
        subjectId: "yu-e21",
        message: "Unsupported estate snapshot schema version: 99.",
      },
    });
  });

  it("rejects snapshots saved for a different subject", async () => {
    const storage = new TestStorage();
    const repository = new LocalStorageEstateRepository({ storage });

    storage.setItem(
      getEstateStorageKey("yu-e21"),
      JSON.stringify(createSnapshot("yu-e22")),
    );

    const result = await repository.load("yu-e21");

    expect(result).toEqual({
      ok: true,
      snapshot: createDemoEstateSeedSnapshot("yu-e21"),
      recovered: true,
      error: {
        code: "subject-mismatch",
        subjectId: "yu-e21",
        message: "Stored estate snapshot belongs to another subject.",
      },
    });
  });

  it("rejects missing arrays and invalid coordinates, rotations, or quantities", () => {
    const valid = createSnapshot("yu-e21");

    expect(
      migrateEstateSnapshot(
        {
          ...valid,
          inventory: undefined,
        },
        { subjectId: "yu-e21" },
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "invalid-shape", subjectId: "yu-e21" },
    });

    expect(
      migrateEstateSnapshot(
        {
          ...valid,
          items: [{ ...valid.items[0], x: -1 }],
        },
        { subjectId: "yu-e21" },
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "invalid-shape", subjectId: "yu-e21" },
    });

    expect(
      migrateEstateSnapshot(
        {
          ...valid,
          items: [{ ...valid.items[0], rotation: 4 }],
        },
        { subjectId: "yu-e21" },
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "invalid-shape", subjectId: "yu-e21" },
    });

    expect(
      migrateEstateSnapshot(
        {
          ...valid,
          inventory: [{ definitionId: "bench", quantity: -1 }],
        },
        { subjectId: "yu-e21" },
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "invalid-shape", subjectId: "yu-e21" },
    });
  });

  it("stores snapshots in memory repository", async () => {
    const repository = new MemoryEstateRepository();
    const snapshot = createSnapshot("yu-e21");

    await repository.save("yu-e21", snapshot);

    expect(expectLoadedSnapshot(await repository.load("yu-e21"))).toEqual(
      snapshot,
    );

    await repository.remove("yu-e21");

    expect(await repository.load("yu-e21")).toEqual({
      ok: true,
      snapshot: null,
      recovered: false,
    });
  });

  it("creates deterministic seed snapshots for each subject", () => {
    expect(createDemoEstateSeedSnapshot("yu-e21")).toEqual(
      createDemoEstateSeedSnapshot("yu-e21"),
    );
    expect(createDemoEstateSeedSnapshot("yu-e22")).toEqual(
      createDemoEstateSeedSnapshot("yu-e22"),
    );
    expect(createDemoEstateSeedSnapshot("yu-e21").subjectId).toBe("yu-e21");
    expect(createDemoEstateSeedSnapshot("yu-e22").subjectId).toBe("yu-e22");
  });

  it("seeds a subject with only a centered level-1 main building on clean grass", () => {
    const snapshot = createDemoEstateSeedSnapshot("yu-e21");

    expect(snapshot.schemaVersion).toBe(2);
    expect(snapshot.mainBuildingLevel).toBe(1);
    expect(snapshot.unlockedParcelIds).toEqual(["central-campus"]);
    expect(snapshot.items).toEqual([
      expect.objectContaining({
        id: "yu-e21:landmark",
        definitionId: "base-campus-building",
        x: 7,
        y: 7,
        rotation: 0,
      }),
    ]);
    expect(snapshot.groundTiles).toEqual([]);
    expect(snapshot.inventory).toEqual([]);
    expect(snapshot.transactions).toEqual([]);
  });

  it("places every seed item inside the central parcel without overlaps", () => {
    const snapshot = createDemoEstateSeedSnapshot("yu-e21");
    const central = estateExpansionCatalog.find(
      (parcel) => parcel.id === "central-campus",
    );
    if (!central) throw new Error("Expected a central parcel.");

    const { minX, minY, width, height } = central.bounds;
    const definitions = new Map(
      [baseEstateBuildingDefinition, ...estateItemCatalog].map((definition) => [
        definition.id,
        definition,
      ]),
    );
    const occupied = new Set<string>();

    for (const item of snapshot.items) {
      const definition = definitions.get(item.definitionId);
      expect(definition).toBeTruthy();
      if (!definition) continue;

      for (let x = item.x; x < item.x + definition.footprintWidth; x += 1) {
        for (let y = item.y; y < item.y + definition.footprintHeight; y += 1) {
          expect(x).toBeGreaterThanOrEqual(minX);
          expect(y).toBeGreaterThanOrEqual(minY);
          expect(x).toBeLessThan(minX + width);
          expect(y).toBeLessThan(minY + height);

          const key = `${x}:${y}`;
          expect(occupied.has(key)).toBe(false);
          occupied.add(key);
        }
      }
    }
  });

  it("does not mutate the source object while saving or strip unknown runtime fields into storage", async () => {
    const storage = new TestStorage();
    const repository = new LocalStorageEstateRepository({ storage });
    const snapshot = createSnapshot("yu-e21") as EstateSnapshot & {
      earnedPoints?: number;
    };
    snapshot.earnedPoints = 999_999;
    const original = structuredClone(snapshot);

    await repository.save("yu-e21", snapshot);

    expect(snapshot).toEqual(original);
    expect(storage.getItem(getEstateStorageKey("yu-e21"))).not.toContain(
      "earnedPoints",
    );
  });

  it("debounces saves and flushes the latest scheduled snapshot", async () => {
    vi.useFakeTimers();
    const repository = new MemoryEstateRepository();
    const saver = createDebouncedEstateSaver(repository, "yu-e21", {
      delayMs: 300,
    });

    const first = createSnapshot("yu-e21");
    const last = {
      ...createSnapshot("yu-e21"),
      inventory: [{ definitionId: "bench", quantity: 5 }],
    };

    saver.schedule(first);
    saver.schedule(last);
    await vi.advanceTimersByTimeAsync(299);

    expect(await repository.load("yu-e21")).toEqual({
      ok: true,
      snapshot: null,
      recovered: false,
    });

    await saver.flush();

    expect(expectLoadedSnapshot(await repository.load("yu-e21"))).toEqual(last);
    vi.useRealTimers();
  });

  it("migrates a v1 snapshot to v2 with a default main building level of 1", () => {
    const v1 = {
      schemaVersion: 1,
      subjectId: "yu-e21",
      unlockedParcelIds: ["central-campus"],
      items: [],
      inventory: [],
      groundTiles: [],
      transactions: [],
      updatedAt: "2026-06-24T00:00:00.000Z",
    };

    const result = migrateEstateSnapshot(v1, { subjectId: "yu-e21" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.schemaVersion).toBe(2);
    expect(result.snapshot.mainBuildingLevel).toBe(1);
  });

  it("accepts a v2 snapshot and clamps an out-of-range main building level", () => {
    const v2 = {
      schemaVersion: 2,
      subjectId: "yu-e21",
      mainBuildingLevel: 99,
      unlockedParcelIds: ["central-campus"],
      items: [],
      inventory: [],
      groundTiles: [],
      transactions: [
        {
          id: "tx-1",
          kind: "upgrade-building",
          pointDelta: -800,
          createdAt: "2026-06-24T00:00:00.000Z",
        },
      ],
      updatedAt: "2026-06-24T00:00:00.000Z",
    };

    const result = migrateEstateSnapshot(v2, { subjectId: "yu-e21" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.mainBuildingLevel).toBe(5);
    expect(result.snapshot.transactions[0]).toMatchObject({
      kind: "upgrade-building",
      pointDelta: -800,
    });
  });

  it("persists the schema version and main building level for the wire format", () => {
    const persisted = toPersistableEstateSnapshot({
      ...createDemoEstateSeedSnapshot("yu-e21"),
      mainBuildingLevel: 3,
    });

    expect(persisted.schemaVersion).toBe(2);
    expect(persisted.mainBuildingLevel).toBe(3);
  });
});
