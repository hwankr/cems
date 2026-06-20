"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef } from "react";
import type { EnergyComparison, EnergySubject, School } from "../domain/types";

type FeatureProperties = {
  properties?: Record<string, unknown> | null;
};

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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const selectedSubject = subjects.find(
    (subject) => subject.id === selectedSubjectId,
  );

  const featureCollection = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: subjects.map((subject) => {
        const comparison = comparisons.find(
          (item) => item.subjectId === subject.id,
        );
        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [subject.lng, subject.lat],
          },
          properties: {
            id: subject.id,
            name: subject.name,
            status: comparison?.status ?? "neutral",
            deltaKwh: comparison?.deltaKwh ?? 0,
          },
        };
      }),
    }),
    [comparisons, subjects],
  );

  function getFeatureStringProperty(
    feature: mapboxgl.GeoJSONFeature | undefined,
    key: string,
  ) {
    const value = (feature as FeatureProperties | undefined)?.properties?.[key];
    return typeof value === "string" ? value : null;
  }

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
      config: { basemap: { theme: "monochrome", lightPreset: "day" } },
    });

    mapRef.current = map;
    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "bottom-right",
    );

    map.on("load", () => {
      map.addSource("energy-subjects", {
        type: "geojson",
        data: featureCollection,
      });
      map.addLayer({
        id: "energy-subject-circles",
        type: "circle",
        source: "energy-subjects",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 7, 17, 14],
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
        },
      });
      map.addLayer({
        id: "energy-subject-labels",
        type: "symbol",
        source: "energy-subjects",
        minzoom: 15,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-offset": [0, 1.3],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.25,
        },
      });
      map.on("click", "energy-subject-circles", (event) => {
        const id = getFeatureStringProperty(event.features?.[0], "id");
        if (id) onSelectSubject(id);
      });
      map.on("mouseenter", "energy-subject-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "energy-subject-circles", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [
    featureCollection,
    mapboxToken,
    onSelectSubject,
    school.center,
    school.pitch,
    school.zoom,
  ]);

  useEffect(() => {
    if (!selectedSubject || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [selectedSubject.lng, selectedSubject.lat],
      zoom: 16.4,
      pitch: school.pitch,
      essential: true,
    });
  }, [school.pitch, selectedSubject]);

  if (!mapboxToken) {
    return (
      <div className="flex h-full min-h-[28rem] items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-sm border border-white/15 bg-white/10 p-5">
          <h2 className="font-semibold">Mapbox token required</h2>
          <p className="mt-2 text-sm text-white/70">
            Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full min-h-[28rem] w-full" />;
}
