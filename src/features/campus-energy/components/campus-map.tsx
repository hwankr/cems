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
  ENERGY_SUBJECT_POINT_HIT_PAINT,
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
const ENERGY_SUBJECT_POINT_HIT_LAYER_ID = "energy-subject-point-hit-areas";
const ENERGY_SUBJECT_LABEL_LAYER_ID = "energy-subject-labels";
const POLYGON_FILTER: mapboxgl.FilterSpecification = [
  "any",
  ["==", ["geometry-type"], "Polygon"],
  ["==", ["geometry-type"], "MultiPolygon"],
];
const POINT_FILTER: mapboxgl.FilterSpecification = [
  "==",
  ["geometry-type"],
  "Point",
];
const EXTRUSION_FILTER: mapboxgl.FilterSpecification = [
  "all",
  POLYGON_FILTER,
  [">", ["coalesce", ["get", "displayHeightMeters"], 0], 0],
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
      pitch: school.pitch,
      style: "mapbox://styles/mapbox/standard",
      zoom: school.zoom,
      config: {
        basemap: {
          theme: "monochrome",
          lightPreset: "day",
          show3dObjects: false,
        },
      },
    });

    mapRef.current = map;
    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "bottom-right",
    );

    map.on("load", () => {
      map.addSource(ENERGY_SUBJECT_SOURCE_ID, {
        type: "geojson",
        data: featureCollectionRef.current,
      });
      map.addLayer({
        id: ENERGY_SUBJECT_EXTRUSION_LAYER_ID,
        type: "fill-extrusion",
        source: ENERGY_SUBJECT_SOURCE_ID,
        filter: EXTRUSION_FILTER,
        paint: ENERGY_SUBJECT_EXTRUSION_PAINT,
      });
      map.addLayer({
        id: ENERGY_SUBJECT_POLYGON_HIT_LAYER_ID,
        type: "fill",
        source: ENERGY_SUBJECT_SOURCE_ID,
        filter: POLYGON_FILTER,
        paint: ENERGY_SUBJECT_POLYGON_HIT_PAINT,
      });
      map.addLayer({
        id: ENERGY_SUBJECT_OUTLINE_LAYER_ID,
        type: "line",
        source: ENERGY_SUBJECT_SOURCE_ID,
        filter: POLYGON_FILTER,
        paint: ENERGY_SUBJECT_OUTLINE_PAINT,
      });
      map.addLayer({
        id: ENERGY_SUBJECT_POINT_HIT_LAYER_ID,
        type: "circle",
        source: ENERGY_SUBJECT_SOURCE_ID,
        filter: POINT_FILTER,
        paint: ENERGY_SUBJECT_POINT_HIT_PAINT,
      });
      map.addLayer({
        id: ENERGY_SUBJECT_LABEL_LAYER_ID,
        type: "symbol",
        source: ENERGY_SUBJECT_SOURCE_ID,
        minzoom: 15,
        layout: {
          "text-field": [
            "coalesce",
            ["get", "officialCode"],
            ["get", "shortName"],
          ],
          "text-size": ["case", ["get", "selected"], 13, 11],
          "text-offset": [0, 0.75],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.25,
        },
      });

      [
        ENERGY_SUBJECT_EXTRUSION_LAYER_ID,
        ENERGY_SUBJECT_POLYGON_HIT_LAYER_ID,
        ENERGY_SUBJECT_POINT_HIT_LAYER_ID,
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

    mapRef.current.flyTo({
      center: selectedSubjectCenter,
      zoom,
      pitch: school.pitch,
      curve: 1.25,
      duration: 900,
      essential: true,
    });
  }, [school.pitch, selectedSubject]);

  if (!mapboxToken) {
    return (
      <div className="flex h-full min-h-[28rem] items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-sm border border-white/15 bg-white/10 p-5">
          <h2 className="font-semibold">{messages.map.missingTokenTitle}</h2>
          <p className="mt-2 text-sm text-white/70">
            {messages.map.missingTokenDescription}
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full min-h-[28rem] w-full" />;
}
