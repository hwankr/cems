import type { EstateParseResult, EstateSnapshot } from "./types";

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

  if (value.schemaVersion !== 1) {
    return { ok: false, reason: "unsupported-schema-version" };
  }

  if (!isEstateSnapshot(value)) {
    return { ok: false, reason: "invalid-shape" };
  }

  return { ok: true, snapshot: value };
}

function isEstateSnapshot(value: Record<string, unknown>): value is EstateSnapshot {
  return (
    value.schemaVersion === 1 &&
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
