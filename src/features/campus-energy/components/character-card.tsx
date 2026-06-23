"use client";

import { Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatNumber, formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { CharacterProgress } from "../domain/types";

type CharacterCardProps = {
  progress: CharacterProgress;
  points: number;
};

export function CharacterCard({ progress, points }: CharacterCardProps) {
  const { locale, messages } = useI18n();

  return (
    <section className="rounded-2xl border border-saving/20 bg-gradient-to-br from-saving-soft to-surface p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-saving to-accent text-on-accent shadow-[0_0_28px_-6px_rgb(52_211_153_/_0.7)]">
          <Sparkles className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-saving">
            {messages.character.titles[progress.titleKey]}
          </p>
          <h2 className="text-2xl font-semibold text-ink">
            {interpolate(messages.character.level, { level: progress.level })}
          </h2>
        </div>
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        {interpolate(messages.character.totalPoints, {
          points: formatPoints(locale, points),
        })}
      </p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-inset">
        <div
          className="h-full rounded-full bg-gradient-to-r from-saving to-accent"
          style={{ width: `${progress.progressRate * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-ink-subtle">
        {interpolate(messages.character.nextLevel, {
          current: formatNumber(locale, progress.currentLevelPoints),
          next: formatNumber(locale, progress.nextLevelPoints),
        })}
      </p>
    </section>
  );
}
