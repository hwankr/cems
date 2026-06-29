// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeagueCard } from "../components/league-card";
import type { LeagueSummary } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      leagues: { status: { upcoming: "예정", active: "진행 중", finalized: "종료" }, participants: "참가 {count}팀", period: "{start} – {end}" },
    },
  }),
}));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const league: LeagueSummary = {
  id: "yu-energy-2026-summer", name: "여름 리그", scope: "group",
  status: "active", startsAt: "2026-06-28T00:00:00+09:00", endsAt: "2026-07-31T00:00:00+09:00", isOpen: true,
};

describe("LeagueCard", () => {
  afterEach(() => document.body.replaceChildren());
  it("renders name, status, participant count, and links when href is set", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () =>
      root.render(<LeagueCard league={league} participantCount={3} href="/ko/leagues/yu-energy-2026-summer" />),
    );
    const text = container.textContent ?? "";
    expect(text).toContain("여름 리그");
    expect(text).toContain("진행 중");
    expect(text).toContain("참가 3팀");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/ko/leagues/yu-energy-2026-summer");
    await act(async () => root.unmount());
  });
});
