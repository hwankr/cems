import { describe, expect, it } from "vitest";
import {
  getRenderFootprintCells,
  sortIsometricItemsForRender,
} from "../isometric/render-order";

describe("isometric render order", () => {
  it("calculates footprint cells after quarter-turn rotation", () => {
    expect(
      getRenderFootprintCells({
        id: "rotated",
        x: 5,
        y: 7,
        footprintWidth: 2,
        footprintHeight: 3,
        rotation: 1,
      }),
    ).toEqual([
      { x: 5, y: 7 },
      { x: 5, y: 8 },
      { x: 6, y: 7 },
      { x: 6, y: 8 },
      { x: 7, y: 7 },
      { x: 7, y: 8 },
    ]);
  });

  it("sorts items by depth, rear footprint point, layer, y offset, and id", () => {
    const sorted = sortIsometricItemsForRender([
      {
        id: "rear-large",
        x: 1,
        y: 2,
        footprintWidth: 2,
        footprintHeight: 1,
        rotation: 0,
        renderLayer: 0,
        yOffset: 0,
      },
      {
        id: "layer-high-a",
        x: 1,
        y: 2,
        footprintWidth: 1,
        footprintHeight: 1,
        rotation: 0,
        renderLayer: 1,
        yOffset: 10,
      },
      {
        id: "depth-first",
        x: 0,
        y: 1,
        footprintWidth: 1,
        footprintHeight: 1,
        rotation: 0,
        renderLayer: 0,
        yOffset: 0,
      },
      {
        id: "base",
        x: 1,
        y: 2,
        footprintWidth: 1,
        footprintHeight: 1,
        rotation: 0,
        renderLayer: 0,
        yOffset: 0,
      },
      {
        id: "layer-high-b",
        x: 1,
        y: 2,
        footprintWidth: 1,
        footprintHeight: 1,
        rotation: 0,
        renderLayer: 1,
        yOffset: 10,
      },
      {
        id: "layer-mid",
        x: 1,
        y: 2,
        footprintWidth: 1,
        footprintHeight: 1,
        rotation: 0,
        renderLayer: 1,
        yOffset: 0,
      },
    ]);

    expect(sorted.map((item) => item.id)).toEqual([
      "depth-first",
      "base",
      "layer-mid",
      "layer-high-a",
      "layer-high-b",
      "rear-large",
    ]);
  });
});
