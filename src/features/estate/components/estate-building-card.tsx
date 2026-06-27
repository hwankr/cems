"use client";

import { Building2, ChevronUp, Coins, Crown } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { EstateMessages } from "./estate-copy";
import styles from "./estate-shell.module.css";

export type EstateBuildingCardProps = {
  copy: EstateMessages;
  locale: Locale;
  level: number;
  maxLevel: number;
  nextCost: number | null;
  availablePoints: number;
  onUpgrade: () => void;
};

export function EstateBuildingCard({
  copy,
  locale,
  level,
  maxLevel,
  nextCost,
  availablePoints,
  onUpgrade,
}: EstateBuildingCardProps) {
  const affordable = nextCost !== null && availablePoints >= nextCost;

  return (
    <section
      className={`${styles.panel} pointer-events-auto w-[15rem] max-w-[calc(100vw_-_1rem)] rounded-2xl p-3`}
      aria-label={copy.building.cardTitle}
    >
      <div className="flex items-center gap-2">
        <span
          className={`${styles.chip} grid h-9 w-9 place-items-center rounded-xl`}
        >
          <Building2 size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold leading-tight">
            {copy.building.cardTitle}
          </h2>
          <p className={`${styles.muted} text-[11px]`}>
            {interpolate(copy.building.levelProgress, { level, max: maxLevel })}
          </p>
        </div>
        <span
          className={`${styles.chip} flex h-7 items-center rounded-lg px-2 text-xs font-bold tabular-nums`}
        >
          {interpolate(copy.building.level, { level })}
        </span>
      </div>

      <div className="mt-2 flex gap-1" aria-hidden="true">
        {Array.from({ length: maxLevel }, (_unused, index) => (
          <span
            key={index}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background: index < level ? "var(--es-accent)" : "var(--es-line)",
            }}
          />
        ))}
      </div>

      {nextCost === null ? (
        <div
          className={`${styles.selectionCard} mt-3 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold`}
        >
          <Crown size={15} aria-hidden="true" />
          {copy.building.maxLevel}
        </div>
      ) : (
        <button
          type="button"
          className={`${styles.primaryBtn} mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55`}
          disabled={!affordable}
          onClick={onUpgrade}
          title={affordable ? copy.building.upgrade : copy.building.insufficient}
        >
          <ChevronUp size={16} aria-hidden="true" />
          <span>{copy.building.upgrade}</span>
          <span
            className={`${styles.divider} mx-1 h-4 w-px`}
            aria-hidden="true"
          />
          <Coins size={14} className={styles.coin} aria-hidden="true" />
          <span className="font-mono tabular-nums">
            {formatPoints(locale, nextCost)}
          </span>
        </button>
      )}
    </section>
  );
}
