// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { koMessages } from "@/i18n/messages/ko";
import { DemoGuestEntry } from "../components/demo-guest-entry";

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

  it("renders three guest scenario buttons without exposing emails", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <I18nProvider locale="ko" messages={koMessages}>
          <DemoGuestEntry next="/ko/me" />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain("데모로 바로 입장");
    expect(container.textContent).toContain("공과대학 1위");
    expect(container.textContent).toContain("문과대학 1위");
    expect(container.textContent).toContain("영지 꾸미기 체험");
    expect(container.textContent).not.toContain("@cems.demo");
    expect(container.querySelectorAll("form")).toHaveLength(3);
    expect(container.querySelectorAll('input[name="next"]')).toHaveLength(3);
  });
});
