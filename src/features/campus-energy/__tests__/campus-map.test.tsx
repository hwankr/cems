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
  flyTo: ReturnType<typeof vi.fn>;
  getCanvas: ReturnType<typeof vi.fn>;
  getSource: ReturnType<typeof vi.fn>;
  handlers: Map<string, (event: unknown) => void>;
  on: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  sources: Map<string, MockGeoJsonSource>;
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
      flyTo: vi.fn(),
      getCanvas: vi.fn(() => ({ style: { cursor: "" } })),
      getSource: vi.fn((id: string) => instance.sources.get(id)),
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
      sources: new Map(),
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
          missingTokenDescription: "Missing token",
          missingTokenTitle: "Map unavailable",
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

const subjects: EnergySubject[] = [
  {
    id: "yu-e21",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "building",
    name: "Engineering Building 1",
    shortName: "E21",
    lng: 128.759,
    lat: 35.833,
    officialCode: "E21",
  },
  {
    id: "yu-e22",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "building",
    name: "Engineering Building 2",
    shortName: "E22",
    lng: 128.761,
    lat: 35.834,
    officialCode: "E22",
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

  it("keeps the existing Mapbox instance when a map building click changes selection", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => renderMap(root));

    expect(mockMapbox.MapConstructor).toHaveBeenCalledTimes(1);
    const firstMap = mockMapbox.instances[0];
    const source = firstMap.sources.get("energy-subjects");
    const circleClickHandler = firstMap.handlers.get(
      "click:energy-subject-circles",
    );

    expect(source).toBeDefined();
    expect(circleClickHandler).toBeDefined();

    await act(async () =>
      circleClickHandler?.({
        features: [{ properties: { id: "yu-e22" } }],
      }),
    );

    expect(mockMapbox.MapConstructor).toHaveBeenCalledTimes(1);
    expect(firstMap.remove).not.toHaveBeenCalled();
    expect(source?.setData).toHaveBeenCalled();
    expect(firstMap.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [128.761, 35.834],
        essential: true,
      }),
    );

    await act(async () => root.unmount());

    expect(firstMap.remove).toHaveBeenCalledTimes(1);
  });
});
