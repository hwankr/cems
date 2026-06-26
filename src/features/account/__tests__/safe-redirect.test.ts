import { describe, expect, it } from "vitest";
import { isSafeNextPath } from "../domain/safe-redirect";

describe("isSafeNextPath", () => {
  it("accepts a locale-prefixed path", () => {
    expect(isSafeNextPath("/ko/scan/stairs")).toBe("/ko/scan/stairs");
    expect(isSafeNextPath("/en/me")).toBe("/en/me");
  });
  it("rejects protocol-relative and absolute urls", () => {
    expect(isSafeNextPath("//evil.example")).toBeNull();
    expect(isSafeNextPath("https://evil.example")).toBeNull();
  });
  it("rejects backslash tricks and non-locale paths", () => {
    expect(isSafeNextPath("/\\evil.example")).toBeNull();
    expect(isSafeNextPath("/dashboard")).toBeNull();
  });
  it("rejects non-strings", () => {
    expect(isSafeNextPath(null)).toBeNull();
    expect(isSafeNextPath(123)).toBeNull();
  });
});
