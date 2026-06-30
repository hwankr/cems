// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { enMessages } from "@/i18n/messages/en";
import { getEstatePageData } from "../data/get-estate-page-data";
import { EstateGameClient } from "../components/estate-game-client";
import type { EstateEditorMode } from "../domain/editor";
import type {
  EstateGridCell,
  EstateItemInstance,
  EstateSnapshot,
} from "../domain/types";
import type { EstateItemActionAnchor } from "../isometric/action-anchor";
import { MemoryEstateRepository } from "../persistence/memory-estate-repository";
import type { SubjectContributor } from "@/features/account/domain/contributor-ranking";

// Expansion is reached only by tapping a locked parcel on the canvas, so the
// mock exposes buttons that fire the same canvas callbacks used by the client.
vi.mock("../components/estate-canvas", async () => {
  const React = await import("react");
  const selectedItemAnchor: EstateItemActionAnchor = {
    x: 240,
    y: 180,
    viewportWidth: 640,
    viewportHeight: 480,
  };

  const Canvas = (props: {
    mode: EstateEditorMode;
    snapshot: EstateSnapshot;
    selectedItemId?: string | null;
    onCellClick?: (cell: EstateGridCell) => void;
    onItemSelect?: (instanceId: string) => void;
    onBackgroundTap?: () => void;
    onLockedParcelClick?: (parcelId: string) => void;
    onSelectedItemAnchorChange?: (
      anchor: EstateItemActionAnchor | null,
    ) => void;
  }) => {
    const {
      onBackgroundTap,
      onItemSelect,
      onLockedParcelClick,
      onSelectedItemAnchorChange,
      selectedItemId,
      snapshot,
    } = props;
    const bench = snapshot.items.find((item) => item.id === "bench-1");

    React.useEffect(() => {
      onSelectedItemAnchorChange?.(
        selectedItemId === "bench-1" ? selectedItemAnchor : null,
      );
    }, [onSelectedItemAnchorChange, selectedItemId]);

    return (
      <>
        <button
          type="button"
          data-testid="estate-locked-parcel"
          onClick={() => onLockedParcelClick?.("north")}
        >
          Open locked parcel
        </button>
        <button
          type="button"
          data-testid="estate-movable-item"
          onClick={() => {
            onItemSelect?.("bench-1");
          }}
        >
          Select movable item
        </button>
        <button
          type="button"
          data-testid="estate-move-target"
          onClick={() => {
            props.onCellClick?.({ x: 10, y: 12 });
          }}
        >
          Choose move target
        </button>
        <button
          type="button"
          data-testid="estate-background"
          onClick={() => onBackgroundTap?.()}
        >
          Tap background
        </button>
        <span data-testid="bench-position">
          {bench ? `${bench.x},${bench.y}` : "missing"}
        </span>
        <span data-testid="estate-mode">{props.mode.type}</span>
      </>
    );
  };

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
      getSubjectAwardTier: async () => null,
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

  it("opens contextual item actions for a selected movable item", async () => {
    const data = await getEstatePageData("en", "yu-e21", {
      getProfileGroupId: async () => "engineering",
      getGroupEarnedPoints: async () => 100000,
      getSubjectAwardTier: async () => null,
    });
    if (!data) throw new Error("Expected estate page data.");

    const movableItem: EstateItemInstance = {
      id: "bench-1",
      definitionId: "bench",
      x: 4,
      y: 8,
      rotation: 0,
      placedAt: "2026-06-28T00:00:00.000Z",
    };

    const dataWithMovableItem = {
      ...data,
      initialSnapshot: {
        ...data.initialSnapshot,
        items: [...data.initialSnapshot.items, movableItem],
      },
    };

    root = createRoot(container);
    await act(async () => {
      root?.render(
        <I18nProvider locale="en" messages={enMessages}>
          <EstateGameClient
            data={dataWithMovableItem}
            repository={new MemoryEstateRepository()}
          />
        </I18nProvider>,
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(queryToolbar()).toBeNull();

    await click(getButton("Select movable item"));
    await flushEffects();

    const toolbar = getToolbar();
    expect(getButtonByAriaLabel(toolbar, "Move")).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(getButtonByAriaLabel(toolbar, "Collect")).toBeInstanceOf(
      HTMLButtonElement,
    );

    await click(getButtonByAriaLabel(toolbar, "Cancel"));
    await flushEffects();

    expect(queryToolbar()).toBeNull();
  });

  it("clears the selection when the background is tapped", async () => {
    const data = await getEstatePageData("en", "yu-e21", {
      getProfileGroupId: async () => "engineering",
      getGroupEarnedPoints: async () => 100000,
      getSubjectAwardTier: async () => null,
    });
    if (!data) throw new Error("Expected estate page data.");

    const movableItem: EstateItemInstance = {
      id: "bench-1",
      definitionId: "bench",
      x: 4,
      y: 8,
      rotation: 0,
      placedAt: "2026-06-28T00:00:00.000Z",
    };
    const dataWithMovableItem = {
      ...data,
      initialSnapshot: {
        ...data.initialSnapshot,
        items: [...data.initialSnapshot.items, movableItem],
      },
    };

    root = createRoot(container);
    await act(async () => {
      root?.render(
        <I18nProvider locale="en" messages={enMessages}>
          <EstateGameClient
            data={dataWithMovableItem}
            repository={new MemoryEstateRepository()}
          />
        </I18nProvider>,
      );
    });
    await flushEffects();

    await click(getButton("Select movable item"));
    await flushEffects();
    expect(queryToolbar()).not.toBeNull();

    await click(getButton("Tap background"));
    await flushEffects();

    expect(queryToolbar()).toBeNull();
  });

  async function renderEstate({
    contributors,
  }: { contributors?: SubjectContributor[] } = {}) {
    const data = await getEstatePageData("en", "yu-e21", {
      getProfileGroupId: async () => "engineering",
      getGroupEarnedPoints: async () => 100000,
      getSubjectAwardTier: async () => null,
    });
    if (!data) throw new Error("Expected estate page data.");

    root = createRoot(container);
    await act(async () => {
      root?.render(
        <I18nProvider locale="en" messages={enMessages}>
          <EstateGameClient
            data={data}
            contributors={contributors}
            repository={new MemoryEstateRepository()}
          />
        </I18nProvider>,
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  it("accepts a contributors prop without breaking the default render", async () => {
    await renderEstate({
      contributors: [
        { userId: "a", displayName: "대표 데모", points: 1200, rank: 1, isMe: true },
      ],
    });
    // Default mode is "view": the member panel is not shown until the main
    // building is selected, but the prop must not throw.
    expect(container.textContent).not.toContain("Saving participants");
  });

  it("keeps move mode until the selected move target is confirmed", async () => {
    const data = await getEstatePageData("en", "yu-e21", {
      getProfileGroupId: async () => "engineering",
      getGroupEarnedPoints: async () => 100000,
      getSubjectAwardTier: async () => null,
    });
    if (!data) throw new Error("Expected estate page data.");

    const movableItem: EstateItemInstance = {
      id: "bench-1",
      definitionId: "bench",
      x: 4,
      y: 8,
      rotation: 0,
      placedAt: "2026-06-28T00:00:00.000Z",
    };
    const dataWithMovableItem = {
      ...data,
      initialSnapshot: {
        ...data.initialSnapshot,
        items: [...data.initialSnapshot.items, movableItem],
      },
    };

    root = createRoot(container);
    await act(async () => {
      root?.render(
        <I18nProvider locale="en" messages={enMessages}>
          <EstateGameClient
            data={dataWithMovableItem}
            repository={new MemoryEstateRepository()}
          />
        </I18nProvider>,
      );
    });
    await flushEffects();

    await click(getButton("Select movable item"));
    await flushEffects();
    await click(getButtonByAriaLabel(document.body, "Move"));
    await flushEffects();
    await click(getButton("Choose move target"));
    await flushEffects();

    expect(getByTestId("bench-position").textContent).toBe("4,8");
    expect(getByTestId("estate-mode").textContent).toBe("moving");
    expect(getButtonByAriaLabel(document.body, "Confirm")).toBeInstanceOf(
      HTMLButtonElement,
    );

    await click(getButtonByAriaLabel(document.body, "Confirm"));
    await flushEffects();

    expect(getByTestId("bench-position").textContent).toBe("10,12");
    expect(getByTestId("estate-mode").textContent).toBe("selected");
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

function getToolbar(): HTMLElement {
  const toolbar = queryToolbar();

  if (!toolbar) {
    throw new Error("Expected contextual item toolbar.");
  }

  return toolbar;
}

function queryToolbar(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="toolbar"]');
}

function getByTestId(testId: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    `[data-testid="${testId}"]`,
  );

  if (!element) {
    throw new Error(`Expected element ${testId}.`);
  }

  return element;
}

function getButtonByAriaLabel(
  rootElement: HTMLElement,
  name: string,
): HTMLButtonElement {
  const button = rootElement.querySelector<HTMLButtonElement>(
    `button[aria-label="${name}"]`,
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

async function flushEffects() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function pressKey(key: string) {
  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key }),
    );
  });
}
