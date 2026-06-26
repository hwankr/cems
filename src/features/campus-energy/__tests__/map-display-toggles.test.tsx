// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapDisplayToggles } from "../components/map-display-toggles";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    messages: {
      mapView: {
        controls: { heatmap: "Usage heatmap", labels: "Building labels" },
      },
    },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("MapDisplayToggles", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("reflects active state and calls the handlers", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    const onToggleHeat = vi.fn();
    const onToggleLabels = vi.fn();

    await act(async () =>
      root.render(
        <MapDisplayToggles
          showHeat
          onToggleHeat={onToggleHeat}
          showLabels={false}
          onToggleLabels={onToggleLabels}
        />,
      ),
    );

    const heat = container.querySelector(
      'button[aria-label="Usage heatmap"]',
    ) as HTMLButtonElement;
    const labels = container.querySelector(
      'button[aria-label="Building labels"]',
    ) as HTMLButtonElement;

    expect(heat.getAttribute("aria-pressed")).toBe("true");
    expect(labels.getAttribute("aria-pressed")).toBe("false");

    await act(async () => heat.click());
    await act(async () => labels.click());

    expect(onToggleHeat).toHaveBeenCalledTimes(1);
    expect(onToggleLabels).toHaveBeenCalledTimes(1);

    await act(async () => root.unmount());
  });
});
