import type { ViewportSize, IsometricCamera } from "./camera";
import { worldToCanvas } from "./camera";
import type { IsometricTileMetrics } from "./projection";
import { getCellsWorldBounds } from "./projection";
import { getRenderFootprintCells, type RenderFootprintItem } from "./render-order";
import type { EstateRenderScene } from "./renderer";

export type EstateItemActionAnchor = {
  x: number;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
};

type SelectedItemActionAnchorInput = {
  itemId?: string | null;
  camera: IsometricCamera;
  viewport: ViewportSize;
};

// Compute the screen anchor (top-center, viewport-relative) of any footprint
// host — a placed item or a placement/move preview. Used so the contextual
// controls can ride along with whatever the player is positioning.
export function getFootprintActionAnchor(
  footprintHost: RenderFootprintItem,
  metrics: IsometricTileMetrics,
  camera: IsometricCamera,
  viewport: ViewportSize,
): EstateItemActionAnchor {
  const bounds = getCellsWorldBounds(
    getRenderFootprintCells(footprintHost),
    metrics,
  );
  const canvas = worldToCanvas(
    {
      x: bounds.minX + (bounds.maxX - bounds.minX) / 2,
      y: bounds.minY,
    },
    camera,
    viewport,
  );

  return {
    x: canvas.x,
    y: canvas.y,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  };
}

export function getSelectedItemActionAnchor(
  scene: EstateRenderScene,
  input: SelectedItemActionAnchorInput,
): EstateItemActionAnchor | null {
  if (!input.itemId) return null;

  const item = scene.items.find((candidate) => candidate.id === input.itemId);
  if (!item) return null;

  return getFootprintActionAnchor(
    item,
    scene.metrics,
    input.camera,
    input.viewport,
  );
}
