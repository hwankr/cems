import { getParcelCells } from "../domain/expansion";
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

export type EstateRenderScene = {
  metrics: IsometricTileMetrics;
  parcels: EstateRenderParcel[];
  groundTiles: EstateRenderGroundTile[];
  items: EstateRenderItem[];
  hoverCell?: EstateGridCell | null;
  selectedItemId?: string | null;
  placementPreview?: EstateRenderPlacementPreview | null;
};

export type CreateEstateRenderSceneInput = {
  snapshot: EstateSnapshot;
  itemDefinitions: readonly EstateItemDefinition[];
  parcelDefinitions: readonly EstateExpansionParcelDefinition[];
  metrics?: IsometricTileMetrics;
  hoverCell?: EstateGridCell | null;
  selectedItemId?: string | null;
  placementPreview?: EstateRenderPlacementPreview | null;
};

export function createEstateRenderScene({
  snapshot,
  itemDefinitions,
  parcelDefinitions,
  metrics = DEFAULT_TILE_METRICS,
  hoverCell = null,
  selectedItemId = null,
  placementPreview = null,
}: CreateEstateRenderSceneInput): EstateRenderScene {
  const unlockedParcelIds = new Set(snapshot.unlockedParcelIds);
  const itemDefinitionById = new Map(
    itemDefinitions.map((definition) => [definition.id, definition]),
  );

  return {
    metrics,
    parcels: parcelDefinitions.map((parcel) => ({
      id: parcel.id,
      cells: getParcelCells(parcel),
      unlocked: unlockedParcelIds.has(parcel.id),
      cost: parcel.cost,
    })),
    groundTiles: snapshot.groundTiles.map((tile) =>
      createRenderGroundTile(tile, itemDefinitionById),
    ),
    items: snapshot.items.flatMap((item) =>
      createRenderItem(item, itemDefinitionById),
    ),
    hoverCell,
    selectedItemId,
    placementPreview,
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
    this.drawParcelFloors(scene, camera, viewport, assets, loadedAssets);
    this.drawGroundTiles(
      scene,
      camera,
      viewport,
      assets,
      loadedAssets,
      visibleWorldBounds,
    );
    this.drawHoverOverlay(scene, camera, viewport);
    this.drawSelectionFootprintGlow(scene, camera, viewport);
    this.drawItems(
      scene,
      camera,
      viewport,
      assets,
      loadedAssets,
      visibleWorldBounds,
    );
    this.drawPlacementPreview(scene, camera, viewport, assets, loadedAssets);
    this.drawSelectionOutline(scene, camera, viewport);
    this.drawForegroundEffect(viewport);
  }

  private drawBackground(viewport: ViewportSize) {
    const ctx = this.context;
    const gradient = ctx.createLinearGradient(0, 0, 0, viewport.height);

    gradient.addColorStop(0, "#dfe8ed");
    gradient.addColorStop(0.58, "#edf4e8");
    gradient.addColorStop(1, "#d8e4dc");

    ctx.clearRect(0, 0, viewport.width, viewport.height);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }

  private drawParcelFloors(
    scene: EstateRenderScene,
    camera: IsometricCamera,
    viewport: ViewportSize,
    assets: EstateAssetManifest,
    loadedAssets?: EstateAssetLoadSnapshot,
  ) {
    for (const parcel of scene.parcels) {
      for (const cell of parcel.cells) {
        drawWorldPolygon(
          this.context,
          getCellDiamondPoints(cell, scene.metrics),
          camera,
          viewport,
          {
            fill: parcel.unlocked ? "#76ad61" : "#7f8b78",
            stroke: parcel.unlocked ? "#5d924b" : "#687365",
            alpha: parcel.unlocked ? 1 : 0.58,
            lineWidth: 1,
          },
        );
      }

      if (!parcel.unlocked && parcel.cells.length > 0) {
        this.drawLockedParcelLabel(
          parcel,
          scene.metrics,
          camera,
          viewport,
          assets.items["locked-parcel-icon"],
          loadedAssets?.items["locked-parcel-icon"]?.image ?? null,
        );
      }
    }
  }

  private drawLockedParcelLabel(
    parcel: EstateRenderParcel,
    metrics: IsometricTileMetrics,
    camera: IsometricCamera,
    viewport: ViewportSize,
    iconAsset?: EstateSpriteAssetDefinition,
    iconImage?: HTMLImageElement | null,
  ) {
    const center = averagePoints(
      parcel.cells.map((cell) => getCellCenterScreen(cell, metrics)),
    );
    const canvas = worldToCanvas(center, camera, viewport);
    const ctx = this.context;
    const width = 68;
    const height = 30;

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = "rgba(31, 41, 55, 0.72)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 1;
    ctx.fillRect(canvas.x - width / 2, canvas.y - height / 2, width, height);
    ctx.strokeRect(canvas.x - width / 2, canvas.y - height / 2, width, height);
    ctx.globalAlpha = 1;
    if (iconAsset && iconImage) {
      const iconBox = getAnchoredSpriteDrawBox(
        { x: canvas.x - 18, y: canvas.y + 10 },
        iconAsset,
        0.22 * camera.zoom,
      );
      ctx.drawImage(
        iconImage,
        iconBox.x,
        iconBox.y,
        iconBox.width,
        iconBox.height,
      );
    } else {
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(canvas.x - 18, canvas.y - 1, 5, Math.PI, 0);
      ctx.stroke();
      ctx.fillRect(canvas.x - 24, canvas.y - 1, 12, 10);
    }
    ctx.font = "600 12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${parcel.cost}`, canvas.x - 5, canvas.y + 4);
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
    const anchor = worldToCanvas(getFootprintAnchorPoint(item, metrics), camera, viewport);
    const box = getAnchoredSpriteDrawBox(anchor, asset, camera.zoom);
    const ctx = this.context;

    if (asset.shadow) {
      ctx.save();
      ctx.globalAlpha = asset.shadow.opacity * alpha;
      ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
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
      getFootprintDiamondPoints(item, scene.metrics),
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
    const footprint = getFootprintDiamondPoints(preview, scene.metrics);

    drawWorldPolygon(this.context, footprint, camera, viewport, {
      fill: preview.valid ? "#6ee7b7" : "#fca5a5",
      stroke: preview.valid ? "#059669" : "#dc2626",
      alpha: preview.valid ? 0.3 : 0.36,
      lineWidth: 2.5,
    });

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
  ) {
    const item = scene.items.find(
      (candidate) => candidate.id === scene.selectedItemId,
    );
    if (!item) return;

    strokeWorldPolygon(
      this.context,
      getFootprintDiamondPoints(item, scene.metrics),
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

    gradient.addColorStop(0, "rgba(255, 255, 255, 0.12)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(1, "rgba(15, 23, 42, 0.1)");

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    ctx.restore();
  }
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
): EstateRenderItem[] {
  const definition = itemDefinitionById.get(item.definitionId);
  if (!definition) return [];

  return [
    {
      id: item.id,
      definitionId: item.definitionId,
      assetId: definition.assetId,
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

function getFootprintAnchorPoint(
  item: RenderFootprintItem,
  metrics: IsometricTileMetrics,
): ScreenPoint {
  return averagePoints(getFootprintDiamondPoints(item, metrics));
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
