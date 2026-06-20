# Campus Energy Platform MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first campus energy platform MVP using Yeungnam University as the initial school, with both an admin energy dashboard and a participant points and character surface.

**Architecture:** Keep `src/app/page.tsx` as a Server Component that passes serializable demo data into feature components. Put browser-only Mapbox code behind a small Client Component, and keep energy comparison, scoring, rankings, and character progression in pure TypeScript modules with unit tests. Start with mock actual and forecast electricity data so the UI and product loop can be verified before adding a database, auth, or LightGBM pipeline.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.4, TypeScript, Tailwind CSS v4, Mapbox GL JS v3, lucide-react, Vitest, mock Yeungnam campus energy data.

## Global Constraints

- Before editing Next.js code, read `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`, `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`, and `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`.
- `src/app/page.tsx` remains a Server Component.
- `mapbox-gl` is imported only from files marked with `'use client'`.
- The Mapbox token is `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`; commit `.env.example`, never commit `.env.local`.
- The app must build without a Mapbox token and show a configuration state instead of constructing a map.
- Yeungnam University is the first registered school, not a hard-coded product limit.
- Energy comparison is based on actual electricity usage versus forecast electricity usage.
- Admin and participant UI surfaces must share the same scoring functions.
- Use mock energy and participant data in the MVP. Do not add database, authentication, or ML training in this first implementation.
- Do not commit or push unless the user explicitly asks.

---

## File Structure

- Modify `package.json`: add dependencies and test scripts.
- Modify `package-lock.json`: generated dependency lockfile changes.
- Modify `.gitignore`: allow `.env.example`.
- Create `.env.example`: Mapbox token contract.
- Modify `README.md`: setup and verification commands.
- Modify `src/app/layout.tsx`: product metadata and language.
- Modify `src/app/globals.css`: map and dashboard base styles.
- Modify `src/app/page.tsx`: compose the MVP page.
- Create `src/features/campus-energy/domain/types.ts`: shared domain types.
- Create `src/features/campus-energy/domain/energy.ts`: actual versus forecast calculations.
- Create `src/features/campus-energy/domain/scoring.ts`: points, rankings, and character progression.
- Create `src/features/campus-energy/data/demo-campus.ts`: Yeungnam school, buildings, groups, mock energy values, and mock participant.
- Create `src/features/campus-energy/components/campus-energy-app.tsx`: top-level client state for admin and participant modes.
- Create `src/features/campus-energy/components/admin-dashboard.tsx`: admin summary, rankings, and selected building details.
- Create `src/features/campus-energy/components/campus-map.tsx`: Mapbox visualization for building status.
- Create `src/features/campus-energy/components/participant-dashboard.tsx`: user-facing points, rankings, and character card.
- Create `src/features/campus-energy/components/mode-tabs.tsx`: admin and participant mode switch.
- Create `src/features/campus-energy/components/status-badge.tsx`: shared status indicator.
- Create `src/features/campus-energy/components/metric-card.tsx`: compact dashboard metric display.
- Create `src/features/campus-energy/components/character-card.tsx`: character progress display.
- Create `src/features/campus-energy/components/building-rank-table.tsx`: sortable building ranking.
- Create `src/features/campus-energy/components/group-rank-table.tsx`: participant affiliation ranking.
- Create `src/features/campus-energy/__tests__/energy.test.ts`: energy comparison tests.
- Create `src/features/campus-energy/__tests__/scoring.test.ts`: points, ranking, and character tests.

---

### Task 1: Dependencies, Environment, And Verification Foundation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Create: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: existing Next.js app scripts.
- Produces: Mapbox and test dependencies, public token contract, and reproducible verification commands.

- [ ] **Step 1: Install dependencies**

Run:

```powershell
npm install mapbox-gl lucide-react
npm install -D vitest jsdom
```

Expected: `package.json` includes `mapbox-gl`, `lucide-react`, `vitest`, and `jsdom`.

- [ ] **Step 2: Add scripts**

In `package.json`, keep existing scripts and add:

```json
{
  "test": "vitest run --passWithNoTests",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Allow `.env.example`**

Change the env section in `.gitignore` to:

```gitignore
# env files (can opt-in for committing if needed)
.env*
!.env.example
```

- [ ] **Step 4: Create `.env.example`**

Create:

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=
```

- [ ] **Step 5: Update README setup**

Add:

````markdown
## Campus Energy MVP

The MVP uses Yeungnam University as the first school and shows two surfaces:

- Admin mode: actual electricity usage versus forecast usage by building
- Participant mode: affiliation points and character progress from verified savings

For the map:

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` to a public Mapbox token that starts with `pk.`.
3. Restrict the token to local and deployed origins.

The app builds without the token and shows a configuration state for the map.

## Verification

```powershell
npm run test
npm run lint
npm run build
git diff --check
```
````

- [ ] **Step 6: Verify foundation**

Run:

```powershell
npm run test
npm run lint
npm run build
git diff --check
```

Expected: `npm run test` exits with code `0` even before tests exist; lint, build, and diff check pass.

---

### Task 2: Domain Types And Energy Comparison Logic

**Files:**
- Create: `src/features/campus-energy/domain/types.ts`
- Create: `src/features/campus-energy/domain/energy.ts`
- Create: `src/features/campus-energy/__tests__/energy.test.ts`

**Interfaces:**
- Produces:
  - `EnergySubject`
  - `EnergyReading`
  - `EnergyComparison`
  - `compareEnergy(reading: EnergyReading): EnergyComparison`
  - `summarizeEnergy(comparisons: EnergyComparison[]): EnergySummary`

- [ ] **Step 1: Write failing tests**

Create `src/features/campus-energy/__tests__/energy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { compareEnergy, summarizeEnergy } from "../domain/energy";
import type { EnergyReading } from "../domain/types";

describe("compareEnergy", () => {
  it("classifies a saving subject", () => {
    const reading: EnergyReading = {
      subjectId: "yu-it",
      actualKwh: 900,
      forecastKwh: 1000,
      periodLabel: "2026-W25",
    };

    expect(compareEnergy(reading)).toMatchObject({
      subjectId: "yu-it",
      deltaKwh: -100,
      savingsKwh: 100,
      overuseKwh: 0,
      savingsRate: 0.1,
      status: "saving",
    });
  });

  it("classifies an overuse subject", () => {
    const reading: EnergyReading = {
      subjectId: "yu-mechanical",
      actualKwh: 1160,
      forecastKwh: 1000,
      periodLabel: "2026-W25",
    };

    expect(compareEnergy(reading)).toMatchObject({
      deltaKwh: 160,
      savingsKwh: 0,
      overuseKwh: 160,
      savingsRate: 0,
      status: "overuse",
    });
  });

  it("summarizes comparison totals", () => {
    const summary = summarizeEnergy([
      compareEnergy({ subjectId: "a", actualKwh: 900, forecastKwh: 1000, periodLabel: "2026-W25" }),
      compareEnergy({ subjectId: "b", actualKwh: 1100, forecastKwh: 1000, periodLabel: "2026-W25" }),
    ]);

    expect(summary).toEqual({
      actualKwh: 2000,
      forecastKwh: 2000,
      savingsKwh: 100,
      overuseKwh: 100,
      netDeltaKwh: 0,
      netSavingsRate: 0,
    });
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/energy.test.ts
```

Expected: failure because `domain/energy` and `domain/types` do not exist.

- [ ] **Step 3: Add domain types**

Create `src/features/campus-energy/domain/types.ts`:

```ts
export type EnergySubjectType = "building" | "department" | "college" | "school" | "region";

export type EnergyStatus = "saving" | "neutral" | "overuse";

export type EnergySubject = {
  id: string;
  schoolId: string;
  campusId: string;
  type: EnergySubjectType;
  name: string;
  shortName: string;
  lng: number;
  lat: number;
  groupId?: string;
};

export type EnergyReading = {
  subjectId: string;
  actualKwh: number;
  forecastKwh: number;
  periodLabel: string;
};

export type EnergyComparison = EnergyReading & {
  deltaKwh: number;
  savingsKwh: number;
  overuseKwh: number;
  savingsRate: number;
  status: EnergyStatus;
};

export type EnergySummary = {
  actualKwh: number;
  forecastKwh: number;
  savingsKwh: number;
  overuseKwh: number;
  netDeltaKwh: number;
  netSavingsRate: number;
};
```

- [ ] **Step 4: Add energy calculations**

Create `src/features/campus-energy/domain/energy.ts`:

```ts
import type { EnergyComparison, EnergyReading, EnergyStatus, EnergySummary } from "./types";

function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getStatus(deltaKwh: number): EnergyStatus {
  if (deltaKwh < -0.01) return "saving";
  if (deltaKwh > 0.01) return "overuse";
  return "neutral";
}

export function compareEnergy(reading: EnergyReading): EnergyComparison {
  const deltaKwh = round(reading.actualKwh - reading.forecastKwh, 2);
  const savingsKwh = Math.max(0, round(reading.forecastKwh - reading.actualKwh, 2));
  const overuseKwh = Math.max(0, round(reading.actualKwh - reading.forecastKwh, 2));
  const savingsRate = reading.forecastKwh > 0 ? round(savingsKwh / reading.forecastKwh, 4) : 0;

  return {
    ...reading,
    deltaKwh,
    savingsKwh,
    overuseKwh,
    savingsRate,
    status: getStatus(deltaKwh),
  };
}

export function summarizeEnergy(comparisons: EnergyComparison[]): EnergySummary {
  const actualKwh = round(comparisons.reduce((sum, item) => sum + item.actualKwh, 0), 2);
  const forecastKwh = round(comparisons.reduce((sum, item) => sum + item.forecastKwh, 0), 2);
  const savingsKwh = round(comparisons.reduce((sum, item) => sum + item.savingsKwh, 0), 2);
  const overuseKwh = round(comparisons.reduce((sum, item) => sum + item.overuseKwh, 0), 2);
  const netDeltaKwh = round(actualKwh - forecastKwh, 2);
  const netSavingsRate = forecastKwh > 0 ? round(Math.max(0, forecastKwh - actualKwh) / forecastKwh, 4) : 0;

  return {
    actualKwh,
    forecastKwh,
    savingsKwh,
    overuseKwh,
    netDeltaKwh,
    netSavingsRate,
  };
}
```

- [ ] **Step 5: Verify energy tests pass**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/energy.test.ts
```

Expected: tests pass.

---

### Task 3: Scoring, Rankings, And Character Progression

**Files:**
- Modify: `src/features/campus-energy/domain/types.ts`
- Create: `src/features/campus-energy/domain/scoring.ts`
- Create: `src/features/campus-energy/__tests__/scoring.test.ts`

**Interfaces:**
- Consumes: `EnergyComparison[]`
- Produces:
  - `calculatePoints(comparison: EnergyComparison, multiplier?: number): number`
  - `rankSubjects(comparisons: EnergyComparison[]): RankedEnergySubject[]`
  - `getCharacterProgress(points: number): CharacterProgress`

- [ ] **Step 1: Write failing tests**

Create `src/features/campus-energy/__tests__/scoring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { compareEnergy } from "../domain/energy";
import { calculatePoints, getCharacterProgress, rankSubjects } from "../domain/scoring";

describe("calculatePoints", () => {
  it("converts savings to points", () => {
    const comparison = compareEnergy({
      subjectId: "yu-it",
      actualKwh: 850,
      forecastKwh: 1000,
      periodLabel: "2026-W25",
    });

    expect(calculatePoints(comparison)).toBe(1500);
  });

  it("does not award points for overuse", () => {
    const comparison = compareEnergy({
      subjectId: "yu-mechanical",
      actualKwh: 1100,
      forecastKwh: 1000,
      periodLabel: "2026-W25",
    });

    expect(calculatePoints(comparison)).toBe(0);
  });
});

describe("rankSubjects", () => {
  it("orders subjects by savings points", () => {
    const rankings = rankSubjects([
      compareEnergy({ subjectId: "a", actualKwh: 900, forecastKwh: 1000, periodLabel: "2026-W25" }),
      compareEnergy({ subjectId: "b", actualKwh: 800, forecastKwh: 1000, periodLabel: "2026-W25" }),
    ]);

    expect(rankings.map((item) => item.subjectId)).toEqual(["b", "a"]);
    expect(rankings[0].rank).toBe(1);
    expect(rankings[0].points).toBe(2000);
  });
});

describe("getCharacterProgress", () => {
  it("maps points to a visible character level", () => {
    expect(getCharacterProgress(2750)).toEqual({
      level: 3,
      currentLevelPoints: 750,
      nextLevelPoints: 1000,
      progressRate: 0.75,
      title: "Campus Saver",
    });
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/scoring.test.ts
```

Expected: failure because `domain/scoring` does not exist.

- [ ] **Step 3: Extend domain types**

Append to `src/features/campus-energy/domain/types.ts`:

```ts
export type RankedEnergySubject = EnergyComparison & {
  rank: number;
  points: number;
};

export type CharacterProgress = {
  level: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  progressRate: number;
  title: string;
};
```

- [ ] **Step 4: Add scoring implementation**

Create `src/features/campus-energy/domain/scoring.ts`:

```ts
import type { CharacterProgress, EnergyComparison, RankedEnergySubject } from "./types";

const DEFAULT_POINT_MULTIPLIER = 10;
const POINTS_PER_LEVEL = 1000;

export function calculatePoints(comparison: EnergyComparison, multiplier = DEFAULT_POINT_MULTIPLIER): number {
  return Math.max(0, Math.round(comparison.savingsKwh * multiplier));
}

export function rankSubjects(comparisons: EnergyComparison[]): RankedEnergySubject[] {
  return comparisons
    .map((comparison) => ({
      ...comparison,
      points: calculatePoints(comparison),
    }))
    .sort((a, b) => b.points - a.points || a.subjectId.localeCompare(b.subjectId))
    .map((comparison, index) => ({
      ...comparison,
      rank: index + 1,
    }));
}

function getTitle(level: number) {
  if (level >= 10) return "Grid Guardian";
  if (level >= 5) return "Energy Hero";
  return "Campus Saver";
}

export function getCharacterProgress(points: number): CharacterProgress {
  const normalizedPoints = Math.max(0, Math.floor(points));
  const level = Math.floor(normalizedPoints / POINTS_PER_LEVEL) + 1;
  const currentLevelPoints = normalizedPoints % POINTS_PER_LEVEL;
  const progressRate = currentLevelPoints / POINTS_PER_LEVEL;

  return {
    level,
    currentLevelPoints,
    nextLevelPoints: POINTS_PER_LEVEL,
    progressRate,
    title: getTitle(level),
  };
}
```

- [ ] **Step 5: Verify scoring tests pass**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/scoring.test.ts
```

Expected: tests pass.

---

### Task 4: Demo School, Subjects, Groups, And Mock Energy Data

**Files:**
- Modify: `src/features/campus-energy/domain/types.ts`
- Create: `src/features/campus-energy/data/demo-campus.ts`
- Modify: `src/features/campus-energy/__tests__/energy.test.ts`

**Interfaces:**
- Produces:
  - `demoSchool`
  - `demoSubjects`
  - `demoGroups`
  - `demoEnergyReadings`
  - `getDemoEnergyComparisons()`
  - `getDemoGroupRankings()`

- [ ] **Step 1: Extend data types**

Append to `src/features/campus-energy/domain/types.ts`:

```ts
export type School = {
  id: string;
  name: string;
  shortName: string;
  center: [number, number];
  zoom: number;
  pitch: number;
};

export type AffiliationGroup = {
  id: string;
  schoolId: string;
  name: string;
  type: "college" | "department" | "dormitory" | "staff" | "other";
};

export type ParticipantProfile = {
  id: string;
  displayName: string;
  schoolId: string;
  groupId: string;
};
```

- [ ] **Step 2: Create demo data**

Create `src/features/campus-energy/data/demo-campus.ts`:

```ts
import { compareEnergy } from "../domain/energy";
import { rankSubjects } from "../domain/scoring";
import type { AffiliationGroup, EnergyReading, EnergySubject, ParticipantProfile, School } from "../domain/types";

export const demoSchool: School = {
  id: "yeungnam",
  name: "Yeungnam University",
  shortName: "YU",
  center: [128.757416, 35.83287],
  zoom: 15.4,
  pitch: 60,
};

export const demoGroups: AffiliationGroup[] = [
  { id: "engineering", schoolId: "yeungnam", name: "College of Engineering", type: "college" },
  { id: "humanities", schoolId: "yeungnam", name: "College of Humanities", type: "college" },
  { id: "student-services", schoolId: "yeungnam", name: "Student Services", type: "other" },
];

export const demoParticipant: ParticipantProfile = {
  id: "demo-user",
  displayName: "Demo Student",
  schoolId: "yeungnam",
  groupId: "engineering",
};

export const demoSubjects: EnergySubject[] = [
  {
    id: "yu-it",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "building",
    name: "IT Building",
    shortName: "IT",
    lng: 128.75859,
    lat: 35.83393,
    groupId: "engineering",
  },
  {
    id: "yu-mechanical",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "building",
    name: "Mechanical Engineering Building",
    shortName: "ME",
    lng: 128.75663,
    lat: 35.83437,
    groupId: "engineering",
  },
  {
    id: "yu-humanities",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "building",
    name: "Humanities Building",
    shortName: "HM",
    lng: 128.75921,
    lat: 35.83172,
    groupId: "humanities",
  },
  {
    id: "yu-library",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "building",
    name: "University Library",
    shortName: "LIB",
    lng: 128.757416,
    lat: 35.83287,
    groupId: "student-services",
  },
];

export const demoEnergyReadings: EnergyReading[] = [
  { subjectId: "yu-it", actualKwh: 1360, forecastKwh: 1500, periodLabel: "2026-W25" },
  { subjectId: "yu-mechanical", actualKwh: 1710, forecastKwh: 1600, periodLabel: "2026-W25" },
  { subjectId: "yu-humanities", actualKwh: 980, forecastKwh: 1120, periodLabel: "2026-W25" },
  { subjectId: "yu-library", actualKwh: 2140, forecastKwh: 2050, periodLabel: "2026-W25" },
];

export function getDemoEnergyComparisons() {
  return demoEnergyReadings.map(compareEnergy);
}

export function getDemoGroupRankings() {
  const comparisons = getDemoEnergyComparisons();
  const groupComparisons = demoGroups.map((group) => {
    const subjectIds = demoSubjects.filter((subject) => subject.groupId === group.id).map((subject) => subject.id);
    const actualKwh = comparisons
      .filter((comparison) => subjectIds.includes(comparison.subjectId))
      .reduce((sum, comparison) => sum + comparison.actualKwh, 0);
    const forecastKwh = comparisons
      .filter((comparison) => subjectIds.includes(comparison.subjectId))
      .reduce((sum, comparison) => sum + comparison.forecastKwh, 0);

    return compareEnergy({
      subjectId: group.id,
      actualKwh,
      forecastKwh,
      periodLabel: "2026-W25",
    });
  });

  return rankSubjects(groupComparisons);
}
```

- [ ] **Step 3: Add demo data invariant test**

Append to `src/features/campus-energy/__tests__/energy.test.ts`:

```ts
import { demoEnergyReadings, demoGroups, demoSubjects, getDemoGroupRankings } from "../data/demo-campus";

describe("demo campus data", () => {
  it("connects every reading to a subject", () => {
    const subjectIds = new Set(demoSubjects.map((subject) => subject.id));
    expect(demoEnergyReadings.every((reading) => subjectIds.has(reading.subjectId))).toBe(true);
  });

  it("connects every subject group to a known affiliation group", () => {
    const groupIds = new Set(demoGroups.map((group) => group.id));
    expect(demoSubjects.every((subject) => subject.groupId && groupIds.has(subject.groupId))).toBe(true);
  });

  it("creates ranked affiliation groups", () => {
    const rankings = getDemoGroupRankings();
    expect(rankings).toHaveLength(demoGroups.length);
    expect(rankings[0].rank).toBe(1);
  });
});
```

- [ ] **Step 4: Verify tests**

Run:

```powershell
npm run test
```

Expected: all tests pass.

---

### Task 5: Admin Dashboard UI And Energy Map

**Files:**
- Create: `src/features/campus-energy/components/campus-energy-app.tsx`
- Create: `src/features/campus-energy/components/admin-dashboard.tsx`
- Create: `src/features/campus-energy/components/campus-map.tsx`
- Create: `src/features/campus-energy/components/mode-tabs.tsx`
- Create: `src/features/campus-energy/components/status-badge.tsx`
- Create: `src/features/campus-energy/components/metric-card.tsx`
- Create: `src/features/campus-energy/components/building-rank-table.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `demoSchool`, `demoSubjects`, `getDemoEnergyComparisons()`, and `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.
- Produces: admin dashboard mode with map, summary cards, building rankings, and selected building detail.

- [ ] **Step 1: Create shared mode tabs**

Create `src/features/campus-energy/components/mode-tabs.tsx`:

```tsx
"use client";

type Mode = "admin" | "participant";

type ModeTabsProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  return (
    <div className="inline-flex border border-slate-300 bg-white p-1">
      {[
        ["admin", "Admin Dashboard"],
        ["participant", "Participant Mode"],
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onModeChange(value as Mode)}
          className={`px-3 py-2 text-sm font-medium ${
            mode === value ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create metric and status components**

Create `src/features/campus-energy/components/metric-card.tsx`:

```tsx
type MetricCardProps = {
  label: string;
  value: string;
  tone?: "neutral" | "saving" | "overuse";
};

export function MetricCard({ label, value, tone = "neutral" }: MetricCardProps) {
  const toneClass = {
    neutral: "border-slate-200 bg-white text-slate-950",
    saving: "border-emerald-200 bg-emerald-50 text-emerald-950",
    overuse: "border-rose-200 bg-rose-50 text-rose-950",
  }[tone];

  return (
    <div className={`border p-4 ${toneClass}`}>
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
```

Create `src/features/campus-energy/components/status-badge.tsx`:

```tsx
import type { EnergyStatus } from "../domain/types";

export function StatusBadge({ status }: { status: EnergyStatus }) {
  const config = {
    saving: "bg-emerald-100 text-emerald-800",
    neutral: "bg-slate-100 text-slate-700",
    overuse: "bg-rose-100 text-rose-800",
  }[status];

  return <span className={`px-2 py-1 text-xs font-semibold ${config}`}>{status}</span>;
}
```

- [ ] **Step 3: Create building rank table**

Create `src/features/campus-energy/components/building-rank-table.tsx`:

```tsx
"use client";

import type { EnergyComparison, EnergySubject } from "../domain/types";
import { StatusBadge } from "./status-badge";

type BuildingRankTableProps = {
  subjects: EnergySubject[];
  comparisons: EnergyComparison[];
  selectedSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
};

export function BuildingRankTable({ subjects, comparisons, selectedSubjectId, onSelectSubject }: BuildingRankTableProps) {
  const rows = comparisons
    .map((comparison) => ({
      comparison,
      subject: subjects.find((subject) => subject.id === comparison.subjectId),
    }))
    .filter((row): row is { comparison: EnergyComparison; subject: EnergySubject } => Boolean(row.subject))
    .sort((a, b) => b.comparison.overuseKwh - a.comparison.overuseKwh || b.comparison.savingsKwh - a.comparison.savingsKwh);

  return (
    <div className="overflow-hidden border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-950">Building diagnosis</h2>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {rows.map(({ subject, comparison }) => (
          <button
            key={subject.id}
            type="button"
            onClick={() => onSelectSubject(subject.id)}
            className={`grid w-full grid-cols-[1fr_auto] gap-3 border-b border-slate-100 px-4 py-3 text-left ${
              selectedSubjectId === subject.id ? "bg-blue-50" : "hover:bg-slate-50"
            }`}
          >
            <span>
              <span className="block text-sm font-semibold text-slate-950">{subject.name}</span>
              <span className="mt-1 block text-xs text-slate-500">
                Actual {comparison.actualKwh.toLocaleString()} kWh / Forecast {comparison.forecastKwh.toLocaleString()} kWh
              </span>
            </span>
            <span className="flex flex-col items-end gap-2">
              <StatusBadge status={comparison.status} />
              <span className="text-xs text-slate-500">{comparison.deltaKwh > 0 ? "+" : ""}{comparison.deltaKwh} kWh</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Mapbox client map**

Create `src/features/campus-energy/components/campus-map.tsx`:

```tsx
"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef } from "react";
import type { EnergyComparison, EnergySubject, School } from "../domain/types";

type CampusMapProps = {
  mapboxToken: string;
  school: School;
  subjects: EnergySubject[];
  comparisons: EnergyComparison[];
  selectedSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
};

export function CampusMap({
  mapboxToken,
  school,
  subjects,
  comparisons,
  selectedSubjectId,
  onSelectSubject,
}: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId);

  const featureCollection = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: subjects.map((subject) => {
        const comparison = comparisons.find((item) => item.subjectId === subject.id);
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [subject.lng, subject.lat] },
          properties: {
            id: subject.id,
            name: subject.name,
            status: comparison?.status ?? "neutral",
            deltaKwh: comparison?.deltaKwh ?? 0,
          },
        };
      }),
    }),
    [comparisons, subjects],
  );

  useEffect(() => {
    if (!mapboxToken || !containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      accessToken: mapboxToken,
      antialias: true,
      bearing: -24,
      center: school.center,
      container: containerRef.current,
      pitch: school.pitch,
      style: "mapbox://styles/mapbox/standard",
      zoom: school.zoom,
      config: { basemap: { theme: "monochrome", lightPreset: "day" } },
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");

    map.on("load", () => {
      map.addSource("energy-subjects", { type: "geojson", data: featureCollection });
      map.addLayer({
        id: "energy-subject-circles",
        type: "circle",
        source: "energy-subjects",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 7, 17, 14],
          "circle-color": [
            "match",
            ["get", "status"],
            "saving",
            "#059669",
            "overuse",
            "#e11d48",
            "#64748b",
          ],
          "circle-opacity": 0.78,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "energy-subject-labels",
        type: "symbol",
        source: "energy-subjects",
        minzoom: 15,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-offset": [0, 1.3],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.25,
        },
      });
      map.on("click", "energy-subject-circles", (event) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") onSelectSubject(id);
      });
      map.on("mouseenter", "energy-subject-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "energy-subject-circles", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [featureCollection, mapboxToken, onSelectSubject, school.center, school.pitch, school.zoom]);

  useEffect(() => {
    if (!selectedSubject || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [selectedSubject.lng, selectedSubject.lat],
      zoom: 16.4,
      pitch: school.pitch,
      essential: true,
    });
  }, [school.pitch, selectedSubject]);

  if (!mapboxToken) {
    return (
      <div className="flex h-full min-h-[28rem] items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-sm border border-white/15 bg-white/10 p-5">
          <h2 className="font-semibold">Mapbox token required</h2>
          <p className="mt-2 text-sm text-white/70">Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local.</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full min-h-[28rem] w-full" />;
}
```

- [ ] **Step 5: Create admin dashboard**

Create `src/features/campus-energy/components/admin-dashboard.tsx`:

```tsx
"use client";

import { summarizeEnergy } from "../domain/energy";
import type { EnergyComparison, EnergySubject, School } from "../domain/types";
import { BuildingRankTable } from "./building-rank-table";
import { CampusMap } from "./campus-map";
import { MetricCard } from "./metric-card";

type AdminDashboardProps = {
  mapboxToken: string;
  school: School;
  subjects: EnergySubject[];
  comparisons: EnergyComparison[];
  selectedSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
};

export function AdminDashboard(props: AdminDashboardProps) {
  const summary = summarizeEnergy(props.comparisons);
  const selectedComparison = props.comparisons.find((item) => item.subjectId === props.selectedSubjectId);
  const selectedSubject = props.subjects.find((item) => item.id === props.selectedSubjectId);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_26rem]">
      <section className="overflow-hidden border border-slate-200 bg-white">
        <CampusMap {...props} />
      </section>
      <aside className="flex min-h-0 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Actual" value={`${summary.actualKwh.toLocaleString()} kWh`} />
          <MetricCard label="Forecast" value={`${summary.forecastKwh.toLocaleString()} kWh`} />
          <MetricCard label="Saved" value={`${summary.savingsKwh.toLocaleString()} kWh`} tone="saving" />
          <MetricCard label="Overuse" value={`${summary.overuseKwh.toLocaleString()} kWh`} tone="overuse" />
        </div>
        <BuildingRankTable
          subjects={props.subjects}
          comparisons={props.comparisons}
          selectedSubjectId={props.selectedSubjectId}
          onSelectSubject={props.onSelectSubject}
        />
        {selectedSubject && selectedComparison ? (
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Selected subject</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{selectedSubject.name}</h2>
            <p className="mt-2 text-sm text-slate-600">
              Actual usage is {Math.abs(selectedComparison.deltaKwh).toLocaleString()} kWh{" "}
              {selectedComparison.status === "overuse" ? "above" : "below"} forecast.
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
```

- [ ] **Step 6: Create top-level app shell**

Create `src/features/campus-energy/components/campus-energy-app.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { demoSchool, demoSubjects, getDemoEnergyComparisons } from "../data/demo-campus";
import { AdminDashboard } from "./admin-dashboard";
import { ModeTabs } from "./mode-tabs";
import { ParticipantDashboard } from "./participant-dashboard";

type Mode = "admin" | "participant";

type CampusEnergyAppProps = {
  mapboxToken: string;
};

export function CampusEnergyApp({ mapboxToken }: CampusEnergyAppProps) {
  const [mode, setMode] = useState<Mode>("admin");
  const [selectedSubjectId, setSelectedSubjectId] = useState(demoSubjects[0].id);
  const comparisons = useMemo(() => getDemoEnergyComparisons(), []);

  return (
    <main className="flex min-h-screen flex-col bg-slate-100 p-4 text-slate-950">
      <header className="mb-4 flex flex-col gap-3 border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-700">Campus Energy Management System</p>
          <h1 className="mt-1 text-2xl font-semibold">{demoSchool.name}</h1>
          <p className="mt-1 text-sm text-slate-600">Actual electricity usage compared with forecast baseline.</p>
        </div>
        <ModeTabs mode={mode} onModeChange={setMode} />
      </header>
      {mode === "admin" ? (
        <AdminDashboard
          mapboxToken={mapboxToken}
          school={demoSchool}
          subjects={demoSubjects}
          comparisons={comparisons}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={setSelectedSubjectId}
        />
      ) : (
        <ParticipantDashboard />
      )}
    </main>
  );
}
```

- [ ] **Step 7: Temporarily create participant stub component**

Create `src/features/campus-energy/components/participant-dashboard.tsx`:

```tsx
export function ParticipantDashboard() {
  return (
    <section className="border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-slate-950">Participant mode</h2>
      <p className="mt-2 text-sm text-slate-600">Affiliation points and character progress are added in Task 6.</p>
    </section>
  );
}
```

- [ ] **Step 8: Wire the route**

Replace `src/app/page.tsx` with:

```tsx
import { CampusEnergyApp } from "@/features/campus-energy/components/campus-energy-app";

export default function Home() {
  return <CampusEnergyApp mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""} />;
}
```

- [ ] **Step 9: Verify admin dashboard**

Run:

```powershell
npm run test
npm run lint
npm run build
```

Expected: tests pass, lint passes, build passes without a Mapbox token.

---

### Task 6: Participant Points And Character Surface

**Files:**
- Create: `src/features/campus-energy/components/character-card.tsx`
- Create: `src/features/campus-energy/components/group-rank-table.tsx`
- Modify: `src/features/campus-energy/components/participant-dashboard.tsx`

**Interfaces:**
- Consumes: `demoParticipant`, `demoGroups`, `getDemoGroupRankings()`, `getCharacterProgress(points)`.
- Produces: participant surface showing affiliation, group points, rankings, and character progress.

- [ ] **Step 1: Create character card**

Create `src/features/campus-energy/components/character-card.tsx`:

```tsx
import { Sparkles } from "lucide-react";
import type { CharacterProgress } from "../domain/types";

type CharacterCardProps = {
  progress: CharacterProgress;
  points: number;
};

export function CharacterCard({ progress, points }: CharacterCardProps) {
  return (
    <section className="border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center bg-emerald-700 text-white">
          <Sparkles className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">{progress.title}</p>
          <h2 className="text-2xl font-semibold text-emerald-950">Level {progress.level}</h2>
        </div>
      </div>
      <p className="mt-4 text-sm text-emerald-900">{points.toLocaleString()} total energy points</p>
      <div className="mt-3 h-3 bg-emerald-100">
        <div className="h-3 bg-emerald-600" style={{ width: `${progress.progressRate * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-emerald-800">
        {progress.currentLevelPoints} / {progress.nextLevelPoints} points to next level
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Create group ranking table**

Create `src/features/campus-energy/components/group-rank-table.tsx`:

```tsx
import type { AffiliationGroup, RankedEnergySubject } from "../domain/types";

type GroupRankTableProps = {
  groups: AffiliationGroup[];
  rankings: RankedEnergySubject[];
  selectedGroupId: string;
};

export function GroupRankTable({ groups, rankings, selectedGroupId }: GroupRankTableProps) {
  return (
    <div className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-950">Affiliation ranking</h2>
      </div>
      {rankings.map((ranking) => {
        const group = groups.find((item) => item.id === ranking.subjectId);
        if (!group) return null;

        return (
          <div
            key={group.id}
            className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 ${
              selectedGroupId === group.id ? "bg-blue-50" : ""
            }`}
          >
            <span className="text-sm font-semibold text-slate-500">#{ranking.rank}</span>
            <span>
              <span className="block text-sm font-semibold text-slate-950">{group.name}</span>
              <span className="block text-xs text-slate-500">{ranking.savingsKwh.toLocaleString()} kWh saved</span>
            </span>
            <span className="text-sm font-semibold text-emerald-700">{ranking.points.toLocaleString()} pts</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Replace participant dashboard**

Replace `src/features/campus-energy/components/participant-dashboard.tsx` with:

```tsx
import { demoGroups, demoParticipant, getDemoGroupRankings } from "../data/demo-campus";
import { getCharacterProgress } from "../domain/scoring";
import { CharacterCard } from "./character-card";
import { GroupRankTable } from "./group-rank-table";
import { MetricCard } from "./metric-card";

export function ParticipantDashboard() {
  const groupRankings = getDemoGroupRankings();
  const myGroup = demoGroups.find((group) => group.id === demoParticipant.groupId);
  const myRanking = groupRankings.find((ranking) => ranking.subjectId === demoParticipant.groupId);
  const points = myRanking?.points ?? 0;
  const progress = getCharacterProgress(points);

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_24rem]">
      <section className="grid content-start gap-4">
        <div className="border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-blue-700">My affiliation</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">{myGroup?.name ?? "Unassigned"}</h2>
          <p className="mt-2 text-sm text-slate-600">
            Points come from electricity saved against the forecast baseline.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="My points" value={points.toLocaleString()} tone="saving" />
          <MetricCard label="Saved energy" value={`${myRanking?.savingsKwh.toLocaleString() ?? "0"} kWh`} tone="saving" />
          <MetricCard label="Rank" value={`#${myRanking?.rank ?? "-"}`} />
        </div>
        <GroupRankTable groups={demoGroups} rankings={groupRankings} selectedGroupId={demoParticipant.groupId} />
      </section>
      <aside>
        <CharacterCard progress={progress} points={points} />
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Verify participant mode**

Run:

```powershell
npm run test
npm run lint
npm run build
```

Expected: tests pass, lint passes, build passes.

---

### Task 7: Product Polish And Final Verification

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `README.md`

**Interfaces:**
- Consumes: complete MVP app.
- Produces: polished metadata, consistent base styles, and verified local workflow.

- [ ] **Step 1: Update metadata**

Set `src/app/layout.tsx` metadata:

```tsx
export const metadata: Metadata = {
  title: "Campus Energy Management System",
  description: "Compare campus electricity usage against forecast and turn verified savings into participation points.",
};
```

Set the document language:

```tsx
<html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
```

- [ ] **Step 2: Update global CSS**

Replace `src/app/globals.css` with:

```css
@import "tailwindcss";

:root {
  --background: #f1f5f9;
  --foreground: #0f172a;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: "Geist", "Geist Fallback", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", "Geist Mono Fallback", ui-monospace, monospace;
}

html,
body {
  min-height: 100%;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans), Arial, Helvetica, sans-serif;
}

button,
input {
  font: inherit;
}
```

- [ ] **Step 3: Final verification**

Run:

```powershell
npm run test
npm run lint
npm run build
git diff --check
```

Expected: all commands exit with code `0`.

- [ ] **Step 4: Browser verification**

Run:

```powershell
npm run dev
```

Expected with no token: admin map area shows the Mapbox token configuration state and all non-map dashboard data renders.

Expected with token: map renders centered on Yeungnam University, colored subject markers appear, clicking a marker changes the selected building, admin metrics stay visible, participant tab shows group points and character level.

- [ ] **Step 5: Local checkpoint**

Run:

```powershell
git status --short
```

Expected: changes are limited to the MVP implementation files, docs, and dependency lockfiles. Do not commit unless the user asks.

---

## Out Of Scope For This MVP

- Real electricity data ingestion
- Database schema
- Authentication
- Verified school membership
- LightGBM training or inference
- Multi-school onboarding UI
- Full RPG combat, movement, or inventory
- Production deployment

## Self-Review

- Spec coverage: The plan covers the confirmed two-surface product direction, shared energy comparison logic, mock actual and forecast data, Mapbox admin map, participant points, character progress, and verification.
- Plan marker scan: required implementation steps contain concrete filenames, code, commands, and expected results.
- Type consistency: `EnergySubject`, `EnergyReading`, `EnergyComparison`, `RankedEnergySubject`, `CharacterProgress`, `CampusEnergyApp`, `AdminDashboard`, and `ParticipantDashboard` are defined before use.
- Scope check: The MVP proves the product loop without database, auth, ML training, or full RPG scope.
