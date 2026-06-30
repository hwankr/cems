import { describe, expect, it } from "vitest";
import {
  getHarvestBubbleScreenAnchor,
  isPointOnHarvestBubble,
} from "../isometric/harvest-bubble";

describe("harvest bubble", () => {
  const item = {
    id: "g1",
    x: 0,
    y: 0,
    rotation: 0 as const,
    footprintWidth: 2,
    footprintHeight: 2,
  };

  it("anchors the bubble above the footprint top center", () => {
    const anchor = getHarvestBubbleScreenAnchor(
      item,
      { tileWidth: 128, tileHeight: 64 },
      { x: 0, y: 0, zoom: 1 },
      { width: 400, height: 300 },
    );
    // Footprint top corner (0,0) projects to world (0,0); canvas center offset
    // applies, then the bubble lifts upward (smaller y).
    expect(anchor.x).toBeCloseTo(200); // viewport center x
    expect(anchor.y).toBeLessThan(150);
    // center y=150 lifted by 54*zoom (zoom 1) => 96; pins the lift constant.
    expect(anchor.y).toBeCloseTo(96, 0);
  });

  it("hits within the bubble radius and misses outside", () => {
    const anchor = { x: 200, y: 100 };
    expect(isPointOnHarvestBubble({ x: 205, y: 104 }, anchor)).toBe(true);
    expect(isPointOnHarvestBubble({ x: 260, y: 160 }, anchor)).toBe(false);
  });
});
