// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { koMessages } from "@/i18n/messages/ko";
import { DemoGuestEntryClient } from "../components/demo-guest-entry-client";
import { getDemoGuestDisplayPersonas } from "../demo/demo-guest-personas";

vi.mock("../actions/auth", () => ({
  signInDemoGuestAction: async () => ({ error: null }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("DemoGuestEntry", () => {
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

  it("renders one representative demo account without exposing old demo emails", async () => {
    const guests = getDemoGuestDisplayPersonas();

    root = createRoot(container);
    await act(async () => {
      root!.render(
        <I18nProvider locale="ko" messages={koMessages}>
          <DemoGuestEntryClient guests={guests} next="/ko/me" />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain("대표 데모 계정");
    expect(container.textContent).not.toContain("공과대");
    expect(container.textContent).not.toContain("인문대");
    expect(container.textContent).not.toContain("@cems");
    expect(container.textContent).not.toContain("@cems.demo");
    expect(container.textContent).not.toContain("it@naver.com");
    expect(container.querySelectorAll("form")).toHaveLength(1);
    expect(container.querySelectorAll('input[name="next"]')).toHaveLength(1);
  });
});
