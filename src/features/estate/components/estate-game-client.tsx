"use client";

import Link from "next/link";
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
import { getCellKey } from "../domain/expansion";
import { getInventoryQuantity } from "../domain/inventory";
import { findEstateItemDefinition } from "../domain/placement";
import { calculateEstatePointAccount } from "../domain/point-account";
import { paintEstateGroundCells } from "../domain/commands";
import { estateReducer } from "../domain/reducer";
import type {
  EstateCommand,
  EstateCommandContext,
  EstateCommandFailureReason,
  EstateGridCell,
  EstateItemCategory,
  EstateItemDefinition,
  EstateItemInstance,
  EstateSnapshot,
  QuarterTurn,
} from "../domain/types";
import { LocalStorageEstateRepository } from "../persistence/local-storage-estate-repository";
import type { EstateRepository } from "../persistence/estate-repository";
import { EstateCanvas } from "./estate-canvas";

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

const itemNames: Record<"ko" | "en", Record<string, string>> = {
  ko: {
    "base-campus-building": "중앙 랜드마크",
    "broadleaf-tree": "활엽수",
    "pine-tree": "소나무",
    "flower-bed": "꽃 화단",
    bench: "벤치",
    "solar-street-light": "태양광 가로등",
    "campus-flag": "캠퍼스 깃발",
    fountain: "분수",
    "small-greenhouse": "소형 온실",
    "solar-pavilion": "태양광 파빌리온",
    "recycling-station": "분리수거 스테이션",
    "stone-path": "돌길 타일",
    "bright-sidewalk-block": "밝은 보도 타일",
    "grass-decoration": "잔디 타일",
    "decorative-shrub": "장식 관목",
    "small-sculpture": "소형 조형물",
  },
  en: {
    "base-campus-building": "Central landmark",
    "broadleaf-tree": "Broadleaf tree",
    "pine-tree": "Pine tree",
    "flower-bed": "Flower bed",
    bench: "Bench",
    "solar-street-light": "Solar street light",
    "campus-flag": "Campus flag",
    fountain: "Fountain",
    "small-greenhouse": "Small greenhouse",
    "solar-pavilion": "Solar pavilion",
    "recycling-station": "Recycling station",
    "stone-path": "Stone path tile",
    "bright-sidewalk-block": "Bright sidewalk tile",
    "grass-decoration": "Grass tile",
    "decorative-shrub": "Decorative shrub",
    "small-sculpture": "Small sculpture",
  },
};

const categoryLabels = {
  ko: {
    all: "전체",
    landmark: "상징",
    nature: "자연",
    furniture: "가구",
    energy: "에너지",
    facility: "시설",
    ground: "바닥",
  },
  en: {
    all: "All",
    landmark: "Landmark",
    nature: "Nature",
    furniture: "Furniture",
    energy: "Energy",
    facility: "Facility",
    ground: "Ground",
  },
} satisfies Record<"ko" | "en", Record<EstateShopCategory, string>>;

const panelLabels = {
  ko: {
    shop: "꾸미기",
    inventory: "인벤토리",
    expansion: "확장",
    fit: "화면 맞춤",
  },
  en: {
    shop: "Decorate",
    inventory: "Inventory",
    expansion: "Expand",
    fit: "Fit view",
  },
} satisfies Record<"ko" | "en", Record<ActiveEstatePanel | "fit", string>>;

const saveStatusLabels = {
  ko: {
    saved: "저장됨",
    saving: "저장 중",
    failed: "저장 실패",
  },
  en: {
    saved: "Saved",
    saving: "Saving",
    failed: "Save failed",
  },
} satisfies Record<"ko" | "en", Record<EstateSaveStatus, string>>;

const commandFailureLabels = {
  ko: {
    "insufficient-points": "절감 포인트가 부족합니다.",
    "out-of-bounds": "잠금 해제된 영역 안에 배치해야 합니다.",
    collision: "다른 오브젝트와 겹칩니다.",
    "missing-inventory": "인벤토리에 보유 수량이 없습니다.",
    "parcel-not-adjacent": "연결된 구역부터 확장할 수 있습니다.",
    "already-unlocked": "이미 확장된 구역입니다.",
    "protected-item": "중앙 랜드마크는 이동, 회전, 철거할 수 없습니다.",
    "invalid-definition": "이 작업을 수행할 수 없는 아이템입니다.",
  },
  en: {
    "insufficient-points": "Not enough saving points.",
    "out-of-bounds": "Place it inside an unlocked area.",
    collision: "It overlaps another object.",
    "missing-inventory": "No owned quantity in inventory.",
    "parcel-not-adjacent": "Expand from a connected parcel first.",
    "already-unlocked": "This parcel is already unlocked.",
    "protected-item": "The central landmark cannot be moved, rotated, or removed.",
    "invalid-definition": "This item cannot be used for that action.",
  },
} satisfies Record<"ko" | "en", Record<EstateCommandFailureReason, string>>;

export function EstateGameClient({ data, repository }: EstateGameClientProps) {
  const { locale, messages } = useI18n();
  const language = locale === "en" ? "en" : "ko";
  const [snapshot, setSnapshot] = useState<EstateSnapshot>(
    data.initialSnapshot,
  );
  const [mode, setMode] = useState<EstateEditorMode>({ type: "view" });
  const [activePanel, setActivePanel] = useState<ActiveEstatePanel>("shop");
  const [shopCategory, setShopCategory] = useState<EstateShopCategory>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<EstateSaveStatus>("saved");
  const [fitViewSignal, setFitViewSignal] = useState(0);
  const [pendingPurchaseIds, setPendingPurchaseIds] = useState<Set<string>>(
    () => new Set(),
  );
  const subjectIdRef = useRef(data.subject.id);
  const previousSubjectIdRef = useRef(data.subject.id);
  const snapshotRef = useRef(snapshot);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSnapshotToSaveRef = useRef<EstateSnapshot | null>(null);
  const purchaseLockRef = useRef(createEstatePurchaseLock());
  const groundDragVisitedCellKeysRef = useRef(new Set<string>());
  const repositoryRef = useRef<EstateRepository | null>(null);

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
        showMessage(commandFailureLabels[language][result.reason]);
        return result;
      }

      commitSnapshot(result.snapshot);
      return result;
    },
    [commitSnapshot, createCommandContext, language, showMessage],
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
      setSnapshot(data.initialSnapshot);
      snapshotRef.current = data.initialSnapshot;
      setSaveStatus("saved");
      setMessage(null);

      repositoryRef.current?.load(data.subject.id).then((result) => {
        if (cancelled) return;

        if (!result.ok) {
          setSaveStatus("failed");
          showMessage(
            language === "ko"
              ? "저장된 영지를 불러오지 못했습니다."
              : "Could not load the saved estate.",
          );
          return;
        }

        if (result.snapshot) {
          snapshotRef.current = result.snapshot;
          setSnapshot(result.snapshot);
        }

        if (result.recovered) {
          showMessage(
            language === "ko"
              ? "손상된 저장 데이터를 기본 영지로 복구했습니다."
              : "Recovered damaged save data with the default estate.",
          );
        }
      });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(resetTimer);
    };
  }, [data.initialSnapshot, data.subject.id, flushSave, language, showMessage]);

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
    };
  }, []);

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
      showMessage(
        language === "ko"
          ? "회전할 수 없는 아이템입니다."
          : "This item cannot rotate.",
      );
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
  }, [applyCommand, language, mode, showMessage]);

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
        language === "ko"
          ? `${getItemName(definition, language)}을(를) 철거할까요? 포인트는 환불되지 않습니다.`
          : `Remove ${getItemName(definition, language)}? Points will not be refunded.`,
      )
    ) {
      return;
    }

    const result = applyCommand({ type: "remove-item", instanceId });
    if (result.ok) {
      setMode({ type: "view" });
      showMessage(
        language === "ko"
          ? "철거했습니다. 아이템이 인벤토리로 돌아갔습니다."
          : "Removed. The item returned to inventory.",
      );
    }
  }, [applyCommand, language, mode, showMessage]);

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
        language === "ko"
          ? `${getItemName(definition, language)}을(를) 구매했습니다.`
          : `Purchased ${getItemName(definition, language)}.`,
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

  function handleStartInventoryAction(definitionId: string) {
    const definition = findEstateItemDefinition(itemDefinitions, definitionId);
    if (!definition) return;

    if (
      definition.placementRule !== "ground" &&
      getInventoryQuantity(snapshotRef.current.inventory, definition.id) < 1
    ) {
      showMessage(commandFailureLabels[language]["missing-inventory"]);
      return;
    }

    if (definition.placementRule === "ground") {
      setMode({ type: "painting-ground", definitionId: definition.id });
      showMessage(
        language === "ko"
          ? "드래그해서 경로 타일을 칠하세요."
          : "Drag on the grid to paint path tiles.",
      );
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
            ? language === "ko"
              ? "배치 완료. 기본값은 연속 배치 없이 보기 모드로 돌아갑니다."
              : "Placed. Returning to view mode by default."
            : language === "ko"
              ? "배치 완료."
              : "Placed.",
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
        showMessage(language === "ko" ? "이동했습니다." : "Moved.");
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
      showMessage(commandFailureLabels[language][result.reason]);
      return;
    }

    if (result.paintedCells.length > 0) {
      commitSnapshot(result.snapshot);
    }

    if (result.skippedCells.length > 0) {
      showMessage(
        language === "ko"
          ? "잠긴 셀에는 칠할 수 없습니다."
          : "Locked cells cannot be painted.",
      );
    }

    if (result.stoppedReason === "insufficient-points") {
      showMessage(
        language === "ko"
          ? "잔액이 부족해 마지막 가능한 셀까지만 칠했습니다."
          : "Painted only up to the last affordable cell.",
      );
    }
  }

  function handleItemSelect(instanceId: string) {
    setMode({ type: "selected", instanceId });
  }

  function handleMoveSelected() {
    if (!selectedInstance || !selectedDefinition || selectedIsProtected) {
      showMessage(commandFailureLabels[language]["protected-item"]);
      return;
    }

    setMode({
      type: "moving",
      instanceId: selectedInstance.id,
      rotation: selectedInstance.rotation,
    });
    showMessage(
      language === "ko"
        ? "새 위치를 클릭해 이동을 확정하세요."
        : "Click a new cell to confirm the move.",
    );
  }

  function handleRotatePlacing() {
    if (mode.type !== "placing") return;

    const definition = findEstateItemDefinition(itemDefinitions, mode.definitionId);
    if (!definition?.canRotate) {
      showMessage(
        language === "ko"
          ? "회전할 수 없는 아이템입니다."
          : "This item cannot rotate.",
      );
      return;
    }

    setMode({ ...mode, rotation: nextQuarterTurn(mode.rotation) });
  }

  return (
    <main className="min-h-dvh bg-canvas px-3 py-4 text-ink sm:px-5 lg:px-7">
      <div className="mx-auto grid w-full max-w-7xl gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-3 shadow-card sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/${locale}`}
              onClick={() => {
                void flushSave();
              }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-ink-muted transition hover:border-accent hover:bg-accent-soft hover:text-accent"
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

          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              icon={<Coins size={15} aria-hidden="true" />}
              label={messages.estate.availablePoints}
              value={formatPoints(locale, pointAccount.availablePoints)}
            />
            <SaveStatusPill
              status={saveStatus}
              label={saveStatusLabels[language][saveStatus]}
            />
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
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

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 rounded-xl border border-line bg-surface p-2 shadow-card">
            <EstateCanvas
              snapshot={snapshot}
              mode={mode}
              selectedItemId={selectedInstanceId}
              fitViewSignal={fitViewSignal}
              onCellClick={handleCellClick}
              onGroundPaintStart={handleGroundPaintStart}
              onGroundPaintCell={handleGroundPaintCell}
              onItemSelect={handleItemSelect}
            />
          </div>

          <aside className="fixed inset-x-3 bottom-3 z-20 max-h-[58dvh] overflow-hidden rounded-xl border border-line bg-surface shadow-pop lg:static lg:z-auto lg:max-h-none lg:self-start lg:shadow-card">
            <div className="grid border-b border-line bg-surface-3 p-2">
              <div className="grid grid-cols-4 gap-1">
                <ToolButton
                  active={activePanel === "shop"}
                  icon={<ShoppingBag size={16} aria-hidden="true" />}
                  label={panelLabels[language].shop}
                  onClick={() => setActivePanel("shop")}
                />
                <ToolButton
                  active={activePanel === "inventory"}
                  icon={<Package size={16} aria-hidden="true" />}
                  label={panelLabels[language].inventory}
                  onClick={() => setActivePanel("inventory")}
                />
                <ToolButton
                  active={activePanel === "expansion"}
                  icon={<Hammer size={16} aria-hidden="true" />}
                  label={panelLabels[language].expansion}
                  onClick={() => setActivePanel("expansion")}
                />
                <ToolButton
                  icon={<Maximize2 size={16} aria-hidden="true" />}
                  label={panelLabels[language].fit}
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
                  definition={selectedDefinition}
                  instance={selectedInstance}
                  language={language}
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
                  items={visibleShopItems}
                  language={language}
                  pendingPurchaseIds={pendingPurchaseIds}
                  pointBalance={pointAccount.availablePoints}
                  snapshot={snapshot}
                  onCategoryChange={setShopCategory}
                  onPurchase={handlePurchase}
                />
              ) : null}

              {activePanel === "inventory" ? (
                <InventoryPanel
                  language={language}
                  snapshot={snapshot}
                  onUseItem={handleStartInventoryAction}
                />
              ) : null}

              {activePanel === "expansion" ? (
                <ExpansionPanel
                  language={language}
                  pointBalance={pointAccount.availablePoints}
                  snapshot={snapshot}
                  onUnlock={(parcelId) => {
                    const result = applyCommand({
                      type: "unlock-parcel",
                      parcelId,
                    });
                    if (result.ok) {
                      showMessage(
                        language === "ko"
                          ? "영지를 확장했습니다."
                          : "Estate expanded.",
                      );
                    }
                  }}
                />
              ) : null}
            </div>
          </aside>
        </section>
      </div>
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
  items,
  language,
  pendingPurchaseIds,
  pointBalance,
  snapshot,
  onCategoryChange,
  onPurchase,
}: {
  category: EstateShopCategory;
  items: readonly EstateItemDefinition[];
  language: "ko" | "en";
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
            className={`h-9 shrink-0 rounded-lg border px-3 text-xs font-semibold transition ${
              category === candidate
                ? "border-accent bg-accent text-on-accent"
                : "border-line bg-surface text-ink-muted hover:border-accent hover:text-accent"
            }`}
            onClick={() => onCategoryChange(candidate)}
          >
            {categoryLabels[language][candidate]}
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
                    {getItemName(definition, language)}
                  </h2>
                  <p className="mt-1 text-xs text-ink-subtle">
                    {categoryLabels[language][definition.category]} ·{" "}
                    {definition.footprintWidth}x{definition.footprintHeight}
                  </p>
                </div>
                <span className="rounded-md bg-accent-soft px-2 py-1 font-mono text-xs font-semibold text-accent">
                  {definition.cost}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink-muted">
                  {language === "ko" ? "보유" : "Owned"} {ownedQuantity}
                </span>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-on-accent transition disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-ink-subtle"
                  disabled={disabled}
                  onClick={() => onPurchase(definition)}
                >
                  <ShoppingBag size={14} aria-hidden="true" />
                  {pending
                    ? language === "ko"
                      ? "처리 중"
                      : "Pending"
                    : language === "ko"
                      ? "구매"
                      : "Buy"}
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
  language,
  snapshot,
  onUseItem,
}: {
  language: "ko" | "en";
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
        {language === "ko"
          ? "보유한 아이템이 없습니다. 상점에서 먼저 구매하세요."
          : "No owned items. Buy from the shop first."}
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
              {getItemName(definition, language)}
            </h2>
            <p className="text-xs text-ink-subtle">
              {language === "ko" ? "보유 수량" : "Quantity"} {quantity} ·{" "}
              {definition.footprintWidth}x{definition.footprintHeight}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-on-accent"
            onClick={() => onUseItem(definition.id)}
          >
            {definition.placementRule === "ground" ? (
              <Paintbrush size={14} aria-hidden="true" />
            ) : (
              <Package size={14} aria-hidden="true" />
            )}
            {definition.placementRule === "ground"
              ? language === "ko"
                ? "칠하기"
                : "Paint"
              : language === "ko"
                ? "배치"
                : "Place"}
          </button>
        </div>
      ))}
    </div>
  );
}

function SelectionPanel({
  definition,
  instance,
  language,
  mode,
  protectedItem,
  onCancel,
  onMove,
  onRotate,
  onRemove,
}: {
  definition: EstateItemDefinition;
  instance: EstateItemInstance;
  language: "ko" | "en";
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
            {getItemName(definition, language)}
          </h2>
          <p className="text-xs text-ink-muted">
            {mode.type === "moving"
              ? language === "ko"
                ? "이동 위치 선택 중"
                : "Choosing move target"
              : `${instance.x}, ${instance.y}`}
          </p>
        </div>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-surface hover:text-ink"
          aria-label={language === "ko" ? "취소" : "Cancel"}
          title={language === "ko" ? "취소" : "Cancel"}
          onClick={onCancel}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <SelectionButton
          disabled={protectedItem}
          icon={<Move size={14} aria-hidden="true" />}
          label={language === "ko" ? "이동" : "Move"}
          onClick={onMove}
        />
        <SelectionButton
          disabled={protectedItem || !definition.canRotate}
          icon={<RotateCw size={14} aria-hidden="true" />}
          label={language === "ko" ? "회전" : "Rotate"}
          onClick={onRotate}
        />
        <SelectionButton
          danger
          disabled={protectedItem}
          icon={<Trash2 size={14} aria-hidden="true" />}
          label={language === "ko" ? "철거" : "Remove"}
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
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
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
  language,
  pointBalance,
  snapshot,
  onUnlock,
}: {
  language: "ko" | "en";
  pointBalance: number;
  snapshot: EstateSnapshot;
  onUnlock: (parcelId: string) => void;
}) {
  const lockedParcels = estateExpansionCatalog.filter(
    (parcel) => !snapshot.unlockedParcelIds.includes(parcel.id),
  );

  if (lockedParcels.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface-2 p-4 text-sm text-ink-muted">
        {language === "ko"
          ? "모든 구역이 확장되었습니다."
          : "All parcels are unlocked."}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {lockedParcels.map((parcel) => (
        <div
          key={parcel.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 p-3"
        >
          <div>
            <h2 className="text-sm font-semibold text-ink">
              {getParcelName(parcel.id, language)}
            </h2>
            <p className="text-xs text-ink-subtle">
              {language === "ko" ? "필요 포인트" : "Cost"} {parcel.cost}
            </p>
          </div>
          <button
            type="button"
            className="h-9 rounded-lg bg-accent px-3 text-xs font-semibold text-on-accent transition disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-ink-subtle"
            disabled={pointBalance < parcel.cost}
            onClick={() => onUnlock(parcel.id)}
          >
            {language === "ko" ? "확장" : "Unlock"}
          </button>
        </div>
      ))}
    </div>
  );
}

function getItemName(
  definition: EstateItemDefinition,
  language: "ko" | "en",
): string {
  return itemNames[language][definition.id] ?? definition.id;
}

function getParcelName(parcelId: string, language: "ko" | "en"): string {
  const ko: Record<string, string> = {
    "east-yard": "동쪽 마당",
    "south-yard": "남쪽 마당",
    "north-garden": "북쪽 정원",
    "remote-island": "원격 구역",
  };
  const en: Record<string, string> = {
    "east-yard": "East yard",
    "south-yard": "South yard",
    "north-garden": "North garden",
    "remote-island": "Remote parcel",
  };

  return (language === "ko" ? ko : en)[parcelId] ?? parcelId;
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
