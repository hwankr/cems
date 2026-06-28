"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Coins,
  Hammer,
  Leaf,
  Loader2,
  Maximize2,
  Package,
  Paintbrush,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "@/i18n/client";
import { formatKwh, formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import {
  baseEstateBuildingDefinition,
  estateItemCatalog,
} from "../data/estate-item-catalog";
import { estateExpansionCatalog } from "../data/estate-expansion-catalog";
import type { EstatePageData } from "../data/get-estate-page-data";
import {
  getSelectedEstateInstanceId,
  isEstateShortcutEditableTarget,
  resetEstateEditorModeForSubject,
  type EstateEditorMode,
  type EstateSaveStatus,
} from "../domain/editor";
import {
  getCellKey,
  isParcelAdjacentToUnlockedParcel,
} from "../domain/expansion";
import { getInventoryQuantity } from "../domain/inventory";
import {
  MAIN_BUILDING_MAX_LEVEL,
  clampMainBuildingLevel,
  getMainBuildingUpgradeCost,
} from "../domain/main-building";
import { findEstateItemDefinition } from "../domain/placement";
import { calculateEstatePointAccount } from "../domain/point-account";
import { paintEstateGroundCells } from "../domain/commands";
import { estateReducer } from "../domain/reducer";
import type {
  EstateCommand,
  EstateCommandContext,
  EstateExpansionParcelDefinition,
  EstateGridCell,
  EstateItemDefinition,
  EstateSnapshot,
  QuarterTurn,
} from "../domain/types";
import type { EstateItemActionAnchor } from "../isometric/action-anchor";
import type { EstateRepository } from "../persistence/estate-repository";
import { createEstateTableClient } from "../persistence/estate-table-client";
import { SupabaseEstateRepository } from "../persistence/supabase-estate-repository";
import type { EstateCanvasProps } from "./estate-canvas";
import { ContextualItemActions } from "./contextual-item-actions";
import {
  createEstateId,
  getItemName,
  getParcelName,
  type EstateMessages,
} from "./estate-copy";
import { EstateBuildingCard } from "./estate-building-card";
import { ItemThumb } from "./estate-item-thumb";
import styles from "./estate-shell.module.css";

const EstateCanvas = dynamic<EstateCanvasProps>(
  () => import("./estate-canvas").then((module) => module.default),
  { ssr: false },
);

type EstateGameClientProps = {
  data: EstatePageData;
  repository?: EstateRepository;
};

const itemDefinitions = estateItemCatalog;
const allItemDefinitions = [baseEstateBuildingDefinition, ...estateItemCatalog];
const expensiveConfirmationPoint = 700;
const saveDebounceMs = 360;

export function EstateGameClient({ data, repository }: EstateGameClientProps) {
  const { locale, messages } = useI18n();
  const copy = messages.estate;
  const [snapshot, setSnapshot] = useState<EstateSnapshot>(
    data.initialSnapshot,
  );
  const [mode, setMode] = useState<EstateEditorMode>({ type: "view" });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<EstateSaveStatus>("saved");
  const [fitViewSignal, setFitViewSignal] = useState(0);
  const [focusParcelId, setFocusParcelId] = useState<string | null>(null);
  const [selectedActionAnchor, setSelectedActionAnchor] =
    useState<EstateItemActionAnchor | null>(null);
  const [pendingExpansionParcelId, setPendingExpansionParcelId] = useState<
    string | null
  >(null);
  const [recentlyUnlockedParcelId, setRecentlyUnlockedParcelId] = useState<
    string | null
  >(null);
  const [unlockAnimationProgress, setUnlockAnimationProgress] = useState(1);
  const subjectIdRef = useRef(data.subject.id);
  const previousSubjectIdRef = useRef(data.subject.id);
  const snapshotRef = useRef(snapshot);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expansionAnimationFrameRef = useRef<number | null>(null);
  const latestSnapshotToSaveRef = useRef<EstateSnapshot | null>(null);
  const groundDragVisitedCellKeysRef = useRef(new Set<string>());
  const repositoryRef = useRef<EstateRepository | null>(null);
  const focusReturnRef = useRef<HTMLElement | null>(null);

  if (repositoryRef.current === null) {
    repositoryRef.current =
      repository ??
      new SupabaseEstateRepository({ client: createEstateTableClient() });
  }

  const savedEnergyValue = data.comparison
    ? formatKwh(locale, data.comparison.savingsKwh)
    : messages.estate.unavailable;
  const officialCode = data.subject.officialCode ?? data.subject.shortName;
  const pointAccount = useMemo(
    () =>
      calculateEstatePointAccount(
        data.pointAccount.earnedPoints,
        snapshot.transactions,
      ),
    [data.pointAccount.earnedPoints, snapshot.transactions],
  );
  const selectedInstanceId = getSelectedEstateInstanceId(mode);
  const selectedInstance = selectedInstanceId
    ? snapshot.items.find((item) => item.id === selectedInstanceId) ?? null
    : null;
  const selectedDefinition = selectedInstance
    ? findEstateItemDefinition(allItemDefinitions, selectedInstance.definitionId)
    : null;
  const selectedIsProtected =
    selectedInstance?.definitionId === baseEstateBuildingDefinition.id;
  const unlockedParcelCount = snapshot.unlockedParcelIds.length;
  const mainBuildingLevel = clampMainBuildingLevel(snapshot.mainBuildingLevel);
  const nextUpgradeCost = getMainBuildingUpgradeCost(mainBuildingLevel);
  const pendingExpansionParcel = pendingExpansionParcelId
    ? estateExpansionCatalog.find(
        (parcel) => parcel.id === pendingExpansionParcelId,
      ) ?? null
    : null;
  const showMessage = useCallback((nextMessage: string) => {
    setMessage(nextMessage);

    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }

    messageTimerRef.current = setTimeout(() => {
      setMessage(null);
    }, 2600);
  }, []);

  const createCommandContext = useCallback(
    (): EstateCommandContext => ({
      earnedPoints: data.pointAccount.earnedPoints,
      itemDefinitions,
      parcelDefinitions: estateExpansionCatalog,
      createId: createEstateId,
      now: () => new Date().toISOString(),
    }),
    [data.pointAccount.earnedPoints],
  );

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    let savedAtLeastOnce = false;

    while (latestSnapshotToSaveRef.current) {
      const snapshotToSave = latestSnapshotToSaveRef.current;
      latestSnapshotToSaveRef.current = null;
      setSaveStatus("saving");

      const result = await repositoryRef.current?.save(
        snapshotToSave.subjectId,
        snapshotToSave,
      );

      if (!result?.ok) {
        if (result && !result.ok && result.error.code === "conflict") {
          // Another group member saved first. Reload the authoritative
          // server snapshot instead of clobbering it (optimistic concurrency).
          const reload = await repositoryRef.current?.load(
            snapshotToSave.subjectId,
          );
          if (reload?.ok && reload.snapshot) {
            snapshotRef.current = reload.snapshot;
            setSnapshot(reload.snapshot);
          }
          setSaveStatus("saved");
          showMessage(copy.messages.reloaded);
          return;
        }
        setSaveStatus("failed");
        return;
      }

      savedAtLeastOnce = true;
    }

    if (savedAtLeastOnce) {
      setSaveStatus("saved");
    }
  }, [copy.messages, showMessage]);

  const scheduleSave = useCallback(
    (nextSnapshot: EstateSnapshot) => {
      latestSnapshotToSaveRef.current = nextSnapshot;
      setSaveStatus("saving");

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        void flushSave();
      }, saveDebounceMs);
    },
    [flushSave],
  );

  const commitSnapshot = useCallback(
    (nextSnapshot: EstateSnapshot) => {
      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
      scheduleSave(nextSnapshot);
    },
    [scheduleSave],
  );

  const applyCommand = useCallback(
    (command: EstateCommand) => {
      const result = estateReducer(
        snapshotRef.current,
        command,
        createCommandContext(),
      );

      if (!result.ok) {
        showMessage(copy.commandFailures[result.reason]);
        return result;
      }

      commitSnapshot(result.snapshot);
      return result;
    },
    [commitSnapshot, copy.commandFailures, createCommandContext, showMessage],
  );

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    const previousSubjectId = previousSubjectIdRef.current;
    previousSubjectIdRef.current = data.subject.id;
    subjectIdRef.current = data.subject.id;
    let cancelled = false;

    const resetTimer = setTimeout(() => {
      void flushSave();
      groundDragVisitedCellKeysRef.current = new Set();
      setMode((current) =>
        resetEstateEditorModeForSubject(
          previousSubjectId,
          data.subject.id,
          current,
        ),
      );
      setSheetOpen(false);
      setPendingExpansionParcelId(null);
      setFocusParcelId(null);
      setRecentlyUnlockedParcelId(null);
      setUnlockAnimationProgress(1);
      setSnapshot(data.initialSnapshot);
      snapshotRef.current = data.initialSnapshot;
      setSaveStatus("saved");
      setMessage(null);

      repositoryRef.current?.load(data.subject.id).then((result) => {
        if (cancelled) return;

        if (!result.ok) {
          setSaveStatus("failed");
          showMessage(copy.messages.cannotLoad);
          return;
        }

        if (result.snapshot) {
          snapshotRef.current = result.snapshot;
          setSnapshot(result.snapshot);
        }

        if (result.recovered) {
          showMessage(copy.messages.recovered);
        }
      });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(resetTimer);
    };
  }, [copy.messages, data.initialSnapshot, data.subject.id, flushSave, showMessage]);

  useEffect(() => {
    const flush = () => {
      void flushSave();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      flush();
    };
  }, [flushSave]);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (expansionAnimationFrameRef.current) {
        cancelAnimationFrame(expansionAnimationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!recentlyUnlockedParcelId) return;

    if (prefersReducedMotion()) {
      expansionAnimationFrameRef.current = requestAnimationFrame(() => {
        setUnlockAnimationProgress(1);
        setRecentlyUnlockedParcelId(null);
        expansionAnimationFrameRef.current = null;
      });

      return () => {
        if (expansionAnimationFrameRef.current) {
          cancelAnimationFrame(expansionAnimationFrameRef.current);
          expansionAnimationFrameRef.current = null;
        }
      };
    }

    const startTime = performance.now();
    const durationMs = 520;

    const step = (time: number) => {
      const progress = Math.min(1, (time - startTime) / durationMs);
      setUnlockAnimationProgress(progress);

      if (progress < 1) {
        expansionAnimationFrameRef.current = requestAnimationFrame(step);
      } else {
        expansionAnimationFrameRef.current = null;
        setRecentlyUnlockedParcelId(null);
      }
    };

    expansionAnimationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (expansionAnimationFrameRef.current) {
        cancelAnimationFrame(expansionAnimationFrameRef.current);
        expansionAnimationFrameRef.current = null;
      }
    };
  }, [recentlyUnlockedParcelId]);

  const cancelEditing = useCallback(() => {
    setMode((current) => {
      if (current.type === "moving") {
        return { type: "selected", instanceId: current.instanceId };
      }

      return { type: "view" };
    });
  }, []);

  const rotateActiveItem = useCallback(() => {
    const activeInstanceId = getSelectedEstateInstanceId(mode);
    if (!activeInstanceId) return;

    const instance = snapshotRef.current.items.find(
      (item) => item.id === activeInstanceId,
    );
    const definition = instance
      ? findEstateItemDefinition(allItemDefinitions, instance.definitionId)
      : null;

    if (!instance || !definition || !definition.canRotate) {
      showMessage(copy.messages.cannotRotate);
      return;
    }

    if (mode.type === "moving") {
      setMode({
        ...mode,
        rotation: nextQuarterTurn(mode.rotation),
      });
      return;
    }

    const rotation = nextQuarterTurn(instance.rotation);
    const result = applyCommand({
      type: "move-item",
      instanceId: instance.id,
      x: instance.x,
      y: instance.y,
      rotation,
    });

    if (result.ok) {
      setMode({ type: "selected", instanceId: instance.id });
    }
  }, [applyCommand, copy.messages.cannotRotate, mode, showMessage]);

  const removeSelectedItem = useCallback(() => {
    const instanceId = getSelectedEstateInstanceId(mode);
    if (!instanceId) return;

    const instance = snapshotRef.current.items.find(
      (item) => item.id === instanceId,
    );
    const definition = instance
      ? findEstateItemDefinition(allItemDefinitions, instance.definitionId)
      : null;

    if (!instance || !definition) return;

    if (
      definition.cost >= expensiveConfirmationPoint &&
      !window.confirm(
        interpolate(copy.messages.removeConfirm, {
          item: getItemName(definition, copy),
        }),
      )
    ) {
      return;
    }

    const result = applyCommand({ type: "remove-item", instanceId });
    if (result.ok) {
      setMode({ type: "view" });
      showMessage(copy.messages.removed);
    }
  }, [applyCommand, copy, mode, showMessage]);

  const handleUpgradeBuilding = useCallback(() => {
    const result = applyCommand({ type: "upgrade-main-building" });
    if (result.ok) {
      showMessage(
        interpolate(copy.messages.upgraded, {
          level: result.snapshot.mainBuildingLevel,
        }),
      );
    }
  }, [applyCommand, copy.messages.upgraded, showMessage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEstateShortcutEditableTarget(event.target)) return;

      if (event.key === "Escape") {
        event.preventDefault();
        cancelEditing();
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        rotateActiveItem();
        return;
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFitViewSignal((value) => value + 1);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelectedItem();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelEditing, removeSelectedItem, rotateActiveItem]);

  function toggleInventorySheet() {
    setSheetOpen((open) => !open);
  }

  function handleRequestExpansion(parcelId: string) {
    if (document.activeElement instanceof HTMLElement) {
      focusReturnRef.current = document.activeElement;
    }
    setPendingExpansionParcelId(parcelId);
  }

  const closeExpansionDialog = useCallback(() => {
    const focusTarget = focusReturnRef.current;
    setPendingExpansionParcelId(null);
    focusTarget?.focus();
  }, []);

  function handleConfirmExpansion(parcelId: string) {
    const result = applyCommand({
      type: "unlock-parcel",
      parcelId,
    });

    if (!result.ok) return;

    closeExpansionDialog();
    setFocusParcelId(parcelId);
    setRecentlyUnlockedParcelId(parcelId);
    setUnlockAnimationProgress(0);
    showMessage(copy.messages.expanded);
  }

  function handleStartInventoryAction(definitionId: string) {
    const definition = findEstateItemDefinition(itemDefinitions, definitionId);
    if (!definition) return;

    if (
      definition.placementRule !== "ground" &&
      getInventoryQuantity(snapshotRef.current.inventory, definition.id) < 1
    ) {
      showMessage(copy.commandFailures["missing-inventory"]);
      return;
    }

    if (definition.placementRule === "ground") {
      setSheetOpen(false);
      setMode({ type: "painting-ground", definitionId: definition.id });
      showMessage(copy.messages.paintInstruction);
      return;
    }

    setSheetOpen(false);
    setMode({
      type: "placing",
      definitionId: definition.id,
      rotation: 0,
    });
  }

  function handleCellClick(cell: EstateGridCell) {
    if (mode.type === "placing") {
      const result = applyCommand({
        type: "place-item",
        definitionId: mode.definitionId,
        x: cell.x,
        y: cell.y,
        rotation: mode.rotation,
      });

      if (result.ok) {
        setMode({ type: "view" });
        const remainingQuantity = getInventoryQuantity(
          result.snapshot.inventory,
          mode.definitionId,
        );
        showMessage(
          remainingQuantity > 0
            ? copy.messages.placedReturnView
            : copy.messages.placed,
        );
      }
      return;
    }

    if (mode.type === "moving") {
      setMode({ ...mode, targetCell: cell });
    }
  }

  function confirmMoveSelected() {
    if (mode.type !== "moving" || !mode.targetCell) return;

    const result = applyCommand({
      type: "move-item",
      instanceId: mode.instanceId,
      x: mode.targetCell.x,
      y: mode.targetCell.y,
      rotation: mode.rotation,
    });

    if (result.ok) {
      setMode({ type: "selected", instanceId: mode.instanceId });
      showMessage(copy.messages.moved);
    }
  }

  function handleGroundPaintStart() {
    groundDragVisitedCellKeysRef.current = new Set();
  }

  function handleGroundPaintCell(cell: EstateGridCell) {
    if (mode.type !== "painting-ground") return;

    const key = getCellKey(cell);
    if (groundDragVisitedCellKeysRef.current.has(key)) return;
    groundDragVisitedCellKeysRef.current.add(key);

    const result = paintEstateGroundCells(
      snapshotRef.current,
      {
        definitionId: mode.definitionId,
        cells: [cell],
      },
      createCommandContext(),
    );

    if (!result.ok) {
      showMessage(copy.commandFailures[result.reason]);
      return;
    }

    if (result.paintedCells.length > 0) {
      commitSnapshot(result.snapshot);
    }

    if (result.skippedCells.length > 0) {
      showMessage(copy.messages.lockedPaint);
    }

    if (result.stoppedReason === "insufficient-points") {
      showMessage(copy.messages.paintAffordable);
    }
  }

  function handleItemSelect(instanceId: string) {
    setSheetOpen(false);
    setMode({ type: "selected", instanceId });
  }

  function handleClearSelection() {
    setMode((current) =>
      current.type === "selected" ? { type: "view" } : current,
    );
  }

  function handleMoveSelected() {
    if (!selectedInstance || !selectedDefinition || selectedIsProtected) {
      showMessage(copy.commandFailures["protected-item"]);
      return;
    }

    setSheetOpen(false);
    setMode({
      type: "moving",
      instanceId: selectedInstance.id,
      rotation: selectedInstance.rotation,
    });
    showMessage(copy.messages.moveInstruction);
  }

  function handleRotatePlacing() {
    if (mode.type !== "placing") return;

    const definition = findEstateItemDefinition(itemDefinitions, mode.definitionId);
    if (!definition?.canRotate) {
      showMessage(copy.messages.cannotRotate);
      return;
    }

    setMode({ ...mode, rotation: nextQuarterTurn(mode.rotation) });
  }

  return (
    <main className={styles.estate}>
      <div className="absolute inset-0 z-0">
        <EstateCanvas
          snapshot={snapshot}
          mode={mode}
          selectedItemId={selectedInstanceId}
          fitViewSignal={fitViewSignal}
          focusParcelId={focusParcelId}
          recentlyUnlockedParcelId={recentlyUnlockedParcelId}
          unlockAnimationProgress={unlockAnimationProgress}
          ariaLabel={copy.aria.canvasLabel}
          ariaSummary={interpolate(copy.aria.canvasSummary, {
            items: snapshot.items.length,
            parcels: unlockedParcelCount,
            tiles: snapshot.groundTiles.length,
          })}
          controls={copy.controls}
          onCellClick={handleCellClick}
          onLockedParcelClick={handleRequestExpansion}
          onGroundPaintStart={handleGroundPaintStart}
          onGroundPaintCell={handleGroundPaintCell}
          onItemSelect={handleItemSelect}
          onBackgroundTap={handleClearSelection}
          onSelectedItemAnchorChange={setSelectedActionAnchor}
        />
      </div>

      <p className="sr-only" aria-live="polite">
        {interpolate(copy.aria.liveSummary, {
          selection: selectedDefinition
            ? getItemName(selectedDefinition, copy)
            : copy.aria.noneSelected,
          balance: formatPoints(locale, pointAccount.availablePoints),
          saveStatus: copy.saveStatus[saveStatus],
        })}
        {message ? ` ${message}` : ""}
      </p>

      <div className="pointer-events-none absolute inset-x-2 top-2 z-30 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
        <header
          className={`${styles.panel} pointer-events-auto flex min-w-0 items-center gap-2.5 rounded-2xl px-2.5 py-2 sm:px-3`}
        >
          <Link
            href={`/${locale}`}
            onClick={() => {
              void flushSave();
            }}
            className={`${styles.ghostBtn} grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--es-line)]`}
            aria-label={messages.estate.backToMap}
            title={messages.estate.backToMap}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <div
              className={`${styles.muted} flex items-center gap-1 text-[11px] font-medium`}
            >
              <BadgeCheck size={12} aria-hidden="true" />
              <span className="truncate">{officialCode}</span>
            </div>
            <h1 className="truncate text-[15px] font-semibold leading-tight sm:text-base">
              {data.subject.name}
            </h1>
          </div>
        </header>

        <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div
            className={`${styles.chip} flex h-10 items-center gap-1.5 rounded-xl px-2.5`}
          >
            <Coins size={15} className={styles.coin} aria-hidden="true" />
            <strong className="font-mono text-sm tabular-nums">
              {formatPoints(locale, pointAccount.availablePoints)}
            </strong>
          </div>
          <div
            className={`${styles.chip} hidden h-10 items-center gap-1.5 rounded-xl px-2.5 sm:flex`}
          >
            <Hammer size={14} className={styles.muted} aria-hidden="true" />
            <strong className="font-mono text-sm tabular-nums">
              {unlockedParcelCount}/{estateExpansionCatalog.length}
            </strong>
          </div>
          <SaveChip status={saveStatus} label={copy.saveStatus[saveStatus]} />
        </div>
      </div>

      <div className="pointer-events-none absolute left-2 top-[4.25rem] z-30 sm:left-3">
        <EstateBuildingCard
          copy={copy}
          locale={locale}
          level={mainBuildingLevel}
          maxLevel={MAIN_BUILDING_MAX_LEVEL}
          nextCost={nextUpgradeCost}
          availablePoints={pointAccount.availablePoints}
          onUpgrade={handleUpgradeBuilding}
        />
      </div>

      {message ? (
        <div
          className={`${styles.toast} pointer-events-none absolute left-1/2 top-[4.5rem] z-40 max-w-[calc(100vw_-_1.5rem)] -translate-x-1/2 rounded-xl px-3.5 py-2 text-center text-[13px] font-medium`}
        >
          {message}
        </div>
      ) : null}

      {selectedInstance && selectedDefinition ? (
        <ContextualItemActions
          copy={copy}
          definition={selectedDefinition}
          instance={selectedInstance}
          mode={mode}
          protectedItem={selectedIsProtected}
          anchor={selectedActionAnchor}
          onCancel={cancelEditing}
          onConfirmMove={confirmMoveSelected}
          onMove={handleMoveSelected}
          onRotate={
            mode.type === "placing" ? handleRotatePlacing : rotateActiveItem
          }
          onCollect={removeSelectedItem}
        />
      ) : null}

      <aside
        className={`${styles.panelStrong} fixed inset-x-2 bottom-2 z-30 flex flex-col overflow-hidden rounded-3xl lg:absolute lg:inset-x-auto lg:bottom-3 lg:right-3 lg:top-[4.75rem] lg:w-[22rem] lg:rounded-2xl`}
      >
        {sheetOpen ? (
          <button
            type="button"
            className="grid place-items-center pb-1 pt-2 lg:hidden"
            onClick={() => setSheetOpen(false)}
            aria-label={copy.dialog.close}
          >
            <span className={`${styles.handle} h-1.5 w-10 rounded-full`} />
          </button>
        ) : null}

        <div className="flex gap-1 p-2">
          <TabButton
            active={sheetOpen}
            icon={<Package size={16} aria-hidden="true" />}
            label={copy.panels.inventory}
            onClick={toggleInventorySheet}
          />
          <Link
            href={`/${locale}/subjects/${data.subject.id}/estate/shop`}
            onClick={() => {
              void flushSave();
            }}
            className={`${styles.tab} flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition sm:h-11 sm:flex-row sm:gap-1.5 sm:text-xs`}
            title={copy.panels.shop}
          >
            <ShoppingBag size={16} aria-hidden="true" />
            <span className="truncate">{copy.panels.shop}</span>
          </Link>
          <TabButton
            icon={<Maximize2 size={16} aria-hidden="true" />}
            label={copy.panels.fit}
            onClick={() => setFitViewSignal((value) => value + 1)}
          />
        </div>

        <div
          className={`${styles.sheetBody} ${sheetOpen ? styles.sheetBodyOpen : ""}`}
        >
          <div className="grid grid-cols-3 gap-1.5 pb-2.5">
            <MiniMetric
              icon={<Leaf size={14} aria-hidden="true" />}
              label={messages.estate.savedEnergy}
              value={savedEnergyValue}
            />
            <MiniMetric
              icon={<Coins size={14} aria-hidden="true" />}
              label={messages.estate.earnedPoints}
              value={formatPoints(locale, pointAccount.earnedPoints)}
            />
            <MiniMetric
              icon={<Coins size={14} aria-hidden="true" />}
              label={messages.estate.spentPoints}
              value={formatPoints(locale, pointAccount.spentPoints)}
            />
          </div>

          <InventoryPanel
            copy={copy}
            snapshot={snapshot}
            onUseItem={handleStartInventoryAction}
          />
        </div>
      </aside>

      {pendingExpansionParcel ? (
        <ExpansionConfirmDialog
          copy={copy}
          locale={locale}
          parcel={pendingExpansionParcel}
          pointBalance={pointAccount.availablePoints}
          snapshot={snapshot}
          onCancel={closeExpansionDialog}
          onConfirm={() => handleConfirmExpansion(pendingExpansionParcel.id)}
        />
      ) : null}
    </main>
  );
}

function SaveChip({
  status,
  label,
}: {
  status: EstateSaveStatus;
  label: string;
}) {
  const icon =
    status === "saving" ? (
      <Loader2 size={15} className="animate-spin" aria-hidden="true" />
    ) : status === "failed" ? (
      <AlertTriangle size={15} aria-hidden="true" />
    ) : (
      <CheckCircle2 size={15} aria-hidden="true" />
    );

  return (
    <div
      className={`${styles.chip} flex h-10 items-center gap-1.5 rounded-xl px-2.5 ${
        status === "failed" ? styles.badgeDanger : styles.muted
      }`}
    >
      {icon}
      <span className="hidden text-xs font-medium sm:inline">{label}</span>
    </div>
  );
}

function TabButton({
  active = false,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition sm:h-11 sm:flex-row sm:gap-1.5 sm:text-xs ${
        active ? styles.tabActive : styles.tab
      }`}
      title={label}
      onClick={onClick}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={`${styles.miniMetric} flex flex-col gap-1 rounded-xl px-2.5 py-2`}>
      <span className={`${styles.subtle} flex items-center gap-1 text-[10px] font-medium`}>
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="truncate text-[13px] font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

function InventoryPanel({
  copy,
  snapshot,
  onUseItem,
}: {
  copy: EstateMessages;
  snapshot: EstateSnapshot;
  onUseItem: (definitionId: string) => void;
}) {
  const entries = snapshot.inventory
    .map((entry) => ({
      ...entry,
      definition: findEstateItemDefinition(itemDefinitions, entry.definitionId),
    }))
    .filter(
      (
        entry,
      ): entry is {
        definitionId: string;
        quantity: number;
        definition: EstateItemDefinition;
      } => Boolean(entry.definition),
    );

  if (entries.length === 0) {
    return (
      <div
        className={`${styles.muted} rounded-2xl border border-dashed border-[var(--es-line)] bg-[var(--es-inset)] p-4 text-sm`}
      >
        {copy.inventory.empty}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {entries.map(({ definition, quantity }) => (
        <div
          key={definition.id}
          className={`${styles.card} flex items-center gap-3 rounded-2xl p-2.5`}
        >
          <ItemThumb definition={definition} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">
              {getItemName(definition, copy)}
            </h2>
            <p className={`${styles.subtle} text-xs`}>
              {copy.inventory.quantity} {quantity} ·{" "}
              {definition.footprintWidth}x{definition.footprintHeight}
            </p>
          </div>
          <button
            type="button"
            className={`${styles.primaryBtn} inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold`}
            onClick={() => onUseItem(definition.id)}
          >
            {definition.placementRule === "ground" ? (
              <Paintbrush size={14} aria-hidden="true" />
            ) : (
              <Package size={14} aria-hidden="true" />
            )}
            {definition.placementRule === "ground"
              ? copy.inventory.paint
              : copy.inventory.place}
          </button>
        </div>
      ))}
    </div>
  );
}

function ExpansionConfirmDialog({
  copy,
  locale,
  parcel,
  pointBalance,
  snapshot,
  onCancel,
  onConfirm,
}: {
  copy: EstateMessages;
  locale: "ko" | "en";
  parcel: EstateExpansionParcelDefinition;
  pointBalance: number;
  snapshot: EstateSnapshot;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const status = getParcelUnlockStatus(parcel, snapshot, pointBalance);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    getFocusableElements(dialog)[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(20,30,20,0.45)] px-4 backdrop-blur-sm">
      <section
        ref={dialogRef}
        className={`${styles.panelStrong} w-full max-w-md rounded-2xl p-4`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="estate-expansion-dialog-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase"
              style={{ color: "var(--es-accent-strong)" }}
            >
              {copy.dialog.landExpansion}
            </p>
            <h2
              id="estate-expansion-dialog-title"
              className="mt-1 text-lg font-semibold"
            >
              {getParcelName(parcel.id, copy)}
            </h2>
          </div>
          <button
            type="button"
            className={`${styles.ghostBtn} grid h-10 w-10 shrink-0 place-items-center rounded-xl`}
            aria-label={copy.dialog.close}
            title={copy.dialog.close}
            onClick={onCancel}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className={styles.muted}>{copy.dialog.size}</dt>
            <dd className="font-medium">{formatParcelSize(parcel)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className={styles.muted}>{copy.dialog.cost}</dt>
            <dd className="font-mono font-semibold">
              {formatPoints(locale, parcel.cost)}
            </dd>
          </div>
          <div className="grid gap-1">
            <dt className={styles.muted}>{copy.dialog.adjacentRequirement}</dt>
            <dd>
              {parcel.adjacentParcelIds
                .map((parcelId) => getParcelName(parcelId, copy))
                .join(", ")}
            </dd>
          </div>
        </dl>

        <div
          className={`mt-4 rounded-xl px-3 py-2 text-sm ${
            status.canUnlock
              ? styles.selectionCard
              : `${styles.muted} ${styles.miniMetric}`
          }`}
        >
          {status.canUnlock
            ? copy.dialog.readyToUnlock
            : getExpansionBlockedMessage(status, copy, locale)}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`${styles.ghostBtn} h-11 rounded-xl border border-[var(--es-line)] text-sm font-semibold`}
            onClick={onCancel}
          >
            {copy.dialog.cancel}
          </button>
          <button
            type="button"
            className={`${styles.primaryBtn} h-11 rounded-xl text-sm font-semibold`}
            disabled={!status.canUnlock}
            onClick={onConfirm}
          >
            {copy.dialog.unlock}
          </button>
        </div>
      </section>
    </div>
  );
}

type ParcelUnlockStatus = {
  alreadyUnlocked: boolean;
  adjacent: boolean;
  affordable: boolean;
  canUnlock: boolean;
  missingPoints: number;
};

function getParcelUnlockStatus(
  parcel: EstateExpansionParcelDefinition,
  snapshot: EstateSnapshot,
  pointBalance: number,
): ParcelUnlockStatus {
  const alreadyUnlocked = snapshot.unlockedParcelIds.includes(parcel.id);
  const adjacent =
    parcel.initial ||
    isParcelAdjacentToUnlockedParcel(
      parcel.id,
      snapshot.unlockedParcelIds,
      estateExpansionCatalog,
    );
  const affordable = pointBalance >= parcel.cost;

  return {
    alreadyUnlocked,
    adjacent,
    affordable,
    canUnlock: !alreadyUnlocked && adjacent && affordable,
    missingPoints: Math.max(0, parcel.cost - pointBalance),
  };
}

function getExpansionBlockedMessage(
  status: ParcelUnlockStatus,
  copy: EstateMessages,
  locale: "ko" | "en",
): string {
  if (status.alreadyUnlocked) {
    return copy.expansion.alreadyUnlocked;
  }

  if (!status.adjacent) {
    return copy.expansion.notAdjacent;
  }

  if (!status.affordable) {
    return interpolate(copy.expansion.missingPoints, {
      points: formatPoints(locale, status.missingPoints),
    });
  }

  return copy.expansion.blocked;
}

function formatParcelSize(parcel: EstateExpansionParcelDefinition): string {
  return `${parcel.bounds.width}x${parcel.bounds.height}`;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return [
    ...container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => !element.hasAttribute("disabled"));
}

function nextQuarterTurn(rotation: QuarterTurn): QuarterTurn {
  return ((rotation + 1) % 4) as QuarterTurn;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
