// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CampusMap } from "../components/campus-map";
import { compareEnergy } from "../domain/energy";
import type { EnergySubject, School } from "../domain/types";

type MockGeoJsonSource = {
  setData: ReturnType<typeof vi.fn>;
};

type MockMapInstance = {
  addControl: ReturnType<typeof vi.fn>;
  addLayer: ReturnType<typeof vi.fn>;
  addSource: ReturnType<typeof vi.fn>;
  easeTo: ReturnType<typeof vi.fn>;
  flyTo: ReturnType<typeof vi.fn>;
  getCanvas: ReturnType<typeof vi.fn>;
  getLayer: ReturnType<typeof vi.fn>;
  getSource: ReturnType<typeof vi.fn>;
  getZoom: ReturnType<typeof vi.fn>;
  handlers: Map<string, (event: unknown) => void>;
  on: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  setLayoutProperty: ReturnType<typeof vi.fn>;
  setLight: ReturnType<typeof vi.fn>;
  sources: Map<string, MockGeoJsonSource>;
  stop: ReturnType<typeof vi.fn>;
};

const mockMapbox = vi.hoisted(() => {
  const instances: MockMapInstance[] = [];
  const MapConstructor = vi.fn(function MockMap() {
    const instance: MockMapInstance = {
      addControl: vi.fn(),
      addLayer: vi.fn(),
      addSource: vi.fn((id: string) => {
        instance.sources.set(id, { setData: vi.fn() });
      }),
      easeTo: vi.fn(),
      flyTo: vi.fn(),
      getCanvas: vi.fn(() => ({ style: { cursor: "" } })),
      getLayer: vi.fn((id: string) =>
        ["building", "building-outline", "building-extrusion"].includes(id)
          ? { id }
          : undefined,
      ),
      getSource: vi.fn((id: string) => instance.sources.get(id)),
      getZoom: vi.fn(() => 16.2),
      handlers: new Map(),
      on: vi.fn(
        (
          event: string,
          listenerOrLayer: unknown,
          listener?: (event: unknown) => void,
        ) => {
        if (event === "load" && typeof listenerOrLayer === "function") {
          listenerOrLayer();
        }
          if (typeof listenerOrLayer === "string" && listener) {
            instance.handlers.set(`${event}:${listenerOrLayer}`, listener);
          }
        },
      ),
      remove: vi.fn(),
      setLayoutProperty: vi.fn(),
      setLight: vi.fn(),
      sources: new Map(),
      stop: vi.fn(),
    };

    instances.push(instance);

    return instance;
  });

  return {
    instances,
    MapConstructor,
    NavigationControl: vi.fn(),
  };
});

vi.mock("mapbox-gl", () => ({
  default: {
    Map: mockMapbox.MapConstructor,
    NavigationControl: mockMapbox.NavigationControl,
  },
}));

vi.mock(
  "@/i18n/client",
  () => ({
    useI18n: () => ({
      messages: {
        map: {
          live: "Live campus",
          missingTokenDescription: "Missing token",
          missingTokenTitle: "Map unavailable",
        },
        status: {
          saving: "Saving",
          neutral: "Neutral",
          overuse: "Overuse",
        },
      },
    }),
  }),
);

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const school: School = {
  id: "yeungnam",
  name: "Yeungnam University",
  shortName: "YU",
  center: [128.757416, 35.83287],
  zoom: 15.4,
  pitch: 60,
};

const manualGeometrySource = {
  kind: "manual" as const,
  name: "Manual campus mapping",
};

const officialGeometrySource = {
  kind: "official-campus-map" as const,
  name: "Yeungnam University campus map",
};

const subjects: EnergySubject[] = [
  {
    id: "yu-e21",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "building",
    name: "Engineering Building 1",
    shortName: "E21",
    officialCode: "E21",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [128.7588, 35.8328],
          [128.7592, 35.8328],
          [128.7592, 35.8332],
          [128.7588, 35.8332],
          [128.7588, 35.8328],
        ],
      ],
      geometrySource: manualGeometrySource,
      geometryConfidence: "verified",
      displayHeightMeters: 10.8,
      aboveGroundFloors: 3,
      basementFloors: 1,
      floorCountSource: "official-bFloor",
      heightSource: "official-floor-count",
    },
  },
  {
    id: "yu-e22",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "building",
    name: "Engineering Building 2",
    shortName: "E22",
    officialCode: "E22",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [128.7608, 35.8338],
          [128.7612, 35.8338],
          [128.7612, 35.8342],
          [128.7608, 35.8342],
          [128.7608, 35.8338],
        ],
      ],
      geometrySource: manualGeometrySource,
      geometryConfidence: "verified",
      displayHeightMeters: 14.4,
      aboveGroundFloors: 4,
      basementFloors: 0,
      floorCountSource: "official-bFloor",
      heightSource: "official-floor-count",
    },
  },
  {
    id: "yu-official-dd73bbe1",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "landmark",
    name: "Cheonma Honors Park",
    shortName: "Cheonma Honors Park",
    geometry: {
      type: "Point",
      coordinates: [128.7601738129029, 35.8308105775303],
      geometrySource: officialGeometrySource,
      geometryConfidence: "verified",
    },
  },
];

const comparisons = [
  compareEnergy({
    subjectId: "yu-e21",
    actualKwh: 900,
    forecastKwh: 1000,
    periodLabel: "2026-W25",
  }),
  compareEnergy({
    subjectId: "yu-e22",
    actualKwh: 1200,
    forecastKwh: 1000,
    periodLabel: "2026-W25",
  }),
  compareEnergy({
    subjectId: "yu-official-dd73bbe1",
    actualKwh: 1000,
    forecastKwh: 1000,
    periodLabel: "2026-W25",
  }),
];

function StatefulCampusMap() {
  const [selectedSubjectId, setSelectedSubjectId] = useState("yu-e21");

  return (
    <CampusMap
      mapboxToken="test-token"
      school={school}
      subjects={subjects}
      comparisons={comparisons}
      selectedSubjectId={selectedSubjectId}
      onSelectSubject={setSelectedSubjectId}
    />
  );
}

function renderMap(root: Root) {
  root.render(
    <StatefulCampusMap />,
  );
}

describe("CampusMap", () => {
  afterEach(() => {
    mockMapbox.instances.length = 0;
    mockMapbox.MapConstructor.mockClear();
    mockMapbox.NavigationControl.mockClear();
    document.body.replaceChildren();
  });

  it("registers floor-based extrusion and polygon hit layers instead of visible floor fills or circle markers", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => renderMap(root));

    const mapOptions = mockMapbox.MapConstructor.mock.calls[0]?.[0] as
      | {
          style?: string;
          minZoom?: number;
          localIdeographFontFamily?: string;
        }
      | undefined;
    const firstMap = mockMapbox.instances[0];
    const layerIds = firstMap.addLayer.mock.calls.map(
      ([layer]) => (layer as { id: string }).id,
    );
    const polygonHitLayer = firstMap.addLayer.mock.calls.find(
      ([layer]) =>
        (layer as { id: string }).id === "energy-subject-polygon-hit-areas",
    )?.[0] as { paint?: Record<string, unknown> } | undefined;
    const pointHitLayer = firstMap.addLayer.mock.calls.find(
      ([layer]) =>
        (layer as { id: string }).id === "energy-subject-point-hit-areas",
    )?.[0] as { paint?: Record<string, unknown> } | undefined;
    const labelLayer = firstMap.addLayer.mock.calls.find(
      ([layer]) => (layer as { id: string }).id === "energy-subject-labels",
    )?.[0] as
      | {
          layout?: Record<string, unknown>;
          paint?: Record<string, unknown>;
        }
      | undefined;
    const extrusionLayer = firstMap.addLayer.mock.calls.find(
      ([layer]) =>
        (layer as { id: string }).id ===
        "energy-subject-building-extrusions",
    )?.[0] as { filter?: unknown; paint?: Record<string, unknown> } | undefined;
    const outlineLayer = firstMap.addLayer.mock.calls.find(
      ([layer]) => (layer as { id: string }).id === "energy-subject-outlines",
    )?.[0] as { filter?: unknown } | undefined;
    const sourceData = firstMap.addSource.mock.calls[0]?.[1] as
      | {
          data?: {
            features?: Array<{
              properties?: Record<string, unknown>;
            }>;
          };
        }
      | undefined;
    const pointFeature = sourceData?.data?.features?.find(
      (feature) => feature.properties?.id === "yu-official-dd73bbe1",
    );

    expect(layerIds).not.toContain("energy-subject-fills");
    expect(layerIds).not.toContain("energy-subject-circles");
    expect(layerIds).toContain("energy-subject-building-extrusions");
    expect(layerIds).toContain("energy-subject-polygon-hit-areas");
    expect(layerIds).not.toContain("energy-subject-point-hit-areas");
    expect(mapOptions).toMatchObject({
      style: "mapbox://styles/mapbox/dark-v11",
      minZoom: 15.3,
      localIdeographFontFamily:
        "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
    });
    expect(firstMap.setLayoutProperty).toHaveBeenCalledWith(
      "building",
      "visibility",
      "none",
    );
    expect(firstMap.setLayoutProperty).toHaveBeenCalledWith(
      "building-outline",
      "visibility",
      "none",
    );
    expect(firstMap.setLayoutProperty).toHaveBeenCalledWith(
      "building-extrusion",
      "visibility",
      "none",
    );
    expect(firstMap.setLight).toHaveBeenCalledWith({
      anchor: "viewport",
      color: "#ffffff",
      intensity: 0.35,
      position: [1.5, 210, 30],
    });
    expect(polygonHitLayer?.paint).toMatchObject({ "fill-opacity": 0 });
    expect(pointHitLayer).toBeUndefined();
    const extrudablePolygonFilter = [
      "all",
      [
        "any",
        ["==", ["geometry-type"], "Polygon"],
        ["==", ["geometry-type"], "MultiPolygon"],
      ],
      [
        ">",
        ["coalesce", ["to-number", ["get", "displayHeightMeters"]], 0],
        0,
      ],
    ];
    expect(extrusionLayer?.filter).toEqual(extrudablePolygonFilter);
    expect(polygonHitLayer?.filter).toEqual(extrudablePolygonFilter);
    expect(outlineLayer?.filter).toEqual(extrudablePolygonFilter);
    expect(labelLayer?.filter).toEqual(extrudablePolygonFilter);
    expect(extrusionLayer?.paint).toMatchObject({
      "fill-extrusion-height": [
        "+",
        3,
        ["coalesce", ["to-number", ["get", "displayHeightMeters"]], 0],
      ],
    });
    expect(labelLayer?.layout).toMatchObject({
      "text-field": [
        "coalesce",
        ["get", "name"],
        ["get", "officialCode"],
        ["get", "shortName"],
      ],
      "text-anchor": "center",
      "text-justify": "center",
      "text-padding": 2,
      "text-allow-overlap": false,
      "text-ignore-placement": false,
    });
    expect(labelLayer?.paint).toMatchObject({
      "text-color": "#f8fafc",
      "text-halo-color": "rgba(2, 6, 23, 0.85)",
      "text-halo-width": 1.4,
      "text-halo-blur": 0.4,
    });
    expect(pointFeature?.properties).not.toHaveProperty("displayHeightMeters");

    await act(async () => root.unmount());
  });

  it("keeps the existing Mapbox instance when a polygon building click changes selection", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => renderMap(root));

    expect(mockMapbox.MapConstructor).toHaveBeenCalledTimes(1);
    const firstMap = mockMapbox.instances[0];
    const source = firstMap.sources.get("energy-subjects");
    const polygonClickHandler = firstMap.handlers.get(
      "click:energy-subject-polygon-hit-areas",
    );

    expect(source).toBeDefined();
    expect(polygonClickHandler).toBeDefined();

    await act(async () =>
      polygonClickHandler?.({
        features: [{ properties: { id: "yu-e22" } }],
      }),
    );

    expect(mockMapbox.MapConstructor).toHaveBeenCalledTimes(1);
    expect(firstMap.remove).not.toHaveBeenCalled();
    expect(source?.setData).toHaveBeenCalled();
    expect(firstMap.stop).toHaveBeenCalled();
    expect(firstMap.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [128.761, 35.834],
        duration: 800,
      }),
    );

    await act(async () => root.unmount());

    expect(firstMap.remove).toHaveBeenCalledTimes(1);
  });

  it("keeps the existing Mapbox instance when an extrusion click changes selection", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => renderMap(root));

    expect(mockMapbox.MapConstructor).toHaveBeenCalledTimes(1);
    const firstMap = mockMapbox.instances[0];
    const source = firstMap.sources.get("energy-subjects");
    const extrusionClickHandler = firstMap.handlers.get(
      "click:energy-subject-building-extrusions",
    );

    expect(source).toBeDefined();
    expect(extrusionClickHandler).toBeDefined();

    await act(async () =>
      extrusionClickHandler?.({
        features: [{ properties: { id: "yu-e22" } }],
      }),
    );

    expect(mockMapbox.MapConstructor).toHaveBeenCalledTimes(1);
    expect(firstMap.remove).not.toHaveBeenCalled();
    expect(source?.setData).toHaveBeenCalled();
    expect(firstMap.stop).toHaveBeenCalled();
    expect(firstMap.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [128.761, 35.834],
        duration: 800,
      }),
    );

    await act(async () => root.unmount());
  });

  it("does not register point fallback subjects as map click zones", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => renderMap(root));

    const firstMap = mockMapbox.instances[0];
    const pointClickHandler = firstMap.handlers.get(
      "click:energy-subject-point-hit-areas",
    );

    expect(pointClickHandler).toBeUndefined();

    await act(async () => root.unmount());
  });
});
