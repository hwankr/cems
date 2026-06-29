"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/i18n/client";
import { TIER_PALETTE } from "../domain/award-tier";
import { tierForRank } from "../domain/standings";
import type { StudentAward } from "../domain/types";
import styles from "./league-hall.module.css";

export function StudentWinners({ students }: { students: StudentAward[] }) {
  const { messages } = useI18n();
  const copy = messages.hallOfFame;

  if (students.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink">
        {copy.studentSectionTitle}
      </h3>
      <ol className={styles.studentRow}>
        {students.map((student) => {
          const tier = tierForRank(student.rank);
          const palette = tier ? TIER_PALETTE[tier] : null;
          const initial =
            student.displayName.trim().charAt(0).toUpperCase() || "?";
          return (
            <li key={student.userId} className={styles.studentItem}>
              <span
                className={styles.studentRankBadge}
                style={
                  (palette
                    ? { background: palette.soft, color: palette.text }
                    : {
                        background: "var(--color-surface-3)",
                        color: "var(--color-ink-subtle)",
                      }) as CSSProperties
                }
              >
                {student.rank}
              </span>
              <span className={styles.studentAvatar} aria-hidden="true">
                {initial}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                {student.displayName}
              </span>
              <span className="flex-none text-[11px] font-medium text-ink-subtle">
                {student.rank}
                {copy.rankUnit}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
