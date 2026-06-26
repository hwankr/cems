import { estateExpansionCatalog } from "../data/estate-expansion-catalog";
import {
  baseEstateBuildingDefinition,
  estateItemCatalog,
} from "../data/estate-item-catalog";
import { getCellKey, getUnlockedEstateCellKeys } from "../domain/expansion";
import {
  findEstateItemDefinition,
  getFootprintCells,
  getRotatedFootprint,
} from "../domain/placement";
import type {
  EstateGroundTile,
  EstateInventoryEntry,
  EstateItemDefinition,
  EstateItemInstance,
  EstateSnapshot,
  EstateTransaction,
  QuarterTurn,
} from "../domain/types";

export type EstateRepositoryErrorCode =
  | "invalid-json"
  | "invalid-shape"
  | "storage-unavailable"
  | "subject-mismatch"
  | "unsupported-schema-version"
  | "write-failed"
  | "conflict";

export type EstateRepositoryError = {
  code: EstateRepositoryErrorCode;
  subjectId: string;
  message: string;
};

export type EstateRepositoryLoadResult =
  | {
      ok: true;
      snapshot: EstateSnapshot | null;
      recovered: false;
    }
  | {
      ok: true;
      snapshot: EstateSnapshot;
      recovered: true;
      error: EstateRepositoryError;
    }
  | {
      ok: false;
      error: EstateRepositoryError;
    };

export type EstateRepositoryWriteResult =
  | { ok: true }
  | { ok: false; error: EstateRepositoryError };

export interface EstateRepository {
  load(subjectId: string): Promise<EstateRepositoryLoadResult>;
  save(
    subjectId: string,
    snapshot: EstateSnapshot,
  ): Promise<EstateRepositoryWriteResult>;
  remove(subjectId: string): Promise<EstateRepositoryWriteResult>;
}

export type EstateMigrationResult =
  | { ok: true; snapshot: EstateSnapshot }
  | { ok: false; error: EstateRepositoryError };

export type EstateMigrationOptions = {
  subjectId?: string;
};

export function getEstateStorageKey(subjectId: string): string {
  return `cems:estate:v1:${subjectId}`;
}

export function migrateEstateSnapshot(
  raw: unknown,
  options: EstateMigrationOptions = {},
): EstateMigrationResult {
  const subjectId = options.subjectId ?? readRawSubjectId(raw);

  if (!isRecord(raw)) {
    return invalidShape(subjectId);
  }

  switch (raw.schemaVersion) {
    case 1:
      return validateEstateSnapshotV1(raw, subjectId, options.subjectId);
    default:
      return {
        ok: false,
        error: {
          code: "unsupported-schema-version",
          subjectId,
          message: `Unsupported estate snapshot schema version: ${String(
            raw.schemaVersion,
          )}.`,
        },
      };
  }
}

export function toPersistableEstateSnapshot(
  snapshot: EstateSnapshot,
): EstateSnapshot {
  return {
    schemaVersion: 1,
    subjectId: snapshot.subjectId,
    unlockedParcelIds: snapshot.unlockedParcelIds.map((parcelId) => parcelId),
    items: snapshot.items.map((item) => ({ ...item })),
    inventory: snapshot.inventory.map((entry) => ({ ...entry })),
    groundTiles: snapshot.groundTiles.map((tile) => ({ ...tile })),
    transactions: snapshot.transactions.map((transaction) => ({
      ...transaction,
    })),
    updatedAt: snapshot.updatedAt,
  };
}

export function createDebouncedEstateSaver(
  repository: EstateRepository,
  subjectId: string,
  options: { delayMs?: number } = {},
) {
  const delayMs = clampDelay(options.delayMs ?? 350);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latestSnapshot: EstateSnapshot | null = null;
  let flushPromise: Promise<EstateRepositoryWriteResult> | null = null;

  function schedule(snapshot: EstateSnapshot): void {
    latestSnapshot = snapshot;

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, delayMs);
  }

  function flush(): Promise<EstateRepositoryWriteResult> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    flushPromise ??= runFlush().finally(() => {
      flushPromise = null;
    });

    return flushPromise;
  }

  function cancel(): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    latestSnapshot = null;
  }

  async function runFlush(): Promise<EstateRepositoryWriteResult> {
    let result: EstateRepositoryWriteResult = { ok: true };

    while (latestSnapshot) {
      const snapshot = latestSnapshot;
      latestSnapshot = null;
      result = await repository.save(subjectId, snapshot);
    }

    return result;
  }

  return { schedule, flush, cancel };
}

function validateEstateSnapshotV1(
  raw: Record<string, unknown>,
  subjectId: string,
  expectedSubjectId?: string,
): EstateMigrationResult {
  if (typeof raw.subjectId !== "string" || raw.subjectId.length === 0) {
    return invalidShape(subjectId);
  }

  if (expectedSubjectId && raw.subjectId !== expectedSubjectId) {
    return {
      ok: false,
      error: {
        code: "subject-mismatch",
        subjectId: expectedSubjectId,
        message: "Stored estate snapshot belongs to another subject.",
      },
    };
  }

  if (
    !Array.isArray(raw.unlockedParcelIds) ||
    !Array.isArray(raw.items) ||
    !Array.isArray(raw.inventory) ||
    !Array.isArray(raw.groundTiles) ||
    !Array.isArray(raw.transactions) ||
    typeof raw.updatedAt !== "string"
  ) {
    return invalidShape(raw.subjectId);
  }

  const unlockedParcelIds = validateUnlockedParcelIds(raw.unlockedParcelIds);
  if (!unlockedParcelIds) return invalidShape(raw.subjectId);

  const itemDefinitions = [baseEstateBuildingDefinition, ...estateItemCatalog];
  const items = validateItems(raw.items, unlockedParcelIds, itemDefinitions);
  if (!items) return invalidShape(raw.subjectId);

  const inventory = validateInventory(raw.inventory, itemDefinitions);
  if (!inventory) return invalidShape(raw.subjectId);

  const groundTiles = validateGroundTiles(raw.groundTiles, unlockedParcelIds);
  if (!groundTiles) return invalidShape(raw.subjectId);

  const transactions = validateTransactions(raw.transactions, itemDefinitions);
  if (!transactions) return invalidShape(raw.subjectId);

  return {
    ok: true,
    snapshot: {
      schemaVersion: 1,
      subjectId: raw.subjectId,
      unlockedParcelIds,
      items,
      inventory,
      groundTiles,
      transactions,
      updatedAt: raw.updatedAt,
    },
  };
}

function validateUnlockedParcelIds(value: unknown[]): string[] | null {
  const knownParcelIds = new Set(estateExpansionCatalog.map((parcel) => parcel.id));
  const seenParcelIds = new Set<string>();
  const parcelIds: string[] = [];

  for (const candidate of value) {
    if (
      typeof candidate !== "string" ||
      candidate.length === 0 ||
      !knownParcelIds.has(candidate) ||
      seenParcelIds.has(candidate)
    ) {
      return null;
    }

    seenParcelIds.add(candidate);
    parcelIds.push(candidate);
  }

  return parcelIds;
}

function validateItems(
  value: unknown[],
  unlockedParcelIds: readonly string[],
  itemDefinitions: readonly EstateItemDefinition[],
): EstateItemInstance[] | null {
  const unlockedCellKeys = getUnlockedEstateCellKeys(
    unlockedParcelIds,
    estateExpansionCatalog,
  );
  const occupiedCellKeys = new Set<string>();
  const items: EstateItemInstance[] = [];

  for (const candidate of value) {
    if (!isRecord(candidate)) return null;

    const item = readItemInstance(candidate);
    if (!item) return null;

    const definition = findEstateItemDefinition(
      itemDefinitions,
      item.definitionId,
    );
    if (!definition || definition.placementRule === "ground") return null;

    const footprint = getRotatedFootprint(
      {
        width: definition.footprintWidth,
        height: definition.footprintHeight,
      },
      item.rotation,
    );
    const cells = getFootprintCells(item, footprint);

    if (
      cells.length === 0 ||
      cells.some((cell) => !unlockedCellKeys.has(getCellKey(cell)))
    ) {
      return null;
    }

    for (const cell of cells) {
      const key = getCellKey(cell);
      if (occupiedCellKeys.has(key)) return null;
      occupiedCellKeys.add(key);
    }

    items.push(item);
  }

  return items;
}

function validateInventory(
  value: unknown[],
  itemDefinitions: readonly EstateItemDefinition[],
): EstateInventoryEntry[] | null {
  const entries: EstateInventoryEntry[] = [];
  const seenDefinitionIds = new Set<string>();

  for (const candidate of value) {
    if (!isRecord(candidate)) return null;

    const definitionId = candidate.definitionId;
    const quantity = candidate.quantity;

    if (
      typeof definitionId !== "string" ||
      definitionId.length === 0 ||
      !isInteger(quantity) ||
      quantity <= 0 ||
      seenDefinitionIds.has(definitionId) ||
      !findEstateItemDefinition(itemDefinitions, definitionId)
    ) {
      return null;
    }

    seenDefinitionIds.add(definitionId);
    entries.push({ definitionId, quantity });
  }

  return entries;
}

function validateGroundTiles(
  value: unknown[],
  unlockedParcelIds: readonly string[],
): EstateGroundTile[] | null {
  const unlockedCellKeys = getUnlockedEstateCellKeys(
    unlockedParcelIds,
    estateExpansionCatalog,
  );
  const tileKeys = new Set<string>();
  const tiles: EstateGroundTile[] = [];

  for (const candidate of value) {
    if (!isRecord(candidate)) return null;

    const x = candidate.x;
    const y = candidate.y;
    const definitionId = candidate.definitionId;
    const definition =
      typeof definitionId === "string"
        ? findEstateItemDefinition(estateItemCatalog, definitionId)
        : null;

    if (
      !isInteger(x) ||
      !isInteger(y) ||
      typeof definitionId !== "string" ||
      !definition ||
      definition.placementRule !== "ground"
    ) {
      return null;
    }

    const key = getCellKey({ x, y });
    if (!unlockedCellKeys.has(key) || tileKeys.has(key)) return null;

    tileKeys.add(key);
    tiles.push({ x, y, definitionId });
  }

  return tiles;
}

function validateTransactions(
  value: unknown[],
  itemDefinitions: readonly EstateItemDefinition[],
): EstateTransaction[] | null {
  const transactions: EstateTransaction[] = [];
  const transactionIds = new Set<string>();
  const knownParcelIds = new Set(estateExpansionCatalog.map((parcel) => parcel.id));

  for (const candidate of value) {
    if (!isRecord(candidate)) return null;

    const id = candidate.id;
    const kind = candidate.kind;
    const pointDelta = candidate.pointDelta;
    const createdAt = candidate.createdAt;
    const itemDefinitionId = candidate.itemDefinitionId;
    const parcelId = candidate.parcelId;

    if (
      typeof id !== "string" ||
      id.length === 0 ||
      transactionIds.has(id) ||
      !isEstateTransactionKind(kind) ||
      !isInteger(pointDelta) ||
      typeof createdAt !== "string"
    ) {
      return null;
    }

    transactionIds.add(id);

    if (kind === "unlock-parcel") {
      if (typeof parcelId !== "string" || !knownParcelIds.has(parcelId)) {
        return null;
      }

      transactions.push({ id, kind, pointDelta, parcelId, createdAt });
      continue;
    }

    if (
      typeof itemDefinitionId !== "string" ||
      !findEstateItemDefinition(itemDefinitions, itemDefinitionId)
    ) {
      return null;
    }

    transactions.push({ id, kind, pointDelta, itemDefinitionId, createdAt });
  }

  return transactions;
}

function readItemInstance(
  value: Record<string, unknown>,
): EstateItemInstance | null {
  const { id, definitionId, x, y, rotation, placedAt } = value;

  if (
    typeof id !== "string" ||
    id.length === 0 ||
    typeof definitionId !== "string" ||
    definitionId.length === 0 ||
    !isInteger(x) ||
    !isInteger(y) ||
    !isQuarterTurn(rotation) ||
    typeof placedAt !== "string"
  ) {
    return null;
  }

  return { id, definitionId, x, y, rotation, placedAt };
}

function isEstateTransactionKind(
  value: unknown,
): value is EstateTransaction["kind"] {
  return (
    value === "purchase-item" ||
    value === "purchase-ground" ||
    value === "unlock-parcel"
  );
}

function isQuarterTurn(value: unknown): value is QuarterTurn {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function readRawSubjectId(raw: unknown): string {
  if (isRecord(raw) && typeof raw.subjectId === "string") {
    return raw.subjectId;
  }

  return "unknown";
}

function invalidShape(subjectId: string): EstateMigrationResult {
  return {
    ok: false,
    error: {
      code: "invalid-shape",
      subjectId,
      message: "Stored estate snapshot has an invalid shape.",
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clampDelay(delayMs: number): number {
  if (!Number.isFinite(delayMs)) return 350;
  return Math.min(500, Math.max(250, Math.floor(delayMs)));
}
