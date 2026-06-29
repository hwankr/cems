"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { interpolate } from "@/i18n/interpolate";
import { formatNumber } from "@/i18n/format";
import type { LeagueSummary } from "../domain/types";
import { LeagueStatusBadge } from "./league-status-badge";

function shortDate(locale: string, iso: string): string {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function LeagueCard({
  league,
  participantCount,
  href,
  action,
}: {
  league: LeagueSummary;
  participantCount: number;
  href?: string;
  action?: ReactNode;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.leagues;

  const body = (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:bg-surface-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-bold text-ink">{league.name}</h3>
          <LeagueStatusBadge status={league.status} />
        </div>
        <p className="mt-0.5 text-[11px] text-ink-subtle">
          {interpolate(copy.period, { start: shortDate(locale, league.startsAt), end: shortDate(locale, league.endsAt) })}
          {" · "}
          {interpolate(copy.participants, { count: formatNumber(locale, participantCount) })}
        </p>
      </div>
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
