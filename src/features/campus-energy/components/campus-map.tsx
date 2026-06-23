"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef } from "react";
import { useI18n } from "@/i18n/client";
import {
  createEnergySubjectFeatureCollection,
  getEnergySubjectCenter,
} from "../domain/geojson";
import type { EnergyComparison, EnergySubject, School } from "../domain/types";
import {
  ENERGY_SUBJECT_EXTRUSION_PAINT,
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

type CampusMapProps = {
  mapboxToken: string;
  school: School;
  subjects: EnergySubject[];
  comparisons: EnergyComparison[];
  selectedSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
};

export function CampusMap({
  mapboxToken,
  school,
  subjects,
  comparisons,
  selectedSubjectId,
  onSelectSubject,
}: CampusMapProps) {
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
  const featureCollectionRef = useRef(featureCollection);
  const onSelectSubjectRef = useRef(onSelectSubject);
  const selectedSubject = subjects.find(
    (subject) => subject.id === selectedSubjectId,
  );

  useEffect(() => {
    featureCollectionRef.current = featureCollection;
  }, [featureCollection]);

  useEffect(() => {
    onSelectSubjectRef.current = onSelectSubject;
  }, [onSelectSubject]);

  useEffect(() => {
    if (!mapboxToken || !containerRef.current || mapRef.current) return;

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
      style: "mapbox://styles/mapbox/dark-v11",
      zoom: school.zoom,
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
      ["building", "building-outline", "building-extrusion"].forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", "none");
        }
      });
      map.setLight({
        anchor: "viewport",
        color: "#ffffff",
        intensity: 0.35,
        position: [1.5, 210, 30],
      });

      map.addSource(ENERGY_SUBJECT_SOURCE_ID, {
        type: "geojson",
        data: featureCollectionRef.current,
      });
      map.addLayer({
        id: ENERGY_SUBJECT_EXTRUSION_LAYER_ID,
        type: "fill-extrusion",
        source: ENERGY_SUBJECT_SOURCE_ID,
        filter: EXTRUDABLE_POLYGON_FILTER,
        paint: ENERGY_SUBJECT_EXTRUSION_PAINT,
      });
      map.addLayer({
        id: ENERGY_SUBJECT_POLYGON_HIT_LAYER_ID,
        type: "fill",
        source: ENERGY_SUBJECT_SOURCE_ID,
        filter: EXTRUDABLE_POLYGON_FILTER,
        paint: ENERGY_SUBJECT_POLYGON_HIT_PAINT,
      });
      map.addLayer({
        id: ENERGY_SUBJECT_OUTLINE_LAYER_ID,
        type: "line",
        source: ENERGY_SUBJECT_SOURCE_ID,
        filter: EXTRUDABLE_POLYGON_FILTER,
        paint: ENERGY_SUBJECT_OUTLINE_PAINT,
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
        },
        paint: {
          "text-color": "#f8fafc",
          "text-halo-color": "rgba(2, 6, 23, 0.85)",
          "text-halo-width": 1.4,
          "text-halo-blur": 0.4,
        },
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
    });

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
  }, [mapboxToken, school.center, school.pitch, school.zoom]);

  useEffect(() => {
    const source = mapRef.current?.getSource(ENERGY_SUBJECT_SOURCE_ID);
    if (source && "setData" in source) {
      (source as mapboxgl.GeoJSONSource).setData(featureCollection);
    }
  }, [featureCollection]);

  useEffect(() => {
    if (!selectedSubject || !mapRef.current) return;
    const selectedSubjectCenter = getEnergySubjectCenter(selectedSubject);

    if (!selectedSubjectCenter) return;

    const zoom =
      selectedSubject.geometry?.type === "Polygon" ||
      selectedSubject.geometry?.type === "MultiPolygon"
        ? 17.1
        : 16.4;

    mapRef.current.stop();
    mapRef.current.easeTo({
      center: selectedSubjectCenter,
      zoom,
      pitch: school.pitch,
      bearing: -24,
      duration: 800,
    });
  }, [school.pitch, selectedSubject]);

  const legend = [
    { key: "saving" as const, color: "bg-saving" },
    { key: "neutral" as const, color: "bg-ink-subtle" },
    { key: "overuse" as const, color: "bg-overuse" },
  ];

  if (!mapboxToken) {
    return (
      <div className="flex h-[56vh] min-h-[22rem] w-full items-center justify-center rounded-2xl border border-line bg-inset p-6 lg:h-[42rem]">
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
    <div className="relative h-[56vh] min-h-[22rem] w-full overflow-hidden rounded-2xl ring-1 ring-line lg:h-[42rem]">
      <div ref={containerRef} className="h-full w-full" />
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_70px_24px_rgb(6_9_16_/_0.55)]"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface/80 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-saving" aria-hidden="true" />
        {messages.map.live}
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 rounded-full border border-line-strong bg-surface/80 px-3 py-1.5 text-[11px] text-ink-muted backdrop-blur">
        {legend.map(({ key, color }) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${color}`}
              aria-hidden="true"
            />
            {messages.status[key]}
          </span>
        ))}
      </div>
    </div>
  );
}
