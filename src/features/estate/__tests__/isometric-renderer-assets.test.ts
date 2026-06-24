import { describe, expect, it } from "vitest";
import { estateAssetManifest } from "../data/estate-asset-manifest";
import { getAnchoredSpriteDrawBox } from "../isometric/renderer";

describe("estate isometric renderer asset placement", () => {
  it("places sprite images by their bottom-center anchor", () => {
    const asset = estateAssetManifest.items["generic-campus-building"];
    const box = getAnchoredSpriteDrawBox({ x: 320, y: 240 }, asset, 0.5);

    expect(box).toEqual({
      x: 320 - asset.anchorX * 0.5,
      y: 240 - asset.anchorY * 0.5,
      width: asset.logicalWidth * 0.5,
      height: asset.logicalHeight * 0.5,
    });
  });
});
