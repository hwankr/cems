// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeagueBrowseList } from "../components/league-browse-list";
import type { LeagueSummary } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      leagues: {
        status: { upcoming: "예정", active: "진행 중", finalized: "종료" },
        participants: "참가 {count}팀", period: "{start} – {end}",
        search: { placeholder: "리그 이름 검색", noResults: "검색 결과가 없어요" },
        emptyBrowse: "참가 가능한 공개 리그가 없어요",
        join: { join: "참가하기", joining: "참가 중…", joined: "참가됨", error: "오류" },
      },
    },
  }),
}));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("react", async (orig) => {
  const actual = await orig<typeof import("react")>();
  return { ...actual, useActionState: () => [{ status: "idle" }, () => {}, false] };
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const leagues: LeagueSummary[] = [
  { id: "a", name: "여름 리그", scope: "group", status: "active", startsAt: "2026-06-28T00:00:00+09:00", endsAt: "2026-07-31T00:00:00+09:00", isOpen: true },
  { id: "b", name: "가을 리그", scope: "group", status: "upcoming", startsAt: "2026-09-01T00:00:00+09:00", endsAt: "2026-09-30T00:00:00+09:00", isOpen: true },
];

describe("LeagueBrowseList", () => {
  afterEach(() => document.body.replaceChildren());
  it("renders joinable leagues with join buttons", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () =>
      root.render(<LeagueBrowseList leagues={leagues} participantCounts={{ a: 3, b: 2 }} />),
    );
    const text = container.textContent ?? "";
    expect(text).toContain("여름 리그");
    expect(text).toContain("가을 리그");
    expect(container.querySelectorAll("button").length).toBeGreaterThanOrEqual(2); // a join button per league
    await act(async () => root.unmount());
  });
  it("shows an empty state with no joinable leagues", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () => root.render(<LeagueBrowseList leagues={[]} participantCounts={{}} />));
    expect(container.textContent).toContain("참가 가능한 공개 리그가 없어요");
    await act(async () => root.unmount());
  });
});
