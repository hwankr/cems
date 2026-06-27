import { describe, expect, it } from "vitest";
import { estateExpansionCatalog } from "../data/estate-expansion-catalog";
import {
  baseEstateItemDefinitions,
  estateItemCatalog,
} from "../data/estate-item-catalog";
import { createDemoEstateSeedSnapshot } from "../data/demo-estate-data";
import {
  createEstateRenderScene,
  getSceneCellList,
  getSceneUnlockedWorldBounds,
} from "../isometric/renderer";

describe("estate isometric render scene", () => {
  const itemDefinitions = [...baseEstateItemDefinitions, ...estateItemCatalog];

  it("serializes the estate snapshot into parcels, ground tiles, and render items", () => {
    const snapshot = createDemoEstateSeedSnapshot("yu-e21");
    const scene = createEstateRenderScene({
      snapshot,
      itemDefinitions,
      parcelDefinitions: estateExpansionCatalog,
      selectedItemId: "yu-e21:landmark",
    });

    expect(scene.parcels).toHaveLength(estateExpansionCatalog.length);
    expect(scene.parcels.find((parcel) => parcel.id === "central-campus"))
      .toMatchObject({ unlocked: true, cells: expect.any(Array) });
    expect(scene.parcels.find((parcel) => parcel.id === "east"))
      .toMatchObject({ unlocked: false, cost: 4_000 });
    expect(scene.groundTiles).toEqual([]);
    expect(scene.items.find((item) => item.id === "yu-e21:landmark"))
      .toMatchObject({
        assetId: "campus-building-lv1",
        footprintWidth: 2,
        footprintHeight: 2,
      });
    expect(scene.selectedItemId).toBe("yu-e21:landmark");
  });

  it("marks the parcel under the hovered cell and recently unlocked parcel", () => {
    const snapshot = createDemoEstateSeedSnapshot("yu-e21");
    const scene = createEstateRenderScene({
      snapshot,
      itemDefinitions,
      parcelDefinitions: estateExpansionCatalog,
      hoverCell: { x: 16, y: 0 },
      recentlyUnlockedParcelId: "east",
      animationProgress: 0.4,
    });

    expect(scene.hoverParcelId).toBe("east");
    expect(scene.recentlyUnlockedParcelId).toBe("east");
    expect(scene.animationProgress).toBe(0.4);
  });

  it("exposes cell lists and unlocked bounds for hit testing and viewport fit", () => {
    const snapshot = createDemoEstateSeedSnapshot("yu-e21");
    const scene = createEstateRenderScene({
      snapshot,
      itemDefinitions,
      parcelDefinitions: estateExpansionCatalog,
    });
    const cells = getSceneCellList(scene);
    const bounds = getSceneUnlockedWorldBounds(scene);

    expect(cells).toContainEqual({ x: 0, y: 0 });
    expect(cells).toContainEqual({ x: 8, y: 0 });
    expect(bounds.minX).toBeLessThan(bounds.maxX);
    expect(bounds.minY).toBeLessThan(bounds.maxY);
  });

  it("renders the main building with its level sprite and exposes the level", () => {
    const level1 = createEstateRenderScene({
      snapshot: createDemoEstateSeedSnapshot("yu-e21"),
      itemDefinitions,
      parcelDefinitions: estateExpansionCatalog,
    });
    expect(level1.mainBuildingLevel).toBe(1);
    expect(
      level1.items.find((item) => item.id === "yu-e21:landmark")?.assetId,
    ).toBe("campus-building-lv1");

    const level3 = createEstateRenderScene({
      snapshot: { ...createDemoEstateSeedSnapshot("yu-e21"), mainBuildingLevel: 3 },
      itemDefinitions,
      parcelDefinitions: estateExpansionCatalog,
    });
    expect(level3.mainBuildingLevel).toBe(3);
    expect(
      level3.items.find((item) => item.id === "yu-e21:landmark")?.assetId,
    ).toBe("campus-building-lv3");
  });
});
