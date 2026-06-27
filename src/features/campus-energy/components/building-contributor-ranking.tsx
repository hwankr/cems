"use client";

import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import type { SubjectContributor } from "@/features/account/domain/contributor-ranking";

type BuildingContributorRankingProps = {
  contributors: SubjectContributor[];
};

export function BuildingContributorRanking({
  contributors,
}: BuildingContributorRankingProps) {
  const { locale, messages } = useI18n();
  const copy = messages.mapView.contributors;

  if (contributors.length === 0) {
    return (
      <div className="flex h-[196px] flex-col items-center justify-center gap-1 px-4 text-center">
        <p className="text-sm font-semibold text-ink">{copy.empty}</p>
        <p className="text-xs text-ink-subtle">{copy.emptyHint}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
          {copy.title}
        </span>
        <span className="text-[11px] text-ink-subtle">{copy.subtitle}</span>
      </div>
      <ol className="flex flex-col gap-1">
        {contributors.map((contributor) => (
          <li
            key={contributor.userId}
            className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 ${
              contributor.isMe ? "bg-accent-soft" : "bg-surface-3"
            }`}
          >
            <span
              className={`grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-bold tabular-nums ${
                contributor.isMe
                  ? "bg-accent text-surface"
                  : "bg-surface text-ink"
              }`}
            >
              {contributor.rank}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="truncate text-[13px] font-semibold text-ink">
                {contributor.displayName}
              </span>
              {contributor.isMe ? (
                <span className="flex-none rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-surface">
                  {copy.you}
                </span>
              ) : null}
            </span>
            <span className="flex-none text-[13px] font-bold tabular-nums text-ink">
              {formatNumber(locale, contributor.points)}
              <span className="ml-0.5 text-[11px] font-semibold text-ink-subtle">
                {copy.pointsUnit}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
