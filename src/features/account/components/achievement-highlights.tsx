"use client";

import type { CSSProperties } from "react";
import {
  Award,
  Crown,
  Flame,
  Leaf,
  Lock,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { useI18n } from "@/i18n/client";
import { TIER_PALETTE } from "@/features/leagues/domain/award-tier";
import type { Achievement, AchievementKey } from "../domain/achievements";
import styles from "./profile-surface.module.css";

const ICONS: Record<AchievementKey, typeof Leaf> = {
  "campus-saver": Leaf,
  "energy-hero": Sparkles,
  "grid-guardian": ShieldCheck,
  "streak-7": Flame,
  "check-in-10": Star,
  "top-student": Award,
};

export function AchievementHighlights({
  achievements,
}: {
  achievements: Achievement[];
}) {
  const { messages } = useI18n();
  const copy = messages.me.achievements;
  const labels: Record<AchievementKey, string> = {
    "campus-saver": copy.campusSaver,
    "energy-hero": copy.energyHero,
    "grid-guardian": copy.gridGuardian,
    "streak-7": copy.streak7,
    "check-in-10": copy.checkIn10,
    "top-student": copy.topStudent,
  };

  return (
    <section className={styles.section}>
      <h2 className="text-sm font-semibold text-ink">{copy.title}</h2>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {achievements.map((a) => {
          const active = a.earned && !a.locked;
          const earnedTopStudent =
            a.key === "top-student" && active ? (a.tier ?? "gold") : null;
          const palette = earnedTopStudent
            ? TIER_PALETTE[earnedTopStudent]
            : null;

          const Icon = a.locked
            ? Lock
            : earnedTopStudent === "gold"
              ? Crown
              : ICONS[a.key];

          // Non-tier ring classes; tier badges use inline style instead.
          const ring = a.locked
            ? "border-dashed border-[var(--honey)] bg-[var(--honey-soft)] text-[var(--honey-strong)]"
            : palette
              ? ""
              : active
                ? "border-saving bg-saving-soft text-saving"
                : "border-line bg-inset text-ink-subtle";

          const ringStyle: CSSProperties | undefined = palette
            ? {
                borderColor: palette.fill,
                background: palette.soft,
                color: palette.text,
                ...(earnedTopStudent === "gold"
                  ? { boxShadow: "0 0 0 4px rgb(245 197 24 / 0.16)" }
                  : {}),
              }
            : undefined;

          return (
            <li
              key={a.key}
              data-achievement={a.key}
              data-tier={earnedTopStudent ?? undefined}
              data-locked={a.locked ? "true" : undefined}
              className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={`grid h-16 w-16 place-items-center rounded-full border-2 ${ring}`}
                style={ringStyle}
                aria-hidden="true"
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="break-keep text-center text-[11px] leading-tight text-ink-muted">
                {labels[a.key]}
              </span>
              {a.locked ? (
                <span className="text-[10px] font-medium text-[var(--honey-strong)]">
                  {copy.lockedHint}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
