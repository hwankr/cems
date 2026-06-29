"use client";

import type { CSSProperties } from "react";
import { Crown, Medal } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import {
  PODIUM_VISUAL_ORDER,
  TIER_PALETTE,
  TIER_PEDESTAL_REM,
} from "../domain/award-tier";
import type { AwardTier, TeamAward } from "../domain/types";
import styles from "./league-hall.module.css";

export function AwardPodium({ teams }: { teams: TeamAward[] }) {
  const { locale, messages } = useI18n();
  const copy = messages.hallOfFame;
  const tierLabel: Record<AwardTier, string> = {
    gold: copy.tierGold,
    silver: copy.tierSilver,
    bronze: copy.tierBronze,
  };

  const byTier = new Map(teams.map((team) => [team.tier, team] as const));
  const slots = PODIUM_VISUAL_ORDER.map((tier) => byTier.get(tier)).filter(
    (team): team is TeamAward => Boolean(team),
  );

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-ink">
        {copy.teamSectionTitle}
      </h3>
      <ol className={styles.podium} aria-label={copy.teamSectionTitle}>
        {slots.map((team) => {
          const palette = TIER_PALETTE[team.tier];
          const isGold = team.tier === "gold";
          return (
            <li
              key={team.competitorId}
              data-tier={team.tier}
              data-rank={team.rank}
              className={styles.slot}
            >
              <span
                className={`${styles.crest} ${isGold ? styles.crestGold : ""}`}
                style={
                  {
                    color: palette.text,
                    background: palette.soft,
                    borderColor: palette.fill,
                  } as CSSProperties
                }
              >
                {isGold ? (
                  <Crown className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Medal className="h-5 w-5" aria-hidden="true" />
                )}
              </span>

              <span className={styles.slotName} title={team.competitorName}>
                {team.competitorName}
              </span>

              {team.metricValue !== null ? (
                <span className="text-[11px] text-ink-subtle">
                  {interpolate(copy.avgPointsLabel, {
                    points: formatNumber(locale, Math.round(team.metricValue)),
                  })}
                </span>
              ) : null}

              <span
                className={styles.pedestal}
                style={
                  {
                    "--pedestal-h": `${TIER_PEDESTAL_REM[team.tier]}rem`,
                    "--tier": palette.fill,
                  } as CSSProperties
                }
              >
                <span
                  className={styles.pedestalRank}
                  style={{ color: palette.text }}
                >
                  {team.rank}
                </span>
                <span
                  className={styles.pedestalTier}
                  style={{ color: palette.text }}
                >
                  {tierLabel[team.tier]}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
