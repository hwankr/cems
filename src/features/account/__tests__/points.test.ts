import { describe, expect, it } from "vitest";
import { countMissionCheckIns, sumPersonalPoints } from "../domain/points";
import type { PointEvent } from "../domain/points";

const event = (points: number): PointEvent => ({
  id: `e-${points}`,
  userId: "u1",
  points,
  reason: "verified-savings",
  periodLabel: "2026-W25",
  createdAt: "2026-06-26T00:00:00.000Z",
});

describe("sumPersonalPoints", () => {
  it("returns 0 for no events", () => {
    expect(sumPersonalPoints([])).toBe(0);
  });

  it("adds every event's points", () => {
    expect(sumPersonalPoints([event(120), event(80)])).toBe(200);
  });
});

describe("countMissionCheckIns", () => {
  it("counts only qr:<code> mission events", () => {
    const events: PointEvent[] = [
      { id: "1", userId: "u", points: 50, reason: "qr:stairs", periodLabel: "", createdAt: "2026-06-26T00:00:00Z" },
      { id: "2", userId: "u", points: 30, reason: "qr:tumbler", periodLabel: "", createdAt: "2026-06-26T00:00:00Z" },
      { id: "3", userId: "u", points: 20, reason: "goal:daily-1", periodLabel: "", createdAt: "2026-06-26T00:00:00Z" },
      { id: "4", userId: "u", points: 10, reason: "verified-savings", periodLabel: "", createdAt: "2026-06-26T00:00:00Z" },
    ];
    expect(countMissionCheckIns(events)).toBe(2);
  });

  it("returns 0 for no events", () => {
    expect(countMissionCheckIns([])).toBe(0);
  });
});
