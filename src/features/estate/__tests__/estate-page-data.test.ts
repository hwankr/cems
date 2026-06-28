import { describe, expect, it } from "vitest";
import { getEstatePageData } from "../data/get-estate-page-data";

const deps = {
  getProfileGroupId: async () => "engineering",
  getGroupEarnedPoints: async () => 5000,
  getSubjectAwardTier: async () => null,
};

describe("getEstatePageData", () => {
  it("returns estate page data for yu-e21", async () => {
    const data = await getEstatePageData("ko", "yu-e21", deps);

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

  it("resolves the owner group from the subject and funds from the group pool", async () => {
    const data = await getEstatePageData("ko", "yu-e21", deps);

    // yu-e21 belongs to the engineering group via demoSubjects.
    expect(data?.ownerGroupId).toBe("engineering");
    expect(data?.pointAccount).toEqual({
      earnedPoints: 5000,
      spentPoints: 0,
      availablePoints: 5000,
    });
  });

  it("falls back to the profile group when the subject has no group", async () => {
    const data = await getEstatePageData("ko", "yu-a02", {
      getProfileGroupId: async () => "humanities",
      getGroupEarnedPoints: async () => 0,
      getSubjectAwardTier: async () => null,
    });

    expect(data?.ownerGroupId).toBe("humanities");
  });

  it("localizes subject and school names by locale", async () => {
    const koData = await getEstatePageData("ko", "yu-e21", deps);
    const enData = await getEstatePageData("en", "yu-e21", deps);

    expect(koData?.school.name).not.toBe(enData?.school.name);
    expect(koData?.subject.name).not.toBe(enData?.subject.name);
  });

  it("returns null for an unknown subject", async () => {
    expect(await getEstatePageData("ko", "missing-subject", deps)).toBeNull();
  });

  it("returns null when there is no profile group", async () => {
    const data = await getEstatePageData("ko", "yu-e21", {
      getProfileGroupId: async () => null,
      getGroupEarnedPoints: async () => 0,
      getSubjectAwardTier: async () => null,
    });

    expect(data).toBeNull();
  });

  it("grants the matching emblem when the subject's group is awarded", async () => {
    const data = await getEstatePageData("ko", "yu-e21", {
      getProfileGroupId: async () => "engineering",
      getGroupEarnedPoints: async () => 0,
      getSubjectAwardTier: async () => "gold",
    });

    expect(data?.grantedEmblemDefinitionId).toBe("award-emblem-gold");
  });

  it("grants no emblem when the subject's group is not awarded", async () => {
    const data = await getEstatePageData("ko", "yu-e21", deps);

    expect(data?.grantedEmblemDefinitionId).toBeNull();
  });
});
