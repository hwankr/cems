"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";

export function EstateContribution({
  personalPoints,
  groupPoolPoints,
  estateHref,
}: {
  personalPoints: number;
  groupPoolPoints: number;
  estateHref: string;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.me.contribution;
  const percent =
    groupPoolPoints > 0
      ? Math.round((personalPoints / groupPoolPoints) * 100)
      : 0;

  return (
    <section className="rounded-2xl border border-line bg-gradient-to-br from-accent-soft to-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{copy.title}</h2>
      <p className="mt-2 text-sm text-ink-muted">
        {interpolate(copy.summary, {
          points: formatPoints(locale, personalPoints),
          percent,
        })}
      </p>
      <Link
        href={estateHref}
        className="mt-3 inline-block text-sm font-semibold text-accent"
      >
        {copy.viewEstate} →
      </Link>
    </section>
  );
}
