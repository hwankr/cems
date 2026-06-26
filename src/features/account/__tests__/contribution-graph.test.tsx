// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { enMessages } from "@/i18n/messages/en";
import { ContributionGraph } from "../components/contribution-graph";
import { buildContributionGraph } from "../domain/contribution";
import type { PointEvent } from "../domain/points";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("ContributionGraph", () => {
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

  async function render(graph: ReturnType<typeof buildContributionGraph>) {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <I18nProvider locale="en" messages={enMessages}>
          <ContributionGraph graph={graph} />
        </I18nProvider>,
      );
    });
  }

  it("renders the empty state when there is no activity", async () => {
    await render(buildContributionGraph([], { todayLabel: "2026-06-26", weeks: 4 }));
    expect(container.textContent).toContain(enMessages.me.graph.empty);
  });

  it("renders a grid of cells when there is activity", async () => {
    const events: PointEvent[] = [
      { id: "1", userId: "u", points: 100, reason: "qr:x", periodLabel: "", createdAt: "2026-06-26T01:00:00Z" },
    ];
    await render(buildContributionGraph(events, { todayLabel: "2026-06-26", weeks: 4 }));
    const cells = container.querySelectorAll("[title]");
    expect(cells.length).toBeGreaterThan(0);
    expect(container.querySelector('[role="img"]')).not.toBeNull();
  });
});
