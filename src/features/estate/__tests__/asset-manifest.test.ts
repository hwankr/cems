import { describe, expect, it } from "vitest";
import {
  estateAssetManifest,
  requiredEstateGroundAssetIds,
  requiredEstateSpriteAssetIds,
} from "../data/estate-asset-manifest";
import {
  baseEstateItemDefinitions,
  estateItemCatalog,
} from "../data/estate-item-catalog";

describe("estate asset manifest", () => {
  it("contains the required original sprite assets with bottom-center anchors", () => {
    expect(Object.keys(estateAssetManifest.items)).toEqual(
      expect.arrayContaining(requiredEstateSpriteAssetIds),
    );

    for (const assetId of requiredEstateSpriteAssetIds) {
      const asset = estateAssetManifest.items[assetId];
      expect(asset).toBeDefined();
      expect(asset.src).toMatch(/^\/estate-assets\/.+\.svg$/);
      expect(asset.logicalWidth).toBeGreaterThan(0);
      expect(asset.logicalHeight).toBeGreaterThan(0);
      expect(asset.anchorX).toBe(asset.logicalWidth / 2);
      expect(asset.anchorY).toBeGreaterThan(asset.logicalHeight * 0.72);
    }
  });

  it("contains textured ground assets for all required tile kinds", () => {
    expect(Object.keys(estateAssetManifest.ground)).toEqual(
      expect.arrayContaining(requiredEstateGroundAssetIds),
    );

    for (const assetId of requiredEstateGroundAssetIds) {
      expect(estateAssetManifest.ground[assetId]).toMatchObject({
        id: assetId,
        src: expect.stringMatching(/^\/estate-assets\/tiles\/.+\.svg$/),
      });
    }
  });

  it("defines render assets for every catalog item", () => {
    const renderableAssetIds = new Set([
      ...Object.keys(estateAssetManifest.items),
      ...Object.keys(estateAssetManifest.ground),
    ]);
    const definitions = [...baseEstateItemDefinitions, ...estateItemCatalog];

    for (const definition of definitions) {
      expect(renderableAssetIds.has(definition.assetId)).toBe(true);
    }
  });
});
