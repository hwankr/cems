import { describe, expect, it } from "vitest";
import {
  createInitialEstateSnapshot,
} from "../domain/commands";
import {
  parseEstateSnapshot,
  serializeEstateSnapshot,
} from "../domain/serialization";

describe("estate snapshot serialization", () => {
  it("round-trips a versioned estate snapshot", () => {
    const snapshot = createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-24T00:00:00.000Z",
    });

    const serialized = serializeEstateSnapshot(snapshot);

    expect(parseEstateSnapshot(serialized)).toEqual({
      ok: true,
      snapshot,
    });
  });

  it("rejects snapshots with unsupported schema versions", () => {
    const serialized = JSON.stringify({
      schemaVersion: 99,
      subjectId: "yu-e21",
      unlockedParcelIds: [],
      items: [],
      inventory: [],
      groundTiles: [],
      transactions: [],
      updatedAt: "2026-06-24T00:00:00.000Z",
    });

    expect(parseEstateSnapshot(serialized)).toEqual({
      ok: false,
      reason: "unsupported-schema-version",
    });
  });
});
