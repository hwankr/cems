import { describe, expect, it, vi } from "vitest";
import {
  createDemoEstateSeedSnapshot,
} from "../data/demo-estate-data";
import {
  createDebouncedEstateSaver,
  getEstateStorageKey,
  migrateEstateSnapshot,
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
      unlockedParcelIds: ["central-campus", "east-yard"],
    };
    const snapshotB = {
      ...createSnapshot("yu-e22"),
      inventory: [{ definitionId: "pine-tree", quantity: 1 }],
      unlockedParcelIds: ["central-campus", "south-yard"],
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
      unlockedParcelIds: ["central-campus", "east-yard"],
      transactions: [
        ...createSnapshot("yu-e21").transactions,
        {
          id: "tx-east-yard",
          kind: "unlock-parcel" as const,
          pointDelta: -2_000,
          parcelId: "east-yard",
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

  it("seeds yu-e21 with an IT building landmark, entrance sidewalk, and trees", () => {
    const snapshot = createDemoEstateSeedSnapshot("yu-e21");

    expect(snapshot.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "yu-e21:landmark",
          definitionId: "base-campus-building",
          x: 3,
          y: 3,
        }),
        expect.objectContaining({ definitionId: "broadleaf-tree" }),
        expect.objectContaining({ definitionId: "pine-tree" }),
      ]),
    );
    expect(snapshot.groundTiles).toEqual(
      expect.arrayContaining([
        { x: 3, y: 6, definitionId: "bright-sidewalk-block" },
        { x: 4, y: 6, definitionId: "bright-sidewalk-block" },
      ]),
    );
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
});
