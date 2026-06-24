// @vitest-environment jsdom

import { StrictMode, act } from "react";
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

let activeObserverDisconnect: ReturnType<typeof vi.fn> | null = null;
let animationFrames: Array<{
  callback: FrameRequestCallback;
  cancelled: boolean;
  id: number;
}>;
let nextAnimationFrameId: number;

class MockResizeObserver {
  disconnect = vi.fn();
  unobserve = vi.fn();

  constructor(private readonly callback: ResizeObserverCallback) {
    activeObserverDisconnect = this.disconnect;
  }

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

}

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("EstateCanvas", () => {
  beforeEach(() => {
    animationFrames = [];
    nextAnimationFrameId = 1;
    activeObserverDisconnect = null;
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      mockContext,
    );
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = nextAnimationFrameId;
      nextAnimationFrameId += 1;
      animationFrames.push({ callback, cancelled: false, id });
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => {
      const frame = animationFrames.find((candidate) => candidate.id === id);
      if (frame) {
        frame.cancelled = true;
      }
    }));
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
          ariaLabel="Interactive isometric estate canvas"
          ariaSummary="4 placed objects, 1 unlocked parcel, and 6 ground tiles."
          controls={{
            assetsLoading: "Estate assets loading",
            fitView: "Fit view",
            zoomIn: "Zoom in",
            zoomOut: "Zoom out",
          }}
        />,
      ),
    );

    await flushAnimationFrames();

    const canvas = document.querySelector("canvas");

    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute("role")).toBe("img");
    expect(canvas?.getAttribute("aria-label")).toContain("isometric estate");
    expect(canvas?.getAttribute("aria-describedby")).toBe(
      "estate-canvas-summary",
    );
    expect(document.querySelector("#estate-canvas-summary")?.textContent).toContain(
      "4 placed objects",
    );
    expect(canvas?.style.touchAction).toBe("none");
    expect(canvas?.width).toBe(1440);
    expect(canvas?.height).toBe(720);
    expect(mockContext.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);

    await act(async () => root.unmount());
    expect(activeObserverDisconnect).toHaveBeenCalledTimes(1);
  });

  it("sizes the backing canvas from the container when ResizeObserver is unavailable", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue(
      {
        bottom: 320,
        height: 320,
        left: 0,
        right: 640,
        top: 0,
        width: 640,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      },
    );
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(
        <EstateCanvas
          snapshot={createDemoEstateSeedSnapshot("yu-e21")}
          ariaLabel="Interactive isometric estate canvas"
          ariaSummary="4 placed objects, 1 unlocked parcel, and 6 ground tiles."
          controls={{
            assetsLoading: "Estate assets loading",
            fitView: "Fit view",
            zoomIn: "Zoom in",
            zoomOut: "Zoom out",
          }}
        />,
      ),
    );

    const canvas = document.querySelector("canvas");

    expect(canvas?.width).toBe(1280);
    expect(canvas?.height).toBe(640);
    expect(canvas?.style.width).toBe("640px");
    expect(canvas?.style.height).toBe("320px");

    await act(async () => root.unmount());
  });

  it("reschedules drawing after Strict Mode cancels the initial frame", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(
        <StrictMode>
          <EstateCanvas
            snapshot={createDemoEstateSeedSnapshot("yu-e21")}
            ariaLabel="Interactive isometric estate canvas"
            ariaSummary="4 placed objects, 1 unlocked parcel, and 6 ground tiles."
            controls={{
              assetsLoading: "Estate assets loading",
              fitView: "Fit view",
              zoomIn: "Zoom in",
              zoomOut: "Zoom out",
            }}
          />
        </StrictMode>,
      ),
    );

    await flushAnimationFrames();
    await flushAnimationFrames();

    expect(mockContext.setTransform).toHaveBeenCalled();

    await act(async () => root.unmount());
  });
});

async function flushAnimationFrames() {
  await act(async () => {
    for (const frame of animationFrames.splice(0)) {
      if (!frame.cancelled) {
        frame.callback(0);
      }
    }
  });
}
