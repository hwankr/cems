"use client";

import { Coins, Leaf, Trophy } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatKwh, formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import { ClaimRewardButton } from "@/features/account/components/claim-reward-button";
import { getDemoGroupRankings } from "../data/demo-campus";
import type { AffiliationGroup, ParticipantProfile } from "../domain/types";
import { getCharacterProgress } from "../domain/scoring";
import { CharacterCard } from "./character-card";
import { GroupRankTable } from "./group-rank-table";
import { MetricCard } from "./metric-card";

type ParticipantDashboardProps = {
  groups: AffiliationGroup[];
  participant: ParticipantProfile;
  personalPoints: number;
  groupPoolPoints: number;
  groupMemberCount: number;
};

export function ParticipantDashboard({
  groups,
  participant,
  personalPoints,
  groupPoolPoints,
  groupMemberCount,
}: ParticipantDashboardProps) {
  const { locale, messages } = useI18n();
  const groupRankings = getDemoGroupRankings();
  const myGroup = groups.find((group) => group.id === participant.groupId);
  const myRanking = groupRankings.find(
    (ranking) => ranking.subjectId === participant.groupId,
  );
  const progress = getCharacterProgress(personalPoints);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-6">
      <section className="grid content-start gap-4">
        <div className="rounded-2xl border border-line bg-gradient-to-br from-accent-soft to-surface p-5 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            {messages.participant.myAffiliation}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            {myGroup?.name ?? messages.participant.unassigned}
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            {messages.participant.pointsDescription}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                {messages.account.estatePool.label}
              </p>
              <p className="mt-0.5 flex items-baseline gap-2">
                <span className="text-xl font-semibold tabular-nums text-ink">
                  {formatPoints(locale, groupPoolPoints)}
                </span>
                <span className="text-xs text-ink-muted">
                  {interpolate(messages.account.estatePool.memberCount, {
                    count: groupMemberCount,
                  })}
                </span>
              </p>
            </div>
            <ClaimRewardButton />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label={messages.participant.myPoints}
            value={formatPoints(locale, personalPoints)}
            tone="saving"
            icon={<Coins size={15} aria-hidden="true" />}
          />
          <MetricCard
            label={messages.participant.savedEnergy}
            value={formatKwh(locale, myRanking?.savingsKwh ?? 0)}
            tone="saving"
            icon={<Leaf size={15} aria-hidden="true" />}
          />
          <MetricCard
            label={messages.participant.rank}
            value={`#${myRanking?.rank ?? "-"}`}
            tone="accent"
            icon={<Trophy size={15} aria-hidden="true" />}
          />
        </div>
        <GroupRankTable
          groups={groups}
          rankings={groupRankings}
          selectedGroupId={participant.groupId}
        />
      </section>
      <aside>
        <CharacterCard progress={progress} points={personalPoints} />
      </aside>
    </div>
  );
}
