import type {
  AwardTier,
  LeagueAwardRow,
  LeagueAwards,
  LeagueStanding,
  LeagueStandingRow,
  StudentAward,
  TeamAward,
} from "./types";

const TIER_BY_RANK: Record<number, AwardTier> = {
  1: "gold",
  2: "silver",
  3: "bronze",
};

export function tierForRank(rank: number): AwardTier | null {
  return TIER_BY_RANK[rank] ?? null;
}

export function shapeStandings(
  rows: readonly LeagueStandingRow[],
): LeagueStanding[] {
  return rows.map((row) => ({
    competitorKind: row.competitor_kind === "school" ? "school" : "group",
    competitorId: row.competitor_id,
    competitorName: row.competitor_name,
    memberCount: row.member_count,
    totalPoints: row.total_points,
    avgPoints: row.avg_points,
    rank: row.rank,
  }));
}

export function groupLeagueAwards(
  rows: readonly LeagueAwardRow[],
): LeagueAwards {
  const teams: TeamAward[] = [];
  const students: StudentAward[] = [];

  for (const row of rows) {
    const tier = (
      row.tier === "silver" || row.tier === "bronze" ? row.tier : "gold"
    ) as AwardTier;

    if (row.award_type === "student" && row.user_id) {
      students.push({
        tier,
        rank: row.rank,
        userId: row.user_id,
        displayName: row.display_name ?? row.user_id,
        metricValue: row.metric_value,
      });
    } else if (row.award_type === "team" && row.competitor_id) {
      teams.push({
        tier,
        rank: row.rank,
        competitorId: row.competitor_id,
        competitorName: row.competitor_name ?? row.competitor_id,
        metricValue: row.metric_value,
      });
    }
  }

  teams.sort((a, b) => a.rank - b.rank);
  students.sort((a, b) => a.rank - b.rank);
  return { teams, students };
}
