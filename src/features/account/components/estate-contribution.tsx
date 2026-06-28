"use client";

import { Sprout } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import styles from "./profile-surface.module.css";

export function EstateContribution({
  personalPoints,
  groupPoolPoints,
  action,
}: {
  personalPoints: number;
  groupPoolPoints: number;
  action?: ReactNode;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.me.contribution;
  const percent =
    groupPoolPoints > 0
      ? Math.round((personalPoints / groupPoolPoints) * 100)
      : 0;

  return (
    <section className={styles.section}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Sprout className="h-4 w-4 text-saving" aria-hidden="true" />
        {copy.title}
      </h2>

      <div className="mt-3 flex items-center gap-4 rounded-2xl bg-saving-soft p-4">
        {/* Contribution donut */}
        <div
          className="relative grid h-[92px] w-[92px] shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--color-saving) ${percent}%, var(--honey-soft) 0)`,
          }}
          role="img"
          aria-label={interpolate(copy.summary, {
            points: formatPoints(locale, personalPoints),
            percent,
          })}
        >
          <div className="flex h-[74px] w-[74px] flex-col items-center justify-center gap-1 rounded-full bg-surface">
            <span className="text-xl font-bold leading-none tabular-nums text-saving">
              {percent}%
            </span>
            <span className="text-[10px] leading-none text-ink-subtle">
              {copy.share}
            </span>
          </div>
        </div>

        {/* Figures */}
        <dl className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-xs text-ink-muted">{copy.mine}</dt>
            <dd className="text-sm font-bold tabular-nums text-ink">
              {formatPoints(locale, personalPoints)}
            </dd>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <dt className="text-xs text-ink-muted">{copy.pool}</dt>
            <dd className="text-sm font-semibold tabular-nums text-ink-muted">
              {formatPoints(locale, groupPoolPoints)}
            </dd>
          </div>
          <div className="my-2.5 h-px bg-line" />
          <p className="break-keep text-[11px] leading-snug text-ink-subtle">
            {copy.caption}
          </p>
        </dl>
      </div>
      {action ? <div className="mt-3">{action}</div> : null}
    </section>
  );
}
