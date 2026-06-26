"use client";

import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { ContributionGraph as Graph } from "../domain/contribution";
import styles from "./contribution-graph.module.css";

const LEVEL_CLASS = ["", styles.level1, styles.level2, styles.level3, styles.level4];

export function ContributionGraph({ graph }: { graph: Graph }) {
  const { locale, messages } = useI18n();
  const copy = messages.me.graph;

  const dateFmt = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
  });

  function cellTitle(date: string, points: number): string {
    const label = dateFmt.format(new Date(`${date}T00:00:00Z`));
    return points > 0
      ? interpolate(copy.cell, { date: label, points: formatPoints(locale, points) })
      : interpolate(copy.cellEmpty, { date: label });
  }

  const summaryText = interpolate(copy.summary, {
    days: graph.activeDays,
    longest: graph.longestStreak,
  });

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{copy.title}</h2>
        <span className="text-xs text-ink-subtle">{summaryText}</span>
      </div>

      {graph.activeDays === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{copy.empty}</p>
      ) : (
        <>
          <div className={`mt-3 ${styles.scroll}`}>
            <div className={styles.grid} role="img" aria-label={summaryText}>
              {graph.weeks.flatMap((week) =>
                week.map((cell) => (
                  <span
                    key={cell.date}
                    className={`${styles.cell} ${LEVEL_CLASS[cell.level]}`}
                    data-future={cell.future}
                    title={cell.future ? undefined : cellTitle(cell.date, cell.points)}
                  />
                )),
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-ink-subtle">
            <span>{copy.less}</span>
            <span className={styles.legendCell} style={{ background: "var(--color-inset)" }} />
            <span className={`${styles.legendCell} ${styles.level1}`} />
            <span className={`${styles.legendCell} ${styles.level2}`} />
            <span className={`${styles.legendCell} ${styles.level3}`} />
            <span className={`${styles.legendCell} ${styles.level4}`} />
            <span>{copy.more}</span>
          </div>
        </>
      )}
    </section>
  );
}
