// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import Link from "next/link";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ROUTE_PENDING_OVERLAY_DELAY_MS,
  RoutePendingOverlay,
} from "../[locale]/route-pending-overlay";

let pathname = "/ko";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("RoutePendingOverlay", () => {
  let root: Root | null;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    pathname = "/ko";
    root = null;
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  function render() {
    root ??= createRoot(container);
    root.render(
      <>
        <main data-testid="current-screen">현재 화면</main>
        <Link href="/ko/me">내 정보</Link>
        <RoutePendingOverlay />
      </>,
    );
  }

  it("dims the current screen during an internal navigation", async () => {
    await act(async () => render());

    const link = container.querySelector("a");
    link?.addEventListener("click", (event) => event.preventDefault());
    link?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, button: 0, cancelable: true }),
    );

    expect(
      container.querySelector('[data-route-pending-overlay="true"]'),
    ).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(ROUTE_PENDING_OVERLAY_DELAY_MS);
    });

    const overlay = container.querySelector(
      '[data-route-pending-overlay="true"]',
    );

    expect(container.querySelector('[data-testid="current-screen"]')).not.toBeNull();
    expect(overlay).not.toBeNull();
    expect(overlay?.className).toContain("fixed");
    expect(overlay?.className).toContain("bg-black/55");

    pathname = "/ko/me";
    await act(async () => render());

    expect(
      container.querySelector('[data-route-pending-overlay="true"]'),
    ).toBeNull();
  });
});
