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
        tierGold: "금상", tierSilver: "은상", tierBronze: "동상",
        rankUnit: "위", avgPointsLabel: "1인당 평균 {points}P", teamSectionTitle: "수상 팀",
      },
      demo: { groups: { engineering: "공과대학", humanities: "문과대학", "student-services": "학생지원" } },
    },
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const teams: TeamAward[] = [
  { tier: "gold", rank: 1, competitorId: "student-services", competitorName: "Student Services", metricValue: 1200 },
  { tier: "silver", rank: 2, competitorId: "humanities", competitorName: "Humanities", metricValue: 1100 },
  { tier: "bronze", rank: 3, competitorId: "engineering", competitorName: "Engineering", metricValue: 1000 },
];

describe("AwardPodium", () => {
  afterEach(() => document.body.replaceChildren());

  it("renders a podium with the champion centered and per-capita average", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => root.render(<AwardPodium teams={teams} />));

    const lis = Array.from(container.querySelectorAll("li"));
    expect(lis).toHaveLength(3);
    // Visual order is silver, gold (center), bronze.
    expect(lis.map((li) => li.getAttribute("data-tier"))).toEqual([
      "silver",
      "gold",
      "bronze",
    ]);
    expect(lis[1].getAttribute("data-rank")).toBe("1");

    const text = container.textContent ?? "";
    expect(text).toContain("문과대학");
    expect(text).toContain("공과대학");
    expect(text).toContain("1,200");
    expect(text).toContain("학생지원"); // localized, not "student-services"/"학생지원팀"

    await act(async () => root.unmount());
  });
});
