// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BottomNav } from "../components/bottom-nav";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    messages: {
      modes: {
        admin: "관리자 대시보드",
        participant: "참여자 모드",
      },
    },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function mountBottomNav(
  root: Root,
  mode: "admin" | "participant",
  onChange: (mode: "admin" | "participant") => void,
) {
  root.render(<BottomNav mode={mode} onModeChange={onChange} />);
}

describe("BottomNav", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("marks the active mode with aria-current", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => mountBottomNav(root, "admin", () => {}));

    const buttons = Array.from(container.querySelectorAll("button"));
    const adminButton = buttons.find((b) =>
      b.textContent?.includes("관리자 대시보드"),
    );
    const participantButton = buttons.find((b) =>
      b.textContent?.includes("참여자 모드"),
    );

    expect(adminButton?.getAttribute("aria-current")).toBe("page");
    expect(participantButton?.getAttribute("aria-current")).toBeNull();

    await act(async () => root.unmount());
  });

  it("calls onModeChange with the clicked mode", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);
    const onChange = vi.fn();

    await act(async () => mountBottomNav(root, "admin", onChange));

    const participantButton = Array.from(
      container.querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("참여자 모드"));

    await act(async () => {
      participantButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(onChange).toHaveBeenCalledWith("participant");

    await act(async () => root.unmount());
  });
});
