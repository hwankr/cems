"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles, Sprout } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import { getCharacterProgress } from "@/features/campus-energy/domain/scoring";
import { SignOutButton } from "./sign-out-button";
import styles from "./profile-surface.module.css";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.statCell}>
      <div className="text-lg font-bold leading-none tabular-nums text-ink">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-ink-muted">{label}</div>
    </div>
  );
}

export function ProfileHero({
  displayName,
  handle,
  bio,
  personalPoints,
  currentStreak,
  estateHref,
}: {
  displayName: string;
  handle: string | null;
  bio: string | null;
  personalPoints: number;
  currentStreak: number;
  estateHref: string;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.me.profile;
  const progress = getCharacterProgress(personalPoints);
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
  const ringPct = Math.round(progress.progressRate * 100);

  return (
    <header>
      {/* Cover band with glass overlay controls + overlapping avatar */}
      <div className={styles.cover}>
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
          <Link
            href={`/${locale}`}
            aria-label={messages.me.backToMap}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <SignOutButton className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/30" />
        </div>

        <span
          className="absolute -bottom-10 left-5 grid h-[84px] w-[84px] place-items-center rounded-full p-[3px] shadow-[0_0_0_4px_var(--color-surface)]"
          style={{
            background: `conic-gradient(var(--honey) ${ringPct}%, rgb(255 255 255 / 0.55) 0)`,
          }}
        >
          <span
            className="grid h-full w-full place-items-center rounded-full text-2xl font-bold text-on-accent"
            style={{ background: "linear-gradient(135deg, #2f9e6b, #0b5e3f)" }}
          >
            {initial}
          </span>
        </span>
      </div>

      {/* Identity */}
      <div className="px-5 pt-14">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-ink">{displayName}</h1>
            <p className="truncate text-sm text-ink-subtle">
              {handle ? `@${handle}` : copy.handleFallback}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={estateHref}
              aria-label={messages.me.contribution.viewEstate}
              title={messages.me.contribution.viewEstate}
              className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-saving transition-colors hover:bg-saving-soft"
            >
              <Sprout className="h-[18px] w-[18px]" aria-hidden="true" />
            </Link>
            <Link
              href={`/${locale}/me/edit`}
              className="rounded-full bg-[var(--honey)] px-4 py-2 text-xs font-bold text-[#3a2a08] shadow-sm transition-colors hover:bg-[var(--honey-strong)] hover:text-white"
            >
              {copy.edit}
            </Link>
          </div>
        </div>

        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-saving-soft px-2.5 py-1 text-xs font-semibold text-saving">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {messages.character.titles[progress.titleKey]} ·{" "}
          {interpolate(messages.character.level, { level: progress.level })}
        </p>

        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {bio ?? copy.noBio}
        </p>
      </div>

      {/* Stat strip */}
      <div className="px-5 pb-5 pt-4">
        <div className={styles.statStrip}>
          <Stat value={formatNumber(locale, personalPoints)} label={copy.statPoints} />
          <Stat value={formatNumber(locale, progress.level)} label={copy.statLevel} />
          <Stat value={formatNumber(locale, currentStreak)} label={copy.statStreak} />
        </div>
      </div>
    </header>
  );
}
