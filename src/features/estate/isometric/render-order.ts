import type { EstateGridCell, QuarterTurn } from "../domain/types";

export type RenderFootprintItem = {
  id: string;
  x: number;
  y: number;
  footprintWidth: number;
  footprintHeight: number;
  rotation: QuarterTurn;
  renderLayer?: number;
  yOffset?: number;
};

export function getRenderFootprint(item: RenderFootprintItem): {
  width: number;
  height: number;
} {
  if (item.rotation === 1 || item.rotation === 3) {
    return {
      width: item.footprintHeight,
      height: item.footprintWidth,
    };
  }

  return {
    width: item.footprintWidth,
    height: item.footprintHeight,
  };
}

export function getRenderFootprintCells(
  item: RenderFootprintItem,
): EstateGridCell[] {
  const footprint = getRenderFootprint(item);
  const cells: EstateGridCell[] = [];

  for (let x = item.x; x < item.x + footprint.width; x += 1) {
    for (let y = item.y; y < item.y + footprint.height; y += 1) {
      cells.push({ x, y });
    }
  }

  return cells;
}

export function getRenderDepthKey(item: RenderFootprintItem): number {
  return item.x + item.y;
}

export function getRenderRearPointKey(item: RenderFootprintItem): number {
  const footprint = getRenderFootprint(item);
  return item.x + item.y + footprint.width + footprint.height;
}

export function sortIsometricItemsForRender<T extends RenderFootprintItem>(
  items: readonly T[],
): T[] {
  return [...items].sort((first, second) => {
    const depthDelta = getRenderDepthKey(first) - getRenderDepthKey(second);
    if (depthDelta !== 0) return depthDelta;

    const rearDelta =
      getRenderRearPointKey(first) - getRenderRearPointKey(second);
    if (rearDelta !== 0) return rearDelta;

    const layerDelta =
      (first.renderLayer ?? 0) - (second.renderLayer ?? 0);
    if (layerDelta !== 0) return layerDelta;

    const yOffsetDelta = (first.yOffset ?? 0) - (second.yOffset ?? 0);
    if (yOffsetDelta !== 0) return yOffsetDelta;

    return first.id.localeCompare(second.id);
  });
}
