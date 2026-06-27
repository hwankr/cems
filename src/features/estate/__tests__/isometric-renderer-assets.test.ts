import { describe, expect, it, vi } from "vitest";
import { estateAssetManifest } from "../data/estate-asset-manifest";
import { createEstateAssetLoadSnapshot } from "../isometric/asset-loader";
import {
  EstateIsometricRenderer,
  getAnchoredSpriteDrawBox,
  type EstateRenderScene,
} from "../isometric/renderer";

describe("estate isometric renderer asset placement", () => {
  it("places sprite images by their bottom-center anchor", () => {
    const asset = estateAssetManifest.items["generic-campus-building"];
    const box = getAnchoredSpriteDrawBox({ x: 320, y: 240 }, asset, 0.5);

    expect(box).toEqual({
      x: 320 - asset.anchorX * 0.5,
      y: 240 - asset.anchorY * 0.5,
      width: asset.logicalWidth * 0.5,
      height: asset.logicalHeight * 0.5,
    });
  });

  it("rotates loaded sprite images when the render item is rotated", () => {
    const context = createMockCanvasContext();
    const image = {} as HTMLImageElement;
    const scene: EstateRenderScene = {
      metrics: { tileWidth: 128, tileHeight: 64 },
      parcels: [],
      groundTiles: [],
      hoverCell: null,
      selectedItemId: null,
      placementPreview: null,
      mainBuildingLevel: 1,
      items: [
        {
          id: "rotated-bench",
          definitionId: "bench",
          assetId: "bench",
          x: 0,
          y: 0,
          rotation: 1,
          footprintWidth: 2,
          footprintHeight: 1,
        },
      ],
    };
    const loadedAssets = createEstateAssetLoadSnapshot(estateAssetManifest);
    loadedAssets.status = "loaded";
    loadedAssets.items.bench = {
      ...loadedAssets.items.bench,
      status: "loaded",
      image,
      error: null,
    };

    new EstateIsometricRenderer(context).draw(
      scene,
      { x: 0, y: 0, zoom: 1 },
      { width: 400, height: 300 },
      estateAssetManifest,
      loadedAssets,
    );

    expect(context.translate).toHaveBeenCalled();
    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2);
  });
});

function createMockCanvasContext(): CanvasRenderingContext2D {
  return {
    addColorStop: vi.fn(),
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    clip: vi.fn(),
    closePath: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    drawImage: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    setLineDash: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}
