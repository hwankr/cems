"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import mapboxgl from "mapbox-gl";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useI18n } from "@/i18n/client";
import {
  createEnergySubjectFeatureCollection,
  getEnergySubjectCenter,
} from "../domain/geojson";
import type { EnergyComparison, EnergySubject, School } from "../domain/types";
import {
  ENERGY_HEAT_PAINT,
  ENERGY_SUBJECT_EXTRUSION_PAINT,
  ENERGY_SUBJECT_EXTRUSION_PAINT_LIGHT,
  ENERGY_SUBJECT_LABEL_PAINT_DARK,
  ENERGY_SUBJECT_LABEL_PAINT_LIGHT,
  ENERGY_SUBJECT_OUTLINE_PAINT,
  ENERGY_SUBJECT_POLYGON_HIT_PAINT,
} from "./mapbox-style";

type FeatureProperties = {
  properties?: Record<string, unknown> | null;
};

function getFeatureStringProperty(
  feature: mapboxgl.GeoJSONFeature | undefined,
  key: string,
) {
  const value = (feature as FeatureProperties | undefined)?.properties?.[key];
  return typeof value === "string" ? value : null;
}

const ENERGY_SUBJECT_SOURCE_ID = "energy-subjects";
const ENERGY_HEAT_SOURCE_ID = "energy-heat";
const ENERGY_HEAT_LAYER_ID = "energy-heat";
const ENERGY_SUBJECT_EXTRUSION_LAYER_ID =
  "energy-subject-building-extrusions";
const ENERGY_SUBJECT_POLYGON_HIT_LAYER_ID =
  "energy-subject-polygon-hit-areas";
const ENERGY_SUBJECT_OUTLINE_LAYER_ID = "energy-subject-outlines";
const ENERGY_SUBJECT_LABEL_LAYER_ID = "energy-subject-labels";
const POLYGON_FILTER: mapboxgl.FilterSpecification = [
  "any",
  ["==", ["geometry-type"], "Polygon"],
  ["==", ["geometry-type"], "MultiPolygon"],
];
const EXTRUDABLE_POLYGON_FILTER: mapboxgl.FilterSpecification = [
  "all",
  POLYGON_FILTER,
  [">", ["coalesce", ["to-number", ["get", "displayHeightMeters"]], 0], 0],
];

const DEFAULT_MAP_STYLE = "mapbox://styles/mapbox/dark-v11";
const DIMMED_EXTRUSION_OPACITY = 0.16;

// Popup card footprint used when projecting the selected building to a screen
// slot. Mirrors BuildingPopup's width and approximate height.
const POPUP_WIDTH = 344;
const POPUP_HEIGHT = 360;
const POPUP_PAD = 16;
const POPUP_GAP = 22;

export type CampusMapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
};

export type ScreenPosition = { left: number; top: number };

type HeatFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: { weight: number };
  }>;
};

type CampusMapProps = {
  mapboxToken: string;
  school: School;
  subjects: EnergySubject[];
  comparisons: EnergyComparison[];
  selectedSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
  mapStyleUrl?: string;
  mapTheme?: "light" | "dark";
  showHeat?: boolean;
  showLabels?: boolean;
  query?: string;
  onSelectedScreenPositionChange?: (position: ScreenPosition | null) => void;
};

function buildHeatPointCollection(
  subjects: EnergySubject[],
  comparisons: EnergyComparison[],
): HeatFeatureCollection {
  const comparisonsBySubjectId = new Map(
    comparisons.map((comparison) => [comparison.subjectId, comparison]),
  );
  const points: Array<{ center: [number, number]; actual: number }> = [];
  let maxActual = 0;

  for (const subject of subjects) {
    const comparison = comparisonsBySubjectId.get(subject.id);
    if (!comparison) continue;
    const center = getEnergySubjectCenter(subject);
    if (!center) continue;
    maxActual = Math.max(maxActual, comparison.actualKwh);
    points.push({ center, actual: comparison.actualKwh });
  }

  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: point.center },
      properties: { weight: maxActual > 0 ? point.actual / maxActual : 0 },
    })),
  };
}

function matchesQuery(subject: EnergySubject, query: string) {
  return (
    subject.name.toLowerCase().includes(query) ||
    subject.shortName.toLowerCase().includes(query) ||
    (subject.officialCode?.toLowerCase().includes(query) ?? false)
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export const CampusMap = forwardRef<CampusMapHandle, CampusMapProps>(
  function CampusMap(
    {
      mapboxToken,
      school,
      subjects,
      comparisons,
      selectedSubjectId,
      onSelectSubject,
      mapStyleUrl = DEFAULT_MAP_STYLE,
      mapTheme = "dark",
      showHeat = false,
      showLabels = true,
      query = "",
      onSelectedScreenPositionChange,
    },
    ref,
  ) {
    const { messages } = useI18n();
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    const featureCollection = useMemo(
      () =>
        createEnergySubjectFeatureCollection(
          subjects,
          comparisons,
          selectedSubjectId,
        ),
      [comparisons, selectedSubjectId, subjects],
    );
    const heatCollection = useMemo(
      () => buildHeatPointCollection(subjects, comparisons),
      [comparisons, subjects],
    );

    const selectedSubject = subjects.find(
      (subject) => subject.id === selectedSubjectId,
    );

    const featureCollectionRef = useRef(featureCollection);
    const heatCollectionRef = useRef(heatCollection);
    const onSelectSubjectRef = useRef(onSelectSubject);
    const onPositionRef = useRef(onSelectedScreenPositionChange);
    const showHeatRef = useRef(showHeat);
    const showLabelsRef = useRef(showLabels);
    const selectedSubjectRef = useRef(selectedSubject);

    const baseExtrusionOpacity = mapTheme === "light" ? 1 : 0.86;

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => mapRef.current?.zoomIn(),
        zoomOut: () => mapRef.current?.zoomOut(),
      }),
      [],
    );

    useEffect(() => {
      featureCollectionRef.current = featureCollection;
    }, [featureCollection]);
    useEffect(() => {
      heatCollectionRef.current = heatCollection;
    }, [heatCollection]);
    useEffect(() => {
      onSelectSubjectRef.current = onSelectSubject;
    }, [onSelectSubject]);
    useEffect(() => {
      onPositionRef.current = onSelectedScreenPositionChange;
    }, [onSelectedScreenPositionChange]);
    useEffect(() => {
      showHeatRef.current = showHeat;
    }, [showHeat]);
    useEffect(() => {
      showLabelsRef.current = showLabels;
    }, [showLabels]);
    useEffect(() => {
      selectedSubjectRef.current = selectedSubject;
    }, [selectedSubject]);

    const positionPopup = useCallback((subject?: EnergySubject) => {
      const notify = onPositionRef.current;
      if (!notify) return;
      const map = mapRef.current;
      const container = containerRef.current;
      if (!map || !container || typeof map.project !== "function" || !subject) {
        notify(null);
        return;
      }
      const center = getEnergySubjectCenter(subject);
      if (!center) {
        notify(null);
        return;
      }
      let point: mapboxgl.Point;
      try {
        point = map.project(center as [number, number]);
      } catch {
        return;
      }
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const left = clamp(
        point.x - POPUP_WIDTH / 2,
        POPUP_PAD,
        Math.max(POPUP_PAD, containerWidth - POPUP_WIDTH - POPUP_PAD),
      );
      let top: number;
      if (point.y + POPUP_GAP + POPUP_HEIGHT <= containerHeight - POPUP_PAD) {
        top = point.y + POPUP_GAP;
      } else if (point.y - POPUP_GAP - POPUP_HEIGHT >= POPUP_PAD) {
        top = point.y - POPUP_GAP - POPUP_HEIGHT;
      } else {
        top = clamp(
          point.y - POPUP_HEIGHT / 2,
          POPUP_PAD,
          Math.max(POPUP_PAD, containerHeight - POPUP_HEIGHT - POPUP_PAD),
        );
      }
      notify({ left: Math.round(left), top: Math.round(top) });
    }, []);
    const positionPopupRef = useRef(positionPopup);
    useEffect(() => {
      positionPopupRef.current = positionPopup;
    }, [positionPopup]);

    useEffect(() => {
      if (!mapboxToken || !containerRef.current || mapRef.current) return;

      const isStandard = mapStyleUrl.includes("standard");
      const isLightTheme = mapTheme === "light";

      const map = new mapboxgl.Map({
        accessToken: mapboxToken,
        antialias: true,
        bearing: -24,
        center: school.center,
        container: containerRef.current,
        localIdeographFontFamily:
          "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
        minZoom: 15.3,
        pitch: school.pitch,
        style: mapStyleUrl,
        zoom: school.zoom,
        ...(isStandard
          ? {
              config: {
                basemap: { lightPreset: isLightTheme ? "day" : "night" },
              },
            }
          : {}),
      });

      mapRef.current = map;
      if (process.env.NODE_ENV !== "production") {
        (window as typeof window & { __map?: mapboxgl.Map }).__map = map;
      }
      map.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        "bottom-right",
      );

      map.on("load", () => {
        if (!isStandard) {
          ["building", "building-outline", "building-extrusion"].forEach(
            (id) => {
              if (map.getLayer(id)) {
                map.setLayoutProperty(id, "visibility", "none");
              }
            },
          );
          map.setLight({
            anchor: "viewport",
            color: "#ffffff",
            intensity: 0.35,
            position: [1.5, 210, 30],
          });
        }

        // On Mapbox Standard, render our energy layers above the 3D basemap.
        const slotProps = isStandard ? ({ slot: "top" } as const) : {};

        map.addSource(ENERGY_SUBJECT_SOURCE_ID, {
          type: "geojson",
          data: featureCollectionRef.current,
        });
        map.addSource(ENERGY_HEAT_SOURCE_ID, {
          type: "geojson",
          data: heatCollectionRef.current,
        });

        // Heat sits beneath the buildings (added first within the slot).
        map.addLayer({
          id: ENERGY_HEAT_LAYER_ID,
          type: "heatmap",
          source: ENERGY_HEAT_SOURCE_ID,
          paint: ENERGY_HEAT_PAINT,
          layout: { visibility: showHeatRef.current ? "visible" : "none" },
          ...slotProps,
        });
        map.addLayer({
          id: ENERGY_SUBJECT_EXTRUSION_LAYER_ID,
          type: "fill-extrusion",
          source: ENERGY_SUBJECT_SOURCE_ID,
          filter: EXTRUDABLE_POLYGON_FILTER,
          paint: isLightTheme
            ? ENERGY_SUBJECT_EXTRUSION_PAINT_LIGHT
            : ENERGY_SUBJECT_EXTRUSION_PAINT,
          ...slotProps,
        });
        map.addLayer({
          id: ENERGY_SUBJECT_POLYGON_HIT_LAYER_ID,
          type: "fill",
          source: ENERGY_SUBJECT_SOURCE_ID,
          filter: EXTRUDABLE_POLYGON_FILTER,
          paint: ENERGY_SUBJECT_POLYGON_HIT_PAINT,
          ...slotProps,
        });
        map.addLayer({
          id: ENERGY_SUBJECT_OUTLINE_LAYER_ID,
          type: "line",
          source: ENERGY_SUBJECT_SOURCE_ID,
          filter: EXTRUDABLE_POLYGON_FILTER,
          paint: ENERGY_SUBJECT_OUTLINE_PAINT,
          ...slotProps,
        });
        map.addLayer({
          id: ENERGY_SUBJECT_LABEL_LAYER_ID,
          type: "symbol",
          source: ENERGY_SUBJECT_SOURCE_ID,
          filter: EXTRUDABLE_POLYGON_FILTER,
          minzoom: 15,
          layout: {
            "text-field": [
              "coalesce",
              ["get", "name"],
              ["get", "officialCode"],
              ["get", "shortName"],
            ],
            "text-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              9,
              16.5,
              11,
              18,
              13,
            ],
            "text-anchor": "center",
            "text-justify": "center",
            "text-padding": 2,
            "text-allow-overlap": false,
            "text-ignore-placement": false,
            visibility: showLabelsRef.current ? "visible" : "none",
          },
          paint: isLightTheme
            ? ENERGY_SUBJECT_LABEL_PAINT_LIGHT
            : ENERGY_SUBJECT_LABEL_PAINT_DARK,
          ...slotProps,
        });

        [
          ENERGY_SUBJECT_EXTRUSION_LAYER_ID,
          ENERGY_SUBJECT_POLYGON_HIT_LAYER_ID,
          ENERGY_SUBJECT_LABEL_LAYER_ID,
        ].forEach((layerId) => {
          map.on("click", layerId, (event) => {
            const id = getFeatureStringProperty(event.features?.[0], "id");
            if (id) onSelectSubjectRef.current(id);
          });
          map.on("mouseenter", layerId, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layerId, () => {
            map.getCanvas().style.cursor = "";
          });
        });

        map.on("move", () => {
          const subject = selectedSubjectRef.current;
          if (subject) positionPopupRef.current(subject);
        });

        if (selectedSubjectRef.current) {
          positionPopupRef.current(selectedSubjectRef.current);
        }
      });

      map.on("error", (event) => console.warn("mapbox", event && event.error));

      return () => {
        map.remove();
        if (
          process.env.NODE_ENV !== "production" &&
          (window as typeof window & { __map?: mapboxgl.Map }).__map === map
        ) {
          delete (window as typeof window & { __map?: mapboxgl.Map }).__map;
        }
        mapRef.current = null;
      };
    }, [
      mapStyleUrl,
      mapTheme,
      mapboxToken,
      school.center,
      school.pitch,
      school.zoom,
    ]);

    useEffect(() => {
      const source = mapRef.current?.getSource(ENERGY_SUBJECT_SOURCE_ID);
      if (source && "setData" in source) {
        (source as mapboxgl.GeoJSONSource).setData(featureCollection);
      }
    }, [featureCollection]);

    useEffect(() => {
      const source = mapRef.current?.getSource(ENERGY_HEAT_SOURCE_ID);
      if (source && "setData" in source) {
        (source as mapboxgl.GeoJSONSource).setData(heatCollection);
      }
    }, [heatCollection]);

    // Fly to the selection and keep the popup pinned to the building.
    useEffect(() => {
      if (!selectedSubject) {
        onPositionRef.current?.(null);
        return;
      }
      positionPopup(selectedSubject);

      const map = mapRef.current;
      if (!map) return;
      const center = getEnergySubjectCenter(selectedSubject);
      if (!center) return;
      const zoom =
        selectedSubject.geometry?.type === "Polygon" ||
        selectedSubject.geometry?.type === "MultiPolygon"
          ? 17.1
          : 16.4;

      map.stop();
      map.easeTo({
        center,
        zoom,
        pitch: school.pitch,
        bearing: -24,
        duration: 800,
      });
    }, [school.pitch, selectedSubject, positionPopup]);

    // Toggle heat / label visibility once layers exist.
    useEffect(() => {
      const map = mapRef.current;
      if (!map || typeof map.getLayer !== "function") return;
      if (!map.getLayer(ENERGY_HEAT_LAYER_ID)) return;
      map.setLayoutProperty(
        ENERGY_HEAT_LAYER_ID,
        "visibility",
        showHeat ? "visible" : "none",
      );
    }, [showHeat]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map || typeof map.getLayer !== "function") return;
      if (!map.getLayer(ENERGY_SUBJECT_LABEL_LAYER_ID)) return;
      map.setLayoutProperty(
        ENERGY_SUBJECT_LABEL_LAYER_ID,
        "visibility",
        showLabels ? "visible" : "none",
      );
    }, [showLabels]);

    // Dim buildings that don't match the search query.
    useEffect(() => {
      const map = mapRef.current;
      if (!map || typeof map.getLayer !== "function") return;
      if (!map.getLayer(ENERGY_SUBJECT_EXTRUSION_LAYER_ID)) return;
      const normalized = query.trim().toLowerCase();
      if (!normalized) {
        map.setPaintProperty(
          ENERGY_SUBJECT_EXTRUSION_LAYER_ID,
          "fill-extrusion-opacity",
          baseExtrusionOpacity,
        );
        return;
      }
      const matchedIds = subjects
        .filter((subject) => matchesQuery(subject, normalized))
        .map((subject) => subject.id);
      map.setPaintProperty(ENERGY_SUBJECT_EXTRUSION_LAYER_ID, "fill-extrusion-opacity", [
        "case",
        ["in", ["get", "id"], ["literal", matchedIds]],
        baseExtrusionOpacity,
        DIMMED_EXTRUSION_OPACITY,
      ]);
    }, [query, subjects, baseExtrusionOpacity]);

    if (!mapboxToken) {
      return (
        <div className="grid h-full w-full place-items-center bg-inset p-6">
          <div className="max-w-sm rounded-xl border border-line-strong bg-surface/80 p-5 text-center shadow-pop">
            <h2 className="font-semibold text-ink">
              {messages.map.missingTokenTitle}
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {messages.map.missingTokenDescription}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative h-full w-full">
        <div ref={containerRef} className="h-full w-full" />
        <div
          className="pointer-events-none absolute inset-0 shadow-[inset_0_0_70px_24px_var(--map-vignette)]"
          aria-hidden="true"
        />
      </div>
    );
  },
);
