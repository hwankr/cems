"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import { TIER_PALETTE } from "../domain/award-tier";
import { competitorLabel } from "../domain/competitor-label";
import { tierForRank } from "../domain/standings";
import type { LeagueStanding } from "../domain/types";

export function LeagueStandingsTable({
  standings,
  myCompetitorId,
}: {
  standings: LeagueStanding[];
  myCompetitorId: string | null;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.leagues.standings;
  const groupLabels = messages.demo.groups;

  if (standings.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-ink-subtle">{copy.empty}</p>;
  }

  return (
    <ol className="flex flex-col gap-1.5">
      {standings.map((row) => {
        const tier = tierForRank(row.rank);
        const palette = tier ? TIER_PALETTE[tier] : null;
        const isMe = row.competitorId === myCompetitorId;
        return (
          <li
            key={row.competitorId}
            data-competitor={row.competitorId}
            data-me={isMe ? "true" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${isMe ? "bg-accent-soft" : "bg-inset"}`}
          >
            <span
              className="grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-bold"
              style={
                (palette
                  ? { background: palette.soft, color: palette.text }
                  : { background: "var(--color-surface-3)", color: "var(--color-ink-subtle)" }) as CSSProperties
              }
            >
              {row.rank}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
              {competitorLabel(groupLabels, row.competitorId, row.competitorName)}
              {isMe ? <span className="ml-1.5 text-[11px] font-medium text-accent">· {copy.you}</span> : null}
            </span>
            <span className="flex-none text-right text-xs text-ink-subtle">
              <span className="font-semibold text-ink">{formatNumber(locale, Math.round(row.avgPoints))}</span>
              <span className="ml-1">{copy.avg}</span>
              <span className="ml-2 hidden sm:inline">{interpolate(copy.members, { count: formatNumber(locale, row.memberCount) })}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
