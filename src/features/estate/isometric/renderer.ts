import { getParcelCells } from "../domain/expansion";
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

export type EstateGroundAsset = {
  fill: string;
  stroke: string;
  insetFill?: string;
};

export type EstateProceduralAsset =
  | {
      kind: "building";
      height: number;
      renderLayer?: number;
      yOffset?: number;
      top: string;
      left: string;
      right: string;
      stroke: string;
      shadow: string;
    }
  | {
      kind: "tree";
      height: number;
      renderLayer?: number;
      yOffset?: number;
      canopy: string;
      canopyDark: string;
      trunk: string;
      shadow: string;
    }
  | {
      kind: "decor";
      height: number;
      renderLayer?: number;
      yOffset?: number;
      fill: string;
      accent: string;
      shadow: string;
    };

export type EstateAssetManifest = {
  ground: Record<string, EstateGroundAsset>;
  items: Record<string, EstateProceduralAsset>;
};

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

export type EstateRenderScene = {
  metrics: IsometricTileMetrics;
  parcels: EstateRenderParcel[];
  groundTiles: EstateRenderGroundTile[];
  items: EstateRenderItem[];
  hoverCell?: EstateGridCell | null;
  selectedItemId?: string | null;
};

export type CreateEstateRenderSceneInput = {
  snapshot: EstateSnapshot;
  itemDefinitions: readonly EstateItemDefinition[];
  parcelDefinitions: readonly EstateExpansionParcelDefinition[];
  metrics?: IsometricTileMetrics;
  hoverCell?: EstateGridCell | null;
  selectedItemId?: string | null;
};

export function createEstateRenderScene({
  snapshot,
  itemDefinitions,
  parcelDefinitions,
  metrics = DEFAULT_TILE_METRICS,
  hoverCell = null,
  selectedItemId = null,
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
  ) {
    const visibleWorldBounds = expandWorldBounds(
      getCameraWorldBounds(camera, viewport),
      192,
    );

    this.drawBackground(viewport);
    this.drawParcelFloors(scene, camera, viewport);
    this.drawGroundTiles(scene, camera, viewport, assets, visibleWorldBounds);
    this.drawHoverOverlay(scene, camera, viewport);
    this.drawItems(scene, camera, viewport, assets, visibleWorldBounds);
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
        this.drawLockedParcelLabel(parcel, scene.metrics, camera, viewport);
      }
    }
  }

  private drawLockedParcelLabel(
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
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(canvas.x - 18, canvas.y - 1, 5, Math.PI, 0);
    ctx.stroke();
    ctx.fillRect(canvas.x - 24, canvas.y - 1, 12, 10);
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
    visibleWorldBounds: WorldBounds,
  ) {
    for (const tile of scene.groundTiles) {
      const bounds = getCellsWorldBounds([tile], scene.metrics);
      if (!intersectsWorldBounds(bounds, visibleWorldBounds)) continue;

      const asset = assets.ground[tile.assetId];
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
    visibleWorldBounds: WorldBounds,
  ) {
    const sortableItems = scene.items.map((item) => {
      const asset = assets.items[item.assetId];
      return {
        ...item,
        renderLayer: asset?.renderLayer ?? item.renderLayer ?? 0,
        yOffset: asset?.yOffset ?? item.yOffset ?? 0,
      };
    });

    for (const item of sortIsometricItemsForRender(sortableItems)) {
      const asset = assets.items[item.assetId];
      const itemBounds = getItemWorldBounds(item, scene.metrics, asset);
      if (!intersectsWorldBounds(itemBounds, visibleWorldBounds)) continue;

      if (asset?.kind === "building") {
        this.drawBuilding(item, scene.metrics, camera, viewport, asset);
      } else if (asset?.kind === "tree") {
        this.drawTree(item, scene.metrics, camera, viewport, asset);
      } else {
        this.drawDecor(item, scene.metrics, camera, viewport, asset);
      }
    }
  }

  private drawBuilding(
    item: EstateRenderItem,
    metrics: IsometricTileMetrics,
    camera: IsometricCamera,
    viewport: ViewportSize,
    asset: Extract<EstateProceduralAsset, { kind: "building" }>,
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
    asset: Extract<EstateProceduralAsset, { kind: "tree" }>,
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
    asset?: EstateProceduralAsset,
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

  private drawSelectionOutline(
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
        fill: "#ffffff",
        stroke: "#0369a1",
        alpha: 0.24,
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
  asset?: EstateProceduralAsset,
): WorldBounds {
  const points = getFootprintDiamondPoints(item, metrics);
  const height = asset?.height ?? 36;

  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)) - height - 16,
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)) + 24,
  };
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
