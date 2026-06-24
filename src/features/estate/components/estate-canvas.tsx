"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { estateAssetManifest } from "../data/estate-asset-manifest";
import {
  baseEstateItemDefinitions,
  estateItemCatalog,
} from "../data/estate-item-catalog";
import { estateExpansionCatalog } from "../data/estate-expansion-catalog";
import type { EstateGridCell, EstateSnapshot } from "../domain/types";
import {
  fitCameraToWorldBounds,
  panCameraByCanvasDelta,
  zoomCameraAtCanvasPoint,
  type IsometricCamera,
  type ViewportSize,
} from "../isometric/camera";
import {
  getPointerCanvasPosition,
  hitTestDiamondCellAtCanvasPoint,
} from "../isometric/hit-testing";
import {
  createEstateRenderScene,
  EstateIsometricRenderer,
  findTopRenderItemAtCell,
  getSceneCellList,
  getSceneUnlockedWorldBounds,
  type EstateRenderScene,
} from "../isometric/renderer";

type EstateCanvasProps = {
  snapshot: EstateSnapshot;
  initialSelectedItemId?: string | null;
};

type CanvasViewport = ViewportSize & {
  dpr: number;
};

type TouchPoint = {
  x: number;
  y: number;
};

const itemDefinitions = [...baseEstateItemDefinitions, ...estateItemCatalog];
const minZoom = 0.25;
const maxZoom = 1.6;

export function EstateCanvas({
  snapshot,
  initialSelectedItemId = snapshot.items[0]?.id ?? null,
}: EstateCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const hasFitInitialViewportRef = useRef(false);
  const pointerPanRef = useRef<{
    pointerId: number;
    last: TouchPoint;
  } | null>(null);
  const touchPanRef = useRef<TouchPoint | null>(null);
  const pinchRef = useRef<{
    distance: number;
    midpoint: TouchPoint;
  } | null>(null);
  const [viewport, setViewport] = useState<CanvasViewport>({
    width: 1,
    height: 1,
    dpr: 1,
  });
  const [camera, setCamera] = useState<IsometricCamera>({
    x: 0,
    y: 0,
    zoom: 1,
  });
  const [hoverCell, setHoverCell] = useState<EstateGridCell | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    initialSelectedItemId,
  );

  const scene = useMemo(
    () =>
      createEstateRenderScene({
        snapshot,
        itemDefinitions,
        parcelDefinitions: estateExpansionCatalog,
        hoverCell,
        selectedItemId,
      }),
    [hoverCell, selectedItemId, snapshot],
  );

  const sceneRef = useRef<EstateRenderScene>(scene);
  const cameraRef = useRef<IsometricCamera>(camera);
  const viewportRef = useRef<CanvasViewport>(viewport);

  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const drawLatest = useCallback(() => {
    frameRef.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const nextViewport = viewportRef.current;
    context.setTransform(nextViewport.dpr, 0, 0, nextViewport.dpr, 0, 0);

    new EstateIsometricRenderer(context).draw(
      sceneRef.current,
      cameraRef.current,
      nextViewport,
      estateAssetManifest,
    );
  }, []);

  const markDirty = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(drawLatest);
  }, [drawLatest]);

  const fitViewport = useCallback(
    (nextViewport = viewportRef.current) => {
      const bounds = getSceneUnlockedWorldBounds(sceneRef.current);
      setCamera(
        fitCameraToWorldBounds(bounds, nextViewport, {
          padding: 44,
          minZoom,
          maxZoom,
        }),
      );
    },
    [],
  );

  useEffect(() => {
    markDirty();
  }, [camera, markDirty, scene, viewport]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;

      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const nextViewport = { width, height, dpr };

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      viewportRef.current = nextViewport;
      setViewport(nextViewport);

      if (!hasFitInitialViewportRef.current) {
        hasFitInitialViewportRef.current = true;
        fitViewport(nextViewport);
      }

      markDirty();
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [fitViewport, markDirty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pointer = getPointerCanvasPosition(event, rect, viewportRef.current.dpr);
      const nextZoom =
        cameraRef.current.zoom * Math.exp(Math.max(-1, Math.min(1, -event.deltaY / 420)));

      setCamera(
        zoomCameraAtCanvasPoint(
          cameraRef.current,
          pointer.css,
          viewportRef.current,
          nextZoom,
          { minZoom, maxZoom },
        ),
      );
    };

    const handleTouchStart = (event: TouchEvent) => {
      event.preventDefault();

      if (event.touches.length === 1) {
        touchPanRef.current = getTouchPoint(event.touches[0], canvas);
        pinchRef.current = null;
        return;
      }

      if (event.touches.length === 2) {
        touchPanRef.current = null;
        pinchRef.current = getPinchGesture(event.touches, canvas);
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();

      if (event.touches.length === 1 && touchPanRef.current) {
        const nextPoint = getTouchPoint(event.touches[0], canvas);
        const previousPoint = touchPanRef.current;
        touchPanRef.current = nextPoint;

        setCamera((current) =>
          panCameraByCanvasDelta(current, {
            x: nextPoint.x - previousPoint.x,
            y: nextPoint.y - previousPoint.y,
          }),
        );
        return;
      }

      if (event.touches.length === 2 && pinchRef.current) {
        const nextPinch = getPinchGesture(event.touches, canvas);
        const previousPinch = pinchRef.current;
        pinchRef.current = nextPinch;

        const zoomed = zoomCameraAtCanvasPoint(
          cameraRef.current,
          nextPinch.midpoint,
          viewportRef.current,
          cameraRef.current.zoom * (nextPinch.distance / previousPinch.distance),
          { minZoom, maxZoom },
        );

        setCamera(
          panCameraByCanvasDelta(zoomed, {
            x: nextPinch.midpoint.x - previousPinch.midpoint.x,
            y: nextPinch.midpoint.y - previousPinch.midpoint.y,
          }),
        );
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      event.preventDefault();

      if (event.touches.length === 1) {
        touchPanRef.current = getTouchPoint(event.touches[0], canvas);
        pinchRef.current = null;
      } else {
        touchPanRef.current = null;
        pinchRef.current = null;
      }
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = getPointerFromReactEvent(event);
    const cell = hitTestDiamondCellAtCanvasPoint(
      point,
      camera,
      viewport,
      { allowedCells: getSceneCellList(scene) },
    );
    const item = cell ? findTopRenderItemAtCell(scene, cell) : null;

    if (item && event.button === 0) {
      setSelectedItemId(item.id);
      return;
    }

    if (event.button === 0 || event.button === 1) {
      event.currentTarget.setPointerCapture(event.pointerId);
      pointerPanRef.current = {
        pointerId: event.pointerId,
        last: point,
      };
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = getPointerFromReactEvent(event);
    const pan = pointerPanRef.current;

    if (pan?.pointerId === event.pointerId) {
      const delta = {
        x: point.x - pan.last.x,
        y: point.y - pan.last.y,
      };
      pan.last = point;
      setCamera((current) => panCameraByCanvasDelta(current, delta));
      return;
    }

    const cell = hitTestDiamondCellAtCanvasPoint(
      point,
      camera,
      viewport,
      { allowedCells: getSceneCellList(scene) },
    );
    setHoverCell(cell);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerPanRef.current?.pointerId === event.pointerId) {
      pointerPanRef.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-[28rem] overflow-hidden rounded-xl border border-line bg-inset shadow-card"
    >
      <canvas
        ref={canvasRef}
        className="block h-full min-h-[28rem] w-full cursor-grab select-none active:cursor-grabbing"
        style={{ touchAction: "none" }}
        aria-label="Estate isometric canvas"
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      <div className="absolute left-3 top-3 flex overflow-hidden rounded-lg border border-line bg-surface/90 shadow-card backdrop-blur">
        <CanvasButton label="Zoom in" onClick={() => zoomFromCenter(1.12)}>
          <Plus size={16} aria-hidden="true" />
        </CanvasButton>
        <CanvasButton label="Zoom out" onClick={() => zoomFromCenter(1 / 1.12)}>
          <Minus size={16} aria-hidden="true" />
        </CanvasButton>
        <CanvasButton label="Fit view" onClick={() => fitViewport()}>
          <Maximize2 size={16} aria-hidden="true" />
        </CanvasButton>
      </div>
    </div>
  );

  function zoomFromCenter(multiplier: number) {
    setCamera((current) =>
      zoomCameraAtCanvasPoint(
        current,
        { x: viewportRef.current.width / 2, y: viewportRef.current.height / 2 },
        viewportRef.current,
        current.zoom * multiplier,
        { minZoom, maxZoom },
      ),
    );
  }
}

function CanvasButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid h-10 w-10 place-items-center border-r border-line text-ink-muted transition last:border-r-0 hover:bg-accent-soft hover:text-accent"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function getPointerFromReactEvent(
  event: ReactPointerEvent<HTMLCanvasElement>,
): TouchPoint {
  const rect = event.currentTarget.getBoundingClientRect();
  return getPointerCanvasPosition(event, rect, 1).css;
}

function getTouchPoint(touch: Touch, canvas: HTMLCanvasElement): TouchPoint {
  const rect = canvas.getBoundingClientRect();
  return getPointerCanvasPosition(touch, rect, 1).css;
}

function getPinchGesture(
  touches: TouchList,
  canvas: HTMLCanvasElement,
): { distance: number; midpoint: TouchPoint } {
  const first = getTouchPoint(touches[0], canvas);
  const second = getTouchPoint(touches[1], canvas);
  const x = second.x - first.x;
  const y = second.y - first.y;

  return {
    distance: Math.max(1, Math.hypot(x, y)),
    midpoint: {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    },
  };
}
