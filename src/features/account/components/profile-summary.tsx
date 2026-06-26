"use client";

import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import { getCharacterProgress } from "@/features/campus-energy/domain/scoring";

export function ProfileSummary({
  displayName,
  personalPoints,
}: {
  displayName: string;
  personalPoints: number;
}) {
  const { locale, messages } = useI18n();
  const progress = getCharacterProgress(personalPoints);
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <section className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-xl font-bold text-on-accent">
        {initial}
      </span>
      <div>
        <h1 className="text-xl font-semibold text-ink">{displayName}</h1>
        <p className="text-sm font-medium text-saving">
          {messages.character.titles[progress.titleKey]} ·{" "}
          {interpolate(messages.character.level, { level: progress.level })}
        </p>
        <p className="text-sm tabular-nums text-ink-muted">
          {formatPoints(locale, personalPoints)}
        </p>
      </div>
    </section>
  );
}
