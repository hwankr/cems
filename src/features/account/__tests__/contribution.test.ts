import { describe, expect, it } from "vitest";
import type { PointEvent } from "../domain/points";
import {
  buildContributionGraph,
  contributionLevel,
  seoulDayLabel,
} from "../domain/contribution";

function ev(points: number, createdAt: string): PointEvent {
  return { id: createdAt, userId: "u", points, reason: "qr:x", periodLabel: "", createdAt };
}

describe("seoulDayLabel", () => {
  it("shifts UTC to Asia/Seoul (UTC+9) calendar day", () => {
    // 15:00Z is exactly Seoul midnight → rolls to next day.
    expect(seoulDayLabel("2026-06-26T15:30:00Z")).toBe("2026-06-27");
    expect(seoulDayLabel("2026-06-26T14:59:00Z")).toBe("2026-06-26");
  });
});

describe("contributionLevel", () => {
  it("maps daily points to 0..4 buckets", () => {
    expect(contributionLevel(0)).toBe(0);
    expect(contributionLevel(1)).toBe(1);
    expect(contributionLevel(79)).toBe(1);
    expect(contributionLevel(80)).toBe(2);
    expect(contributionLevel(199)).toBe(2);
    expect(contributionLevel(200)).toBe(3);
    expect(contributionLevel(399)).toBe(3);
    expect(contributionLevel(400)).toBe(4);
    expect(contributionLevel(5000)).toBe(4);
  });
});

describe("buildContributionGraph", () => {
  it("produces a weeks x 7 grid ending in the week of today", () => {
    const g = buildContributionGraph([], { todayLabel: "2026-06-26", weeks: 4 });
    expect(g.weeks).toHaveLength(4);
    for (const week of g.weeks) expect(week).toHaveLength(7);
    // last column's last present day is today (2026-06-26 is a Friday → index 5)
    const lastWeek = g.weeks[3];
    expect(lastWeek[5].date).toBe("2026-06-26");
    expect(lastWeek[5].future).toBe(false);
    expect(lastWeek[6].future).toBe(true); // Saturday after today
  });

  it("sums same-day points and assigns level + totals", () => {
    const events = [
      ev(50, "2026-06-26T01:00:00Z"), // Seoul 2026-06-26
      ev(50, "2026-06-26T02:00:00Z"), // Seoul 2026-06-26 → day total 100 → level 2
      ev(30, "2026-06-24T01:00:00Z"), // Seoul 2026-06-24 → level 1
    ];
    const g = buildContributionGraph(events, { todayLabel: "2026-06-26", weeks: 4 });
    const cells = g.weeks.flat();
    const d26 = cells.find((c) => c.date === "2026-06-26");
    const d24 = cells.find((c) => c.date === "2026-06-24");
    expect(d26?.points).toBe(100);
    expect(d26?.level).toBe(2);
    expect(d24?.level).toBe(1);
    expect(g.totalPoints).toBe(130); // 100 (06-26) + 30 (06-24)
    expect(g.activeDays).toBe(2);
  });

  it("computes current and longest streaks (today active)", () => {
    const events = [
      ev(40, "2026-06-24T01:00:00Z"),
      ev(40, "2026-06-25T01:00:00Z"),
      ev(40, "2026-06-26T01:00:00Z"),
    ];
    const g = buildContributionGraph(events, { todayLabel: "2026-06-26", weeks: 6 });
    expect(g.currentStreak).toBe(3);
    expect(g.longestStreak).toBe(3);
  });

  it("keeps current streak through a still-inactive today (grace), counting yesterday", () => {
    const events = [
      ev(40, "2026-06-24T01:00:00Z"),
      ev(40, "2026-06-25T01:00:00Z"),
    ];
    const g = buildContributionGraph(events, { todayLabel: "2026-06-26", weeks: 6 });
    expect(g.currentStreak).toBe(2);
  });

  it("returns zero streaks and empty totals for no events", () => {
    const g = buildContributionGraph([], { todayLabel: "2026-06-26", weeks: 4 });
    expect(g.currentStreak).toBe(0);
    expect(g.longestStreak).toBe(0);
    expect(g.totalPoints).toBe(0);
    expect(g.activeDays).toBe(0);
  });
});
