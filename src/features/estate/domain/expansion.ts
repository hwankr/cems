import type {
  EstateExpansionParcelDefinition,
  EstateGridCell,
  EstateParcelDefinition,
  EstateRectBounds,
} from "./types";

export type EstateParcelCatalogValidationError =
  | {
      code: "duplicate-id";
      parcelId: string;
    }
  | {
      code: "invalid-bounds" | "invalid-cost";
      parcelId: string;
    }
  | {
      code: "invalid-initial-count";
      initialParcelIds: string[];
    }
  | {
      code: "initial-parcel-has-cost";
      parcelId: string;
    }
  | {
      code: "unknown-adjacent-parcel" | "asymmetric-adjacency";
      parcelId: string;
      adjacentParcelId: string;
    }
  | {
      code: "overlapping-cells";
      parcelIds: [string, string];
      cell: EstateGridCell;
    };

export function getParcelCells(
  parcel: EstateExpansionParcelDefinition,
): EstateGridCell[] {
  const { minX, minY, width, height } = parcel.bounds;
  return getRectBoundsCells({ x: minX, y: minY, width, height });
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

export function getInitialEstateParcelIds(
  parcelDefinitions: readonly EstateExpansionParcelDefinition[],
): string[] {
  return parcelDefinitions
    .filter((parcel) => parcel.initial)
    .map((parcel) => parcel.id);
}

export function getUnlockedEstateCells(
  unlockedParcelIds: readonly string[],
  parcelDefinitions: readonly EstateExpansionParcelDefinition[],
): EstateGridCell[] {
  const unlockedParcelIdSet = new Set(unlockedParcelIds);
  const cellsByKey = new Map<string, EstateGridCell>();

  for (const parcel of parcelDefinitions) {
    if (!unlockedParcelIdSet.has(parcel.id)) continue;

    for (const cell of getParcelCells(parcel)) {
      cellsByKey.set(getCellKey(cell), cell);
    }
  }

  return [...cellsByKey.values()];
}

export function getAllEstateCellKeys(
  parcelDefinitions: readonly EstateExpansionParcelDefinition[],
): ReadonlySet<string> {
  const cellKeys = new Set<string>();

  for (const parcel of parcelDefinitions) {
    for (const cell of getParcelCells(parcel)) {
      cellKeys.add(getCellKey(cell));
    }
  }

  return cellKeys;
}

export function getUnlockedEstateCellKeys(
  unlockedParcelIds: readonly string[],
  parcelDefinitions: readonly EstateExpansionParcelDefinition[],
): ReadonlySet<string> {
  const cellKeys = new Set<string>();

  for (const cell of getUnlockedEstateCells(unlockedParcelIds, parcelDefinitions)) {
    cellKeys.add(getCellKey(cell));
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
  return first.adjacentParcelIds.includes(second.id);
}

export function isParcelAdjacentToUnlockedParcel(
  parcelId: string,
  unlockedParcelIds: readonly string[],
  parcelDefinitions: readonly EstateExpansionParcelDefinition[],
): boolean {
  const targetParcel = findEstateParcelDefinition(parcelDefinitions, parcelId);

  if (!targetParcel) return false;

  return unlockedParcelIds.some((unlockedParcelId) =>
    targetParcel.adjacentParcelIds.includes(unlockedParcelId),
  );
}

export function findEstateParcelDefinitionContainingCell(
  cell: EstateGridCell,
  parcelDefinitions: readonly EstateExpansionParcelDefinition[],
): EstateExpansionParcelDefinition | null {
  const cellKey = getCellKey(cell);

  return (
    parcelDefinitions.find((parcel) =>
      getParcelCells(parcel).some(
        (candidate) => getCellKey(candidate) === cellKey,
      ),
    ) ?? null
  );
}

export function validateEstateParcelCatalog(
  parcelDefinitions: readonly EstateParcelDefinition[],
): EstateParcelCatalogValidationError[] {
  const errors: EstateParcelCatalogValidationError[] = [];
  const parcelIds = new Set<string>();
  const occupiedCellByKey = new Map<string, string>();
  const initialParcelIds = parcelDefinitions
    .filter((parcel) => parcel.initial)
    .map((parcel) => parcel.id);

  if (initialParcelIds.length !== 1) {
    errors.push({ code: "invalid-initial-count", initialParcelIds });
  }

  for (const parcel of parcelDefinitions) {
    if (parcelIds.has(parcel.id)) {
      errors.push({ code: "duplicate-id", parcelId: parcel.id });
      continue;
    }
    parcelIds.add(parcel.id);

    if (!isValidParcelBounds(parcel.bounds)) {
      errors.push({ code: "invalid-bounds", parcelId: parcel.id });
    }

    if (!Number.isInteger(parcel.cost) || parcel.cost < 0) {
      errors.push({ code: "invalid-cost", parcelId: parcel.id });
    }

    if (parcel.initial && parcel.cost !== 0) {
      errors.push({ code: "initial-parcel-has-cost", parcelId: parcel.id });
    }

    for (const cell of getParcelCells(parcel)) {
      const key = getCellKey(cell);
      const occupiedParcelId = occupiedCellByKey.get(key);

      if (occupiedParcelId) {
        errors.push({
          code: "overlapping-cells",
          parcelIds: [occupiedParcelId, parcel.id],
          cell,
        });
        continue;
      }

      occupiedCellByKey.set(key, parcel.id);
    }
  }

  for (const parcel of parcelDefinitions) {
    for (const adjacentParcelId of parcel.adjacentParcelIds) {
      const adjacentParcel = parcelDefinitions.find(
        (candidate) => candidate.id === adjacentParcelId,
      );

      if (!adjacentParcel) {
        errors.push({
          code: "unknown-adjacent-parcel",
          parcelId: parcel.id,
          adjacentParcelId,
        });
        continue;
      }

      if (!adjacentParcel.adjacentParcelIds.includes(parcel.id)) {
        errors.push({
          code: "asymmetric-adjacency",
          parcelId: parcel.id,
          adjacentParcelId,
        });
      }
    }
  }

  return errors;
}

function isValidParcelBounds(
  bounds: EstateParcelDefinition["bounds"],
): boolean {
  return (
    Number.isInteger(bounds.minX) &&
    Number.isInteger(bounds.minY) &&
    Number.isInteger(bounds.width) &&
    Number.isInteger(bounds.height) &&
    bounds.width > 0 &&
    bounds.height > 0
  );
}
