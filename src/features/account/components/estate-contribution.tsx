"use client";

import { Sprout } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import styles from "./profile-surface.module.css";

export function EstateContribution({
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
    <section className={styles.section}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Sprout className="h-4 w-4 text-saving" aria-hidden="true" />
        {copy.title}
      </h2>
      <div className="mt-3 rounded-xl bg-saving-soft p-4">
        <p className="text-sm text-ink-muted">
          {interpolate(copy.summary, {
            points: formatPoints(locale, personalPoints),
            percent,
          })}
        </p>
      </div>
    </section>
  );
}
