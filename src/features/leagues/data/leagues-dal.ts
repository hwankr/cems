import "server-only";
import { cache } from "react";
import { createServerSupabaseClient } from "@/features/account/supabase/server";
import { groupLeagueAwards, shapeStandings } from "../domain/standings";
import type {
  AwardTier,
  FinalizedLeague,
  LeagueAwardRow,
  LeagueAwards,
  LeagueSummary,
  LeagueStatus,
  LeagueStanding,
  LeagueStandingRow,
  MyLeagueAward,
  SubjectAwardTiers,
} from "../domain/types";

function asTier(value: string): AwardTier {
  return value === "silver" || value === "bronze" ? value : "gold";
}

export async function getLeagueStandings(
  leagueId: string,
): Promise<LeagueStanding[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_league_standings", {
    p_league_id: leagueId,
  });
  if (error) {
    throw new Error(`Failed to load league standings: ${error.message}`);
  }
  return shapeStandings((data ?? []) as LeagueStandingRow[]);
}

export async function getLeagueAwards(leagueId: string): Promise<LeagueAwards> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_league_awards", {
    p_league_id: leagueId,
  });
  if (error) {
    throw new Error(`Failed to load league awards: ${error.message}`);
  }
  return groupLeagueAwards((data ?? []) as LeagueAwardRow[]);
}

export async function getFinalizedLeagues(): Promise<FinalizedLeague[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("leagues")
    .select("id, name, starts_at, ends_at")
    .eq("status", "finalized")
    .order("ends_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to load finalized leagues: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
  }));
}

export async function getMyLeagueAwards(
  userId: string,
): Promise<MyLeagueAward[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("league_awards")
    .select("league_id, tier, rank, leagues!inner(name, ends_at)")
    .eq("award_type", "student")
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Failed to load my league awards: ${error.message}`);
  }
  return (data ?? [])
    .map((row) => {
      const league = row.leagues as unknown as {
        name: string;
        ends_at: string;
      };
      return {
        leagueId: row.league_id as string,
        leagueName: league?.name ?? (row.league_id as string),
        tier: asTier(row.tier as string),
        rank: row.rank as number,
        endsAt: league?.ends_at ?? "",
      };
    })
    .sort((a, b) => (a.endsAt < b.endsAt ? 1 : a.endsAt > b.endsAt ? -1 : 0))
    .map((row) => ({
      leagueId: row.leagueId,
      leagueName: row.leagueName,
      tier: row.tier,
      rank: row.rank,
    }));
}

type LeagueRow = {
  id: string;
  name: string;
  scope: string;
  status: string;
  starts_at: string;
  ends_at: string;
  is_open: boolean;
};

function shapeLeague(row: LeagueRow): LeagueSummary {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope === "school" ? "school" : "group",
    status:
      row.status === "active" || row.status === "finalized"
        ? (row.status as LeagueStatus)
        : "upcoming",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isOpen: Boolean(row.is_open),
  };
}

const LEAGUE_COLUMNS = "id, name, scope, status, starts_at, ends_at, is_open";

export async function getMyGroupLeagues(
  groupId: string,
): Promise<LeagueSummary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("league_participants")
    .select(`leagues!inner(${LEAGUE_COLUMNS})`)
    .eq("competitor_kind", "group")
    .eq("competitor_id", groupId);
  if (error) throw new Error(`Failed to load my group leagues: ${error.message}`);
  return (data ?? [])
    .map((row) => shapeLeague(row.leagues as unknown as LeagueRow))
    .sort((a, b) => (a.endsAt < b.endsAt ? 1 : a.endsAt > b.endsAt ? -1 : 0));
}

export async function getJoinableLeagues(
  groupId: string,
): Promise<LeagueSummary[]> {
  const supabase = await createServerSupabaseClient();
  const [openRes, mineRes] = await Promise.all([
    supabase
      .from("leagues")
      .select(LEAGUE_COLUMNS)
      .eq("is_open", true)
      .in("status", ["upcoming", "active"])
      .order("ends_at", { ascending: true }),
    supabase
      .from("league_participants")
      .select("league_id")
      .eq("competitor_kind", "group")
      .eq("competitor_id", groupId),
  ]);
  if (openRes.error)
    throw new Error(`Failed to load open leagues: ${openRes.error.message}`);
  if (mineRes.error)
    throw new Error(`Failed to load my participations: ${mineRes.error.message}`);
  const mine = new Set((mineRes.data ?? []).map((r) => r.league_id as string));
  return (openRes.data ?? [])
    .map((row) => shapeLeague(row as LeagueRow))
    .filter((league) => !mine.has(league.id));
}

export const getLeague = cache(
  async (leagueId: string): Promise<LeagueSummary | null> => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("leagues")
      .select(LEAGUE_COLUMNS)
      .eq("id", leagueId)
      .maybeSingle();
    if (error) throw new Error(`Failed to load league: ${error.message}`);
    return data ? shapeLeague(data as LeagueRow) : null;
  },
);

export async function getLeagueParticipantCount(
  leagueId: string,
): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("league_participants")
    .select("*", { count: "exact", head: true })
    .eq("league_id", leagueId);
  if (error)
    throw new Error(`Failed to count participants: ${error.message}`);
  return count ?? 0;
}

export async function getSubjectAwardTiers(): Promise<SubjectAwardTiers> {
  const supabase = await createServerSupabaseClient();

  const { data: leagueRows, error: leagueError } = await supabase
    .from("leagues")
    .select("id, name")
    .eq("status", "finalized")
    .order("ends_at", { ascending: false })
    .limit(1);
  if (leagueError) {
    throw new Error(`Failed to load latest league: ${leagueError.message}`);
  }
  const latest = (leagueRows ?? [])[0] as
    | { id: string; name: string }
    | undefined;
  if (!latest) return {};

  const { data: awardRows, error: awardError } = await supabase
    .from("league_awards")
    .select("tier, competitor_id")
    .eq("league_id", latest.id)
    .eq("award_type", "team");
  if (awardError) {
    throw new Error(`Failed to load league team awards: ${awardError.message}`);
  }

  const { data: subjectRows, error: subjectError } = await supabase
    .from("estate_subjects")
    .select("subject_id, owner_group_id");
  if (subjectError) {
    throw new Error(`Failed to load estate subjects: ${subjectError.message}`);
  }

  const tierByGroup = new Map<string, AwardTier>();
  for (const row of awardRows ?? []) {
    if (row.competitor_id) {
      tierByGroup.set(row.competitor_id as string, asTier(row.tier as string));
    }
  }

  const result: SubjectAwardTiers = {};
  for (const row of subjectRows ?? []) {
    const tier = tierByGroup.get(row.owner_group_id as string);
    if (tier) {
      result[row.subject_id as string] = {
        tier,
        leagueId: latest.id,
        leagueName: latest.name,
      };
    }
  }
  return result;
}
