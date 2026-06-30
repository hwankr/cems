import { describe, expect, it } from "vitest";
import { parsePointEventReason } from "../domain/point-reason";

describe("parsePointEventReason", () => {
  it("recognizes verified savings", () => {
    expect(parsePointEventReason("verified-savings")).toEqual({ kind: "verified-savings" });
  });
  it("extracts a mission code", () => {
    expect(parsePointEventReason("qr:stairs")).toEqual({ kind: "mission", code: "stairs" });
  });
  it("extracts a goal id", () => {
    expect(parsePointEventReason("goal:daily-1")).toEqual({ kind: "goal", id: "daily-1" });
  });
  it("falls back to other", () => {
    expect(parsePointEventReason("mystery")).toEqual({ kind: "other", reason: "mystery" });
  });
  it("recognizes a quiz reason", () => {
    expect(parsePointEventReason("quiz:daily")).toEqual({ kind: "quiz" });
  });
});
