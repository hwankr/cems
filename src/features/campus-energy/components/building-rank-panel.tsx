"use client";

import { BarChart3, ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import type { EnergyComparison, EnergySubject } from "../domain/types";
import { STATUS_COLOR } from "./status-color";

type BuildingRankPanelProps = {
  subjects: EnergySubject[];
  comparisons: EnergyComparison[];
  selectedSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
  open: boolean;
  onToggle: () => void;
  query: string;
  variant?: "floating" | "sheet";
};

function matches(subject: EnergySubject, query: string) {
  return (
    subject.name.toLowerCase().includes(query) ||
    subject.shortName.toLowerCase().includes(query) ||
    (subject.officialCode?.toLowerCase().includes(query) ?? false)
  );
}

export function BuildingRankPanel({
  subjects,
  comparisons,
  selectedSubjectId,
  onSelectSubject,
  open,
  onToggle,
  query,
  variant = "floating",
}: BuildingRankPanelProps) {
  const { locale, messages } = useI18n();

  const rows = useMemo(() => {
    const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));
    const normalized = query.trim().toLowerCase();

    return comparisons
      .map((comparison) => ({
        comparison,
        subject: subjectsById.get(comparison.subjectId),
      }))
      .filter(
        (
          row,
        ): row is { comparison: EnergyComparison; subject: EnergySubject } =>
          Boolean(row.subject),
      )
      .filter(({ subject }) => !normalized || matches(subject, normalized))
      .map((row) => ({
        ...row,
        signedRate:
          row.comparison.forecastKwh > 0
            ? (row.comparison.forecastKwh - row.comparison.actualKwh) /
              row.comparison.forecastKwh
            : 0,
      }))
      .sort((a, b) => b.signedRate - a.signedRate)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [comparisons, query, subjects]);

  const isSheet = variant === "sheet";

  return (
    <div
      className={
        isSheet
          ? "w-full overflow-hidden rounded-t-2xl border-t border-line bg-surface shadow-pop"
          : "w-[19.5rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
      }
    >
      {isSheet ? (
        <div className="flex justify-center pt-2" aria-hidden="true">
          <span className="h-1 w-9 rounded-full bg-line-strong" />
        </div>
      ) : null}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <BarChart3 size={16} className="text-accent" aria-hidden="true" />
          <span className="text-[13px] font-bold text-ink">
            {messages.mapView.rankTitle}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`text-ink-subtle transition-transform ${
            open ? "" : "-rotate-180"
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        className={`overflow-y-auto${
          isSheet ? "" : " transition-[max-height] duration-300"
        }`}
        // Driven via inline style: Tailwind v4 JIT does not reliably generate
        // arbitrary viewport-unit max-heights (e.g. max-h-[45vh]) in this repo,
        // so the value is set directly to guarantee the sheet actually expands.
        // The sheet also skips the max-height transition (a 0→vh transition
        // animates unreliably here and can stick at 0); the desktop floating
        // panel keeps its original animated collapse.
        style={{ maxHeight: open ? (isSheet ? "45vh" : "19rem") : "0px" }}
      >
        <div className="mx-4 h-px bg-line" aria-hidden="true" />
        {rows.map(({ subject, comparison, signedRate, rank }) => {
          const selected = subject.id === selectedSubjectId;
          const color = STATUS_COLOR[comparison.status].base;
          const rateText = `${signedRate >= 0 ? "+" : "−"}${Math.abs(
            signedRate * 100,
          ).toFixed(1)}%`;
          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onSelectSubject(subject.id)}
              className={`flex w-full items-center gap-2.5 border-l-[3px] px-3.5 py-2.5 text-left transition ${
                selected
                  ? "border-accent bg-accent-soft"
                  : "border-transparent hover:bg-surface-3"
              }`}
            >
              <span className="w-4 text-xs font-bold tabular-nums text-ink-subtle">
                {rank}
              </span>
              <span
                className="h-2 w-2 flex-none rounded-full"
                style={{ background: color }}
                aria-hidden="true"
              />
              <span className="flex-1 truncate text-[13px] font-semibold text-ink">
                {subject.name}
              </span>
              <span className="text-xs tabular-nums text-ink-subtle">
                {formatNumber(locale, comparison.actualKwh)}
              </span>
              <span
                className="w-[3.25rem] text-right text-xs font-bold tabular-nums"
                style={{ color }}
              >
                {rateText}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
