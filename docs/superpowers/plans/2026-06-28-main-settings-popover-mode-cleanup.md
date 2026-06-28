# 메인 설정 팝업 정리 · 모드 제거 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메인 지도의 설정 팝업에서 실제 구현과 맞지 않는 "모드(관리자 대시보드 ↔ 참여자 모드)" 전환을 제거해 지도를 단일 홈으로 만들고, 개인 데이터는 `/me` 프로필로 일원화한다.

**Architecture:** 현재 `CampusEnergyApp`은 `mode` 상태로 `AdminMapView`(지도)와 `ParticipantDashboard`(참여자 대시보드) 두 전체 화면을 토글한다. 참여자 대시보드는 이미 `/me` 프로필 페이지(포인트·레벨·연속일·성취·에너지 잔디·목표·영지 기여·포인트 내역)와 크게 겹친다. 이 계획은 모드 개념을 제거하고 지도를 유일한 홈으로 둔 뒤, 참여자 대시보드의 유일한 고유 기능인 "주간 절감 보상 받기" 버튼을 `/me`로 옮겨 기능을 보존하고, 이제 고아가 된 컴포넌트·i18n·데이터 로딩을 정리한다.

**Tech Stack:** Next.js 16.2.9 (App Router, RSC), React 19.2.4, TypeScript, Tailwind CSS v4, lucide-react, Vitest(jsdom).

## Global Constraints

- **Next.js 16은 학습 데이터와 다르다.** 코드 작성 전 `AGENTS.md` 규칙에 따라 `node_modules/next/dist/docs/`의 관련 문서를 먼저 확인한다(이 계획에서는 metadata/`generateMetadata`).
- **한국어가 기본 언어다.** 모든 UI 문자열은 `src/i18n/messages/ko.ts`와 `src/i18n/messages/en.ts`에 동일한 키 구조로 둔다. `Messages` 타입은 `ko.ts`에서 파생(`WidenMessageValues<typeof koMessages>`)되므로, ko에서 키를 지우면 타입이 자동으로 줄고 en도 같은 최상위 키를 유지해야 한다(`src/i18n/__tests__/messages.test.ts`가 `Object.keys(enMessages) === Object.keys(koMessages)`를 검사).
- **삭제하면 안 되는 것:** `messages.app.eyebrow`(루트 `layout.tsx` 메타데이터에서 사용), `getCharacterProgress`(`/me`·`ProfileHero`에서 사용), `getDemoGroupRankings`(`energy.test.ts`에서 사용).
- TDD: 의미 있는 단위는 실패 테스트 → 구현 → 통과. 삭제/배선 변경은 빌드·전체 스위트·grep로 검증한다.
- 각 Task 종료 시 빌드가 green이어야 한다. 태스크 단위로 커밋한다.
- 검증 명령: 대상 테스트 `npx vitest run <file>`, 전체 `npm run test`, `npm run lint`, `npm run build`.
- 신규 브랜치 생성·커밋·푸시·머지는 사용자가 명시적으로 지시할 때만 한다.

---

## File Structure

**Modify**
- `src/features/account/components/estate-contribution.tsx` — 선택적 `action` 슬롯 추가(이전될 보상 버튼 자리).
- `src/app/[locale]/me/page.tsx` — `EstateContribution`에 `<ClaimRewardButton />` 전달.
- `src/features/campus-energy/components/campus-energy-app.tsx` — `mode` 상태·참여자 분기 제거, 항상 지도 렌더.
- `src/features/campus-energy/components/admin-map-view.tsx` — `mode`/`onModeChange` prop 제거.
- `src/features/campus-energy/components/map-settings-popover.tsx` — 모드 Row·`ModeTabs` 제거, 제목 "설정".
- `src/features/campus-energy/__tests__/campus-energy-app.test.tsx` — 죽은 mock 정리(+ Task 5에서 account 헬퍼 축소).
- `src/i18n/messages/ko.ts`, `src/i18n/messages/en.ts` — 카피 변경·고아 키 제거·`mapView.title` 추가.
- `src/i18n/__tests__/messages.test.ts` — 제거된 키 단언 교체, `mapView.title` 단언 추가.
- `src/app/[locale]/page.tsx` — `generateMetadata`로 홈 제목 "캠퍼스 지도"(+ Task 5에서 account 축소).

**Create**
- `src/features/account/__tests__/estate-contribution.test.tsx`
- `src/features/campus-energy/__tests__/map-settings-popover.test.tsx`

**Delete (Task 3)**
- `src/features/campus-energy/components/mode-tabs.tsx`
- `src/features/campus-energy/components/app-header.tsx`
- `src/features/campus-energy/components/bottom-nav.tsx`
- `src/features/campus-energy/components/participant-dashboard.tsx`
- `src/features/campus-energy/components/group-rank-table.tsx`
- `src/features/campus-energy/components/character-card.tsx`
- `src/features/campus-energy/components/metric-card.tsx`
- `src/features/campus-energy/__tests__/bottom-nav.test.tsx`

---

## Task 1: 주간 절감 보상 버튼을 `/me`로 이전

참여자 대시보드를 지우기 **전에** 그 유일한 고유 기능(주간 절감 보상 받기 = `claim_period_reward` RPC)을 `/me`로 옮겨 보존한다. `EstateContribution`(그룹 영지 포인트 카드)은 보상이 들어가는 풀을 보여주므로, 그 카드 하단을 보상 버튼 자리로 쓴다. 결합을 피하기 위해 `EstateContribution`은 표현만 담당하고 버튼은 `action` 슬롯으로 주입한다.

**Files:**
- Modify: `src/features/account/components/estate-contribution.tsx`
- Modify: `src/app/[locale]/me/page.tsx`
- Test: `src/features/account/__tests__/estate-contribution.test.tsx` (create)

**Interfaces:**
- Produces: `EstateContribution(props: { personalPoints: number; groupPoolPoints: number; action?: ReactNode })` — `action`이 주어지면 카드 하단에 렌더.
- Consumes: 기존 `ClaimRewardButton`(`src/features/account/components/claim-reward-button.tsx`, props 없음), 기존 i18n `messages.account.reward.claim` = "이번 주 절감 보상 받기".

- [ ] **Step 1: 실패 테스트 작성** — `action` 슬롯이 렌더되는지 검증

`src/features/account/__tests__/estate-contribution.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { enMessages } from "@/i18n/messages/en";
import { EstateContribution } from "../components/estate-contribution";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("EstateContribution", () => {
  let root: Root | null;
  let container: HTMLDivElement;

  beforeEach(() => {
    root = null;
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    document.body.replaceChildren();
  });

  it("renders a provided action node and the contribution percent", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <I18nProvider locale="en" messages={enMessages}>
          <EstateContribution
            personalPoints={50}
            groupPoolPoints={200}
            action={<button type="button">claim</button>}
          />
        </I18nProvider>,
      );
    });

    const actionButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "claim",
    );
    expect(actionButton).toBeDefined();
    expect(container.textContent).toContain("25%"); // 50 / 200
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/features/account/__tests__/estate-contribution.test.tsx`
Expected: FAIL — `action`이 렌더되지 않아 `actionButton`이 `undefined`.

- [ ] **Step 3: `EstateContribution`에 `action` 슬롯 추가**

`src/features/account/components/estate-contribution.tsx` 상단 import에 `ReactNode` 추가:

```tsx
import { Sprout } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";
```

시그니처에 `action` 추가:

```tsx
export function EstateContribution({
  personalPoints,
  groupPoolPoints,
  action,
}: {
  personalPoints: number;
  groupPoolPoints: number;
  action?: ReactNode;
}) {
```

`section`을 닫기 직전(기존 도넛/수치 `div` 바로 다음)에 슬롯 렌더:

```tsx
      </div>
      {action ? <div className="mt-3">{action}</div> : null}
    </section>
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/features/account/__tests__/estate-contribution.test.tsx`
Expected: PASS

- [ ] **Step 5: `/me`에서 보상 버튼 주입**

`src/app/[locale]/me/page.tsx` import에 추가:

```tsx
import { ClaimRewardButton } from "@/features/account/components/claim-reward-button";
```

`EstateContribution` 호출에 `action` 전달:

```tsx
          <EstateContribution
            personalPoints={personalPoints}
            groupPoolPoints={groupPool.earnedPoints}
            action={<ClaimRewardButton />}
          />
```

- [ ] **Step 6: 빌드·타입 확인**

Run: `npm run build`
Expected: PASS (`/[locale]/me` 라우트 정상 생성). `ClaimRewardButton`은 클라이언트 컴포넌트라 RSC 페이지에서 정상 렌더된다.

- [ ] **Step 7: 커밋**

```bash
git add src/features/account/components/estate-contribution.tsx src/app/[locale]/me/page.tsx src/features/account/__tests__/estate-contribution.test.tsx
git commit -m "feat(me): move weekly saving-reward claim onto the profile page"
```

---

## Task 2: 지도를 단일 홈으로 + 설정 팝업 정리

`mode` 토글 자체를 제거한다. `CampusEnergyApp`은 항상 `AdminMapView`를 렌더하고, `AdminMapView`/`MapSettingsPopover`에서 `mode` 배선을 제거한다. 설정 팝업은 모드 Row를 없애고 제목을 "설정"으로 바꾼다. 이 단계에서 고아가 되는 컴포넌트 파일들(app-header 등)은 아직 삭제하지 않는다(Task 3) — import만 끊어도 빌드는 green.

**Files:**
- Modify: `src/features/campus-energy/components/map-settings-popover.tsx`
- Modify: `src/features/campus-energy/components/admin-map-view.tsx`
- Modify: `src/features/campus-energy/components/campus-energy-app.tsx`
- Modify: `src/features/campus-energy/__tests__/campus-energy-app.test.tsx`
- Modify: `src/i18n/messages/ko.ts`, `src/i18n/messages/en.ts` (팝업 제목 카피만)
- Test: `src/features/campus-energy/__tests__/map-settings-popover.test.tsx` (create)

**Interfaces:**
- Produces: `MapSettingsPopover(props: { open: boolean; onClose: () => void; showLabels: boolean; onToggleLabels: () => void })` — `mode`/`onModeChange` 제거됨.
- Produces: `AdminMapView` props에서 `mode`/`onModeChange` 제거됨(나머지 prop 동일).
- Consumes: i18n `messages.mapView.settings.title`(이 태스크에서 "설정"으로 변경), `messages.mapView.settings.theme`, `messages.mapView.settings.language`.

- [ ] **Step 1: 팝업 카피 변경(ko/en)**

`src/i18n/messages/ko.ts` — `mapView.controls.settings`와 `mapView.settings.title`을 "설정"으로:

```ts
      settings: "설정",
      myOrg: "내 조직",
      profile: "내 페이지",
    },
    settings: {
      title: "설정",
      theme: "테마",
      language: "언어",
      mode: "모드",
    },
```

> 참고: `mode: "모드"` 키는 이 태스크 이후 미사용이 되며 Task 3에서 제거한다.

`src/i18n/messages/en.ts` — 동일 위치:

```ts
      settings: "Settings",
      myOrg: "My organization",
      profile: "My page",
    },
    settings: {
      title: "Settings",
      theme: "Theme",
      language: "Language",
      mode: "Mode",
    },
```

- [ ] **Step 2: 설정 팝업 실패 테스트 작성**

`src/features/campus-energy/__tests__/map-settings-popover.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapSettingsPopover } from "../components/map-settings-popover";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    messages: {
      mapView: {
        popup: { close: "닫기" },
        settings: { title: "설정", theme: "테마", language: "언어" },
      },
    },
  }),
}));

vi.mock("@/features/theme/theme-switcher", () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher" />,
}));
vi.mock("../components/language-switcher", () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));
vi.mock("../components/map-display-toggles", () => ({
  MapDisplayToggles: () => <div data-testid="map-display-toggles" />,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("MapSettingsPopover", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("renders theme/language settings without any mode switch", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => {
      root.render(
        <MapSettingsPopover
          open
          onClose={() => {}}
          showLabels
          onToggleLabels={() => {}}
        />,
      );
    });

    expect(container.textContent).toContain("설정");
    expect(container.textContent).toContain("테마");
    expect(container.textContent).toContain("언어");
    expect(container.textContent).not.toContain("모드");
    expect(container.textContent).not.toContain("관리자");
    expect(container.textContent).not.toContain("참여자");
    expect(
      container.querySelector('[data-testid="theme-switcher"]'),
    ).not.toBeNull();

    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run src/features/campus-energy/__tests__/map-settings-popover.test.tsx`
Expected: FAIL — 현재 컴포넌트는 `mode`/`onModeChange`가 필수 prop이라 타입/렌더가 새 호출과 맞지 않고 "모드" 텍스트가 남아 있음.

- [ ] **Step 4: `MapSettingsPopover` 재작성(모드 제거)**

`src/features/campus-energy/components/map-settings-popover.tsx` 전체를 다음으로 교체:

```tsx
"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeSwitcher } from "@/features/theme/theme-switcher";
import { useI18n } from "@/i18n/client";
import { LanguageSwitcher } from "./language-switcher";
import { MapDisplayToggles } from "./map-display-toggles";

type MapSettingsPopoverProps = {
  open: boolean;
  onClose: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
};

export function MapSettingsPopover({
  open,
  onClose,
  showLabels,
  onToggleLabels,
}: MapSettingsPopoverProps) {
  const { messages } = useI18n();
  const settings = messages.mapView.settings;

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label={messages.mapView.popup.close}
        onClick={onClose}
        className="absolute inset-0 z-[60] cursor-default bg-canvas/40 backdrop-blur-[1px]"
      />
      <div
        role="dialog"
        aria-label={settings.title}
        className="absolute left-1/2 top-1/2 z-[61] w-72 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-4 shadow-pop"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-ink">{settings.title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={messages.mapView.popup.close}
            className="grid h-7 w-7 place-items-center rounded-lg bg-surface-3 text-ink-subtle transition hover:text-ink"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
        <div className="sm:hidden">
          <MapDisplayToggles
            showLabels={showLabels}
            onToggleLabels={onToggleLabels}
          />
          <div className="my-1 h-px bg-line" aria-hidden="true" />
        </div>
        <Row label={settings.theme}>
          <ThemeSwitcher />
        </Row>
        <Row label={settings.language}>
          <LanguageSwitcher />
        </Row>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </div>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/features/campus-energy/__tests__/map-settings-popover.test.tsx`
Expected: PASS

- [ ] **Step 6: `AdminMapView`에서 `mode` 배선 제거**

`src/features/campus-energy/components/admin-map-view.tsx`:

`type Mode = "admin" | "participant";` 줄을 **삭제**.

`AdminMapViewProps`에서 두 줄 **삭제**:

```tsx
  mode: Mode;
  onModeChange: (mode: Mode) => void;
```

함수 구조분해에서 `mode,`와 `onModeChange,` **삭제**(나머지 동일):

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
}: AdminMapViewProps) {
```

파일 하단 `MapSettingsPopover` 호출에서 `mode`/`onModeChange` prop **삭제**:

```tsx
      <MapSettingsPopover
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((value) => !value)}
      />
```

- [ ] **Step 7: `CampusEnergyApp`을 지도 단일 렌더로 단순화**

`src/features/campus-energy/components/campus-energy-app.tsx` 전체를 다음으로 교체(참여자 분기·`mode` 상태·`AppHeader`/`BottomNav`/`ParticipantDashboard`/`SignOutButton`/`ParticipantProfile` import 제거):

```tsx
"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/types";
import type { SubjectContributorRankings } from "@/features/account/domain/contributor-ranking";
import { getDemoEnergyComparisons } from "../data/demo-campus";
import { localizeDemoCampus } from "../data/localized-demo-campus";
import { resolveInitialMainSubjectId } from "../domain/initial-subject";
import { AdminMapView } from "./admin-map-view";
import { CampusEnergyProviders } from "./campus-energy-providers";

export type CampusEnergyAccount = {
  displayName: string;
  groupId: string;
  personalPoints: number;
  groupPoolPoints: number;
  groupMemberCount: number;
  orgSubjectId: string | null;
};

type CampusEnergyAppProps = {
  locale: Locale;
  mapboxToken: string;
  messages: Messages;
  contributorRankings: SubjectContributorRankings;
  account: CampusEnergyAccount;
};

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

function CampusEnergyShell({
  mapboxToken,
  contributorRankings,
  account,
}: {
  mapboxToken: string;
  contributorRankings: SubjectContributorRankings;
  account: CampusEnergyAccount;
}) {
  const { locale, messages } = useI18n();
  const comparisons = useMemo(() => getDemoEnergyComparisons(), []);
  const localizedDemo = useMemo(
    () => localizeDemoCampus(locale, messages),
    [locale, messages],
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState(() =>
    resolveInitialMainSubjectId(account.orgSubjectId, localizedDemo.subjects),
  );

  return (
    <div className="fixed inset-0 bg-canvas text-ink">
      <AdminMapView
        mapboxToken={mapboxToken}
        orgSubjectId={account.orgSubjectId}
        school={localizedDemo.school}
        subjects={localizedDemo.subjects}
        comparisons={comparisons}
        contributorRankings={contributorRankings}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={setSelectedSubjectId}
      />
    </div>
  );
}
```

> 참고: `CampusEnergyAccount`의 `displayName/groupId/personalPoints/groupPoolPoints/groupMemberCount`는 이제 셸에서 미사용이지만, 타입·홈 로더 정리는 Task 5에서 한다(여기서는 빌드 green 유지가 우선).

- [ ] **Step 8: `campus-energy-app.test.tsx`의 죽은 mock 정리**

`src/features/campus-energy/__tests__/campus-energy-app.test.tsx`에서 더 이상 SUT가 import하지 않는 mock 4개를 **삭제**(`admin-map-view` mock은 유지):

```tsx
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
```

> 이 4개 블록을 지운다. 이유: SUT가 더 이상 해당 모듈을 import하지 않고, Task 3에서 실제 파일이 삭제되면 존재하지 않는 경로를 가리키는 `vi.mock`이 남아 해석 오류가 날 수 있다. 기존 3개 테스트(조직 건물 자동선택/미선택/사용자 해제 유지)는 그대로 둔다 — `AdminMapView`가 항상 렌더되므로 계속 통과한다.

- [ ] **Step 9: 대상 테스트·빌드 확인**

Run: `npx vitest run src/features/campus-energy/__tests__/campus-energy-app.test.tsx src/features/campus-energy/__tests__/map-settings-popover.test.tsx`
Expected: PASS (둘 다)

Run: `npm run build`
Expected: PASS

- [ ] **Step 10: 커밋**

```bash
git add src/features/campus-energy/components/map-settings-popover.tsx src/features/campus-energy/components/admin-map-view.tsx src/features/campus-energy/components/campus-energy-app.tsx src/features/campus-energy/__tests__/campus-energy-app.test.tsx src/features/campus-energy/__tests__/map-settings-popover.test.tsx src/i18n/messages/ko.ts src/i18n/messages/en.ts
git commit -m "feat(map): drop the mode toggle and make the campus map the single home"
```

---

## Task 3: 고아 컴포넌트 삭제 + 모드 i18n 정리

Task 2 이후 더 이상 import되지 않는 컴포넌트와, 모드/참여자 대시보드 전용 i18n 키를 제거한다.

**Files:**
- Delete: `mode-tabs.tsx`, `app-header.tsx`, `bottom-nav.tsx`, `participant-dashboard.tsx`, `group-rank-table.tsx`, `character-card.tsx`, `metric-card.tsx`(모두 `src/features/campus-energy/components/`), `src/features/campus-energy/__tests__/bottom-nav.test.tsx`
- Modify: `src/i18n/messages/ko.ts`, `src/i18n/messages/en.ts`
- Modify: `src/i18n/__tests__/messages.test.ts`

- [ ] **Step 1: 고아 참조가 없는지 먼저 확인**

Run: `npx rg -n "ModeTabs|AppHeader|BottomNav|ParticipantDashboard|GroupRankTable|CharacterCard|MetricCard|messages\.modes|messages\.participant|messages\.me\.openMyPage" src`
Expected: `participant-dashboard.tsx`(MetricCard/GroupRankTable/CharacterCard/messages.participant/messages.me.openMyPage), `app-header.tsx`(ModeTabs), `bottom-nav.tsx`/`mode-tabs.tsx`(messages.modes), `group-rank-table.tsx`(messages.participant), `bottom-nav.test.tsx`만 나와야 한다. 즉 **삭제 대상 파일 안에서만** 서로를 참조해야 한다. 다른 파일(예: `admin-map-view`, `campus-energy-app`, `/me`)에서 나오면 멈추고 그 참조를 먼저 처리한다.

- [ ] **Step 2: 고아 컴포넌트·테스트 파일 삭제**

```bash
git rm src/features/campus-energy/components/mode-tabs.tsx \
  src/features/campus-energy/components/app-header.tsx \
  src/features/campus-energy/components/bottom-nav.tsx \
  src/features/campus-energy/components/participant-dashboard.tsx \
  src/features/campus-energy/components/group-rank-table.tsx \
  src/features/campus-energy/components/character-card.tsx \
  src/features/campus-energy/components/metric-card.tsx \
  src/features/campus-energy/__tests__/bottom-nav.test.tsx
```

- [ ] **Step 3: 모드/참여자 i18n 키 제거 (ko)**

`src/i18n/messages/ko.ts`에서 다음을 제거:

1) `mapView.settings.mode` 줄 삭제:

```ts
    settings: {
      title: "설정",
      theme: "테마",
      language: "언어",
    },
```

2) 최상위 `modes` 블록 전체 삭제:

```ts
  modes: {
    admin: "관리자 대시보드",
    participant: "참여자 모드",
  },
```

3) 최상위 `participant` 블록 전체 삭제(`affiliationRanking`/`myAffiliation`/`myPoints`/`savedEnergy`/`rank`/`savedLine`/`pointsDescription`/`unassigned` 등 포함 — `participant:`부터 짝 맞는 닫는 중괄호까지).

4) `me.openMyPage` 줄 삭제:

```ts
    backToMap: "지도로",
    goals: {
```

- [ ] **Step 4: 모드/참여자 i18n 키 제거 (en, ko와 동일 구조)**

`src/i18n/messages/en.ts`에서 ko와 같은 위치를 제거: `mapView.settings.mode`, 최상위 `modes` 블록, 최상위 `participant` 블록, `me.openMyPage`.

> 최상위 `modes`·`participant`를 **ko·en 양쪽 모두** 동일하게 제거해야 `messages.test.ts`의 `Object.keys(enMessages) === Object.keys(koMessages)`가 유지된다.

- [ ] **Step 5: `messages.test.ts`의 제거된 키 단언 교체**

`src/i18n/__tests__/messages.test.ts`에서 `modes`를 참조하는 단언을 교체:

```ts
  it("keeps Korean as the source/default language", () => {
    expect(koMessages.app.eyebrow).toBe("캠퍼스 에너지 관리 시스템");
    expect(koMessages.mapView.settings.title).toBe("설정");
  });
```

- [ ] **Step 6: 전체 검증**

Run: `npm run build`
Expected: PASS (남은 깨진 import가 있으면 여기서 잡힌다)

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: 0 errors (기존 `game-preview.tsx` 경고 2개만)

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "refactor(campus-energy): remove participant-mode components and dead i18n"
```

---

## Task 4: "캠퍼스 지도" 명칭 부여 (홈 메타데이터)

모드 제거로 "관리자 대시보드" 문자열은 사라졌다. 사용자가 고른 새 명칭 "캠퍼스 지도"를 메인 화면의 실제 슬롯(브라우저 탭 제목 = 홈 라우트 메타데이터)에 부여한다. 루트 `layout.tsx`는 모든 페이지 제목을 `app.eyebrow`로 두는데, Next.js의 metadata 병합 규칙상 홈 `page.tsx`의 `generateMetadata`가 홈 라우트에 한해 제목을 덮어쓴다.

**Files:**
- Modify: `src/i18n/messages/ko.ts`, `src/i18n/messages/en.ts`
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/i18n/__tests__/messages.test.ts`

**Interfaces:**
- Produces: i18n `messages.mapView.title` = "캠퍼스 지도" / "Campus map".

- [ ] **Step 1: Next.js metadata 문서 확인(AGENTS.md 규칙)**

Run: `npx rg -l "generateMetadata|export const metadata" node_modules/next/dist/docs`
그중 metadata 관련 문서를 열어 `generateMetadata` 시그니처와 제목 병합/오버라이드 동작을 확인한다. 코드 작성 전 필수.

- [ ] **Step 2: `mapView.title` 추가 (ko/en)**

`src/i18n/messages/ko.ts` — `mapView` 블록 안 `controls` 앞에 추가(예시 위치):

```ts
  mapView: {
    title: "캠퍼스 지도",
```

`src/i18n/messages/en.ts` — 동일 위치:

```ts
  mapView: {
    title: "Campus map",
```

> `mapView`의 최상위 키만 늘어난다. `messages.test.ts`는 `mapView.controls`/`mapView.popup`의 키만 깊게 비교하므로 영향 없다.

- [ ] **Step 3: i18n 단언 추가 실패 확인**

`src/i18n/__tests__/messages.test.ts`의 첫 테스트에 단언 추가:

```ts
    expect(koMessages.mapView.title).toBe("캠퍼스 지도");
    expect(enMessages.mapView.title).toBe("Campus map");
```

Run: `npx vitest run src/i18n/__tests__/messages.test.ts`
Expected: Step 2를 끝냈다면 PASS. (TDD 순서를 엄격히 지키려면 Step 3의 단언을 먼저 추가해 FAIL을 본 뒤 Step 2를 적용한다.)

- [ ] **Step 4: 홈 라우트 `generateMetadata` 추가**

`src/app/[locale]/page.tsx` 상단 import에 `Metadata` 타입 추가:

```tsx
import type { Metadata } from "next";
```

`Home` 컴포넌트 위에 추가:

```tsx
export async function generateMetadata({
  params,
}: HomeProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);
  return { title: messages.mapView.title };
}
```

> `HomeProps`, `isLocale`, `getMessages`, `notFound`는 이미 import되어 있다.

- [ ] **Step 5: 검증**

Run: `npm run build`
Expected: PASS

Run: `npm run test`
Expected: PASS

(선택) dev에서 SSR 제목 실측:

Run: `npx rg -n "<title" <(curl -s localhost:3000/ko)` 또는 브라우저 탭에서 "캠퍼스 지도" 확인. dev 서버가 떠 있지 않으면 생략하고 빌드로 갈음.

- [ ] **Step 6: 커밋**

```bash
git add src/i18n/messages/ko.ts src/i18n/messages/en.ts src/app/[locale]/page.tsx src/i18n/__tests__/messages.test.ts
git commit -m "feat(map): name the home screen 캠퍼스 지도 via route metadata"
```

---

## Task 5 (선택, 권장): 미사용 계정 데이터 배선 정리

모드 제거로 `CampusEnergyApp`은 `account.orgSubjectId`만 사용한다. 홈 로더(`page.tsx`)가 참여자 대시보드용으로만 가져오던 개인 포인트·그룹 풀 조회를 제거해 불필요한 DB 호출을 없앤다. (`/me`는 자체적으로 같은 값을 다시 조회하므로 손실 없음.) 최소 변경만 원하면 Task 4에서 멈춰도 동작에는 문제가 없다.

**Files:**
- Modify: `src/features/campus-energy/components/campus-energy-app.tsx`
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/features/campus-energy/__tests__/campus-energy-app.test.tsx`

**Interfaces:**
- Produces: `CampusEnergyAccount = { orgSubjectId: string | null }`.

- [ ] **Step 1: 테스트 헬퍼를 축소된 account로 변경(실패 유도)**

`src/features/campus-energy/__tests__/campus-energy-app.test.tsx`의 `account` 헬퍼를 교체:

```tsx
function account(orgSubjectId: string | null): CampusEnergyAccount {
  return { orgSubjectId };
}
```

Run: `npx vitest run src/features/campus-energy/__tests__/campus-energy-app.test.tsx`
Expected: 타입상 `CampusEnergyAccount`가 아직 넓으므로 `tsc`/빌드에서 불일치. (vitest 자체는 통과할 수 있으니 Step 4의 `npm run build`로 타입을 확정한다.)

- [ ] **Step 2: `CampusEnergyAccount` 축소**

`src/features/campus-energy/components/campus-energy-app.tsx`의 타입을 교체:

```tsx
export type CampusEnergyAccount = {
  orgSubjectId: string | null;
};
```

(셸 본문은 이미 `account.orgSubjectId`만 사용하므로 추가 변경 없음.)

- [ ] **Step 3: 홈 로더에서 미사용 조회 제거**

`src/app/[locale]/page.tsx`에서 `getPersonalPointTotal`·`getGroupPointPool` import와 호출을 제거하고, `account` 객체를 축소한다. `Promise.all`을 다음으로 교체:

```tsx
  const [messages, orgSubjectId, contributorRankings] = await Promise.all([
    getMessages(locale),
    getGroupEstateSubjectId(profile.groupId),
    getSubjectContributorRankings(),
  ]);

  return (
    <CampusEnergyApp
      locale={locale}
      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""}
      messages={messages}
      contributorRankings={contributorRankings}
      account={{ orgSubjectId }}
    />
  );
```

import 문에서 `getPersonalPointTotal`, `getGroupPointPool` 제거(`getCurrentProfile`, `getCurrentUser`, `getGroupEstateSubjectId`, `getSubjectContributorRankings`는 유지).

- [ ] **Step 4: 검증**

Run: `npm run build`
Expected: PASS (타입 축소가 모두 일관)

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: 0 errors (기존 경고 2개만)

- [ ] **Step 5: 커밋**

```bash
git add src/features/campus-energy/components/campus-energy-app.tsx src/app/[locale]/page.tsx src/features/campus-energy/__tests__/campus-energy-app.test.tsx
git commit -m "refactor(home): stop loading participant-only data for the map shell"
```

---

## Self-Review

**Spec coverage**
- "설정 팝업이 구현과 맞지 않음" → Task 2: 모드 Row 제거, 제목 "설정"으로(테마/언어/(모바일)라벨만 남김). ✓
- "관리자 대시보드 용어 변경" → Task 2/3: 모드 제거로 문자열 소멸 + Task 4: 메인 화면 명칭을 "캠퍼스 지도"로 부여. ✓
- "참여자 모드 제거(프로필이 있으니)" → Task 2/3: 모드·참여자 대시보드 제거, 개인 데이터는 `/me`로 일원화. ✓
- "그 외 수정" → Task 1(보상 기능 보존 이전), Task 3(고아 컴포넌트·i18n 정리), Task 5(미사용 데이터 로딩 정리). ✓

**Placeholder scan** — 모든 코드 스텝에 실제 코드 포함. "적절히 처리" 류 표현 없음. 삭제 스텝은 정확한 파일 목록과 사전 grep 가드 포함. ✓

**Type/name consistency**
- `MapSettingsPopover`/`AdminMapView`에서 `mode`/`onModeChange` 제거가 호출부(`admin-map-view`, `campus-energy-app`)와 일치. ✓
- `EstateContribution`의 `action?: ReactNode`가 `/me` 호출(`action={<ClaimRewardButton />}`)과 일치. ✓
- `Messages`는 `ko.ts` 파생 → ko에서 키 제거 시 타입 자동 축소, en은 최상위 키 동기. `messages.test.ts` 단언도 함께 갱신. ✓
- 보존 확인: `app.eyebrow`(layout), `getCharacterProgress`(/me·ProfileHero), `getDemoGroupRankings`(energy.test) 미삭제. ✓

**리스크 메모**
- `account.estatePool`(label/memberCount) i18n은 참여자 대시보드 제거 후 미사용이 되지만, `account` 공용 네임스페이스라 이번 범위에선 남겨둔다(무해). 원하면 후속 정리.
- 지도 라우트는 이 환경에서 프리뷰 스크린샷이 멈추는 기존 제약이 있어, 시각 확인은 사용자 dev/배포 몫. 검증은 테스트·빌드·SSR 제목으로 갈음.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-28-main-settings-popover-mode-cleanup.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
