// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MapLoadingFallback } from "../components/map-loading-fallback";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("MapLoadingFallback", () => {
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

  it("announces that the map is loading", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(<MapLoadingFallback />);
    });

    const status = container.querySelector('[role="status"]');

    expect(status).not.toBeNull();
    expect(status?.textContent).toContain("지도");
    expect(status?.textContent).toContain("불러오는 중");
  });
});
