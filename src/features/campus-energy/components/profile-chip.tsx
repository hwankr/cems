"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import { getCharacterProgress } from "../domain/scoring";

export function ProfileChip({
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
    <Link
      href={`/${locale}/me`}
      aria-label={messages.me.openMyPage}
      className="flex items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 py-2 shadow-pop backdrop-blur"
    >
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-xs font-bold text-on-accent">
        {initial}
      </span>
      <span className="leading-tight">
        <span className="block text-[11px] font-semibold text-accent">
          {interpolate(messages.character.level, { level: progress.level })}
        </span>
        <span className="block text-[11px] tabular-nums text-ink-muted">
          {formatPoints(locale, personalPoints)}
        </span>
      </span>
    </Link>
  );
}
