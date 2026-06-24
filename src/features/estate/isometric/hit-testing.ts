import { canvasToWorld, type IsometricCamera, type ViewportSize } from "./camera";
import {
  DEFAULT_TILE_METRICS,
  getCellCenterScreen,
  screenToGrid,
  type GridPoint,
  type IsometricTileMetrics,
  type ScreenPoint,
} from "./projection";

export type PointerClientPosition = {
  clientX: number;
  clientY: number;
};

export type ElementRect = Pick<DOMRect, "left" | "top" | "width" | "height">;

export type PointerCanvasPosition = {
  css: ScreenPoint;
  backingStore: ScreenPoint;
};

export type HitTestOptions = {
  metrics?: IsometricTileMetrics;
  allowedCells?: readonly GridPoint[];
};

export function getCellKey(cell: GridPoint): string {
  return `${cell.x}:${cell.y}`;
}

export function getPointerCanvasPosition(
  pointer: PointerClientPosition,
  rect: ElementRect,
  dpr: number,
): PointerCanvasPosition {
  const css = {
    x: pointer.clientX - rect.left,
    y: pointer.clientY - rect.top,
  };

  return {
    css,
    backingStore: {
      x: css.x * dpr,
      y: css.y * dpr,
    },
  };
}

export function isPointInsideDiamondCell(
  point: ScreenPoint,
  cell: GridPoint,
  metrics: IsometricTileMetrics = DEFAULT_TILE_METRICS,
): boolean {
  const center = getCellCenterScreen(cell, metrics);
  const normalizedX = Math.abs(point.x - center.x) / (metrics.tileWidth / 2);
  const normalizedY = Math.abs(point.y - center.y) / (metrics.tileHeight / 2);

  return normalizedX + normalizedY <= 1 + Number.EPSILON * 16;
}

export function hitTestDiamondCellAtWorldPoint(
  point: ScreenPoint,
  options: HitTestOptions = {},
): GridPoint | null {
  const metrics = options.metrics ?? DEFAULT_TILE_METRICS;
  const grid = screenToGrid(point, metrics);
  const baseX = Math.floor(grid.x);
  const baseY = Math.floor(grid.y);
  const allowedCellKeys = options.allowedCells
    ? new Set(options.allowedCells.map(getCellKey))
    : null;
  const candidates: GridPoint[] = [];

  for (let x = baseX - 1; x <= baseX + 1; x += 1) {
    for (let y = baseY - 1; y <= baseY + 1; y += 1) {
      candidates.push({ x, y });
    }
  }

  candidates.sort((first, second) => {
    const firstCenter = getCellCenterScreen(first, metrics);
    const secondCenter = getCellCenterScreen(second, metrics);
    const firstDistance =
      Math.abs(firstCenter.x - point.x) + Math.abs(firstCenter.y - point.y);
    const secondDistance =
      Math.abs(secondCenter.x - point.x) + Math.abs(secondCenter.y - point.y);

    if (firstDistance !== secondDistance) return firstDistance - secondDistance;
    if (first.x !== second.x) return first.x - second.x;
    return first.y - second.y;
  });

  for (const candidate of candidates) {
    if (allowedCellKeys && !allowedCellKeys.has(getCellKey(candidate))) {
      continue;
    }

    if (isPointInsideDiamondCell(point, candidate, metrics)) {
      return candidate;
    }
  }

  return null;
}

export function hitTestDiamondCellAtCanvasPoint(
  point: ScreenPoint,
  camera: IsometricCamera,
  viewport: ViewportSize,
  options: HitTestOptions = {},
): GridPoint | null {
  return hitTestDiamondCellAtWorldPoint(
    canvasToWorld(point, camera, viewport),
    options,
  );
}
