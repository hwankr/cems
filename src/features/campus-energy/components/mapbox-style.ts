import type { CircleLayerSpecification } from "mapbox-gl";

export const ENERGY_SUBJECT_CIRCLE_PAINT: CircleLayerSpecification["paint"] = {
  "circle-radius": [
    "interpolate",
    ["linear"],
    ["zoom"],
    14,
    ["case", ["get", "selected"], 16, 7],
    17,
    ["case", ["get", "selected"], 16, 14],
  ],
  "circle-color": [
    "match",
    ["get", "status"],
    "saving",
    "#059669",
    "overuse",
    "#e11d48",
    "#64748b",
  ],
  "circle-opacity": 0.78,
  "circle-stroke-color": "#ffffff",
  "circle-stroke-width": 2,
};
