"use client";

import { useI18n } from "@/i18n/client";
import { formatKwh, formatSignedKwh } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
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
  const { locale, messages } = useI18n();
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
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">
          {messages.admin.buildingDiagnosis}
        </h2>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {rows.map(({ subject, comparison }) => {
          const selected = selectedSubjectId === subject.id;
          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onSelectSubject(subject.id)}
              className={`grid w-full grid-cols-[3px_1fr_auto] items-center gap-3 border-b border-line/60 py-3 pr-4 text-left transition ${
                selected ? "bg-accent-soft" : "hover:bg-surface-3"
              }`}
            >
              <span
                className={`h-full w-[3px] rounded-r ${
                  selected ? "bg-accent" : "bg-transparent"
                }`}
                aria-hidden="true"
              />
              <span className="min-w-0 pl-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {subject.name}
                </span>
                <span className="mt-1 block text-xs text-ink-subtle">
                  {interpolate(messages.admin.actualForecastLine, {
                    actual: formatKwh(locale, comparison.actualKwh),
                    forecast: formatKwh(locale, comparison.forecastKwh),
                  })}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1.5">
                <StatusBadge status={comparison.status} />
                <span className="text-xs tabular-nums text-ink-muted">
                  {formatSignedKwh(locale, comparison.deltaKwh)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
