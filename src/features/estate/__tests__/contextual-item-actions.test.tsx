// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enMessages } from "@/i18n/messages/en";
import { estateItemCatalog } from "../data/estate-item-catalog";
import type { EstateItemDefinition } from "../domain/types";
import type { EstateItemActionAnchor } from "../isometric/action-anchor";
import {
  ContextualItemActions,
  getContextualActionMenuPosition,
} from "../components/contextual-item-actions";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const benchDefinition = getRequiredItemDefinition("bench");
const benchInstance = {
  id: "bench-1",
  definitionId: "bench",
  x: 5,
  y: 7,
  rotation: 0,
  placedAt: "2026-06-28T00:00:00.000Z",
} as const;

const estateCopy = {
  ...enMessages.estate,
  selection: {
    ...enMessages.estate.selection,
    itemActions: "Item actions",
    collect: "Collect",
  },
};

const legacyEstateCopy = {
  ...enMessages.estate,
  selection: {
    cancel: enMessages.estate.selection.cancel,
    choosingMoveTarget: enMessages.estate.selection.choosingMoveTarget,
    move: enMessages.estate.selection.move,
    remove: "Remove",
    rotate: enMessages.estate.selection.rotate,
  },
} as unknown as Parameters<typeof ContextualItemActions>[0]["copy"];

const anchor: EstateItemActionAnchor = {
  x: 320,
  y: 200,
  viewportWidth: 640,
  viewportHeight: 480,
};

let root: Root | null;
let container: HTMLDivElement;

describe("ContextualItemActions", () => {
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

  it("anchors the selected controls near the item", async () => {
    await renderActions();

    const toolbar = getToolbar();

    // The cluster is anchored to the item, so it carries inline positioning
    // derived from the anchor.
    expect(toolbar.style.left).not.toBe("");
    expect(toolbar.style.top).not.toBe("");
    expect(toolbar.getAttribute("aria-label")).toBe(
      estateCopy.selection.itemActions,
    );
  });

  it("falls back to an aria label composed from existing localized action copy", async () => {
    await renderActions({ copy: legacyEstateCopy });

    expect(getToolbar().getAttribute("aria-label")).toBe(
      "Move, Rotate, Remove, Cancel",
    );
  });

  it("falls back to the visible moving controls when future item action copy is absent", async () => {
    await renderActions({
      copy: legacyEstateCopy,
      mode: { type: "moving", instanceId: "bench-1", rotation: 0 },
    });

    expect(getToolbar().getAttribute("aria-label")).toBe("Rotate, Cancel");
  });

  it("renders no toolbar when no anchor is available", async () => {
    await renderActions({ anchor: null });

    expect(queryToolbar()).toBeNull();
  });

  it("shows the selected item's actions as icon-only buttons", async () => {
    await renderActions();

    const toolbar = getToolbar();

    // Simplified to icons: the item name is a tooltip, not visible body text,
    // and the coordinate readout is gone.
    expect(toolbar.getAttribute("title")).toBe("Bench");
    expect(toolbar.textContent).toBe("");
    expect(getButtonByAriaLabel("Move")).toBeInstanceOf(HTMLButtonElement);
    expect(getButtonByAriaLabel("Rotate")).toBeInstanceOf(HTMLButtonElement);
    expect(getButtonByAriaLabel("Collect")).toBeInstanceOf(HTMLButtonElement);
    expect(getButtonByAriaLabel("Cancel")).toBeInstanceOf(HTMLButtonElement);
  });

  it("invokes the move handler from the Move action", async () => {
    const onMove = vi.fn();
    await renderActions({ onMove });

    await click(getButtonByAriaLabel("Move"));

    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it("disables item-changing actions for protected items", async () => {
    await renderActions({ protectedItem: true });

    expect(getButtonByAriaLabel("Move").disabled).toBe(true);
    expect(getButtonByAriaLabel("Collect").disabled).toBe(true);
  });

  it("shows only rotate and cancel while choosing a move target", async () => {
    await renderActions({
      mode: { type: "moving", instanceId: "bench-1", rotation: 0 },
    });

    expect(getButtonByAriaLabel("Rotate")).toBeInstanceOf(HTMLButtonElement);
    expect(getButtonByAriaLabel("Cancel")).toBeInstanceOf(HTMLButtonElement);
    expect(queryButtonByAriaLabel("Move")).toBeNull();
    expect(queryButtonByAriaLabel("Collect")).toBeNull();
    expect(queryButtonByAriaLabel("Confirm")).toBeNull();
  });

  it("shows a confirm action after a move target is selected", async () => {
    const onConfirmMove = vi.fn();
    await renderActions({
      mode: {
        type: "moving",
        instanceId: "bench-1",
        rotation: 0,
        targetCell: { x: 9, y: 11 },
      },
      onConfirmMove,
    });

    expect(getButtonByAriaLabel("Confirm")).toBeInstanceOf(HTMLButtonElement);
    expect(getButtonByAriaLabel("Rotate")).toBeInstanceOf(HTMLButtonElement);
    expect(queryButtonByAriaLabel("Collect")).toBeNull();

    await click(getButtonByAriaLabel("Confirm"));

    expect(onConfirmMove).toHaveBeenCalledTimes(1);
  });

  it("anchors the moving controls near the item, not a bottom bar", async () => {
    await renderActions({
      mode: { type: "moving", instanceId: "bench-1", rotation: 0 },
    });

    const toolbar = getToolbar();

    expect(toolbar.style.left).not.toBe("");
    expect(toolbar.style.top).not.toBe("");
  });

  it("renders no moving controls without an anchor", async () => {
    await renderActions({
      anchor: null,
      mode: { type: "moving", instanceId: "bench-1", rotation: 0 },
    });

    expect(queryToolbar()).toBeNull();
  });
});

describe("getContextualActionMenuPosition", () => {
  it("clamps a menu inside viewport and reserved vertical regions", () => {
    expect(
      getContextualActionMenuPosition({
        anchor: {
          x: 4,
          y: 10,
          viewportWidth: 320,
          viewportHeight: 240,
        },
        menuWidth: 248,
        menuHeight: 76,
        topReserved: 72,
        bottomReserved: 92,
      }),
    ).toEqual({ left: 12, top: 72 });
  });
});

async function renderActions(
  overrides: Partial<
    Omit<
      Parameters<typeof ContextualItemActions>[0],
      "definition" | "instance"
    >
  > = {},
) {
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <ContextualItemActions
        copy={estateCopy}
        definition={benchDefinition}
        instance={benchInstance}
        mode={{ type: "selected", instanceId: "bench-1" }}
        protectedItem={false}
        anchor={anchor}
        onCancel={() => {}}
        onConfirmMove={() => {}}
        onMove={() => {}}
        onRotate={() => {}}
        onCollect={() => {}}
        {...overrides}
      />,
    );
  });
}

function getToolbar(): HTMLElement {
  const toolbar = queryToolbar();

  if (!toolbar) {
    throw new Error("Expected contextual action toolbar.");
  }

  return toolbar;
}

function queryToolbar(): HTMLElement | null {
  return container.querySelector<HTMLElement>('[role="toolbar"]');
}

function getButtonByAriaLabel(label: string): HTMLButtonElement {
  const button = queryButtonByAriaLabel(label);

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected ${label} button.`);
  }

  return button;
}

function queryButtonByAriaLabel(label: string): HTMLButtonElement | null {
  return container.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function getRequiredItemDefinition(
  definitionId: string,
): EstateItemDefinition {
  const definition = estateItemCatalog.find(
    (candidate) => candidate.id === definitionId,
  );

  if (!definition) {
    throw new Error(`Expected ${definitionId} estate item definition.`);
  }

  return definition;
}
