import { describe, expect, it } from "vitest";
import { getLocalizedPath } from "../routes";

describe("getLocalizedPath", () => {
  it("replaces an existing locale segment", () => {
    expect(getLocalizedPath("/ko", "en")).toBe("/en");
    expect(getLocalizedPath("/ko/admin", "en")).toBe("/en/admin");
  });

  it("adds a locale segment when one is missing", () => {
    expect(getLocalizedPath("/", "ko")).toBe("/ko");
    expect(getLocalizedPath("/dashboard", "en")).toBe("/en/dashboard");
  });
});
