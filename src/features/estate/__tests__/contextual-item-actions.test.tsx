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

  it("renders selected item actions near the provided anchor", async () => {
    await renderActions();

    const toolbar = getToolbar();

    expect(toolbar.style.left).toBe("184px");
    expect(toolbar.style.top).toBe("112px");
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

  it("shows the selected item name and current selection actions", async () => {
    await renderActions();

    const toolbar = getToolbar();

    expect(toolbar.textContent).toContain("Bench");
    expect(toolbar.textContent).toContain("5, 7");
    expect(toolbar.textContent).toContain("Move");
    expect(toolbar.textContent).toContain("Collect");
    expect(toolbar.textContent).not.toContain("Remove");
  });

  it("invokes the move handler from the Move action", async () => {
    const onMove = vi.fn();
    await renderActions({ onMove });

    await click(getButton("Move"));

    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it("disables item-changing actions for protected items", async () => {
    await renderActions({ protectedItem: true });

    expect(getButton("Move").disabled).toBe(true);
    expect(getButton("Collect").disabled).toBe(true);
  });

  it("shows move-target status and only rotate/cancel actions while moving", async () => {
    await renderActions({
      mode: { type: "moving", instanceId: "bench-1", rotation: 0 },
    });

    const toolbar = getToolbar();

    expect(toolbar.textContent).toContain(
      estateCopy.selection.choosingMoveTarget,
    );
    expect(toolbar.textContent).not.toContain("Move");
    expect(toolbar.textContent).not.toContain("Collect");
    expect(toolbar.textContent).not.toContain("Confirm");
    expect(getButton("Rotate")).toBeInstanceOf(HTMLButtonElement);
    expect(getButtonByAriaLabel("Cancel")).toBeInstanceOf(HTMLButtonElement);
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

    const toolbar = getToolbar();

    expect(toolbar.textContent).toContain("Move target: 9, 11");
    expect(getButton("Confirm")).toBeInstanceOf(HTMLButtonElement);
    expect(getButton("Rotate")).toBeInstanceOf(HTMLButtonElement);
    expect(toolbar.textContent).not.toContain("Collect");

    await click(getButton("Confirm"));

    expect(onConfirmMove).toHaveBeenCalledTimes(1);
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

function getButton(label: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.includes(label),
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected ${label} button.`);
  }

  return button;
}

function getButtonByAriaLabel(label: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected ${label} button.`);
  }

  return button;
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
