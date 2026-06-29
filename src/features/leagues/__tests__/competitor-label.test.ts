import { describe, expect, it } from "vitest";
import { competitorLabel } from "../domain/competitor-label";

const labels = {
  engineering: "공과대학",
  humanities: "문과대학",
  "student-services": "학생지원",
};

describe("competitorLabel", () => {
  it("maps a known group id to its localized label", () => {
    expect(competitorLabel(labels, "student-services", "Student Services")).toBe("학생지원");
  });
  it("falls back to the raw name for an unknown id", () => {
    expect(competitorLabel(labels, "yeungnam-school", "Yeungnam")).toBe("Yeungnam");
  });
});
