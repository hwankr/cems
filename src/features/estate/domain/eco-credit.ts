import { clampMainBuildingLevel } from "./main-building";
import type { EstateItemDefinition, EstateSnapshot } from "./types";

/** Offline accrual is capped at this many hours of production. */
export const ECO_ACCRUAL_CAP_HOURS = 24;

/** Base eco-credits/hour the main building always produces, scaling by level. */
export function mainBuildingEcoRatePerHour(level: number): number {
  return 6 * clampMainBuildingLevel(level);
}

/** Total eco-credits/hour = main-building base + each placed generator's rate. */
export function getEstateEcoRatePerHour(
  snapshot: EstateSnapshot,
  itemDefinitions: readonly EstateItemDefinition[],
): number {
  const rateById = new Map(
    itemDefinitions.map((definition) => [definition.id, definition.ecoRatePerHour ?? 0]),
  );
  const placedRate = snapshot.items.reduce(
    (sum, item) => sum + (rateById.get(item.definitionId) ?? 0),
    0,
  );
  return mainBuildingEcoRatePerHour(snapshot.mainBuildingLevel) + placedRate;
}

/** Uncollected accrual: floor(rate * hours), clamped to a 0..cap window. */
export function getPendingEcoCredits(
  snapshot: EstateSnapshot,
  itemDefinitions: readonly EstateItemDefinition[],
  nowIso: string,
): number {
  const rate = getEstateEcoRatePerHour(snapshot, itemDefinitions);
  if (rate <= 0) return 0;

  const elapsedMs =
    new Date(nowIso).getTime() - new Date(snapshot.ecoCollectedAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;

  const hours = Math.min(elapsedMs / 3_600_000, ECO_ACCRUAL_CAP_HOURS);
  return Math.floor(rate * hours);
}

/** Banked balance plus uncollected pending accrual. */
export function getAvailableEcoCredits(
  snapshot: EstateSnapshot,
  itemDefinitions: readonly EstateItemDefinition[],
  nowIso: string,
): number {
  return (
    Math.max(0, Math.floor(snapshot.ecoCredits)) +
    getPendingEcoCredits(snapshot, itemDefinitions, nowIso)
  );
}

/** Banks pending accrual into ecoCredits and resets the accrual clock. */
export function collectEcoCredits(
  snapshot: EstateSnapshot,
  itemDefinitions: readonly EstateItemDefinition[],
  nowIso: string,
): EstateSnapshot {
  const pending = getPendingEcoCredits(snapshot, itemDefinitions, nowIso);
  if (pending <= 0 && snapshot.ecoCollectedAt === nowIso) return snapshot;

  return {
    ...snapshot,
    ecoCredits: Math.max(0, Math.floor(snapshot.ecoCredits)) + pending,
    ecoCollectedAt: nowIso,
  };
}

/** Collects pending, then subtracts cost. Fails if the balance is too low. */
export function spendEcoCredits(
  snapshot: EstateSnapshot,
  itemDefinitions: readonly EstateItemDefinition[],
  cost: number,
  nowIso: string,
): { ok: true; snapshot: EstateSnapshot } | { ok: false } {
  if (!Number.isInteger(cost) || cost < 0) return { ok: false };

  const banked = collectEcoCredits(snapshot, itemDefinitions, nowIso);
  if (banked.ecoCredits < cost) return { ok: false };

  return {
    ok: true,
    snapshot: { ...banked, ecoCredits: banked.ecoCredits - cost },
  };
}
