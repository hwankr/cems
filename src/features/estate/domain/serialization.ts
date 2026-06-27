import type { EstateParseResult, EstateSnapshot } from "./types";
import { clampMainBuildingLevel } from "./main-building";

export function serializeEstateSnapshot(snapshot: EstateSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseEstateSnapshot(serialized: string): EstateParseResult {
  let value: unknown;

  try {
    value = JSON.parse(serialized);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  if (!isRecord(value)) {
    return { ok: false, reason: "invalid-shape" };
  }

  if (value.schemaVersion !== 1 && value.schemaVersion !== 2) {
    return { ok: false, reason: "unsupported-schema-version" };
  }

  if (!hasEstateSnapshotShape(value)) {
    return { ok: false, reason: "invalid-shape" };
  }

  return {
    ok: true,
    snapshot: {
      schemaVersion: 2,
      subjectId: value.subjectId,
      mainBuildingLevel: clampMainBuildingLevel(value.mainBuildingLevel),
      unlockedParcelIds: value.unlockedParcelIds,
      items: value.items,
      inventory: value.inventory,
      groundTiles: value.groundTiles,
      transactions: value.transactions,
      updatedAt: value.updatedAt,
    } as EstateSnapshot,
  };
}

type EstateSnapshotShape = {
  subjectId: string;
  mainBuildingLevel?: unknown;
  unlockedParcelIds: unknown[];
  items: unknown[];
  inventory: unknown[];
  groundTiles: unknown[];
  transactions: unknown[];
  updatedAt: string;
};

function hasEstateSnapshotShape(
  value: Record<string, unknown>,
): value is Record<string, unknown> & EstateSnapshotShape {
  return (
    typeof value.subjectId === "string" &&
    Array.isArray(value.unlockedParcelIds) &&
    Array.isArray(value.items) &&
    Array.isArray(value.inventory) &&
    Array.isArray(value.groundTiles) &&
    Array.isArray(value.transactions) &&
    typeof value.updatedAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
