import { describe, expect, it, vi } from "vitest";
import { estateAssetManifest } from "../data/estate-asset-manifest";
import { createEstateAssetLoadSnapshot } from "../isometric/asset-loader";
import {
  EstateIsometricRenderer,
  getAnchoredSpriteDrawBox,
  getDisplayFootprintDiamond,
  getPlacementPreviewCellDiamonds,
  getSpriteGroundingDiamond,
  getSpriteAnchorPoint,
  shouldDrawSpriteGrounding,
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

  it("keeps the main building display footprint at the full 3x3 floor", () => {
    const diamond = getSpriteGroundingDiamond(
      {
        id: "main-building",
        definitionId: "base-campus-building",
        assetId: "campus-building-lv1",
        x: 6,
        y: 6,
        rotation: 0,
        footprintWidth: 3,
        footprintHeight: 3,
      },
      { tileWidth: 128, tileHeight: 64 },
    );

    expect(diamond).toEqual([
      { x: 0, y: 384 },
      { x: 192, y: 480 },
      { x: 0, y: 576 },
      { x: -192, y: 480 },
    ]);
  });

  it("anchors the main building sprite onto the visible 3x3 floor", () => {
    const anchor = getSpriteAnchorPoint(
      {
        id: "main-building",
        definitionId: "base-campus-building",
        assetId: "campus-building-lv1",
        x: 6,
        y: 6,
        rotation: 0,
        footprintWidth: 3,
        footprintHeight: 3,
      },
      { tileWidth: 128, tileHeight: 64 },
    );

    expect(anchor).toEqual({ x: 0, y: 520 });
  });

  it("keeps ordinary sprite anchors at the footprint center", () => {
    const anchor = getSpriteAnchorPoint(
      {
        id: "bench",
        definitionId: "bench",
        assetId: "bench",
        x: 2,
        y: 3,
        rotation: 0,
        footprintWidth: 2,
        footprintHeight: 1,
      },
      { tileWidth: 128, tileHeight: 64 },
    );

    expect(anchor).toEqual({ x: -32, y: 208 });
  });

  it("anchors self-grounded sprite bases to the front of their footprint", () => {
    const squareAnchor = getSpriteAnchorPoint(
      {
        id: "solar-array",
        definitionId: "solar-array",
        assetId: "solar-array",
        x: 0,
        y: 0,
        rotation: 0,
        footprintWidth: 2,
        footprintHeight: 2,
      },
      { tileWidth: 128, tileHeight: 64 },
      { selfGrounded: true },
    );

    const wideAnchor = getSpriteAnchorPoint(
      {
        id: "battery-storage",
        definitionId: "battery-storage",
        assetId: "battery-storage",
        x: 0,
        y: 0,
        rotation: 0,
        footprintWidth: 2,
        footprintHeight: 1,
      },
      { tileWidth: 128, tileHeight: 64 },
      { selfGrounded: true },
    );

    expect(squareAnchor).toEqual({ x: 0, y: 128 });
    expect(wideAnchor).toEqual({ x: 64, y: 96 });
  });

  it("applies sprite y offsets to the draw anchor", () => {
    const anchor = getSpriteAnchorPoint(
      {
        id: "bench",
        definitionId: "bench",
        assetId: "bench",
        x: 2,
        y: 3,
        rotation: 0,
        footprintWidth: 2,
        footprintHeight: 1,
        yOffset: 12,
      },
      { tileWidth: 128, tileHeight: 64 },
    );

    expect(anchor).toEqual({ x: -32, y: 220 });
  });

  it("keeps ordinary item display footprints on their occupied cells", () => {
    const diamond = getDisplayFootprintDiamond(
      {
        id: "bench",
        definitionId: "bench",
        assetId: "bench",
        x: 2,
        y: 3,
        rotation: 0,
        footprintWidth: 2,
        footprintHeight: 1,
      },
      { tileWidth: 128, tileHeight: 64 },
    );

    expect(diamond).toEqual([
      { x: -64, y: 160 },
      { x: 64, y: 224 },
      { x: 0, y: 256 },
      { x: -128, y: 192 },
    ]);
  });

  it("keeps ordinary building grounding inset within the occupied footprint", () => {
    const diamond = getSpriteGroundingDiamond(
      {
        id: "greenhouse",
        definitionId: "small-greenhouse",
        assetId: "small-greenhouse",
        x: 0,
        y: 0,
        rotation: 0,
        footprintWidth: 2,
        footprintHeight: 2,
      },
      { tileWidth: 128, tileHeight: 64 },
    );

    expect(diamond[0]).toMatchObject({ x: 0 });
    expect(diamond[0].y).toBeCloseTo(14.08);
    expect(diamond[1].x).toBeCloseTo(99.84);
    expect(diamond[1].y).toBe(64);
    expect(diamond[2]).toMatchObject({ x: 0 });
    expect(diamond[2].y).toBeCloseTo(113.92);
    expect(diamond[3].x).toBeCloseTo(-99.84);
    expect(diamond[3].y).toBe(64);
  });

  it("returns one diamond per occupied placement-preview cell", () => {
    const diamonds = getPlacementPreviewCellDiamonds(
      {
        id: "__placement-preview__",
        x: 0,
        y: 0,
        rotation: 0,
        footprintWidth: 2,
        footprintHeight: 2,
      },
      { tileWidth: 128, tileHeight: 64 },
    );

    // 2x2 footprint => 4 cell diamonds, each with 4 corner points.
    expect(diamonds).toHaveLength(4);
    expect(diamonds[0]).toHaveLength(4);
    // First cell (0,0) top corner is the grid origin.
    expect(diamonds[0][0]).toEqual({ x: 0, y: 0 });
  });

  it("skips decorative grounding for the main building sprite", () => {
    expect(
      shouldDrawSpriteGrounding({
        id: "main-building",
        definitionId: "base-campus-building",
        assetId: "campus-building-lv1",
        x: 6,
        y: 6,
        rotation: 0,
        footprintWidth: 3,
        footprintHeight: 3,
      }),
    ).toBe(false);

    expect(
      shouldDrawSpriteGrounding({
        id: "greenhouse",
        definitionId: "small-greenhouse",
        assetId: "small-greenhouse",
        x: 0,
        y: 0,
        rotation: 0,
        footprintWidth: 2,
        footprintHeight: 2,
      }),
    ).toBe(true);
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

  it("applies asset y offsets when drawing loaded sprites", () => {
    const context = createMockCanvasContext();
    const image = {} as HTMLImageElement;
    const asset = { ...estateAssetManifest.items.bench, yOffset: 12 };
    const manifest = {
      ...estateAssetManifest,
      items: {
        ...estateAssetManifest.items,
        bench: asset,
      },
    };
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
          id: "bench",
          definitionId: "bench",
          assetId: "bench",
          x: 2,
          y: 3,
          rotation: 0,
          footprintWidth: 2,
          footprintHeight: 1,
        },
      ],
    };
    const loadedAssets = createEstateAssetLoadSnapshot(manifest);
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
      manifest,
      loadedAssets,
    );

    expect(context.drawImage).toHaveBeenCalledWith(
      image,
      90,
      266,
      asset.logicalWidth,
      asset.logicalHeight,
    );
  });

  it("draws self-grounded loaded sprites from the footprint front anchor", () => {
    const context = createMockCanvasContext();
    const image = {} as HTMLImageElement;
    const asset = estateAssetManifest.items["battery-storage"];
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
          id: "battery-storage",
          definitionId: "battery-storage",
          assetId: "battery-storage",
          x: 0,
          y: 0,
          rotation: 0,
          footprintWidth: 2,
          footprintHeight: 1,
        },
      ],
    };
    const loadedAssets = createEstateAssetLoadSnapshot(estateAssetManifest);
    loadedAssets.status = "loaded";
    loadedAssets.items["battery-storage"] = {
      ...loadedAssets.items["battery-storage"],
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

    expect(context.drawImage).toHaveBeenCalledWith(
      image,
      160,
      59,
      asset.logicalWidth,
      asset.logicalHeight,
    );
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
