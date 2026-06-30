// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "en",
    messages: {
      scan: {
        missionEyebrow: "Campus mission",
        missionPrompt:
          "Verify an energy-saving action at {location} and claim your reward.",
        missionPoints: "{points} mission",
        rewardPoints: "Personal points",
        rewardCheckIn: "Check-in",
        confirm: "Claim reward",
        confirming: "Processing...",
        completedTitle: "Reward claimed",
        completedBody: "{points} has been added to your campus record.",
        alreadyTitle: "Already claimed",
        alreadyBody: "You already checked in today.",
        already: "You already checked in today.",
        error: "Could not verify. Please try again.",
        toMyPage: "To my page",
        toMap: "To map",
        cancelTest: "Test: cancel check-in",
        cancelling: "Cancelling...",
      },
      me: {
        missions: {
          "chem-2f-stairs": {
            title: "Chemical Engineering Hall 2F stairs",
            location: "Chemical Engineering Hall, 2F stairs",
          },
        },
      },
    },
  }),
}));

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

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

import { MissionConfirm } from "../components/mission-confirm";

describe("MissionConfirm", () => {
  afterEach(() => {
    document.body.replaceChildren();
    mockActionState = [{ status: "idle" }, () => {}, false];
  });

  it("renders a green reward-style mission card before claiming", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () =>
      root.render(<MissionConfirm code="chem-2f-stairs" points={50} />),
    );

    expect(container.textContent).toContain("Campus mission");
    expect(container.textContent).toContain("Chemical Engineering Hall 2F stairs");
    expect(container.textContent).toContain(
      "Verify an energy-saving action at Chemical Engineering Hall, 2F stairs",
    );
    expect(container.textContent).toContain("+50 pts");
    expect(container.textContent).toContain("Personal points");
    expect(container.textContent).toContain("+1");
    expect(container.textContent).toContain("Check-in");
    expect(container.textContent).toContain("50P");
    expect(container.textContent).not.toContain("UP");
    expect(container.textContent).not.toContain("Character growth");
    expect(container.textContent).toContain("Claim reward");

    const rewardStrip = container.querySelector('[aria-label="50 pts mission"]');
    expect(rewardStrip?.children).toHaveLength(2);

    const input = container.querySelector<HTMLInputElement>('input[name="code"]');
    expect(input?.value).toBe("chem-2f-stairs");

    await act(async () => root.unmount());
  });

  it("keeps the reward-themed completion state and navigation choices", async () => {
    mockActionState = [{ status: "completed" }, () => {}, false];
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () =>
      root.render(<MissionConfirm code="chem-2f-stairs" points={50} />),
    );

    expect(container.textContent).toContain("Reward claimed");
    expect(container.textContent).toContain(
      "50 pts has been added to your campus record.",
    );
    expect(container.textContent).toContain("To my page");
    expect(container.textContent).toContain("To map");

    const myPageLink = container.querySelector<HTMLAnchorElement>('a[href="/en/me"]');
    expect(myPageLink).not.toBeNull();

    await act(async () => root.unmount());
  });
});
