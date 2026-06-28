"use client";

import { useI18n } from "@/i18n/client";
import { interpolate } from "@/i18n/interpolate";
import type { FinalizedLeague, LeagueAwards } from "../domain/types";
import { AwardPodium } from "./award-podium";

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
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <header className="mb-3">
        <h2 className="text-base font-bold text-ink">{league.name}</h2>
        <p className="text-xs text-ink-subtle">
          {interpolate(copy.periodFormat, {
            start: shortDate(locale, league.startsAt),
            end: shortDate(locale, league.endsAt),
          })}
        </p>
      </header>

      <AwardPodium teams={awards.teams} />

      {awards.students.length > 0 ? (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-ink">
            {copy.studentSectionTitle}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {awards.students.map((student) => (
              <li
                key={student.userId}
                className="flex items-center gap-1.5 rounded-full border border-[#f5c518] bg-[#fdf3cf] px-2.5 py-1"
              >
                <span className="text-[11px] font-bold text-[#a07a00]">
                  {student.rank}
                  {copy.rankUnit}
                </span>
                <span className="text-xs font-semibold text-ink">
                  {student.displayName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
