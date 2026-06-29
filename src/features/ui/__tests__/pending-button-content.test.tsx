// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PendingButtonContent } from "../pending-button-content";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("PendingButtonContent", () => {
  let root: Root | null;
  let container: HTMLDivElement;

  beforeEach(() => {
    root = null;
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    document.body.replaceChildren();
  });

  it("shows the idle label without a spinner before submission", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <button type="button">
          <PendingButtonContent
            pending={false}
            idleLabel="저장"
            pendingLabel="저장 중"
          />
        </button>,
      );
    });

    expect(container.textContent).toContain("저장");
    expect(container.textContent).not.toContain("저장 중");
    expect(container.querySelector('[data-pending-spinner="true"]')).toBeNull();
  });

  it("shows a visible pending label and spinner during submission", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <button type="button" aria-busy="true">
          <PendingButtonContent
            pending
            idleLabel="저장"
            pendingLabel="저장 중"
          />
        </button>,
      );
    });

    const spinner = container.querySelector('[data-pending-spinner="true"]');

    expect(container.textContent).toContain("저장 중");
    expect(spinner).not.toBeNull();
    expect(spinner?.getAttribute("aria-hidden")).toBe("true");
  });
});
