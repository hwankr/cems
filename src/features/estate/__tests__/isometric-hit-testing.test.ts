import { describe, expect, it } from "vitest";
import {
  getCellCenterScreen,
  gridToScreen,
  screenToGrid,
} from "../isometric/projection";
import {
  getPointerCanvasPosition,
  hitTestDiamondCellAtWorldPoint,
  isPointInsideDiamondCell,
} from "../isometric/hit-testing";

describe("isometric projection and hit testing", () => {
  it("round-trips grid and world screen coordinates including negative cells", () => {
    for (const cell of [
      { x: 0, y: 0 },
      { x: 5, y: -3 },
      { x: -4, y: 7 },
    ]) {
      const screen = gridToScreen(cell);
      const roundTrip = screenToGrid(screen);

      expect(roundTrip.x).toBeCloseTo(cell.x, 6);
      expect(roundTrip.y).toBeCloseTo(cell.y, 6);
    }
  });

  it("requires the pointer to be inside the rendered diamond for a cell hit", () => {
    const cell = { x: 2, y: -1 };
    const center = getCellCenterScreen(cell);
    const topVertex = gridToScreen(cell);

    expect(isPointInsideDiamondCell(center, cell)).toBe(true);
    expect(
      isPointInsideDiamondCell({ x: topVertex.x - 60, y: topVertex.y + 2 }, cell),
    ).toBe(false);
  });

  it("resolves the final cell from diamond candidates instead of a floor-only inverse", () => {
    const target = { x: -2, y: 3 };
    const center = getCellCenterScreen(target);
    const hit = hitTestDiamondCellAtWorldPoint(center);

    expect(hit).toEqual(target);
  });

  it("returns null when the hit cell is not in the allowed cell set", () => {
    const center = getCellCenterScreen({ x: 8, y: 0 });

    expect(
      hitTestDiamondCellAtWorldPoint(center, {
        allowedCells: [{ x: 0, y: 0 }],
      }),
    ).toBeNull();
  });

  it("maps client pointer coordinates through the element rect and device pixel ratio", () => {
    const position = getPointerCanvasPosition(
      { clientX: 160, clientY: 120 },
      { left: 10, top: 20, width: 300, height: 200 },
      2,
    );

    expect(position).toEqual({
      css: { x: 150, y: 100 },
      backingStore: { x: 300, y: 200 },
    });
  });
});
