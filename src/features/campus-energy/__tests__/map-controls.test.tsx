// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapControls } from "../components/map-controls";

vi.mock(
  "@/i18n/client",
  () => ({
    useI18n: () => ({
      messages: {
        mapView: {
          controls: {
            zoomIn: "Zoom in",
            zoomOut: "Zoom out",
            resetView: "Reset view",
            heatmap: "Usage heatmap",
            labels: "Building labels",
            settings: "Map settings",
          },
        },
      },
    }),
  }),
);

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("MapControls", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("renders a reset view control that calls the provided handler", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    const onResetView = vi.fn();
    document.body.append(container);

    await act(async () =>
      root.render(
        <MapControls
          onZoomIn={() => {}}
          onZoomOut={() => {}}
          onResetView={onResetView}
          showHeat={false}
          onToggleHeat={() => {}}
          showLabels
          onToggleLabels={() => {}}
          onOpenSettings={() => {}}
        />,
      ),
    );

    const resetButton = document.querySelector(
      'button[aria-label="Reset view"]',
    ) as HTMLButtonElement | null;

    expect(resetButton).not.toBeNull();

    await act(async () => resetButton?.click());

    expect(onResetView).toHaveBeenCalledTimes(1);

    await act(async () => root.unmount());
  });

  it("keeps the settings button always visible but hides heat/label buttons below sm", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(
        <MapControls
          onZoomIn={() => {}}
          onZoomOut={() => {}}
          onResetView={() => {}}
          showHeat={false}
          onToggleHeat={() => {}}
          showLabels
          onToggleLabels={() => {}}
          onOpenSettings={() => {}}
        />,
      ),
    );

    const heat = container.querySelector('button[aria-label="Usage heatmap"]');
    const labels = container.querySelector('button[aria-label="Building labels"]');
    const settings = container.querySelector('button[aria-label="Map settings"]');

    // Heat + labels sit inside a wrapper hidden below sm.
    expect(heat?.closest(".hidden")).not.toBeNull();
    expect(labels?.closest(".hidden")).not.toBeNull();
    // Settings is not inside that hidden wrapper.
    expect(settings?.closest(".hidden")).toBeNull();

    await act(async () => root.unmount());
  });
});
