"use client";

import { useI18n } from "@/i18n/client";
import { formatKwh } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import { summarizeEnergy } from "../domain/energy";
import type { EnergyComparison, EnergySubject, School } from "../domain/types";
import { BuildingRankTable } from "./building-rank-table";
import { CampusMap } from "./campus-map";
import { MetricCard } from "./metric-card";

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
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_26rem]">
      <section className="overflow-hidden border border-slate-200 bg-white">
        <CampusMap {...props} />
      </section>
      <aside className="flex min-h-0 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label={messages.admin.metrics.actual}
            value={formatKwh(locale, summary.actualKwh)}
          />
          <MetricCard
            label={messages.admin.metrics.forecast}
            value={formatKwh(locale, summary.forecastKwh)}
          />
          <MetricCard
            label={messages.admin.metrics.saved}
            value={formatKwh(locale, summary.savingsKwh)}
            tone="saving"
          />
          <MetricCard
            label={messages.admin.metrics.overuse}
            value={formatKwh(locale, summary.overuseKwh)}
            tone="overuse"
          />
        </div>
        <BuildingRankTable
          subjects={props.subjects}
          comparisons={props.comparisons}
          selectedSubjectId={props.selectedSubjectId}
          onSelectSubject={props.onSelectSubject}
        />
        {selectedSubject && selectedComparison && selectedDeltaText ? (
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              {messages.admin.selectedSubject}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              {selectedSubject.name}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {selectedDeltaText}
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
