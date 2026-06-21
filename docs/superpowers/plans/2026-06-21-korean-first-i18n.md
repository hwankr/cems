# Korean-First Internationalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기본 UI 언어를 한국어로 전환하고, 이후 설정 화면에서 언어를 바꿀 수 있도록 URL, 쿠키, 번역 사전, 클라이언트 컨텍스트 기반 다국어 구조를 만든다.

**Architecture:** Next.js 16 App Router의 `[locale]` 동적 세그먼트를 사용해 `/ko`, `/en` 경로를 제공하고, `src/proxy.ts`가 locale 없는 요청을 기본 한국어 또는 저장된 locale 쿠키로 리다이렉트한다. 서버 페이지가 locale별 메시지를 로드한 뒤 클라이언트 앱에 직렬화 가능한 메시지 객체를 전달하고, 클라이언트 컴포넌트는 `I18nProvider`/`useI18n`으로 같은 번역과 포맷터를 공유한다.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.4, TypeScript, Tailwind CSS v4, `next/server` Proxy, Vitest

---

## Context

- 기본 locale은 `ko`다.
- 초기 지원 locale은 `ko`, `en` 두 개로 둔다.
- 현재 설정 화면은 없으므로 헤더에 작은 언어 선택 컨트롤을 둔다. 이후 설정 화면이 생기면 같은 `localeCookieName`, `getLocalizedPath`, `LanguageSwitcher` 동작을 재사용한다.
- 새 런타임 dependency는 추가하지 않는다.
- 도메인 계산 로직은 언어와 분리한다. 사용자에게 보이는 문자열, 데모 학교/건물/소속 이름, 캐릭터 타이틀만 locale에 따라 바꾼다.
- 구현 전 확인한 로컬 Next.js 문서:
  - `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`

## File Structure

- Create: `src/i18n/config.ts` - supported locales, default locale, locale cookie name, guards.
- Create: `src/i18n/format.ts` - locale-aware number, kWh, signed kWh, points formatting.
- Create: `src/i18n/interpolate.ts` - small `{key}` template interpolation helper for translated sentences.
- Create: `src/i18n/routes.ts` - locale-preserving route helper used by the language selector.
- Create: `src/i18n/messages/ko.ts` - Korean default messages.
- Create: `src/i18n/messages/en.ts` - English messages checked against the Korean message shape.
- Create: `src/i18n/messages/types.ts` - `Messages` type derived from Korean source messages.
- Create: `src/i18n/dictionaries.ts` - server-only locale dictionary loader.
- Create: `src/i18n/client.tsx` - client provider and `useI18n` hook.
- Create: `src/i18n/__tests__/config.test.ts` - locale guard tests.
- Create: `src/i18n/__tests__/format.test.ts` - number/unit formatting tests.
- Create: `src/i18n/__tests__/interpolate.test.ts` - sentence interpolation tests.
- Create: `src/i18n/__tests__/routes.test.ts` - localized path tests.
- Create: `src/i18n/__tests__/messages.test.ts` - message shape and Korean default checks.
- Create: `src/features/campus-energy/data/localized-demo-campus.ts` - localized copy of demo school, groups, subjects, participant.
- Create: `src/features/campus-energy/__tests__/localized-demo-campus.test.ts` - localized demo data tests.
- Create: `src/features/campus-energy/components/language-switcher.tsx` - reusable language selector, currently placed in the header.
- Create: `src/proxy.ts` - locale redirect proxy using default Korean and persisted cookie.
- Create: `src/__tests__/proxy.test.ts` - redirect behavior tests.
- Create: `src/app/[locale]/layout.tsx` - locale-aware root layout and metadata.
- Create: `src/app/[locale]/page.tsx` - locale-aware app page.
- Modify: `src/app/globals.css` - Korean-friendly font fallback.
- Delete: `src/app/layout.tsx` - replaced by `[locale]/layout.tsx` root layout.
- Delete: `src/app/page.tsx` - replaced by `[locale]/page.tsx`.
- Modify: `src/features/campus-energy/domain/types.ts` - character progress returns a translation key.
- Modify: `src/features/campus-energy/domain/scoring.ts` - return character title keys instead of English strings.
- Modify: `src/features/campus-energy/__tests__/scoring.test.ts` - assert title keys.
- Modify: `src/features/campus-energy/components/campus-energy-app.tsx` - wrap client app in i18n provider and use localized demo data.
- Modify: `src/features/campus-energy/components/mode-tabs.tsx` - translated labels.
- Modify: `src/features/campus-energy/components/admin-dashboard.tsx` - translated labels and locale-aware units.
- Modify: `src/features/campus-energy/components/building-rank-table.tsx` - translated headings and row text.
- Modify: `src/features/campus-energy/components/campus-map.tsx` - translated missing-token state and map source updates after locale changes.
- Modify: `src/features/campus-energy/components/participant-dashboard.tsx` - translated labels and localized group data.
- Modify: `src/features/campus-energy/components/group-rank-table.tsx` - translated headings and points text.
- Modify: `src/features/campus-energy/components/character-card.tsx` - translated title key and progress text.
- Modify: `src/features/campus-energy/components/status-badge.tsx` - translated status labels.
- Modify: `docs/technical/campus-energy-mvp.md` - record the implemented i18n structure and verification.
- Modify: `docs/product/campus-energy-platform.md` - record Korean-first product language direction.

---

### Task 1: Core Locale Utilities

**Files:**
- Create: `src/i18n/config.ts`
- Create: `src/i18n/format.ts`
- Create: `src/i18n/interpolate.ts`
- Create: `src/i18n/routes.ts`
- Test: `src/i18n/__tests__/config.test.ts`
- Test: `src/i18n/__tests__/format.test.ts`
- Test: `src/i18n/__tests__/interpolate.test.ts`
- Test: `src/i18n/__tests__/routes.test.ts`

- [ ] **Step 1: Write failing locale utility tests**

Create `src/i18n/__tests__/config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  defaultLocale,
  isLocale,
  localeCookieName,
  normalizeLocale,
  supportedLocales,
} from "../config";

describe("i18n config", () => {
  it("uses Korean as the default locale", () => {
    expect(defaultLocale).toBe("ko");
    expect(supportedLocales).toEqual(["ko", "en"]);
  });

  it("recognizes only supported locales", () => {
    expect(isLocale("ko")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ja")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("normalizes unsupported values to Korean", () => {
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("fr")).toBe("ko");
    expect(normalizeLocale(null)).toBe("ko");
  });

  it("uses a stable cookie name for future settings", () => {
    expect(localeCookieName).toBe("cems-locale");
  });
});
```

Create `src/i18n/__tests__/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatKwh, formatNumber, formatPoints, formatSignedKwh } from "../format";

describe("i18n formatters", () => {
  it("formats Korean numbers and units", () => {
    expect(formatNumber("ko", 1234567)).toBe("1,234,567");
    expect(formatKwh("ko", 1500)).toBe("1,500 kWh");
    expect(formatPoints("ko", 2500)).toBe("2,500점");
  });

  it("formats English numbers and units", () => {
    expect(formatNumber("en", 1234567)).toBe("1,234,567");
    expect(formatKwh("en", 1500)).toBe("1,500 kWh");
    expect(formatPoints("en", 2500)).toBe("2,500 pts");
  });

  it("formats signed kWh deltas", () => {
    expect(formatSignedKwh("ko", 90)).toBe("+90 kWh");
    expect(formatSignedKwh("en", -140)).toBe("-140 kWh");
  });
});
```

Create `src/i18n/__tests__/interpolate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { interpolate } from "../interpolate";

describe("interpolate", () => {
  it("replaces named placeholders", () => {
    expect(
      interpolate("{subject} saved {amount}.", {
        amount: "140 kWh",
        subject: "IT Building",
      }),
    ).toBe("IT Building saved 140 kWh.");
  });

  it("leaves unknown placeholders visible", () => {
    expect(interpolate("Hello {name} {missing}", { name: "CEMS" })).toBe(
      "Hello CEMS {missing}",
    );
  });
});
```

Create `src/i18n/__tests__/routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getLocalizedPath } from "../routes";

describe("getLocalizedPath", () => {
  it("replaces an existing locale segment", () => {
    expect(getLocalizedPath("/ko", "en")).toBe("/en");
    expect(getLocalizedPath("/ko/admin", "en")).toBe("/en/admin");
  });

  it("adds a locale segment when one is missing", () => {
    expect(getLocalizedPath("/", "ko")).toBe("/ko");
    expect(getLocalizedPath("/dashboard", "en")).toBe("/en/dashboard");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm run test -- src/i18n/__tests__/config.test.ts src/i18n/__tests__/format.test.ts src/i18n/__tests__/interpolate.test.ts src/i18n/__tests__/routes.test.ts
```

Expected: FAIL with module resolution errors for `../config`, `../format`, `../interpolate`, and `../routes`.

- [ ] **Step 3: Implement locale utilities**

Create `src/i18n/config.ts`:

```ts
export const supportedLocales = ["ko", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "ko";

export const localeCookieName = "cems-locale";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  ko: "한국어",
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    supportedLocales.includes(value as Locale)
  );
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : defaultLocale;
}
```

Create `src/i18n/format.ts`:

```ts
import type { Locale } from "./config";

const formatterLocales: Record<Locale, string> = {
  en: "en-US",
  ko: "ko-KR",
};

const numberFormatters = new Map<Locale, Intl.NumberFormat>();

function getNumberFormatter(locale: Locale) {
  const existing = numberFormatters.get(locale);
  if (existing) return existing;

  const formatter = new Intl.NumberFormat(formatterLocales[locale], {
    maximumFractionDigits: 0,
  });
  numberFormatters.set(locale, formatter);
  return formatter;
}

export function formatNumber(locale: Locale, value: number) {
  return getNumberFormatter(locale).format(value);
}

export function formatKwh(locale: Locale, value: number) {
  return `${formatNumber(locale, value)} kWh`;
}

export function formatSignedKwh(locale: Locale, value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatKwh(locale, value)}`;
}

export function formatPoints(locale: Locale, value: number) {
  const suffix = locale === "ko" ? "점" : " pts";
  return `${formatNumber(locale, value)}${suffix}`;
}
```

Create `src/i18n/interpolate.ts`:

```ts
type InterpolationValue = number | string;

export function interpolate(
  template: string,
  values: Record<string, InterpolationValue>,
) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
```

Create `src/i18n/routes.ts`:

```ts
import { isLocale, type Locale } from "./config";

export function getLocalizedPath(pathname: string, locale: Locale) {
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = normalizedPathname.split("/");

  if (isLocale(segments[1])) {
    segments[1] = locale;
    return segments.join("") === "" ? `/${locale}` : segments.join("/");
  }

  return normalizedPathname === "/"
    ? `/${locale}`
    : `/${locale}${normalizedPathname}`;
}
```

- [ ] **Step 4: Run tests to verify utilities pass**

Run:

```powershell
npm run test -- src/i18n/__tests__/config.test.ts src/i18n/__tests__/format.test.ts src/i18n/__tests__/interpolate.test.ts src/i18n/__tests__/routes.test.ts
```

Expected: PASS for all four i18n utility test files.

- [ ] **Step 5: Commit locale utilities**

```powershell
git add src/i18n
git commit -m "feat: add Korean-first i18n utilities"
```

---

### Task 2: Messages, Localized Demo Data, and Character Title Keys

**Files:**
- Create: `src/i18n/messages/ko.ts`
- Create: `src/i18n/messages/en.ts`
- Create: `src/i18n/messages/types.ts`
- Create: `src/i18n/dictionaries.ts`
- Create: `src/i18n/__tests__/messages.test.ts`
- Create: `src/features/campus-energy/data/localized-demo-campus.ts`
- Test: `src/features/campus-energy/__tests__/localized-demo-campus.test.ts`
- Modify: `src/features/campus-energy/domain/types.ts`
- Modify: `src/features/campus-energy/domain/scoring.ts`
- Modify: `src/features/campus-energy/__tests__/scoring.test.ts`

- [ ] **Step 1: Write failing tests for messages, localized demo data, and title keys**

Create `src/i18n/__tests__/messages.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { enMessages } from "../messages/en";
import { koMessages } from "../messages/ko";

describe("messages", () => {
  it("keeps Korean as the source/default language", () => {
    expect(koMessages.app.eyebrow).toBe("캠퍼스 에너지 관리 시스템");
    expect(koMessages.modes.admin).toBe("관리자 대시보드");
  });

  it("provides matching English message groups", () => {
    expect(Object.keys(enMessages)).toEqual(Object.keys(koMessages));
    expect(Object.keys(enMessages.admin.metrics)).toEqual(
      Object.keys(koMessages.admin.metrics),
    );
    expect(enMessages.app.eyebrow).toBe("Campus Energy Management System");
  });
});
```

Create `src/features/campus-energy/__tests__/localized-demo-campus.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { enMessages } from "@/i18n/messages/en";
import { koMessages } from "@/i18n/messages/ko";
import { demoGroups, demoSubjects } from "../data/demo-campus";
import { localizeDemoCampus } from "../data/localized-demo-campus";

describe("localizeDemoCampus", () => {
  it("uses Korean names for the default messages", () => {
    const localized = localizeDemoCampus(koMessages);

    expect(localized.school.name).toBe("영남대학교");
    expect(localized.subjects.find((subject) => subject.id === "yu-it")?.name)
      .toBe("IT관");
    expect(localized.groups.find((group) => group.id === "engineering")?.name)
      .toBe("공과대학");
  });

  it("uses English names for English messages without changing IDs", () => {
    const localized = localizeDemoCampus(enMessages);

    expect(localized.school.name).toBe("Yeungnam University");
    expect(localized.subjects.map((subject) => subject.id)).toEqual(
      demoSubjects.map((subject) => subject.id),
    );
    expect(localized.groups.map((group) => group.id)).toEqual(
      demoGroups.map((group) => group.id),
    );
  });
});
```

Modify the `getCharacterProgress` test inside `src/features/campus-energy/__tests__/scoring.test.ts`:

```ts
describe("getCharacterProgress", () => {
  it("maps points to a visible character level", () => {
    expect(getCharacterProgress(2750)).toEqual({
      level: 3,
      currentLevelPoints: 750,
      nextLevelPoints: 1000,
      progressRate: 0.75,
      titleKey: "campusSaver",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm run test -- src/i18n/__tests__/messages.test.ts src/features/campus-energy/__tests__/localized-demo-campus.test.ts src/features/campus-energy/__tests__/scoring.test.ts
```

Expected: FAIL because messages and localized demo modules do not exist and `getCharacterProgress` still returns `title`.

- [ ] **Step 3: Implement message dictionaries**

Create `src/i18n/messages/ko.ts`:

```ts
export const koMessages = {
  admin: {
    actualForecastLine: "실제 {actual} / 예측 {forecast}",
    buildingDiagnosis: "건물 진단",
    metrics: {
      actual: "실제",
      forecast: "예측",
      overuse: "초과 사용",
      saved: "절감",
    },
    selectedDeltaAbove: "실제 사용량이 예측보다 {value} 높습니다.",
    selectedDeltaBelow: "실제 사용량이 예측보다 {value} 낮습니다.",
    selectedSubject: "선택된 대상",
  },
  app: {
    description: "예측 기준선과 실제 전력 사용량을 비교합니다.",
    eyebrow: "캠퍼스 에너지 관리 시스템",
    language: {
      label: "언어",
      options: {
        en: "English",
        ko: "한국어",
      },
    },
  },
  character: {
    level: "레벨 {level}",
    nextLevel: "{current} / {next}점, 다음 레벨까지",
    titles: {
      campusSaver: "캠퍼스 절약가",
      energyHero: "에너지 히어로",
      gridGuardian: "그리드 가디언",
    },
    totalPoints: "총 에너지 포인트 {points}",
  },
  demo: {
    groups: {
      engineering: "공과대학",
      humanities: "문과대학",
      "student-services": "학생지원",
    },
    participant: {
      displayName: "데모 학생",
    },
    school: {
      shortName: "YU",
      name: "영남대학교",
    },
    subjects: {
      "yu-humanities": {
        shortName: "인문",
        name: "인문관",
      },
      "yu-it": {
        shortName: "IT",
        name: "IT관",
      },
      "yu-library": {
        shortName: "도서관",
        name: "중앙도서관",
      },
      "yu-mechanical": {
        shortName: "기계",
        name: "기계공학관",
      },
    },
  },
  map: {
    missingTokenDescription: ".env.local에 NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN을 설정하세요.",
    missingTokenTitle: "Mapbox 토큰이 필요합니다",
  },
  modes: {
    admin: "관리자 대시보드",
    participant: "참여자 모드",
  },
  participant: {
    affiliationRanking: "소속 순위",
    myAffiliation: "내 소속",
    rank: "순위",
    savedEnergy: "절감 에너지",
    savedLine: "{value} 절감",
    myPoints: "내 포인트",
    pointsDescription: "예측 기준선보다 절감한 전력량이 포인트로 전환됩니다.",
    unassigned: "소속 없음",
  },
  status: {
    neutral: "보통",
    overuse: "초과",
    saving: "절감",
  },
} as const;
```

Create `src/i18n/messages/types.ts`:

```ts
import type { koMessages } from "./ko";

type WidenMessageValues<T> = T extends string
  ? string
  : {
      readonly [K in keyof T]: WidenMessageValues<T[K]>;
    };

export type Messages = WidenMessageValues<typeof koMessages>;
```

Create `src/i18n/messages/en.ts`:

```ts
import type { Messages } from "./types";

export const enMessages = {
  admin: {
    actualForecastLine: "Actual {actual} / Forecast {forecast}",
    buildingDiagnosis: "Building diagnosis",
    metrics: {
      actual: "Actual",
      forecast: "Forecast",
      overuse: "Overuse",
      saved: "Saved",
    },
    selectedDeltaAbove: "Actual usage is {value} above forecast.",
    selectedDeltaBelow: "Actual usage is {value} below forecast.",
    selectedSubject: "Selected subject",
  },
  app: {
    description: "Actual electricity usage compared with forecast baseline.",
    eyebrow: "Campus Energy Management System",
    language: {
      label: "Language",
      options: {
        en: "English",
        ko: "한국어",
      },
    },
  },
  character: {
    level: "Level {level}",
    nextLevel: "{current} / {next} points to next level",
    titles: {
      campusSaver: "Campus Saver",
      energyHero: "Energy Hero",
      gridGuardian: "Grid Guardian",
    },
    totalPoints: "{points} total energy points",
  },
  demo: {
    groups: {
      engineering: "College of Engineering",
      humanities: "College of Humanities",
      "student-services": "Student Services",
    },
    participant: {
      displayName: "Demo Student",
    },
    school: {
      shortName: "YU",
      name: "Yeungnam University",
    },
    subjects: {
      "yu-humanities": {
        shortName: "HM",
        name: "Humanities Building",
      },
      "yu-it": {
        shortName: "IT",
        name: "IT Building",
      },
      "yu-library": {
        shortName: "LIB",
        name: "University Library",
      },
      "yu-mechanical": {
        shortName: "ME",
        name: "Mechanical Engineering Building",
      },
    },
  },
  map: {
    missingTokenDescription: "Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local.",
    missingTokenTitle: "Mapbox token required",
  },
  modes: {
    admin: "Admin Dashboard",
    participant: "Participant Mode",
  },
  participant: {
    affiliationRanking: "Affiliation ranking",
    myAffiliation: "My affiliation",
    rank: "Rank",
    savedEnergy: "Saved energy",
    savedLine: "{value} saved",
    myPoints: "My points",
    pointsDescription:
      "Points come from electricity saved against the forecast baseline.",
    unassigned: "Unassigned",
  },
  status: {
    neutral: "neutral",
    overuse: "overuse",
    saving: "saving",
  },
} as const satisfies Messages;
```

Create `src/i18n/dictionaries.ts`:

```ts
import "server-only";

import type { Locale } from "./config";
import type { Messages } from "./messages/types";

const dictionaries = {
  en: () => import("./messages/en").then((module) => module.enMessages),
  ko: () => import("./messages/ko").then((module) => module.koMessages),
} satisfies Record<Locale, () => Promise<Messages>>;

export async function getMessages(locale: Locale) {
  return dictionaries[locale]();
}
```

- [ ] **Step 4: Implement localized demo data and title keys**

Modify `src/features/campus-energy/domain/types.ts` so the character title is a key:

```ts
export type EnergySubjectType =
  | "building"
  | "department"
  | "college"
  | "school"
  | "region";

export type EnergyStatus = "saving" | "neutral" | "overuse";

export type CharacterTitleKey =
  | "campusSaver"
  | "energyHero"
  | "gridGuardian";

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

export type RankedEnergySubject = EnergyComparison & {
  rank: number;
  points: number;
};

export type CharacterProgress = {
  level: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  progressRate: number;
  titleKey: CharacterTitleKey;
};

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

Modify `src/features/campus-energy/domain/scoring.ts`:

```ts
import type {
  CharacterProgress,
  CharacterTitleKey,
  EnergyComparison,
  RankedEnergySubject,
} from "./types";

const DEFAULT_POINT_MULTIPLIER = 10;
const POINTS_PER_LEVEL = 1000;

export function calculatePoints(
  comparison: EnergyComparison,
  multiplier = DEFAULT_POINT_MULTIPLIER,
): number {
  return Math.max(0, Math.round(comparison.savingsKwh * multiplier));
}

export function rankSubjects(
  comparisons: EnergyComparison[],
): RankedEnergySubject[] {
  return comparisons
    .map((comparison) => ({
      ...comparison,
      points: calculatePoints(comparison),
    }))
    .sort(
      (a, b) => b.points - a.points || a.subjectId.localeCompare(b.subjectId),
    )
    .map((comparison, index) => ({
      ...comparison,
      rank: index + 1,
    }));
}

function getTitleKey(level: number): CharacterTitleKey {
  if (level >= 10) return "gridGuardian";
  if (level >= 5) return "energyHero";
  return "campusSaver";
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
    titleKey: getTitleKey(level),
  };
}
```

Create `src/features/campus-energy/data/localized-demo-campus.ts`:

```ts
import type { Messages } from "@/i18n/messages/types";
import {
  demoGroups,
  demoParticipant,
  demoSchool,
  demoSubjects,
} from "./demo-campus";

export function localizeDemoCampus(messages: Messages) {
  return {
    groups: demoGroups.map((group) => ({
      ...group,
      name: messages.demo.groups[group.id as keyof typeof messages.demo.groups],
    })),
    participant: {
      ...demoParticipant,
      displayName: messages.demo.participant.displayName,
    },
    school: {
      ...demoSchool,
      name: messages.demo.school.name,
      shortName: messages.demo.school.shortName,
    },
    subjects: demoSubjects.map((subject) => {
      const localized =
        messages.demo.subjects[
          subject.id as keyof typeof messages.demo.subjects
        ];

      return {
        ...subject,
        name: localized.name,
        shortName: localized.shortName,
      };
    }),
  };
}
```

- [ ] **Step 5: Run tests to verify messages and data pass**

Run:

```powershell
npm run test -- src/i18n/__tests__/messages.test.ts src/features/campus-energy/__tests__/localized-demo-campus.test.ts src/features/campus-energy/__tests__/scoring.test.ts
```

Expected: PASS for all three test files.

- [ ] **Step 6: Commit dictionaries and localized data**

```powershell
git add src/i18n src/features/campus-energy/domain src/features/campus-energy/data src/features/campus-energy/__tests__
git commit -m "feat: add Korean and English campus energy messages"
```

---

### Task 3: Locale-Aware Routing and Proxy Redirect

**Files:**
- Create: `src/proxy.ts`
- Test: `src/__tests__/proxy.test.ts`
- Create: `src/app/[locale]/layout.tsx`
- Create: `src/app/[locale]/page.tsx`
- Modify: `src/app/globals.css`
- Delete: `src/app/layout.tsx`
- Delete: `src/app/page.tsx`

- [ ] **Step 1: Write failing proxy redirect tests**

Create `src/__tests__/proxy.test.ts`:

```ts
import { getRedirectUrl } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { localeCookieName } from "@/i18n/config";
import { proxy } from "../proxy";

describe("locale proxy", () => {
  it("redirects root requests to Korean by default", () => {
    const response = proxy(new NextRequest("https://cems.test/"));

    expect(getRedirectUrl(response)).toBe("https://cems.test/ko");
  });

  it("redirects locale-less paths to the saved locale cookie", () => {
    const request = new NextRequest("https://cems.test/dashboard");
    request.cookies.set(localeCookieName, "en");

    const response = proxy(request);

    expect(getRedirectUrl(response)).toBe("https://cems.test/en/dashboard");
  });

  it("does not redirect requests that already include a locale", () => {
    const response = proxy(new NextRequest("https://cems.test/ko"));

    expect(response?.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test -- src/__tests__/proxy.test.ts
```

Expected: FAIL because `src/proxy.ts` does not exist.

- [ ] **Step 3: Implement locale proxy**

Create `src/proxy.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import {
  defaultLocale,
  isLocale,
  localeCookieName,
  supportedLocales,
} from "./i18n/config";

function pathnameHasLocale(pathname: string) {
  return supportedLocales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

function getPreferredLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  return isLocale(cookieLocale) ? cookieLocale : defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathnameHasLocale(pathname)) {
    return NextResponse.next();
  }

  const locale = getPreferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
```

- [ ] **Step 4: Move the app route under `[locale]`**

Delete `src/app/layout.tsx` and create `src/app/[locale]/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { isLocale, supportedLocales } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);

  return {
    title: messages.app.eyebrow,
    description: messages.app.description,
  };
}

export default async function RootLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) notFound();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

Delete `src/app/page.tsx` and create `src/app/[locale]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { CampusEnergyApp } from "@/features/campus-energy/components/campus-energy-app";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type HomeProps = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;

  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);

  return (
    <CampusEnergyApp
      locale={locale}
      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""}
      messages={messages}
    />
  );
}
```

Modify the `body` rule in `src/app/globals.css`:

```css
body {
  background: var(--background);
  color: var(--foreground);
  font-family:
    var(--font-geist-sans),
    "Apple SD Gothic Neo",
    "Malgun Gothic",
    "Noto Sans KR",
    Arial,
    Helvetica,
    sans-serif;
}
```

- [ ] **Step 5: Run route and proxy tests**

Run:

```powershell
npm run test -- src/__tests__/proxy.test.ts
```

Expected: PASS.

Run:

```powershell
npm run build
```

Expected: PASS. The build should generate `/ko` and `/en` static params and should not report missing root layout errors.

- [ ] **Step 6: Commit locale routing**

```powershell
git add src/proxy.ts src/__tests__/proxy.test.ts src/app src/i18n src/features/campus-energy src/app/globals.css
git commit -m "feat: route campus app by locale"
```

---

### Task 4: Client I18n Provider and Language Switcher

**Files:**
- Create: `src/i18n/client.tsx`
- Create: `src/features/campus-energy/components/language-switcher.tsx`
- Modify: `src/features/campus-energy/components/campus-energy-app.tsx`

- [ ] **Step 1: Implement client i18n context**

Create `src/i18n/client.tsx`:

```tsx
"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Messages } from "./messages/types";

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  locale,
  messages,
}: I18nContextValue & {
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }

  return context;
}
```

- [ ] **Step 2: Implement reusable language switcher**

Create `src/features/campus-energy/components/language-switcher.tsx`:

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  localeCookieName,
  supportedLocales,
  type Locale,
} from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { getLocalizedPath } from "@/i18n/routes";

const cookieMaxAgeSeconds = 60 * 60 * 24 * 365;

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, messages } = useI18n();

  function changeLocale(nextLocale: Locale) {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=${cookieMaxAgeSeconds}; samesite=lax`;
    router.push(getLocalizedPath(pathname, nextLocale));
  }

  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
      <span>{messages.app.language.label}</span>
      <select
        aria-label={messages.app.language.label}
        value={locale}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        className="border border-slate-300 bg-white px-2 py-2 text-sm text-slate-950"
      >
        {supportedLocales.map((option) => (
          <option key={option} value={option}>
            {messages.app.language.options[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 3: Wrap the app in the provider and localize top-level data**

Replace `src/features/campus-energy/components/campus-energy-app.tsx` with:

```tsx
"use client";

import { useMemo, useState } from "react";
import { I18nProvider, useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/types";
import {
  demoSubjects,
  getDemoEnergyComparisons,
} from "../data/demo-campus";
import { localizeDemoCampus } from "../data/localized-demo-campus";
import { AdminDashboard } from "./admin-dashboard";
import { LanguageSwitcher } from "./language-switcher";
import { ModeTabs } from "./mode-tabs";
import { ParticipantDashboard } from "./participant-dashboard";

type Mode = "admin" | "participant";

type CampusEnergyAppProps = {
  locale: Locale;
  mapboxToken: string;
  messages: Messages;
};

export function CampusEnergyApp({
  locale,
  mapboxToken,
  messages,
}: CampusEnergyAppProps) {
  return (
    <I18nProvider locale={locale} messages={messages}>
      <CampusEnergyShell mapboxToken={mapboxToken} />
    </I18nProvider>
  );
}

function CampusEnergyShell({ mapboxToken }: { mapboxToken: string }) {
  const { messages } = useI18n();
  const [mode, setMode] = useState<Mode>("admin");
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    demoSubjects[0].id,
  );
  const comparisons = useMemo(() => getDemoEnergyComparisons(), []);
  const localizedDemo = useMemo(
    () => localizeDemoCampus(messages),
    [messages],
  );

  return (
    <main className="flex min-h-screen flex-col bg-slate-100 p-4 text-slate-950">
      <header className="mb-4 flex flex-col gap-3 border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-700">
            {messages.app.eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            {localizedDemo.school.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {messages.app.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ModeTabs mode={mode} onModeChange={setMode} />
          <LanguageSwitcher />
        </div>
      </header>
      {mode === "admin" ? (
        <AdminDashboard
          mapboxToken={mapboxToken}
          school={localizedDemo.school}
          subjects={localizedDemo.subjects}
          comparisons={comparisons}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={setSelectedSubjectId}
        />
      ) : (
        <ParticipantDashboard
          groups={localizedDemo.groups}
          participant={localizedDemo.participant}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run build to catch prop and serialization errors**

Run:

```powershell
npm run build
```

Expected: FAIL until the child components accept the new props and stop expecting English-only domain strings. The failures should point to `ParticipantDashboard` props and `CharacterProgress.title`.

- [ ] **Step 5: Commit only after Task 5 completes**

Do not commit this task separately if the build fails after Step 4. Continue to Task 5 and commit both UI tasks together after the full UI translation passes.

---

### Task 5: Translate Campus Energy UI Components

**Files:**
- Modify: `src/features/campus-energy/components/mode-tabs.tsx`
- Modify: `src/features/campus-energy/components/admin-dashboard.tsx`
- Modify: `src/features/campus-energy/components/building-rank-table.tsx`
- Modify: `src/features/campus-energy/components/campus-map.tsx`
- Modify: `src/features/campus-energy/components/participant-dashboard.tsx`
- Modify: `src/features/campus-energy/components/group-rank-table.tsx`
- Modify: `src/features/campus-energy/components/character-card.tsx`
- Modify: `src/features/campus-energy/components/status-badge.tsx`

- [ ] **Step 1: Translate mode tabs**

Replace `src/features/campus-energy/components/mode-tabs.tsx` with:

```tsx
"use client";

import { useI18n } from "@/i18n/client";

type Mode = "admin" | "participant";

type ModeTabsProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  const { messages } = useI18n();
  const tabs: { label: string; value: Mode }[] = [
    { label: messages.modes.admin, value: "admin" },
    { label: messages.modes.participant, value: "participant" },
  ];

  return (
    <div className="inline-flex border border-slate-300 bg-white p-1">
      {tabs.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onModeChange(value)}
          className={`px-3 py-2 text-sm font-medium ${
            mode === value
              ? "bg-slate-950 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Translate admin dashboard**

Replace `src/features/campus-energy/components/admin-dashboard.tsx` with:

```tsx
"use client";

import { useI18n } from "@/i18n/client";
import { formatKwh } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
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
  const { locale, messages } = useI18n();
  const summary = summarizeEnergy(props.comparisons);
  const selectedComparison = props.comparisons.find(
    (item) => item.subjectId === props.selectedSubjectId,
  );
  const selectedSubject = props.subjects.find(
    (item) => item.id === props.selectedSubjectId,
  );

  const selectedDeltaText =
    selectedComparison &&
    interpolate(
      selectedComparison.status === "overuse"
        ? messages.admin.selectedDeltaAbove
        : messages.admin.selectedDeltaBelow,
      {
        value: formatKwh(locale, Math.abs(selectedComparison.deltaKwh)),
      },
    );

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_26rem]">
      <section className="overflow-hidden border border-slate-200 bg-white">
        <CampusMap {...props} />
      </section>
      <aside className="flex min-h-0 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label={messages.admin.metrics.actual}
            value={formatKwh(locale, summary.actualKwh)}
          />
          <MetricCard
            label={messages.admin.metrics.forecast}
            value={formatKwh(locale, summary.forecastKwh)}
          />
          <MetricCard
            label={messages.admin.metrics.saved}
            value={formatKwh(locale, summary.savingsKwh)}
            tone="saving"
          />
          <MetricCard
            label={messages.admin.metrics.overuse}
            value={formatKwh(locale, summary.overuseKwh)}
            tone="overuse"
          />
        </div>
        <BuildingRankTable
          subjects={props.subjects}
          comparisons={props.comparisons}
          selectedSubjectId={props.selectedSubjectId}
          onSelectSubject={props.onSelectSubject}
        />
        {selectedSubject && selectedComparison && selectedDeltaText ? (
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              {messages.admin.selectedSubject}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              {selectedSubject.name}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{selectedDeltaText}</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Translate tables and badges**

Replace `src/features/campus-energy/components/building-rank-table.tsx` with:

```tsx
"use client";

import { useI18n } from "@/i18n/client";
import { formatKwh, formatSignedKwh } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { EnergyComparison, EnergySubject } from "../domain/types";
import { StatusBadge } from "./status-badge";

type BuildingRankTableProps = {
  subjects: EnergySubject[];
  comparisons: EnergyComparison[];
  selectedSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
};

export function BuildingRankTable({
  subjects,
  comparisons,
  selectedSubjectId,
  onSelectSubject,
}: BuildingRankTableProps) {
  const { locale, messages } = useI18n();
  const rows = comparisons
    .map((comparison) => ({
      comparison,
      subject: subjects.find((subject) => subject.id === comparison.subjectId),
    }))
    .filter(
      (row): row is { comparison: EnergyComparison; subject: EnergySubject } =>
        Boolean(row.subject),
    )
    .sort(
      (a, b) =>
        b.comparison.overuseKwh - a.comparison.overuseKwh ||
        b.comparison.savingsKwh - a.comparison.savingsKwh,
    );

  return (
    <div className="overflow-hidden border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-950">
          {messages.admin.buildingDiagnosis}
        </h2>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {rows.map(({ subject, comparison }) => (
          <button
            key={subject.id}
            type="button"
            onClick={() => onSelectSubject(subject.id)}
            className={`grid w-full grid-cols-[1fr_auto] gap-3 border-b border-slate-100 px-4 py-3 text-left ${
              selectedSubjectId === subject.id
                ? "bg-blue-50"
                : "hover:bg-slate-50"
            }`}
          >
            <span>
              <span className="block text-sm font-semibold text-slate-950">
                {subject.name}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {interpolate(messages.admin.actualForecastLine, {
                  actual: formatKwh(locale, comparison.actualKwh),
                  forecast: formatKwh(locale, comparison.forecastKwh),
                })}
              </span>
            </span>
            <span className="flex flex-col items-end gap-2">
              <StatusBadge status={comparison.status} />
              <span className="text-xs text-slate-500">
                {formatSignedKwh(locale, comparison.deltaKwh)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

Replace `src/features/campus-energy/components/group-rank-table.tsx` with:

```tsx
import { useI18n } from "@/i18n/client";
import { formatKwh, formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { AffiliationGroup, RankedEnergySubject } from "../domain/types";

type GroupRankTableProps = {
  groups: AffiliationGroup[];
  rankings: RankedEnergySubject[];
  selectedGroupId: string;
};

export function GroupRankTable({
  groups,
  rankings,
  selectedGroupId,
}: GroupRankTableProps) {
  const { locale, messages } = useI18n();

  return (
    <div className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-950">
          {messages.participant.affiliationRanking}
        </h2>
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
            <span className="text-sm font-semibold text-slate-500">
              #{ranking.rank}
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-950">
                {group.name}
              </span>
              <span className="block text-xs text-slate-500">
                {interpolate(messages.participant.savedLine, {
                  value: formatKwh(locale, ranking.savingsKwh),
                })}
              </span>
            </span>
            <span className="text-sm font-semibold text-emerald-700">
              {formatPoints(locale, ranking.points)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

Replace `src/features/campus-energy/components/status-badge.tsx` with:

```tsx
import { useI18n } from "@/i18n/client";
import type { EnergyStatus } from "../domain/types";

export function StatusBadge({ status }: { status: EnergyStatus }) {
  const { messages } = useI18n();
  const config = {
    saving: "bg-emerald-100 text-emerald-800",
    neutral: "bg-slate-100 text-slate-700",
    overuse: "bg-rose-100 text-rose-800",
  }[status];

  return (
    <span className={`px-2 py-1 text-xs font-semibold ${config}`}>
      {messages.status[status]}
    </span>
  );
}
```

- [ ] **Step 4: Translate participant and character surfaces**

Replace `src/features/campus-energy/components/participant-dashboard.tsx` with:

```tsx
import { useI18n } from "@/i18n/client";
import { formatKwh, formatPoints } from "@/i18n/format";
import { getDemoGroupRankings } from "../data/demo-campus";
import { getCharacterProgress } from "../domain/scoring";
import type { AffiliationGroup, ParticipantProfile } from "../domain/types";
import { CharacterCard } from "./character-card";
import { GroupRankTable } from "./group-rank-table";
import { MetricCard } from "./metric-card";

type ParticipantDashboardProps = {
  groups: AffiliationGroup[];
  participant: ParticipantProfile;
};

export function ParticipantDashboard({
  groups,
  participant,
}: ParticipantDashboardProps) {
  const { locale, messages } = useI18n();
  const groupRankings = getDemoGroupRankings();
  const myGroup = groups.find((group) => group.id === participant.groupId);
  const myRanking = groupRankings.find(
    (ranking) => ranking.subjectId === participant.groupId,
  );
  const points = myRanking?.points ?? 0;
  const progress = getCharacterProgress(points);

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_24rem]">
      <section className="grid content-start gap-4">
        <div className="border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-blue-700">
            {messages.participant.myAffiliation}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {myGroup?.name ?? messages.participant.unassigned}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {messages.participant.pointsDescription}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label={messages.participant.myPoints}
            value={formatPoints(locale, points)}
            tone="saving"
          />
          <MetricCard
            label={messages.participant.savedEnergy}
            value={formatKwh(locale, myRanking?.savingsKwh ?? 0)}
            tone="saving"
          />
          <MetricCard
            label={messages.participant.rank}
            value={`#${myRanking?.rank ?? "-"}`}
          />
        </div>
        <GroupRankTable
          groups={groups}
          rankings={groupRankings}
          selectedGroupId={participant.groupId}
        />
      </section>
      <aside>
        <CharacterCard progress={progress} points={points} />
      </aside>
    </div>
  );
}
```

Replace `src/features/campus-energy/components/character-card.tsx` with:

```tsx
import { Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatNumber, formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { CharacterProgress } from "../domain/types";

type CharacterCardProps = {
  progress: CharacterProgress;
  points: number;
};

export function CharacterCard({ progress, points }: CharacterCardProps) {
  const { locale, messages } = useI18n();

  return (
    <section className="border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center bg-emerald-700 text-white">
          <Sparkles className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            {messages.character.titles[progress.titleKey]}
          </p>
          <h2 className="text-2xl font-semibold text-emerald-950">
            {interpolate(messages.character.level, { level: progress.level })}
          </h2>
        </div>
      </div>
      <p className="mt-4 text-sm text-emerald-900">
        {interpolate(messages.character.totalPoints, {
          points: formatPoints(locale, points),
        })}
      </p>
      <div className="mt-3 h-3 bg-emerald-100">
        <div
          className="h-3 bg-emerald-600"
          style={{ width: `${progress.progressRate * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-emerald-800">
        {interpolate(messages.character.nextLevel, {
          current: formatNumber(locale, progress.currentLevelPoints),
          next: formatNumber(locale, progress.nextLevelPoints),
        })}
      </p>
    </section>
  );
}
```

- [ ] **Step 5: Translate Mapbox fallback and keep map labels fresh**

Replace `src/features/campus-energy/components/campus-map.tsx` with:

```tsx
"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef } from "react";
import { useI18n } from "@/i18n/client";
import type { EnergyComparison, EnergySubject, School } from "../domain/types";

type FeatureProperties = {
  properties?: Record<string, unknown> | null;
};

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
  const { messages } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const selectedSubject = subjects.find(
    (subject) => subject.id === selectedSubjectId,
  );

  const featureCollection = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: subjects.map((subject) => {
        const comparison = comparisons.find(
          (item) => item.subjectId === subject.id,
        );
        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [subject.lng, subject.lat],
          },
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

  function getFeatureStringProperty(
    feature: mapboxgl.GeoJSONFeature | undefined,
    key: string,
  ) {
    const value = (feature as FeatureProperties | undefined)?.properties?.[key];
    return typeof value === "string" ? value : null;
  }

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
    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "bottom-right",
    );

    map.on("load", () => {
      map.addSource("energy-subjects", {
        type: "geojson",
        data: featureCollection,
      });
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
        const id = getFeatureStringProperty(event.features?.[0], "id");
        if (id) onSelectSubject(id);
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
  }, [
    featureCollection,
    mapboxToken,
    onSelectSubject,
    school.center,
    school.pitch,
    school.zoom,
  ]);

  useEffect(() => {
    const source = mapRef.current?.getSource("energy-subjects");
    if (source?.type === "geojson") {
      source.setData(featureCollection);
    }
  }, [featureCollection]);

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
          <h2 className="font-semibold">{messages.map.missingTokenTitle}</h2>
          <p className="mt-2 text-sm text-white/70">
            {messages.map.missingTokenDescription}
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full min-h-[28rem] w-full" />;
}
```

- [ ] **Step 6: Run tests, lint, and build**

Run:

```powershell
npm run test
npm run lint
npm run build
```

Expected: PASS for all three commands.

- [ ] **Step 7: Commit translated UI**

```powershell
git add src
git commit -m "feat: localize campus energy UI"
```

---

### Task 6: Documentation and Runtime Verification

**Files:**
- Modify: `docs/product/campus-energy-platform.md`
- Modify: `docs/technical/campus-energy-mvp.md`

- [ ] **Step 1: Update product documentation**

Append this section to `docs/product/campus-energy-platform.md`:

```md
## Product Language Direction

The project uses Korean as the default product language.

The UI should keep language switching available through a shared i18n layer so a future settings screen can change the user's language without rewriting feature components. The first supported locales are Korean (`ko`) and English (`en`).
```

- [ ] **Step 2: Update technical documentation**

Append this section to `docs/technical/campus-energy-mvp.md`:

```md
## Internationalization

The app uses Korean as the default locale and supports English through locale-prefixed routes:

- `/ko`
- `/en`

Requests without a locale are handled by `src/proxy.ts`. The proxy redirects to the saved `cems-locale` cookie when it is valid, or to Korean (`ko`) when no valid cookie exists.

Locale dictionaries live under `src/i18n/messages/`. Server routes load messages with `src/i18n/dictionaries.ts`, then pass the selected locale and messages into the client app. Client components read them through `I18nProvider` and `useI18n`.

The language selector currently appears in the app header. It writes the same locale cookie that a future settings screen should use.
```

- [ ] **Step 3: Run full verification**

Run:

```powershell
npm run test
npm run lint
npm run build
git diff --check
```

Expected:

- `npm run test`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS
- `git diff --check`: no whitespace errors

- [ ] **Step 4: Run the app locally and verify locale behavior**

Start the dev server:

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000/
```

Expected:

- `/` redirects to `/ko`.
- The header shows `캠퍼스 에너지 관리 시스템`.
- The school name is `영남대학교`.
- Admin metrics show Korean labels: `실제`, `예측`, `절감`, `초과 사용`.
- The Mapbox missing-token fallback is Korean when no token is configured.

Open:

```text
http://127.0.0.1:3000/en
```

Expected:

- The header shows `Campus Energy Management System`.
- The school name is `Yeungnam University`.
- Admin metrics show English labels: `Actual`, `Forecast`, `Saved`, `Overuse`.

Use the language selector:

- Change from `한국어` to `English`.
- Expected URL changes from `/ko` to `/en`.
- Expected cookie: `cems-locale=en`.
- Change from `English` to `한국어`.
- Expected URL changes from `/en` to `/ko`.
- Expected cookie: `cems-locale=ko`.

- [ ] **Step 5: Commit docs and final verification**

```powershell
git add docs/product/campus-energy-platform.md docs/technical/campus-energy-mvp.md
git commit -m "docs: record Korean-first i18n structure"
```

---

## Self-Review Checklist

- [ ] Spec coverage: Korean is the default through `defaultLocale = "ko"`, `/` proxy redirect, Korean source dictionary, Korean metadata, and Korean UI copy.
- [ ] Spec coverage: future settings support exists through `localeCookieName`, `getLocalizedPath`, `LanguageSwitcher`, and locale-prefixed routes.
- [ ] Spec coverage: English support exists as the second locale and is checked against the Korean message shape.
- [ ] Spec coverage: admin and participant surfaces both use the shared i18n layer.
- [ ] Spec coverage: domain calculations remain language-independent.
- [ ] Placeholder scan: no placeholder markers, no empty "write tests" step, and no missing command expectations.
- [ ] Type consistency: `Locale`, `Messages`, `CharacterTitleKey`, `CharacterProgress.titleKey`, and component props match across tasks.
- [ ] Verification coverage: unit tests, lint, build, whitespace check, and runtime route checks are included.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-21-korean-first-i18n.md`. Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
