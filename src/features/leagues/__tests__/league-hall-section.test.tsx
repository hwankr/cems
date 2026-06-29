// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeagueHallSection } from "../components/league-hall-section";
import type { FinalizedLeague, LeagueAwards } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      hallOfFame: {
        tierGold: "금상",
        tierSilver: "은상",
        tierBronze: "동상",
        rankUnit: "위",
        avgPointsLabel: "1인당 평균 {points}P",
        teamSectionTitle: "수상 팀",
        studentSectionTitle: "우수 학생",
        periodFormat: "{start} – {end}",
      },
      demo: { groups: { engineering: "공과대학", humanities: "문과대학", "student-services": "학생지원" } },
    },
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const league: FinalizedLeague = {
  id: "yu-college-2026-05",
  name: "영남대 단과대 에너지 절감 리그",
  startsAt: "2026-05-01T00:00:00+09:00",
  endsAt: "2026-06-01T00:00:00+09:00",
};

const awards: LeagueAwards = {
  teams: [
    {
      tier: "gold",
      rank: 1,
      competitorId: "student-services",
      competitorName: "학생지원팀",
      metricValue: 1200,
    },
  ],
  students: [
    { tier: "gold", rank: 1, userId: "it1", displayName: "it1", metricValue: 1600 },
    {
      tier: "gold",
      rank: 2,
      userId: "g12",
      displayName: "게스트 12",
      metricValue: 1300,
    },
  ],
};

describe("LeagueHallSection", () => {
  afterEach(() => document.body.replaceChildren());

  it("renders the league name, podium, and student winners", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(<LeagueHallSection league={league} awards={awards} />),
    );

    const text = container.textContent ?? "";
    expect(text).toContain("영남대 단과대 에너지 절감 리그");
    expect(text).toContain("학생지원");
    expect(text).toContain("it1");
    expect(text).toContain("게스트 12");

    await act(async () => root.unmount());
  });
});
