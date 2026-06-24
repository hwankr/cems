export type IsometricTileMetrics = {
  tileWidth: number;
  tileHeight: number;
};

export type GridPoint = {
  x: number;
  y: number;
};

export type ScreenPoint = {
  x: number;
  y: number;
};

export type WorldBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export const DEFAULT_TILE_METRICS: IsometricTileMetrics = {
  tileWidth: 128,
  tileHeight: 64,
};

export function gridToScreen(
  grid: GridPoint,
  metrics: IsometricTileMetrics = DEFAULT_TILE_METRICS,
): ScreenPoint {
  return {
    x: ((grid.x - grid.y) * metrics.tileWidth) / 2,
    y: ((grid.x + grid.y) * metrics.tileHeight) / 2,
  };
}

export function screenToGrid(
  screen: ScreenPoint,
  metrics: IsometricTileMetrics = DEFAULT_TILE_METRICS,
): GridPoint {
  return {
    x: screen.x / metrics.tileWidth + screen.y / metrics.tileHeight,
    y: screen.y / metrics.tileHeight - screen.x / metrics.tileWidth,
  };
}

export function getCellCenterScreen(
  cell: GridPoint,
  metrics: IsometricTileMetrics = DEFAULT_TILE_METRICS,
): ScreenPoint {
  return gridToScreen({ x: cell.x + 0.5, y: cell.y + 0.5 }, metrics);
}

export function getCellDiamondPoints(
  cell: GridPoint,
  metrics: IsometricTileMetrics = DEFAULT_TILE_METRICS,
): [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint] {
  return [
    gridToScreen(cell, metrics),
    gridToScreen({ x: cell.x + 1, y: cell.y }, metrics),
    gridToScreen({ x: cell.x + 1, y: cell.y + 1 }, metrics),
    gridToScreen({ x: cell.x, y: cell.y + 1 }, metrics),
  ];
}

export function getCellsWorldBounds(
  cells: readonly GridPoint[],
  metrics: IsometricTileMetrics = DEFAULT_TILE_METRICS,
): WorldBounds {
  const points = cells.flatMap((cell) => getCellDiamondPoints(cell, metrics));

  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

export function expandWorldBounds(
  bounds: WorldBounds,
  amount: number,
): WorldBounds {
  return {
    minX: bounds.minX - amount,
    minY: bounds.minY - amount,
    maxX: bounds.maxX + amount,
    maxY: bounds.maxY + amount,
  };
}
