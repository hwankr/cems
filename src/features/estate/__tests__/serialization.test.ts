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

  it("defaults eco-credit fields when parsing a legacy v2 snapshot", () => {
    const serialized = JSON.stringify({
      schemaVersion: 2,
      subjectId: "yu-e21",
      mainBuildingLevel: 1,
      unlockedParcelIds: ["central-campus"],
      items: [],
      inventory: [],
      groundTiles: [],
      transactions: [],
      updatedAt: "2026-06-24T00:00:00.000Z",
    });

    const result = parseEstateSnapshot(serialized);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.schemaVersion).toBe(3);
    expect(result.snapshot.ecoCredits).toBe(0);
    expect(result.snapshot.ecoCollectedAt).toBe("2026-06-24T00:00:00.000Z");
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
