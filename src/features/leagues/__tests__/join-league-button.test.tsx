// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      leagues: {
        join: {
          join: "참가하기",
          joining: "참가 중…",
          joined: "참가됨",
          error: "잠시 후 다시 시도해주세요",
        },
      },
    },
  }),
}));

// Mutable so individual tests can override the return value
let mockActionState: [{ status: string }, () => void, boolean] = [
  { status: "idle" },
  () => {},
  false,
];

vi.mock("react", async (orig) => {
  const actual = await orig<typeof import("react")>();
  return {
    ...actual,
    useActionState: () => mockActionState,
  };
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { JoinLeagueButton } from "../components/join-league-button";

describe("JoinLeagueButton", () => {
  afterEach(() => {
    document.body.replaceChildren();
    mockActionState = [{ status: "idle" }, () => {}, false];
  });

  it("renders the join label in idle state", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () => root.render(<JoinLeagueButton leagueId="league-1" />));
    expect(container.textContent).toContain("참가하기");
    await act(async () => root.unmount());
  });

  it("renders a hidden leagueId input", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () => root.render(<JoinLeagueButton leagueId="league-99" />));
    const input = container.querySelector<HTMLInputElement>('input[name="leagueId"]');
    expect(input).not.toBeNull();
    expect(input?.value).toBe("league-99");
    await act(async () => root.unmount());
  });

  it("surfaces error copy and aria-live span when action returns error status", async () => {
    mockActionState = [{ status: "error" }, () => {}, false];
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () => root.render(<JoinLeagueButton leagueId="league-1" />));
    const span = container.querySelector('[role="status"]');
    expect(span).not.toBeNull();
    expect(span?.textContent).toContain("잠시 후 다시 시도해주세요");
    await act(async () => root.unmount());
  });

  it("renders empty aria-live span (not error text) in idle state", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () => root.render(<JoinLeagueButton leagueId="league-1" />));
    const span = container.querySelector('[role="status"]');
    expect(span?.textContent).toBe("");
    await act(async () => root.unmount());
  });
});
