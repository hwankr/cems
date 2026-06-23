import type {
  CircleLayerSpecification,
  FillExtrusionLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
} from "mapbox-gl";

export const ENERGY_SUBJECT_POLYGON_HIT_PAINT: FillLayerSpecification["paint"] =
  {
    "fill-color": "#ffffff",
    "fill-opacity": 0,
  };

export const ENERGY_SUBJECT_POINT_HIT_PAINT: CircleLayerSpecification["paint"] =
  {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      14,
      10,
      17,
      24,
    ],
    "circle-opacity": 0,
    "circle-stroke-opacity": 0,
  };

export const ENERGY_SUBJECT_EXTRUSION_PAINT: FillExtrusionLayerSpecification["paint"] =
  {
    "fill-extrusion-color": [
      "match",
      ["get", "status"],
      "saving",
      "#10b981",
      "overuse",
      "#f43f5e",
      "#94a3b8",
    ],
    "fill-extrusion-height": ["get", "displayHeightMeters"],
    "fill-extrusion-base": 0,
    "fill-extrusion-opacity": 0.72,
    "fill-extrusion-vertical-gradient": true,
    "fill-extrusion-ambient-occlusion-intensity": 0.25,
    "fill-extrusion-cast-shadows": false,
  };

export const ENERGY_SUBJECT_OUTLINE_PAINT: LineLayerSpecification["paint"] = {
  "line-color": [
    "match",
    ["get", "status"],
    "saving",
    "#047857",
    "overuse",
    "#be123c",
    "#64748b",
  ],
  "line-opacity": ["case", ["get", "selected"], 0.95, 0.56],
  "line-width": ["case", ["get", "selected"], 3, 1.2],
};
