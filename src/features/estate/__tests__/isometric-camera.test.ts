import { describe, expect, it } from "vitest";
import {
  canvasToWorld,
  fitCameraToWorldBounds,
  focusCameraOnWorldBounds,
  panCameraByCanvasDelta,
  worldToCanvas,
  zoomCameraAtCanvasPoint,
} from "../isometric/camera";

describe("isometric camera", () => {
  it("round-trips world and canvas coordinates with pan, zoom, and center origin", () => {
    const viewport = { width: 1000, height: 800 };
    const camera = { x: 50, y: -20, zoom: 1.25 };
    const world = { x: 82, y: 12 };

    const canvas = worldToCanvas(world, camera, viewport);
    const roundTrip = canvasToWorld(canvas, camera, viewport);

    expect(roundTrip.x).toBeCloseTo(world.x, 6);
    expect(roundTrip.y).toBeCloseTo(world.y, 6);
  });

  it("keeps the world point under the pointer stable when zooming", () => {
    const viewport = { width: 800, height: 600 };
    const camera = { x: 0, y: 0, zoom: 1 };
    const pointer = { x: 650, y: 450 };
    const before = canvasToWorld(pointer, camera, viewport);

    const next = zoomCameraAtCanvasPoint(camera, pointer, viewport, 1.4);
    const after = canvasToWorld(pointer, next, viewport);

    expect(next.zoom).toBeCloseTo(1.4, 6);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it("applies drag deltas in canvas space relative to zoom", () => {
    const camera = { x: 100, y: 50, zoom: 2 };

    expect(panCameraByCanvasDelta(camera, { x: 40, y: -20 })).toEqual({
      x: 80,
      y: 60,
      zoom: 2,
    });
  });

  it("can tune drag pan sensitivity without changing zoom math", () => {
    const camera = { x: 100, y: 50, zoom: 2 };

    expect(
      panCameraByCanvasDelta(camera, { x: 40, y: -20 }, { sensitivity: 0.75 }),
    ).toEqual({
      x: 85,
      y: 57.5,
      zoom: 2,
    });
  });

  it("fits world bounds inside the viewport with padding", () => {
    const viewport = { width: 512, height: 384 };
    const bounds = { minX: -256, minY: -128, maxX: 768, maxY: 640 };

    const camera = fitCameraToWorldBounds(bounds, viewport, {
      padding: 32,
      minZoom: 0.1,
      maxZoom: 10,
    });

    const topLeft = worldToCanvas(
      { x: bounds.minX, y: bounds.minY },
      camera,
      viewport,
    );
    const bottomRight = worldToCanvas(
      { x: bounds.maxX, y: bounds.maxY },
      camera,
      viewport,
    );

    expect(camera.x).toBeCloseTo(256, 6);
    expect(camera.y).toBeCloseTo(256, 6);
    expect(topLeft.x).toBeGreaterThanOrEqual(32);
    expect(topLeft.y).toBeGreaterThanOrEqual(32);
    expect(bottomRight.x).toBeLessThanOrEqual(480);
    expect(bottomRight.y).toBeLessThanOrEqual(352);
  });

  it("focuses a world bounds while limiting sudden zoom changes", () => {
    const viewport = { width: 800, height: 480 };
    const current = { x: 0, y: 0, zoom: 0.9 };
    const target = focusCameraOnWorldBounds(
      current,
      { minX: 600, minY: 120, maxX: 900, maxY: 360 },
      viewport,
      {
        padding: 48,
        minZoom: 0.25,
        maxZoom: 1.6,
        minZoomRatio: 0.82,
        maxZoomRatio: 1.12,
      },
    );

    expect(target.x).toBe(750);
    expect(target.y).toBe(240);
    expect(target.zoom).toBeGreaterThanOrEqual(0.9 * 0.82);
    expect(target.zoom).toBeLessThanOrEqual(0.9 * 1.12);
  });
});
