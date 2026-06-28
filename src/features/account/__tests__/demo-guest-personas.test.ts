import { describe, expect, it } from "vitest";
import {
  demoGuestPersonas,
  isDemoGuestKey,
} from "../demo/demo-guest-personas";

describe("demoGuestPersonas", () => {
  it("exposes exactly the three presentation personas in display order", () => {
    expect(demoGuestPersonas.map((guest) => guest.key)).toEqual([
      "engineering-leader",
      "humanities-leader",
      "estate-builder",
    ]);
  });

  it("validates demo guest keys without accepting arbitrary input", () => {
    expect(isDemoGuestKey("engineering-leader")).toBe(true);
    expect(isDemoGuestKey("guest1@cems.demo")).toBe(false);
    expect(isDemoGuestKey("")).toBe(false);
    expect(isDemoGuestKey(null)).toBe(false);
  });
});
