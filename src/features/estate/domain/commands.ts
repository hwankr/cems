import { baseEstateBuildingDefinition } from "../data/estate-item-catalog";
import {
  findEstateParcelDefinition,
  getCellKey,
  isParcelAdjacentToUnlockedParcel,
  isEstateCellUnlocked,
} from "./expansion";
import {
  decreaseInventory,
  getInventoryQuantity,
  increaseInventory,
} from "./inventory";
import { canPlaceEstateItem, findEstateItemDefinition } from "./placement";
import { hasEnoughEstatePoints } from "./point-account";
import type {
  EstateCommand,
  EstateCommandContext,
  EstateCommandResult,
  EstateSnapshot,
} from "./types";

type InitialEstateSnapshotOptions = {
  now: () => string;
};

export function createInitialEstateSnapshot(
  subjectId: string,
  options: InitialEstateSnapshotOptions,
): EstateSnapshot {
  const now = options.now();

  return {
    schemaVersion: 1,
    subjectId,
    unlockedParcelIds: ["central-campus"],
    items: [
      {
        id: baseEstateBuildingDefinition.id,
        definitionId: baseEstateBuildingDefinition.id,
        x: 3,
        y: 3,
        rotation: 0,
        placedAt: now,
      },
    ],
    inventory: [],
    groundTiles: [],
    transactions: [],
    updatedAt: now,
  };
}

export function purchaseEstateItem(
  snapshot: EstateSnapshot,
  command: { definitionId: string },
  context: EstateCommandContext,
): EstateCommandResult {
  const definition = findEstateItemDefinition(
    context.itemDefinitions,
    command.definitionId,
  );

  if (!definition || !isPositiveIntegerCost(definition.cost)) {
    return fail(snapshot, "invalid-definition");
  }

  if (
    !hasEnoughEstatePoints(
      context.earnedPoints,
      snapshot.transactions,
      definition.cost,
    )
  ) {
    return fail(snapshot, "insufficient-points");
  }

  const now = context.now();

  return succeed({
    ...snapshot,
    inventory: increaseInventory(snapshot.inventory, definition.id, 1),
    transactions: [
      ...snapshot.transactions,
      {
        id: context.createId(),
        kind:
          definition.placementRule === "ground"
            ? "purchase-ground"
            : "purchase-item",
        pointDelta: -definition.cost,
        itemDefinitionId: definition.id,
        createdAt: now,
      },
    ],
    updatedAt: now,
  });
}

export function placeEstateItem(
  snapshot: EstateSnapshot,
  command: { definitionId: string; x: number; y: number; rotation: 0 | 1 | 2 | 3 },
  context: EstateCommandContext,
): EstateCommandResult {
  if (getInventoryQuantity(snapshot.inventory, command.definitionId) < 1) {
    return fail(snapshot, "missing-inventory");
  }

  const placementResult = canPlaceEstateItem(
    snapshot,
    command,
    getCollisionItemDefinitions(context),
    context.parcelDefinitions,
  );

  if (!placementResult.ok) {
    return fail(snapshot, placementResult.reason);
  }

  const now = context.now();

  return succeed({
    ...snapshot,
    inventory: decreaseInventory(snapshot.inventory, command.definitionId, 1),
    items: [
      ...snapshot.items,
      {
        id: context.createId(),
        definitionId: command.definitionId,
        x: command.x,
        y: command.y,
        rotation: command.rotation,
        placedAt: now,
      },
    ],
    updatedAt: now,
  });
}

export function removeEstateItem(
  snapshot: EstateSnapshot,
  command: { instanceId: string },
  _context: EstateCommandContext,
): EstateCommandResult {
  const item = snapshot.items.find(
    (candidate) => candidate.id === command.instanceId,
  );

  if (!item || item.definitionId === baseEstateBuildingDefinition.id) {
    return fail(snapshot, "invalid-definition");
  }

  return succeed({
    ...snapshot,
    items: snapshot.items.filter((candidate) => candidate.id !== item.id),
    inventory: increaseInventory(snapshot.inventory, item.definitionId, 1),
    updatedAt: _context.now(),
  });
}

export function paintEstateGround(
  snapshot: EstateSnapshot,
  command: { definitionId: string; x: number; y: number },
  context: EstateCommandContext,
): EstateCommandResult {
  const definition = findEstateItemDefinition(
    context.itemDefinitions,
    command.definitionId,
  );

  if (!definition || definition.placementRule !== "ground") {
    return fail(snapshot, "invalid-definition");
  }

  if (
    !isEstateCellUnlocked(
      { x: command.x, y: command.y },
      snapshot.unlockedParcelIds,
      context.parcelDefinitions,
    )
  ) {
    return fail(snapshot, "out-of-bounds");
  }

  const existingTile = snapshot.groundTiles.find(
    (tile) => tile.x === command.x && tile.y === command.y,
  );

  if (existingTile?.definitionId === command.definitionId) {
    return succeed(snapshot);
  }

  if (getInventoryQuantity(snapshot.inventory, command.definitionId) < 1) {
    return fail(snapshot, "missing-inventory");
  }

  const now = context.now();
  const tileKey = getCellKey(command);

  return succeed({
    ...snapshot,
    inventory: decreaseInventory(snapshot.inventory, command.definitionId, 1),
    groundTiles: [
      ...snapshot.groundTiles.filter((tile) => getCellKey(tile) !== tileKey),
      {
        x: command.x,
        y: command.y,
        definitionId: command.definitionId,
      },
    ].sort((a, b) => a.x - b.x || a.y - b.y),
    updatedAt: now,
  });
}

export function unlockEstateParcel(
  snapshot: EstateSnapshot,
  command: { parcelId: string },
  context: EstateCommandContext,
): EstateCommandResult {
  if (snapshot.unlockedParcelIds.includes(command.parcelId)) {
    return fail(snapshot, "already-unlocked");
  }

  const parcel = findEstateParcelDefinition(
    context.parcelDefinitions,
    command.parcelId,
  );

  if (!parcel || !isNonNegativeIntegerCost(parcel.cost)) {
    return fail(snapshot, "invalid-definition");
  }

  if (
    !isParcelAdjacentToUnlockedParcel(
      parcel.id,
      snapshot.unlockedParcelIds,
      context.parcelDefinitions,
    )
  ) {
    return fail(snapshot, "parcel-not-adjacent");
  }

  if (
    !hasEnoughEstatePoints(
      context.earnedPoints,
      snapshot.transactions,
      parcel.cost,
    )
  ) {
    return fail(snapshot, "insufficient-points");
  }

  const now = context.now();

  return succeed({
    ...snapshot,
    unlockedParcelIds: [...snapshot.unlockedParcelIds, parcel.id].sort(),
    transactions:
      parcel.cost === 0
        ? snapshot.transactions
        : [
            ...snapshot.transactions,
            {
              id: context.createId(),
              kind: "unlock-parcel",
              pointDelta: -parcel.cost,
              parcelId: parcel.id,
              createdAt: now,
            },
          ],
    updatedAt: now,
  });
}

export function reduceEstateCommand(
  snapshot: EstateSnapshot,
  command: EstateCommand,
  context: EstateCommandContext,
): EstateCommandResult {
  switch (command.type) {
    case "purchase-item":
      return purchaseEstateItem(snapshot, command, context);
    case "place-item":
      return placeEstateItem(snapshot, command, context);
    case "paint-ground":
      return paintEstateGround(snapshot, command, context);
    case "remove-item":
      return removeEstateItem(snapshot, command, context);
    case "unlock-parcel":
      return unlockEstateParcel(snapshot, command, context);
  }
}

function fail(
  snapshot: EstateSnapshot,
  reason: Exclude<EstateCommandResult, { ok: true }>["reason"],
): EstateCommandResult {
  return { ok: false, snapshot, reason };
}

function succeed(snapshot: EstateSnapshot): EstateCommandResult {
  return { ok: true, snapshot };
}

function isPositiveIntegerCost(cost: number): boolean {
  return Number.isInteger(cost) && cost > 0;
}

function isNonNegativeIntegerCost(cost: number): boolean {
  return Number.isInteger(cost) && cost >= 0;
}

function getCollisionItemDefinitions(context: EstateCommandContext) {
  return [baseEstateBuildingDefinition, ...context.itemDefinitions];
}
