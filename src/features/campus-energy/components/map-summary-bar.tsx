"use client";

import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import type { EnergySummary } from "../domain/types";
import { STATUS_COLOR } from "./status-color";

// Mobile-only one-line summary. Mirrors MapSummaryChips' sign logic (positive
// net = used less than forecast = a saving, shown with a leading "−"), but on a
// single no-wrap line so Korean labels never break one glyph per row.
export function MapSummaryBar({ summary }: { summary: EnergySummary }) {
  const { locale, messages } = useI18n();
  const net = summary.forecastKwh - summary.actualKwh;
  const saved = net >= 0;
  const netColor = saved ? STATUS_COLOR.saving.base : STATUS_COLOR.overuse.base;

  return (
    <div className="inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-surface/90 px-3 py-1.5 text-[12px] shadow-pop backdrop-blur">
      <span className="font-semibold text-ink-subtle">
        {messages.mapView.summaryRealtimeShort}
      </span>
      <span className="font-bold tabular-nums text-ink">
        {formatNumber(locale, summary.actualKwh)}
        <span className="ml-0.5 font-semibold text-ink-subtle">kWh</span>
      </span>
      <span className="h-3 w-px bg-line" aria-hidden="true" />
      <span className="font-semibold text-ink-subtle">
        {messages.mapView.summaryNetSavingShort}
      </span>
      <span className="font-bold tabular-nums" style={{ color: netColor }}>
        {saved ? "−" : "+"}
        {formatNumber(locale, Math.abs(net))}
        <span className="ml-0.5 font-semibold text-ink-subtle">kWh</span>
      </span>
    </div>
  );
}
