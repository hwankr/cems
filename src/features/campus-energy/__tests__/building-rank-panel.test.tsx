// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuildingRankPanel } from "../components/building-rank-panel";
import type { EnergyComparison, EnergySubject } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: { mapView: { rankTitle: "건물 절감 순위" } },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const subjects: EnergySubject[] = [
  {
    id: "a",
    schoolId: "yu",
    campusId: "yu-main",
    type: "building",
    name: "International Center",
    shortName: "IC",
  },
];

const comparisons: EnergyComparison[] = [
  {
    subjectId: "a",
    actualKwh: 650,
    forecastKwh: 812,
    periodLabel: "2026-06",
    deltaKwh: -162,
    savingsKwh: 162,
    overuseKwh: 0,
    savingsRate: 0.2,
    status: "saving",
  },
];

function renderPanel(
  root: Root,
  variant: "floating" | "sheet",
  onToggle = () => {},
) {
  return root.render(
    <BuildingRankPanel
      subjects={subjects}
      comparisons={comparisons}
      selectedSubjectId=""
      onSelectSubject={() => {}}
      open
      onToggle={onToggle}
      query=""
      variant={variant}
    />,
  );
}

describe("BuildingRankPanel", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("uses the floating container by default", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => renderPanel(root, "floating"));

    const panel = container.firstElementChild as HTMLElement;
    expect(panel.className).toContain("rounded-2xl");
    expect(panel.className).toContain("w-[19.5rem]");

    await act(async () => root.unmount());
  });

  it("uses a full-width rounded-top container in sheet variant and toggles", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    const onToggle = vi.fn();

    await act(async () => renderPanel(root, "sheet", onToggle));

    const panel = container.firstElementChild as HTMLElement;
    expect(panel.className).toContain("w-full");
    expect(panel.className).toContain("rounded-t-2xl");

    const toggle = container.querySelector(
      'button[aria-expanded="true"]',
    ) as HTMLButtonElement;
    await act(async () => toggle.click());
    expect(onToggle).toHaveBeenCalledTimes(1);

    await act(async () => root.unmount());
  });
});
