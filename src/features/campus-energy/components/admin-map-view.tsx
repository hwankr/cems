"use client";

import { useMemo, useRef, useState } from "react";
import { useTheme } from "@/features/theme/theme-provider";
import { buildBuildingDetail } from "../domain/building-detail";
import { summarizeEnergy } from "../domain/energy";
import type { EnergyComparison, EnergySubject, School } from "../domain/types";
import { BuildingPopup } from "./building-popup";
import { BuildingRankPanel } from "./building-rank-panel";
import {
  CampusMap,
  type CampusMapHandle,
  type ScreenPosition,
} from "./campus-map";
import { MapControls } from "./map-controls";
import { MapLegend } from "./map-legend";
import { MapSettingsPopover } from "./map-settings-popover";
import { MapSummaryChips } from "./map-summary-chips";
import { MapTopBar } from "./map-top-bar";
import { ProfileChip } from "./profile-chip";

// Mapbox Standard gives the 3D buildings/trees + atmospheric sky; the light
// preset is driven by the active theme (day vs night).
const STANDARD_MAP_STYLE = "mapbox://styles/mapbox/standard";

type Mode = "admin" | "participant";

type AdminMapViewProps = {
  mapboxToken: string;
  account: { displayName: string; personalPoints: number };
  school: School;
  subjects: EnergySubject[];
  comparisons: EnergyComparison[];
  selectedSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export function AdminMapView({
  mapboxToken,
  account,
  school,
  subjects,
  comparisons,
  selectedSubjectId,
  onSelectSubject,
  mode,
  onModeChange,
}: AdminMapViewProps) {
  const { resolvedTheme } = useTheme();
  const mapHandle = useRef<CampusMapHandle>(null);
  const [query, setQuery] = useState("");
  const [showHeat, setShowHeat] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [rankOpen, setRankOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState<ScreenPosition | null>(
    null,
  );

  const summary = useMemo(() => summarizeEnergy(comparisons), [comparisons]);
  const selectedSubject = subjects.find(
    (subject) => subject.id === selectedSubjectId,
  );
  const selectedComparison = comparisons.find(
    (comparison) => comparison.subjectId === selectedSubjectId,
  );
  const selectedDetail = useMemo(
    () =>
      selectedSubject
        ? buildBuildingDetail(selectedSubject, selectedComparison)
        : null,
    [selectedSubject, selectedComparison],
  );

  return (
    <div className="absolute inset-0 overflow-hidden bg-canvas">
      <CampusMap
        ref={mapHandle}
        mapboxToken={mapboxToken}
        school={school}
        subjects={subjects}
        comparisons={comparisons}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={onSelectSubject}
        mapStyleUrl={STANDARD_MAP_STYLE}
        mapTheme={resolvedTheme}
        showHeat={showHeat}
        showLabels={showLabels}
        query={query}
        onSelectedScreenPositionChange={setPopupPosition}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto">
          <MapTopBar
            query={query}
            onQueryChange={setQuery}
            schoolName={school.name}
          />
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <MapSummaryChips summary={summary} />
          <ProfileChip
            displayName={account.displayName}
            personalPoints={account.personalPoints}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
        <div className="pointer-events-auto">
          <MapControls
            onZoomIn={() => mapHandle.current?.zoomIn()}
            onZoomOut={() => mapHandle.current?.zoomOut()}
            onResetView={() => {
              onSelectSubject("");
              setPopupPosition(null);
              mapHandle.current?.resetView();
            }}
            showHeat={showHeat}
            onToggleHeat={() => setShowHeat((value) => !value)}
            showLabels={showLabels}
            onToggleLabels={() => setShowLabels((value) => !value)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
      </div>

      <div className="absolute bottom-4 right-4">
        <MapLegend />
      </div>

      <div className="absolute bottom-4 left-4">
        <BuildingRankPanel
          subjects={subjects}
          comparisons={comparisons}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={onSelectSubject}
          open={rankOpen}
          onToggle={() => setRankOpen((value) => !value)}
          query={query}
        />
      </div>

      {selectedSubject && selectedDetail && popupPosition ? (
        <div
          className="pointer-events-none absolute z-[55] w-[344px]"
          style={{ left: popupPosition.left, top: popupPosition.top }}
        >
          <BuildingPopup
            subject={selectedSubject}
            comparison={selectedComparison}
            detail={selectedDetail}
            campusName={school.name}
            onClose={() => onSelectSubject("")}
          />
        </div>
      ) : null}

      <MapSettingsPopover
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        mode={mode}
        onModeChange={onModeChange}
      />
    </div>
  );
}
