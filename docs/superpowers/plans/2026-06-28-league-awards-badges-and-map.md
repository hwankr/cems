# 리그 수상 시스템 — Plan B: 우수 학생 뱃지 + 지도 건물 효과 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Depends on Plan A** (`2026-06-28-league-awards-core-and-hall-of-fame.md`): `src/features/leagues/domain/types.ts`(`AwardTier`/`SubjectAwardTiers`/`MyLeagueAward`)와 `src/features/leagues/data/leagues-dal.ts`(`getMyLeagueAwards`/`getSubjectAwardTiers`)가 이미 있어야 한다. 데모 리그가 이미 확정(`finalized`)되어 `student-services`=gold(건물 `yu-b04`), `humanities`=silver(`yu-c02`), `engineering`=bronze(`yu-e21~e24`), it1=학생 금상이어야 한다.

**Goal:** P2 — 1위팀 우수 학생에게 수여된 학생상을 `/me`의 잠긴 `top-student` 뱃지로 해금한다. P3 — 가장 최근 확정 리그의 수상 그룹이 소유한 건물을 메인 지도에서 티어색(금·은·동)으로 강조한다.

**Architecture:** 둘 다 Plan A가 만든 수상 기록을 *읽기만* 한다. P2는 `deriveAchievements`에 `hasTopStudentAward`를 추가하는 순수 함수 변경 + `/me` 로더가 `getMyLeagueAwards()`를 호출해 전달. P3은 `getSubjectAwardTiers()`를 홈 서버 컴포넌트에서 선조회해 `page → CampusEnergyApp → AdminMapView → CampusMap`으로 스레딩하고, `createEnergySubjectFeatureCollection`이 GeoJSON feature에 `awardTier` 속성을 실어 `mapbox-style.ts`의 extrusion/outline paint가 티어색을 우선 적용한다.

**Tech Stack:** Next.js 16(App Router, 서버 컴포넌트), React 19, TypeScript, Tailwind CSS v4, Mapbox GL JS, Vitest + jsdom.

## Global Constraints

- 읽기 전용 소비. 새 DB 객체·RPC 없음(Plan A의 `getMyLeagueAwards`/`getSubjectAwardTiers` 재사용).
- 기존 지도 동작(검색 dim, heat/label 토글, status 색)은 보존한다. 수상 효과는 status 색을 **덮어쓰되**(awardTier 우선) awardTier가 없으면 기존 status 색 그대로.
- 한국어 우선. 표시 문자열은 ko/en 양쪽.
- Next.js 코드 작성 전 `AGENTS.md`에 따라 `node_modules/next/dist/docs/` 확인(이 Plan은 기존 `Promise.all`/prop 스레딩 패턴 재사용이라 표면 작음).
- 검증 베이스라인: `npm run lint` errors 0(기존 `game-preview.tsx` 경고 2개만), `npm run test`/`npm run build` 통과.
- 지도 라우트는 Mapbox 지속 렌더로 프리뷰 스크린샷이 멈추는 기존 환경 제약이 있다 → 시각 확인은 사용자 dev/배포 몫, 검증은 단위테스트·빌드·DOM으로 갈음.

## File Structure

**Modify (P2):**
- `src/features/account/domain/achievements.ts` — `deriveAchievements`에 `hasTopStudentAward`(+옵션 `topStudentTier`) 입력.
- `src/features/account/__tests__/achievements.test.ts` — 케이스 추가.
- `src/features/account/components/achievement-highlights.tsx` — top-student 해금 시 금색 표시.
- `src/app/[locale]/me/page.tsx` — `getMyLeagueAwards` 로드 → `deriveAchievements`에 전달.

**Modify (P3):**
- `src/features/campus-energy/domain/geojson.ts` — `awardTier` feature 속성 + 시그니처 4번째 인자.
- `src/features/campus-energy/__tests__/geojson.test.ts` — awardTier 케이스.
- `src/features/campus-energy/components/mapbox-style.ts` — 티어 우선 extrusion/outline paint.
- `src/features/campus-energy/__tests__/mapbox-style.test.ts` — 티어색 케이스.
- `src/features/campus-energy/components/campus-map.tsx` — `subjectAwardTiers` prop → feature collection.
- `src/features/campus-energy/components/admin-map-view.tsx` — `subjectAwardTiers` prop → CampusMap.
- `src/features/campus-energy/components/campus-energy-app.tsx` — prop 스레딩.
- `src/app/[locale]/page.tsx` — `getSubjectAwardTiers()` 선조회 + prop.

---

# P2 — 우수 학생 뱃지

## Task 1: `deriveAchievements` 확장 (순수, TDD)

**Files:**
- Modify: `src/features/account/domain/achievements.ts`
- Test: `src/features/account/__tests__/achievements.test.ts`

- [ ] **Step 1: Update the test (failing)**

In `src/features/account/__tests__/achievements.test.ts`, add cases for the new input. Append inside the existing top-level `describe` (or add a new one):

```ts
import type { AwardTier } from "@/features/leagues/domain/types";

describe("deriveAchievements top-student award", () => {
  const base = { level: 1, longestStreak: 0, totalCheckIns: 0 };

  it("keeps top-student locked when there is no award", () => {
    const achievements = deriveAchievements(base);
    const top = achievements.find((a) => a.key === "top-student");
    expect(top).toEqual({ key: "top-student", earned: false, locked: true });
  });

  it("unlocks top-student when a student award exists", () => {
    const achievements = deriveAchievements({
      ...base,
      hasTopStudentAward: true,
      topStudentTier: "gold" as AwardTier,
    });
    const top = achievements.find((a) => a.key === "top-student");
    expect(top).toEqual({
      key: "top-student",
      earned: true,
      locked: false,
      tier: "gold",
    });
  });

  it("does not affect the other achievements", () => {
    const achievements = deriveAchievements({ ...base, hasTopStudentAward: true });
    expect(achievements.find((a) => a.key === "campus-saver")?.earned).toBe(true);
    expect(achievements).toHaveLength(6);
  });
});
```

(Existing tests call `deriveAchievements({ level, longestStreak, totalCheckIns })` without the new field — they must keep passing, so the new field is optional.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/account/__tests__/achievements.test.ts`
Expected: FAIL — `top-student` still `{earned:false, locked:true}` (no `tier`); new field ignored.

- [ ] **Step 3: Update the implementation**

Replace `src/features/account/domain/achievements.ts` with:

```ts
import type { AwardTier } from "@/features/leagues/domain/types";

export type AchievementKey =
  | "campus-saver"
  | "energy-hero"
  | "grid-guardian"
  | "streak-7"
  | "check-in-10"
  | "top-student";

export type Achievement = {
  key: AchievementKey;
  earned: boolean;
  locked: boolean; // future / admin-awarded, not yet available
  tier?: AwardTier; // set for an earned top-student award
};

export function deriveAchievements(input: {
  level: number;
  longestStreak: number;
  totalCheckIns: number;
  hasTopStudentAward?: boolean;
  topStudentTier?: AwardTier;
}): Achievement[] {
  const {
    level,
    longestStreak,
    totalCheckIns,
    hasTopStudentAward = false,
    topStudentTier,
  } = input;

  const topStudent: Achievement = hasTopStudentAward
    ? {
        key: "top-student",
        earned: true,
        locked: false,
        ...(topStudentTier ? { tier: topStudentTier } : {}),
      }
    : { key: "top-student", earned: false, locked: true };

  return [
    { key: "campus-saver", earned: true, locked: false },
    { key: "energy-hero", earned: level >= 5, locked: false },
    { key: "grid-guardian", earned: level >= 10, locked: false },
    { key: "streak-7", earned: longestStreak >= 7, locked: false },
    { key: "check-in-10", earned: totalCheckIns >= 10, locked: false },
    topStudent,
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/account/__tests__/achievements.test.ts`
Expected: PASS (existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/features/account/domain/achievements.ts src/features/account/__tests__/achievements.test.ts
git commit -m "feat(account): unlock top-student achievement from a league student award"
```

---

## Task 2: `AchievementHighlights` — 해금된 top-student 금색 표시

**Files:**
- Modify: `src/features/account/components/achievement-highlights.tsx`

- [ ] **Step 1: Show an earned top-student with a tier color**

In `src/features/account/components/achievement-highlights.tsx`, the `ring` is currently computed from `a.locked`/`active`. Update so an **earned top-student with a tier** uses a gold ring. Replace the `ring` computation block with:

```tsx
          const isEarnedTopStudent =
            a.key === "top-student" && a.earned && !a.locked;
          const ring = a.locked
            ? "border-dashed border-[var(--honey)] bg-[var(--honey-soft)] text-[var(--honey-strong)]"
            : isEarnedTopStudent
              ? "border-[#f5c518] bg-[#fdf3cf] text-[#a07a00]"
              : active
                ? "border-saving bg-saving-soft text-saving"
                : "border-line bg-inset text-ink-subtle";
```

(`active` is still defined as `a.earned && !a.locked` above; `isEarnedTopStudent` is a refinement for the gold tint. The `Icon` for a non-locked top-student is already `Award` via `ICONS`.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/account/components/achievement-highlights.tsx
git commit -m "feat(me): show the earned top-student badge in gold"
```

---

## Task 3: `/me` 로더 — 학생상 조회해 뱃지에 전달

**Files:**
- Modify: `src/app/[locale]/me/page.tsx`

- [ ] **Step 1: Load my league awards and pass to deriveAchievements**

In `src/app/[locale]/me/page.tsx`:

Add the DAL import near the other imports:

```ts
import { getMyLeagueAwards } from "@/features/leagues/data/leagues-dal";
```

Add `getMyLeagueAwards(profile.userId)` to the `Promise.all` (extend the destructure + array):

```ts
  const [
    messages,
    personalPoints,
    groupPool,
    events,
    goals,
    estateSubjectId,
    myLeagueAwards,
  ] = await Promise.all([
    getMessages(locale),
    getPersonalPointTotal(profile.userId),
    getGroupPointPool(profile.groupId),
    getMyPointEvents(profile.userId),
    getGoalsWithProgress(profile.userId),
    getGroupEstateSubjectId(profile.groupId),
    getMyLeagueAwards(profile.userId),
  ]);
```

Derive the top-student flag/tier (best = highest tier; gold < silver < bronze priority by rank order — pick the most recent which the DAL already returns first) just before `deriveAchievements`:

```ts
  const topStudentAward = myLeagueAwards[0] ?? null;
```

Update the `deriveAchievements` call:

```ts
  const achievements = deriveAchievements({
    level: getCharacterProgress(personalPoints).level,
    longestStreak: graph.longestStreak,
    totalCheckIns: countMissionCheckIns(events),
    hasTopStudentAward: Boolean(topStudentAward),
    ...(topStudentAward ? { topStudentTier: topStudentAward.tier } : {}),
  });
```

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npm run build`
Expected: success; `/[locale]/me` still builds.

- [ ] **Step 3: Live smoke (recommended)**

With `it@naver.com` (student-services, gold team, student gold award) logged in, open `/ko/me`: the `top-student` (최우수 학생) achievement is **earned in gold** (no longer the dashed "곧 공개" locked slot). A non-awarded account (e.g., a humanities/engineering guest) still shows it locked.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/me/page.tsx
git commit -m "feat(me): unlock the top-student badge from my league student award"
```

---

# P3 — 지도 건물 외관 효과

## Task 4: GeoJSON — `awardTier` feature 속성 (TDD)

**Files:**
- Modify: `src/features/campus-energy/domain/geojson.ts`
- Test: `src/features/campus-energy/__tests__/geojson.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/features/campus-energy/__tests__/geojson.test.ts`, add a case (adjust the imported `EnergySubject`/`EnergyComparison` fixtures to match the file's existing helpers; below assumes a polygon subject with geometry — reuse the file's existing fixture builders if present):

```ts
import type { SubjectAwardTiers } from "@/features/leagues/domain/types";

describe("createEnergySubjectFeatureCollection award tiers", () => {
  it("attaches awardTier to subjects present in the tiers map", () => {
    const subjects = [
      { id: "yu-b04", schoolId: "yu", campusId: "yu-main", type: "building", name: "도서관", shortName: "B04", lng: 128.75, lat: 35.83 },
      { id: "yu-x99", schoolId: "yu", campusId: "yu-main", type: "building", name: "기타", shortName: "X99", lng: 128.76, lat: 35.83 },
    ] as Parameters<typeof createEnergySubjectFeatureCollection>[0];
    const tiers: SubjectAwardTiers = {
      "yu-b04": { tier: "gold", leagueId: "L", leagueName: "리그" },
    };

    const fc = createEnergySubjectFeatureCollection(subjects, [], "", tiers);
    const b04 = fc.features.find((f) => f.properties.id === "yu-b04");
    const x99 = fc.features.find((f) => f.properties.id === "yu-x99");
    expect(b04?.properties.awardTier).toBe("gold");
    expect(x99?.properties.awardTier).toBeUndefined();
  });

  it("omits awardTier entirely when no tiers map is passed", () => {
    const subjects = [
      { id: "yu-b04", schoolId: "yu", campusId: "yu-main", type: "building", name: "도서관", shortName: "B04", lng: 128.75, lat: 35.83 },
    ] as Parameters<typeof createEnergySubjectFeatureCollection>[0];
    const fc = createEnergySubjectFeatureCollection(subjects, [], "");
    expect(fc.features[0]?.properties.awardTier).toBeUndefined();
  });
});
```

(`createEnergySubjectFeatureCollection` must already be imported at the top of the existing test file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/campus-energy/__tests__/geojson.test.ts`
Expected: FAIL — 4th argument not accepted / `awardTier` undefined.

- [ ] **Step 3: Update geojson.ts**

In `src/features/campus-energy/domain/geojson.ts`:

Add the import at the top:

```ts
import type { AwardTier, SubjectAwardTiers } from "@/features/leagues/domain/types";
```

Add `awardTier` to the properties type (after `selected`):

```ts
export type EnergySubjectFeatureProperties = {
  id: string;
  name: string;
  shortName: string;
  type: EnergySubject["type"];
  status: EnergyStatus;
  deltaKwh: number;
  selected: boolean;
  awardTier?: AwardTier;
  officialCode?: string;
  // …rest unchanged…
  displayHeightMeters?: number;
  aboveGroundFloors?: number;
  basementFloors?: number;
  floorCountSource?: FloorCountSource;
  heightSource?: BuildingHeightSource;
  footprintSource?: FootprintSource;
  footprintConfidence?: FootprintConfidence;
};
```

Update the function signature + property assignment. Change:

```ts
export function createEnergySubjectFeatureCollection(
  subjects: EnergySubject[],
  comparisons: EnergyComparison[],
  selectedSubjectId: string,
  awardTiers?: SubjectAwardTiers,
): EnergySubjectFeatureCollection {
```

Then, right after `properties` is built (after the `selected:` line block, before the `officialCode` `if`), add:

```ts
      const awardTier = awardTiers?.[subject.id]?.tier;
      if (awardTier) {
        properties.awardTier = awardTier;
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/campus-energy/__tests__/geojson.test.ts`
Expected: PASS (new + existing).

- [ ] **Step 5: Commit**

```bash
git add src/features/campus-energy/domain/geojson.ts src/features/campus-energy/__tests__/geojson.test.ts
git commit -m "feat(map): attach awardTier to energy subject GeoJSON features"
```

---

## Task 5: Mapbox paint — 티어색 우선 extrusion/outline (TDD)

**Files:**
- Modify: `src/features/campus-energy/components/mapbox-style.ts`
- Test: `src/features/campus-energy/__tests__/mapbox-style.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/features/campus-energy/__tests__/mapbox-style.test.ts`, add (the file already imports the paint constants — add the import if needed):

```ts
import {
  ENERGY_SUBJECT_EXTRUSION_PAINT,
  ENERGY_SUBJECT_EXTRUSION_PAINT_LIGHT,
  ENERGY_SUBJECT_OUTLINE_PAINT,
} from "../components/mapbox-style";

describe("award tier paint", () => {
  it("extrusion color includes gold/silver/bronze tier colors", () => {
    const dark = JSON.stringify(ENERGY_SUBJECT_EXTRUSION_PAINT["fill-extrusion-color"]);
    const light = JSON.stringify(ENERGY_SUBJECT_EXTRUSION_PAINT_LIGHT["fill-extrusion-color"]);
    for (const paint of [dark, light]) {
      expect(paint).toContain("awardTier");
      expect(paint).toContain("#f5c518"); // gold
      expect(paint).toContain("#c3cad3"); // silver
      expect(paint).toContain("#cd7f32"); // bronze
    }
  });

  it("outline color reacts to awardTier", () => {
    const outline = JSON.stringify(ENERGY_SUBJECT_OUTLINE_PAINT["line-color"]);
    expect(outline).toContain("awardTier");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/campus-energy/__tests__/mapbox-style.test.ts`
Expected: FAIL — paint expressions don't mention `awardTier` yet.

- [ ] **Step 3: Update mapbox-style.ts**

In `src/features/campus-energy/components/mapbox-style.ts`, wrap the existing status `match` expressions with an award-tier `match` that falls back to status. Replace the three paint constants' color expressions:

`ENERGY_SUBJECT_EXTRUSION_PAINT` `fill-extrusion-color`:

```ts
    "fill-extrusion-color": [
      "match",
      ["coalesce", ["get", "awardTier"], ""],
      "gold",
      "#f5c518",
      "silver",
      "#c3cad3",
      "bronze",
      "#cd7f32",
      ["match", ["get", "status"], "saving", "#10b981", "overuse", "#f43f5e", "#64748b"],
    ],
```

`ENERGY_SUBJECT_EXTRUSION_PAINT_LIGHT` `fill-extrusion-color`:

```ts
    "fill-extrusion-color": [
      "match",
      ["coalesce", ["get", "awardTier"], ""],
      "gold",
      "#f5c518",
      "silver",
      "#c3cad3",
      "bronze",
      "#cd7f32",
      ["match", ["get", "status"], "saving", "#10b981", "overuse", "#f43f5e", "#a8b3c4"],
    ],
```

`ENERGY_SUBJECT_OUTLINE_PAINT` `line-color` and `line-width`:

```ts
  "line-color": [
    "match",
    ["coalesce", ["get", "awardTier"], ""],
    "gold",
    "#caa204",
    "silver",
    "#9aa3ad",
    "bronze",
    "#a8651f",
    ["match", ["get", "status"], "saving", "#10b981", "overuse", "#e11d48", "#475569"],
  ],
  "line-opacity": ["case", ["get", "selected"], 0.95, 0.6],
  "line-width": [
    "case",
    ["has", "awardTier"],
    ["case", ["get", "selected"], 4, 2.6],
    ["case", ["get", "selected"], 3, 1.2],
  ],
```

(Awarded buildings get a slightly thicker, tier-colored outline so the effect reads even at a glance. Non-awarded buildings keep the existing status outline/width.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/campus-energy/__tests__/mapbox-style.test.ts`
Expected: PASS (new + existing). If the existing tests assert the exact old expression shape, update those assertions to the new nested expression (the status colors are unchanged as the fallback).

- [ ] **Step 5: Commit**

```bash
git add src/features/campus-energy/components/mapbox-style.ts src/features/campus-energy/__tests__/mapbox-style.test.ts
git commit -m "feat(map): tint awarded buildings gold/silver/bronze in extrusion and outline paint"
```

---

## Task 6: `CampusMap` — `subjectAwardTiers` prop → feature collection

**Files:**
- Modify: `src/features/campus-energy/components/campus-map.tsx`

- [ ] **Step 1: Add the prop and thread it into the feature collection**

In `src/features/campus-energy/components/campus-map.tsx`:

Add the type import:

```ts
import type { SubjectAwardTiers } from "@/features/leagues/domain/types";
```

Add to `CampusMapProps` (after `comparisons`):

```ts
  subjectAwardTiers?: SubjectAwardTiers;
```

Add it to the destructured params (after `comparisons`):

```ts
    subjectAwardTiers,
```

Pass it into the memoized feature collection — update the `useMemo`:

```ts
    const featureCollection = useMemo(
      () =>
        createEnergySubjectFeatureCollection(
          subjects,
          comparisons,
          selectedSubjectId,
          subjectAwardTiers,
        ),
      [comparisons, selectedSubjectId, subjects, subjectAwardTiers],
    );
```

(The `useEffect` that calls `setData(featureCollection)` already re-runs when `featureCollection` changes, so awarded tints appear once the data loads. No layer/source changes needed — the paint reads the new `awardTier` property.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/campus-energy/components/campus-map.tsx
git commit -m "feat(map): pass subject award tiers into the campus map feature collection"
```

---

## Task 7: 스레딩 — page → app → admin-map-view → campus-map

**Files:**
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/features/campus-energy/components/campus-energy-app.tsx`
- Modify: `src/features/campus-energy/components/admin-map-view.tsx`

- [ ] **Step 1: Prefetch in the home server component**

In `src/app/[locale]/page.tsx`:

Add the DAL import:

```ts
import { getSubjectAwardTiers } from "@/features/leagues/data/leagues-dal";
```

Add `getSubjectAwardTiers()` to the `Promise.all` (extend destructure + array):

```ts
  const [messages, orgSubjectId, contributorRankings, subjectAwardTiers] =
    await Promise.all([
      getMessages(locale),
      getGroupEstateSubjectId(profile.groupId),
      getSubjectContributorRankings(),
      getSubjectAwardTiers(),
    ]);
```

Pass the prop to `CampusEnergyApp`:

```tsx
    <CampusEnergyApp
      locale={locale}
      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""}
      messages={messages}
      contributorRankings={contributorRankings}
      subjectAwardTiers={subjectAwardTiers}
      account={{ orgSubjectId }}
    />
```

- [ ] **Step 2: Thread through `CampusEnergyApp`**

In `src/features/campus-energy/components/campus-energy-app.tsx`:

Add the type import:

```ts
import type { SubjectAwardTiers } from "@/features/leagues/domain/types";
```

Add to `CampusEnergyAppProps`:

```ts
  subjectAwardTiers: SubjectAwardTiers;
```

Add to the `CampusEnergyApp` destructure + pass to `CampusEnergyShell`:

```tsx
export function CampusEnergyApp({
  locale,
  mapboxToken,
  messages,
  contributorRankings,
  subjectAwardTiers,
  account,
}: CampusEnergyAppProps) {
  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <CampusEnergyShell
        mapboxToken={mapboxToken}
        contributorRankings={contributorRankings}
        subjectAwardTiers={subjectAwardTiers}
        account={account}
      />
    </CampusEnergyProviders>
  );
}
```

Update `CampusEnergyShell`'s params type + destructure:

```tsx
function CampusEnergyShell({
  mapboxToken,
  contributorRankings,
  subjectAwardTiers,
  account,
}: {
  mapboxToken: string;
  contributorRankings: SubjectContributorRankings;
  subjectAwardTiers: SubjectAwardTiers;
  account: CampusEnergyAccount;
}) {
```

Pass it to `AdminMapView`:

```tsx
      <AdminMapView
        mapboxToken={mapboxToken}
        orgSubjectId={account.orgSubjectId}
        school={localizedDemo.school}
        subjects={localizedDemo.subjects}
        comparisons={comparisons}
        contributorRankings={contributorRankings}
        subjectAwardTiers={subjectAwardTiers}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={setSelectedSubjectId}
      />
```

- [ ] **Step 3: Consume in `AdminMapView` and pass to `CampusMap`**

In `src/features/campus-energy/components/admin-map-view.tsx`:

Add the type import:

```ts
import type { SubjectAwardTiers } from "@/features/leagues/domain/types";
```

Add to `AdminMapViewProps` (after `contributorRankings`):

```ts
  subjectAwardTiers: SubjectAwardTiers;
```

Add to the destructure (after `contributorRankings`):

```ts
  subjectAwardTiers,
```

Pass to `<CampusMap>` (add the prop alongside the existing ones):

```tsx
      <CampusMap
        mapboxToken={mapboxToken}
        school={school}
        subjects={subjects}
        comparisons={comparisons}
        subjectAwardTiers={subjectAwardTiers}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={onSelectSubject}
        mapStyleUrl={STANDARD_MAP_STYLE}
        mapTheme={resolvedTheme}
        showLabels={showLabels}
        query={query}
        onSelectedScreenPositionChange={setPopupPosition}
      />
```

- [ ] **Step 4: Update the campus-energy-app test for the new required prop**

`src/features/campus-energy/__tests__/campus-energy-app.test.tsx` renders `CampusEnergyApp`; add the new required prop. Find the render call and add `subjectAwardTiers={{}}` (empty map) next to the existing `contributorRankings={…}` prop. (Same pattern used when `contributorRankings` was introduced.)

- [ ] **Step 5: Type-check, lint, build**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npm run lint`
Expected: 0 errors (2 pre-existing `game-preview.tsx` warnings).

Run: `npm run build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/page.tsx src/features/campus-energy/components/campus-energy-app.tsx src/features/campus-energy/components/admin-map-view.tsx src/features/campus-energy/__tests__/campus-energy-app.test.tsx
git commit -m "feat(map): wire subject award tiers from the server into the campus map"
```

---

## Task 8: 전체 검증 (Plan B)

**Files:** none (검증만).

- [ ] **Step 1: Full Vitest**

Run: `npm run test`
Expected: all pass, including updated `achievements`, `geojson`, `mapbox-style`, `campus-energy-app` tests.

- [ ] **Step 2: Lint + build**

Run: `npm run lint` → 0 errors (2 pre-existing warnings).
Run: `npm run build` → success.

- [ ] **Step 3: Live smoke (recommended)**

With `it@naver.com` logged in:
- `/ko/me`: `top-student` 뱃지가 금색 해금.
- 지도: 중앙도서관(`yu-b04`)이 금색, 인문대(`yu-c02`) 은색, 공대 4개(`yu-e21~e24`) 동색 extrusion + 티어 외곽선. 검색·heat·label 토글은 정상. (지도 스크린샷이 멈추면 DOM/`__map` 소스 데이터로 awardTier 속성 확인.)

- [ ] **Step 4: Final commit (if fixups were needed)**

```bash
git add -A
git commit -m "test: verify league top-student badge and map award effect"
```

---

## Self-Review Notes (author)

- **Spec coverage (Plan B = P2 + P3):** P2 — `deriveAchievements` 해금(Task 1) + 금색 표시(Task 2) + `/me` 학생상 로드(Task 3). P3 — GeoJSON `awardTier`(Task 4) + 티어 paint(Task 5) + CampusMap prop(Task 6) + page→app→view 스레딩(Task 7). "수상 그룹의 모든 건물"은 `getSubjectAwardTiers`가 `estate_subjects`의 owning-group 매칭 전부를 반환하므로 충족(공대 4개 모두 동색).
- **Type consistency:** `AwardTier`/`SubjectAwardTiers`/`MyLeagueAward`는 Plan A의 `leagues/domain/types.ts`에서 import. `deriveAchievements` 입력에 추가한 `hasTopStudentAward`/`topStudentTier`는 선택적 → 기존 호출부(테스트 포함) 무변경 통과. `createEnergySubjectFeatureCollection`의 4번째 인자는 선택적 → 기존 호출부 호환(테스트 1곳만 awardTier 검증).
- **No placeholders:** 모든 코드 스텝에 실제 코드. 테스트·paint 식·스레딩 전부 완성. 티어 색(gold `#f5c518` / silver `#c3cad3` / bronze `#cd7f32`)을 spec과 일치시킴.
- **Preserved behavior:** 지도 검색 dim(`fill-extrusion-opacity`)·heat/label 토글·status 색은 그대로(awardTier가 없으면 fallback이 기존 status 색). 메달 글리프(이모지)는 Mapbox 폰트 글리프 위험으로 v1 제외(extrusion+outline 색으로 충분히 가시) — spec의 "가능 시 메달 글리프" 단서대로 색 강조로 대체.
- **Open follow-ups(범위 밖):** 라벨 메달 글리프/아이콘, 진행 중 리그의 "예상 순위" 지도 표시. → 후속.
