import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { ENERGY_SUBJECT_CIRCLE_PAINT } from "../components/mapbox-style";

const require = createRequire(import.meta.url);
const mapboxStyleSpec = require("mapbox-gl/dist/style-spec/index.cjs") as {
  validate: (style: unknown) => Array<{ message: string }>;
};

describe("Mapbox style expressions", () => {
  it("uses a valid zoom-dependent circle radius expression", () => {
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
          id: "energy-subject-circles",
          type: "circle",
          source: "subjects",
          paint: ENERGY_SUBJECT_CIRCLE_PAINT,
        },
      ],
    });

    expect(errors.map((error) => error.message)).toEqual([]);
  });
});
