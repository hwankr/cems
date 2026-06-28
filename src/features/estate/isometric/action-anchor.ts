import type { ViewportSize, IsometricCamera } from "./camera";
import { worldToCanvas } from "./camera";
import { getCellsWorldBounds } from "./projection";
import { getRenderFootprintCells } from "./render-order";
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

export function getSelectedItemActionAnchor(
  scene: EstateRenderScene,
  input: SelectedItemActionAnchorInput,
): EstateItemActionAnchor | null {
  if (!input.itemId) return null;

  const item = scene.items.find((candidate) => candidate.id === input.itemId);
  if (!item) return null;

  const bounds = getCellsWorldBounds(
    getRenderFootprintCells(item),
    scene.metrics,
  );
  const canvas = worldToCanvas(
    {
      x: bounds.minX + (bounds.maxX - bounds.minX) / 2,
      y: bounds.minY,
    },
    input.camera,
    input.viewport,
  );

  return {
    x: canvas.x,
    y: canvas.y,
    viewportWidth: input.viewport.width,
    viewportHeight: input.viewport.height,
  };
}
