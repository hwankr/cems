import type {
  FillExtrusionLayerSpecification,
  FillLayerSpecification,
  HeatmapLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from "mapbox-gl";
import { TIER_PALETTE } from "@/features/leagues/domain/award-tier";

export const ENERGY_SUBJECT_POLYGON_HIT_PAINT: FillLayerSpecification["paint"] =
  {
    "fill-color": "#ffffff",
    "fill-opacity": 0,
  };

export const ENERGY_SUBJECT_EXTRUSION_PAINT: FillExtrusionLayerSpecification["paint"] =
  {
    "fill-extrusion-color": [
      "match",
      ["coalesce", ["get", "awardTier"], ""],
      "gold",
      TIER_PALETTE.gold.fill,
      "silver",
      TIER_PALETTE.silver.fill,
      "bronze",
      TIER_PALETTE.bronze.fill,
      [
        "match",
        ["get", "status"],
        "saving",
        "#10b981",
        "overuse",
        "#f43f5e",
        "#64748b",
      ],
    ],
    "fill-extrusion-height": [
      "+",
      3,
      ["coalesce", ["to-number", ["get", "displayHeightMeters"]], 0],
    ],
    "fill-extrusion-base": 0,
    "fill-extrusion-opacity": 0.86,
    "fill-extrusion-vertical-gradient": true,
    "fill-extrusion-ambient-occlusion-intensity": 0.4,
    "fill-extrusion-cast-shadows": false,
  };

// Soft, harmonious fills that stay distinct on the light Standard basemap.
// Opaque so the beige Standard buildings underneath don't bleed through.
export const ENERGY_SUBJECT_EXTRUSION_PAINT_LIGHT: FillExtrusionLayerSpecification["paint"] =
  {
    "fill-extrusion-color": [
      "match",
      ["coalesce", ["get", "awardTier"], ""],
      "gold",
      TIER_PALETTE.gold.fill,
      "silver",
      TIER_PALETTE.silver.fill,
      "bronze",
      TIER_PALETTE.bronze.fill,
      [
        "match",
        ["get", "status"],
        "saving",
        "#10b981",
        "overuse",
        "#f43f5e",
        "#a8b3c4",
      ],
    ],
    "fill-extrusion-height": [
      "+",
      3,
      ["coalesce", ["to-number", ["get", "displayHeightMeters"]], 0],
    ],
    "fill-extrusion-base": 0,
    "fill-extrusion-opacity": 1,
    "fill-extrusion-vertical-gradient": true,
    "fill-extrusion-ambient-occlusion-intensity": 0.1,
    "fill-extrusion-cast-shadows": false,
  };

export const ENERGY_SUBJECT_OUTLINE_PAINT: LineLayerSpecification["paint"] = {
  "line-color": [
    "match",
    ["coalesce", ["get", "awardTier"], ""],
    "gold",
    TIER_PALETTE.gold.outline,
    "silver",
    TIER_PALETTE.silver.outline,
    "bronze",
    TIER_PALETTE.bronze.outline,
    [
      "match",
      ["get", "status"],
      "saving",
      "#10b981",
      "overuse",
      "#e11d48",
      "#475569",
    ],
  ],
  "line-opacity": ["case", ["get", "selected"], 0.95, 0.6],
  "line-width": [
    "case",
    ["has", "awardTier"],
    ["case", ["get", "selected"], 4, 2.6],
    ["case", ["get", "selected"], 3, 1.2],
  ],
};

// Light text + dark halo reads on the dark basemap; flipped for the light one.
export const ENERGY_SUBJECT_LABEL_PAINT_DARK: SymbolLayerSpecification["paint"] =
  {
    "text-color": [
      "match",
      ["coalesce", ["get", "awardTier"], ""],
      "gold",
      TIER_PALETTE.gold.fill,
      "silver",
      "#e2e8f0",
      "bronze",
      "#e9b386",
      "#f8fafc",
    ],
    "text-halo-color": "rgba(2, 6, 23, 0.85)",
    "text-halo-width": ["case", ["has", "awardTier"], 1.8, 1.4],
    "text-halo-blur": 0.4,
  };

export const ENERGY_SUBJECT_LABEL_PAINT_LIGHT: SymbolLayerSpecification["paint"] =
  {
    "text-color": [
      "match",
      ["coalesce", ["get", "awardTier"], ""],
      "gold",
      TIER_PALETTE.gold.text,
      "silver",
      TIER_PALETTE.silver.text,
      "bronze",
      TIER_PALETTE.bronze.text,
      "#1e293b",
    ],
    "text-halo-color": "rgba(255, 255, 255, 0.9)",
    "text-halo-width": ["case", ["has", "awardTier"], 1.8, 1.4],
    "text-halo-blur": 0.4,
  };

// Usage heatmap over building centroids, weighted by the `weight` property
// (actual usage normalized 0..1). Green (low) → amber → rose (high).
export const ENERGY_HEAT_PAINT: HeatmapLayerSpecification["paint"] = {
  "heatmap-weight": ["coalesce", ["to-number", ["get", "weight"]], 0],
  "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 14, 0.7, 18, 1.4],
  "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 14, 16, 17, 48],
  "heatmap-opacity": 0.5,
  "heatmap-color": [
    "interpolate",
    ["linear"],
    ["heatmap-density"],
    0,
    "rgba(16, 185, 129, 0)",
    0.3,
    "rgba(16, 185, 129, 0.45)",
    0.55,
    "rgba(251, 191, 36, 0.6)",
    0.8,
    "rgba(244, 63, 94, 0.75)",
    1,
    "rgba(244, 63, 94, 0.92)",
  ],
};
