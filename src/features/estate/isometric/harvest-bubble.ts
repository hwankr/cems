import { worldToCanvas, type IsometricCamera, type ViewportSize } from "./camera";
import {
  getCellsWorldBounds,
  type IsometricTileMetrics,
  type ScreenPoint,
} from "./projection";
import { getRenderFootprintCells, type RenderFootprintItem } from "./render-order";

export const HARVEST_BUBBLE_RADIUS = 18;
export const HARVEST_BUBBLE_HIT_EXTRA = 6;

/** Screen point just above a footprint's top corner where the bubble floats. */
export function getHarvestBubbleScreenAnchor(
  item: RenderFootprintItem,
  metrics: IsometricTileMetrics,
  camera: IsometricCamera,
  viewport: ViewportSize,
): ScreenPoint {
  const bounds = getCellsWorldBounds(getRenderFootprintCells(item), metrics);
  const canvas = worldToCanvas(
    { x: bounds.minX + (bounds.maxX - bounds.minX) / 2, y: bounds.minY },
    camera,
    viewport,
  );
  return { x: canvas.x, y: canvas.y - 54 * camera.zoom };
}

export function isPointOnHarvestBubble(
  point: ScreenPoint,
  anchor: ScreenPoint,
  radius: number = HARVEST_BUBBLE_RADIUS,
): boolean {
  return (
    Math.hypot(point.x - anchor.x, point.y - anchor.y) <=
    radius + HARVEST_BUBBLE_HIT_EXTRA
  );
}
