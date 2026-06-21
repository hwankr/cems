import { describe, expect, it } from "vitest";
import { interpolate } from "../interpolate";

describe("interpolate", () => {
  it("replaces named placeholders", () => {
    expect(
      interpolate("{subject} saved {amount}.", {
        amount: "140 kWh",
        subject: "IT Building",
      }),
    ).toBe("IT Building saved 140 kWh.");
  });

  it("leaves unknown placeholders visible", () => {
    expect(interpolate("Hello {name} {missing}", { name: "CEMS" })).toBe(
      "Hello CEMS {missing}",
    );
  });
});
