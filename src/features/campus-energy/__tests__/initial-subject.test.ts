import { describe, expect, it } from "vitest";
import { resolveInitialMainSubjectId } from "../domain/initial-subject";

const subjects = [
  { id: "yu-e21" },
  { id: "yu-b04" },
  { id: "yu-c02" },
];

describe("resolveInitialMainSubjectId", () => {
  it("uses the organization subject when it exists in the map data", () => {
    expect(resolveInitialMainSubjectId("yu-b04", subjects)).toBe("yu-b04");
  });

  it("starts with no building selected when the account has no organization subject", () => {
    expect(resolveInitialMainSubjectId(null, subjects)).toBe("");
    expect(resolveInitialMainSubjectId(undefined, subjects)).toBe("");
    expect(resolveInitialMainSubjectId("", subjects)).toBe("");
  });

  it("starts with no building selected when the organization subject is not in the current map data", () => {
    expect(resolveInitialMainSubjectId("yu-missing", subjects)).toBe("");
  });
});
