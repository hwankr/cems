// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { enMessages } from "@/i18n/messages/en";
import { EstateContribution } from "../components/estate-contribution";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("EstateContribution", () => {
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

  it("renders a provided action node and the contribution percent", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <I18nProvider locale="en" messages={enMessages}>
          <EstateContribution
            personalPoints={50}
            groupPoolPoints={200}
            action={<button type="button">claim</button>}
          />
        </I18nProvider>,
      );
    });

    const actionButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "claim",
    );
    expect(actionButton).toBeDefined();
    expect(container.textContent).toContain("25%"); // 50 / 200
  });
});
