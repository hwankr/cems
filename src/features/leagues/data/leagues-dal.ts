import "server-only";
import { createServerSupabaseClient } from "@/features/account/supabase/server";
import { groupLeagueAwards, shapeStandings } from "../domain/standings";
import type {
  AwardTier,
  FinalizedLeague,
  LeagueAwardRow,
  LeagueAwards,
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
    .map(({ endsAt: _endsAt, ...rest }) => rest);
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
