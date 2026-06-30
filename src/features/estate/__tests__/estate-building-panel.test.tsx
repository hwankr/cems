// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enMessages } from "@/i18n/messages/en";
import { EstateBuildingPanel } from "../components/estate-building-panel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null;
let container: HTMLDivElement;

const base = {
  copy: enMessages.estate,
  locale: "en" as const,
  title: "Central library",
  onClose: () => {},
};

describe("EstateBuildingPanel", () => {
  beforeEach(() => {
    root = null;
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    document.body.replaceChildren();
  });

  it("shows the level, an upgrade button, and the contributor list for the main building", async () => {
    const onUpgrade = vi.fn();
    await render({
      variant: "main-building",
      level: 3,
      maxLevel: 5,
      nextCost: 4500,
      availablePoints: 1000070,
      ecoRatePerHour: 18,
      ecoAvailable: 240,
      contributors: [
        { userId: "u1", displayName: "Demo", points: 1000070, rank: 1, isMe: true },
      ],
      onUpgrade,
    });

    expect(container.textContent).toContain("Central library");
    expect(container.textContent).toContain("Demo");
    await click(button(enMessages.estate.building.upgrade));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("hides upgrade/contributors for an ordinary item", async () => {
    await render({ variant: "item", title: "Bench" });
    expect(query(enMessages.estate.building.upgrade)).toBeNull();
  });
});

async function render(
  overrides: Partial<Parameters<typeof EstateBuildingPanel>[0]>,
) {
  root = createRoot(container);
  await act(async () => {
    root?.render(<EstateBuildingPanel {...base} variant="item" {...overrides} />);
  });
}

function query(label: string) {
  return container.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"], button[title="${label}"]`,
  );
}

function button(label: string): HTMLButtonElement {
  const found = query(label);
  if (!found) throw new Error(`Expected ${label} button.`);
  return found;
}

async function click(el: HTMLElement) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}
