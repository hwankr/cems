import {
  getCellKey,
  getParcelCells,
  getUnlockedEstateCellKeys,
} from "./expansion";
import type {
  EstateCommandFailureReason,
  EstateExpansionParcelDefinition,
  EstateGridCell,
  EstateItemDefinition,
  EstateSnapshot,
  QuarterTurn,
} from "./types";

export type EstateFootprint = {
  width: number;
  height: number;
};

export type EstatePlacementCheckResult =
  | { ok: true; occupiedCells: EstateGridCell[] }
  | { ok: false; reason: EstateCommandFailureReason };

export function findEstateItemDefinition(
  itemDefinitions: readonly EstateItemDefinition[],
  definitionId: string,
) {
  return (
    itemDefinitions.find((definition) => definition.id === definitionId) ?? null
  );
}

export function getEstateItemFootprint(
  definitionId: string,
  itemDefinitions: readonly EstateItemDefinition[],
): EstateFootprint {
  const definition = findEstateItemDefinition(itemDefinitions, definitionId);

  if (!definition) {
    throw new Error(`Unknown estate item definition: ${definitionId}`);
  }

  return {
    width: definition.footprintWidth,
    height: definition.footprintHeight,
  };
}

export function getRotatedFootprint(
  footprint: EstateFootprint,
  rotation: QuarterTurn,
): EstateFootprint {
  if (rotation === 1 || rotation === 3) {
    return {
      width: footprint.height,
      height: footprint.width,
    };
  }

  return { ...footprint };
}

export function getFootprintCells(
  origin: EstateGridCell,
  footprint: EstateFootprint,
): EstateGridCell[] {
  const cells: EstateGridCell[] = [];

  for (let x = origin.x; x < origin.x + footprint.width; x += 1) {
    for (let y = origin.y; y < origin.y + footprint.height; y += 1) {
      cells.push({ x, y });
    }
  }

  return cells;
}

export function canPlaceEstateItem(
  snapshot: EstateSnapshot,
  placement: {
    definitionId: string;
    x: number;
    y: number;
    rotation: QuarterTurn;
  },
  itemDefinitions: readonly EstateItemDefinition[],
  parcelDefinitions: readonly EstateExpansionParcelDefinition[],
  options: { ignoreInstanceId?: string } = {},
): EstatePlacementCheckResult {
  const definition = findEstateItemDefinition(
    itemDefinitions,
    placement.definitionId,
  );

  if (!definition || definition.placementRule === "ground") {
    return { ok: false, reason: "invalid-definition" };
  }

  if (!definition.canRotate && placement.rotation !== 0) {
    return { ok: false, reason: "invalid-definition" };
  }

  const footprint = getRotatedFootprint(
    {
      width: definition.footprintWidth,
      height: definition.footprintHeight,
    },
    placement.rotation,
  );
  const occupiedCells = getFootprintCells(
    { x: placement.x, y: placement.y },
    footprint,
  );
  const unlockedCells = getUnlockedEstateCellKeys(
    snapshot.unlockedParcelIds,
    parcelDefinitions,
  );

  if (
    occupiedCells.length === 0 ||
    occupiedCells.some((cell) => !unlockedCells.has(getCellKey(cell)))
  ) {
    return { ok: false, reason: "out-of-bounds" };
  }

  if (
    definition.placementRule === "edge" &&
    !touchesUnlockedParcelEdge(occupiedCells, unlockedCells)
  ) {
    return { ok: false, reason: "out-of-bounds" };
  }

  const existingCells = getOccupiedNonGroundCellKeys(
    snapshot,
    itemDefinitions,
    options.ignoreInstanceId,
  );

  if (occupiedCells.some((cell) => existingCells.has(getCellKey(cell)))) {
    return { ok: false, reason: "collision" };
  }

  return { ok: true, occupiedCells };
}

function getOccupiedNonGroundCellKeys(
  snapshot: EstateSnapshot,
  itemDefinitions: readonly EstateItemDefinition[],
  ignoreInstanceId?: string,
): ReadonlySet<string> {
  const occupiedCells = new Set<string>();

  for (const item of snapshot.items) {
    if (item.id === ignoreInstanceId) continue;

    const definition = findEstateItemDefinition(
      itemDefinitions,
      item.definitionId,
    );
    const footprint = getRotatedFootprint(
      {
        width: definition?.footprintWidth ?? 1,
        height: definition?.footprintHeight ?? 1,
      },
      item.rotation,
    );

    if (definition?.placementRule === "ground") continue;

    for (const cell of getFootprintCells(item, footprint)) {
      occupiedCells.add(getCellKey(cell));
    }
  }

  return occupiedCells;
}

function touchesUnlockedParcelEdge(
  occupiedCells: readonly EstateGridCell[],
  unlockedCells: ReadonlySet<string>,
): boolean {
  return occupiedCells.some((cell) => {
    const neighbors = [
      { x: cell.x + 1, y: cell.y },
      { x: cell.x - 1, y: cell.y },
      { x: cell.x, y: cell.y + 1 },
      { x: cell.x, y: cell.y - 1 },
    ];

    return neighbors.some((neighbor) => !unlockedCells.has(getCellKey(neighbor)));
  });
}

export function getUnlockedEstateCells(
  parcelIds: readonly string[],
  parcelDefinitions: readonly EstateExpansionParcelDefinition[],
): EstateGridCell[] {
  const parcelIdSet = new Set(parcelIds);

  return parcelDefinitions
    .filter((parcel) => parcelIdSet.has(parcel.id))
    .flatMap(getParcelCells);
}
