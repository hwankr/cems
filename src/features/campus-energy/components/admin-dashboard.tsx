"use client";

import { Activity, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import { useTheme } from "@/features/theme/theme-provider";
import { useI18n } from "@/i18n/client";
import { formatKwh } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import { summarizeEnergy } from "../domain/energy";
import type { EnergyComparison, EnergySubject, School } from "../domain/types";
import { BuildingRankTable } from "./building-rank-table";
import { CampusMap } from "./campus-map";
import { MetricCard } from "./metric-card";

const MAP_STYLES = {
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
} as const;

type AdminDashboardProps = {
  mapboxToken: string;
  school: School;
  subjects: EnergySubject[];
  comparisons: EnergyComparison[];
  selectedSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
};

export function AdminDashboard(props: AdminDashboardProps) {
  const { locale, messages } = useI18n();
  const { resolvedTheme } = useTheme();
  const summary = summarizeEnergy(props.comparisons);
  const selectedComparison = props.comparisons.find(
    (item) => item.subjectId === props.selectedSubjectId,
  );
  const selectedSubject = props.subjects.find(
    (item) => item.id === props.selectedSubjectId,
  );
  const selectedDeltaText =
    selectedComparison &&
    interpolate(
      selectedComparison.status === "overuse"
        ? messages.admin.selectedDeltaAbove
        : messages.admin.selectedDeltaBelow,
      {
        value: formatKwh(locale, Math.abs(selectedComparison.deltaKwh)),
      },
    );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-6">
      <div className="min-w-0">
        <CampusMap {...props} mapStyleUrl={MAP_STYLES[resolvedTheme]} />
      </div>
      <aside className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label={messages.admin.metrics.actual}
            value={formatKwh(locale, summary.actualKwh)}
            icon={<Gauge size={15} aria-hidden="true" />}
          />
          <MetricCard
            label={messages.admin.metrics.forecast}
            value={formatKwh(locale, summary.forecastKwh)}
            tone="accent"
            icon={<Activity size={15} aria-hidden="true" />}
          />
          <MetricCard
            label={messages.admin.metrics.saved}
            value={formatKwh(locale, summary.savingsKwh)}
            tone="saving"
            icon={<TrendingDown size={15} aria-hidden="true" />}
          />
          <MetricCard
            label={messages.admin.metrics.overuse}
            value={formatKwh(locale, summary.overuseKwh)}
            tone="overuse"
            icon={<TrendingUp size={15} aria-hidden="true" />}
          />
        </div>
        <BuildingRankTable
          subjects={props.subjects}
          comparisons={props.comparisons}
          selectedSubjectId={props.selectedSubjectId}
          onSelectSubject={props.onSelectSubject}
        />
        {selectedSubject && selectedComparison && selectedDeltaText ? (
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {messages.admin.selectedSubject}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ink">
              {selectedSubject.name}
            </h2>
            <p
              className={`mt-2 text-sm ${
                selectedComparison.status === "overuse"
                  ? "text-overuse"
                  : "text-saving"
              }`}
            >
              {selectedDeltaText}
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
