"use client";

import { useI18n } from "@/i18n/client";
import { formatKwh, formatPoints } from "@/i18n/format";
import {
  getDemoGroupRankings,
} from "../data/demo-campus";
import type { AffiliationGroup, ParticipantProfile } from "../domain/types";
import { getCharacterProgress } from "../domain/scoring";
import { CharacterCard } from "./character-card";
import { GroupRankTable } from "./group-rank-table";
import { MetricCard } from "./metric-card";

type ParticipantDashboardProps = {
  groups: AffiliationGroup[];
  participant: ParticipantProfile;
};

export function ParticipantDashboard({
  groups,
  participant,
}: ParticipantDashboardProps) {
  const { locale, messages } = useI18n();
  const groupRankings = getDemoGroupRankings();
  const myGroup = groups.find((group) => group.id === participant.groupId);
  const myRanking = groupRankings.find(
    (ranking) => ranking.subjectId === participant.groupId,
  );
  const points = myRanking?.points ?? 0;
  const progress = getCharacterProgress(points);

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_24rem]">
      <section className="grid content-start gap-4">
        <div className="border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-blue-700">
            {messages.participant.myAffiliation}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {myGroup?.name ?? messages.participant.unassigned}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {messages.participant.pointsDescription}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label={messages.participant.myPoints}
            value={formatPoints(locale, points)}
            tone="saving"
          />
          <MetricCard
            label={messages.participant.savedEnergy}
            value={formatKwh(locale, myRanking?.savingsKwh ?? 0)}
            tone="saving"
          />
          <MetricCard
            label={messages.participant.rank}
            value={`#${myRanking?.rank ?? "-"}`}
          />
        </div>
        <GroupRankTable
          groups={groups}
          rankings={groupRankings}
          selectedGroupId={participant.groupId}
        />
      </section>
      <aside>
        <CharacterCard progress={progress} points={points} />
      </aside>
    </div>
  );
}
