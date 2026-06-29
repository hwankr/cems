// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeagueStandingsTable } from "../components/league-standings-table";
import type { LeagueStanding } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      leagues: { standings: { rank: "순위", team: "팀", avg: "1인당 평균", total: "합계", members: "{count}명", you: "내 그룹", empty: "아직 순위가 없어요" } },
      demo: { groups: { engineering: "공과대학", humanities: "문과대학", "student-services": "학생지원" } },
    },
  }),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const standings: LeagueStanding[] = [
  { competitorKind: "group", competitorId: "student-services", competitorName: "Student Services", memberCount: 12, totalPoints: 2640, avgPoints: 220, rank: 1 },
  { competitorKind: "group", competitorId: "humanities", competitorName: "College of Humanities", memberCount: 10, totalPoints: 2000, avgPoints: 200, rank: 2 },
];

describe("LeagueStandingsTable", () => {
  afterEach(() => document.body.replaceChildren());

  it("renders localized team names, avg, and highlights my group", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () =>
      root.render(<LeagueStandingsTable standings={standings} myCompetitorId="student-services" />),
    );
    const text = container.textContent ?? "";
    expect(text).toContain("학생지원");
    expect(text).toContain("문과대학");
    expect(text).not.toContain("Student Services");
    expect(text).toContain("220");
    const mine = container.querySelector('[data-me="true"]');
    expect(mine?.getAttribute("data-competitor")).toBe("student-services");
    await act(async () => root.unmount());
  });

  it("shows an empty state when there are no standings", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () =>
      root.render(<LeagueStandingsTable standings={[]} myCompetitorId={null} />),
    );
    expect(container.textContent).toContain("아직 순위가 없어요");
    await act(async () => root.unmount());
  });
});
