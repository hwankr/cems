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
    <section className="border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center bg-emerald-700 text-white">
          <Sparkles className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            {messages.character.titles[progress.titleKey]}
          </p>
          <h2 className="text-2xl font-semibold text-emerald-950">
            {interpolate(messages.character.level, { level: progress.level })}
          </h2>
        </div>
      </div>
      <p className="mt-4 text-sm text-emerald-900">
        {interpolate(messages.character.totalPoints, {
          points: formatPoints(locale, points),
        })}
      </p>
      <div className="mt-3 h-3 bg-emerald-100">
        <div
          className="h-3 bg-emerald-600"
          style={{ width: `${progress.progressRate * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-emerald-800">
        {interpolate(messages.character.nextLevel, {
          current: formatNumber(locale, progress.currentLevelPoints),
          next: formatNumber(locale, progress.nextLevelPoints),
        })}
      </p>
    </section>
  );
}
