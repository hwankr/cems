import { baseEstateBuildingDefinition } from "../data/estate-item-catalog";
import { getHarvestBubbleScreenAnchor, HARVEST_BUBBLE_RADIUS } from "./harvest-bubble";
import {
  getCellKey,
  getParcelCells,
  isParcelAdjacentToUnlockedParcel,
} from "../domain/expansion";
import {
  clampMainBuildingLevel,
  getMainBuildingAssetId,
} from "../domain/main-building";
import type {
  EstateAssetManifest,
  EstateGroundAssetDefinition,
  EstateProceduralAssetDefinition,
  EstateSpriteAssetDefinition,
} from "../data/estate-asset-manifest";
import type {
  EstateExpansionParcelDefinition,
  EstateGridCell,
  EstateGroundTile,
  EstateItemDefinition,
  EstateItemInstance,
  EstateSnapshot,
} from "../domain/types";
import {
  getCameraWorldBounds,
  worldToCanvas,
  type IsometricCamera,
  type ViewportSize,
} from "./camera";
import {
  DEFAULT_TILE_METRICS,
  expandWorldBounds,
  getCellCenterScreen,
  getCellDiamondPoints,
  getCellsWorldBounds,
  gridToScreen,
  type IsometricTileMetrics,
  type ScreenPoint,
  type WorldBounds,
} from "./projection";
import {
  getRenderFootprint,
  getRenderFootprintCells,
  sortIsometricItemsForRender,
  type RenderFootprintItem,
} from "./render-order";
import type { EstateAssetLoadSnapshot } from "./asset-loader";

export type EstateRenderParcel = {
  id: string;
  cells: EstateGridCell[];
  unlocked: boolean;
  unlockable: boolean;
  cost: number;
};

export type EstateRenderGroundTile = EstateGridCell & {
  assetId: string;
};

export type EstateRenderItem = RenderFootprintItem & {
  definitionId: string;
  assetId: string;
};

export type EstateRenderPlacementPreview = RenderFootprintItem & {
  assetId: string;
  valid: boolean;
};

type DisplayFootprintItem = RenderFootprintItem & {
  definitionId?: string;
  assetId?: string;
};

type SpriteAnchorOptions = {
  selfGrounded?: boolean;
  yOffset?: number;
};

const MAIN_BUILDING_SPRITE_ANCHOR_Y_OFFSET_TILES = 0.625;

export type EstateRenderScene = {
  metrics: IsometricTileMetrics;
  parcels: EstateRenderParcel[];
  groundTiles: EstateRenderGroundTile[];
  items: EstateRenderItem[];
  hoverCell?: EstateGridCell | null;
  hoverParcelId?: string | null;
  selectedItemId?: string | null;
  placementPreview?: EstateRenderPlacementPreview | null;
  recentlyUnlockedParcelId?: string | null;
  animationProgress?: number;
  mainBuildingLevel: number;
  showBuildGrid: boolean;
  harvestBubbleItemIds: string[];
};

export type CreateEstateRenderSceneInput = {
  snapshot: EstateSnapshot;
  itemDefinitions: readonly EstateItemDefinition[];
  parcelDefinitions: readonly EstateExpansionParcelDefinition[];
  metrics?: IsometricTileMetrics;
  hoverCell?: EstateGridCell | null;
  selectedItemId?: string | null;
  placementPreview?: EstateRenderPlacementPreview | null;
  recentlyUnlockedParcelId?: string | null;
  animationProgress?: number;
  placementActive?: boolean;
  harvestBubbleItemIds?: string[];
};

export function createEstateRenderScene({
  snapshot,
  itemDefinitions,
  parcelDefinitions,
  metrics = DEFAULT_TILE_METRICS,
  hoverCell = null,
  selectedItemId = null,
  placementPreview = null,
  recentlyUnlockedParcelId = null,
  animationProgress = 1,
  placementActive = false,
  harvestBubbleItemIds = [],
}: CreateEstateRenderSceneInput): EstateRenderScene {
  const unlockedParcelIds = new Set(snapshot.unlockedParcelIds);
  const itemDefinitionById = new Map(
    itemDefinitions.map((definition) => [definition.id, definition]),
  );
  const parcels = parcelDefinitions.map((parcel) => ({
    id: parcel.id,
    cells: getParcelCells(parcel),
    unlocked: unlockedParcelIds.has(parcel.id),
    unlockable:
      !unlockedParcelIds.has(parcel.id) &&
      isParcelAdjacentToUnlockedParcel(
        parcel.id,
        snapshot.unlockedParcelIds,
        parcelDefinitions,
      ),
    cost: parcel.cost,
  }));
  const hoverCellKey = hoverCell ? getCellKey(hoverCell) : null;
  const mainBuildingLevel = clampMainBuildingLevel(snapshot.mainBuildingLevel);
  const mainBuildingAssetId = getMainBuildingAssetId(mainBuildingLevel);

  return {
    metrics,
    parcels,
    groundTiles: snapshot.groundTiles.map((tile) =>
      createRenderGroundTile(tile, itemDefinitionById),
    ),
    items: snapshot.items.flatMap((item) =>
      createRenderItem(item, itemDefinitionById, mainBuildingAssetId),
    ),
    hoverCell,
    hoverParcelId: hoverCellKey
      ? (parcels.find((parcel) =>
          parcel.cells.some((cell) => getCellKey(cell) === hoverCellKey),
        )?.id ?? null)
      : null,
    selectedItemId,
    placementPreview,
    recentlyUnlockedParcelId,
    animationProgress,
    mainBuildingLevel,
    showBuildGrid: placementActive,
    harvestBubbleItemIds,
  };
}

export function getSceneCellList(scene: EstateRenderScene): EstateGridCell[] {
  const cellsByKey = new Map<string, EstateGridCell>();

  for (const parcel of scene.parcels) {
    for (const cell of parcel.cells) {
      cellsByKey.set(`${cell.x}:${cell.y}`, cell);
    }
  }

  return [...cellsByKey.values()];
}

export function getSceneUnlockedCells(
  scene: EstateRenderScene,
): EstateGridCell[] {
  return scene.parcels
    .filter((parcel) => parcel.unlocked)
    .flatMap((parcel) => parcel.cells);
}

export function getSceneUnlockedWorldBounds(
  scene: EstateRenderScene,
): WorldBounds {
  const unlockedCells = getSceneUnlockedCells(scene);
  return getCellsWorldBounds(
    unlockedCells.length > 0 ? unlockedCells : getSceneCellList(scene),
    scene.metrics,
  );
}

export function findTopRenderItemAtCell(
  scene: EstateRenderScene,
  cell: EstateGridCell,
): EstateRenderItem | null {
  const sorted = sortIsometricItemsForRender(scene.items);

  for (const item of [...sorted].reverse()) {
    if (
      getRenderFootprintCells(item).some(
        (candidate) => candidate.x === cell.x && candidate.y === cell.y,
      )
    ) {
      return item;
    }
  }

  return null;
}

export class EstateIsometricRenderer {
  constructor(private readonly context: CanvasRenderingContext2D) {}

  draw(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
    assets: EstateAssetManifest,
    loadedAssets?: EstateAssetLoadSnapshot,
  ) {
    const visibleWorldBounds = expandWorldBounds(
      getCameraWorldBounds(camera, viewport),
      192,
    );

    this.drawBackground(viewport);
    this.drawParcelFloors(scene, camera, viewport, visibleWorldBounds);
    this.drawGroundTiles(
      scene,
      camera,
      viewport,
      assets,
      loadedAssets,
      visibleWorldBounds,
    );
    this.drawBuildGrid(scene, camera, viewport, visibleWorldBounds);
    this.drawParcelHoverGlow(scene, camera, viewport);
    this.drawUnlockAnimation(scene, camera, viewport);
    this.drawHoverOverlay(scene, camera, viewport);
    this.drawSelectionFootprintGlow(scene, camera, viewport);
    this.drawSelectionOutline(scene, camera, viewport, "underlay");
    this.drawItems(
      scene,
      camera,
      viewport,
      assets,
      loadedAssets,
      visibleWorldBounds,
    );
    this.drawMainBuildingBadge(scene, camera, viewport);
    this.drawHarvestBubbles(scene, camera, viewport);
    this.drawPlacementPreview(scene, camera, viewport, assets, loadedAssets);
    this.drawSelectionOutline(scene, camera, viewport, "overlay");
    this.drawForegroundEffect(viewport);
  }

  private drawBackground(viewport: ViewportSize) {
    const ctx = this.context;
    const gradient = ctx.createLinearGradient(0, 0, 0, viewport.height);

    gradient.addColorStop(0, "#fbf3e2");
    gradient.addColorStop(0.52, "#eef4e0");
    gradient.addColorStop(1, "#d8e8d2");

    ctx.clearRect(0, 0, viewport.width, viewport.height);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    // Soft, warm sun glow in the upper area so the daylight reads as sunny.
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#fff6df";
    ctx.beginPath();
    ctx.ellipse(
      viewport.width * 0.8,
      viewport.height * 0.1,
      viewport.width * 0.36,
      viewport.height * 0.28,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }

  private drawParcelFloors(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
    visibleWorldBounds: WorldBounds,
  ) {
    for (const parcel of scene.parcels) {
      // Skip whole parcels off-screen — the map is large (up to 45x45), so most
      // parcels lie outside the viewport at typical zoom.
      const parcelBounds = getCellsWorldBounds(parcel.cells, scene.metrics);
      if (!intersectsWorldBounds(parcelBounds, visibleWorldBounds)) continue;

      const floorAlpha = getParcelFloorAlpha(scene, parcel);

      for (const cell of parcel.cells) {
        if (
          !intersectsWorldBounds(
            getCellsWorldBounds([cell], scene.metrics),
            visibleWorldBounds,
          )
        ) {
          continue;
        }

        const style = getParcelFloorStyle(parcel, cell);
        drawWorldPolygon(
          this.context,
          getCellDiamondPoints(cell, scene.metrics),
          camera,
          viewport,
          {
            fill: style.fill,
            stroke: style.stroke,
            alpha: floorAlpha,
            lineWidth: parcel.unlocked ? 1 : 0.75,
          },
        );
      }

      if (parcel.unlocked || parcel.cells.length === 0) continue;

      // Locked land reads as a warm, dashed "buildable plot" rather than dead
      // grey. Plots you can open next get an inviting honey "+ price" badge;
      // far-off plots stay dormant so the eye lands on what is actionable.
      this.drawPlotOutline(parcel, scene.metrics, camera, viewport, {
        stroke: parcel.unlockable ? "#caa23a" : "#bdb290",
        alpha: parcel.unlockable ? 0.85 : 0.5,
      });

      if (parcel.unlockable) {
        this.drawExpansionBadge(parcel, scene.metrics, camera, viewport);
      } else {
        this.drawDormantPlot(parcel, scene.metrics, camera, viewport);
      }
    }
  }

  private drawParcelHoverGlow(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
  ) {
    if (!scene.hoverParcelId) return;

    const parcel = scene.parcels.find(
      (candidate) => candidate.id === scene.hoverParcelId,
    );
    if (!parcel) return;

    const outline = getParcelOuterDiamond(parcel.cells, scene.metrics);
    if (!outline) return;

    strokeWorldPolygon(this.context, outline, camera, viewport, {
      stroke: parcel.unlocked ? "#ffffff" : "#f0b73e",
      alpha: parcel.unlocked ? 0.6 : 0.9,
      lineWidth: 2.5,
      lineDash: [10, 7],
    });
  }

  private drawUnlockAnimation(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
  ) {
    if (!scene.recentlyUnlockedParcelId) return;

    const progress = Math.min(1, Math.max(0, scene.animationProgress ?? 1));
    if (progress >= 1) return;

    const parcel = scene.parcels.find(
      (candidate) => candidate.id === scene.recentlyUnlockedParcelId,
    );
    if (!parcel) return;

    const bounds = getCellsWorldBounds(parcel.cells, scene.metrics);
    const sweepX = bounds.minX + (bounds.maxX - bounds.minX) * progress;

    drawWorldPolygon(
      this.context,
      [
        { x: sweepX - 60, y: bounds.minY - 36 },
        { x: sweepX + 28, y: bounds.minY - 36 },
        { x: sweepX + 96, y: bounds.maxY + 36 },
        { x: sweepX + 8, y: bounds.maxY + 36 },
      ],
      camera,
      viewport,
      {
        fill: "rgba(255, 255, 255, 0.72)",
        stroke: "rgba(255, 255, 255, 0.18)",
        alpha: (1 - progress) * 0.42,
        lineWidth: 1,
      },
    );

    const ctx = this.context;
    ctx.save();
    ctx.fillStyle = "#fef3c7";
    ctx.globalAlpha = Math.max(0, 0.72 - progress * 0.72);

    for (const [index, cell] of parcel.cells.entries()) {
      if (index % 5 !== 0) continue;

      const center = worldToCanvas(
        getCellCenterScreen(cell, scene.metrics),
        camera,
        viewport,
      );
      const lift = 18 * progress;
      const radius = (1.5 + (index % 3)) * camera.zoom;
      ctx.beginPath();
      ctx.arc(center.x, center.y - lift, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawPlotOutline(
    parcel: EstateRenderParcel,
    metrics: IsometricTileMetrics,
    camera: IsometricCamera,
    viewport: ViewportSize,
    style: { stroke: string; alpha: number },
  ) {
    const outline = getParcelOuterDiamond(parcel.cells, metrics);
    if (!outline) return;

    strokeWorldPolygon(this.context, outline, camera, viewport, {
      stroke: style.stroke,
      alpha: style.alpha,
      lineWidth: 1.75,
      lineDash: [9, 7],
    });
  }

  private drawExpansionBadge(
    parcel: EstateRenderParcel,
    metrics: IsometricTileMetrics,
    camera: IsometricCamera,
    viewport: ViewportSize,
  ) {
    const center = averagePoints(
      parcel.cells.map((cell) => getCellCenterScreen(cell, metrics)),
    );
    const canvas = worldToCanvas(center, camera, viewport);
    const ctx = this.context;
    const zoom = camera.zoom;
    const radius = Math.max(13, 16 * zoom);
    const circleY = canvas.y - radius;

    ctx.save();

    // Grounding disc so the floating badge feels anchored to the plot.
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#1f3a20";
    ctx.beginPath();
    ctx.ellipse(
      canvas.x,
      canvas.y + radius * 0.5,
      radius * 0.95,
      radius * 0.4,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.globalAlpha = 1;

    // Honey circle with a white plus.
    ctx.beginPath();
    ctx.arc(canvas.x, circleY, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#f2b53c";
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, 2 * zoom);
    ctx.strokeStyle = "#d99a2b";
    ctx.stroke();

    const plus = radius * 0.5;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(2, 2.6 * zoom);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(canvas.x, circleY - plus);
    ctx.lineTo(canvas.x, circleY + plus);
    ctx.moveTo(canvas.x - plus, circleY);
    ctx.lineTo(canvas.x + plus, circleY);
    ctx.stroke();
    ctx.lineCap = "butt";

    // Price pill just beneath the circle.
    const label = formatExpansionCost(parcel.cost);
    const fontSize = Math.max(11, Math.round(12 * zoom));
    ctx.font = `600 ${fontSize}px sans-serif`;
    const approxTextWidth = label.length * fontSize * 0.62;
    const pillHeight = Math.max(18, 20 * zoom);
    const pillWidth = approxTextWidth + pillHeight;
    const pillX = canvas.x - pillWidth / 2;
    const pillY = canvas.y + radius * 0.16;

    fillPill(ctx, pillX, pillY, pillWidth, pillHeight, "#fffdf7", "#e4c98a");
    ctx.fillStyle = "#8a5a12";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, canvas.x, pillY + pillHeight / 2 + 0.5);

    ctx.restore();
  }

  private drawDormantPlot(
    parcel: EstateRenderParcel,
    metrics: IsometricTileMetrics,
    camera: IsometricCamera,
    viewport: ViewportSize,
  ) {
    const center = averagePoints(
      parcel.cells.map((cell) => getCellCenterScreen(cell, metrics)),
    );
    const canvas = worldToCanvas(center, camera, viewport);
    const ctx = this.context;
    const size = Math.max(7, 9 * camera.zoom);

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#857c63";
    ctx.fillStyle = "#857c63";
    ctx.lineWidth = Math.max(1.4, 1.7 * camera.zoom);
    ctx.beginPath();
    ctx.arc(canvas.x, canvas.y - size * 0.42, size * 0.42, Math.PI, 0);
    ctx.stroke();
    ctx.fillRect(
      canvas.x - size * 0.5,
      canvas.y - size * 0.18,
      size,
      size * 0.78,
    );
    ctx.restore();
  }

  private drawGroundTiles(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
    assets: EstateAssetManifest,
    loadedAssets: EstateAssetLoadSnapshot | undefined,
    visibleWorldBounds: WorldBounds,
  ) {
    for (const tile of scene.groundTiles) {
      const bounds = getCellsWorldBounds([tile], scene.metrics);
      if (!intersectsWorldBounds(bounds, visibleWorldBounds)) continue;

      const asset = assets.ground[tile.assetId];
      const loadedAsset = loadedAssets?.ground[tile.assetId];
      const points = getCellDiamondPoints(tile, scene.metrics);

      drawWorldPolygon(this.context, points, camera, viewport, {
        fill: asset?.fill ?? "#9ebf7e",
        stroke: asset?.stroke ?? "#6d8f5c",
        alpha: 1,
        lineWidth: 1,
      });

      if (asset?.insetFill) {
        drawWorldPolygon(
          this.context,
          shrinkDiamondPoints(points, 0.68),
          camera,
          viewport,
          {
            fill: asset.insetFill,
            stroke: asset.stroke,
            alpha: 0.88,
            lineWidth: 1,
          },
        );
      }

      if (asset && loadedAsset?.image) {
        drawGroundTextureImage(
          this.context,
          points,
          camera,
          viewport,
          loadedAsset.image,
          asset.textureOpacity ?? 0.68,
        );
      } else {
        drawProceduralGroundTexture(
          this.context,
          points,
          camera,
          viewport,
          asset,
        );
      }
    }
  }

  private drawBuildGrid(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
    visibleWorldBounds: WorldBounds,
  ) {
    if (!scene.showBuildGrid) return;

    for (const cell of getSceneUnlockedCells(scene)) {
      if (
        !intersectsWorldBounds(
          getCellsWorldBounds([cell], scene.metrics),
          visibleWorldBounds,
        )
      ) {
        continue;
      }

      strokeWorldPolygon(
        this.context,
        getCellDiamondPoints(cell, scene.metrics),
        camera,
        viewport,
        { stroke: "#ffffff", alpha: 0.16, lineWidth: 1 },
      );
    }
  }

  private drawHoverOverlay(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
  ) {
    if (!scene.hoverCell) return;

    drawWorldPolygon(
      this.context,
      getCellDiamondPoints(scene.hoverCell, scene.metrics),
      camera,
      viewport,
      {
        fill: "#d9f99d",
        stroke: "#f8fafc",
        alpha: 0.34,
        lineWidth: 2,
      },
    );
  }

  private drawItems(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
    assets: EstateAssetManifest,
    loadedAssets: EstateAssetLoadSnapshot | undefined,
    visibleWorldBounds: WorldBounds,
  ) {
    const sortableItems = scene.items.map((item) => {
      const asset = assets.items[item.assetId];
      return {
        ...item,
        renderLayer:
          asset?.renderLayer ?? asset?.fallback.renderLayer ?? item.renderLayer ?? 0,
        yOffset: asset?.yOffset ?? asset?.fallback.yOffset ?? item.yOffset ?? 0,
      };
    });

    for (const item of sortIsometricItemsForRender(sortableItems)) {
      const asset = assets.items[item.assetId];
      const itemBounds = getItemWorldBounds(item, scene.metrics, asset);
      if (!intersectsWorldBounds(itemBounds, visibleWorldBounds)) continue;
      const image = loadedAssets?.items[item.assetId]?.image ?? null;

      if (asset && image) {
        this.drawSprite(item, scene.metrics, camera, viewport, asset, image);
        continue;
      }

      const fallback = asset?.fallback;

      if (fallback?.kind === "building") {
        this.drawBuilding(item, scene.metrics, camera, viewport, fallback);
      } else if (fallback?.kind === "tree") {
        this.drawTree(item, scene.metrics, camera, viewport, fallback);
      } else {
        this.drawDecor(item, scene.metrics, camera, viewport, fallback);
      }
    }
  }

  private drawSprite(
    item: EstateRenderItem,
    metrics: IsometricTileMetrics,
    camera: IsometricCamera,
    viewport: ViewportSize,
    asset: EstateSpriteAssetDefinition,
    image: HTMLImageElement,
    alpha = 1,
  ) {
    const anchor = worldToCanvas(
      getSpriteAnchorPoint(item, metrics, {
        selfGrounded: asset.selfGrounded,
        yOffset: getSpriteYOffset(item, asset),
      }),
      camera,
      viewport,
    );
    const box = getAnchoredSpriteDrawBox(anchor, asset, camera.zoom);
    const ctx = this.context;

    if (
      asset.fallback.kind === "building" &&
      shouldDrawSpriteGrounding(item) &&
      !asset.selfGrounded
    ) {
      this.drawSpriteGrounding(item, metrics, camera, viewport, alpha);
    }

    if (asset.shadow && !asset.selfGrounded) {
      ctx.save();
      ctx.globalAlpha = asset.shadow.opacity * alpha;
      ctx.fillStyle = "rgba(61, 79, 38, 0.62)";
      ctx.beginPath();
      ctx.ellipse(
        anchor.x + asset.shadow.offsetX * camera.zoom,
        anchor.y + asset.shadow.offsetY * camera.zoom,
        asset.logicalWidth * asset.shadow.scaleX * camera.zoom,
        asset.logicalHeight * asset.shadow.scaleY * camera.zoom,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (item.rotation === 0) {
      ctx.drawImage(image, box.x, box.y, box.width, box.height);
    } else {
      ctx.translate(anchor.x, anchor.y);
      ctx.rotate((Math.PI / 2) * item.rotation);
      ctx.drawImage(
        image,
        box.x - anchor.x,
        box.y - anchor.y,
        box.width,
        box.height,
      );
    }
    ctx.restore();
  }

  private drawSpriteGrounding(
    item: EstateRenderItem,
    metrics: IsometricTileMetrics,
    camera: IsometricCamera,
    viewport: ViewportSize,
    alpha: number,
  ) {
    drawWorldPolygon(
      this.context,
      getSpriteGroundingDiamond(item, metrics),
      camera,
      viewport,
      {
        fill: "#536f37",
        stroke: "#f7e4a8",
        alpha: 0.2 * alpha,
        lineWidth: 1,
      },
    );
  }

  private drawBuilding(
    item: EstateRenderItem,
    metrics: IsometricTileMetrics,
    camera: IsometricCamera,
    viewport: ViewportSize,
    asset: Extract<EstateProceduralAssetDefinition, { kind: "building" }>,
  ) {
    const footprint = getFootprintDiamondPoints(item, metrics);
    const raised = footprint.map((point) => ({
      x: point.x,
      y: point.y - asset.height,
    }));
    const ctx = this.context;

    drawWorldPolygon(ctx, shrinkDiamondPoints(footprint, 0.84), camera, viewport, {
      fill: asset.shadow,
      stroke: asset.shadow,
      alpha: 0.24,
      lineWidth: 1,
    });
    drawWorldPolygon(ctx, [raised[3], raised[2], footprint[2], footprint[3]], camera, viewport, {
      fill: asset.left,
      stroke: asset.stroke,
      alpha: 1,
      lineWidth: 1,
    });
    drawWorldPolygon(ctx, [raised[1], raised[2], footprint[2], footprint[1]], camera, viewport, {
      fill: asset.right,
      stroke: asset.stroke,
      alpha: 1,
      lineWidth: 1,
    });
    drawWorldPolygon(ctx, raised, camera, viewport, {
      fill: asset.top,
      stroke: asset.stroke,
      alpha: 1,
      lineWidth: 1.5,
    });

    const roofCenter = worldToCanvas(averagePoints(raised), camera, viewport);
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(roofCenter.x - 18 * camera.zoom, roofCenter.y);
    ctx.lineTo(roofCenter.x + 18 * camera.zoom, roofCenter.y);
    ctx.stroke();
    ctx.restore();
  }

  private drawTree(
    item: EstateRenderItem,
    metrics: IsometricTileMetrics,
    camera: IsometricCamera,
    viewport: ViewportSize,
    asset: Extract<EstateProceduralAssetDefinition, { kind: "tree" }>,
  ) {
    const center = getCellCenterScreen(item, metrics);
    const base = worldToCanvas(center, camera, viewport);
    const ctx = this.context;
    const scale = camera.zoom;
    const height = asset.height * scale;

    ctx.save();
    ctx.fillStyle = asset.shadow;
    ctx.globalAlpha = 0.24;
    ctx.beginPath();
    ctx.ellipse(base.x, base.y + 8 * scale, 30 * scale, 11 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = asset.trunk;
    ctx.fillRect(base.x - 4 * scale, base.y - height * 0.52, 8 * scale, height * 0.56);
    ctx.fillStyle = asset.canopyDark;
    ctx.beginPath();
    ctx.ellipse(base.x + 7 * scale, base.y - height * 0.62, 18 * scale, 20 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = asset.canopy;
    ctx.beginPath();
    ctx.ellipse(base.x - 5 * scale, base.y - height * 0.72, 22 * scale, 24 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawDecor(
    item: EstateRenderItem,
    metrics: IsometricTileMetrics,
    camera: IsometricCamera,
    viewport: ViewportSize,
    asset?: EstateProceduralAssetDefinition,
  ) {
    const center = getCellCenterScreen(item, metrics);
    const base = worldToCanvas(center, camera, viewport);
    const ctx = this.context;
    const scale = camera.zoom;
    const fill = asset?.kind === "decor" ? asset.fill : "#d7bf76";
    const accent = asset?.kind === "decor" ? asset.accent : "#8f7440";
    const shadow = asset?.kind === "decor" ? asset.shadow : "rgba(31, 41, 55, 0.35)";

    ctx.save();
    ctx.fillStyle = shadow;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.ellipse(base.x, base.y + 6 * scale, 22 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = fill;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.ellipse(base.x, base.y - 9 * scale, 15 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawMainBuildingBadge(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
  ) {
    const building = scene.items.find((item) =>
      item.assetId.startsWith("campus-building-lv"),
    );
    if (!building) return;

    const anchor = worldToCanvas(
      getSpriteAnchorPoint(building, scene.metrics),
      camera,
      viewport,
    );
    const ctx = this.context;
    const zoom = camera.zoom;
    const label = `Lv.${scene.mainBuildingLevel}`;
    const fontSize = Math.max(11, Math.round(12 * zoom));
    const liftY = anchor.y - 96 * zoom;

    ctx.save();
    ctx.font = `700 ${fontSize}px sans-serif`;
    const pillHeight = Math.max(18, 20 * zoom);
    const pillWidth = label.length * fontSize * 0.62 + pillHeight;
    fillPill(
      ctx,
      anchor.x - pillWidth / 2,
      liftY - pillHeight / 2,
      pillWidth,
      pillHeight,
      "#fffdf7",
      "#e2a23a",
    );
    ctx.fillStyle = "#8a5a12";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, anchor.x, liftY + 0.5);
    ctx.restore();
  }

  private drawHarvestBubbles(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
  ) {
    if (scene.harvestBubbleItemIds.length === 0) return;
    const ids = new Set(scene.harvestBubbleItemIds);
    const ctx = this.context;

    for (const item of scene.items) {
      if (!ids.has(item.id)) continue;
      const anchor = getHarvestBubbleScreenAnchor(
        item,
        scene.metrics,
        camera,
        viewport,
      );
      const radius = HARVEST_BUBBLE_RADIUS * Math.max(0.8, camera.zoom);

      ctx.save();
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#f2b53c";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      // a small leaf/sprout mark
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(anchor.x, anchor.y, radius * 0.32, radius * 0.5, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawSelectionFootprintGlow(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
  ) {
    const item = scene.items.find(
      (candidate) => candidate.id === scene.selectedItemId,
    );
    if (!item) return;

    drawWorldPolygon(
      this.context,
      getDisplayFootprintDiamond(item, scene.metrics),
      camera,
      viewport,
      {
        fill: "#bfdbfe",
        stroke: "#38bdf8",
        alpha: 0.22,
        lineWidth: 2,
      },
    );
  }

  private drawPlacementPreview(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
    assets: EstateAssetManifest,
    loadedAssets?: EstateAssetLoadSnapshot,
  ) {
    if (!scene.placementPreview) return;

    const preview = scene.placementPreview;

    for (const cellDiamond of getPlacementPreviewCellDiamonds(
      preview,
      scene.metrics,
    )) {
      drawWorldPolygon(this.context, cellDiamond, camera, viewport, {
        fill: preview.valid ? "#6ee7b7" : "#fca5a5",
        stroke: preview.valid ? "#059669" : "#dc2626",
        alpha: preview.valid ? 0.32 : 0.4,
        lineWidth: 1.5,
      });
    }

    const spriteAsset = assets.items[preview.assetId];
    const spriteImage = loadedAssets?.items[preview.assetId]?.image ?? null;
    if (spriteAsset && spriteImage) {
      this.drawSprite(
        {
          ...preview,
          definitionId: preview.assetId,
        },
        scene.metrics,
        camera,
        viewport,
        spriteAsset,
        spriteImage,
        preview.valid ? 0.58 : 0.34,
      );
    }

    const markerAssetId = preview.valid
      ? "placement-valid-marker"
      : "placement-invalid-marker";
    const markerAsset = assets.items[markerAssetId];
    const markerImage = loadedAssets?.items[markerAssetId]?.image ?? null;

    if (markerAsset && markerImage) {
      this.drawSprite(
        {
          id: `${preview.id}:marker`,
          definitionId: markerAssetId,
          assetId: markerAssetId,
          x: preview.x,
          y: preview.y,
          rotation: preview.rotation,
          footprintWidth: preview.footprintWidth,
          footprintHeight: preview.footprintHeight,
        },
        scene.metrics,
        camera,
        viewport,
        markerAsset,
        markerImage,
        0.84,
      );
    }
  }

  private drawSelectionOutline(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
    layer: "underlay" | "overlay",
  ) {
    const item = scene.items.find(
      (candidate) => candidate.id === scene.selectedItemId,
    );
    if (!item) return;

    const isMainBuilding = isMainBuildingDisplayItem(item);
    if (layer === "underlay" && !isMainBuilding) return;
    if (layer === "overlay" && isMainBuilding) return;

    strokeWorldPolygon(
      this.context,
      getDisplayFootprintDiamond(item, scene.metrics),
      camera,
      viewport,
      {
        stroke: "#0369a1",
        alpha: 0.94,
        lineWidth: 3,
        lineDash: [7, 5],
      },
    );
  }

  private drawForegroundEffect(viewport: ViewportSize) {
    const ctx = this.context;
    const gradient = ctx.createLinearGradient(0, 0, viewport.width, viewport.height);

    gradient.addColorStop(0, "rgba(255, 251, 235, 0.16)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(1, "rgba(58, 86, 50, 0.08)");

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    ctx.restore();
  }
}

function getParcelFloorAlpha(
  scene: EstateRenderScene,
  parcel: EstateRenderParcel,
): number {
  if (!parcel.unlocked) return 0.82;

  if (scene.recentlyUnlockedParcelId !== parcel.id) return 1;

  const progress = Math.min(1, Math.max(0, scene.animationProgress ?? 1));
  return 0.82 + 0.18 * progress;
}

function getParcelFloorStyle(
  parcel: EstateRenderParcel,
  cell: EstateGridCell,
): { fill: string; stroke: string } {
  if (parcel.unlocked) {
    // Two close greens checkered by cell parity so the lawn has life without a
    // hard grid; the stroke stays near the fill so cell seams read as soft.
    const even = (cell.x + cell.y) % 2 === 0;
    return {
      fill: even ? "#8fc46a" : "#86bd63",
      stroke: "#7eb35c",
    };
  }

  // Locked land: warm tan "future plot". Stroke matches the fill so individual
  // cells do not draw a grid — the dashed plot outline frames it instead.
  if (parcel.unlockable) {
    return { fill: "#ece1c5", stroke: "#ece1c5" };
  }

  return { fill: "#ded8c6", stroke: "#ded8c6" };
}

function getParcelOuterDiamond(
  cells: readonly EstateGridCell[],
  metrics: IsometricTileMetrics,
): [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint] | null {
  if (cells.length === 0) return null;

  const minX = Math.min(...cells.map((cell) => cell.x));
  const maxX = Math.max(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  const maxY = Math.max(...cells.map((cell) => cell.y));

  return [
    gridToScreen({ x: minX, y: minY }, metrics),
    gridToScreen({ x: maxX + 1, y: minY }, metrics),
    gridToScreen({ x: maxX + 1, y: maxY + 1 }, metrics),
    gridToScreen({ x: minX, y: maxY + 1 }, metrics),
  ];
}

function fillPill(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke?: string,
) {
  const radius = height / 2;

  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.arc(x + width - radius, y + radius, radius, -Math.PI / 2, Math.PI / 2);
  context.lineTo(x + radius, y + height);
  context.arc(x + radius, y + radius, radius, Math.PI / 2, -Math.PI / 2);
  context.closePath();
  context.fillStyle = fill;
  context.fill();

  if (stroke) {
    context.lineWidth = 1;
    context.strokeStyle = stroke;
    context.stroke();
  }
}

function formatExpansionCost(cost: number): string {
  return `+${cost.toLocaleString("en-US")}`;
}

function createRenderGroundTile(
  tile: EstateGroundTile,
  itemDefinitionById: ReadonlyMap<string, EstateItemDefinition>,
): EstateRenderGroundTile {
  return {
    x: tile.x,
    y: tile.y,
    assetId: itemDefinitionById.get(tile.definitionId)?.assetId ?? tile.definitionId,
  };
}

function createRenderItem(
  item: EstateItemInstance,
  itemDefinitionById: ReadonlyMap<string, EstateItemDefinition>,
  mainBuildingAssetId: string,
): EstateRenderItem[] {
  const definition = itemDefinitionById.get(item.definitionId);
  if (!definition) return [];

  const assetId =
    item.definitionId === baseEstateBuildingDefinition.id
      ? mainBuildingAssetId
      : definition.assetId;

  return [
    {
      id: item.id,
      definitionId: item.definitionId,
      assetId,
      x: item.x,
      y: item.y,
      rotation: item.rotation,
      footprintWidth: definition.footprintWidth,
      footprintHeight: definition.footprintHeight,
    },
  ];
}

function drawWorldPolygon(
  context: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  camera: IsometricCamera,
  viewport: ViewportSize,
  style: {
    fill: string | CanvasGradient;
    stroke: string;
    alpha: number;
    lineWidth: number;
    lineDash?: number[];
  },
) {
  if (points.length === 0) return;

  const canvasPoints = points.map((point) => worldToCanvas(point, camera, viewport));
  const first = canvasPoints[0];

  context.save();
  context.globalAlpha = style.alpha;
  context.fillStyle = style.fill;
  context.strokeStyle = style.stroke;
  context.lineWidth = style.lineWidth;
  context.setLineDash(style.lineDash ?? []);
  context.beginPath();
  context.moveTo(first.x, first.y);

  for (const point of canvasPoints.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function strokeWorldPolygon(
  context: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  camera: IsometricCamera,
  viewport: ViewportSize,
  style: {
    stroke: string;
    alpha: number;
    lineWidth: number;
    lineDash?: number[];
  },
) {
  if (points.length === 0) return;

  const canvasPoints = points.map((point) => worldToCanvas(point, camera, viewport));
  const first = canvasPoints[0];

  context.save();
  context.globalAlpha = style.alpha;
  context.strokeStyle = style.stroke;
  context.lineWidth = style.lineWidth;
  context.setLineDash(style.lineDash ?? []);
  context.beginPath();
  context.moveTo(first.x, first.y);

  for (const point of canvasPoints.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.closePath();
  context.stroke();
  context.restore();
}

function drawGroundTextureImage(
  context: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  camera: IsometricCamera,
  viewport: ViewportSize,
  image: HTMLImageElement,
  opacity: number,
) {
  if (points.length === 0) return;

  const canvasPoints = points.map((point) => worldToCanvas(point, camera, viewport));
  const first = canvasPoints[0];
  const minX = Math.min(...canvasPoints.map((point) => point.x));
  const minY = Math.min(...canvasPoints.map((point) => point.y));
  const maxX = Math.max(...canvasPoints.map((point) => point.x));
  const maxY = Math.max(...canvasPoints.map((point) => point.y));

  context.save();
  context.beginPath();
  context.moveTo(first.x, first.y);

  for (const point of canvasPoints.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.closePath();
  context.clip();
  context.globalAlpha = opacity;
  context.drawImage(image, minX, minY, maxX - minX, maxY - minY);
  context.restore();
}

function drawProceduralGroundTexture(
  context: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  camera: IsometricCamera,
  viewport: ViewportSize,
  asset?: EstateGroundAssetDefinition,
) {
  if (points.length < 4) return;

  const canvasPoints = points.map((point) => worldToCanvas(point, camera, viewport));
  const center = averagePoints(canvasPoints);
  const opacity = asset?.textureOpacity ?? 0.48;

  context.save();
  context.globalAlpha = opacity * 0.28;
  context.strokeStyle = asset?.stroke ?? "#6d8f5c";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(
    (canvasPoints[0].x + canvasPoints[3].x) / 2,
    (canvasPoints[0].y + canvasPoints[3].y) / 2,
  );
  context.lineTo(
    (canvasPoints[1].x + canvasPoints[2].x) / 2,
    (canvasPoints[1].y + canvasPoints[2].y) / 2,
  );
  context.moveTo(
    (canvasPoints[0].x + canvasPoints[1].x) / 2,
    (canvasPoints[0].y + canvasPoints[1].y) / 2,
  );
  context.lineTo(
    (canvasPoints[3].x + canvasPoints[2].x) / 2,
    (canvasPoints[3].y + canvasPoints[2].y) / 2,
  );
  context.stroke();
  context.globalAlpha = opacity * 0.34;
  context.fillStyle = asset?.stroke ?? "#6d8f5c";
  context.beginPath();
  context.arc(center.x - 11, center.y - 2, 1.4, 0, Math.PI * 2);
  context.arc(center.x + 9, center.y + 3, 1.2, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function getFootprintDiamondPoints(
  item: RenderFootprintItem,
  metrics: IsometricTileMetrics,
): [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint] {
  const footprint = getRenderFootprint(item);

  return [
    gridToScreen({ x: item.x, y: item.y }, metrics),
    gridToScreen({ x: item.x + footprint.width, y: item.y }, metrics),
    gridToScreen(
      { x: item.x + footprint.width, y: item.y + footprint.height },
      metrics,
    ),
    gridToScreen({ x: item.x, y: item.y + footprint.height }, metrics),
  ];
}

export function getPlacementPreviewCellDiamonds(
  preview: RenderFootprintItem,
  metrics: IsometricTileMetrics,
): ScreenPoint[][] {
  return getRenderFootprintCells(preview).map((cell) =>
    getCellDiamondPoints(cell, metrics),
  );
}

function getItemWorldBounds(
  item: RenderFootprintItem,
  metrics: IsometricTileMetrics,
  asset?: EstateSpriteAssetDefinition,
): WorldBounds {
  const points = getFootprintDiamondPoints(item, metrics);
  const height = asset?.fallback.height ?? 36;

  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)) - height - 16,
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)) + 24,
  };
}

export function getAnchoredSpriteDrawBox(
  anchor: ScreenPoint,
  asset: Pick<
    EstateSpriteAssetDefinition,
    "anchorX" | "anchorY" | "logicalHeight" | "logicalWidth"
  >,
  scale: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: anchor.x - asset.anchorX * scale,
    y: anchor.y - asset.anchorY * scale,
    width: asset.logicalWidth * scale,
    height: asset.logicalHeight * scale,
  };
}

export function getSpriteGroundingDiamond(
  item: DisplayFootprintItem,
  metrics: IsometricTileMetrics,
): ScreenPoint[] {
  if (isMainBuildingDisplayItem(item)) {
    return getDisplayFootprintDiamond(item, metrics);
  }

  return shrinkDiamondPoints(getFootprintDiamondPoints(item, metrics), 0.78);
}

export function getDisplayFootprintDiamond(
  item: DisplayFootprintItem,
  metrics: IsometricTileMetrics,
): ScreenPoint[] {
  return getFootprintDiamondPoints(item, metrics);
}

export function getSpriteAnchorPoint(
  item: DisplayFootprintItem,
  metrics: IsometricTileMetrics,
  options: SpriteAnchorOptions = {},
): ScreenPoint {
  const isMainBuilding = isMainBuildingDisplayItem(item);
  const anchor =
    options.selfGrounded && !isMainBuilding
      ? getFootprintFrontAnchorPoint(item, metrics)
      : getFootprintAnchorPoint(item, metrics);
  const yOffset = options.yOffset ?? item.yOffset ?? 0;

  if (!isMainBuilding) {
    return {
      x: anchor.x,
      y: anchor.y + yOffset,
    };
  }

  return {
    x: anchor.x,
    y:
      anchor.y +
      metrics.tileHeight * MAIN_BUILDING_SPRITE_ANCHOR_Y_OFFSET_TILES +
      yOffset,
  };
}

export function shouldDrawSpriteGrounding(item: DisplayFootprintItem): boolean {
  return !isMainBuildingDisplayItem(item);
}

function getFootprintAnchorPoint(
  item: RenderFootprintItem,
  metrics: IsometricTileMetrics,
): ScreenPoint {
  return averagePoints(getFootprintDiamondPoints(item, metrics));
}

function getFootprintFrontAnchorPoint(
  item: RenderFootprintItem,
  metrics: IsometricTileMetrics,
): ScreenPoint {
  return getFootprintDiamondPoints(item, metrics)[2];
}

function getSpriteYOffset(
  item: DisplayFootprintItem,
  asset: EstateSpriteAssetDefinition,
): number {
  return asset.yOffset ?? asset.fallback.yOffset ?? item.yOffset ?? 0;
}

function intersectsWorldBounds(first: WorldBounds, second: WorldBounds) {
  return !(
    first.maxX < second.minX ||
    first.minX > second.maxX ||
    first.maxY < second.minY ||
    first.minY > second.maxY
  );
}

function shrinkDiamondPoints(
  points: readonly ScreenPoint[],
  ratio: number,
): ScreenPoint[] {
  const center = averagePoints(points);

  return points.map((point) => ({
    x: center.x + (point.x - center.x) * ratio,
    y: center.y + (point.y - center.y) * ratio,
  }));
}

function isMainBuildingDisplayItem(item: DisplayFootprintItem): boolean {
  return (
    item.definitionId === baseEstateBuildingDefinition.id ||
    item.assetId?.startsWith("campus-building-lv") === true
  );
}

function averagePoints(points: readonly ScreenPoint[]): ScreenPoint {
  const sum = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
  };
}
