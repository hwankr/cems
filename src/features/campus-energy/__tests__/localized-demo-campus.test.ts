import { describe, expect, it } from "vitest";
import { enMessages } from "../../../i18n/messages/en";
import { koMessages } from "../../../i18n/messages/ko";
import { demoGroups, demoSubjects } from "../data/demo-campus";
import { localizeDemoCampus } from "../data/localized-demo-campus";

describe("localizeDemoCampus", () => {
  it("uses Korean names for the default messages", () => {
    const localized = localizeDemoCampus(koMessages);

    expect(localized.school.name).toBe("영남대학교");
    expect(
      localized.subjects.find((subject) => subject.id === "yu-it")?.name,
    ).toBe("IT관");
    expect(
      localized.groups.find((group) => group.id === "engineering")?.name,
    ).toBe("공과대학");
  });

  it("uses English names for English messages without changing IDs", () => {
    const localized = localizeDemoCampus(enMessages);

    expect(localized.school.name).toBe("Yeungnam University");
    expect(localized.subjects.map((subject) => subject.id)).toEqual(
      demoSubjects.map((subject) => subject.id),
    );
    expect(localized.groups.map((group) => group.id)).toEqual(
      demoGroups.map((group) => group.id),
    );
  });
});
