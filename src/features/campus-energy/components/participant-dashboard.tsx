import {
  demoGroups,
  demoParticipant,
  getDemoGroupRankings,
} from "../data/demo-campus";
import { getCharacterProgress } from "../domain/scoring";
import { CharacterCard } from "./character-card";
import { GroupRankTable } from "./group-rank-table";
import { MetricCard } from "./metric-card";

export function ParticipantDashboard() {
  const groupRankings = getDemoGroupRankings();
  const myGroup = demoGroups.find(
    (group) => group.id === demoParticipant.groupId,
  );
  const myRanking = groupRankings.find(
    (ranking) => ranking.subjectId === demoParticipant.groupId,
  );
  const points = myRanking?.points ?? 0;
  const progress = getCharacterProgress(points);

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_24rem]">
      <section className="grid content-start gap-4">
        <div className="border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-blue-700">
            My affiliation
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {myGroup?.name ?? "Unassigned"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Points come from electricity saved against the forecast baseline.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="My points"
            value={points.toLocaleString()}
            tone="saving"
          />
          <MetricCard
            label="Saved energy"
            value={`${myRanking?.savingsKwh.toLocaleString() ?? "0"} kWh`}
            tone="saving"
          />
          <MetricCard label="Rank" value={`#${myRanking?.rank ?? "-"}`} />
        </div>
        <GroupRankTable
          groups={demoGroups}
          rankings={groupRankings}
          selectedGroupId={demoParticipant.groupId}
        />
      </section>
      <aside>
        <CharacterCard progress={progress} points={points} />
      </aside>
    </div>
  );
}
