"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/i18n/client";
import type { LeagueStatus } from "../domain/types";

const TONE: Record<LeagueStatus, CSSProperties> = {
  active: { background: "var(--color-saving-soft)", color: "var(--color-saving)" },
  upcoming: { background: "var(--honey-soft)", color: "var(--honey-strong)" },
  finalized: { background: "var(--color-surface-3)", color: "var(--color-ink-subtle)" },
};

export function LeagueStatusBadge({ status }: { status: LeagueStatus }) {
  const { messages } = useI18n();
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={TONE[status]}
    >
      {messages.leagues.status[status]}
    </span>
  );
}
