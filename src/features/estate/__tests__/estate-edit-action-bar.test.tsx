// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enMessages } from "@/i18n/messages/en";
import { EstateEditActionBar } from "../components/estate-edit-action-bar";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null;
let container: HTMLDivElement;

const baseProps = {
  copy: enMessages.estate,
  mode: { type: "selected" as const, instanceId: "bench-1" },
  canRotate: true,
  canConfirm: false,
  onMove: () => {},
  onRotate: () => {},
  onCollect: () => {},
  onConfirm: () => {},
  onCancel: () => {},
};

describe("EstateEditActionBar", () => {
  beforeEach(() => {
    root = null;
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    document.body.replaceChildren();
  });

  it("shows move/rotate/collect/cancel when an item is selected", async () => {
    await render({ mode: { type: "selected", instanceId: "bench-1" } });
    expect(button("Move")).toBeInstanceOf(HTMLButtonElement);
    expect(button("Rotate")).toBeInstanceOf(HTMLButtonElement);
    expect(button("Collect")).toBeInstanceOf(HTMLButtonElement);
    expect(button("Cancel")).toBeInstanceOf(HTMLButtonElement);
  });

  it("shows confirm/rotate/cancel while moving and fires confirm", async () => {
    const onConfirm = vi.fn();
    await render({
      mode: { type: "moving", instanceId: "bench-1", rotation: 0 },
      canConfirm: true,
      onConfirm,
    });
    expect(query("Move")).toBeNull();
    await click(button("Confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables confirm until a valid target is chosen", async () => {
    await render({
      mode: { type: "moving", instanceId: "bench-1", rotation: 0 },
      canConfirm: false,
    });
    expect(button("Confirm").disabled).toBe(true);
  });
});

async function render(
  overrides: Partial<Parameters<typeof EstateEditActionBar>[0]>,
) {
  root = createRoot(container);
  await act(async () => {
    root?.render(<EstateEditActionBar {...baseProps} {...overrides} />);
  });
}

function query(label: string) {
  return container.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
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
