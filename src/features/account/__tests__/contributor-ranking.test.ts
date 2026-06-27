import { describe, expect, it } from "vitest";
import {
  groupContributorRowsBySubject,
  type ContributorRow,
} from "../domain/contributor-ranking";

const row = (
  subjectId: string,
  userId: string,
  points: number,
  rank: number,
  isMe = false,
): ContributorRow => ({
  subject_id: subjectId,
  user_id: userId,
  display_name: `User ${userId}`,
  points,
  rank,
  is_me: isMe,
});

describe("groupContributorRowsBySubject", () => {
  it("groups rows by subject id", () => {
    const result = groupContributorRowsBySubject([
      row("yu-e21", "u1", 1850, 1),
      row("yu-e21", "u2", 1420, 2),
      row("yu-c02", "u3", 1560, 1),
    ]);
    expect(Object.keys(result).sort()).toEqual(["yu-c02", "yu-e21"]);
    expect(result["yu-e21"]).toHaveLength(2);
    expect(result["yu-c02"]).toHaveLength(1);
  });

  it("maps snake_case rows to camelCase contributors", () => {
    const grouped = groupContributorRowsBySubject([
      row("yu-b04", "me", 1320, 1, true),
    ]);
    expect(grouped["yu-b04"][0]).toEqual({
      userId: "me",
      displayName: "User me",
      points: 1320,
      rank: 1,
      isMe: true,
    });
  });

  it("orders each subject's contributors by ascending rank", () => {
    const result = groupContributorRowsBySubject([
      row("yu-e21", "u2", 1420, 2),
      row("yu-e21", "u1", 1850, 1),
      row("yu-e21", "u3", 1180, 3),
    ]);
    expect(result["yu-e21"].map((c) => c.userId)).toEqual(["u1", "u2", "u3"]);
  });

  it("returns an empty object when there are no rows", () => {
    expect(groupContributorRowsBySubject([])).toEqual({});
  });
});
