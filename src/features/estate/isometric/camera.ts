import type { ScreenPoint, WorldBounds } from "./projection";

export type IsometricCamera = {
  x: number;
  y: number;
  zoom: number;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export type FitCameraOptions = {
  padding?: number;
  minZoom?: number;
  maxZoom?: number;
};

export const DEFAULT_MIN_ZOOM = 0.65;
export const DEFAULT_MAX_ZOOM = 1.6;

export function worldToCanvas(
  world: ScreenPoint,
  camera: IsometricCamera,
  viewport: ViewportSize,
): ScreenPoint {
  return {
    x: viewport.width / 2 + (world.x - camera.x) * camera.zoom,
    y: viewport.height / 2 + (world.y - camera.y) * camera.zoom,
  };
}

export function canvasToWorld(
  canvas: ScreenPoint,
  camera: IsometricCamera,
  viewport: ViewportSize,
): ScreenPoint {
  return {
    x: (canvas.x - viewport.width / 2) / camera.zoom + camera.x,
    y: (canvas.y - viewport.height / 2) / camera.zoom + camera.y,
  };
}

export function clampZoom(
  zoom: number,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
) {
  return Math.min(maxZoom, Math.max(minZoom, zoom));
}

export function zoomCameraAtCanvasPoint(
  camera: IsometricCamera,
  pointer: ScreenPoint,
  viewport: ViewportSize,
  nextZoom: number,
  options: { minZoom?: number; maxZoom?: number } = {},
): IsometricCamera {
  const zoom = clampZoom(nextZoom, options.minZoom, options.maxZoom);
  const worldBeforeZoom = canvasToWorld(pointer, camera, viewport);

  return {
    x: worldBeforeZoom.x - (pointer.x - viewport.width / 2) / zoom,
    y: worldBeforeZoom.y - (pointer.y - viewport.height / 2) / zoom,
    zoom,
  };
}

export function panCameraByCanvasDelta(
  camera: IsometricCamera,
  delta: ScreenPoint,
): IsometricCamera {
  return {
    ...camera,
    x: camera.x - delta.x / camera.zoom,
    y: camera.y - delta.y / camera.zoom,
  };
}

export function fitCameraToWorldBounds(
  bounds: WorldBounds,
  viewport: ViewportSize,
  options: FitCameraOptions = {},
): IsometricCamera {
  const padding = options.padding ?? 32;
  const minZoom = options.minZoom ?? DEFAULT_MIN_ZOOM;
  const maxZoom = options.maxZoom ?? DEFAULT_MAX_ZOOM;
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const availableWidth = Math.max(1, viewport.width - padding * 2);
  const availableHeight = Math.max(1, viewport.height - padding * 2);
  const zoom = clampZoom(
    Math.min(availableWidth / width, availableHeight / height),
    minZoom,
    maxZoom,
  );

  return {
    x: bounds.minX + width / 2,
    y: bounds.minY + height / 2,
    zoom,
  };
}

export function getCameraWorldBounds(
  camera: IsometricCamera,
  viewport: ViewportSize,
): WorldBounds {
  const topLeft = canvasToWorld({ x: 0, y: 0 }, camera, viewport);
  const bottomRight = canvasToWorld(
    { x: viewport.width, y: viewport.height },
    camera,
    viewport,
  );

  return {
    minX: Math.min(topLeft.x, bottomRight.x),
    minY: Math.min(topLeft.y, bottomRight.y),
    maxX: Math.max(topLeft.x, bottomRight.x),
    maxY: Math.max(topLeft.y, bottomRight.y),
  };
}
