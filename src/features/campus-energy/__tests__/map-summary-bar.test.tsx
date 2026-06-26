// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapSummaryBar } from "../components/map-summary-bar";
import type { EnergySummary } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      mapView: {
        summaryRealtimeShort: "실시간",
        summaryNetSavingShort: "순절감",
      },
    },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function makeSummary(actualKwh: number, forecastKwh: number): EnergySummary {
  return {
    actualKwh,
    forecastKwh,
    savingsKwh: Math.max(0, forecastKwh - actualKwh),
    overuseKwh: Math.max(0, actualKwh - forecastKwh),
    netDeltaKwh: actualKwh - forecastKwh,
    netSavingsRate: 0,
  };
}

describe("MapSummaryBar", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("shows realtime usage and a saving as one no-wrap line", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(<MapSummaryBar summary={makeSummary(64_480, 64_536)} />),
    );

    const root_el = container.firstElementChild as HTMLElement;
    expect(root_el.className).toContain("whitespace-nowrap");
    expect(container.textContent).toContain("64,480");
    // net = forecast - actual = 56 → saving → leading "−"
    expect(container.textContent).toContain("−56");
    expect(container.textContent).not.toContain("+56");

    await act(async () => root.unmount());
  });

  it("marks an overuse with a leading +", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(<MapSummaryBar summary={makeSummary(100, 60)} />),
    );

    // net = 60 - 100 = -40 → overuse → leading "+40"
    expect(container.textContent).toContain("+40");

    await act(async () => root.unmount());
  });
});
