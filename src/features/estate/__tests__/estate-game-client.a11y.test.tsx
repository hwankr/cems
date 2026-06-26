// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { enMessages } from "@/i18n/messages/en";
import { getEstatePageData } from "../data/get-estate-page-data";
import { EstateGameClient } from "../components/estate-game-client";
import { MemoryEstateRepository } from "../persistence/memory-estate-repository";

// Expansion is reached only by tapping a locked parcel on the canvas, so the
// mock exposes a button that fires the same `onLockedParcelClick` callback.
vi.mock("../components/estate-canvas", () => {
  const Canvas = (props: { onLockedParcelClick?: (parcelId: string) => void }) => (
    <button
      type="button"
      data-testid="estate-locked-parcel"
      onClick={() => props.onLockedParcelClick?.("north")}
    >
      Open locked parcel
    </button>
  );

  return { default: Canvas, EstateCanvas: Canvas };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("EstateGameClient accessibility", () => {
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
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it("traps focus in the expansion dialog, closes with Escape, and returns focus", async () => {
    const data = await getEstatePageData("en", "yu-e21", {
      getProfileGroupId: async () => "engineering",
      getGroupEarnedPoints: async () => 100000,
    });
    if (!data) throw new Error("Expected estate page data.");

    root = createRoot(container);
    await act(async () => {
      root?.render(
        <I18nProvider locale="en" messages={enMessages}>
          <EstateGameClient
            data={data}
            repository={new MemoryEstateRepository()}
          />
        </I18nProvider>,
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const lockedParcelButton = getButton("Open locked parcel");
    lockedParcelButton.focus();

    await click(lockedParcelButton);

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.contains(document.activeElement)).toBe(true);

    await pressKey("Tab");
    expect(dialog?.contains(document.activeElement)).toBe(true);

    await pressKey("Escape");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(lockedParcelButton);
  });
});

function getButton(name: string): HTMLButtonElement {
  const button = [...document.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.includes(name),
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected button ${name}.`);
  }

  return button;
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function pressKey(key: string) {
  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key }),
    );
  });
}
