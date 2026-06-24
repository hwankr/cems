import { describe, expect, it } from "vitest";
import { calculatePoints } from "@/features/campus-energy/domain/scoring";
import { demoHistoricalEarnedPointsBySubjectId } from "../data/demo-estate-data";
import {
  getEstatePageData,
} from "../data/get-estate-page-data";

describe("getEstatePageData", () => {
  it("returns estate page data for yu-e21", () => {
    const data = getEstatePageData("ko", "yu-e21");

    expect(data).not.toBeNull();
    expect(data?.school.id).toBe("yeungnam");
    expect(data?.subject.id).toBe("yu-e21");
    expect(data?.subject.type).toBe("building");
    expect(data?.subject.officialCode).toBe("E21");
    expect(data?.comparison?.subjectId).toBe("yu-e21");
    expect(data?.initialSnapshot.subjectId).toBe("yu-e21");
    expect(data?.initialSnapshot.items).toContainEqual(
      expect.objectContaining({
        id: "yu-e21:landmark",
        definitionId: "base-campus-building",
      }),
    );
  });

  it("localizes subject and school names by locale", () => {
    const koData = getEstatePageData("ko", "yu-e21");
    const enData = getEstatePageData("en", "yu-e21");

    expect(koData?.school.name).not.toBe(enData?.school.name);
    expect(koData?.subject.name).not.toBe(enData?.subject.name);
  });

  it("returns null for an unknown subject", () => {
    expect(getEstatePageData("ko", "missing-subject")).toBeNull();
  });

  it("calculates the initial point account from current savings and demo carryover", () => {
    const data = getEstatePageData("ko", "yu-e21");

    if (!data?.comparison) {
      throw new Error("Expected yu-e21 to have a current comparison.");
    }

    const currentPoints = calculatePoints(data.comparison);
    const historicalCarryover =
      demoHistoricalEarnedPointsBySubjectId["yu-e21"] ?? 0;
    const earnedPoints = currentPoints + historicalCarryover;

    expect(data.pointAccount).toEqual({
      earnedPoints,
      spentPoints: 0,
      availablePoints: earnedPoints,
    });
  });
});
