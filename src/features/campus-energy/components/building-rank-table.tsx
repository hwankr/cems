"use client";

import type { EnergyComparison, EnergySubject } from "../domain/types";
import { StatusBadge } from "./status-badge";

type BuildingRankTableProps = {
  subjects: EnergySubject[];
  comparisons: EnergyComparison[];
  selectedSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
};

export function BuildingRankTable({
  subjects,
  comparisons,
  selectedSubjectId,
  onSelectSubject,
}: BuildingRankTableProps) {
  const rows = comparisons
    .map((comparison) => ({
      comparison,
      subject: subjects.find((subject) => subject.id === comparison.subjectId),
    }))
    .filter(
      (row): row is { comparison: EnergyComparison; subject: EnergySubject } =>
        Boolean(row.subject),
    )
    .sort(
      (a, b) =>
        b.comparison.overuseKwh - a.comparison.overuseKwh ||
        b.comparison.savingsKwh - a.comparison.savingsKwh,
    );

  return (
    <div className="overflow-hidden border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-950">Building diagnosis</h2>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {rows.map(({ subject, comparison }) => (
          <button
            key={subject.id}
            type="button"
            onClick={() => onSelectSubject(subject.id)}
            className={`grid w-full grid-cols-[1fr_auto] gap-3 border-b border-slate-100 px-4 py-3 text-left ${
              selectedSubjectId === subject.id
                ? "bg-blue-50"
                : "hover:bg-slate-50"
            }`}
          >
            <span>
              <span className="block text-sm font-semibold text-slate-950">
                {subject.name}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Actual {comparison.actualKwh.toLocaleString()} kWh / Forecast{" "}
                {comparison.forecastKwh.toLocaleString()} kWh
              </span>
            </span>
            <span className="flex flex-col items-end gap-2">
              <StatusBadge status={comparison.status} />
              <span className="text-xs text-slate-500">
                {comparison.deltaKwh > 0 ? "+" : ""}
                {comparison.deltaKwh} kWh
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
