import type {
  FillExtrusionLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
} from "mapbox-gl";

export const ENERGY_SUBJECT_POLYGON_HIT_PAINT: FillLayerSpecification["paint"] =
  {
    "fill-color": "#ffffff",
    "fill-opacity": 0,
  };

export const ENERGY_SUBJECT_EXTRUSION_PAINT: FillExtrusionLayerSpecification["paint"] =
  {
    "fill-extrusion-color": [
      "match",
      ["get", "status"],
      "saving",
      "#34d399",
      "overuse",
      "#fb7185",
      "#64748b",
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

export const ENERGY_SUBJECT_OUTLINE_PAINT: LineLayerSpecification["paint"] = {
  "line-color": [
    "match",
    ["get", "status"],
    "saving",
    "#10b981",
    "overuse",
    "#e11d48",
    "#475569",
  ],
  "line-opacity": ["case", ["get", "selected"], 0.95, 0.5],
  "line-width": ["case", ["get", "selected"], 3, 1.2],
};
