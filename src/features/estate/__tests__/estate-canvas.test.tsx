// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoEstateSeedSnapshot } from "../data/demo-estate-data";
import { EstateCanvas } from "../components/estate-canvas";

type ResizeObserverCallback = ConstructorParameters<typeof ResizeObserver>[0];

const mockContext = {
  addColorStop: vi.fn(),
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  closePath: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  ellipse: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  setLineDash: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  strokeRect: vi.fn(),
} as unknown as CanvasRenderingContext2D;

class MockResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(element: Element) {
    this.callback(
      [
        {
          target: element,
          contentRect: {
            width: 720,
            height: 360,
          },
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }

  disconnect = vi.fn();
  unobserve = vi.fn();
}

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("EstateCanvas", () => {
  let animationFrames: FrameRequestCallback[];

  beforeEach(() => {
    animationFrames = [];
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      mockContext,
    );
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 2.5,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it("renders a single DPR-clamped canvas with intentional touch handling", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(
        <EstateCanvas
          snapshot={createDemoEstateSeedSnapshot("yu-e21")}
          selectedItemId="yu-e21:landmark"
        />,
      ),
    );

    await act(async () => {
      for (const callback of animationFrames.splice(0)) {
        callback(0);
      }
    });

    const canvas = document.querySelector("canvas");

    expect(canvas).not.toBeNull();
    expect(canvas?.style.touchAction).toBe("none");
    expect(canvas?.width).toBe(1440);
    expect(canvas?.height).toBe(720);
    expect(mockContext.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);

    await act(async () => root.unmount());
  });
});
