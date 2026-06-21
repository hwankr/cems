"use client";

import { useI18n } from "@/i18n/client";
import type { EnergyStatus } from "../domain/types";

export function StatusBadge({ status }: { status: EnergyStatus }) {
  const { messages } = useI18n();
  const config = {
    saving: "bg-emerald-100 text-emerald-800",
    neutral: "bg-slate-100 text-slate-700",
    overuse: "bg-rose-100 text-rose-800",
  }[status];

  return (
    <span className={`px-2 py-1 text-xs font-semibold ${config}`}>
      {messages.status[status]}
    </span>
  );
}
