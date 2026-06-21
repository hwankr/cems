import { describe, expect, it } from "vitest";
import {
  formatKwh,
  formatNumber,
  formatPoints,
  formatSignedKwh,
} from "../format";

describe("i18n formatters", () => {
  it("formats Korean numbers and units", () => {
    expect(formatNumber("ko", 1234567)).toBe("1,234,567");
    expect(formatKwh("ko", 1500)).toBe("1,500 kWh");
    expect(formatPoints("ko", 2500)).toBe("2,500점");
  });

  it("formats English numbers and units", () => {
    expect(formatNumber("en", 1234567)).toBe("1,234,567");
    expect(formatKwh("en", 1500)).toBe("1,500 kWh");
    expect(formatPoints("en", 2500)).toBe("2,500 pts");
  });

  it("formats signed kWh deltas", () => {
    expect(formatSignedKwh("ko", 90)).toBe("+90 kWh");
    expect(formatSignedKwh("en", -140)).toBe("-140 kWh");
  });
});
