import { describe, expect, it } from "vitest";
import { validateProfileEdit } from "../domain/profile-edit";

describe("validateProfileEdit", () => {
  it("trims and accepts a valid draft, lowercasing and stripping @ from handle", () => {
    const r = validateProfileEdit({
      displayName: "  전우환 ",
      handle: " @Eco_Hwan ",
      bio: "  계단만 씁니다  ",
    });
    expect(r).toEqual({
      ok: true,
      value: { displayName: "전우환", handle: "eco_hwan", bio: "계단만 씁니다" },
    });
  });

  it("treats empty handle and bio as null", () => {
    const r = validateProfileEdit({ displayName: "철수", handle: "", bio: "" });
    expect(r).toEqual({
      ok: true,
      value: { displayName: "철수", handle: null, bio: null },
    });
  });

  it("rejects an empty display name", () => {
    expect(validateProfileEdit({ displayName: "   ", handle: "", bio: "" })).toEqual({
      ok: false,
      error: "display-name-required",
    });
  });

  it("rejects a display name longer than 30 chars", () => {
    expect(
      validateProfileEdit({ displayName: "a".repeat(31), handle: "", bio: "" }),
    ).toEqual({ ok: false, error: "display-name-too-long" });
  });

  it("rejects a too-short handle", () => {
    expect(
      validateProfileEdit({ displayName: "철수", handle: "ab", bio: "" }),
    ).toEqual({ ok: false, error: "handle-invalid" });
  });

  it("rejects a handle with illegal characters", () => {
    expect(
      validateProfileEdit({ displayName: "철수", handle: "bad handle", bio: "" }),
    ).toEqual({ ok: false, error: "handle-invalid" });
  });

  it("rejects a bio longer than 80 chars", () => {
    expect(
      validateProfileEdit({ displayName: "철수", handle: "", bio: "a".repeat(81) }),
    ).toEqual({ ok: false, error: "bio-too-long" });
  });
});
