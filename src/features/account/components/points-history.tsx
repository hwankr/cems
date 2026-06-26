"use client";

import { History } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import type { PointEvent } from "@/features/account/domain/points";
import { parsePointEventReason } from "@/features/account/domain/point-reason";

export function PointsHistory({ events }: { events: PointEvent[] }) {
  const { locale, messages } = useI18n();
  const me = messages.me;
  const missions = me.missions as Record<
    string,
    { title: string; location: string }
  >;
  const goalTitles = me.goalTitles as Record<string, string>;

  function label(reason: string): string {
    const parsed = parsePointEventReason(reason);
    if (parsed.kind === "verified-savings") return me.history.verifiedSavings;
    if (parsed.kind === "mission") return missions[parsed.code]?.title ?? parsed.code;
    if (parsed.kind === "goal")
      return `${goalTitles[parsed.id] ?? parsed.id} · ${me.history.goalBonus}`;
    return parsed.reason;
  }

  const dateFmt = new Intl.DateTimeFormat(
    locale === "ko" ? "ko-KR" : "en-US",
    { month: "short", day: "numeric" },
  );

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <History className="h-4 w-4 text-accent" aria-hidden="true" />
        {me.history.title}
      </h2>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{me.history.empty}</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-ink">{label(event.reason)}</span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums text-saving">
                  +{formatPoints(locale, event.points)}
                </span>
                <span className="text-xs text-ink-subtle">
                  {dateFmt.format(new Date(event.createdAt))}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
