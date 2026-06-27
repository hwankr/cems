// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { koMessages } from "@/i18n/messages/ko";
import { EstateBuildingCard } from "../components/estate-building-card";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const copy = koMessages.estate;

function findUpgradeButton(container: HTMLElement): HTMLButtonElement | undefined {
  return [...container.querySelectorAll("button")].find((button) =>
    button.textContent?.includes(copy.building.upgrade),
  );
}

describe("EstateBuildingCard", () => {
  let root: Root | null;
  let container: HTMLDivElement;

  beforeEach(() => {
    root = null;
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount());
    }
    document.body.replaceChildren();
  });

  it("shows the level, progress, and an enabled upgrade button when affordable", async () => {
    const onUpgrade = vi.fn();
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <EstateBuildingCard
          copy={copy}
          locale="ko"
          level={2}
          maxLevel={5}
          nextCost={2000}
          availablePoints={5000}
          onUpgrade={onUpgrade}
        />,
      );
    });

    expect(container.textContent).toContain(copy.building.cardTitle);
    expect(container.textContent).toContain("Lv.2");
    expect(container.textContent).toContain("2 / 5");

    const button = findUpgradeButton(container);
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button?.disabled).toBe(false);

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("disables the upgrade button when points are insufficient", async () => {
    const onUpgrade = vi.fn();
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <EstateBuildingCard
          copy={copy}
          locale="ko"
          level={1}
          maxLevel={5}
          nextCost={800}
          availablePoints={100}
          onUpgrade={onUpgrade}
        />,
      );
    });

    const button = findUpgradeButton(container);
    expect(button?.disabled).toBe(true);

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onUpgrade).not.toHaveBeenCalled();
  });

  it("renders a max-level state with no upgrade button when nextCost is null", async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <EstateBuildingCard
          copy={copy}
          locale="ko"
          level={5}
          maxLevel={5}
          nextCost={null}
          availablePoints={999999}
          onUpgrade={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain(copy.building.maxLevel);
    expect(findUpgradeButton(container)).toBeUndefined();
  });
});
