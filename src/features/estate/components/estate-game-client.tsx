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
  Move,
  Package,
  Paintbrush,
  RotateCw,
  ShoppingBag,
  Trash2,
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
import type { Messages } from "@/i18n/messages/types";
import {
  baseEstateBuildingDefinition,
  estateItemCatalog,
} from "../data/estate-item-catalog";
import { estateExpansionCatalog } from "../data/estate-expansion-catalog";
import type { EstatePageData } from "../data/get-estate-page-data";
import {
  createEstatePurchaseLock,
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
import { findEstateItemDefinition } from "../domain/placement";
import { calculateEstatePointAccount } from "../domain/point-account";
import { paintEstateGroundCells } from "../domain/commands";
import { estateReducer } from "../domain/reducer";
import type {
  EstateCommand,
  EstateCommandContext,
  EstateExpansionParcelDefinition,
  EstateGridCell,
  EstateItemCategory,
  EstateItemDefinition,
  EstateItemInstance,
  EstateSnapshot,
  QuarterTurn,
} from "../domain/types";
import { LocalStorageEstateRepository } from "../persistence/local-storage-estate-repository";
import type { EstateRepository } from "../persistence/estate-repository";
import type { EstateCanvasProps } from "./estate-canvas";

const EstateCanvas = dynamic<EstateCanvasProps>(
  () => import("./estate-canvas").then((module) => module.default),
  { ssr: false },
);

type EstateGameClientProps = {
  data: EstatePageData;
  repository?: EstateRepository;
};

type EstateMetricProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

type ActiveEstatePanel = "shop" | "inventory" | "expansion";
type EstateShopCategory = "all" | EstateItemCategory;
type EstateMessages = Messages["estate"];

const itemDefinitions = estateItemCatalog;
const allItemDefinitions = [baseEstateBuildingDefinition, ...estateItemCatalog];
const expensiveConfirmationPoint = 700;
const saveDebounceMs = 360;
const purchaseLockMs = 420;

const categoryOrder: EstateShopCategory[] = [
  "all",
  "nature",
  "furniture",
  "energy",
  "facility",
  "ground",
  "landmark",
];

export function EstateGameClient({ data, repository }: EstateGameClientProps) {
  const { locale, messages } = useI18n();
  const copy = messages.estate;
  const [snapshot, setSnapshot] = useState<EstateSnapshot>(
    data.initialSnapshot,
  );
  const [mode, setMode] = useState<EstateEditorMode>({ type: "view" });
  const [activePanel, setActivePanel] = useState<ActiveEstatePanel>("shop");
  const [shopCategory, setShopCategory] = useState<EstateShopCategory>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<EstateSaveStatus>("saved");
  const [fitViewSignal, setFitViewSignal] = useState(0);
  const [focusParcelId, setFocusParcelId] = useState<string | null>(null);
  const [pendingExpansionParcelId, setPendingExpansionParcelId] = useState<
    string | null
  >(null);
  const [recentlyUnlockedParcelId, setRecentlyUnlockedParcelId] = useState<
    string | null
  >(null);
  const [unlockAnimationProgress, setUnlockAnimationProgress] = useState(1);
  const [pendingPurchaseIds, setPendingPurchaseIds] = useState<Set<string>>(
    () => new Set(),
  );
  const subjectIdRef = useRef(data.subject.id);
  const previousSubjectIdRef = useRef(data.subject.id);
  const snapshotRef = useRef(snapshot);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expansionAnimationFrameRef = useRef<number | null>(null);
  const latestSnapshotToSaveRef = useRef<EstateSnapshot | null>(null);
  const purchaseLockRef = useRef(createEstatePurchaseLock());
  const groundDragVisitedCellKeysRef = useRef(new Set<string>());
  const repositoryRef = useRef<EstateRepository | null>(null);
  const focusReturnRef = useRef<HTMLElement | null>(null);

  if (repositoryRef.current === null) {
    repositoryRef.current = repository ?? new LocalStorageEstateRepository();
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
  const visibleShopItems = useMemo(
    () =>
      itemDefinitions.filter(
        (definition) =>
          shopCategory === "all" || definition.category === shopCategory,
      ),
    [shopCategory],
  );
  const unlockedParcelCount = snapshot.unlockedParcelIds.length;
  const pendingExpansionParcel = pendingExpansionParcelId
    ? estateExpansionCatalog.find(
        (parcel) => parcel.id === pendingExpansionParcelId,
      ) ?? null
    : null;
  const nextExpansionParcel = getNextUnlockableParcel(snapshot);

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
        setSaveStatus("failed");
        return;
      }

      savedAtLeastOnce = true;
    }

    if (savedAtLeastOnce) {
      setSaveStatus("saved");
    }
  }, []);

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
      setActivePanel("shop");
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

  function handlePurchase(definition: EstateItemDefinition) {
    if (!purchaseLockRef.current.tryAcquire(definition.id)) return;

    setPendingPurchaseIds((current) => new Set(current).add(definition.id));

    const result = applyCommand({
      type: "purchase-item",
      definitionId: definition.id,
    });

    if (result.ok) {
      showMessage(
        interpolate(copy.messages.purchase, {
          item: getItemName(definition, copy),
        }),
      );
    }

    setTimeout(() => {
      purchaseLockRef.current.release(definition.id);
      setPendingPurchaseIds((current) => {
        const next = new Set(current);
        next.delete(definition.id);
        return next;
      });
    }, purchaseLockMs);
  }

  function handleRequestExpansion(parcelId: string) {
    if (document.activeElement instanceof HTMLElement) {
      focusReturnRef.current = document.activeElement;
    }
    setActivePanel("expansion");
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
      setMode({ type: "painting-ground", definitionId: definition.id });
      showMessage(copy.messages.paintInstruction);
      return;
    }

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
      const result = applyCommand({
        type: "move-item",
        instanceId: mode.instanceId,
        x: cell.x,
        y: cell.y,
        rotation: mode.rotation,
      });

      if (result.ok) {
        setMode({ type: "selected", instanceId: mode.instanceId });
        showMessage(copy.messages.moved);
      }
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
    setMode({ type: "selected", instanceId });
  }

  function handleMoveSelected() {
    if (!selectedInstance || !selectedDefinition || selectedIsProtected) {
      showMessage(copy.commandFailures["protected-item"]);
      return;
    }

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
    <main className="relative min-h-dvh overflow-hidden bg-canvas px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 text-ink sm:px-5 lg:px-7">
      <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl gap-3 lg:gap-4">
        <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 shadow-card sm:px-4">
          <div className="flex min-w-0 max-w-full items-center gap-3">
            <Link
              href={`/${locale}`}
              onClick={() => {
                void flushSave();
              }}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line text-ink-muted transition hover:border-accent hover:bg-accent-soft hover:text-accent"
              aria-label={messages.estate.backToMap}
              title={messages.estate.backToMap}
            >
              <ArrowLeft size={17} aria-hidden="true" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-accent">
                <BadgeCheck size={14} aria-hidden="true" />
                <span>{officialCode}</span>
              </div>
              <h1 className="truncate text-xl font-semibold text-ink sm:text-2xl">
                {data.subject.name}
              </h1>
            </div>
          </div>

          <div className="flex min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:overflow-visible sm:pb-0">
            <StatusPill
              icon={<Coins size={15} aria-hidden="true" />}
              label={messages.estate.availablePoints}
              value={formatPoints(locale, pointAccount.availablePoints)}
            />
            <StatusPill
              icon={<Hammer size={15} aria-hidden="true" />}
              label={copy.expansion.unlocked}
              value={`${unlockedParcelCount}/${estateExpansionCatalog.length}`}
            />
            {nextExpansionParcel ? (
              <StatusPill
                icon={<Coins size={15} aria-hidden="true" />}
                label={copy.expansion.next}
                value={formatPoints(locale, nextExpansionParcel.cost)}
              />
            ) : null}
            <SaveStatusPill
              status={saveStatus}
              label={copy.saveStatus[saveStatus]}
            />
          </div>
        </header>
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

        <section className="hidden gap-3 lg:grid lg:grid-cols-3">
          <EstateMetric
            icon={<Leaf size={16} aria-hidden="true" />}
            label={messages.estate.savedEnergy}
            value={savedEnergyValue}
          />
          <EstateMetric
            icon={<Coins size={16} aria-hidden="true" />}
            label={messages.estate.earnedPoints}
            value={formatPoints(locale, pointAccount.earnedPoints)}
          />
          <EstateMetric
            icon={<Coins size={16} aria-hidden="true" />}
            label={messages.estate.spentPoints}
            value={formatPoints(locale, pointAccount.spentPoints)}
          />
        </section>

        <section className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="fixed inset-0 z-0 h-dvh min-h-dvh min-w-0 bg-surface p-0 lg:relative lg:inset-auto lg:z-auto lg:h-[calc(100dvh-18rem)] lg:min-h-[30rem] lg:rounded-xl lg:border lg:border-line lg:p-2 lg:shadow-card xl:h-[calc(100dvh-14rem)]">
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
            />
          </div>

          <aside className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 max-h-[min(58dvh,calc(100dvh-8rem-env(safe-area-inset-bottom)))] overflow-hidden rounded-xl border border-line bg-surface shadow-pop lg:static lg:z-auto lg:max-h-[calc(100dvh-18rem)] lg:self-start lg:overflow-y-auto lg:shadow-card xl:max-h-[calc(100dvh-14rem)]">
            <div className="grid border-b border-line bg-surface-3 p-2">
              <div className="grid grid-cols-4 gap-1">
                <ToolButton
                  active={activePanel === "shop"}
                  icon={<ShoppingBag size={16} aria-hidden="true" />}
                  label={copy.panels.shop}
                  onClick={() => setActivePanel("shop")}
                />
                <ToolButton
                  active={activePanel === "inventory"}
                  icon={<Package size={16} aria-hidden="true" />}
                  label={copy.panels.inventory}
                  onClick={() => setActivePanel("inventory")}
                />
                <ToolButton
                  active={activePanel === "expansion"}
                  icon={<Hammer size={16} aria-hidden="true" />}
                  label={copy.panels.expansion}
                  onClick={() => setActivePanel("expansion")}
                />
                <ToolButton
                  icon={<Maximize2 size={16} aria-hidden="true" />}
                  label={copy.panels.fit}
                  onClick={() => setFitViewSignal((value) => value + 1)}
                />
              </div>
            </div>

            <div className="max-h-[calc(58dvh-3.75rem)] overflow-y-auto p-3 lg:max-h-[calc(100dvh-16rem)]">
              {message ? (
                <div className="mb-3 rounded-lg border border-line bg-accent-soft px-3 py-2 text-sm font-medium text-ink">
                  {message}
                </div>
              ) : null}

              {selectedInstance && selectedDefinition ? (
                <SelectionPanel
                  copy={copy}
                  definition={selectedDefinition}
                  instance={selectedInstance}
                  mode={mode}
                  protectedItem={selectedIsProtected}
                  onCancel={cancelEditing}
                  onMove={handleMoveSelected}
                  onRotate={
                    mode.type === "placing" ? handleRotatePlacing : rotateActiveItem
                  }
                  onRemove={removeSelectedItem}
                />
              ) : null}

              {activePanel === "shop" ? (
                <ShopPanel
                  category={shopCategory}
                  copy={copy}
                  items={visibleShopItems}
                  locale={locale}
                  pendingPurchaseIds={pendingPurchaseIds}
                  pointBalance={pointAccount.availablePoints}
                  snapshot={snapshot}
                  onCategoryChange={setShopCategory}
                  onPurchase={handlePurchase}
                />
              ) : null}

              {activePanel === "inventory" ? (
                <InventoryPanel
                  copy={copy}
                  snapshot={snapshot}
                  onUseItem={handleStartInventoryAction}
                />
              ) : null}

              {activePanel === "expansion" ? (
                <ExpansionPanel
                  copy={copy}
                  locale={locale}
                  pointBalance={pointAccount.availablePoints}
                  snapshot={snapshot}
                  onRequestUnlock={handleRequestExpansion}
                />
              ) : null}
            </div>
          </aside>
        </section>
      </div>
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

function EstateMetric({ icon, label, value }: EstateMetricProps) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase text-ink-subtle">
          {label}
        </p>
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-soft text-accent">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}

function StatusPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-lg border border-line bg-surface-3 px-3">
      <span className="text-accent">{icon}</span>
      <span className="hidden text-xs font-semibold text-ink-subtle sm:inline">
        {label}
      </span>
      <strong className="font-mono text-sm text-ink">{value}</strong>
    </div>
  );
}

function SaveStatusPill({
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
      className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${
        status === "failed"
          ? "border-overuse-soft bg-overuse-soft text-overuse"
          : "border-line bg-surface-3 text-ink-muted"
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function ToolButton({
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
      className={`flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition ${
        active
          ? "bg-accent text-on-accent"
          : "text-ink-muted hover:bg-accent-soft hover:text-accent"
      }`}
      title={label}
      onClick={onClick}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function ShopPanel({
  category,
  copy,
  items,
  locale,
  pendingPurchaseIds,
  pointBalance,
  snapshot,
  onCategoryChange,
  onPurchase,
}: {
  category: EstateShopCategory;
  copy: EstateMessages;
  items: readonly EstateItemDefinition[];
  locale: "ko" | "en";
  pendingPurchaseIds: ReadonlySet<string>;
  pointBalance: number;
  snapshot: EstateSnapshot;
  onCategoryChange: (category: EstateShopCategory) => void;
  onPurchase: (definition: EstateItemDefinition) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {categoryOrder.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={`h-11 min-w-[44px] shrink-0 rounded-lg border px-3 text-xs font-semibold transition ${
              category === candidate
                ? "border-accent bg-accent text-on-accent"
                : "border-line bg-surface text-ink-muted hover:border-accent hover:text-accent"
            }`}
            onClick={() => onCategoryChange(candidate)}
          >
            {copy.categories[candidate]}
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        {items.map((definition) => {
          const ownedQuantity = getInventoryQuantity(
            snapshot.inventory,
            definition.id,
          );
          const pending = pendingPurchaseIds.has(definition.id);
          const disabled = pending || pointBalance < definition.cost;

          return (
            <div
              key={definition.id}
              className="grid gap-2 rounded-lg border border-line bg-surface-2 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-ink">
                    {getItemName(definition, copy)}
                  </h2>
                  <p className="mt-1 text-xs text-ink-subtle">
                    {copy.categories[definition.category]} ·{" "}
                    {definition.footprintWidth}x{definition.footprintHeight}
                  </p>
                </div>
                <span className="rounded-md bg-accent-soft px-2 py-1 font-mono text-xs font-semibold text-accent">
                  {formatPoints(locale, definition.cost)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink-muted">
                  {copy.shop.owned} {ownedQuantity}
                </span>
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-on-accent transition disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-ink-subtle"
                  disabled={disabled}
                  onClick={() => onPurchase(definition)}
                >
                  <ShoppingBag size={14} aria-hidden="true" />
                  {pending ? copy.shop.pending : copy.shop.buy}
                </button>
              </div>
            </div>
          );
        })}
      </div>
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
      <div className="rounded-lg border border-dashed border-line bg-surface-2 p-4 text-sm text-ink-muted">
        {copy.inventory.empty}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {entries.map(({ definition, quantity }) => (
        <div
          key={definition.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 p-3"
        >
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-ink">
              {getItemName(definition, copy)}
            </h2>
            <p className="text-xs text-ink-subtle">
              {copy.inventory.quantity} {quantity} ·{" "}
              {definition.footprintWidth}x{definition.footprintHeight}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-on-accent"
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

function SelectionPanel({
  copy,
  definition,
  instance,
  mode,
  protectedItem,
  onCancel,
  onMove,
  onRotate,
  onRemove,
}: {
  copy: EstateMessages;
  definition: EstateItemDefinition;
  instance: EstateItemInstance;
  mode: EstateEditorMode;
  protectedItem: boolean;
  onCancel: () => void;
  onMove: () => void;
  onRotate: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="mb-3 grid gap-2 rounded-lg border border-accent-soft bg-accent-soft p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-ink">
            {getItemName(definition, copy)}
          </h2>
          <p className="text-xs text-ink-muted">
            {mode.type === "moving"
              ? copy.selection.choosingMoveTarget
              : `${instance.x}, ${instance.y}`}
          </p>
        </div>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-lg text-ink-muted transition hover:bg-surface hover:text-ink"
          aria-label={copy.selection.cancel}
          title={copy.selection.cancel}
          onClick={onCancel}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <SelectionButton
          disabled={protectedItem}
          icon={<Move size={14} aria-hidden="true" />}
          label={copy.selection.move}
          onClick={onMove}
        />
        <SelectionButton
          disabled={protectedItem || !definition.canRotate}
          icon={<RotateCw size={14} aria-hidden="true" />}
          label={copy.selection.rotate}
          onClick={onRotate}
        />
        <SelectionButton
          danger
          disabled={protectedItem}
          icon={<Trash2 size={14} aria-hidden="true" />}
          label={copy.selection.remove}
          onClick={onRemove}
        />
      </div>
    </div>
  );
}

function SelectionButton({
  danger = false,
  disabled = false,
  icon,
  label,
  onClick,
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
        danger
          ? "bg-overuse-soft text-overuse hover:bg-overuse-soft"
          : "bg-surface text-ink-muted hover:text-accent"
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ExpansionPanel({
  copy,
  locale,
  pointBalance,
  snapshot,
  onRequestUnlock,
}: {
  copy: EstateMessages;
  locale: "ko" | "en";
  pointBalance: number;
  snapshot: EstateSnapshot;
  onRequestUnlock: (parcelId: string) => void;
}) {
  const lockedParcels = estateExpansionCatalog.filter(
    (parcel) => !snapshot.unlockedParcelIds.includes(parcel.id),
  );

  if (lockedParcels.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface-2 p-4 text-sm text-ink-muted">
        {copy.expansion.allUnlocked}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {lockedParcels.map((parcel) => {
        const status = getParcelUnlockStatus(parcel, snapshot, pointBalance);

        return (
          <div
            key={parcel.id}
            className="grid gap-2 rounded-lg border border-line bg-surface-2 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-ink">
                  {getParcelName(parcel.id, copy)}
                </h2>
                <p className="mt-1 text-xs text-ink-subtle">
                  {copy.expansion.size}{" "}
                  {formatParcelSize(parcel)} ·{" "}
                  {copy.expansion.cost} {formatPoints(locale, parcel.cost)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${
                  status.canUnlock
                    ? "bg-accent-soft text-accent"
                    : "bg-line text-ink-subtle"
                }`}
              >
                {status.canUnlock
                  ? copy.expansion.available
                  : copy.expansion.locked}
              </span>
            </div>

            <div className="grid gap-1 text-xs text-ink-subtle">
              <p>
                {copy.expansion.adjacent}:{" "}
                {parcel.adjacentParcelIds
                  .map((parcelId) => getParcelName(parcelId, copy))
                  .join(", ")}
                {" · "}
                <span
                  className={
                    status.adjacent ? "text-accent" : "text-ink-subtle"
                  }
                >
                  {status.adjacent ? copy.expansion.met : copy.expansion.notMet}
                </span>
              </p>
              {!status.affordable ? (
                <p className="font-medium text-overuse">
                  {interpolate(copy.expansion.missingPoints, {
                    points: formatPoints(locale, status.missingPoints),
                  })}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-3 text-xs font-semibold text-on-accent transition hover:brightness-105"
              onClick={() => onRequestUnlock(parcel.id)}
            >
              {copy.expansion.review}
            </button>
          </div>
        );
      })}
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
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/45 px-4 backdrop-blur-sm">
      <section
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-line bg-surface p-4 shadow-pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="estate-expansion-dialog-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase text-accent">
              {copy.dialog.landExpansion}
            </p>
            <h2
              id="estate-expansion-dialog-title"
              className="mt-1 text-lg font-semibold text-ink"
            >
              {getParcelName(parcel.id, copy)}
            </h2>
          </div>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-2 hover:text-ink"
            aria-label={copy.dialog.close}
            title={copy.dialog.close}
            onClick={onCancel}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-subtle">{copy.dialog.size}</dt>
            <dd className="font-medium text-ink">{formatParcelSize(parcel)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-subtle">{copy.dialog.cost}</dt>
            <dd className="font-mono font-semibold text-ink">
              {formatPoints(locale, parcel.cost)}
            </dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-ink-subtle">
              {copy.dialog.adjacentRequirement}
            </dt>
            <dd className="text-ink">
              {parcel.adjacentParcelIds
                .map((parcelId) => getParcelName(parcelId, copy))
                .join(", ")}
            </dd>
          </div>
        </dl>

        <div
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            status.canUnlock
              ? "border-accent-soft bg-accent-soft text-ink"
              : "border-line bg-surface-2 text-ink-muted"
          }`}
        >
          {status.canUnlock
            ? copy.dialog.readyToUnlock
            : getExpansionBlockedMessage(status, copy, locale)}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="h-11 rounded-lg border border-line bg-surface-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
            onClick={onCancel}
          >
            {copy.dialog.cancel}
          </button>
          <button
            type="button"
            className="h-11 rounded-lg bg-accent text-sm font-semibold text-on-accent transition disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-ink-subtle"
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

function getNextUnlockableParcel(
  snapshot: EstateSnapshot,
): EstateExpansionParcelDefinition | null {
  return (
    estateExpansionCatalog
      .filter((parcel) => !snapshot.unlockedParcelIds.includes(parcel.id))
      .filter((parcel) =>
        isParcelAdjacentToUnlockedParcel(
          parcel.id,
          snapshot.unlockedParcelIds,
          estateExpansionCatalog,
        ),
      )
      .sort((a, b) => a.cost - b.cost)[0] ?? null
  );
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

function getItemName(
  definition: EstateItemDefinition,
  copy: EstateMessages,
): string {
  return getRecordValue(copy.items, definition.id);
}

function getParcelName(parcelId: string, copy: EstateMessages): string {
  return getRecordValue(copy.parcels, parcelId);
}

function getRecordValue(
  record: Readonly<Record<string, string>>,
  key: string,
): string {
  return record[key] ?? key;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return [
    ...container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => !element.hasAttribute("disabled"));
}

function createEstateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `estate-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
