import { describe, expect, it } from "vitest";
import {
  demoGuestPersonas,
  getDemoGuestDisplayPersonas,
  isDemoGuestKey,
} from "../demo/demo-guest-personas";

describe("demoGuestPersonas", () => {
  it("exposes three seeded presentation personas plus a complete-account fallback", () => {
    expect(demoGuestPersonas.map((guest) => guest.key)).toEqual([
      "engineering-leader",
      "humanities-leader",
      "estate-builder",
      "complete-demo",
    ]);
  });

  it("selects the display set from server configuration shape", () => {
    expect(
      getDemoGuestDisplayPersonas({ singleAccount: false }).map(
        (guest) => guest.key,
      ),
    ).toEqual(["engineering-leader", "humanities-leader", "estate-builder"]);
    expect(
      getDemoGuestDisplayPersonas({ singleAccount: true }).map(
        (guest) => guest.key,
      ),
    ).toEqual(["complete-demo"]);
  });

  it("validates demo guest keys without accepting arbitrary input", () => {
    expect(isDemoGuestKey("engineering-leader")).toBe(true);
    expect(isDemoGuestKey("complete-demo")).toBe(true);
    expect(isDemoGuestKey("guest1@cems.demo")).toBe(false);
    expect(isDemoGuestKey("")).toBe(false);
    expect(isDemoGuestKey(null)).toBe(false);
  });
});
