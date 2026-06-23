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
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">
          {messages.participant.affiliationRanking}
        </h2>
      </div>
      {rankings.map((ranking) => {
        const group = groups.find((item) => item.id === ranking.subjectId);
        if (!group) return null;

        const selected = selectedGroupId === group.id;
        return (
          <div
            key={group.id}
            className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-line/60 px-4 py-3 ${
              selected ? "bg-accent-soft" : ""
            }`}
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-3 text-xs font-semibold tabular-nums text-ink-muted">
              {ranking.rank}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">
                {group.name}
              </span>
              <span className="block text-xs text-ink-subtle">
                {interpolate(messages.participant.savedLine, {
                  value: formatKwh(locale, ranking.savingsKwh),
                })}
              </span>
            </span>
            <span className="text-sm font-semibold tabular-nums text-saving">
              {formatPoints(locale, ranking.points)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
