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
import type { EstateEditorMode } from "../domain/editor";
import { canPlaceEstateItem } from "../domain/placement";
import type { EstateGridCell, EstateSnapshot } from "../domain/types";
import {
  fitCameraToWorldBounds,
  focusCameraOnWorldBounds,
  panCameraByCanvasDelta,
  zoomCameraAtCanvasPoint,
  type IsometricCamera,
  type ViewportSize,
} from "../isometric/camera";
import { getCellsWorldBounds, type WorldBounds } from "../isometric/projection";
import {
  getPointerCanvasPosition,
  hitTestDiamondCellAtCanvasPoint,
} from "../isometric/hit-testing";
import {
  createEstateAssetLoadSnapshot,
  EstateAssetLoader,
  type EstateAssetLoadSnapshot,
} from "../isometric/asset-loader";
import {
  createEstateRenderScene,
  EstateIsometricRenderer,
  findTopRenderItemAtCell,
  getSceneCellList,
  getSceneUnlockedWorldBounds,
  type EstateRenderScene,
} from "../isometric/renderer";
import {
  getFootprintActionAnchor,
  getSelectedItemActionAnchor,
  type EstateItemActionAnchor,
} from "../isometric/action-anchor";

export type EstateCanvasProps = {
  snapshot: EstateSnapshot;
  mode?: EstateEditorMode;
  selectedItemId?: string | null;
  fitViewSignal?: number;
  focusParcelId?: string | null;
  recentlyUnlockedParcelId?: string | null;
  unlockAnimationProgress?: number;
  ariaLabel: string;
  ariaSummary: string;
  controls: {
    assetsLoading: string;
    fitView: string;
    zoomIn: string;
    zoomOut: string;
  };
  onCellClick?: (cell: EstateGridCell) => void;
  onLockedParcelClick?: (parcelId: string) => void;
  onGroundPaintStart?: () => void;
  onGroundPaintCell?: (cell: EstateGridCell) => void;
  onGroundPaintEnd?: () => void;
  onItemSelect?: (instanceId: string) => void;
  onBackgroundTap?: () => void;
  onSelectedItemAnchorChange?: (anchor: EstateItemActionAnchor | null) => void;
};

type CanvasViewport = ViewportSize & {
  dpr: number;
};

type TouchPoint = {
  x: number;
  y: number;
};

type PendingCanvasPress =
  | {
      pointerId: number;
      start: TouchPoint;
      last: TouchPoint;
      action: {
        type: "select-item";
        instanceId: string;
      };
    }
  | {
      pointerId: number;
      start: TouchPoint;
      last: TouchPoint;
      action: {
        type: "open-locked-parcel";
        parcelId: string;
      };
    }
  | {
      pointerId: number;
      start: TouchPoint;
      last: TouchPoint;
      action: {
        type: "clear-selection";
      };
    };

const itemDefinitions = [...baseEstateItemDefinitions, ...estateItemCatalog];
const minZoom = 0.25;
const maxZoom = 1.6;
const tapMovementTolerancePx = 10;
const estateDragPanSensitivity = 0.75;

export function EstateCanvas({
  snapshot,
  mode = { type: "view" },
  selectedItemId = null,
  fitViewSignal = 0,
  focusParcelId = null,
  recentlyUnlockedParcelId = null,
  unlockAnimationProgress = 1,
  ariaLabel,
  ariaSummary,
  controls,
  onCellClick,
  onLockedParcelClick,
  onGroundPaintStart,
  onGroundPaintCell,
  onGroundPaintEnd,
  onItemSelect,
  onBackgroundTap,
  onSelectedItemAnchorChange,
}: EstateCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const hasFitInitialViewportRef = useRef(false);
  const pointerPanRef = useRef<{
    pointerId: number;
    last: TouchPoint;
  } | null>(null);
  const pendingCanvasPressRef = useRef<PendingCanvasPress | null>(null);
  const paintPointerRef = useRef<number | null>(null);
  const touchPanRef = useRef<TouchPoint | null>(null);
  const pinchRef = useRef<{
    distance: number;
    midpoint: TouchPoint;
  } | null>(null);
  const cameraAnimationRef = useRef<number | null>(null);
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
  const [assetLoadSnapshot, setAssetLoadSnapshot] =
    useState<EstateAssetLoadSnapshot>(() =>
      createEstateAssetLoadSnapshot(estateAssetManifest),
    );

  const placementPreview = useMemo(() => {
    if (mode.type === "placing") {
      if (!hoverCell) return null;

      const definition = itemDefinitions.find(
        (candidate) => candidate.id === mode.definitionId,
      );
      if (!definition) return null;

      const result = canPlaceEstateItem(
        snapshot,
        {
          definitionId: definition.id,
          x: hoverCell.x,
          y: hoverCell.y,
          rotation: mode.rotation,
        },
        itemDefinitions,
        estateExpansionCatalog,
      );

      return {
        id: "__placement-preview__",
        assetId: definition.assetId,
        x: hoverCell.x,
        y: hoverCell.y,
        rotation: mode.rotation,
        footprintWidth: definition.footprintWidth,
        footprintHeight: definition.footprintHeight,
        valid: result.ok,
      };
    }

    if (mode.type === "moving") {
      const previewCell = mode.targetCell ?? hoverCell;
      if (!previewCell) return null;

      const item = snapshot.items.find(
        (candidate) => candidate.id === mode.instanceId,
      );
      const definition = itemDefinitions.find(
        (candidate) => candidate.id === item?.definitionId,
      );
      if (!item || !definition) return null;

      const result = canPlaceEstateItem(
        snapshot,
        {
          definitionId: definition.id,
          x: previewCell.x,
          y: previewCell.y,
          rotation: mode.rotation,
        },
        itemDefinitions,
        estateExpansionCatalog,
        { ignoreInstanceId: item.id },
      );

      return {
        id: "__move-preview__",
        assetId: definition.assetId,
        x: previewCell.x,
        y: previewCell.y,
        rotation: mode.rotation,
        footprintWidth: definition.footprintWidth,
        footprintHeight: definition.footprintHeight,
        valid: result.ok,
      };
    }

    return null;
  }, [hoverCell, mode, snapshot]);

  const scene = useMemo(
    () =>
      createEstateRenderScene({
        snapshot,
        itemDefinitions,
        parcelDefinitions: estateExpansionCatalog,
        hoverCell,
        selectedItemId,
        placementPreview,
        recentlyUnlockedParcelId,
        animationProgress: unlockAnimationProgress,
        placementActive: mode.type === "placing" || mode.type === "moving",
      }),
    [
      hoverCell,
      mode,
      placementPreview,
      recentlyUnlockedParcelId,
      selectedItemId,
      snapshot,
      unlockAnimationProgress,
    ],
  );

  const sceneRef = useRef<EstateRenderScene>(scene);
  const cameraRef = useRef<IsometricCamera>(camera);
  const viewportRef = useRef<CanvasViewport>(viewport);
  const assetLoadSnapshotRef =
    useRef<EstateAssetLoadSnapshot>(assetLoadSnapshot);
  const lastSelectedItemAnchorRef = useRef<{
    anchor: EstateItemActionAnchor | null;
    hasEmitted: boolean;
    onChange: ((anchor: EstateItemActionAnchor | null) => void) | null;
  }>({
    anchor: null,
    hasEmitted: false,
    onChange: null,
  });

  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    assetLoadSnapshotRef.current = assetLoadSnapshot;
  }, [assetLoadSnapshot]);

  useEffect(() => {
    if (!onSelectedItemAnchorChange) {
      lastSelectedItemAnchorRef.current = {
        anchor: null,
        hasEmitted: false,
        onChange: null,
      };
      return;
    }

    if (lastSelectedItemAnchorRef.current.onChange !== onSelectedItemAnchorChange) {
      lastSelectedItemAnchorRef.current = {
        anchor: null,
        hasEmitted: false,
        onChange: onSelectedItemAnchorChange,
      };
    }

    if (!hasFitInitialViewportRef.current) return;

    // While moving, ride along with the move preview (the ghost at the target
    // or hovered cell) instead of the item's original spot, so the controls sit
    // where the item is being placed.
    const movePreviewHost =
      mode.type === "moving" && placementPreview ? placementPreview : null;
    const nextAnchor = movePreviewHost
      ? getFootprintActionAnchor(
          movePreviewHost,
          scene.metrics,
          camera,
          viewport,
        )
      : selectedItemId
        ? getSelectedItemActionAnchor(scene, {
            itemId: selectedItemId,
            camera,
            viewport,
          })
        : null;
    const lastEmission = lastSelectedItemAnchorRef.current;

    if (
      lastEmission.hasEmitted &&
      areEstateItemActionAnchorsEqual(lastEmission.anchor, nextAnchor)
    ) {
      return;
    }

    lastSelectedItemAnchorRef.current = {
      anchor: nextAnchor,
      hasEmitted: true,
      onChange: onSelectedItemAnchorChange,
    };
    onSelectedItemAnchorChange(nextAnchor);
  }, [
    camera,
    mode,
    onSelectedItemAnchorChange,
    placementPreview,
    scene,
    selectedItemId,
    viewport,
  ]);

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
      assetLoadSnapshotRef.current,
    );
  }, []);

  const markDirty = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(drawLatest);
  }, [drawLatest]);

  const fitViewport = useCallback(
    (nextViewport = viewportRef.current, revealRatio = 0) => {
      const bounds = getSceneUnlockedWorldBounds(sceneRef.current);
      const fitBounds =
        revealRatio > 0 ? expandWorldBoundsByRatio(bounds, revealRatio) : bounds;
      setCamera(
        fitCameraToWorldBounds(fitBounds, nextViewport, {
          padding: 44,
          minZoom,
          maxZoom,
        }),
      );
    },
    [],
  );

  const focusParcel = useCallback((parcelId: string) => {
    const scene = sceneRef.current;
    const parcel = scene.parcels.find((candidate) => candidate.id === parcelId);
    if (!parcel || parcel.cells.length === 0) return;

    const target = focusCameraOnWorldBounds(
      cameraRef.current,
      getCellsWorldBounds(parcel.cells, scene.metrics),
      viewportRef.current,
      {
        padding: 64,
        minZoom,
        maxZoom,
        minZoomRatio: 0.82,
        maxZoomRatio: 1.12,
      },
    );

    animateCameraTo(target);
  }, []);

  useEffect(() => {
    if (fitViewSignal === 0) return;

    fitViewport();
  }, [fitViewport, fitViewSignal]);

  useEffect(() => {
    if (!focusParcelId) return;

    focusParcel(focusParcelId);
  }, [focusParcel, focusParcelId]);

  useEffect(() => {
    markDirty();
  }, [assetLoadSnapshot, camera, markDirty, scene, viewport]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (cameraAnimationRef.current !== null) {
        cancelAnimationFrame(cameraAnimationRef.current);
        cameraAnimationRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const loader = new EstateAssetLoader();
    let cancelled = false;
    const preload = loader.preload(estateAssetManifest);

    Promise.resolve().then(() => {
      if (!cancelled) {
        setAssetLoadSnapshot(loader.getSnapshot(estateAssetManifest));
      }
    });
    preload.then((snapshot) => {
      if (!cancelled) {
        setAssetLoadSnapshot(snapshot);
      }
    });

    return () => {
      cancelled = true;
      loader.dispose();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const syncCanvasSize = (rect: Pick<DOMRectReadOnly, "width" | "height">) => {
      if (rect.width <= 0 || rect.height <= 0) return;
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
        // Zoom out a touch on first load so the surrounding locked plots peek in
        // at the edges, conveying how far the estate can still expand.
        fitViewport(nextViewport, 0.28);
      }

      markDirty();
    };

    syncCanvasSize(container.getBoundingClientRect());

    const initialFrame = requestAnimationFrame(() => {
      syncCanvasSize(container.getBoundingClientRect());
    });

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver((entries) => {
            syncCanvasSize(entries[0]?.contentRect ?? container.getBoundingClientRect());
          });

    observer?.observe(container);

    const handleResize = () => {
      syncCanvasSize(container.getBoundingClientRect());
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(initialFrame);
      observer?.disconnect();
      window.removeEventListener("resize", handleResize);
    };
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
          panCameraByCanvasDelta(
            current,
            {
              x: nextPoint.x - previousPoint.x,
              y: nextPoint.y - previousPoint.y,
            },
            { sensitivity: estateDragPanSensitivity },
          ),
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

    if (event.button === 0 && mode.type === "painting-ground") {
      event.currentTarget.setPointerCapture(event.pointerId);
      paintPointerRef.current = event.pointerId;
      if (cell) {
        setHoverCell(cell);
        onGroundPaintStart?.();
        onGroundPaintCell?.(cell);
      }
      return;
    }

    if (
      event.button === 0 &&
      (mode.type === "placing" || mode.type === "moving")
    ) {
      if (cell) {
        setHoverCell(cell);
        onCellClick?.(cell);
      }
      return;
    }

    const item = cell ? findTopRenderItemAtCell(scene, cell) : null;

    if (item && event.button === 0) {
      event.currentTarget.setPointerCapture(event.pointerId);
      pendingCanvasPressRef.current = {
        pointerId: event.pointerId,
        start: point,
        last: point,
        action: {
          type: "select-item",
          instanceId: item.id,
        },
      };
      return;
    }

    const parcel = cell ? findSceneParcelAtCell(scene, cell) : null;

    if (parcel && !parcel.unlocked && event.button === 0) {
      event.currentTarget.setPointerCapture(event.pointerId);
      pendingCanvasPressRef.current = {
        pointerId: event.pointerId,
        start: point,
        last: point,
        action: {
          type: "open-locked-parcel",
          parcelId: parcel.id,
        },
      };
      return;
    }

    if (event.button === 0) {
      // An unmoved tap on empty ground/background clears the current selection;
      // a drag from here converts to a pan (handlePointerMove).
      event.currentTarget.setPointerCapture(event.pointerId);
      pendingCanvasPressRef.current = {
        pointerId: event.pointerId,
        start: point,
        last: point,
        action: {
          type: "clear-selection",
        },
      };
      return;
    }

    if (event.button === 1) {
      event.currentTarget.setPointerCapture(event.pointerId);
      pointerPanRef.current = {
        pointerId: event.pointerId,
        last: point,
      };
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = getPointerFromReactEvent(event);
    const cell = hitTestDiamondCellAtCanvasPoint(
      point,
      camera,
      viewport,
      { allowedCells: getSceneCellList(scene) },
    );

    if (paintPointerRef.current === event.pointerId) {
      setHoverCell(cell);
      if (cell) {
        onGroundPaintCell?.(cell);
      }
      return;
    }

    const pendingPress = pendingCanvasPressRef.current;

    if (pendingPress?.pointerId === event.pointerId) {
      pendingPress.last = point;

      if (isPastTapMovementTolerance(pendingPress.start, point)) {
        pendingCanvasPressRef.current = null;
        pointerPanRef.current = {
          pointerId: event.pointerId,
          last: point,
        };
        setCamera((current) =>
          panCameraByCanvasDelta(
            current,
            {
              x: point.x - pendingPress.start.x,
              y: point.y - pendingPress.start.y,
            },
            { sensitivity: estateDragPanSensitivity },
          ),
        );
      }

      return;
    }

    if (mode.type === "placing" || mode.type === "moving") {
      setHoverCell(cell);
      return;
    }

    const pan = pointerPanRef.current;

    if (pan?.pointerId === event.pointerId) {
      const delta = {
        x: point.x - pan.last.x,
        y: point.y - pan.last.y,
      };
      pan.last = point;
      setCamera((current) =>
        panCameraByCanvasDelta(current, delta, {
          sensitivity: estateDragPanSensitivity,
        }),
      );
      return;
    }

    setHoverCell(cell);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paintPointerRef.current === event.pointerId) {
      paintPointerRef.current = null;
      onGroundPaintEnd?.();
      return;
    }

    if (pendingCanvasPressRef.current?.pointerId === event.pointerId) {
      const pendingPress = pendingCanvasPressRef.current;
      const releasePoint = getPointerFromReactEvent(event);
      pendingCanvasPressRef.current = null;

      if (!isPastTapMovementTolerance(pendingPress.start, releasePoint)) {
        commitPendingCanvasPress(pendingPress);
      }

      return;
    }

    if (pointerPanRef.current?.pointerId === event.pointerId) {
      pointerPanRef.current = null;
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paintPointerRef.current === event.pointerId) {
      paintPointerRef.current = null;
      onGroundPaintEnd?.();
    }

    if (pendingCanvasPressRef.current?.pointerId === event.pointerId) {
      pendingCanvasPressRef.current = null;
    }

    if (pointerPanRef.current?.pointerId === event.pointerId) {
      pointerPanRef.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
    >
      <p id="estate-canvas-summary" className="sr-only">
        {ariaSummary}
      </p>
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-grab select-none active:cursor-grabbing"
        style={{ touchAction: "none" }}
        role="img"
        aria-label={ariaLabel}
        aria-describedby="estate-canvas-summary"
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />

      <div className="absolute bottom-3 left-3 hidden overflow-hidden rounded-xl border border-[var(--es-line)] bg-[var(--es-panel)] shadow-[0_10px_26px_-14px_rgba(30,50,30,0.45)] backdrop-blur-md lg:flex">
        <CanvasButton label={controls.zoomIn} onClick={() => zoomFromCenter(1.12)}>
          <Plus size={16} aria-hidden="true" />
        </CanvasButton>
        <CanvasButton label={controls.zoomOut} onClick={() => zoomFromCenter(1 / 1.12)}>
          <Minus size={16} aria-hidden="true" />
        </CanvasButton>
        <CanvasButton label={controls.fitView} onClick={() => fitViewport()}>
          <Maximize2 size={16} aria-hidden="true" />
        </CanvasButton>
      </div>
      {assetLoadSnapshot.status === "loading" ? (
        <div
          className="absolute left-1/2 top-3 flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full border border-[var(--es-line)] bg-[var(--es-panel)] px-3 shadow-[0_10px_26px_-14px_rgba(30,50,30,0.45)] backdrop-blur"
          aria-label={controls.assetsLoading}
        >
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--es-accent)]" />
          <span
            className="h-2.5 w-8 animate-pulse rounded-full"
            style={{
              background: "color-mix(in srgb, var(--es-ink-subtle) 30%, transparent)",
            }}
          />
          <span
            className="h-2.5 w-5 animate-pulse rounded-full"
            style={{
              background: "color-mix(in srgb, var(--es-ink-subtle) 22%, transparent)",
            }}
          />
        </div>
      ) : null}
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

  function animateCameraTo(target: IsometricCamera) {
    if (cameraAnimationRef.current !== null) {
      cancelAnimationFrame(cameraAnimationRef.current);
      cameraAnimationRef.current = null;
    }

    if (prefersReducedMotion()) {
      cameraRef.current = target;
      setCamera(target);
      return;
    }

    const start = cameraRef.current;
    const startTime = performance.now();
    const durationMs = 420;

    const step = (time: number) => {
      const progress = Math.min(1, (time - startTime) / durationMs);
      const eased = easeOutCubic(progress);
      const next = {
        x: lerp(start.x, target.x, eased),
        y: lerp(start.y, target.y, eased),
        zoom: lerp(start.zoom, target.zoom, eased),
      };

      cameraRef.current = next;
      setCamera(next);

      if (progress < 1) {
        cameraAnimationRef.current = requestAnimationFrame(step);
      } else {
        cameraAnimationRef.current = null;
      }
    };

    cameraAnimationRef.current = requestAnimationFrame(step);
  }

  function commitPendingCanvasPress(pendingPress: PendingCanvasPress) {
    if (pendingPress.action.type === "select-item") {
      onItemSelect?.(pendingPress.action.instanceId);
      return;
    }

    if (pendingPress.action.type === "open-locked-parcel") {
      onLockedParcelClick?.(pendingPress.action.parcelId);
      return;
    }

    onBackgroundTap?.();
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
      className="grid h-11 w-11 place-items-center border-r border-[var(--es-line)] text-[var(--es-ink-muted)] transition last:border-r-0 hover:bg-[var(--es-accent-soft)] hover:text-[var(--es-accent-strong)]"
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

function findSceneParcelAtCell(
  scene: EstateRenderScene,
  cell: EstateGridCell,
) {
  const key = `${cell.x}:${cell.y}`;

  return (
    scene.parcels.find((parcel) =>
      parcel.cells.some((candidate) => `${candidate.x}:${candidate.y}` === key),
    ) ?? null
  );
}

function expandWorldBoundsByRatio(
  bounds: WorldBounds,
  ratio: number,
): WorldBounds {
  const marginX = (bounds.maxX - bounds.minX) * ratio;
  const marginY = (bounds.maxY - bounds.minY) * ratio;

  return {
    minX: bounds.minX - marginX,
    minY: bounds.minY - marginY,
    maxX: bounds.maxX + marginX,
    maxY: bounds.maxY + marginY,
  };
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3;
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
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

function isPastTapMovementTolerance(start: TouchPoint, end: TouchPoint) {
  return Math.hypot(end.x - start.x, end.y - start.y) > tapMovementTolerancePx;
}

function areEstateItemActionAnchorsEqual(
  left: EstateItemActionAnchor | null,
  right: EstateItemActionAnchor | null,
) {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    Object.is(left.x, right.x) &&
    Object.is(left.y, right.y) &&
    Object.is(left.viewportWidth, right.viewportWidth) &&
    Object.is(left.viewportHeight, right.viewportHeight)
  );
}

export default EstateCanvas;
