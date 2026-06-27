# Main Map Organization Default Subject Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the main map open on the logged-in user's organization building instead of the hard-coded demo building, and avoid showing any building popup when the user has no valid organization subject.

**Architecture:** Keep the server data flow unchanged: `src/app/[locale]/page.tsx` already resolves `orgSubjectId` with `getGroupEstateSubjectId(profile.groupId)` and passes it into the client app. Add a small pure resolver for the initial selected subject, then use it in `CampusEnergyShell` so the first `CampusMap` render receives the organization subject id. Do not add a client-side effect that reselects the organization after mount, because closing the popup intentionally sets the selection to an empty string.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.7, TypeScript, Vitest, Mapbox GL JS.

---

## Context

Read these files before editing:

- `docs/working/current-state.md`
- `docs/working/meeting-notes.md`
- `docs/README.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`

Current behavior:

- `src/app/[locale]/page.tsx` already loads the logged-in profile and passes `account.orgSubjectId` to `CampusEnergyApp`.
- `src/features/campus-energy/components/campus-energy-app.tsx` currently initializes `selectedSubjectId` with `demoDefaultSubjectId`, independent of the logged-in profile.
- `src/features/campus-energy/components/campus-map.tsx` flies to the selected subject and positions the building popup whenever `selectedSubjectId` resolves to a subject.
- `src/features/campus-energy/components/admin-map-view.tsx` already wires the "내 조직" rail control to `orgSubjectId`, so this plan does not change the control rail.

Target behavior:

- If `account.orgSubjectId` matches a subject in the localized demo subject list, the main map starts with that subject selected.
- If `account.orgSubjectId` is `null`, empty, or not present in the subject list, the main map starts with no selected building and no building popup.
- User-driven selections still work through map clicks, rank-panel clicks, and the existing "내 조직" control.
- Closing the building popup still calls `onSelectSubject("")` and must not be undone by a synchronization effect.

## File Structure

- Create `src/features/campus-energy/domain/initial-subject.ts`
  - Owns the pure initial-selection rule.
  - Keeps the rule testable without mounting Mapbox or reading Supabase.
- Create `src/features/campus-energy/__tests__/initial-subject.test.ts`
  - Covers organization subject, missing organization subject, and stale organization subject cases.
- Create `src/features/campus-energy/__tests__/campus-energy-app.test.tsx`
  - Mocks `AdminMapView` and checks that `CampusEnergyApp` passes the resolved initial `selectedSubjectId`.
- Modify `src/features/campus-energy/components/campus-energy-app.tsx`
  - Replace `demoDefaultSubjectId` initialization with `resolveInitialMainSubjectId(account.orgSubjectId, localizedDemo.subjects)`.
  - Remove the `demoDefaultSubjectId` import from this file.
- Do not modify `src/app/[locale]/page.tsx`
  - The server already fetches `orgSubjectId` correctly.
- Do not modify database migrations
  - Existing `estate_subjects.owner_group_id -> subject_id` data is enough for this behavior.

---

### Task 1: Add Pure Initial Subject Resolver

**Files:**
- Create: `src/features/campus-energy/domain/initial-subject.ts`
- Create: `src/features/campus-energy/__tests__/initial-subject.test.ts`

- [x] **Step 1: Write the failing resolver test**

Create `src/features/campus-energy/__tests__/initial-subject.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveInitialMainSubjectId } from "../domain/initial-subject";

const subjects = [
  { id: "yu-e21" },
  { id: "yu-b04" },
  { id: "yu-c02" },
];

describe("resolveInitialMainSubjectId", () => {
  it("uses the organization subject when it exists in the map data", () => {
    expect(resolveInitialMainSubjectId("yu-b04", subjects)).toBe("yu-b04");
  });

  it("starts with no building selected when the account has no organization subject", () => {
    expect(resolveInitialMainSubjectId(null, subjects)).toBe("");
    expect(resolveInitialMainSubjectId("", subjects)).toBe("");
  });

  it("starts with no building selected when the organization subject is not in the current map data", () => {
    expect(resolveInitialMainSubjectId("yu-missing", subjects)).toBe("");
  });
});
```

- [x] **Step 2: Run the resolver test and verify it fails**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/initial-subject.test.ts
```

Expected: FAIL with a module resolution error for `../domain/initial-subject`.

- [x] **Step 3: Implement the resolver**

Create `src/features/campus-energy/domain/initial-subject.ts`:

```ts
type SubjectIdentity = {
  id: string;
};

export function resolveInitialMainSubjectId(
  orgSubjectId: string | null | undefined,
  subjects: readonly SubjectIdentity[],
): string {
  if (!orgSubjectId) return "";

  return subjects.some((subject) => subject.id === orgSubjectId)
    ? orgSubjectId
    : "";
}
```

- [x] **Step 4: Run the resolver test and verify it passes**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/initial-subject.test.ts
```

Expected: PASS, 3 tests passing in `initial-subject.test.ts`.

- [x] **Step 5: Commit the resolver**

Run:

```powershell
git add src/features/campus-energy/domain/initial-subject.ts src/features/campus-energy/__tests__/initial-subject.test.ts
git commit -m "test: cover main map organization initial subject"
```

Expected: commit succeeds with only the two new resolver files staged.

---

### Task 2: Wire Organization Subject Into the Main Map Initial State

**Files:**
- Modify: `src/features/campus-energy/components/campus-energy-app.tsx`
- Create: `src/features/campus-energy/__tests__/campus-energy-app.test.tsx`

- [x] **Step 1: Write the failing app wiring test**

Create `src/features/campus-energy/__tests__/campus-energy-app.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { koMessages } from "@/i18n/messages/ko";
import {
  CampusEnergyApp,
  type CampusEnergyAccount,
} from "../components/campus-energy-app";

vi.mock("../components/admin-map-view", () => ({
  AdminMapView: ({
    selectedSubjectId,
  }: {
    selectedSubjectId: string;
  }) => (
    <div
      data-testid="admin-map-view"
      data-selected-subject-id={selectedSubjectId}
    />
  ),
}));

vi.mock("../components/participant-dashboard", () => ({
  ParticipantDashboard: () => <div data-testid="participant-dashboard" />,
}));

vi.mock("../components/bottom-nav", () => ({
  BottomNav: () => <nav data-testid="bottom-nav" />,
}));

vi.mock("../components/app-header", () => ({
  AppHeader: () => <header data-testid="app-header" />,
}));

vi.mock("@/features/account/components/sign-out-button", () => ({
  SignOutButton: () => <button type="button">Sign out</button>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function account(orgSubjectId: string | null): CampusEnergyAccount {
  return {
    displayName: "Test User",
    groupId: "student-services",
    personalPoints: 0,
    groupPoolPoints: 0,
    groupMemberCount: 1,
    orgSubjectId,
  };
}

async function renderApp(orgSubjectId: string | null) {
  const container = document.createElement("div");
  const root: Root = createRoot(container);
  document.body.append(container);

  await act(async () =>
    root.render(
      <CampusEnergyApp
        locale="ko"
        mapboxToken=""
        messages={koMessages}
        account={account(orgSubjectId)}
      />,
    ),
  );

  return { container, root };
}

describe("CampusEnergyApp", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("starts the admin map on the account organization building", async () => {
    const { container, root } = await renderApp("yu-b04");

    expect(
      container
        .querySelector('[data-testid="admin-map-view"]')
        ?.getAttribute("data-selected-subject-id"),
    ).toBe("yu-b04");

    await act(async () => root.unmount());
  });

  it("does not auto-select a demo building when the account has no organization building", async () => {
    const { container, root } = await renderApp(null);

    expect(
      container
        .querySelector('[data-testid="admin-map-view"]')
        ?.getAttribute("data-selected-subject-id"),
    ).toBe("");

    await act(async () => root.unmount());
  });
});
```

- [x] **Step 2: Run the app wiring test and verify it fails**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/campus-energy-app.test.tsx
```

Expected: FAIL because `selectedSubjectId` is still initialized from `demoDefaultSubjectId`.

- [x] **Step 3: Update the component imports**

In `src/features/campus-energy/components/campus-energy-app.tsx`, replace:

```ts
import {
  demoDefaultSubjectId,
  getDemoEnergyComparisons,
} from "../data/demo-campus";
```

with:

```ts
import { getDemoEnergyComparisons } from "../data/demo-campus";
import { resolveInitialMainSubjectId } from "../domain/initial-subject";
```

- [x] **Step 4: Reorder local demo creation before selected-state initialization**

In `CampusEnergyShell`, replace this block:

```tsx
  const { locale, messages } = useI18n();
  const [mode, setMode] = useState<Mode>("admin");
  const [selectedSubjectId, setSelectedSubjectId] =
    useState(demoDefaultSubjectId);
  const comparisons = useMemo(() => getDemoEnergyComparisons(), []);
  const localizedDemo = useMemo(
    () => localizeDemoCampus(locale, messages),
    [locale, messages],
  );
```

with:

```tsx
  const { locale, messages } = useI18n();
  const [mode, setMode] = useState<Mode>("admin");
  const comparisons = useMemo(() => getDemoEnergyComparisons(), []);
  const localizedDemo = useMemo(
    () => localizeDemoCampus(locale, messages),
    [locale, messages],
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState(() =>
    resolveInitialMainSubjectId(account.orgSubjectId, localizedDemo.subjects),
  );
```

Do not add a `useEffect` that watches `account.orgSubjectId`; that would reopen the popup after the user manually closes it with `onSelectSubject("")`.

- [x] **Step 5: Run the app wiring test and verify it passes**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/campus-energy-app.test.tsx
```

Expected: PASS, 2 tests passing in `campus-energy-app.test.tsx`.

- [x] **Step 6: Run both targeted tests together**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__/initial-subject.test.ts src/features/campus-energy/__tests__/campus-energy-app.test.tsx
```

Expected: PASS for both targeted files.

- [x] **Step 7: Commit the app wiring**

Run:

```powershell
git add src/features/campus-energy/components/campus-energy-app.tsx src/features/campus-energy/__tests__/campus-energy-app.test.tsx
git commit -m "fix: start main map on organization building"
```

Expected: commit succeeds with the component and app wiring test staged.

---

### Task 3: Verify the Full Main Map Flow

**Files:**
- No code files expected.
- Use existing files for verification only.

- [x] **Step 1: Run the campus-energy targeted test slice**

Run:

```powershell
npm run test -- src/features/campus-energy/__tests__
```

Expected: PASS for all campus-energy tests.

- [x] **Step 2: Run the full test suite**

Run:

```powershell
npm run test
```

Expected: PASS for the full Vitest suite.

- [x] **Step 3: Run lint**

Run:

```powershell
npm run lint
```

Expected: 0 ESLint errors. The current repo baseline may still show the known `src/features/campus-energy/components/game-preview.tsx` warnings; do not change that file for this task.

- [x] **Step 4: Run the production build**

Run:

```powershell
npm run build
```

Expected: build succeeds and the localized `/[locale]` route remains present.

- [x] **Step 5: Run whitespace verification**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors from the files changed in this plan.

- [x] **Step 6: Browser-check the logged-in map**

Run the app:

```powershell
npm run dev
```

Open `/ko` in a browser with a logged-in account that has an `estate_subjects` row. For the existing demo account `it@naver.com`, expected result: the first building popup and map focus correspond to the account's `orgSubjectId` rather than a hard-coded demo default.

Also test a user or mocked server response with `orgSubjectId = null`. Expected result: the map opens at the campus view with no selected building popup; the "내 조직" rail button is hidden because `MapControls` receives no `onGoToMyOrg`.

- [x] **Step 7: Confirm final git state**

Run:

```powershell
git status --short --branch
```

Expected: branch includes the two implementation commits from this plan, and only intentional files are changed. Preserve the existing untracked `.claude/launch.json`.

---

## Self-Review

- Spec coverage: The initial hard-coded building behavior is removed in Task 2; the user's organization building becomes the main selected building through `account.orgSubjectId`; missing organization mappings no longer fall back to IT or any demo building.
- Placeholder scan: This plan contains concrete file paths, code snippets, commands, and expected results.
- Type consistency: `resolveInitialMainSubjectId` accepts `string | null | undefined` plus `readonly { id: string }[]`, which matches `account.orgSubjectId` and `localizedDemo.subjects`.
- Scope check: No database migration, Mapbox layer change, i18n change, or control-rail redesign is included because existing server and UI wiring already provide those responsibilities.

Plan complete and saved to `docs/superpowers/plans/2026-06-27-main-map-org-default-subject.md`. Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. Inline Execution - execute tasks in this session using executing-plans, batch execution with checkpoints.
