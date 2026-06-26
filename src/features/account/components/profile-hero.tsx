"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { formatNumber, formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import { getCharacterProgress } from "@/features/campus-energy/domain/scoring";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-bold tabular-nums text-ink">{value}</span>
      <span className="text-xs text-ink-muted">{label}</span>
    </div>
  );
}

export function ProfileHero({
  displayName,
  handle,
  bio,
  personalPoints,
  currentStreak,
}: {
  displayName: string;
  handle: string | null;
  bio: string | null;
  personalPoints: number;
  currentStreak: number;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.me.profile;
  const progress = getCharacterProgress(personalPoints);
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
  const ringPct = Math.round(progress.progressRate * 100);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center gap-5">
        {/* Avatar with level-progress ring */}
        <span
          className="grid h-20 w-20 shrink-0 place-items-center rounded-full p-[3px]"
          style={{
            background: `conic-gradient(var(--color-saving) ${ringPct}%, var(--color-line) 0)`,
          }}
        >
          <span className="grid h-full w-full place-items-center rounded-full bg-accent text-2xl font-bold text-on-accent">
            {initial}
          </span>
        </span>

        {/* Stats row */}
        <div className="flex flex-1 justify-around">
          <Stat value={formatNumber(locale, personalPoints)} label={copy.statPoints} />
          <Stat value={formatNumber(locale, progress.level)} label={copy.statLevel} />
          <Stat value={formatNumber(locale, currentStreak)} label={copy.statStreak} />
        </div>
      </div>

      <div className="mt-4">
        <h1 className="text-lg font-semibold text-ink">{displayName}</h1>
        <p className="text-sm text-ink-subtle">
          {handle ? `@${handle}` : copy.handleFallback}
        </p>
        <p className="mt-1 text-sm font-medium text-saving">
          {messages.character.titles[progress.titleKey]} ·{" "}
          {interpolate(messages.character.level, { level: progress.level })} ·{" "}
          {formatPoints(locale, personalPoints)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">{bio ?? copy.noBio}</p>
      </div>

      <Link
        href={`/${locale}/me/edit`}
        className="mt-4 block rounded-lg border border-line py-2 text-center text-sm font-semibold text-ink"
      >
        {copy.edit}
      </Link>
    </section>
  );
}
