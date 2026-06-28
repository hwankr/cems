// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AwardPodium } from "../components/award-podium";
import type { TeamAward } from "../domain/types";

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
      },
    },
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const teams: TeamAward[] = [
  {
    tier: "gold",
    rank: 1,
    competitorId: "student-services",
    competitorName: "학생지원팀",
    metricValue: 1200,
  },
  {
    tier: "silver",
    rank: 2,
    competitorId: "humanities",
    competitorName: "인문대학",
    metricValue: 1100,
  },
  {
    tier: "bronze",
    rank: 3,
    competitorId: "engineering",
    competitorName: "공과대학",
    metricValue: 1000,
  },
];

describe("AwardPodium", () => {
  afterEach(() => document.body.replaceChildren());

  it("renders all podium teams with names and per-capita average", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => root.render(<AwardPodium teams={teams} />));

    const text = container.textContent ?? "";
    expect(text).toContain("학생지원팀");
    expect(text).toContain("인문대학");
    expect(text).toContain("공과대학");
    expect(text).toContain("1,200");
    expect(container.querySelectorAll("li")).toHaveLength(3);

    await act(async () => root.unmount());
  });
});
