"use client";

import { useI18n } from "@/i18n/client";
import type { EnergyStatus } from "../domain/types";
import { STATUS_COLOR } from "./status-color";

const LEGEND_ORDER: EnergyStatus[] = ["saving", "neutral", "overuse"];

export function MapLegend() {
  const { messages } = useI18n();

  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-line-strong bg-surface/80 px-3.5 py-2 shadow-pop backdrop-blur">
      {LEGEND_ORDER.map((status) => (
        <span
          key={status}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: STATUS_COLOR[status].base }}
            aria-hidden="true"
          />
          {messages.status[status]}
        </span>
      ))}
    </div>
  );
}
