import { describe, expect, it } from "vitest";
import {
  demoGuestPersonas,
  getDemoGuestDisplayPersonas,
  isDemoGuestKey,
} from "../demo/demo-guest-personas";

describe("demoGuestPersonas", () => {
  it("exposes one representative demo account", () => {
    expect(demoGuestPersonas.map((guest) => guest.key)).toEqual([
      "complete-demo",
    ]);
  });

  it("uses the representative demo account for display", () => {
    expect(getDemoGuestDisplayPersonas().map((guest) => guest.key)).toEqual([
      "complete-demo",
    ]);
  });

  it("validates only the representative demo guest key", () => {
    expect(isDemoGuestKey("complete-demo")).toBe(true);
    expect(isDemoGuestKey("engineering-leader")).toBe(false);
    expect(isDemoGuestKey("guest1@cems.demo")).toBe(false);
    expect(isDemoGuestKey("")).toBe(false);
    expect(isDemoGuestKey(null)).toBe(false);
  });
});
