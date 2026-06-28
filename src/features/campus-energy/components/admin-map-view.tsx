"use client";

import { useMemo, useState } from "react";
import { useTheme } from "@/features/theme/theme-provider";
import { useI18n } from "@/i18n/client";
import { buildBuildingDetail } from "../domain/building-detail";
import { summarizeEnergy } from "../domain/energy";
import type { SubjectContributorRankings } from "@/features/account/domain/contributor-ranking";
import type { SubjectAwardTiers } from "@/features/leagues/domain/types";
import type { EnergyComparison, EnergySubject, School } from "../domain/types";
import { BuildingPopup } from "./building-popup";
import { BuildingRankPanel } from "./building-rank-panel";
import { CampusMap, type ScreenPosition } from "./campus-map";
import { MapControls } from "./map-controls";
import { MapLegend } from "./map-legend";
import { MapSettingsPopover } from "./map-settings-popover";
import { MapSummaryBar } from "./map-summary-bar";
import { MapSummaryChips } from "./map-summary-chips";
import { MapTopBar } from "./map-top-bar";

// Mapbox Standard gives the 3D buildings/trees + atmospheric sky; the light
// preset is driven by the active theme (day vs night).
const STANDARD_MAP_STYLE = "mapbox://styles/mapbox/standard";

type AdminMapViewProps = {
  mapboxToken: string;
  orgSubjectId: string | null;
  school: School;
  subjects: EnergySubject[];
  comparisons: EnergyComparison[];
  contributorRankings: SubjectContributorRankings;
  subjectAwardTiers: SubjectAwardTiers;
  selectedSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
};

export function AdminMapView({
  mapboxToken,
  orgSubjectId,
  school,
  subjects,
  comparisons,
  contributorRankings,
  subjectAwardTiers,
  selectedSubjectId,
  onSelectSubject,
}: AdminMapViewProps) {
  const { resolvedTheme } = useTheme();
  const { locale } = useI18n();
  const [query, setQuery] = useState("");
  const [showLabels, setShowLabels] = useState(true);
  const [rankOpen, setRankOpen] = useState(true);
  const [rankOpenMobile, setRankOpenMobile] = useState(false);
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

  const selectedContributors = contributorRankings[selectedSubjectId] ?? [];

  return (
    <div className="absolute inset-0 overflow-hidden bg-canvas">
      <CampusMap
        mapboxToken={mapboxToken}
        school={school}
        subjects={subjects}
        comparisons={comparisons}
        subjectAwardTiers={subjectAwardTiers}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={onSelectSubject}
        mapStyleUrl={STANDARD_MAP_STYLE}
        mapTheme={resolvedTheme}
        showLabels={showLabels}
        query={query}
        onSelectedScreenPositionChange={setPopupPosition}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="pointer-events-auto min-w-0 flex-1 sm:flex-none">
            <MapTopBar
              query={query}
              onQueryChange={setQuery}
              schoolName={school.name}
            />
          </div>
          <div className="pointer-events-auto hidden flex-col items-end gap-2 sm:flex">
            <MapSummaryChips summary={summary} />
          </div>
        </div>
        <div className="pointer-events-auto mt-2 sm:hidden">
          <MapSummaryBar summary={summary} />
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
        <div className="pointer-events-auto">
          <MapControls
            onGoToMyOrg={
              orgSubjectId ? () => onSelectSubject(orgSubjectId) : undefined
            }
            profileHref={`/${locale}/me`}
            hallOfFameHref={`/${locale}/hall-of-fame`}
            showLabels={showLabels}
            onToggleLabels={() => setShowLabels((value) => !value)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
      </div>

      <div className="absolute bottom-4 right-4 hidden sm:block">
        <MapLegend />
      </div>

      <div className="absolute bottom-4 left-4 hidden sm:block">
        <BuildingRankPanel
          subjects={subjects}
          comparisons={comparisons}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={onSelectSubject}
          open={rankOpen}
          onToggle={() => setRankOpen((value) => !value)}
          query={query}
          variant="floating"
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 sm:hidden">
        <BuildingRankPanel
          subjects={subjects}
          comparisons={comparisons}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={onSelectSubject}
          open={rankOpenMobile}
          onToggle={() => setRankOpenMobile((value) => !value)}
          query={query}
          variant="sheet"
        />
      </div>

      {selectedSubject && selectedDetail && popupPosition ? (
        <div
          className="cems-popup-anchor pointer-events-none"
          style={{ left: popupPosition.left, top: popupPosition.top }}
        >
          <BuildingPopup
            key={selectedSubject.id}
            subject={selectedSubject}
            comparison={selectedComparison}
            detail={selectedDetail}
            campusName={school.name}
            contributors={selectedContributors}
            onClose={() => onSelectSubject("")}
          />
        </div>
      ) : null}

      <MapSettingsPopover
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((value) => !value)}
      />
    </div>
  );
}
