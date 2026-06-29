# League / Hall of Fame Design Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the league surfaces (the Hall of Fame page plus the map building effect, `/me` top-student badge, and estate winner emblem) from their current 투박/crude look to the project's real design quality bar — a warm "잔디 정원" one-sheet with a celebratory gold-accented hero, a true 3-column 시상대 podium, and richer winner cards.

**Architecture:** Introduce one pure tier-palette module as the single source of gold/silver/bronze colors, then rebuild the Hall of Fame as a continuous warm-garden sheet (reusing `profile-surface.module.css` like `/me` does) with a new `league-hall.module.css` for podium/hero structure. Apply the same tier palette to the three in-context surfaces. All data plumbing already exists (leagues feature + RPCs); this is purely a presentation pass — no DB, RPC, or domain-logic changes.

**Tech Stack:** Next.js 16.2.9 (App Router, server components), React 19.2.4, TypeScript, Tailwind CSS v4 (token utilities + CSS Modules), lucide-react, Vitest (jsdom for components, node for domain).

## Global Constraints

- **Korean-first i18n.** Every display string must exist in BOTH `src/i18n/messages/ko.ts` and `src/i18n/messages/en.ts`; the `Messages` type derives from `koMessages`, and `src/i18n/__tests__/*` (messages symmetry) will fail the build if keys are asymmetric. This plan adds exactly **one** new key (`estate.inventory.awarded`); the Hall of Fame reuses existing `hallOfFame.*` copy.
- **Warm "잔디 정원" palette, always light.** Reuse the scoped `--color-*` token override from `src/features/account/components/profile-surface.module.css` (the page wraps content in `styles.surface`, so descendants inherit `--color-*`, `--honey`, `--honey-strong`, `--honey-soft`). Do not edit the global tokens in `globals.css`.
- **Canonical tier hexes are frozen** (the existing map test asserts them): gold `#f5c518`, silver `#c3cad3`, bronze `#cd7f32`. Keep these exact values as the `fill` in the new palette module.
- **No new DB / RPC / domain-scoring changes.** Read-only presentation only. `src/features/leagues/data/leagues-dal.ts`, `domain/standings.ts`, and `domain/types.ts` logic is unchanged (we only ADD `domain/award-tier.ts`).
- **Tailwind v4 JIT safety:** drive tier colors via inline `style` from the palette module (e.g. `style={{ color: palette.text }}`), NOT via dynamically concatenated arbitrary classes (`bg-[${hex}]`) which the JIT cannot see. Static token utilities (`text-ink`, `bg-surface`, `bg-surface-3`, `text-ink-subtle`) are fine.
- **Before editing any Next.js-specific API** (metadata, `next/*`), follow `AGENTS.md` and read the relevant guide under `node_modules/next/dist/docs/`. This plan changes no Next APIs (the existing `generateMetadata` and `Link`/`redirect`/`notFound` usage is untouched), so no new doc reads are required — but honor the rule if a step drifts.
- **Commit cadence:** one commit per task, conventional-commit style (`feat(leagues): …`, `feat(estate): …`). Do not push unless the user asks.
- **Verification limits (documented repo norm):** this environment has no browser/screenshot for the full app, and the estate full-bleed canvas route hangs the preview tool. Automated proof is Vitest + ESLint + `npm run build`; final pixel confirmation of the Hall of Fame, map, and estate is the user's on their dev server. State this honestly — do not claim visual verification that was not performed.

---

## File Structure

**New files**
- `src/features/leagues/domain/award-tier.ts` — pure, framework-free single source of tier colors, podium visual order, and pedestal heights. Imported by the podium, student winners, `/me` badge, the map style, and the estate emblem.
- `src/features/leagues/__tests__/award-tier.test.ts` — domain test for the palette/order/heights.
- `src/features/leagues/components/league-hall.module.css` — CSS Module for the Hall of Fame hero (green cover + gold bloom), the 3-column podium (pedestals, crests, heights), and the student-winner rows. Tier-agnostic structure; tier colors arrive via inline custom properties.
- `src/features/leagues/components/student-winners.tsx` — extracted, testable student-winners list (was inline pills in the section).
- `src/features/leagues/__tests__/student-winners.test.tsx` — jsdom test for the winners list.
- `src/features/account/__tests__/achievement-highlights.test.tsx` — jsdom test anchoring the tier-aware top-student badge (no test exists today).

**Modified files**
- `src/features/leagues/components/award-podium.tsx` — flat list → true 3-column 시상대.
- `src/features/leagues/components/league-hall-section.tsx` — bordered card → one-sheet content block (period chip + podium + extracted winners).
- `src/app/[locale]/hall-of-fame/page.tsx` — tiny text header → warm hero + continuous `styles.section` sheet.
- `src/features/leagues/__tests__/award-podium.test.tsx` — extend for podium structure (gold centered).
- `src/features/account/components/achievement-highlights.tsx` — top-student badge respects `a.tier` (gold/silver/bronze) with a Crown for gold.
- `src/features/campus-energy/components/mapbox-style.ts` — refactor tier paints onto the palette module; add tier-colored building labels for award winners.
- `src/features/campus-energy/__tests__/mapbox-style.test.ts` — add a label-tier assertion (keep existing assertions green).
- `src/features/estate/components/estate-game-client.tsx` — granted winner emblem gets a distinct "awarded" inventory card (tier ring + label) instead of a plain free item.
- `src/i18n/messages/ko.ts`, `src/i18n/messages/en.ts` — add `estate.inventory.awarded` (both locales).

---

## Task 1: Pure tier-palette module (foundation)

Single source of truth for tier colors so the map, podium, badges, and emblem stop duplicating hardcoded hexes.

**Files:**
- Create: `src/features/leagues/domain/award-tier.ts`
- Test: `src/features/leagues/__tests__/award-tier.test.ts`

**Interfaces:**
- Consumes: `AwardTier` from `src/features/leagues/domain/types.ts` (`"gold" | "silver" | "bronze"`).
- Produces:
  - `TierPalette = { fill: string; soft: string; text: string; outline: string }`
  - `TIER_PALETTE: Record<AwardTier, TierPalette>`
  - `PODIUM_VISUAL_ORDER: readonly AwardTier[]` = `["silver", "gold", "bronze"]`
  - `TIER_PEDESTAL_REM: Record<AwardTier, number>` = `{ gold: 6.5, silver: 5, bronze: 4 }`

- [ ] **Step 1: Write the failing test**

Create `src/features/leagues/__tests__/award-tier.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  PODIUM_VISUAL_ORDER,
  TIER_PALETTE,
  TIER_PEDESTAL_REM,
} from "../domain/award-tier";

describe("award tier palette", () => {
  it("freezes the canonical tier fill hexes", () => {
    expect(TIER_PALETTE.gold.fill).toBe("#f5c518");
    expect(TIER_PALETTE.silver.fill).toBe("#c3cad3");
    expect(TIER_PALETTE.bronze.fill).toBe("#cd7f32");
  });

  it("exposes soft/text/outline tones for every tier", () => {
    for (const tier of ["gold", "silver", "bronze"] as const) {
      expect(TIER_PALETTE[tier].soft).toMatch(/^#/);
      expect(TIER_PALETTE[tier].text).toMatch(/^#/);
      expect(TIER_PALETTE[tier].outline).toMatch(/^#/);
    }
  });

  it("orders the podium silver, gold (center), bronze", () => {
    expect(PODIUM_VISUAL_ORDER).toEqual(["silver", "gold", "bronze"]);
  });

  it("makes the gold pedestal the tallest", () => {
    expect(TIER_PEDESTAL_REM.gold).toBeGreaterThan(TIER_PEDESTAL_REM.silver);
    expect(TIER_PEDESTAL_REM.silver).toBeGreaterThan(TIER_PEDESTAL_REM.bronze);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/leagues/__tests__/award-tier.test.ts`
Expected: FAIL — `Cannot find module '../domain/award-tier'`.

- [ ] **Step 3: Write the module**

Create `src/features/leagues/domain/award-tier.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/leagues/__tests__/award-tier.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/leagues/domain/award-tier.ts src/features/leagues/__tests__/award-tier.test.ts
git commit -m "feat(leagues): add shared tier palette for award surfaces"
```

---

## Task 2: Hall of Fame CSS Module (hero + podium + winner structure)

Structure-only stylesheet. Tier colors are injected by components via inline custom properties, keeping this file tier-agnostic and DRY.

**Files:**
- Create: `src/features/leagues/components/league-hall.module.css`

**Interfaces:**
- Produces CSS classes consumed by Tasks 3–5: `.hero`, `.heroBloom`, `.podium`, `.slot`, `.crest`, `.crestGold`, `.slotName`, `.pedestal`, `.pedestalRank`, `.pedestalTier`, `.studentRow`, `.studentItem`, `.studentAvatar`, `.studentRankBadge`.
- The `.pedestal` reads two inline custom properties set by the podium: `--pedestal-h` (e.g. `6.5rem`) and `--tier` (a hex from `TIER_PALETTE`).

- [ ] **Step 1: Create the stylesheet**

Create `src/features/leagues/components/league-hall.module.css`:

```css
/*
 * Structure for the Hall of Fame. Lives under the page's profile-surface
 * `.surface` wrapper, so the warm garden --color-* / --honey tokens are
 * inherited. Tier colors arrive via inline --tier; this file stays tier-agnostic.
 */

/* Hero — mirrors the profile cover gradient, plus a celebratory gold bloom. */
.hero {
  position: relative;
  height: 8.5rem;
  background: linear-gradient(135deg, #0b5e3f 0%, #1f8a5d 48%, #6bbf93 100%);
  overflow: hidden;
}

.hero::after {
  /* soft top-right light bloom, same as profile-surface .cover */
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(75% 120% at 88% -25%, rgb(255 255 255 / 0.3), transparent 60%);
  pointer-events: none;
}

.heroBloom {
  /* warm gold glow rising from the bottom-center, behind the title */
  position: absolute;
  inset: 0;
  background: radial-gradient(58% 130% at 50% 125%, rgb(245 197 24 / 0.5), transparent 70%);
  pointer-events: none;
}

/* Podium — 3 columns, pedestals bottom-aligned so heights read as a 시상대. */
.podium {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: end;
  gap: 0.5rem;
}

.slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  text-align: center;
}

.crest {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 9999px;
  border: 2px solid;
}

.crestGold {
  box-shadow:
    0 0 0 4px rgb(245 197 24 / 0.18),
    0 8px 18px -8px rgb(245 197 24 / 0.75);
}

.slotName {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-ink);
}

.pedestal {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  width: 100%;
  height: var(--pedestal-h);
  margin-top: 0.2rem;
  border-radius: 12px 12px 0 0;
  border: 1px solid color-mix(in srgb, var(--tier) 45%, transparent);
  border-bottom: none;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--tier) 32%, #ffffff) 0%,
    color-mix(in srgb, var(--tier) 15%, #ffffff) 100%
  );
}

.pedestalRank {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
}

.pedestalTier {
  font-size: 0.6875rem;
  font-weight: 700;
}

/* Student winners — clean ranked rows with avatar + tier rank badge. */
.studentRow {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.studentItem {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.65rem;
  border-radius: 14px;
  background: var(--color-inset);
}

.studentRankBadge {
  display: grid;
  place-items: center;
  flex: none;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 800;
}

.studentAvatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 9999px;
  font-weight: 700;
  color: var(--color-on-accent);
  background: linear-gradient(135deg, #2f9e6b, #0b5e3f);
}
```

- [ ] **Step 2: Verify it compiles in the build graph (no test yet)**

This file has no standalone test (CSS Module). It is exercised when Tasks 3–5 import it; correctness is confirmed by `npm run build` at the end of Task 5. No commit on its own — commit it together with Task 3 (its first consumer) so the repo never has an unused, unreferenced module mid-history. (If your workflow requires a green tree per commit, that is satisfied: Task 3 imports it.)

> Note: this task produces no independently testable deliverable by itself; it is folded into Task 3's commit per the "fold scaffolding into the task whose deliverable needs it" rule.

---

## Task 3: Real 3-column podium (`AwardPodium`)

Replace the flat stacked list with a true 시상대: silver left, gold center & tallest with a Crown + glow, bronze right.

**Files:**
- Modify (full rewrite): `src/features/leagues/components/award-podium.tsx`
- Modify: `src/features/leagues/__tests__/award-podium.test.tsx`
- Also stage: `src/features/leagues/components/league-hall.module.css` (from Task 2)

**Interfaces:**
- Consumes: `TeamAward` from `domain/types.ts`; `TIER_PALETTE`, `PODIUM_VISUAL_ORDER`, `TIER_PEDESTAL_REM` from `domain/award-tier.ts`; `useI18n`, `formatNumber`, `interpolate`; `styles` from `league-hall.module.css`.
- Produces: `AwardPodium({ teams }: { teams: TeamAward[] })` — renders an `<ol>` with one `<li data-tier data-rank>` per present tier, in `PODIUM_VISUAL_ORDER`. Each `<li>` shows the team name and (when `metricValue !== null`) the per-capita average. Contract preserved for existing callers: exactly one `<li>` per team, names + avg rendered.

- [ ] **Step 1: Update the test to assert podium structure (write the failing expectation)**

Replace the body of the `describe("AwardPodium", …)` test in `src/features/leagues/__tests__/award-podium.test.tsx` with assertions for the new structure (the mock `useI18n` block at the top of the file stays as-is):

```tsx
describe("AwardPodium", () => {
  afterEach(() => document.body.replaceChildren());

  it("renders a podium with the champion centered and per-capita average", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => root.render(<AwardPodium teams={teams} />));

    const lis = Array.from(container.querySelectorAll("li"));
    expect(lis).toHaveLength(3);
    // Visual order is silver, gold (center), bronze.
    expect(lis.map((li) => li.getAttribute("data-tier"))).toEqual([
      "silver",
      "gold",
      "bronze",
    ]);
    expect(lis[1].getAttribute("data-rank")).toBe("1");

    const text = container.textContent ?? "";
    expect(text).toContain("학생지원팀");
    expect(text).toContain("인문대학");
    expect(text).toContain("공과대학");
    expect(text).toContain("1,200");

    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/leagues/__tests__/award-podium.test.tsx`
Expected: FAIL — current component has no `data-tier`/`data-rank` attributes (`expected null to equal "silver"`).

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `src/features/leagues/components/award-podium.tsx`:

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/leagues/__tests__/award-podium.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/features/leagues/components/award-podium.tsx src/features/leagues/components/league-hall.module.css src/features/leagues/__tests__/award-podium.test.tsx
git commit -m "feat(leagues): render team awards as a real 3-column podium"
```

---

## Task 4: Extract richer student winners (`StudentWinners`)

Replace the cramped uniform pills with ranked rows: an avatar initial, a tier-colored rank badge (1=gold, 2=silver, 3=bronze via `tierForRank`, neutral beyond), and the name.

**Files:**
- Create: `src/features/leagues/components/student-winners.tsx`
- Test: `src/features/leagues/__tests__/student-winners.test.tsx`
- Also stage with this task: nothing else (the section wires it in Task 5).

**Interfaces:**
- Consumes: `StudentAward` from `domain/types.ts`; `tierForRank` from `domain/standings.ts`; `TIER_PALETTE` from `domain/award-tier.ts`; `useI18n`; `styles` from `league-hall.module.css`.
- Produces: `StudentWinners({ students }: { students: StudentAward[] })` — returns `null` when empty; otherwise a titled `<ol>` with one `<li>` per student.

- [ ] **Step 1: Write the failing test**

Create `src/features/leagues/__tests__/student-winners.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentWinners } from "../components/student-winners";
import type { StudentAward } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      hallOfFame: { studentSectionTitle: "우수 학생", rankUnit: "위" },
    },
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const students: StudentAward[] = [
  { tier: "gold", rank: 1, userId: "it1", displayName: "대표 데모", metricValue: 1600 },
  { tier: "gold", rank: 2, userId: "g12", displayName: "게스트 12", metricValue: 1300 },
];

describe("StudentWinners", () => {
  afterEach(() => document.body.replaceChildren());

  it("renders one row per winner with names and ranks", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => root.render(<StudentWinners students={students} />));

    expect(container.querySelectorAll("li")).toHaveLength(2);
    const text = container.textContent ?? "";
    expect(text).toContain("대표 데모");
    expect(text).toContain("게스트 12");
    expect(text).toContain("우수 학생");

    await act(async () => root.unmount());
  });

  it("renders nothing when there are no winners", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => root.render(<StudentWinners students={[]} />));
    expect(container.querySelectorAll("li")).toHaveLength(0);

    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/leagues/__tests__/student-winners.test.tsx`
Expected: FAIL — `Cannot find module '../components/student-winners'`.

- [ ] **Step 3: Write the component**

Create `src/features/leagues/components/student-winners.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/i18n/client";
import { TIER_PALETTE } from "../domain/award-tier";
import { tierForRank } from "../domain/standings";
import type { StudentAward } from "../domain/types";
import styles from "./league-hall.module.css";

export function StudentWinners({ students }: { students: StudentAward[] }) {
  const { messages } = useI18n();
  const copy = messages.hallOfFame;

  if (students.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink">
        {copy.studentSectionTitle}
      </h3>
      <ol className={styles.studentRow}>
        {students.map((student) => {
          const tier = tierForRank(student.rank);
          const palette = tier ? TIER_PALETTE[tier] : null;
          const initial =
            student.displayName.trim().charAt(0).toUpperCase() || "?";
          return (
            <li key={student.userId} className={styles.studentItem}>
              <span
                className={styles.studentRankBadge}
                style={
                  (palette
                    ? { background: palette.soft, color: palette.text }
                    : {
                        background: "var(--color-surface-3)",
                        color: "var(--color-ink-subtle)",
                      }) as CSSProperties
                }
              >
                {student.rank}
              </span>
              <span className={styles.studentAvatar} aria-hidden="true">
                {initial}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                {student.displayName}
              </span>
              <span className="flex-none text-[11px] font-medium text-ink-subtle">
                {student.rank}
                {copy.rankUnit}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/leagues/__tests__/student-winners.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/leagues/components/student-winners.tsx src/features/leagues/__tests__/student-winners.test.tsx
git commit -m "feat(leagues): extract richer student-winners list"
```

---

## Task 5: Recompose the section + page into a warm one-sheet with a hero

Turn the bordered-card stack into a continuous `profile-surface` sheet (like `/me`) led by a gold-accented hero, and wire the section to the new podium + winners.

**Files:**
- Modify (full rewrite): `src/features/leagues/components/league-hall-section.tsx`
- Modify (full rewrite): `src/app/[locale]/hall-of-fame/page.tsx`
- Verify (no change expected): `src/features/leagues/__tests__/league-hall-section.test.tsx`

**Interfaces:**
- `LeagueHallSection({ league, awards })` consumes `FinalizedLeague`, `LeagueAwards`, `useI18n`, `interpolate`, `AwardPodium`, `StudentWinners`. Produces a `<section>` content block (no border/card) with a period chip, podium, and winners — intended to sit inside a `styles.section` divider supplied by the page.
- The page consumes `styles` (`profile-surface.module.css`: `.surface`, `.sheet`, `.section`) and `leagueStyles` (`league-hall.module.css`: `.hero`, `.heroBloom`), plus existing loaders/`getMessages`. No data-flow change.

- [ ] **Step 1: Confirm the existing section test still describes valid behavior**

Run: `npx vitest run src/features/leagues/__tests__/league-hall-section.test.tsx`
Expected: PASS today (baseline). We will re-run after the rewrite; it asserts only that the league name, podium team, and student names render as text — all still true after recomposition, and the mock `useI18n` already provides `teamSectionTitle`, `studentSectionTitle`, `tier*`, `rankUnit`, `avgPointsLabel`, `periodFormat`.

- [ ] **Step 2: Rewrite the section**

Replace the entire contents of `src/features/leagues/components/league-hall-section.tsx`:

```tsx
"use client";

import { CalendarRange } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { interpolate } from "@/i18n/interpolate";
import type { FinalizedLeague, LeagueAwards } from "../domain/types";
import { AwardPodium } from "./award-podium";
import { StudentWinners } from "./student-winners";

function shortDate(locale: string, iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
  }).format(date);
}

export function LeagueHallSection({
  league,
  awards,
}: {
  league: FinalizedLeague;
  awards: LeagueAwards;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.hallOfFame;

  return (
    <section className="space-y-4">
      <header className="space-y-1.5">
        <h2 className="text-base font-bold text-ink">{league.name}</h2>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-ink-subtle">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
          {interpolate(copy.periodFormat, {
            start: shortDate(locale, league.startsAt),
            end: shortDate(locale, league.endsAt),
          })}
        </p>
      </header>

      <AwardPodium teams={awards.teams} />
      <StudentWinners students={awards.students} />
    </section>
  );
}
```

- [ ] **Step 3: Rewrite the page**

Replace the entire contents of `src/app/[locale]/hall-of-fame/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { LeagueHallSection } from "@/features/leagues/components/league-hall-section";
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/account/data/account-dal";
import {
  getFinalizedLeagues,
  getLeagueAwards,
} from "@/features/leagues/data/leagues-dal";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import styles from "@/features/account/components/profile-surface.module.css";
import leagueStyles from "@/features/leagues/components/league-hall.module.css";

type HallOfFameProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: HallOfFameProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);
  return { title: messages.hallOfFame.title };
}

export default async function HallOfFamePage({ params }: HallOfFameProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/hall-of-fame`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const [messages, leagues] = await Promise.all([
    getMessages(locale),
    getFinalizedLeagues(),
  ]);

  const sections = await Promise.all(
    leagues.map(async (league) => ({
      league,
      awards: await getLeagueAwards(league.id),
    })),
  );

  const copy = messages.hallOfFame;

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className={styles.surface}>
        <div className={styles.sheet}>
          <div className={leagueStyles.hero}>
            <div className={leagueStyles.heroBloom} />
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
              <Link
                href={`/${locale}`}
                aria-label={copy.back}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-3 p-4">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-white/20 text-white backdrop-blur-sm">
                <Trophy className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-white">{copy.title}</h1>
                <p className="truncate text-xs text-white/85">{copy.subtitle}</p>
              </div>
            </div>
          </div>

          {sections.length === 0 ? (
            <div className={styles.section}>
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-3 text-ink-subtle">
                  <Trophy className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-ink">{copy.empty}</p>
                <p className="text-xs text-ink-subtle">{copy.emptyHint}</p>
              </div>
            </div>
          ) : (
            sections.map(({ league, awards }) => (
              <div key={league.id} className={styles.section}>
                <LeagueHallSection league={league} awards={awards} />
              </div>
            ))
          )}
        </div>
      </main>
    </CampusEnergyProviders>
  );
}
```

- [ ] **Step 4: Run the section test + typecheck**

Run: `npx vitest run src/features/leagues/__tests__/league-hall-section.test.tsx`
Expected: PASS (1 test) — names, podium team, and students still render as text.

Run: `npx tsc --noEmit`
Expected: no NEW errors in the touched files (pre-existing unrelated test-type errors, if any, may remain — confirm none reference `hall-of-fame/page.tsx`, `league-hall-section.tsx`, `award-podium.tsx`, `student-winners.tsx`, `award-tier.ts`, or `league-hall.module.css`).

- [ ] **Step 5: Build to confirm the CSS Modules + page compile**

Run: `npm run build`
Expected: success; route `/[locale]/hall-of-fame` present in the output (Dynamic ƒ, like the other auth-gated routes).

- [ ] **Step 6: Commit**

```bash
git add src/features/leagues/components/league-hall-section.tsx "src/app/[locale]/hall-of-fame/page.tsx"
git commit -m "feat(leagues): rebuild hall of fame as a warm one-sheet with hero"
```

---

## Task 6: `/me` top-student badge respects the award tier

The badge already receives `a.tier` but always renders gold. Make it tier-accurate (gold/silver/bronze) with a Crown for gold and a soft glow, using the shared palette.

**Files:**
- Modify (full rewrite): `src/features/account/components/achievement-highlights.tsx`
- Test: `src/features/account/__tests__/achievement-highlights.test.tsx` (new)

**Interfaces:**
- Consumes: `Achievement`, `AchievementKey` from `account/domain/achievements.ts` (note `Achievement.tier?: AwardTier`); `TIER_PALETTE` from `leagues/domain/award-tier.ts`; `useI18n`; `styles` from `profile-surface.module.css`; lucide `Award`, `Crown`, `Flame`, `Leaf`, `Lock`, `ShieldCheck`, `Sparkles`, `Star`.
- Produces: `AchievementHighlights({ achievements })` — unchanged signature; only the top-student visual differs.

- [ ] **Step 1: Write the failing test**

Create `src/features/account/__tests__/achievement-highlights.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AchievementHighlights } from "../components/achievement-highlights";
import type { Achievement } from "../domain/achievements";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      me: {
        achievements: {
          title: "성취",
          campusSaver: "캠퍼스 세이버",
          energyHero: "에너지 히어로",
          gridGuardian: "그리드 가디언",
          streak7: "7일 연속",
          checkIn10: "인증 10회",
          topStudent: "최우수 학생",
          lockedHint: "곧 공개",
        },
      },
    },
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function render(achievements: Achievement[]) {
  const container = document.createElement("div");
  const root: Root = createRoot(container);
  document.body.append(container);
  return { container, root };
}

describe("AchievementHighlights top-student badge", () => {
  afterEach(() => document.body.replaceChildren());

  const base: Achievement[] = [
    { key: "campus-saver", earned: true, locked: false },
  ];

  it("paints an earned gold top-student badge in gold tone", async () => {
    const { container, root } = render([
      ...base,
      { key: "top-student", earned: true, locked: false, tier: "gold" },
    ]);
    await act(async () =>
      root.render(
        <AchievementHighlights
          achievements={[
            ...base,
            { key: "top-student", earned: true, locked: false, tier: "gold" },
          ]}
        />,
      ),
    );
    const badge = container.querySelector('[data-achievement="top-student"]');
    expect(badge).not.toBeNull();
    expect(badge?.getAttribute("data-tier")).toBe("gold");
    await act(async () => root.unmount());
  });

  it("keeps a locked top-student slot when not earned", async () => {
    const { container, root } = render(base);
    await act(async () =>
      root.render(
        <AchievementHighlights
          achievements={[
            ...base,
            { key: "top-student", earned: false, locked: true },
          ]}
        />,
      ),
    );
    const badge = container.querySelector('[data-achievement="top-student"]');
    expect(badge?.getAttribute("data-locked")).toBe("true");
    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/account/__tests__/achievement-highlights.test.tsx`
Expected: FAIL — no `data-achievement`/`data-tier`/`data-locked` attributes on the current component.

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `src/features/account/components/achievement-highlights.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import {
  Award,
  Crown,
  Flame,
  Leaf,
  Lock,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { useI18n } from "@/i18n/client";
import { TIER_PALETTE } from "@/features/leagues/domain/award-tier";
import type { Achievement, AchievementKey } from "../domain/achievements";
import styles from "./profile-surface.module.css";

const ICONS: Record<AchievementKey, typeof Leaf> = {
  "campus-saver": Leaf,
  "energy-hero": Sparkles,
  "grid-guardian": ShieldCheck,
  "streak-7": Flame,
  "check-in-10": Star,
  "top-student": Award,
};

export function AchievementHighlights({
  achievements,
}: {
  achievements: Achievement[];
}) {
  const { messages } = useI18n();
  const copy = messages.me.achievements;
  const labels: Record<AchievementKey, string> = {
    "campus-saver": copy.campusSaver,
    "energy-hero": copy.energyHero,
    "grid-guardian": copy.gridGuardian,
    "streak-7": copy.streak7,
    "check-in-10": copy.checkIn10,
    "top-student": copy.topStudent,
  };

  return (
    <section className={styles.section}>
      <h2 className="text-sm font-semibold text-ink">{copy.title}</h2>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {achievements.map((a) => {
          const active = a.earned && !a.locked;
          const earnedTopStudent =
            a.key === "top-student" && active ? (a.tier ?? "gold") : null;
          const palette = earnedTopStudent
            ? TIER_PALETTE[earnedTopStudent]
            : null;

          const Icon = a.locked
            ? Lock
            : earnedTopStudent === "gold"
              ? Crown
              : ICONS[a.key];

          // Non-tier ring classes; tier badges use inline style instead.
          const ring = a.locked
            ? "border-dashed border-[var(--honey)] bg-[var(--honey-soft)] text-[var(--honey-strong)]"
            : palette
              ? ""
              : active
                ? "border-saving bg-saving-soft text-saving"
                : "border-line bg-inset text-ink-subtle";

          const ringStyle: CSSProperties | undefined = palette
            ? {
                borderColor: palette.fill,
                background: palette.soft,
                color: palette.text,
                ...(earnedTopStudent === "gold"
                  ? { boxShadow: "0 0 0 4px rgb(245 197 24 / 0.16)" }
                  : {}),
              }
            : undefined;

          return (
            <li
              key={a.key}
              data-achievement={a.key}
              data-tier={earnedTopStudent ?? undefined}
              data-locked={a.locked ? "true" : undefined}
              className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={`grid h-16 w-16 place-items-center rounded-full border-2 ${ring}`}
                style={ringStyle}
                aria-hidden="true"
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="break-keep text-center text-[11px] leading-tight text-ink-muted">
                {labels[a.key]}
              </span>
              {a.locked ? (
                <span className="text-[10px] font-medium text-[var(--honey-strong)]">
                  {copy.lockedHint}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/account/__tests__/achievement-highlights.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/account/components/achievement-highlights.tsx src/features/account/__tests__/achievement-highlights.test.tsx
git commit -m "feat(account): tier-accurate top-student badge on /me"
```

---

## Task 7: Map building award effect — palette refactor + tier-colored labels

Consolidate the map's tier hexes onto the shared palette and make award-winning buildings' name labels render in their tier color with a stronger halo (the extrusion already tints; the label was plain).

**Files:**
- Modify: `src/features/campus-energy/components/mapbox-style.ts`
- Modify: `src/features/campus-energy/__tests__/mapbox-style.test.ts`

**Interfaces:**
- Consumes: `TIER_PALETTE` from `leagues/domain/award-tier.ts` (pure module — safe to import into this Mapbox style module, which the node test loads).
- Produces: unchanged exports. `ENERGY_SUBJECT_LABEL_PAINT_DARK` / `_LIGHT` gain an `awardTier` `match` on `text-color`; extrusion/outline tier colors now reference `TIER_PALETTE` (identical output hexes, so existing assertions hold).

- [ ] **Step 1: Add the label-tier assertion (failing)**

In `src/features/campus-energy/__tests__/mapbox-style.test.ts`, extend the imports and add a test inside the existing `describe("award tier paint", …)` block. Update the import line:

```ts
import {
  ENERGY_SUBJECT_EXTRUSION_PAINT,
  ENERGY_SUBJECT_EXTRUSION_PAINT_LIGHT,
  ENERGY_SUBJECT_LABEL_PAINT_DARK,
  ENERGY_SUBJECT_LABEL_PAINT_LIGHT,
  ENERGY_SUBJECT_OUTLINE_PAINT,
  ENERGY_SUBJECT_POLYGON_HIT_PAINT,
} from "../components/mapbox-style";
```

Then add (assert per-paint — DARK uses bright gold, LIGHT uses dark gold, so they differ):

```ts
  it("colors award-winning building labels by tier", () => {
    const dark = JSON.stringify(ENERGY_SUBJECT_LABEL_PAINT_DARK["text-color"]);
    const light = JSON.stringify(ENERGY_SUBJECT_LABEL_PAINT_LIGHT["text-color"]);
    expect(dark).toContain("awardTier");
    expect(light).toContain("awardTier");
    expect(dark).toContain("#f5c518"); // bright gold on the dark basemap
    expect(light).toContain("#a07a00"); // darker gold on the light basemap
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/campus-energy/__tests__/mapbox-style.test.ts`
Expected: FAIL — label paints currently have a static string `text-color`, no `awardTier`.

- [ ] **Step 3: Refactor `mapbox-style.ts`**

At the top of `src/features/campus-energy/components/mapbox-style.ts`, add the import:

```ts
import { TIER_PALETTE } from "@/features/leagues/domain/award-tier";
```

Replace the **`fill-extrusion-color`** array in BOTH `ENERGY_SUBJECT_EXTRUSION_PAINT` and `ENERGY_SUBJECT_EXTRUSION_PAINT_LIGHT` with the palette-driven form (the literal fallback `#64748b` dark / `#a8b3c4` light stays per-object):

```ts
    "fill-extrusion-color": [
      "match",
      ["coalesce", ["get", "awardTier"], ""],
      "gold",
      TIER_PALETTE.gold.fill,
      "silver",
      TIER_PALETTE.silver.fill,
      "bronze",
      TIER_PALETTE.bronze.fill,
      [
        "match",
        ["get", "status"],
        "saving",
        "#10b981",
        "overuse",
        "#f43f5e",
        "#64748b", // <- keep "#a8b3c4" in the _LIGHT object
      ],
    ],
```

Replace the **`line-color`** array in `ENERGY_SUBJECT_OUTLINE_PAINT`:

```ts
  "line-color": [
    "match",
    ["coalesce", ["get", "awardTier"], ""],
    "gold",
    TIER_PALETTE.gold.outline,
    "silver",
    TIER_PALETTE.silver.outline,
    "bronze",
    TIER_PALETTE.bronze.outline,
    [
      "match",
      ["get", "status"],
      "saving",
      "#10b981",
      "overuse",
      "#e11d48",
      "#475569",
    ],
  ],
```

Replace the two label paint objects so `text-color` reacts to `awardTier` (bright tiers on the dark map; darker tiers on the light map), and award winners get a slightly wider halo:

```ts
// Light text + dark halo reads on the dark basemap; flipped for the light one.
export const ENERGY_SUBJECT_LABEL_PAINT_DARK: SymbolLayerSpecification["paint"] =
  {
    "text-color": [
      "match",
      ["coalesce", ["get", "awardTier"], ""],
      "gold",
      TIER_PALETTE.gold.fill,
      "silver",
      "#e2e8f0",
      "bronze",
      "#e9b386",
      "#f8fafc",
    ],
    "text-halo-color": "rgba(2, 6, 23, 0.85)",
    "text-halo-width": ["case", ["has", "awardTier"], 1.8, 1.4],
    "text-halo-blur": 0.4,
  };

export const ENERGY_SUBJECT_LABEL_PAINT_LIGHT: SymbolLayerSpecification["paint"] =
  {
    "text-color": [
      "match",
      ["coalesce", ["get", "awardTier"], ""],
      "gold",
      TIER_PALETTE.gold.text,
      "silver",
      TIER_PALETTE.silver.text,
      "bronze",
      TIER_PALETTE.bronze.text,
      "#1e293b",
    ],
    "text-halo-color": "rgba(255, 255, 255, 0.9)",
    "text-halo-width": ["case", ["has", "awardTier"], 1.8, 1.4],
    "text-halo-blur": 0.4,
  };
```

> Note: the DARK label uses `TIER_PALETTE.gold.fill` (`#f5c518`, bright) and the LIGHT label uses `TIER_PALETTE.gold.text` (`#a07a00`, darker) — that asymmetry is intentional (each tone must read against its basemap), which is why the Step-1 assertion checks each paint separately.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/campus-energy/__tests__/mapbox-style.test.ts`
Expected: PASS — all blocks green, including the pre-existing style-spec `validate` test (the new `match`/`case` expressions are valid Mapbox expressions) and the frozen extrusion assertions (`#f5c518`/`#c3cad3`/`#cd7f32`, opacity `0.86`, height expr).

- [ ] **Step 5: Commit**

```bash
git add src/features/campus-energy/components/mapbox-style.ts src/features/campus-energy/__tests__/mapbox-style.test.ts
git commit -m "feat(map): tier-color award-winning building labels via shared palette"
```

---

## Task 8: Estate winner emblem — distinct "awarded" inventory card

A granted winner emblem currently appears in the estate inventory as an ordinary item (`수량 1 · 1x1`). Give it a tier ring and an "수여됨/Awarded" label so it reads as a prestige award, not a free item.

**Files:**
- Modify: `src/i18n/messages/ko.ts` (add `estate.inventory.awarded`)
- Modify: `src/i18n/messages/en.ts` (add `estate.inventory.awarded`)
- Modify: `src/features/estate/components/estate-game-client.tsx` (the `InventoryPanel` entry rendering + imports)

**Interfaces:**
- Consumes: `AWARD_EMBLEM_PREFIX` from `estate/domain/award-emblem.ts`; `TIER_PALETTE` from `leagues/domain/award-tier.ts`; `AwardTier` from `leagues/domain/types.ts`; existing `EstateMessages` (now with `inventory.awarded`).
- Produces: no exported API change; `InventoryPanel` renders award emblems distinctly.

- [ ] **Step 1: Add the i18n key (both locales)**

In `src/i18n/messages/ko.ts`, inside the `estate.inventory` object (which currently has `empty`, `quantity`, `paint`, `place`), add:

```ts
      awarded: "수여된 우승 휘장",
```

In `src/i18n/messages/en.ts`, the matching `estate.inventory` object, add:

```ts
      awarded: "Awarded winner emblem",
```

- [ ] **Step 2: Run the i18n symmetry test to verify the key is consistent**

Run: `npx vitest run src/i18n/__tests__`
Expected: PASS — adding the key to both locales keeps `koMessages`/`enMessages` symmetric (had this been one-sided, the symmetry test would fail). This is the TDD signal for the i18n change.

- [ ] **Step 3: Extend the estate-game-client imports**

In `src/features/estate/components/estate-game-client.tsx`, extend the existing award-emblem import to also pull the prefix:

```ts
import {
  applyEmblemGrant,
  awardEmblemDefinitionById,
  AWARD_EMBLEM_PREFIX,
} from "../domain/award-emblem";
```

Add (near the other `@/features/...` imports):

```ts
import { TIER_PALETTE } from "@/features/leagues/domain/award-tier";
import type { AwardTier } from "@/features/leagues/domain/types";
```

- [ ] **Step 4: Render award emblems distinctly in `InventoryPanel`**

In the `InventoryPanel` function, replace the `entries.map(...)` card block (currently rendering each item with a `${styles.card} flex items-center gap-3 rounded-2xl p-2.5` wrapper and a `${styles.subtle} text-xs` quantity line) with this tier-aware version:

```tsx
      {entries.map(({ definition, quantity }) => {
        const tier = definition.id.startsWith(AWARD_EMBLEM_PREFIX)
          ? (definition.id.slice(AWARD_EMBLEM_PREFIX.length) as AwardTier)
          : null;
        const palette = tier ? TIER_PALETTE[tier] : null;
        return (
          <div
            key={definition.id}
            className={`${styles.card} flex items-center gap-3 rounded-2xl p-2.5`}
            style={
              palette
                ? { boxShadow: `inset 0 0 0 1.5px ${palette.fill}` }
                : undefined
            }
          >
            <ItemThumb definition={definition} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">
                {getItemName(definition, copy)}
              </h2>
              {palette ? (
                <p
                  className="text-xs font-semibold"
                  style={{ color: palette.text }}
                >
                  {copy.inventory.awarded}
                </p>
              ) : (
                <p className={`${styles.subtle} text-xs`}>
                  {copy.inventory.quantity} {quantity} ·{" "}
                  {definition.footprintWidth}x{definition.footprintHeight}
                </p>
              )}
            </div>
            <button
              type="button"
              className={`${styles.primaryBtn} inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold`}
              onClick={() => onUseItem(definition.id)}
            >
              {definition.placementRule === "ground" ? (
                <Paintbrush size={14} aria-hidden="true" />
              ) : (
                <Package size={14} aria-hidden="true" />
              )}
              {definition.placementRule === "ground"
                ? copy.inventory.paint
                : copy.inventory.place}
            </button>
          </div>
        );
      })}
```

- [ ] **Step 5: Run the estate suite + typecheck (no standalone test for the internal panel)**

`InventoryPanel` is a private function (not exported), and the estate full-bleed canvas route cannot be screenshotted in this environment (documented limitation). Verification is the existing estate tests staying green plus the build:

Run: `npx vitest run src/features/estate/__tests__`
Expected: PASS — no estate test feeds an award emblem into the inventory fixture, so the new branch is inert for them; all current estate tests stay green.

Run: `npx tsc --noEmit`
Expected: no new errors in `estate-game-client.tsx` (the `AwardTier` cast and `TIER_PALETTE` access typecheck).

- [ ] **Step 6: Commit**

```bash
git add src/i18n/messages/ko.ts src/i18n/messages/en.ts src/features/estate/components/estate-game-client.tsx
git commit -m "feat(estate): show winner emblem as an awarded inventory card"
```

---

## Task 9: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npm run test`
Expected: PASS — all files green, including the 6 new/changed test files (`award-tier`, `award-podium`, `student-winners`, `league-hall-section`, `achievement-highlights`, `mapbox-style`) and the i18n symmetry suite. Note the new count vs. the previous baseline (was 340 at the last main merge; this plan adds tests, so expect a higher total).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: `0 errors`. The repo has 2 long-standing `game-preview.tsx` warnings — those, and only those, may remain. No new warnings/errors in touched files.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: success; `/[locale]/hall-of-fame` builds (Dynamic). No type or CSS Module resolution errors.

- [ ] **Step 4: Report verification honestly**

Summarize what was proven by automation (tests/lint/build) and state plainly that pixel-level confirmation of the Hall of Fame hero/podium, the map award labels, and the estate emblem card is pending the user's own dev server — this environment has no app screenshot and the estate canvas route hangs the preview tool. Do not claim visual verification that was not performed.

- [ ] **Step 5 (optional): User visual review hook**

If the user is running a dev server, point them to `/{locale}/hall-of-fame` (logged in; the representative demo `demo@cems.kr` is the latest student gold winner and student-services is gold, so the podium + winners are populated), the main map (the `yu-b04` building label should read in gold), `/{locale}/me` (gold top-student badge), and the `yu-b04` estate inventory (gold emblem card). Iterate on spacing/tone from their feedback.

---

## Self-Review

**1. Spec coverage** (user ask: "raise league page design quality like the real project; clean up components if needed"; chosen scope = Hall of Fame + all 4 surfaces; real podium; warm garden + gold):
- Hall of Fame redesign → Tasks 2–5 (hero, one-sheet, podium, winners). ✔
- "실제 우리 프로젝트처럼" quality bar = `/me` `profile-surface` reuse → Tasks 5 (page reuses `.surface`/`.sheet`/`.section`) + 2. ✔
- Real 3-column podium (chosen) → Task 3. ✔
- Warm garden + gold accents (chosen) → Tasks 2 (hero gold bloom, palette-driven pedestals) + 1 (palette). ✔
- "컴포넌트 구성도 깔끔하게" = component cleanup → Task 1 (dedupe tier hexes into one module), Task 4 (extract `StudentWinners`), Task 5 (card→one-sheet). ✔
- All league surfaces (chosen scope): map → Task 7; `/me` badge → Task 6; estate emblem → Task 8; Hall of Fame → Tasks 2–5. ✔

**2. Placeholder scan:** No `TBD`/`later`/"handle edge cases"/"similar to". Every code step shows full file content or a precise, context-anchored replacement block. Empty/missing-tier states are handled (`StudentWinners` returns `null`; podium filters absent tiers; page renders an empty state). ✔

**3. Type consistency:**
- `TIER_PALETTE`/`PODIUM_VISUAL_ORDER`/`TIER_PEDESTAL_REM` defined in Task 1 and consumed with those exact names in Tasks 3, 4, 6, 7, 8. ✔
- `tierForRank` (existing, `standings.ts`) used in Task 4 — confirmed exported. ✔
- `AwardTier` imported from `leagues/domain/types` in Tasks 7/8; `Achievement.tier?: AwardTier` already exists (Task 6 reads it). ✔
- `AWARD_EMBLEM_PREFIX` already exported from `award-emblem.ts` (Task 8 adds it to the existing import). ✔
- `EstateMessages.inventory.awarded` added in Task 8 Step 1 before it is read in Step 4. ✔
- Frozen hexes: `TIER_PALETTE.*.fill` = `#f5c518`/`#c3cad3`/`#cd7f32`, matching the `mapbox-style.test.ts` assertions kept in Task 7. ✔
- Custom CSS properties (`--pedestal-h`, `--tier`) are set inline (Task 3) and read by `.pedestal` (Task 2); inline objects are cast `as CSSProperties` for TS safety. ✔

One self-correction folded in: Task 7's label assertion is per-paint (DARK contains `#f5c518`, LIGHT contains `#a07a00`) — the naive "both contain `#f5c518`" loop would be false for the LIGHT object; the corrected assertion is the one to use.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-29-league-hall-of-fame-design-quality.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
