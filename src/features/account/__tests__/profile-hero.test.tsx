// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { enMessages } from "@/i18n/messages/en";
import { ProfileHero } from "../components/profile-hero";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("ProfileHero", () => {
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

  it("renders name, handle, and the edit link", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <I18nProvider locale="en" messages={enMessages}>
          <ProfileHero
            displayName="Woohwan"
            handle="eco_hwan"
            bio="Stairs only"
            personalPoints={2500}
            currentStreak={4}
          />
        </I18nProvider>,
      );
    });
    expect(container.textContent).toContain("Woohwan");
    expect(container.textContent).toContain("@eco_hwan");
    expect(container.textContent).toContain("Stairs only");
    const editLink = container.querySelector('a[href="/en/me/edit"]');
    expect(editLink).not.toBeNull();
  });

  it("falls back to placeholder copy when handle and bio are missing", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <I18nProvider locale="en" messages={enMessages}>
          <ProfileHero
            displayName="Chulsoo"
            handle={null}
            bio={null}
            personalPoints={0}
            currentStreak={0}
          />
        </I18nProvider>,
      );
    });
    expect(container.textContent).toContain(enMessages.me.profile.handleFallback);
    expect(container.textContent).toContain(enMessages.me.profile.noBio);
  });
});
