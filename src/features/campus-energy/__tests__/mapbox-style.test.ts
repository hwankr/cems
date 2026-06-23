import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  ENERGY_SUBJECT_EXTRUSION_PAINT,
  ENERGY_SUBJECT_OUTLINE_PAINT,
  ENERGY_SUBJECT_POINT_HIT_PAINT,
  ENERGY_SUBJECT_POLYGON_HIT_PAINT,
} from "../components/mapbox-style";

const require = createRequire(import.meta.url);
const mapboxStyleSpec = require("mapbox-gl/dist/style-spec/index.cjs") as {
  validate: (style: unknown) => Array<{ message: string }>;
};

describe("Mapbox style expressions", () => {
  it("uses valid transparent hit-layer and outline expressions", () => {
    const errors = mapboxStyleSpec.validate({
      version: 8,
      sources: {
        subjects: {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        },
      },
      layers: [
        {
          id: "energy-subject-building-extrusions",
          type: "fill-extrusion",
          source: "subjects",
          paint: ENERGY_SUBJECT_EXTRUSION_PAINT,
        },
        {
          id: "energy-subject-polygon-hit-areas",
          type: "fill",
          source: "subjects",
          paint: ENERGY_SUBJECT_POLYGON_HIT_PAINT,
        },
        {
          id: "energy-subject-point-hit-areas",
          type: "circle",
          source: "subjects",
          paint: ENERGY_SUBJECT_POINT_HIT_PAINT,
        },
        {
          id: "energy-subject-outlines",
          type: "line",
          source: "subjects",
          paint: ENERGY_SUBJECT_OUTLINE_PAINT,
        },
      ],
    });

    expect(errors.map((error) => error.message)).toEqual([]);
  });

  it("uses displayHeightMeters for extrusion height", () => {
    expect(ENERGY_SUBJECT_EXTRUSION_PAINT).toMatchObject({
      "fill-extrusion-height": ["get", "displayHeightMeters"],
      "fill-extrusion-opacity": 0.72,
    });
  });

  it("keeps polygon hit areas visually transparent", () => {
    expect(ENERGY_SUBJECT_POLYGON_HIT_PAINT).toMatchObject({
      "fill-opacity": 0,
    });
  });

  it("keeps point fallback hit areas visually transparent", () => {
    expect(ENERGY_SUBJECT_POINT_HIT_PAINT).toMatchObject({
      "circle-opacity": 0,
      "circle-stroke-opacity": 0,
    });
  });
});
