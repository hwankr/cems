"use client";

import { Medal } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { AwardTier, TeamAward } from "../domain/types";

const TIER_STYLE: Record<AwardTier, { ring: string; text: string }> = {
  gold: { ring: "border-[#f5c518] bg-[#fdf3cf]", text: "text-[#a07a00]" },
  silver: { ring: "border-[#c3cad3] bg-[#eef1f4]", text: "text-[#5b6470]" },
  bronze: { ring: "border-[#cd7f32] bg-[#f4e3d3]", text: "text-[#8a5320]" },
};

export function AwardPodium({ teams }: { teams: TeamAward[] }) {
  const { locale, messages } = useI18n();
  const copy = messages.hallOfFame;
  const tierLabel: Record<AwardTier, string> = {
    gold: copy.tierGold,
    silver: copy.tierSilver,
    bronze: copy.tierBronze,
  };

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink">
        {copy.teamSectionTitle}
      </h3>
      <ol className="flex flex-col gap-2">
        {teams.map((team) => {
          const style = TIER_STYLE[team.tier];
          return (
            <li
              key={team.competitorId}
              className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${style.ring}`}
            >
              <span
                className={`grid h-9 w-9 flex-none place-items-center rounded-full bg-surface ${style.text}`}
              >
                <Medal className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-bold text-ink">
                  {team.competitorName}
                </span>
                <span className={`text-[11px] font-semibold ${style.text}`}>
                  {tierLabel[team.tier]} · {team.rank}
                  {copy.rankUnit}
                </span>
              </span>
              {team.metricValue !== null ? (
                <span className="flex-none text-[11px] text-ink-subtle">
                  {interpolate(copy.avgPointsLabel, {
                    points: formatNumber(locale, Math.round(team.metricValue)),
                  })}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
