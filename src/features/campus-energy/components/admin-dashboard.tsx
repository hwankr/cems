"use client";

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
  const summary = summarizeEnergy(props.comparisons);
  const selectedComparison = props.comparisons.find(
    (item) => item.subjectId === props.selectedSubjectId,
  );
  const selectedSubject = props.subjects.find(
    (item) => item.id === props.selectedSubjectId,
  );

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_26rem]">
      <section className="overflow-hidden border border-slate-200 bg-white">
        <CampusMap {...props} />
      </section>
      <aside className="flex min-h-0 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Actual"
            value={`${summary.actualKwh.toLocaleString()} kWh`}
          />
          <MetricCard
            label="Forecast"
            value={`${summary.forecastKwh.toLocaleString()} kWh`}
          />
          <MetricCard
            label="Saved"
            value={`${summary.savingsKwh.toLocaleString()} kWh`}
            tone="saving"
          />
          <MetricCard
            label="Overuse"
            value={`${summary.overuseKwh.toLocaleString()} kWh`}
            tone="overuse"
          />
        </div>
        <BuildingRankTable
          subjects={props.subjects}
          comparisons={props.comparisons}
          selectedSubjectId={props.selectedSubjectId}
          onSelectSubject={props.onSelectSubject}
        />
        {selectedSubject && selectedComparison ? (
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Selected subject
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              {selectedSubject.name}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Actual usage is{" "}
              {Math.abs(selectedComparison.deltaKwh).toLocaleString()} kWh{" "}
              {selectedComparison.status === "overuse" ? "above" : "below"}{" "}
              forecast.
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
