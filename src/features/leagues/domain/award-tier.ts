import type { AwardTier } from "./types";

export type TierPalette = {
  /** Solid tier fill — medals, pedestals, map extrusions. */
  fill: string;
  /** Soft tint background for chips/cards. */
  soft: string;
  /** Readable tier-tone text on light surfaces. */
  text: string;
  /** Stronger line/outline tone. */
  outline: string;
};

/**
 * Single source of the gold/silver/bronze palette used by every league
 * surface (Hall of Fame podium, student winners, /me badge, map effect,
 * estate emblem). `fill` values are frozen — the map style test asserts them.
 */
export const TIER_PALETTE: Record<AwardTier, TierPalette> = {
  gold: { fill: "#f5c518", soft: "#fdf3cf", text: "#a07a00", outline: "#caa204" },
  silver: { fill: "#c3cad3", soft: "#eef1f4", text: "#5b6470", outline: "#9aa3ad" },
  bronze: { fill: "#cd7f32", soft: "#f4e3d3", text: "#8a5320", outline: "#a8651f" },
};

/** Left → right podium order: runner-up, champion (center), third. */
export const PODIUM_VISUAL_ORDER: readonly AwardTier[] = [
  "silver",
  "gold",
  "bronze",
];

/** Pedestal height per tier (rem); gold is tallest so heights read as a 시상대. */
export const TIER_PEDESTAL_REM: Record<AwardTier, number> = {
  gold: 6.5,
  silver: 5,
  bronze: 4,
};
