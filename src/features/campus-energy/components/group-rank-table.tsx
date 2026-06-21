"use client";

import { useI18n } from "@/i18n/client";
import { formatKwh, formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { AffiliationGroup, RankedEnergySubject } from "../domain/types";

type GroupRankTableProps = {
  groups: AffiliationGroup[];
  rankings: RankedEnergySubject[];
  selectedGroupId: string;
};

export function GroupRankTable({
  groups,
  rankings,
  selectedGroupId,
}: GroupRankTableProps) {
  const { locale, messages } = useI18n();

  return (
    <div className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-950">
          {messages.participant.affiliationRanking}
        </h2>
      </div>
      {rankings.map((ranking) => {
        const group = groups.find((item) => item.id === ranking.subjectId);
        if (!group) return null;

        return (
          <div
            key={group.id}
            className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 ${
              selectedGroupId === group.id ? "bg-blue-50" : ""
            }`}
          >
            <span className="text-sm font-semibold text-slate-500">
              #{ranking.rank}
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-950">
                {group.name}
              </span>
              <span className="block text-xs text-slate-500">
                {interpolate(messages.participant.savedLine, {
                  value: formatKwh(locale, ranking.savingsKwh),
                })}
              </span>
            </span>
            <span className="text-sm font-semibold text-emerald-700">
              {formatPoints(locale, ranking.points)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
