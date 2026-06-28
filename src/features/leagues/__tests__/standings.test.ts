import { describe, expect, it } from "vitest";
import {
  groupLeagueAwards,
  shapeStandings,
  tierForRank,
} from "../domain/standings";
import type { LeagueAwardRow, LeagueStandingRow } from "../domain/types";

const standingRow = (
  competitorId: string,
  rank: number,
  avg: number,
  total: number,
  members: number,
): LeagueStandingRow => ({
  competitor_kind: "group",
  competitor_id: competitorId,
  competitor_name: `${competitorId} name`,
  member_count: members,
  total_points: total,
  avg_points: avg,
  rank,
});

describe("tierForRank", () => {
  it("maps 1/2/3 to gold/silver/bronze and others to null", () => {
    expect(tierForRank(1)).toBe("gold");
    expect(tierForRank(2)).toBe("silver");
    expect(tierForRank(3)).toBe("bronze");
    expect(tierForRank(4)).toBeNull();
    expect(tierForRank(0)).toBeNull();
  });
});

describe("shapeStandings", () => {
  it("maps snake_case rows to camelCase, preserving order", () => {
    const result = shapeStandings([
      standingRow("student-services", 1, 1200, 6000, 5),
      standingRow("humanities", 2, 1100, 5500, 5),
    ]);
    expect(result).toEqual([
      {
        competitorKind: "group",
        competitorId: "student-services",
        competitorName: "student-services name",
        memberCount: 5,
        totalPoints: 6000,
        avgPoints: 1200,
        rank: 1,
      },
      {
        competitorKind: "group",
        competitorId: "humanities",
        competitorName: "humanities name",
        memberCount: 5,
        totalPoints: 5500,
        avgPoints: 1100,
        rank: 2,
      },
    ]);
  });
});

describe("groupLeagueAwards", () => {
  const teamRow = (
    competitorId: string,
    tier: string,
    rank: number,
  ): LeagueAwardRow => ({
    award_type: "team",
    tier,
    rank,
    competitor_id: competitorId,
    competitor_name: `${competitorId} name`,
    user_id: null,
    display_name: null,
    metric_value: 1200,
  });
  const studentRow = (userId: string, rank: number): LeagueAwardRow => ({
    award_type: "student",
    tier: "gold",
    rank,
    competitor_id: null,
    competitor_name: null,
    user_id: userId,
    display_name: `User ${userId}`,
    metric_value: 1600,
  });

  it("splits team and student awards into camelCase lists sorted by rank", () => {
    const result = groupLeagueAwards([
      studentRow("u2", 2),
      teamRow("humanities", "silver", 2),
      teamRow("student-services", "gold", 1),
      studentRow("u1", 1),
    ]);
    expect(result.teams.map((t) => t.competitorId)).toEqual([
      "student-services",
      "humanities",
    ]);
    expect(result.teams[0]).toEqual({
      tier: "gold",
      rank: 1,
      competitorId: "student-services",
      competitorName: "student-services name",
      metricValue: 1200,
    });
    expect(result.students.map((s) => s.userId)).toEqual(["u1", "u2"]);
    expect(result.students[0]).toEqual({
      tier: "gold",
      rank: 1,
      userId: "u1",
      displayName: "User u1",
      metricValue: 1600,
    });
  });

  it("returns empty lists for no rows", () => {
    expect(groupLeagueAwards([])).toEqual({ teams: [], students: [] });
  });
});
