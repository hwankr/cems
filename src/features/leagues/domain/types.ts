export type AwardTier = "gold" | "silver" | "bronze";
export type CompetitorKind = "group" | "school";

/** Raw row from get_league_standings RPC. */
export type LeagueStandingRow = {
  competitor_kind: string;
  competitor_id: string;
  competitor_name: string;
  member_count: number;
  total_points: number;
  avg_points: number;
  rank: number;
};

export type LeagueStanding = {
  competitorKind: CompetitorKind;
  competitorId: string;
  competitorName: string;
  memberCount: number;
  totalPoints: number;
  avgPoints: number;
  rank: number;
};

/** Raw row from get_league_awards RPC. */
export type LeagueAwardRow = {
  award_type: string;
  tier: string;
  rank: number;
  competitor_id: string | null;
  competitor_name: string | null;
  user_id: string | null;
  display_name: string | null;
  metric_value: number | null;
};

export type TeamAward = {
  tier: AwardTier;
  rank: number;
  competitorId: string;
  competitorName: string;
  metricValue: number | null;
};

export type StudentAward = {
  tier: AwardTier;
  rank: number;
  userId: string;
  displayName: string;
  metricValue: number | null;
};

export type LeagueAwards = {
  teams: TeamAward[];
  students: StudentAward[];
};

/** A finalized league (table read). */
export type FinalizedLeague = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

/** My student award (table read), for the /me badge (Plan B). */
export type MyLeagueAward = {
  leagueId: string;
  leagueName: string;
  tier: AwardTier;
  rank: number;
};

/** Per-subject award tier from the latest finalized league (Plan B map/estate). */
export type SubjectAwardTier = {
  tier: AwardTier;
  leagueId: string;
  leagueName: string;
};
export type SubjectAwardTiers = Record<string, SubjectAwardTier>;
