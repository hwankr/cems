import { MAIN_BUILDING_LEVEL_ASSET_IDS } from "../domain/main-building";

export type EstateAssetShadowDefinition = {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
};

export type EstateProceduralAssetDefinition =
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

export type EstateSpriteAssetDefinition = {
  id: string;
  src: string;
  logicalWidth: number;
  logicalHeight: number;
  anchorX: number;
  anchorY: number;
  renderLayer?: number;
  yOffset?: number;
  shadow?: EstateAssetShadowDefinition;
  fallback: EstateProceduralAssetDefinition;
};

export type EstateGroundAssetDefinition = {
  id: string;
  src: string;
  fill: string;
  stroke: string;
  insetFill?: string;
  textureOpacity?: number;
};

export type EstateAssetManifest = {
  ground: Record<string, EstateGroundAssetDefinition>;
  items: Record<string, EstateSpriteAssetDefinition>;
};

export const requiredEstateSpriteAssetIds = [
  ...MAIN_BUILDING_LEVEL_ASSET_IDS,
  "generic-campus-building",
  "it-technology-building",
  "broadleaf-tree",
  "pine-tree",
  "flower-bed",
  "bench",
  "solar-street-light",
  "campus-flag",
  "award-emblem-gold",
  "award-emblem-silver",
  "award-emblem-bronze",
  "fountain",
  "greenhouse",
  "solar-pavilion",
  "recycling-station",
  "small-sculpture",
  "decorative-shrub",
  "locked-parcel-icon",
  "placement-valid-marker",
  "placement-invalid-marker",
] as const;

export const requiredEstateGroundAssetIds = [
  "grass",
  "stone-path",
  "light-pavement",
  "flower-soil-tile",
] as const;

const buildingShadow = {
  offsetX: 12,
  offsetY: 12,
  scaleX: 0.72,
  scaleY: 0.18,
  opacity: 0.24,
} satisfies EstateAssetShadowDefinition;

const smallShadow = {
  offsetX: 7,
  offsetY: 8,
  scaleX: 0.56,
  scaleY: 0.16,
  opacity: 0.22,
} satisfies EstateAssetShadowDefinition;

export const estateAssetManifest = {
  ground: {
    grass: ground("grass", "/estate-assets/tiles/grass.png", {
      fill: "#7fb466",
      stroke: "#5b8c4b",
      insetFill: "#9bd27b",
      textureOpacity: 1,
    }),
    "grass-decoration": ground(
      "grass-decoration",
      "/estate-assets/tiles/grass.png",
      {
        fill: "#8fc46a",
        stroke: "#6aa24e",
        insetFill: "#a6da7f",
        textureOpacity: 1,
      },
    ),
    "stone-path": ground("stone-path", "/estate-assets/tiles/stone-path.png", {
      fill: "#8d9486",
      stroke: "#6f766a",
      insetFill: "#aeb6a4",
      textureOpacity: 1,
    }),
    "light-pavement": ground(
      "light-pavement",
      "/estate-assets/tiles/light-pavement.png",
      {
        fill: "#d8d8bf",
        stroke: "#a8aa8c",
        insetFill: "#ecebd4",
        textureOpacity: 1,
      },
    ),
    "bright-sidewalk-block": ground(
      "bright-sidewalk-block",
      "/estate-assets/tiles/light-pavement.png",
      {
        fill: "#d8d8bf",
        stroke: "#a8aa8c",
        insetFill: "#ecebd4",
        textureOpacity: 1,
      },
    ),
    "flower-soil-tile": ground(
      "flower-soil-tile",
      "/estate-assets/tiles/flower-soil.png",
      {
        fill: "#8b6a4e",
        stroke: "#614934",
        insetFill: "#b6875c",
        textureOpacity: 1,
      },
    ),
  },
  items: {
    "campus-building-lv1": sprite(
      "campus-building-lv1",
      "/estate-assets/campus-building-lv1.png",
      360,
      341,
      {
        renderLayer: 2,
        fallback: {
          kind: "building",
          height: 70,
          renderLayer: 2,
          top: "#f4e7cd",
          left: "#dcc08a",
          right: "#c39a5e",
          stroke: "#8a6a3c",
          shadow: "#5e4427",
        },
      },
    ),
    "campus-building-lv2": sprite(
      "campus-building-lv2",
      "/estate-assets/campus-building-lv2.png",
      375,
      438,
      {
        renderLayer: 2,
        fallback: {
          kind: "building",
          height: 88,
          renderLayer: 2,
          top: "#f4e7cd",
          left: "#dcc08a",
          right: "#c39a5e",
          stroke: "#8a6a3c",
          shadow: "#5e4427",
        },
      },
    ),
    "campus-building-lv3": sprite(
      "campus-building-lv3",
      "/estate-assets/campus-building-lv3.png",
      387,
      613,
      {
        renderLayer: 2,
        fallback: {
          kind: "building",
          height: 108,
          renderLayer: 2,
          top: "#f4e7cd",
          left: "#dcc08a",
          right: "#c39a5e",
          stroke: "#8a6a3c",
          shadow: "#5e4427",
        },
      },
    ),
    "campus-building-lv4": sprite(
      "campus-building-lv4",
      "/estate-assets/campus-building-lv4.png",
      420,
      659,
      {
        renderLayer: 2,
        fallback: {
          kind: "building",
          height: 128,
          renderLayer: 2,
          top: "#f4e7cd",
          left: "#dcc08a",
          right: "#c39a5e",
          stroke: "#8a6a3c",
          shadow: "#5e4427",
        },
      },
    ),
    "campus-building-lv5": sprite(
      "campus-building-lv5",
      "/estate-assets/campus-building-lv5.png",
      463,
      766,
      {
        renderLayer: 2,
        fallback: {
          kind: "building",
          height: 150,
          renderLayer: 2,
          top: "#f6ecd6",
          left: "#e0c694",
          right: "#caa066",
          stroke: "#8a6a3c",
          shadow: "#5e4427",
        },
      },
    ),
    "base-campus-building": sprite(
      "base-campus-building",
      "/estate-assets/generic-campus-building.svg",
      256,
      232,
      {
        renderLayer: 2,
        shadow: buildingShadow,
        fallback: {
          kind: "building",
          height: 92,
          renderLayer: 2,
          top: "#d8edf2",
          left: "#9ac2cc",
          right: "#6b98a5",
          stroke: "#3e6170",
          shadow: "#22313f",
        },
      },
    ),
    "generic-campus-building": sprite(
      "generic-campus-building",
      "/estate-assets/generic-campus-building.svg",
      256,
      232,
      {
        renderLayer: 2,
        shadow: buildingShadow,
        fallback: {
          kind: "building",
          height: 92,
          renderLayer: 2,
          top: "#d8edf2",
          left: "#9ac2cc",
          right: "#6b98a5",
          stroke: "#3e6170",
          shadow: "#22313f",
        },
      },
    ),
    "it-technology-building": sprite(
      "it-technology-building",
      "/estate-assets/it-technology-building.png",
      256,
      232,
      {
        renderLayer: 2,
        shadow: buildingShadow,
        fallback: {
          kind: "building",
          height: 96,
          renderLayer: 2,
          top: "#dbeafe",
          left: "#73b6d4",
          right: "#4384a7",
          stroke: "#27536b",
          shadow: "#132b3a",
        },
      },
    ),
    "broadleaf-tree": sprite(
      "broadleaf-tree",
      "/estate-assets/broadleaf-tree.png",
      128,
      154,
      {
        renderLayer: 1,
        shadow: smallShadow,
        fallback: {
          kind: "tree",
          height: 72,
          renderLayer: 1,
          canopy: "#4f9f55",
          canopyDark: "#2e743b",
          trunk: "#6d4c35",
          shadow: "#162116",
        },
      },
    ),
    "pine-tree": sprite("pine-tree", "/estate-assets/pine-tree.png", 128, 166, {
      renderLayer: 1,
      shadow: smallShadow,
      fallback: {
        kind: "tree",
        height: 82,
        renderLayer: 1,
        canopy: "#2f7f5f",
        canopyDark: "#1f5d48",
        trunk: "#61452f",
        shadow: "#13211b",
      },
    }),
    "flower-bed": sprite("flower-bed", "/estate-assets/flower-bed.png", 168, 92, {
      renderLayer: 0,
      shadow: smallShadow,
      fallback: {
        kind: "decor",
        height: 24,
        renderLayer: 0,
        fill: "#d76c95",
        accent: "#8f315c",
        shadow: "#231823",
      },
    }),
    bench: sprite("bench", "/estate-assets/bench.png", 156, 104, {
      renderLayer: 1,
      shadow: smallShadow,
      fallback: {
        kind: "decor",
        height: 22,
        renderLayer: 1,
        fill: "#aa7a45",
        accent: "#614326",
        shadow: "#21160f",
      },
    }),
    "solar-street-light": sprite(
      "solar-street-light",
      "/estate-assets/solar-street-light.png",
      112,
      176,
      {
        renderLayer: 2,
        shadow: smallShadow,
        fallback: {
          kind: "decor",
          height: 64,
          renderLayer: 2,
          fill: "#f5d75f",
          accent: "#6d7280",
          shadow: "#1d2430",
        },
      },
    ),
    "campus-flag": sprite(
      "campus-flag",
      "/estate-assets/campus-flag.png",
      124,
      172,
      {
        renderLayer: 2,
        shadow: smallShadow,
        fallback: {
          kind: "decor",
          height: 68,
          renderLayer: 2,
          fill: "#5aa1d6",
          accent: "#1f4c73",
          shadow: "#142234",
        },
      },
    ),
    "award-emblem-gold": sprite(
      "award-emblem-gold",
      "/estate-assets/award-emblem-gold.png",
      124,
      172,
      {
        renderLayer: 2,
        shadow: smallShadow,
        fallback: {
          kind: "decor",
          height: 70,
          renderLayer: 2,
          fill: "#f5c518",
          accent: "#a07a00",
          shadow: "#3a2c00",
        },
      },
    ),
    "award-emblem-silver": sprite(
      "award-emblem-silver",
      "/estate-assets/award-emblem-silver.png",
      124,
      172,
      {
        renderLayer: 2,
        shadow: smallShadow,
        fallback: {
          kind: "decor",
          height: 70,
          renderLayer: 2,
          fill: "#c3cad3",
          accent: "#5b6470",
          shadow: "#2b3138",
        },
      },
    ),
    "award-emblem-bronze": sprite(
      "award-emblem-bronze",
      "/estate-assets/award-emblem-bronze.png",
      124,
      172,
      {
        renderLayer: 2,
        shadow: smallShadow,
        fallback: {
          kind: "decor",
          height: 70,
          renderLayer: 2,
          fill: "#cd7f32",
          accent: "#8a5320",
          shadow: "#3a2410",
        },
      },
    ),
    fountain: sprite("fountain", "/estate-assets/fountain.png", 176, 132, {
      renderLayer: 1,
      shadow: {
        ...smallShadow,
        scaleX: 0.72,
      },
      fallback: {
        kind: "decor",
        height: 36,
        renderLayer: 1,
        fill: "#92d0df",
        accent: "#3b8294",
        shadow: "#14303a",
      },
    }),
    greenhouse: sprite("greenhouse", "/estate-assets/greenhouse.png", 210, 174, {
      renderLayer: 2,
      shadow: buildingShadow,
      fallback: {
        kind: "building",
        height: 54,
        renderLayer: 2,
        top: "#d7f3df",
        left: "#92c7a3",
        right: "#6ba17f",
        stroke: "#3a6a51",
        shadow: "#173222",
      },
    }),
    "small-greenhouse": sprite(
      "small-greenhouse",
      "/estate-assets/greenhouse.png",
      210,
      174,
      {
        renderLayer: 2,
        shadow: buildingShadow,
        fallback: {
          kind: "building",
          height: 54,
          renderLayer: 2,
          top: "#d7f3df",
          left: "#92c7a3",
          right: "#6ba17f",
          stroke: "#3a6a51",
          shadow: "#173222",
        },
      },
    ),
    "solar-pavilion": sprite(
      "solar-pavilion",
      "/estate-assets/solar-pavilion.png",
      242,
      174,
      {
        renderLayer: 2,
        shadow: buildingShadow,
        fallback: {
          kind: "building",
          height: 62,
          renderLayer: 2,
          top: "#2f5f76",
          left: "#4b8292",
          right: "#284d62",
          stroke: "#173448",
          shadow: "#101f2a",
        },
      },
    ),
    "recycling-station": sprite(
      "recycling-station",
      "/estate-assets/recycling-station.png",
      168,
      118,
      {
        renderLayer: 1,
        shadow: smallShadow,
        fallback: {
          kind: "decor",
          height: 34,
          renderLayer: 1,
          fill: "#58a86a",
          accent: "#2d6b3c",
          shadow: "#162416",
        },
      },
    ),
    "small-sculpture": sprite(
      "small-sculpture",
      "/estate-assets/small-sculpture.png",
      122,
      134,
      {
        renderLayer: 2,
        shadow: smallShadow,
        fallback: {
          kind: "decor",
          height: 42,
          renderLayer: 2,
          fill: "#c9c3b4",
          accent: "#81796d",
          shadow: "#20201d",
        },
      },
    ),
    "decorative-shrub": sprite(
      "decorative-shrub",
      "/estate-assets/decorative-shrub.png",
      124,
      96,
      {
        renderLayer: 0,
        shadow: smallShadow,
        fallback: {
          kind: "decor",
          height: 24,
          renderLayer: 0,
          fill: "#6bae56",
          accent: "#387c3f",
          shadow: "#122113",
        },
      },
    ),
    "locked-parcel-icon": sprite(
      "locked-parcel-icon",
      "/estate-assets/locked-parcel-icon.svg",
      96,
      112,
      {
        renderLayer: 3,
        fallback: {
          kind: "decor",
          height: 30,
          renderLayer: 3,
          fill: "#364154",
          accent: "#f8fafc",
          shadow: "#111827",
        },
      },
    ),
    "placement-valid-marker": sprite(
      "placement-valid-marker",
      "/estate-assets/placement-valid-marker.svg",
      116,
      82,
      {
        renderLayer: 4,
        fallback: {
          kind: "decor",
          height: 12,
          renderLayer: 4,
          fill: "#6ee7b7",
          accent: "#059669",
          shadow: "#064e3b",
        },
      },
    ),
    "placement-invalid-marker": sprite(
      "placement-invalid-marker",
      "/estate-assets/placement-invalid-marker.svg",
      116,
      82,
      {
        renderLayer: 4,
        fallback: {
          kind: "decor",
          height: 12,
          renderLayer: 4,
          fill: "#fca5a5",
          accent: "#dc2626",
          shadow: "#7f1d1d",
        },
      },
    ),
  },
} satisfies EstateAssetManifest;

function ground(
  id: string,
  src: string,
  values: Omit<EstateGroundAssetDefinition, "id" | "src">,
): EstateGroundAssetDefinition {
  return { id, src, ...values };
}

function sprite(
  id: string,
  src: string,
  logicalWidth: number,
  logicalHeight: number,
  values: Omit<
    EstateSpriteAssetDefinition,
    "anchorX" | "anchorY" | "id" | "logicalHeight" | "logicalWidth" | "src"
  >,
): EstateSpriteAssetDefinition {
  return {
    id,
    src,
    logicalWidth,
    logicalHeight,
    anchorX: logicalWidth / 2,
    anchorY: logicalHeight,
    ...values,
  };
}
