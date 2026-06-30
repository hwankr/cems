"use client";

import { Building2, ChevronUp, Coins, Crown, Sprout, Users, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { SubjectContributor } from "@/features/account/domain/contributor-ranking";
import type { EstateMessages } from "./estate-copy";
import styles from "./estate-shell.module.css";

type EstateBuildingPanelProps = {
  copy: EstateMessages;
  locale: Locale;
  title: string;
  level?: number;
  maxLevel?: number;
  nextCost?: number | null;
  availablePoints?: number;
  ecoRatePerHour?: number;
  ecoAvailable?: number;
  contributors?: SubjectContributor[];
  onUpgrade?: () => void;
  onCollectEco?: () => void;
  onClose: () => void;
};

export function EstateBuildingPanel({
  copy,
  locale,
  title,
  level,
  maxLevel,
  nextCost,
  availablePoints = 0,
  ecoRatePerHour = 0,
  ecoAvailable = 0,
  contributors = [],
  onUpgrade,
  onCollectEco,
  onClose,
}: EstateBuildingPanelProps) {
  const affordable = nextCost != null && availablePoints >= nextCost;

  return (
    <section
      className={`${styles.panelStrong} pointer-events-auto fixed inset-x-2 bottom-2 z-40 mx-auto flex max-w-md flex-col gap-3 rounded-3xl p-3.5 lg:absolute lg:inset-x-auto lg:bottom-3 lg:right-3 lg:w-[22rem]`}
      aria-label={title}
    >
      <header className="flex items-center gap-2.5">
        <span className={`${styles.chip} grid h-10 w-10 place-items-center rounded-xl`}>
          <Building2 size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold leading-tight">{title}</h2>
          {level != null && maxLevel != null ? (
            <p className={`${styles.muted} text-[11px]`}>
              {interpolate(copy.building.levelProgress, { level, max: maxLevel })}
            </p>
          ) : null}
        </div>
        {level != null ? (
          <span className={`${styles.chip} flex h-7 items-center rounded-lg px-2 text-xs font-bold tabular-nums`}>
            {interpolate(copy.building.level, { level })}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.member.close}
          title={copy.member.close}
          className={`${styles.ghostBtn} grid h-8 w-8 place-items-center rounded-lg`}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      {nextCost == null ? (
        <div className={`${styles.selectionCard} flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold`}>
          <Crown size={15} aria-hidden="true" />
          {copy.building.maxLevel}
        </div>
      ) : (
        <button
          type="button"
          className={`${styles.primaryBtn} flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55`}
          disabled={!affordable}
          onClick={onUpgrade}
          aria-label={affordable ? copy.building.upgrade : copy.building.insufficient}
          title={affordable ? copy.building.upgrade : copy.building.insufficient}
        >
          <ChevronUp size={16} aria-hidden="true" />
          <span>{copy.building.upgrade}</span>
          <span className={`${styles.divider} mx-1 h-4 w-px`} aria-hidden="true" />
          <Coins size={14} className={styles.coin} aria-hidden="true" />
          <span className="font-mono tabular-nums">{formatPoints(locale, nextCost)}</span>
        </button>
      )}

      <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--es-line-soft)] bg-[var(--es-inset)] px-3 py-2">
        <span className={`${styles.muted} flex items-center gap-1.5 text-xs`}>
          <Sprout size={14} className={styles.coin} aria-hidden="true" />
          {copy.building.production}
          <strong className="font-mono tabular-nums">+{ecoRatePerHour}/h</strong>
        </span>
        <button
          type="button"
          className={`${styles.primaryBtn} inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold`}
          onClick={onCollectEco}
          aria-label={copy.eco.collect}
          title={copy.eco.collect}
        >
          <Sprout size={13} aria-hidden="true" />
          {formatPoints(locale, ecoAvailable)}
        </button>
      </div>

      <div className="flex min-h-0 flex-col gap-1.5">
        <span className={`${styles.muted} flex items-center gap-1.5 text-[11px] font-medium`}>
          <Users size={13} aria-hidden="true" />
          {copy.member.title}
        </span>
        {contributors.length === 0 ? (
          <p className={`${styles.muted} ${styles.miniMetric} rounded-xl px-3 py-3 text-center text-[12px]`}>
            {copy.member.empty}
          </p>
        ) : (
          <ol className="flex max-h-[28vh] flex-col gap-1 overflow-y-auto">
            {contributors.map((contributor) => (
              <li
                key={contributor.userId}
                className={`${contributor.isMe ? styles.selectionCard : styles.chip} flex items-center gap-2 rounded-xl px-2 py-1.5`}
              >
                <span className="grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-bold tabular-nums">
                  {contributor.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                  {contributor.displayName}
                  {contributor.isMe ? (
                    <span className={`${styles.priceTag} ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold`}>
                      {copy.member.you}
                    </span>
                  ) : null}
                </span>
                <span className="flex-none text-[13px] font-bold tabular-nums">
                  {formatPoints(locale, contributor.points)}
                  <span className={`${styles.muted} ml-0.5 text-[11px] font-semibold`}>
                    {copy.member.pointsUnit}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
