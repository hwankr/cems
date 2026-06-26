import { describe, expect, it } from "vitest";
import { calculateGroupPointPool } from "../domain/group-pool";
import type { GroupContribution } from "../domain/group-pool";

const contributions: GroupContribution[] = [
  { userId: "u1", points: 1400 },
  { userId: "u2", points: 600 },
];

describe("calculateGroupPointPool", () => {
  it("sums member contributions and counts members", () => {
    expect(calculateGroupPointPool("engineering", contributions)).toEqual({
      groupId: "engineering",
      earnedPoints: 2000,
      memberCount: 2,
    });
  });

  it("returns a zero pool when there are no contributions", () => {
    expect(calculateGroupPointPool("humanities", [])).toEqual({
      groupId: "humanities",
      earnedPoints: 0,
      memberCount: 0,
    });
  });
});
