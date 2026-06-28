import { describe, expect, it } from "vitest";
import {
  baseEstateItemDefinitions,
  estateItemCatalog,
} from "../data/estate-item-catalog";
import { estateExpansionCatalog } from "../data/estate-expansion-catalog";
import { createInitialEstateSnapshot } from "../domain/commands";
import type { EstateSnapshot } from "../domain/types";
import { getSelectedItemActionAnchor } from "../isometric/action-anchor";
import { createEstateRenderScene } from "../isometric/renderer";

describe("selected estate item action anchor", () => {
  const snapshot: EstateSnapshot = {
    ...createInitialEstateSnapshot("yu-e21", {
      now: () => "2026-06-28T00:00:00.000Z",
    }),
    items: [
      {
        id: "bench-1",
        definitionId: "bench",
        x: 2,
        y: 3,
        rotation: 0,
        placedAt: "2026-06-28T00:00:00.000Z",
      },
    ],
  };
  const scene = createEstateRenderScene({
    snapshot,
    itemDefinitions: [...baseEstateItemDefinitions, ...estateItemCatalog],
    parcelDefinitions: estateExpansionCatalog,
  });

  it("returns a viewport-relative anchor for the selected item", () => {
    const anchor = getSelectedItemActionAnchor(scene, {
      itemId: "bench-1",
      camera: { x: 0, y: 0, zoom: 1 },
      viewport: { width: 720, height: 360 },
    });

    expect(anchor).toEqual({
      x: 328,
      y: 340,
      viewportWidth: 720,
      viewportHeight: 360,
    });
  });

  it("returns null when the selected item is no longer in the scene", () => {
    expect(
      getSelectedItemActionAnchor(scene, {
        itemId: "missing-item",
        camera: { x: 0, y: 0, zoom: 1 },
        viewport: { width: 720, height: 360 },
      }),
    ).toBeNull();
  });

  it("returns null when no selected item id is provided", () => {
    expect(
      getSelectedItemActionAnchor(scene, {
        itemId: null,
        camera: { x: 0, y: 0, zoom: 1 },
        viewport: { width: 720, height: 360 },
      }),
    ).toBeNull();
    expect(
      getSelectedItemActionAnchor(scene, {
        camera: { x: 0, y: 0, zoom: 1 },
        viewport: { width: 720, height: 360 },
      }),
    ).toBeNull();
  });
});
