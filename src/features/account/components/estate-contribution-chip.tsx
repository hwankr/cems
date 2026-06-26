"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";

export function EstateContributionChip({
  personalPoints,
  groupPoolPoints,
}: {
  personalPoints: number;
  groupPoolPoints: number;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.me.contribution;
  const percent =
    groupPoolPoints > 0
      ? Math.round((personalPoints / groupPoolPoints) * 100)
      : 0;

  return (
    <Link
      href={`/${locale}/me`}
      className="pointer-events-auto fixed left-1/2 top-3 z-[60] -translate-x-1/2 rounded-full border border-line bg-surface/95 px-4 py-2 text-xs font-semibold text-ink shadow-pop backdrop-blur"
    >
      {interpolate(copy.chip, {
        points: formatPoints(locale, personalPoints),
        percent,
      })}
    </Link>
  );
}
