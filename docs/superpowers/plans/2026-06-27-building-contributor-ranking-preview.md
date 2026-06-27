# Building Contributor Ranking Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an admin clicks a building on the main map, the building popup gains a segmented toggle ("에너지 진단 ⇄ 기여 랭킹") that previews the top-N individual contributors (by cumulative points) of the group that operates that building, backed by real seeded Supabase data.

**Architecture:** Seed a roster of guest accounts (`auth.users` + `profiles` + `point_events`) into the live Supabase DB so buildings have real members. A SECURITY DEFINER RPC `get_subject_contributor_rankings(p_limit)` resolves each estate subject → owning group → top-N members ranked by summed `point_events.points`, exposing only a leaderboard-safe projection (display name + points + rank + `is_me`) to any authenticated caller. The home server component pre-fetches all subject rankings once and threads them down (`page.tsx → CampusEnergyApp → AdminMapView → BuildingPopup`). The popup adds local tab state and renders a new presentational `BuildingContributorRanking` component. All pure shaping and UI is TDD'd in Vitest; the DB layer is verified with SQL probes (the project's established pattern).

**Tech Stack:** Next.js 16 (App Router, server components), React 19 (client components), TypeScript, Tailwind CSS v4 (design tokens in `globals.css`), Supabase (Postgres + RLS + SECURITY DEFINER RPCs), Vitest + jsdom.

---

## Confirmed Design Decisions (from this session)

| Decision | Choice |
| --- | --- |
| Data source | **Real seeded Supabase guests** ("게스트 1, 2 …" so it looks like a real working system) — not synthetic client-only demo data. |
| Toggle UX | **Segmented toggle inside the building popup** (swaps the popup body). |
| Preview depth | **Top-N inline only** (N = 5). No separate full-ranking page (YAGNI). |
| Metric | **Cumulative points** (`sum(point_events.points)` per member — same metric as the group pool / `EstateContribution`). |

## Key Facts & Constraints (verified during exploration)

- The admin map renders **demo** buildings/energy (`localizedDemo.subjects`, `getDemoEnergyComparisons()`); only the current user's `account` data is real. Demo subject ids match the DB `estate_subjects.subject_id` values (`yu-e21`…`yu-e24`, `yu-c02`, `yu-b04`) — so rankings keyed by `subject_id` align with `selectedSubjectId`.
- Only **6 subjects** are mapped to owning groups in `estate_subjects` (4 → `engineering`, 1 → `humanities`, 1 → `student-services`). Buildings outside those 6 have no operating group, so their ranking tab shows a friendly empty state. The 4 engineering buildings share the engineering roster (contributions roll up to the group; this is truthful and documented).
- **RLS** normally restricts a user to their own group's profiles/point_events. The map lets any user click any building, so the ranking must come from a **SECURITY DEFINER RPC** — a deliberate, leaderboard-scoped widening that exposes only display name + points + rank (no email/handle/bio). This mirrors the project's existing authoritative RPCs (`claim_period_reward`, `save_estate`, …) and will produce the same benign Supabase advisor WARN.
- **Documented side effect:** seeding guest `point_events` increases the `getGroupPointPool` total for `engineering`/`humanities`/`student-services`. For `student-services` (the real test account `it@naver.com`, ~1,000,070 pts) the estate budget rises by the modest guest sum (~3,470). This is intentional ("looks real"); guest totals are kept far below the test account so `it@naver.com` stays rank 1 in its own building (`yu-b04`, 중앙도서관) and appears with the "나" highlight.
- i18n types auto-derive from `koMessages` (`src/i18n/messages/types.ts` → `WidenMessageValues<typeof koMessages>`), so adding keys to `ko.ts` + `en.ts` is sufficient; no manual type edits.
- Verification commands: `npm run test` (Vitest), `npm run lint` (ESLint), `npm run build`. Pre-existing baseline: ESLint reports exactly **2 `game-preview.tsx` warnings** (unrelated) and 0 errors.
- **Before editing the server component (`page.tsx`)**, per `AGENTS.md`, skim the relevant Next.js 16 data-fetching docs under `node_modules/next/dist/docs/` (this is "not the Next.js you know"). The change only adds one entry to an existing `Promise.all` in an async server component, so the surface is small.
- **DB application:** apply the two SQL migrations against the live Supabase project via the Supabase MCP (`apply_migration` for the RPC; `execute_sql` for the seed + probes), and record the SQL under `docs/superpowers/migrations/` — the established workflow.

## Demo Guest Roster (seed data)

All guests: `school_id` derived from `groups` (yeungnam), one `point_events` row each (`reason = 'seed:demo-contribution'`, `period_label = '2026-W26'`). Fixed UUIDs `a0000000-0000-4000-8000-0000000000NN` make the seed idempotent.

| UUID suffix | display_name | group_id | points |
| --- | --- | --- | --- |
| `…0001` | 게스트 1 | engineering | 1850 |
| `…0002` | 게스트 2 | engineering | 1420 |
| `…0003` | 게스트 3 | engineering | 1180 |
| `…0004` | 게스트 4 | engineering | 920 |
| `…0005` | 게스트 5 | engineering | 640 |
| `…0006` | 게스트 6 | engineering | 380 |
| `…0007` | 게스트 7 | humanities | 1560 |
| `…0008` | 게스트 8 | humanities | 1240 |
| `…0009` | 게스트 9 | humanities | 870 |
| `…0010` | 게스트 10 | humanities | 610 |
| `…0011` | 게스트 11 | humanities | 300 |
| `…0012` | 게스트 12 | student-services | 1320 |
| `…0013` | 게스트 13 | student-services | 980 |
| `…0014` | 게스트 14 | student-services | 720 |
| `…0015` | 게스트 15 | student-services | 450 |

## File Structure

**Create:**
- `src/features/account/domain/contributor-ranking.ts` — pure types (`ContributorRow`, `SubjectContributor`, `SubjectContributorRankings`) + `groupContributorRowsBySubject()` shaping.
- `src/features/account/__tests__/contributor-ranking.test.ts` — domain tests.
- `src/features/campus-energy/components/building-contributor-ranking.tsx` — presentational ranked list + empty state.
- `src/features/campus-energy/__tests__/building-contributor-ranking.test.tsx` — component tests.
- `src/features/campus-energy/__tests__/building-popup.test.tsx` — popup toggle tests.
- `docs/superpowers/migrations/2026-06-27-contributor-ranking-rpc.sql` — recorded RPC migration.
- `docs/superpowers/migrations/2026-06-27-seed-demo-guests.sql` — recorded guest seed.

**Modify:**
- `src/i18n/messages/ko.ts` — add `mapView.contributors` block.
- `src/i18n/messages/en.ts` — add matching `mapView.contributors` block.
- `src/features/account/data/account-dal.ts` — add `getSubjectContributorRankings()`.
- `src/features/campus-energy/components/building-popup.tsx` — segmented toggle + body swap + `contributors` prop.
- `src/features/campus-energy/components/admin-map-view.tsx` — `contributorRankings` prop → pass selected subject's list to popup.
- `src/features/campus-energy/components/campus-energy-app.tsx` — thread `contributorRankings` prop.
- `src/app/[locale]/page.tsx` — pre-fetch rankings, pass prop.

---

## Task 1: Domain — contributor ranking types + shaping

Pure, framework-free. No DB. This locks the data shape the rest of the feature imports.

**Files:**
- Create: `src/features/account/domain/contributor-ranking.ts`
- Test: `src/features/account/__tests__/contributor-ranking.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/account/__tests__/contributor-ranking.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  groupContributorRowsBySubject,
  type ContributorRow,
} from "../domain/contributor-ranking";

const row = (
  subjectId: string,
  userId: string,
  points: number,
  rank: number,
  isMe = false,
): ContributorRow => ({
  subject_id: subjectId,
  user_id: userId,
  display_name: `User ${userId}`,
  points,
  rank,
  is_me: isMe,
});

describe("groupContributorRowsBySubject", () => {
  it("groups rows by subject id", () => {
    const result = groupContributorRowsBySubject([
      row("yu-e21", "u1", 1850, 1),
      row("yu-e21", "u2", 1420, 2),
      row("yu-c02", "u3", 1560, 1),
    ]);
    expect(Object.keys(result).sort()).toEqual(["yu-c02", "yu-e21"]);
    expect(result["yu-e21"]).toHaveLength(2);
    expect(result["yu-c02"]).toHaveLength(1);
  });

  it("maps snake_case rows to camelCase contributors", () => {
    const grouped = groupContributorRowsBySubject([
      row("yu-b04", "me", 1320, 1, true),
    ]);
    expect(grouped["yu-b04"][0]).toEqual({
      userId: "me",
      displayName: "User me",
      points: 1320,
      rank: 1,
      isMe: true,
    });
  });

  it("orders each subject's contributors by ascending rank", () => {
    const result = groupContributorRowsBySubject([
      row("yu-e21", "u2", 1420, 2),
      row("yu-e21", "u1", 1850, 1),
      row("yu-e21", "u3", 1180, 3),
    ]);
    expect(result["yu-e21"].map((c) => c.userId)).toEqual(["u1", "u2", "u3"]);
  });

  it("returns an empty object when there are no rows", () => {
    expect(groupContributorRowsBySubject([])).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/account/__tests__/contributor-ranking.test.ts`
Expected: FAIL — `Cannot find module '../domain/contributor-ranking'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/account/domain/contributor-ranking.ts`:

```ts
/** Raw row shape returned by the get_subject_contributor_rankings RPC. */
export type ContributorRow = {
  subject_id: string;
  user_id: string;
  display_name: string;
  points: number;
  rank: number;
  is_me: boolean;
};

/** One contributor in a building's ranking preview. */
export type SubjectContributor = {
  userId: string;
  displayName: string;
  points: number;
  rank: number;
  isMe: boolean;
};

/** Map of estate subject id → its top-N contributors, ordered by rank. */
export type SubjectContributorRankings = Record<string, SubjectContributor[]>;

/**
 * Groups flat RPC rows into per-subject contributor lists and maps the
 * snake_case DB columns to camelCase. Each subject's list is sorted by
 * ascending rank so the UI can render it directly.
 */
export function groupContributorRowsBySubject(
  rows: readonly ContributorRow[],
): SubjectContributorRankings {
  const bySubject: SubjectContributorRankings = {};
  for (const row of rows) {
    const list = (bySubject[row.subject_id] ??= []);
    list.push({
      userId: row.user_id,
      displayName: row.display_name,
      points: row.points,
      rank: row.rank,
      isMe: row.is_me,
    });
  }
  for (const subjectId of Object.keys(bySubject)) {
    bySubject[subjectId].sort((a, b) => a.rank - b.rank);
  }
  return bySubject;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/account/__tests__/contributor-ranking.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/account/domain/contributor-ranking.ts src/features/account/__tests__/contributor-ranking.test.ts
git commit -m "feat(account): add subject contributor ranking domain types and shaping"
```

---

## Task 2: i18n — mapView.contributors keys

**Files:**
- Modify: `src/i18n/messages/ko.ts`
- Modify: `src/i18n/messages/en.ts`

- [ ] **Step 1: Add the Korean keys**

In `src/i18n/messages/ko.ts`, inside the `mapView` object, immediately **after** the `popup: { … }` block's closing `},` add:

```ts
    contributors: {
      tabEnergy: "에너지 진단",
      tabRanking: "기여 랭킹",
      title: "개인 기여 랭킹",
      subtitle: "누적 포인트 · 미리보기",
      pointsUnit: "P",
      you: "나",
      empty: "아직 등록된 기여자가 없어요",
      emptyHint: "이 건물을 운영하는 그룹의 기여자가 표시됩니다",
    },
```

- [ ] **Step 2: Add the matching English keys**

In `src/i18n/messages/en.ts`, inside the `mapView` object, immediately **after** the `popup: { … }` block's closing `},` add:

```ts
    contributors: {
      tabEnergy: "Energy",
      tabRanking: "Contributors",
      title: "Top contributors",
      subtitle: "By total points · preview",
      pointsUnit: "P",
      you: "You",
      empty: "No contributors registered yet",
      emptyHint: "Members of the group operating this building appear here",
    },
```

- [ ] **Step 3: Verify the types compile and the build still type-checks**

Run: `npx tsc --noEmit`
Expected: no **new** errors. (`Messages` now includes `mapView.contributors.*`. Pre-existing unrelated test-file `tsc` errors noted in earlier sessions may remain; do not introduce new ones in `ko.ts`/`en.ts`.)

- [ ] **Step 4: Commit**

```bash
git add src/i18n/messages/ko.ts src/i18n/messages/en.ts
git commit -m "feat(i18n): add map contributor ranking strings (ko/en)"
```

---

## Task 3: Component — BuildingContributorRanking

Presentational list (no data fetching). Uses confirmed design tokens: `bg-surface-3`, `bg-accent-soft`, `bg-accent`, `text-surface`, `text-ink`, `text-ink-subtle`. `formatNumber(locale, value)` is the existing helper used by the popup.

**Files:**
- Create: `src/features/campus-energy/components/building-contributor-ranking.tsx`
- Test: `src/features/campus-energy/__tests__/building-contributor-ranking.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/campus-energy/__tests__/building-contributor-ranking.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuildingContributorRanking } from "../components/building-contributor-ranking";
import type { SubjectContributor } from "@/features/account/domain/contributor-ranking";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      mapView: {
        contributors: {
          title: "개인 기여 랭킹",
          subtitle: "누적 포인트 · 미리보기",
          pointsUnit: "P",
          you: "나",
          empty: "아직 등록된 기여자가 없어요",
          emptyHint: "이 건물을 운영하는 그룹의 기여자가 표시됩니다",
        },
      },
    },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const contributors: SubjectContributor[] = [
  { userId: "u1", displayName: "게스트 1", points: 1850, rank: 1, isMe: false },
  { userId: "me", displayName: "나야나", points: 1320, rank: 2, isMe: true },
];

describe("BuildingContributorRanking", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("renders ranked contributors with points and a self highlight", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(<BuildingContributorRanking contributors={contributors} />),
    );

    const text = container.textContent ?? "";
    expect(text).toContain("게스트 1");
    expect(text).toContain("나야나");
    expect(text).toContain("1,850");
    expect(text).toContain("나"); // self chip label
    // two ranked rows
    expect(container.querySelectorAll("li")).toHaveLength(2);

    await act(async () => root.unmount());
  });

  it("renders an empty state when there are no contributors", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(<BuildingContributorRanking contributors={[]} />),
    );

    expect(container.textContent).toContain("아직 등록된 기여자가 없어요");
    expect(container.querySelectorAll("li")).toHaveLength(0);

    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/campus-energy/__tests__/building-contributor-ranking.test.tsx`
Expected: FAIL — cannot find module `../components/building-contributor-ranking`.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/campus-energy/components/building-contributor-ranking.tsx`:

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/campus-energy/__tests__/building-contributor-ranking.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/campus-energy/components/building-contributor-ranking.tsx src/features/campus-energy/__tests__/building-contributor-ranking.test.tsx
git commit -m "feat(map): add building contributor ranking list component"
```

---

## Task 4: Component — BuildingPopup segmented toggle

Add a two-segment control under the header. Default tab = `energy` (existing diagnosis). Switching to `ranking` swaps the middle body for `BuildingContributorRanking`. The "영지 이동" (open estate) CTA stays visible in both tabs. The tab resets to `energy` whenever the selected building changes (`subject.id`).

**Files:**
- Modify: `src/features/campus-energy/components/building-popup.tsx`
- Test: `src/features/campus-energy/__tests__/building-popup.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/campus-energy/__tests__/building-popup.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuildingPopup } from "../components/building-popup";
import type { BuildingDetail } from "../domain/building-detail";
import type { EnergyComparison, EnergySubject } from "../domain/types";
import type { SubjectContributor } from "@/features/account/domain/contributor-ranking";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      status: { saving: "절약", overuse: "과사용", neutral: "보통" },
      mapView: {
        popup: {
          realtimeUsage: "실시간 사용량",
          vsForecast: "예측 대비",
          hourlyTitle: "시간대별 사용량 · 오늘",
          nowReference: "{time} 기준",
          hourTick: "{hour}시",
          scale: "규모",
          area: "연면적",
          completion: "준공",
          close: "닫기",
          openEstate: "영지 이동",
          floorsValue: "{floors}층",
        },
        contributors: {
          tabEnergy: "에너지 진단",
          tabRanking: "기여 랭킹",
          title: "개인 기여 랭킹",
          subtitle: "누적 포인트 · 미리보기",
          pointsUnit: "P",
          you: "나",
          empty: "아직 등록된 기여자가 없어요",
          emptyHint: "이 건물을 운영하는 그룹의 기여자가 표시됩니다",
        },
      },
    },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const subject: EnergySubject = {
  id: "yu-e21",
  schoolId: "yu",
  campusId: "yu-main",
  type: "building",
  name: "공학관",
  shortName: "E21",
};

const comparison: EnergyComparison = {
  subjectId: "yu-e21",
  actualKwh: 650,
  forecastKwh: 812,
  periodLabel: "2026-06",
  deltaKwh: -162,
  savingsKwh: 162,
  overuseKwh: 0,
  savingsRate: 0.2,
  status: "saving",
};

const detail: BuildingDetail = {
  hourly: Array.from({ length: 24 }, () => 10),
  maxHourly: 10,
  floors: 5,
  footprintAreaM2: 1200,
  grossFloorAreaM2: 6000,
  completionYear: 2008,
};

const contributors: SubjectContributor[] = [
  { userId: "u1", displayName: "게스트 1", points: 1850, rank: 1, isMe: false },
  { userId: "me", displayName: "나야나", points: 1320, rank: 2, isMe: true },
];

function render(root: Root, contribs: SubjectContributor[] = contributors) {
  return root.render(
    <BuildingPopup
      subject={subject}
      comparison={comparison}
      detail={detail}
      campusName="영남대학교"
      contributors={contribs}
      onClose={() => {}}
    />,
  );
}

function findButtonByText(container: HTMLElement, label: string) {
  return [...container.querySelectorAll("button")].find((button) =>
    button.textContent?.includes(label),
  ) as HTMLButtonElement | undefined;
}

describe("BuildingPopup contributor toggle", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("shows energy diagnosis by default and switches to the ranking on toggle", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => render(root));

    // Energy tab active by default → realtime usage label is visible.
    expect(container.textContent).toContain("실시간 사용량");
    expect(container.textContent).not.toContain("나야나");

    const rankingTab = findButtonByText(container, "기여 랭킹");
    expect(rankingTab).toBeDefined();
    await act(async () => rankingTab!.click());

    // Ranking tab → contributors visible, energy diagnosis hidden.
    expect(container.textContent).toContain("나야나");
    expect(container.textContent).toContain("1,850");
    expect(container.textContent).toContain("나"); // self chip
    expect(container.textContent).not.toContain("실시간 사용량");

    await act(async () => root.unmount());
  });

  it("shows the empty state in the ranking tab when there are no contributors", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => render(root, []));
    const rankingTab = findButtonByText(container, "기여 랭킹");
    await act(async () => rankingTab!.click());

    expect(container.textContent).toContain("아직 등록된 기여자가 없어요");

    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/campus-energy/__tests__/building-popup.test.tsx`
Expected: FAIL — `BuildingPopup` does not accept a `contributors` prop / no tab control rendered (type error or assertion failure on the missing "기여 랭킹" button).

- [ ] **Step 3: Write the implementation**

Replace the entire contents of `src/features/campus-energy/components/building-popup.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { ArrowRight, Minus, TrendingDown, TrendingUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { SubjectContributor } from "@/features/account/domain/contributor-ranking";
import type { BuildingDetail } from "../domain/building-detail";
import type { EnergyComparison, EnergySubject } from "../domain/types";
import { BuildingContributorRanking } from "./building-contributor-ranking";
import { STATUS_COLOR } from "./status-color";

const HOUR_TICKS = [0, 6, 12, 18, 24];

type PopupTab = "energy" | "ranking";

type BuildingPopupProps = {
  subject: EnergySubject;
  comparison?: EnergyComparison;
  detail: BuildingDetail;
  campusName: string;
  contributors: SubjectContributor[];
  onClose: () => void;
};

export function BuildingPopup({
  subject,
  comparison,
  detail,
  campusName,
  contributors,
  onClose,
}: BuildingPopupProps) {
  const { locale, messages } = useI18n();
  const popup = messages.mapView.popup;
  const contributorsCopy = messages.mapView.contributors;
  const [nowHour, setNowHour] = useState(() => new Date().getHours());
  const [tab, setTab] = useState<PopupTab>("energy");

  useEffect(() => {
    const timer = setInterval(() => setNowHour(new Date().getHours()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Reset to the energy view whenever a different building is selected.
  useEffect(() => {
    setTab("energy");
  }, [subject.id]);

  const status = comparison?.status ?? "neutral";
  const { base: color, soft, bar } = STATUS_COLOR[status];
  const actual = comparison?.actualKwh ?? 0;
  const forecast = comparison?.forecastKwh ?? 0;
  const delta = comparison?.deltaKwh ?? 0;
  const positive = delta < 0; // actual below forecast = saving
  const ratePct = forecast > 0 ? Math.abs(delta / forecast) * 100 : 0;
  const deltaSign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  const deltaText = `${deltaSign}${formatNumber(locale, Math.abs(delta))}`;
  const estateHref = `/${locale}/subjects/${encodeURIComponent(
    subject.id,
  )}/estate`;
  const rateText =
    status === "neutral"
      ? messages.status.neutral
      : `${positive ? messages.status.saving : messages.status.overuse} ${ratePct.toFixed(1)}%`;
  const TrendIcon =
    status === "neutral" ? Minus : positive ? TrendingDown : TrendingUp;

  return (
    <div className="pointer-events-auto overflow-hidden rounded-2xl border border-line bg-surface shadow-pop animate-[cems-pop_0.22s_cubic-bezier(0.2,0.7,0.3,1)_both]">
      <div className="h-1" style={{ background: color }} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2.5 px-4 pt-3.5">
        <div className="min-w-0">
          <div className="truncate text-base font-bold tracking-tight text-ink">
            {subject.name}
          </div>
          <div className="mt-0.5 truncate text-xs text-ink-subtle">
            {campusName} · {subject.shortName}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={popup.close}
          className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-surface-3 text-ink-subtle transition hover:text-ink"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="px-4 pt-3">
        <div
          role="tablist"
          aria-label={subject.name}
          className="flex gap-1 rounded-xl bg-surface-3 p-1"
        >
          <TabButton
            active={tab === "energy"}
            onClick={() => setTab("energy")}
            label={contributorsCopy.tabEnergy}
          />
          <TabButton
            active={tab === "ranking"}
            onClick={() => setTab("ranking")}
            label={contributorsCopy.tabRanking}
          />
        </div>
      </div>

      <div className="px-4 pb-4 pt-3">
        {tab === "energy" ? (
          <>
            <div className="mb-3.5 flex items-end justify-between gap-3">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                  {popup.realtimeUsage}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[28px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
                    {formatNumber(locale, actual)}
                  </span>
                  <span className="text-[13px] font-semibold text-ink-subtle">
                    kWh
                  </span>
                </div>
              </div>
              <span
                className="inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold"
                style={{ background: soft, color }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: color }}
                  aria-hidden="true"
                />
                {messages.status[status]}
              </span>
            </div>

            <div
              className="mb-3.5 flex items-center gap-2 rounded-[10px] px-3 py-2.5"
              style={{ background: soft }}
            >
              <TrendIcon size={16} style={{ color }} aria-hidden="true" />
              <span className="text-[13px] text-ink-muted">
                {popup.vsForecast}
              </span>
              <span
                className="text-[13px] font-bold tabular-nums"
                style={{ color }}
              >
                {deltaText} kWh
              </span>
              <span className="ml-auto text-[13px] font-bold" style={{ color }}>
                {rateText}
              </span>
            </div>

            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wide text-ink-subtle">
                {popup.hourlyTitle}
              </span>
              <span className="text-[11px] text-ink-subtle">
                {interpolate(popup.nowReference, {
                  time: interpolate(popup.hourTick, { hour: nowHour }),
                })}
              </span>
            </div>
            <div
              className="flex h-[62px] items-end gap-px px-px"
              aria-hidden="true"
            >
              {detail.hourly.map((value, hour) => {
                const isNow = hour === nowHour;
                const heightPct = Math.max(
                  4,
                  Math.round((value / detail.maxHourly) * 100),
                );
                return (
                  <div
                    key={hour}
                    className="flex-1 rounded-t-[2px]"
                    style={{
                      height: `${heightPct}%`,
                      background: isNow ? color : bar,
                      boxShadow: isNow ? `0 0 0 1.5px ${color}` : undefined,
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-ink-subtle">
              {HOUR_TICKS.map((hour) => (
                <span key={hour}>{interpolate(popup.hourTick, { hour })}</span>
              ))}
            </div>

            <div className="my-3.5 h-px bg-line" />
            <div className="flex gap-2">
              <Stat
                value={interpolate(popup.floorsValue, { floors: detail.floors })}
                label={popup.scale}
              />
              <span className="w-px bg-line" aria-hidden="true" />
              <Stat
                value={`${formatNumber(locale, detail.grossFloorAreaM2)}㎡`}
                label={popup.area}
              />
              <span className="w-px bg-line" aria-hidden="true" />
              <Stat
                value={String(detail.completionYear)}
                label={popup.completion}
              />
            </div>
          </>
        ) : (
          <div className="pt-0.5">
            <BuildingContributorRanking contributors={contributors} />
          </div>
        )}

        <Link
          href={estateHref}
          className="mt-3.5 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line-strong bg-ink px-3 text-sm font-bold text-surface transition hover:bg-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span>{popup.openEstate}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-1.5 text-[13px] font-bold transition ${
        active
          ? "bg-surface text-ink shadow-sm"
          : "text-ink-subtle hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-[15px] font-bold text-ink tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-ink-subtle">{label}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/campus-energy/__tests__/building-popup.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/campus-energy/components/building-popup.tsx src/features/campus-energy/__tests__/building-popup.test.tsx
git commit -m "feat(map): add energy/contributor segmented toggle to building popup"
```

---

## Task 5: DB — contributor ranking RPC

Apply against the live Supabase project via the Supabase MCP, then record the SQL. No Vitest (DB layer).

**Files:**
- Create: `docs/superpowers/migrations/2026-06-27-contributor-ranking-rpc.sql`

- [ ] **Step 1: Write the migration SQL file**

Create `docs/superpowers/migrations/2026-06-27-contributor-ranking-rpc.sql`:

```sql
-- Building contributor ranking preview.
-- Leaderboard-scoped SECURITY DEFINER RPC: for each estate subject, returns the
-- top-N members (by cumulative point_events.points) of the group that operates
-- the subject. Exposes only a non-sensitive projection (display_name + points +
-- rank + is_me) to any authenticated caller, deliberately crossing the
-- same-group RLS boundary because the map lets a user click any building.

create or replace function public.get_subject_contributor_rankings(p_limit int default 5)
returns table (
  subject_id text,
  user_id uuid,
  display_name text,
  points int,
  rank int,
  is_me boolean
)
language sql
security definer
stable
set search_path = public
as $$
  with member_points as (
    select
      es.subject_id,
      p.id as user_id,
      p.display_name,
      coalesce(sum(pe.points), 0)::int as points
    from public.estate_subjects es
    join public.profiles p on p.group_id = es.owner_group_id
    left join public.point_events pe on pe.user_id = p.id
    group by es.subject_id, p.id, p.display_name
  ),
  ranked as (
    select
      mp.*,
      row_number() over (
        partition by mp.subject_id
        order by mp.points desc, mp.display_name asc
      )::int as rank
    from member_points mp
  )
  select
    r.subject_id,
    r.user_id,
    r.display_name,
    r.points,
    r.rank,
    (r.user_id = auth.uid()) as is_me
  from ranked r
  where r.rank <= p_limit
  order by r.subject_id, r.rank;
$$;

revoke all on function public.get_subject_contributor_rankings(int) from public;
grant execute on function public.get_subject_contributor_rankings(int) to authenticated;
revoke execute on function public.get_subject_contributor_rankings(int) from anon;

comment on function public.get_subject_contributor_rankings(int) is
  'Returns top-N members (display_name + total points + rank + is_me) of the group operating each estate subject, for any authenticated caller. SECURITY DEFINER deliberately exposes a name+points leaderboard projection across groups for the building contributor preview. EXECUTE revoked from anon.';
```

- [ ] **Step 2: Apply the migration via the Supabase MCP**

Use the Supabase MCP `apply_migration` tool against project ref `zvuqmagfpdyrrzyjntue` with name `contributor_ranking_rpc` and the SQL body above.
Expected: success, no error.

- [ ] **Step 3: Probe the RPC (before seeding — shape check)**

Use the Supabase MCP `execute_sql`:

```sql
select subject_id, count(*) as n
from public.get_subject_contributor_rankings(5)
group by subject_id
order by subject_id;
```

Expected: rows for `yu-b04`, `yu-c02`, `yu-e21`, `yu-e22`, `yu-e23`, `yu-e24`. Before seeding, counts reflect only existing real members (likely just `yu-b04` → 1 for `it@naver.com`; engineering/humanities may return 0 rows if those groups have no members yet). This confirms the function resolves subjects → owning group correctly. Full data is validated in Task 6.

- [ ] **Step 4: Check Supabase advisors**

Use the Supabase MCP `get_advisors` (type `security`).
Expected: the only new finding is the benign "function executable by authenticated" WARN for `get_subject_contributor_rankings` (intended — it is the authoritative leaderboard entry point), consistent with the existing `claim_period_reward` / `save_estate` advisors. No ERROR-level findings introduced.

- [ ] **Step 5: Commit the recorded SQL**

```bash
git add docs/superpowers/migrations/2026-06-27-contributor-ranking-rpc.sql
git commit -m "feat(db): add get_subject_contributor_rankings RPC"
```

---

## Task 6: DB — seed demo guest contributors

Insert 15 guest `auth.users` + `profiles` + `point_events` rows so the mapped buildings show populated rankings. Idempotent (`on conflict do nothing` with fixed UUIDs).

**Files:**
- Create: `docs/superpowers/migrations/2026-06-27-seed-demo-guests.sql`

- [ ] **Step 1: Confirm the `auth.users` column shape (resilience check)**

Use the Supabase MCP `execute_sql`:

```sql
select column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'auth' and table_name = 'users'
order by ordinal_position;
```

Expected: the columns referenced by the insert below (`instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data`) exist, and any NOT NULL columns not listed in the insert have defaults (e.g., the `*_token` text columns default to `''`). If a NOT NULL column without a default is found, add it to the insert with `''` (text) before applying.

- [ ] **Step 2: Write the seed SQL file**

Create `docs/superpowers/migrations/2026-06-27-seed-demo-guests.sql`:

```sql
-- Demo guest contributors for the building contributor ranking preview.
-- 15 guests across engineering / humanities / student-services so the 6 mapped
-- estate subjects show populated rankings. Idempotent: fixed UUIDs + ON CONFLICT.
-- NOTE: this writes to the LIVE Supabase DB. Guest point_events raise their
-- group's pooled points (and the student-services estate budget) by a modest,
-- intentional amount — see the plan's "Documented side effect".

-- 1) auth.users (profiles.id has an FK to auth.users.id, so insert these first).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  v.id,
  'authenticated',
  'authenticated',
  v.email,
  crypt('cems-demo-guest', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', v.display_name)
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'guest1@cems.demo',  '게스트 1'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'guest2@cems.demo',  '게스트 2'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'guest3@cems.demo',  '게스트 3'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'guest4@cems.demo',  '게스트 4'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'guest5@cems.demo',  '게스트 5'),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 'guest6@cems.demo',  '게스트 6'),
  ('a0000000-0000-4000-8000-000000000007'::uuid, 'guest7@cems.demo',  '게스트 7'),
  ('a0000000-0000-4000-8000-000000000008'::uuid, 'guest8@cems.demo',  '게스트 8'),
  ('a0000000-0000-4000-8000-000000000009'::uuid, 'guest9@cems.demo',  '게스트 9'),
  ('a0000000-0000-4000-8000-000000000010'::uuid, 'guest10@cems.demo', '게스트 10'),
  ('a0000000-0000-4000-8000-000000000011'::uuid, 'guest11@cems.demo', '게스트 11'),
  ('a0000000-0000-4000-8000-000000000012'::uuid, 'guest12@cems.demo', '게스트 12'),
  ('a0000000-0000-4000-8000-000000000013'::uuid, 'guest13@cems.demo', '게스트 13'),
  ('a0000000-0000-4000-8000-000000000014'::uuid, 'guest14@cems.demo', '게스트 14'),
  ('a0000000-0000-4000-8000-000000000015'::uuid, 'guest15@cems.demo', '게스트 15')
) as v(id, email, display_name)
on conflict (id) do nothing;

-- 2) profiles (school_id derived from the group's school so it stays correct).
insert into public.profiles (id, display_name, school_id, group_id)
select v.id, v.display_name, g.school_id, v.group_id
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, '게스트 1',  'engineering'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, '게스트 2',  'engineering'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, '게스트 3',  'engineering'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, '게스트 4',  'engineering'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, '게스트 5',  'engineering'),
  ('a0000000-0000-4000-8000-000000000006'::uuid, '게스트 6',  'engineering'),
  ('a0000000-0000-4000-8000-000000000007'::uuid, '게스트 7',  'humanities'),
  ('a0000000-0000-4000-8000-000000000008'::uuid, '게스트 8',  'humanities'),
  ('a0000000-0000-4000-8000-000000000009'::uuid, '게스트 9',  'humanities'),
  ('a0000000-0000-4000-8000-000000000010'::uuid, '게스트 10', 'humanities'),
  ('a0000000-0000-4000-8000-000000000011'::uuid, '게스트 11', 'humanities'),
  ('a0000000-0000-4000-8000-000000000012'::uuid, '게스트 12', 'student-services'),
  ('a0000000-0000-4000-8000-000000000013'::uuid, '게스트 13', 'student-services'),
  ('a0000000-0000-4000-8000-000000000014'::uuid, '게스트 14', 'student-services'),
  ('a0000000-0000-4000-8000-000000000015'::uuid, '게스트 15', 'student-services')
) as v(id, display_name, group_id)
join public.groups g on g.id = v.group_id
on conflict (id) do nothing;

-- 3) point_events (one row per guest; id defaults to gen_random_uuid()).
insert into public.point_events (user_id, points, reason, period_label)
select v.id, v.points, 'seed:demo-contribution', '2026-W26'
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 1850),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 1420),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 1180),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 920),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 640),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 380),
  ('a0000000-0000-4000-8000-000000000007'::uuid, 1560),
  ('a0000000-0000-4000-8000-000000000008'::uuid, 1240),
  ('a0000000-0000-4000-8000-000000000009'::uuid, 870),
  ('a0000000-0000-4000-8000-000000000010'::uuid, 610),
  ('a0000000-0000-4000-8000-000000000011'::uuid, 300),
  ('a0000000-0000-4000-8000-000000000012'::uuid, 1320),
  ('a0000000-0000-4000-8000-000000000013'::uuid, 980),
  ('a0000000-0000-4000-8000-000000000014'::uuid, 720),
  ('a0000000-0000-4000-8000-000000000015'::uuid, 450)
) as v(id, points)
on conflict (user_id, reason, period_label) do nothing;
```

- [ ] **Step 3: Apply the seed via the Supabase MCP**

Run the SQL above with the Supabase MCP `execute_sql` (project ref `zvuqmagfpdyrrzyjntue`).
Expected: success. Re-running is a no-op (idempotent).

- [ ] **Step 4: Probe the seeded rankings**

Use the Supabase MCP `execute_sql`:

```sql
select subject_id, rank, display_name, points
from public.get_subject_contributor_rankings(5)
where subject_id in ('yu-e21', 'yu-c02', 'yu-b04')
order by subject_id, rank;
```

Expected:
- `yu-e21` → 게스트 1 (1850), 게스트 2 (1420), 게스트 3 (1180), 게스트 4 (920), 게스트 5 (640) — top 5 of 6 engineering guests.
- `yu-c02` → 게스트 7 (1560), 게스트 8 (1240), 게스트 9 (870), 게스트 10 (610), 게스트 11 (300).
- `yu-b04` → `it@naver.com`'s display name first (~1,000,070), then 게스트 12 (1320), 게스트 13 (980), 게스트 14 (720), 게스트 15 (450).

- [ ] **Step 5: Commit the recorded SQL**

```bash
git add docs/superpowers/migrations/2026-06-27-seed-demo-guests.sql
git commit -m "feat(db): seed demo guest contributors across groups"
```

---

## Task 7: DAL — getSubjectContributorRankings

Thin server function: call the RPC, shape with the Task 1 helper. Server-only (covered by build + runtime probe; the shaping itself is already unit-tested).

**Files:**
- Modify: `src/features/account/data/account-dal.ts`

- [ ] **Step 1: Add the import**

In `src/features/account/data/account-dal.ts`, after the existing `group-pool` import block (around line 14), add:

```ts
import {
  groupContributorRowsBySubject,
  type ContributorRow,
  type SubjectContributorRankings,
} from "../domain/contributor-ranking";
```

- [ ] **Step 2: Add the DAL function**

Append to the end of `src/features/account/data/account-dal.ts`:

```ts
export async function getSubjectContributorRankings(
  limit = 5,
): Promise<SubjectContributorRankings> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "get_subject_contributor_rankings",
    { p_limit: limit },
  );
  if (error) {
    throw new Error(`Failed to load contributor rankings: ${error.message}`);
  }
  return groupContributorRowsBySubject((data ?? []) as ContributorRow[]);
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (the RPC name is a string, so Supabase types do not block it; the cast to `ContributorRow[]` matches the RPC's returned columns).

- [ ] **Step 4: Commit**

```bash
git add src/features/account/data/account-dal.ts
git commit -m "feat(account): add getSubjectContributorRankings DAL function"
```

---

## Task 8: Wire-through — page → app → map → popup

Thread the pre-fetched rankings from the server component down to the popup. No new logic, just prop plumbing.

**Files:**
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/features/campus-energy/components/campus-energy-app.tsx`
- Modify: `src/features/campus-energy/components/admin-map-view.tsx`

- [ ] **Step 1: Pre-fetch in the home server component**

In `src/app/[locale]/page.tsx`:

Update the account-dal import (lines 3–9) to add `getSubjectContributorRankings`:

```ts
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupEstateSubjectId,
  getGroupPointPool,
  getPersonalPointTotal,
  getSubjectContributorRankings,
} from "@/features/account/data/account-dal";
```

Replace the `Promise.all` block (lines 27–33) with:

```ts
  const [
    messages,
    personalPoints,
    groupPool,
    orgSubjectId,
    contributorRankings,
  ] = await Promise.all([
    getMessages(locale),
    getPersonalPointTotal(profile.userId),
    getGroupPointPool(profile.groupId),
    getGroupEstateSubjectId(profile.groupId),
    getSubjectContributorRankings(),
  ]);
```

Replace the `<CampusEnergyApp …>` return (lines 35–49) with (adds the `contributorRankings` prop):

```tsx
  return (
    <CampusEnergyApp
      locale={locale}
      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""}
      messages={messages}
      contributorRankings={contributorRankings}
      account={{
        displayName: profile.displayName,
        groupId: profile.groupId,
        personalPoints,
        groupPoolPoints: groupPool.earnedPoints,
        groupMemberCount: groupPool.memberCount,
        orgSubjectId,
      }}
    />
  );
```

- [ ] **Step 2: Thread through `CampusEnergyApp`**

In `src/features/campus-energy/components/campus-energy-app.tsx`:

Add the type import near the other type imports (after line 6):

```ts
import type { SubjectContributorRankings } from "@/features/account/domain/contributor-ranking";
```

Extend `CampusEnergyAppProps` (lines 29–34):

```ts
type CampusEnergyAppProps = {
  locale: Locale;
  mapboxToken: string;
  messages: Messages;
  contributorRankings: SubjectContributorRankings;
  account: CampusEnergyAccount;
};
```

Update the `CampusEnergyApp` signature + body (lines 36–47) to pass the prop down:

```tsx
export function CampusEnergyApp({
  locale,
  mapboxToken,
  messages,
  contributorRankings,
  account,
}: CampusEnergyAppProps) {
  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <CampusEnergyShell
        mapboxToken={mapboxToken}
        contributorRankings={contributorRankings}
        account={account}
      />
    </CampusEnergyProviders>
  );
}
```

Update the `CampusEnergyShell` signature (lines 49–55):

```tsx
function CampusEnergyShell({
  mapboxToken,
  contributorRankings,
  account,
}: {
  mapboxToken: string;
  contributorRankings: SubjectContributorRankings;
  account: CampusEnergyAccount;
}) {
```

Pass it to `AdminMapView` — update the admin-mode return (lines 74–90) so the `<AdminMapView>` element includes:

```tsx
        <AdminMapView
          mapboxToken={mapboxToken}
          orgSubjectId={account.orgSubjectId}
          school={localizedDemo.school}
          subjects={localizedDemo.subjects}
          comparisons={comparisons}
          contributorRankings={contributorRankings}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={setSelectedSubjectId}
          mode={mode}
          onModeChange={setMode}
        />
```

- [ ] **Step 3: Consume in `AdminMapView` and pass to the popup**

In `src/features/campus-energy/components/admin-map-view.tsx`:

Add the type import after the existing domain-type import (after line 8):

```ts
import type { SubjectContributorRankings } from "@/features/account/domain/contributor-ranking";
```

Extend `AdminMapViewProps` (lines 25–35) — add `contributorRankings`:

```ts
type AdminMapViewProps = {
  mapboxToken: string;
  orgSubjectId: string | null;
  school: School;
  subjects: EnergySubject[];
  comparisons: EnergyComparison[];
  contributorRankings: SubjectContributorRankings;
  selectedSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};
```

Add `contributorRankings` to the destructured params (lines 37–47):

```tsx
export function AdminMapView({
  mapboxToken,
  orgSubjectId,
  school,
  subjects,
  comparisons,
  contributorRankings,
  selectedSubjectId,
  onSelectSubject,
  mode,
  onModeChange,
}: AdminMapViewProps) {
```

Compute the selected building's contributors — add right after `selectedDetail` (after line 73):

```tsx
  const selectedContributors = contributorRankings[selectedSubjectId] ?? [];
```

Pass it into `<BuildingPopup>` (lines 161–167) — add the `contributors` prop:

```tsx
          <BuildingPopup
            subject={selectedSubject}
            comparison={selectedComparison}
            detail={selectedDetail}
            campusName={school.name}
            contributors={selectedContributors}
            onClose={() => onSelectSubject("")}
          />
```

- [ ] **Step 4: Type-check + lint the wired files**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npm run lint`
Expected: 0 errors (the 2 pre-existing `game-preview.tsx` warnings remain).

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/page.tsx src/features/campus-energy/components/campus-energy-app.tsx src/features/campus-energy/components/admin-map-view.tsx
git commit -m "feat(map): wire subject contributor rankings into the building popup"
```

---

## Task 9: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full Vitest suite**

Run: `npm run test`
Expected: all tests pass, including the new `contributor-ranking` (4), `building-contributor-ranking` (2), and `building-popup` (2) tests. No pre-existing tests broken (the pure domain tests use fixed inputs, so the live seed does not affect them).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 errors; exactly the 2 pre-existing `game-preview.tsx` warnings.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds; `/[locale]` route still renders (now also pre-fetching contributor rankings server-side).

- [ ] **Step 4: Live smoke check (optional but recommended)**

With `it@naver.com` logged in (dev or `next start`), open the map, click the org building (중앙도서관 / `yu-b04`), open the "기여 랭킹" tab: the logged-in user appears rank 1 with the "나" chip, followed by 게스트 12–15. Click an engineering building (e.g., 공학관 / `yu-e21`) → 게스트 1–5. Click an unmapped building → friendly empty state. (The map route's continuous Mapbox repaint can time out the preview screenshot tool — a known environment limitation; verify via the running app / DOM if screenshots hang.)

- [ ] **Step 5: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "test: verify building contributor ranking preview"
```

---

## Self-Review Notes (author)

- **Spec coverage:** building click → in-popup segmented toggle (Task 4) → top-N individual ranking (Tasks 1, 3) by cumulative points (RPC sums `point_events.points`, Task 5) backed by real seeded DB guests (Task 6), pre-fetched and threaded (Tasks 7–8). Preview is top-N inline only (no full page) — matches all four confirmed decisions.
- **Type consistency:** `SubjectContributor` / `SubjectContributorRankings` / `ContributorRow` are defined once in `contributor-ranking.ts` and imported everywhere (DAL, app, map view, popup, ranking component). The RPC's returned columns (`subject_id, user_id, display_name, points, rank, is_me`) exactly match `ContributorRow`. The function name `getSubjectContributorRankings` is identical in the DAL and `page.tsx`.
- **No placeholders:** every code step contains full code; SQL, tests, and component bodies are complete.
- **Open follow-ups (out of scope, documented):** per-building (vs per-operating-group) contribution attribution; a full ranking page; hiding the ranking tab entirely for unmapped buildings instead of showing an empty state; live re-fetch on selection (current design pre-fetches once at page load).
