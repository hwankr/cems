import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  ENERGY_SUBJECT_EXTRUSION_PAINT,
  ENERGY_SUBJECT_EXTRUSION_PAINT_LIGHT,
  ENERGY_SUBJECT_OUTLINE_PAINT,
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
          id: "energy-subject-building-extrusions-light",
          type: "fill-extrusion",
          source: "subjects",
          paint: ENERGY_SUBJECT_EXTRUSION_PAINT_LIGHT,
        },
        {
          id: "energy-subject-polygon-hit-areas",
          type: "fill",
          source: "subjects",
          paint: ENERGY_SUBJECT_POLYGON_HIT_PAINT,
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
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.86,
      "fill-extrusion-vertical-gradient": true,
    });
    expect(ENERGY_SUBJECT_EXTRUSION_PAINT["fill-extrusion-height"]).toEqual([
      "+",
      3,
      ["coalesce", ["to-number", ["get", "displayHeightMeters"]], 0],
    ]);
  });

  it("keeps polygon hit areas visually transparent", () => {
    expect(ENERGY_SUBJECT_POLYGON_HIT_PAINT).toMatchObject({
      "fill-opacity": 0,
    });
  });
});

describe("award tier paint", () => {
  it("extrusion color includes gold/silver/bronze tier colors", () => {
    const dark = JSON.stringify(
      ENERGY_SUBJECT_EXTRUSION_PAINT["fill-extrusion-color"],
    );
    const light = JSON.stringify(
      ENERGY_SUBJECT_EXTRUSION_PAINT_LIGHT["fill-extrusion-color"],
    );
    for (const paint of [dark, light]) {
      expect(paint).toContain("awardTier");
      expect(paint).toContain("#f5c518"); // gold
      expect(paint).toContain("#c3cad3"); // silver
      expect(paint).toContain("#cd7f32"); // bronze
    }
  });

  it("outline color reacts to awardTier", () => {
    const outline = JSON.stringify(ENERGY_SUBJECT_OUTLINE_PAINT["line-color"]);
    expect(outline).toContain("awardTier");
  });
});
