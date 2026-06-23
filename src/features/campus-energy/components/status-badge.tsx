"use client";

import { useI18n } from "@/i18n/client";
import type { EnergyStatus } from "../domain/types";

export function StatusBadge({ status }: { status: EnergyStatus }) {
  const { messages } = useI18n();
  const config = {
    saving: "bg-saving-soft text-saving ring-saving/25",
    neutral: "bg-surface-3 text-ink-muted ring-line-strong",
    overuse: "bg-overuse-soft text-overuse ring-overuse/25",
  }[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${config}`}
    >
      {messages.status[status]}
    </span>
  );
}
