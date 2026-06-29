"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Coins,
  Leaf,
  Loader2,
  MapPin,
  ShoppingBag,
  Sprout,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PendingButtonContent } from "@/features/ui/pending-button-content";
import { useI18n } from "@/i18n/client";
import { formatKwh, formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import { estateItemCatalog } from "../data/estate-item-catalog";
import { estateExpansionCatalog } from "../data/estate-expansion-catalog";
import type { EstatePageData } from "../data/get-estate-page-data";
import {
  createEstatePurchaseLock,
  type EstateSaveStatus,
} from "../domain/editor";
import { getAvailableEcoCredits } from "../domain/eco-credit";
import { getInventoryQuantity } from "../domain/inventory";
import { calculateEstatePointAccount } from "../domain/point-account";
import { estateReducer } from "../domain/reducer";
import type {
  EstateCommandContext,
  EstateItemCategory,
  EstateItemDefinition,
  EstateSnapshot,
} from "../domain/types";
import { LocalStorageEstateRepository } from "../persistence/local-storage-estate-repository";
import { createEstateTableClient } from "../persistence/estate-table-client";
import type { EstateRepository } from "../persistence/estate-repository";
import { SupabaseEstateRepository } from "../persistence/supabase-estate-repository";
import { createEstateId, getItemName } from "./estate-copy";
import { ItemThumb } from "./estate-item-thumb";
import styles from "./estate-shell.module.css";

type EstateShopClientProps = {
  data: EstatePageData;
  repository?: EstateRepository;
};

type EstateShopCategory = "all" | EstateItemCategory;

const itemDefinitions = estateItemCatalog;
const purchaseLockMs = 420;
const categoryOrder: EstateShopCategory[] = [
  "all",
  "generator",
  "nature",
  "furniture",
  "energy",
  "facility",
  "ground",
  "landmark",
];

export function EstateShopClient({ data, repository }: EstateShopClientProps) {
  const { locale, messages } = useI18n();
  const copy = messages.estate;
  const [snapshot, setSnapshot] = useState<EstateSnapshot>(
    data.initialSnapshot,
  );
  const [shopCategory, setShopCategory] = useState<EstateShopCategory>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<EstateSaveStatus>("saved");
  const [pendingPurchaseIds, setPendingPurchaseIds] = useState<Set<string>>(
    () => new Set(),
  );
  const snapshotRef = useRef(snapshot);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const purchaseLockRef = useRef(createEstatePurchaseLock());
  const repositoryRef = useRef<EstateRepository | null>(null);

  if (repositoryRef.current === null) {
    repositoryRef.current =
      repository ??
      (typeof window === "undefined"
        ? new LocalStorageEstateRepository()
        : new SupabaseEstateRepository({ client: createEstateTableClient() }));
  }

  const officialCode = data.subject.officialCode ?? data.subject.shortName;
  const savedEnergyValue = data.comparison
    ? formatKwh(locale, data.comparison.savingsKwh)
    : copy.unavailable;
  const pointAccount = useMemo(
    () =>
      calculateEstatePointAccount(
        data.pointAccount.earnedPoints,
        snapshot.transactions,
      ),
    [data.pointAccount.earnedPoints, snapshot.transactions],
  );
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());
  useEffect(() => {
    const id = setInterval(() => setNowIso(new Date().toISOString()), 5_000);
    return () => clearInterval(id);
  }, []);
  const availableEco = useMemo(
    () => getAvailableEcoCredits(snapshot, itemDefinitions, nowIso),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- itemDefinitions is a module-level constant
    [snapshot, nowIso, itemDefinitions],
  );
  const estateHref = `/${locale}/subjects/${data.subject.id}/estate`;
  const visibleItems = useMemo(
    () =>
      itemDefinitions.filter(
        (definition) =>
          shopCategory === "all" || definition.category === shopCategory,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- itemDefinitions is a module-level constant
    [shopCategory, itemDefinitions],
  );

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const showMessage = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    messageTimerRef.current = setTimeout(() => setMessage(null), 2600);
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

  const persist = useCallback(async (next: EstateSnapshot) => {
    setSaveStatus("saving");
    const result = await repositoryRef.current?.save(next.subjectId, next);
    setSaveStatus(result?.ok ? "saved" : "failed");
  }, []);

  useEffect(() => {
    let cancelled = false;

    repositoryRef.current?.load(data.subject.id).then((result) => {
      if (cancelled || !result) return;

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

    return () => {
      cancelled = true;
    };
  }, [copy.messages, data.subject.id, showMessage]);

  useEffect(
    () => () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    },
    [],
  );

  const applyPurchase = useCallback(
    (definition: EstateItemDefinition) => {
      const result = estateReducer(
        snapshotRef.current,
        { type: "purchase-item", definitionId: definition.id },
        createCommandContext(),
      );

      if (!result.ok) {
        showMessage(copy.commandFailures[result.reason]);
        return;
      }

      snapshotRef.current = result.snapshot;
      setSnapshot(result.snapshot);
      void persist(result.snapshot);
      showMessage(
        interpolate(copy.messages.purchase, {
          item: getItemName(definition, copy),
        }),
      );
    },
    [copy, createCommandContext, persist, showMessage],
  );

  function handlePurchase(definition: EstateItemDefinition) {
    if (!purchaseLockRef.current.tryAcquire(definition.id)) return;

    setPendingPurchaseIds((current) => new Set(current).add(definition.id));
    applyPurchase(definition);

    setTimeout(() => {
      purchaseLockRef.current.release(definition.id);
      setPendingPurchaseIds((current) => {
        const next = new Set(current);
        next.delete(definition.id);
        return next;
      });
    }, purchaseLockMs);
  }

  return (
    <main className={styles.shop}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 pb-28 pt-3 sm:px-5 sm:pt-4">
        <header
          className={`${styles.panel} sticky top-2 z-20 flex items-center gap-2.5 rounded-2xl px-2.5 py-2 sm:px-3`}
        >
          <Link
            href={estateHref}
            className={`${styles.ghostBtn} grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--es-line)]`}
            aria-label={copy.shop.backToEstate}
            title={copy.shop.backToEstate}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <div
              className={`${styles.muted} flex items-center gap-1 text-[11px] font-medium`}
            >
              <BadgeCheck size={12} aria-hidden="true" />
              <span className="truncate">{officialCode}</span>
            </div>
            <h1 className="truncate text-[15px] font-semibold leading-tight sm:text-base">
              {copy.shop.title}
            </h1>
          </div>
          <div
            className={`${styles.chip} flex h-10 items-center gap-1.5 rounded-xl px-2.5`}
            aria-label={copy.currency.points}
          >
            <Coins size={15} className={styles.coin} aria-hidden="true" />
            <strong className="font-mono text-sm tabular-nums">
              {formatPoints(locale, pointAccount.availablePoints)}
            </strong>
          </div>
          <div
            className={`${styles.chip} flex h-10 items-center gap-1.5 rounded-xl px-2.5`}
            aria-label={copy.currency.eco}
          >
            <Sprout size={15} className={styles.coin} aria-hidden="true" />
            <strong className="font-mono text-sm tabular-nums">
              {formatPoints(locale, availableEco)}
            </strong>
          </div>
          <SaveChip status={saveStatus} label={copy.saveStatus[saveStatus]} />
        </header>

        <p className={`${styles.subtle} -mt-1 text-[13px]`}>
          {copy.shop.subtitle}
        </p>

        <div className="grid grid-cols-3 gap-1.5">
          <MiniMetric
            icon={<Leaf size={14} aria-hidden="true" />}
            label={copy.savedEnergy}
            value={savedEnergyValue}
          />
          <MiniMetric
            icon={<Coins size={14} aria-hidden="true" />}
            label={copy.earnedPoints}
            value={formatPoints(locale, pointAccount.earnedPoints)}
          />
          <MiniMetric
            icon={<Coins size={14} aria-hidden="true" />}
            label={copy.spentPoints}
            value={formatPoints(locale, pointAccount.spentPoints)}
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categoryOrder.map((candidate) => (
            <button
              key={candidate}
              type="button"
              className={`h-9 shrink-0 rounded-full border px-3.5 text-xs font-medium transition ${
                shopCategory === candidate
                  ? `${styles.tabActive} border-transparent`
                  : `${styles.muted} border-[var(--es-line)] hover:border-[var(--es-accent)]`
              }`}
              onClick={() => setShopCategory(candidate)}
            >
              {copy.categories[candidate]}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {visibleItems.map((definition) => {
            const ownedQuantity = getInventoryQuantity(
              snapshot.inventory,
              definition.id,
            );
            const currency = definition.currency ?? "points";
            const balance =
              currency === "eco" ? availableEco : pointAccount.availablePoints;
            const pending = pendingPurchaseIds.has(definition.id);
            const disabled = pending || balance < definition.cost;

            return (
              <div
                key={definition.id}
                className={`${styles.card} flex gap-3 rounded-2xl p-2.5`}
              >
                <ItemThumb definition={definition} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">
                        {getItemName(definition, copy)}
                      </h2>
                      <p className={`${styles.subtle} mt-0.5 text-xs`}>
                        {copy.categories[definition.category]} ·{" "}
                        {definition.footprintWidth}x{definition.footprintHeight}
                      </p>
                    </div>
                    <span
                      className={`${styles.priceTag} flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-mono text-xs font-semibold`}
                    >
                      {currency === "eco" ? (
                        <Sprout size={12} aria-hidden="true" />
                      ) : (
                        <Coins size={12} aria-hidden="true" />
                      )}
                      {formatPoints(locale, definition.cost)}
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className={`${styles.muted} text-xs font-medium`}>
                      {copy.shop.owned} {ownedQuantity}
                    </span>
                    <button
                      type="button"
                      className={`${styles.primaryBtn} inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold`}
                      disabled={disabled}
                      aria-busy={pending}
                      onClick={() => handlePurchase(definition)}
                    >
                      {pending ? null : (
                        <ShoppingBag size={14} aria-hidden="true" />
                      )}
                      <PendingButtonContent
                        pending={pending}
                        idleLabel={copy.shop.buy}
                        pendingLabel={copy.shop.pending}
                        spinnerClassName="h-3 w-3"
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {interpolate(copy.aria.liveSummary, {
          selection: copy.aria.noneSelected,
          balance: formatPoints(locale, pointAccount.availablePoints),
          saveStatus: copy.saveStatus[saveStatus],
        })}
        {message ? ` ${message}` : ""}
      </p>

      {message ? (
        <div
          className={`${styles.toast} pointer-events-none fixed bottom-24 left-1/2 z-40 max-w-[calc(100vw_-_1.5rem)] -translate-x-1/2 rounded-xl px-3.5 py-2 text-center text-[13px] font-medium`}
        >
          {message}
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
        <Link
          href={estateHref}
          className={`${styles.primaryBtn} ${styles.shopCta} mx-auto flex h-12 w-full max-w-3xl items-center justify-center gap-2 rounded-2xl text-sm font-semibold`}
        >
          <MapPin size={16} aria-hidden="true" />
          {copy.shop.goPlace}
        </Link>
      </div>
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
    <div
      className={`${styles.miniMetric} flex flex-col gap-1 rounded-xl px-2.5 py-2`}
    >
      <span
        className={`${styles.subtle} flex items-center gap-1 text-[10px] font-medium`}
      >
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="truncate text-[13px] font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

export default EstateShopClient;
