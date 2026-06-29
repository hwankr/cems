"use client";

import { CalendarRange } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { interpolate } from "@/i18n/interpolate";
import type { FinalizedLeague, LeagueAwards } from "../domain/types";
import { AwardPodium } from "./award-podium";
import { StudentWinners } from "./student-winners";

function shortDate(locale: string, iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
  }).format(date);
}

export function LeagueHallSection({
  league,
  awards,
}: {
  league: FinalizedLeague;
  awards: LeagueAwards;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.hallOfFame;

  return (
    <section className="space-y-4">
      <header className="space-y-1.5">
        <h2 className="text-base font-bold text-ink">{league.name}</h2>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-ink-subtle">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
          {interpolate(copy.periodFormat, {
            start: shortDate(locale, league.startsAt),
            end: shortDate(locale, league.endsAt),
          })}
        </p>
      </header>

      <AwardPodium teams={awards.teams} />
      <StudentWinners students={awards.students} />
    </section>
  );
}
