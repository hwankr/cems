"use client";

import { Users, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { formatPoints } from "@/i18n/format";
import type { SubjectContributor } from "@/features/account/domain/contributor-ranking";
import type { EstateMessages } from "./estate-copy";
import styles from "./estate-shell.module.css";

export type EstateMemberPanelProps = {
  contributors: SubjectContributor[];
  copy: EstateMessages;
  locale: Locale;
  onClose: () => void;
};

export function EstateMemberPanel({
  contributors,
  copy,
  locale,
  onClose,
}: EstateMemberPanelProps) {
  const member = copy.member;

  return (
    <section
      className={`${styles.panel} pointer-events-auto flex max-h-[60vh] w-[17rem] max-w-[calc(100vw_-_1rem)] flex-col rounded-2xl p-3`}
      aria-label={member.title}
    >
      <div className="flex items-center gap-2">
        <span
          className={`${styles.chip} grid h-9 w-9 place-items-center rounded-xl`}
        >
          <Users size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold leading-tight">
            {member.title}
          </h2>
          <p className={`${styles.muted} text-[11px]`}>{member.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`${styles.ghostBtn} grid h-7 w-7 place-items-center rounded-lg`}
          aria-label={member.close}
          title={member.close}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      {contributors.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 px-2 py-6 text-center">
          <p className="text-[13px] font-semibold">{member.empty}</p>
          <p className={`${styles.muted} text-[11px]`}>{member.emptyHint}</p>
        </div>
      ) : (
        <ol className="mt-2 flex flex-col gap-1 overflow-y-auto">
          {contributors.map((contributor) => (
            <li
              key={contributor.userId}
              className={`${
                contributor.isMe ? styles.selectionCard : styles.chip
              } flex items-center gap-2 rounded-xl px-2 py-1.5`}
            >
              <span className="grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-bold tabular-nums">
                {contributor.rank}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate text-[13px] font-semibold">
                  {contributor.displayName}
                </span>
                {contributor.isMe ? (
                  <span
                    className={`${styles.priceTag} flex-none rounded-full px-1.5 py-0.5 text-[10px] font-bold`}
                  >
                    {member.you}
                  </span>
                ) : null}
              </span>
              <span className="flex-none text-[13px] font-bold tabular-nums">
                {formatPoints(locale, contributor.points)}
                <span className={`${styles.muted} ml-0.5 text-[11px] font-semibold`}>
                  {member.pointsUnit}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
