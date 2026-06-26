import { describe, expect, it } from "vitest";
import { validateProfileDraft } from "../domain/profile";
import type { GroupOption } from "../domain/types";

const groups: GroupOption[] = [
  { id: "engineering", schoolId: "yeungnam", name: "Eng", type: "college" },
  { id: "humanities", schoolId: "yeungnam", name: "Hum", type: "college" },
];

describe("validateProfileDraft", () => {
  it("accepts a valid draft and trims the display name", () => {
    const result = validateProfileDraft(
      { displayName: "  Jin  ", schoolId: "yeungnam", groupId: "engineering" },
      groups,
    );

    expect(result).toEqual({
      ok: true,
      value: {
        displayName: "Jin",
        schoolId: "yeungnam",
        groupId: "engineering",
      },
    });
  });

  it("rejects an empty display name", () => {
    const result = validateProfileDraft(
      { displayName: "   ", schoolId: "yeungnam", groupId: "engineering" },
      groups,
    );

    expect(result).toEqual({ ok: false, error: "display-name-required" });
  });

  it("rejects a display name longer than 40 characters", () => {
    const result = validateProfileDraft(
      {
        displayName: "x".repeat(41),
        schoolId: "yeungnam",
        groupId: "engineering",
      },
      groups,
    );

    expect(result).toEqual({ ok: false, error: "display-name-too-long" });
  });

  it("rejects a missing school", () => {
    const result = validateProfileDraft(
      { displayName: "Jin", schoolId: "", groupId: "engineering" },
      groups,
    );

    expect(result).toEqual({ ok: false, error: "school-required" });
  });

  it("rejects a group that does not exist", () => {
    const result = validateProfileDraft(
      { displayName: "Jin", schoolId: "yeungnam", groupId: "" },
      groups,
    );

    expect(result).toEqual({ ok: false, error: "group-required" });
  });

  it("rejects a group that belongs to another school", () => {
    const result = validateProfileDraft(
      { displayName: "Jin", schoolId: "other", groupId: "engineering" },
      groups,
    );

    expect(result).toEqual({ ok: false, error: "group-school-mismatch" });
  });
});
