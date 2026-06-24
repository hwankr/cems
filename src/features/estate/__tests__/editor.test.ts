// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  createEstatePurchaseLock,
  getSelectedEstateInstanceId,
  isEstateShortcutEditableTarget,
  resetEstateEditorModeForSubject,
  type EstateEditorMode,
} from "../domain/editor";

describe("estate editor state helpers", () => {
  it("uses explicit editor modes to expose selected instance ids", () => {
    expect(getSelectedEstateInstanceId({ type: "view" })).toBeNull();
    expect(
      getSelectedEstateInstanceId({
        type: "selected",
        instanceId: "item-1",
      }),
    ).toBe("item-1");
    expect(
      getSelectedEstateInstanceId({
        type: "moving",
        instanceId: "item-1",
        rotation: 1,
      }),
    ).toBe("item-1");
  });

  it("resets editing state when the estate subject changes", () => {
    const mode: EstateEditorMode = {
      type: "placing",
      definitionId: "bench",
      rotation: 0,
    };

    expect(resetEstateEditorModeForSubject("yu-e21", "yu-e21", mode)).toBe(
      mode,
    );
    expect(resetEstateEditorModeForSubject("yu-e21", "yu-e22", mode)).toEqual({
      type: "view",
    });
  });

  it("ignores keyboard shortcuts while text controls are focused", () => {
    const input = document.createElement("input");
    const select = document.createElement("select");
    const button = document.createElement("button");
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");

    expect(isEstateShortcutEditableTarget(input)).toBe(true);
    expect(isEstateShortcutEditableTarget(select)).toBe(true);
    expect(isEstateShortcutEditableTarget(editor)).toBe(true);
    expect(isEstateShortcutEditableTarget(button)).toBe(false);
    expect(isEstateShortcutEditableTarget(null)).toBe(false);
  });

  it("guards a purchase button from immediate duplicate execution", () => {
    const lock = createEstatePurchaseLock();

    expect(lock.tryAcquire("bench")).toBe(true);
    expect(lock.tryAcquire("bench")).toBe(false);

    lock.release("bench");

    expect(lock.tryAcquire("bench")).toBe(true);
  });
});
