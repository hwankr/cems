"use client";

import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import type { EnergySummary } from "../domain/types";
import { STATUS_COLOR } from "./status-color";

export function MapSummaryChips({ summary }: { summary: EnergySummary }) {
  const { locale, messages } = useI18n();
  // Positive net = used less than forecast (a saving). Mirrors the design: a
  // saving shows a leading "−" in green; an overuse shows "+" in rose.
  const net = summary.forecastKwh - summary.actualKwh;
  const saved = net >= 0;
  const netColor = saved ? STATUS_COLOR.saving.base : STATUS_COLOR.overuse.base;

  return (
    <div className="flex gap-2">
      <Chip
        label={messages.mapView.summaryRealtime}
        value={formatNumber(locale, summary.actualKwh)}
      />
      <Chip
        label={messages.mapView.summaryNetSaving}
        value={`${saved ? "−" : "+"}${formatNumber(locale, Math.abs(net))}`}
        valueColor={netColor}
      />
    </div>
  );
}

function Chip({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface/90 px-3.5 py-2 text-right shadow-pop backdrop-blur">
      <div className="text-[11px] font-semibold text-ink-subtle">{label}</div>
      <div
        className="text-[17px] font-extrabold tracking-tight text-ink tabular-nums"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}{" "}
        <span className="text-[11px] font-semibold text-ink-subtle">kWh</span>
      </div>
    </div>
  );
}
