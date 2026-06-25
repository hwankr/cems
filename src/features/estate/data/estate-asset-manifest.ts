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
  "generic-campus-building",
  "it-technology-building",
  "broadleaf-tree",
  "pine-tree",
  "flower-bed",
  "bench",
  "solar-street-light",
  "campus-flag",
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
    grass: ground("grass", "/estate-assets/tiles/grass.svg", {
      fill: "#7fb466",
      stroke: "#5b8c4b",
      insetFill: "#9bd27b",
      textureOpacity: 0.58,
    }),
    "grass-decoration": ground(
      "grass-decoration",
      "/estate-assets/tiles/grass.svg",
      {
        fill: "#8fc46a",
        stroke: "#6aa24e",
        insetFill: "#a6da7f",
        textureOpacity: 0.5,
      },
    ),
    "stone-path": ground("stone-path", "/estate-assets/tiles/stone-path.svg", {
      fill: "#8d9486",
      stroke: "#6f766a",
      insetFill: "#aeb6a4",
      textureOpacity: 0.72,
    }),
    "light-pavement": ground(
      "light-pavement",
      "/estate-assets/tiles/light-pavement.svg",
      {
        fill: "#d8d8bf",
        stroke: "#a8aa8c",
        insetFill: "#ecebd4",
        textureOpacity: 0.62,
      },
    ),
    "bright-sidewalk-block": ground(
      "bright-sidewalk-block",
      "/estate-assets/tiles/light-pavement.svg",
      {
        fill: "#d8d8bf",
        stroke: "#a8aa8c",
        insetFill: "#ecebd4",
        textureOpacity: 0.62,
      },
    ),
    "flower-soil-tile": ground(
      "flower-soil-tile",
      "/estate-assets/tiles/flower-soil.svg",
      {
        fill: "#8b6a4e",
        stroke: "#614934",
        insetFill: "#b6875c",
        textureOpacity: 0.68,
      },
    ),
  },
  items: {
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
      "/estate-assets/it-technology-building.svg",
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
      "/estate-assets/broadleaf-tree.svg",
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
    "pine-tree": sprite("pine-tree", "/estate-assets/pine-tree.svg", 128, 166, {
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
    "flower-bed": sprite("flower-bed", "/estate-assets/flower-bed.svg", 168, 92, {
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
    bench: sprite("bench", "/estate-assets/bench.svg", 156, 104, {
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
      "/estate-assets/solar-street-light.svg",
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
      "/estate-assets/campus-flag.svg",
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
    fountain: sprite("fountain", "/estate-assets/fountain.svg", 176, 132, {
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
    greenhouse: sprite("greenhouse", "/estate-assets/greenhouse.svg", 210, 174, {
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
      "/estate-assets/greenhouse.svg",
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
      "/estate-assets/solar-pavilion.svg",
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
      "/estate-assets/recycling-station.svg",
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
      "/estate-assets/small-sculpture.svg",
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
      "/estate-assets/decorative-shrub.svg",
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
