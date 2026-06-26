"use client";

import { Award, Flame, Leaf, Lock, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useI18n } from "@/i18n/client";
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
          const Icon = a.locked ? Lock : ICONS[a.key];
          const active = a.earned && !a.locked;
          const ring = a.locked
            ? "border-dashed border-[var(--honey)] bg-[var(--honey-soft)] text-[var(--honey-strong)]"
            : active
              ? "border-saving bg-saving-soft text-saving"
              : "border-line bg-inset text-ink-subtle";
          return (
            <li
              key={a.key}
              className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={`grid h-16 w-16 place-items-center rounded-full border-2 ${ring}`}
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
