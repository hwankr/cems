import type {
  EstateExpansionParcelDefinition,
  EstateGridCell,
  EstateRectBounds,
} from "./types";

export function getParcelCells(
  parcel: EstateExpansionParcelDefinition,
): EstateGridCell[] {
  if (parcel.cells) {
    return parcel.cells.map((cell) => ({ ...cell }));
  }

  if (!parcel.bounds) return [];

  return getRectBoundsCells(parcel.bounds);
}

export function getRectBoundsCells(bounds: EstateRectBounds): EstateGridCell[] {
  const cells: EstateGridCell[] = [];

  for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
    for (let y = bounds.y; y < bounds.y + bounds.height; y += 1) {
      cells.push({ x, y });
    }
  }

  return cells;
}

export function getCellKey(cell: EstateGridCell): string {
  return `${cell.x}:${cell.y}`;
}

export function findEstateParcelDefinition(
  parcelDefinitions: readonly EstateExpansionParcelDefinition[],
  parcelId: string,
) {
  return parcelDefinitions.find((parcel) => parcel.id === parcelId) ?? null;
}

export function getUnlockedEstateCellKeys(
  unlockedParcelIds: readonly string[],
  parcelDefinitions: readonly EstateExpansionParcelDefinition[],
): ReadonlySet<string> {
  const unlockedParcelIdSet = new Set(unlockedParcelIds);
  const cellKeys = new Set<string>();

  for (const parcel of parcelDefinitions) {
    if (!unlockedParcelIdSet.has(parcel.id)) continue;

    for (const cell of getParcelCells(parcel)) {
      cellKeys.add(getCellKey(cell));
    }
  }

  return cellKeys;
}

export function isEstateCellUnlocked(
  cell: EstateGridCell,
  unlockedParcelIds: readonly string[],
  parcelDefinitions: readonly EstateExpansionParcelDefinition[],
): boolean {
  return getUnlockedEstateCellKeys(unlockedParcelIds, parcelDefinitions).has(
    getCellKey(cell),
  );
}

export function areEstateParcelsAdjacent(
  first: EstateExpansionParcelDefinition,
  second: EstateExpansionParcelDefinition,
): boolean {
  const secondCells = new Set(getParcelCells(second).map(getCellKey));

  for (const cell of getParcelCells(first)) {
    const neighbors = [
      { x: cell.x + 1, y: cell.y },
      { x: cell.x - 1, y: cell.y },
      { x: cell.x, y: cell.y + 1 },
      { x: cell.x, y: cell.y - 1 },
    ];

    if (neighbors.some((neighbor) => secondCells.has(getCellKey(neighbor)))) {
      return true;
    }
  }

  return false;
}

export function isParcelAdjacentToUnlockedParcel(
  parcelId: string,
  unlockedParcelIds: readonly string[],
  parcelDefinitions: readonly EstateExpansionParcelDefinition[],
): boolean {
  const targetParcel = findEstateParcelDefinition(parcelDefinitions, parcelId);

  if (!targetParcel) return false;

  return unlockedParcelIds.some((unlockedParcelId) => {
    const unlockedParcel = findEstateParcelDefinition(
      parcelDefinitions,
      unlockedParcelId,
    );

    if (!unlockedParcel) return false;

    return areEstateParcelsAdjacent(targetParcel, unlockedParcel);
  });
}
