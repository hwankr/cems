// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapSettingsPopover } from "../components/map-settings-popover";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    messages: {
      mapView: {
        popup: { close: "닫기" },
        settings: { title: "설정", theme: "테마", language: "언어" },
      },
    },
  }),
}));

vi.mock("@/features/theme/theme-switcher", () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher" />,
}));
vi.mock("../components/language-switcher", () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));
vi.mock("../components/map-display-toggles", () => ({
  MapDisplayToggles: () => <div data-testid="map-display-toggles" />,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("MapSettingsPopover", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("renders theme/language settings without any mode switch", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => {
      root.render(
        <MapSettingsPopover
          open
          onClose={() => {}}
          showLabels
          onToggleLabels={() => {}}
        />,
      );
    });

    expect(container.textContent).toContain("설정");
    expect(container.textContent).toContain("테마");
    expect(container.textContent).toContain("언어");
    expect(container.textContent).not.toContain("모드");
    expect(container.textContent).not.toContain("관리자");
    expect(container.textContent).not.toContain("참여자");
    expect(
      container.querySelector('[data-testid="theme-switcher"]'),
    ).not.toBeNull();

    await act(async () => root.unmount());
  });
});
