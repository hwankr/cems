# Dark Map-First Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the campus-energy app from a flat "wireframe demo" look to a cohesive, premium **dark map-first** product with a redesigned navigation system, Mapbox chrome that harmonizes with the UI, and strong mobile responsiveness (bottom tab bar + safe-area handling).

**Architecture:** Introduce a single source of truth for design — a semantic dark token palette in `globals.css` (Tailwind v4 `@theme`) — then rebuild every surface (header, navigation, cards, tables, map frame) on those tokens. The map keeps its existing, test-pinned `dark-v11` geometry/extrusion/click pipeline; its polish comes from CSS chrome (framed container, vignette, restyled controls, legend) and a retuned extrusion color palette. Navigation splits by viewport: a sticky desktop segmented control vs. a fixed mobile bottom tab bar.

**Tech Stack:** Next.js 16.2.9 (App Router), React 19.2.4, Tailwind CSS v4 (`@theme` tokens), Mapbox GL JS 3.25, lucide-react icons, Vitest + jsdom.

---

## Design Direction (confirmed with user)

- **Theme:** Dark, map-first. Deep slate/near-black layered surfaces, subtle hairline borders, soft elevation, rounded corners.
- **Accent / semantics:** Brand accent = **sky** (`#38bdf8`). Energy semantics kept: **saving = emerald** (`#34d399`), **overuse = rose** (`#fb7185`), neutral = slate.
- **Mobile primary nav:** Fixed **bottom tab bar** (Admin / Participant), with the desktop segmented control hidden on small screens.

## Hard Constraints (do not break these tests)

1. `src/features/campus-energy/__tests__/campus-map.test.tsx` pins: map `style: "mapbox://styles/mapbox/dark-v11"`, `minZoom: 15.3`, `localIdeographFontFamily`, the three `setLayoutProperty(building*, "visibility", "none")` calls, the exact `setLight({ anchor:"viewport", color:"#ffffff", intensity:0.35, position:[1.5,210,30] })`, the label layer `layout`/`paint`, and `easeTo` center/duration. **Keep all of these unchanged.** The mock `useI18n` in that file only exposes `messages.map.*` — when the map reads new message keys we must extend that mock (Task 10).
2. `src/features/campus-energy/__tests__/mapbox-style.test.ts` pins extrusion `fill-extrusion-base: 0`, `fill-extrusion-opacity: 0.86`, `fill-extrusion-vertical-gradient: true`, and the `fill-extrusion-height` expression, plus hit-layer `fill-opacity: 0`, and runs Mapbox style-spec `validate`. **Colors are NOT asserted** — we may retune `fill-extrusion-color` / outline colors as long as values stay valid and the pinned props are untouched.
3. `src/i18n/messages/types.ts` derives `Messages` from `ko.ts`; `en.ts` is `satisfies Messages`. **Every new message key must be added to both `ko.ts` and `en.ts` identically** or the build fails.

## Before You Touch Next.js Files (per AGENTS.md)

Read these local docs first (they govern `globals.css`, `layout.tsx`, fonts, and viewport/themeColor):
- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`

## File Structure

**Create:**
- `src/features/campus-energy/components/brand-mark.tsx` — logo lockup (gradient icon tile + wordmark), reused in the header.
- `src/features/campus-energy/components/app-header.tsx` — sticky top bar: brand + school name (left), desktop mode tabs + language switcher (right).
- `src/features/campus-energy/components/bottom-nav.tsx` — fixed mobile bottom tab bar (Admin/Participant) with safe-area padding.
- `src/features/campus-energy/__tests__/bottom-nav.test.tsx` — behavior test for active state + mode change.

**Modify:**
- `src/app/globals.css` — replace with the dark token system + base styles + Mapbox chrome theming + scrollbars.
- `src/app/[locale]/layout.tsx` — add `viewport` export (themeColor/colorScheme/viewportFit), simplify body.
- `src/i18n/messages/ko.ts` and `src/i18n/messages/en.ts` — add `app.brandName` and `map.live`.
- `src/features/campus-energy/components/mode-tabs.tsx` — restyle as a rounded segmented control with icons (desktop).
- `src/features/campus-energy/components/language-switcher.tsx` — compact pill with icon, dark-styled.
- `src/features/campus-energy/components/campus-energy-app.tsx` — compose header + scrollable main + bottom nav; responsive container/paddings.
- `src/features/campus-energy/components/metric-card.tsx` — icon + tone accent bar + tabular numerals.
- `src/features/campus-energy/components/status-badge.tsx` — pill with ring, dark tones.
- `src/features/campus-energy/components/admin-dashboard.tsx` — dark layout, metric icons, restyled selected card.
- `src/features/campus-energy/components/building-rank-table.tsx` — dark card/list, selected accent bar.
- `src/features/campus-energy/components/participant-dashboard.tsx` — dark hero + grid.
- `src/features/campus-energy/components/group-rank-table.tsx` — dark card/list.
- `src/features/campus-energy/components/character-card.tsx` — dark gradient card, gradient progress bar.
- `src/features/campus-energy/components/campus-map.tsx` — framed container, vignette, legend, live pill, polished missing-token state.
- `src/features/campus-energy/components/mapbox-style.ts` — retune extrusion/outline colors to the new palette.
- `src/features/campus-energy/__tests__/campus-map.test.tsx` — extend the `useI18n` mock with the new keys the map now reads (mock only; assertions unchanged).

**Out of scope (do not touch):** `game-preview.*` (separate prototype route), the geometry/data pipeline (`data/`, `domain/geojson.ts`, generation scripts), i18n routing/proxy, scoring/energy domain logic.

---

## Task 1: Dark design-token foundation (`globals.css`)

This is the keystone. Every later task uses these tokens (`bg-canvas`, `bg-surface`, `bg-surface-2`, `bg-surface-3`, `bg-inset`, `border-line`, `border-line-strong`, `text-ink`, `text-ink-muted`, `text-ink-subtle`, `bg-accent`/`text-accent`/`bg-accent-soft`, `bg-saving`/`text-saving`/`bg-saving-soft`, `bg-overuse`/`text-overuse`/`bg-overuse-soft`, `shadow-card`, `shadow-pop`).

**Files:**
- Modify: `src/app/globals.css` (replace entire file)

- [ ] **Step 1: Replace `src/app/globals.css` with the token system**

```css
@import "tailwindcss";

@theme {
  /* Surfaces — dark, layered */
  --color-canvas: #060910;
  --color-surface: #0d1320;
  --color-surface-2: #131c2e;
  --color-surface-3: #1b2438;
  --color-inset: #0a0f1a;

  /* Hairlines */
  --color-line: rgb(148 163 184 / 0.12);
  --color-line-strong: rgb(148 163 184 / 0.22);

  /* Ink */
  --color-ink: #e8edf6;
  --color-ink-muted: #9aa7bd;
  --color-ink-subtle: #6b7689;

  /* Brand accent — sky */
  --color-accent: #38bdf8;
  --color-accent-strong: #0ea5e9;
  --color-accent-soft: rgb(56 189 248 / 0.15);

  /* Energy semantics */
  --color-saving: #34d399;
  --color-saving-soft: rgb(52 211 153 / 0.15);
  --color-overuse: #fb7185;
  --color-overuse-soft: rgb(251 113 133 / 0.15);
  --color-warn: #fbbf24;

  /* Elevation */
  --shadow-card:
    inset 0 1px 0 0 rgb(255 255 255 / 0.03),
    0 14px 32px -22px rgb(0 0 0 / 0.8);
  --shadow-pop: 0 24px 60px -28px rgb(0 0 0 / 0.85);
}

@layer base {
  html {
    color-scheme: dark;
  }

  body {
    min-height: 100%;
    background: var(--color-canvas);
    color: var(--color-ink);
    font-family:
      var(--font-geist-sans),
      "Apple SD Gothic Neo",
      "Malgun Gothic",
      "Noto Sans KR",
      Arial,
      Helvetica,
      sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  button,
  input,
  select {
    font: inherit;
  }

  ::selection {
    background: var(--color-accent-soft);
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: var(--color-line-strong) transparent;
  }

  *::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  *::-webkit-scrollbar-thumb {
    background: var(--color-line-strong);
    border-radius: 9999px;
    border: 3px solid transparent;
    background-clip: padding-box;
  }
}

/* Mapbox GL chrome — match the dark theme. !important overrides mapbox-gl.css. */
.mapboxgl-ctrl-group {
  background: rgb(13 19 32 / 0.82) !important;
  border: 1px solid var(--color-line-strong) !important;
  border-radius: 0.75rem !important;
  overflow: hidden;
  box-shadow: var(--shadow-pop);
  backdrop-filter: blur(8px);
}

.mapboxgl-ctrl-group button {
  width: 34px;
  height: 34px;
  background-color: transparent;
}

.mapboxgl-ctrl-group button + button {
  border-top: 1px solid var(--color-line);
}

.mapboxgl-ctrl-group button:hover {
  background-color: rgb(56 189 248 / 0.14);
}

.mapboxgl-ctrl-group button .mapboxgl-ctrl-icon {
  filter: invert(0.92) hue-rotate(180deg) brightness(1.05);
}

.mapboxgl-ctrl-attrib.mapboxgl-compact {
  background: rgb(6 9 16 / 0.7) !important;
  border-radius: 0.5rem;
}

.mapboxgl-ctrl-attrib a,
.mapboxgl-ctrl-attrib {
  color: var(--color-ink-subtle) !important;
}

.mapboxgl-ctrl-bottom-right .mapboxgl-ctrl {
  margin: 0 0.65rem 0.65rem 0;
}
```

- [ ] **Step 2: Verify the app still builds with the new tokens**

Run: `npm run build`
Expected: Build completes successfully (exit 0). Token names compile to utilities; no "unknown utility" errors. (Components still use old `slate-*` classes at this point — that's fine, they'll be migrated in later tasks. Only the global CSS changed.)

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): add dark semantic token system and Mapbox chrome theming"
```

---

## Task 2: Viewport + layout shell (`layout.tsx`)

Add a proper mobile viewport with `themeColor`, dark `colorScheme`, and `viewportFit: "cover"` so the bottom-nav safe-area insets work on notched devices.

**Files:**
- Modify: `src/app/[locale]/layout.tsx`

- [ ] **Step 1: Replace `src/app/[locale]/layout.tsx`**

```tsx
import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#060910",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
    description: messages.app.description,
    title: messages.app.eyebrow,
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
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. No type error on `Viewport` import.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/layout.tsx
git commit -m "feat(design): add dark viewport metadata and dvh body shell"
```

---

## Task 3: i18n keys for brand + map (`ko.ts`, `en.ts`)

Add `app.brandName` (short wordmark) and `map.live` (map "live" pill). The map legend reuses the existing `status.{saving,neutral,overuse}` keys, so no legend keys are needed. Bottom nav and mode tabs reuse the existing `modes.{admin,participant}` keys.

**Files:**
- Modify: `src/i18n/messages/ko.ts`
- Modify: `src/i18n/messages/en.ts`

- [ ] **Step 1: Add `brandName` to the `app` block and `live` to the `map` block in `ko.ts`**

In `src/i18n/messages/ko.ts`, change the `app` block to include `brandName` as its first key:

```ts
  app: {
    brandName: "CEMS",
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
```

And change the `map` block to:

```ts
  map: {
    live: "실시간 캠퍼스",
    missingTokenDescription:
      ".env.local에 NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN을 설정하세요.",
    missingTokenTitle: "Mapbox 토큰이 필요합니다",
  },
```

- [ ] **Step 2: Mirror the same keys in `en.ts`**

In `src/i18n/messages/en.ts`, change the `app` block to include `brandName`:

```ts
  app: {
    brandName: "CEMS",
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
```

And change the `map` block to:

```ts
  map: {
    live: "Live campus",
    missingTokenDescription: "Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local.",
    missingTokenTitle: "Mapbox token required",
  },
```

- [ ] **Step 3: Verify i18n parity tests pass**

Run: `npm run test -- messages`
Expected: PASS. The `Messages` type now includes `app.brandName` and `map.live`; ko/en parity holds.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/messages/ko.ts src/i18n/messages/en.ts
git commit -m "feat(i18n): add brandName and map.live message keys"
```

---

## Task 4: Brand mark component

A small, reusable lockup: a gradient (emerald→sky) rounded tile with a `Zap` glyph, plus the wordmark (hidden on the smallest widths).

**Files:**
- Create: `src/features/campus-energy/components/brand-mark.tsx`

- [ ] **Step 1: Create `src/features/campus-energy/components/brand-mark.tsx`**

```tsx
"use client";

import { Zap } from "lucide-react";
import { useI18n } from "@/i18n/client";

export function BrandMark() {
  const { messages } = useI18n();

  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-saving to-accent text-[#04121d] shadow-[0_0_24px_-6px_rgb(56_189_248_/_0.6)]">
        <Zap size={18} fill="currentColor" aria-hidden="true" />
      </span>
      <span className="hidden text-sm font-black tracking-tight text-ink sm:inline">
        {messages.app.brandName}
      </span>
    </span>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds (component compiles; gradient token utilities `from-saving`/`to-accent` resolve).

- [ ] **Step 3: Commit**

```bash
git add src/features/campus-energy/components/brand-mark.tsx
git commit -m "feat(design): add BrandMark logo lockup component"
```

---

## Task 5: Mode tabs (desktop segmented control)

Restyle the existing tabs into a rounded pill segmented control with icons. This is the **desktop** navigation; the header wraps it so it is hidden under `lg`.

**Files:**
- Modify: `src/features/campus-energy/components/mode-tabs.tsx`

- [ ] **Step 1: Replace `src/features/campus-energy/components/mode-tabs.tsx`**

```tsx
"use client";

import { Building2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";

type Mode = "admin" | "participant";

type ModeTabsProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  const { messages } = useI18n();
  const tabs: { label: string; value: Mode; icon: ReactNode }[] = [
    {
      label: messages.modes.admin,
      value: "admin",
      icon: <Building2 size={15} aria-hidden="true" />,
    },
    {
      label: messages.modes.participant,
      value: "participant",
      icon: <Sparkles size={15} aria-hidden="true" />,
    },
  ];

  return (
    <div className="inline-flex rounded-full border border-line bg-inset p-1">
      {tabs.map(({ value, label, icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onModeChange(value)}
            aria-pressed={active}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-accent text-[#04121d] shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/features/campus-energy/components/mode-tabs.tsx
git commit -m "feat(design): restyle ModeTabs as rounded segmented control with icons"
```

---

## Task 6: Language switcher (compact dark pill)

**Files:**
- Modify: `src/features/campus-energy/components/language-switcher.tsx`

- [ ] **Step 1: Replace `src/features/campus-energy/components/language-switcher.tsx`**

```tsx
"use client";

import { Languages } from "lucide-react";
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
    <label className="inline-flex items-center gap-1.5 rounded-full border border-line bg-inset px-2.5 py-1.5 text-xs font-medium text-ink-muted">
      <Languages size={15} aria-hidden="true" className="text-ink-subtle" />
      <span className="sr-only">{messages.app.language.label}</span>
      <select
        aria-label={messages.app.language.label}
        value={locale}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        className="cursor-pointer bg-transparent pr-1 text-ink outline-none"
      >
        {supportedLocales.map((option) => (
          <option key={option} value={option} className="bg-surface text-ink">
            {messages.app.language.options[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/features/campus-energy/components/language-switcher.tsx
git commit -m "feat(design): restyle LanguageSwitcher as compact dark pill"
```

---

## Task 7: App header (sticky top bar)

Extract the header from the app shell into a dedicated sticky component. Brand + school name on the left; desktop mode tabs (hidden under `lg`) + language switcher on the right.

**Files:**
- Create: `src/features/campus-energy/components/app-header.tsx`

- [ ] **Step 1: Create `src/features/campus-energy/components/app-header.tsx`**

```tsx
"use client";

import { useI18n } from "@/i18n/client";
import { BrandMark } from "./brand-mark";
import { LanguageSwitcher } from "./language-switcher";
import { ModeTabs } from "./mode-tabs";

type Mode = "admin" | "participant";

type AppHeaderProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  schoolName: string;
};

export function AppHeader({ mode, onModeChange, schoolName }: AppHeaderProps) {
  const { messages } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface-2/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink sm:text-base">
              {schoolName}
            </p>
            <p className="hidden truncate text-xs text-ink-subtle sm:block">
              {messages.app.eyebrow}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:block">
            <ModeTabs mode={mode} onModeChange={onModeChange} />
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/features/campus-energy/components/app-header.tsx
git commit -m "feat(design): add sticky AppHeader with brand and responsive controls"
```

---

## Task 8: Bottom navigation (mobile) — test first

The mobile primary navigation. Fixed to the bottom, hidden under `lg`, with safe-area padding. This has real behavior (active state + onChange), so write the test first.

**Files:**
- Create: `src/features/campus-energy/components/bottom-nav.tsx`
- Test: `src/features/campus-energy/__tests__/bottom-nav.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/campus-energy/__tests__/bottom-nav.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BottomNav } from "../components/bottom-nav";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    messages: {
      modes: {
        admin: "관리자 대시보드",
        participant: "참여자 모드",
      },
    },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function mountBottomNav(root: Root, mode: "admin" | "participant", onChange: (mode: "admin" | "participant") => void) {
  root.render(<BottomNav mode={mode} onModeChange={onChange} />);
}

describe("BottomNav", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("marks the active mode with aria-current", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => mountBottomNav(root, "admin", () => {}));

    const buttons = Array.from(container.querySelectorAll("button"));
    const adminButton = buttons.find((b) => b.textContent?.includes("관리자 대시보드"));
    const participantButton = buttons.find((b) => b.textContent?.includes("참여자 모드"));

    expect(adminButton?.getAttribute("aria-current")).toBe("page");
    expect(participantButton?.getAttribute("aria-current")).toBeNull();

    await act(async () => root.unmount());
  });

  it("calls onModeChange with the clicked mode", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);
    const onChange = vi.fn();

    await act(async () => mountBottomNav(root, "admin", onChange));

    const participantButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("참여자 모드"),
    );

    await act(async () => {
      participantButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith("participant");

    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- bottom-nav`
Expected: FAIL with a module-not-found / import error for `../components/bottom-nav`.

- [ ] **Step 3: Create `src/features/campus-energy/components/bottom-nav.tsx`**

```tsx
"use client";

import { Building2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";

type Mode = "admin" | "participant";

type BottomNavProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export function BottomNav({ mode, onModeChange }: BottomNavProps) {
  const { messages } = useI18n();
  const items: { value: Mode; label: string; icon: ReactNode }[] = [
    {
      value: "admin",
      label: messages.modes.admin,
      icon: <Building2 size={20} aria-hidden="true" />,
    },
    {
      value: "participant",
      label: messages.modes.participant,
      icon: <Sparkles size={20} aria-hidden="true" />,
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-2/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-2">
        {items.map(({ value, label, icon }) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onModeChange(value)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition ${
                active ? "text-accent" : "text-ink-subtle"
              }`}
            >
              <span
                className={`grid h-8 w-16 place-items-center rounded-full transition ${
                  active ? "bg-accent-soft" : ""
                }`}
              >
                {icon}
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- bottom-nav`
Expected: PASS (both tests green).

- [ ] **Step 5: Commit**

```bash
git add src/features/campus-energy/components/bottom-nav.tsx src/features/campus-energy/__tests__/bottom-nav.test.tsx
git commit -m "feat(design): add mobile bottom navigation with active-state test"
```

---

## Task 9: App shell composition (`campus-energy-app.tsx`)

Wire the new header and bottom nav around a scrollable, max-width content container with responsive padding. Bottom padding (`pb-24`) clears the fixed mobile nav; the shell switches from full-height flex to natural document scroll for robust mobile behavior.

**Files:**
- Modify: `src/features/campus-energy/components/campus-energy-app.tsx`

- [ ] **Step 1: Replace `src/features/campus-energy/components/campus-energy-app.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { I18nProvider, useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/types";
import {
  demoDefaultSubjectId,
  getDemoEnergyComparisons,
} from "../data/demo-campus";
import { localizeDemoCampus } from "../data/localized-demo-campus";
import { AdminDashboard } from "./admin-dashboard";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";
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
  const { locale, messages } = useI18n();
  const [mode, setMode] = useState<Mode>("admin");
  const [selectedSubjectId, setSelectedSubjectId] =
    useState(demoDefaultSubjectId);
  const comparisons = useMemo(() => getDemoEnergyComparisons(), []);
  const localizedDemo = useMemo(
    () => localizeDemoCampus(locale, messages),
    [locale, messages],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <AppHeader
        mode={mode}
        onModeChange={setMode}
        schoolName={localizedDemo.school.name}
      />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
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
      <BottomNav mode={mode} onModeChange={setMode} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. The app shell now renders header + content + bottom nav.

- [ ] **Step 3: Commit**

```bash
git add src/features/campus-energy/components/campus-energy-app.tsx
git commit -m "feat(design): compose dark shell with sticky header and bottom nav"
```

---

## Task 10: Metric card + status badge

Two shared primitives used across both dashboards.

**Files:**
- Modify: `src/features/campus-energy/components/metric-card.tsx`
- Modify: `src/features/campus-energy/components/status-badge.tsx`

- [ ] **Step 1: Replace `src/features/campus-energy/components/metric-card.tsx`**

Adds an optional `icon`, an `"accent"` tone, a tone accent bar, and tabular numerals. Existing call sites (`label`, `value`, `tone`) stay compatible; `icon` is added in Tasks 11–12.

```tsx
import type { ReactNode } from "react";

type Tone = "neutral" | "saving" | "overuse" | "accent";

type MetricCardProps = {
  label: string;
  value: string;
  tone?: Tone;
  icon?: ReactNode;
  hint?: string;
};

const TONE: Record<Tone, { value: string; chip: string; bar: string }> = {
  neutral: {
    value: "text-ink",
    chip: "bg-surface-3 text-ink-muted",
    bar: "bg-line-strong",
  },
  saving: {
    value: "text-saving",
    chip: "bg-saving-soft text-saving",
    bar: "bg-saving",
  },
  overuse: {
    value: "text-overuse",
    chip: "bg-overuse-soft text-overuse",
    bar: "bg-overuse",
  },
  accent: {
    value: "text-accent",
    chip: "bg-accent-soft text-accent",
    bar: "bg-accent",
  },
};

export function MetricCard({
  label,
  value,
  tone = "neutral",
  icon,
  hint,
}: MetricCardProps) {
  const t = TONE[tone];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-card">
      <span
        className={`absolute inset-x-0 top-0 h-0.5 ${t.bar} opacity-70`}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
          {label}
        </p>
        {icon ? (
          <span className={`grid h-7 w-7 place-items-center rounded-lg ${t.chip}`}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className={`mt-3 text-2xl font-semibold tabular-nums ${t.value}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/features/campus-energy/components/status-badge.tsx`**

```tsx
"use client";

import { useI18n } from "@/i18n/client";
import type { EnergyStatus } from "../domain/types";

export function StatusBadge({ status }: { status: EnergyStatus }) {
  const { messages } = useI18n();
  const config = {
    saving: "bg-saving-soft text-saving ring-saving/25",
    neutral: "bg-surface-3 text-ink-muted ring-line-strong",
    overuse: "bg-overuse-soft text-overuse ring-overuse/25",
  }[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${config}`}
    >
      {messages.status[status]}
    </span>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/features/campus-energy/components/metric-card.tsx src/features/campus-energy/components/status-badge.tsx
git commit -m "feat(design): restyle MetricCard and StatusBadge on dark tokens"
```

---

## Task 11: Admin surfaces (dashboard + building rank table)

**Files:**
- Modify: `src/features/campus-energy/components/admin-dashboard.tsx`
- Modify: `src/features/campus-energy/components/building-rank-table.tsx`

- [ ] **Step 1: Replace `src/features/campus-energy/components/admin-dashboard.tsx`**

Adds metric icons, a wider responsive gap, and a dark restyled "selected subject" card with tone-colored delta text.

```tsx
"use client";

import { Activity, Gauge, TrendingDown, TrendingUp } from "lucide-react";
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-6">
      <div className="min-w-0">
        <CampusMap {...props} />
      </div>
      <aside className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label={messages.admin.metrics.actual}
            value={formatKwh(locale, summary.actualKwh)}
            icon={<Gauge size={15} aria-hidden="true" />}
          />
          <MetricCard
            label={messages.admin.metrics.forecast}
            value={formatKwh(locale, summary.forecastKwh)}
            tone="accent"
            icon={<Activity size={15} aria-hidden="true" />}
          />
          <MetricCard
            label={messages.admin.metrics.saved}
            value={formatKwh(locale, summary.savingsKwh)}
            tone="saving"
            icon={<TrendingDown size={15} aria-hidden="true" />}
          />
          <MetricCard
            label={messages.admin.metrics.overuse}
            value={formatKwh(locale, summary.overuseKwh)}
            tone="overuse"
            icon={<TrendingUp size={15} aria-hidden="true" />}
          />
        </div>
        <BuildingRankTable
          subjects={props.subjects}
          comparisons={props.comparisons}
          selectedSubjectId={props.selectedSubjectId}
          onSelectSubject={props.onSelectSubject}
        />
        {selectedSubject && selectedComparison && selectedDeltaText ? (
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {messages.admin.selectedSubject}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ink">
              {selectedSubject.name}
            </h2>
            <p
              className={`mt-2 text-sm ${
                selectedComparison.status === "overuse"
                  ? "text-overuse"
                  : "text-saving"
              }`}
            >
              {selectedDeltaText}
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/features/campus-energy/components/building-rank-table.tsx`**

Dark card, scrollable list, hover/selected states with an accent left bar on the selected row.

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
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">
          {messages.admin.buildingDiagnosis}
        </h2>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {rows.map(({ subject, comparison }) => {
          const selected = selectedSubjectId === subject.id;
          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onSelectSubject(subject.id)}
              className={`grid w-full grid-cols-[3px_1fr_auto] items-center gap-3 border-b border-line/60 py-3 pr-4 text-left transition ${
                selected ? "bg-accent-soft" : "hover:bg-surface-3"
              }`}
            >
              <span
                className={`h-full w-[3px] rounded-r ${
                  selected ? "bg-accent" : "bg-transparent"
                }`}
                aria-hidden="true"
              />
              <span className="min-w-0 pl-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {subject.name}
                </span>
                <span className="mt-1 block text-xs text-ink-subtle">
                  {interpolate(messages.admin.actualForecastLine, {
                    actual: formatKwh(locale, comparison.actualKwh),
                    forecast: formatKwh(locale, comparison.forecastKwh),
                  })}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1.5">
                <StatusBadge status={comparison.status} />
                <span className="text-xs tabular-nums text-ink-muted">
                  {formatSignedKwh(locale, comparison.deltaKwh)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/features/campus-energy/components/admin-dashboard.tsx src/features/campus-energy/components/building-rank-table.tsx
git commit -m "feat(design): restyle admin dashboard and building rank table"
```

---

## Task 12: Participant surfaces (dashboard + group table + character card)

**Files:**
- Modify: `src/features/campus-energy/components/participant-dashboard.tsx`
- Modify: `src/features/campus-energy/components/group-rank-table.tsx`
- Modify: `src/features/campus-energy/components/character-card.tsx`

- [ ] **Step 1: Replace `src/features/campus-energy/components/participant-dashboard.tsx`**

Dark hero card (accent eyebrow), metric grid with icons, group table on the left; character card on the right.

```tsx
"use client";

import { Coins, Leaf, Trophy } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatKwh, formatPoints } from "@/i18n/format";
import { getDemoGroupRankings } from "../data/demo-campus";
import type { AffiliationGroup, ParticipantProfile } from "../domain/types";
import { getCharacterProgress } from "../domain/scoring";
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-6">
      <section className="grid content-start gap-4">
        <div className="rounded-2xl border border-line bg-gradient-to-br from-accent-soft to-surface p-5 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            {messages.participant.myAffiliation}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            {myGroup?.name ?? messages.participant.unassigned}
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            {messages.participant.pointsDescription}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label={messages.participant.myPoints}
            value={formatPoints(locale, points)}
            tone="saving"
            icon={<Coins size={15} aria-hidden="true" />}
          />
          <MetricCard
            label={messages.participant.savedEnergy}
            value={formatKwh(locale, myRanking?.savingsKwh ?? 0)}
            tone="saving"
            icon={<Leaf size={15} aria-hidden="true" />}
          />
          <MetricCard
            label={messages.participant.rank}
            value={`#${myRanking?.rank ?? "-"}`}
            tone="accent"
            icon={<Trophy size={15} aria-hidden="true" />}
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

- [ ] **Step 2: Replace `src/features/campus-energy/components/group-rank-table.tsx`**

```tsx
"use client";

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
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">
          {messages.participant.affiliationRanking}
        </h2>
      </div>
      {rankings.map((ranking) => {
        const group = groups.find((item) => item.id === ranking.subjectId);
        if (!group) return null;

        const selected = selectedGroupId === group.id;
        return (
          <div
            key={group.id}
            className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-line/60 px-4 py-3 ${
              selected ? "bg-accent-soft" : ""
            }`}
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-3 text-xs font-semibold text-ink-muted tabular-nums">
              {ranking.rank}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">
                {group.name}
              </span>
              <span className="block text-xs text-ink-subtle">
                {interpolate(messages.participant.savedLine, {
                  value: formatKwh(locale, ranking.savingsKwh),
                })}
              </span>
            </span>
            <span className="text-sm font-semibold tabular-nums text-saving">
              {formatPoints(locale, ranking.points)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Replace `src/features/campus-energy/components/character-card.tsx`**

Dark emerald-tinted gradient card with a gradient avatar tile and a gradient progress bar on an inset track.

```tsx
"use client";

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
    <section className="rounded-2xl border border-saving/20 bg-gradient-to-br from-saving-soft to-surface p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-saving to-accent text-[#04121d] shadow-[0_0_28px_-6px_rgb(52_211_153_/_0.7)]">
          <Sparkles className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-saving">
            {messages.character.titles[progress.titleKey]}
          </p>
          <h2 className="text-2xl font-semibold text-ink">
            {interpolate(messages.character.level, { level: progress.level })}
          </h2>
        </div>
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        {interpolate(messages.character.totalPoints, {
          points: formatPoints(locale, points),
        })}
      </p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-inset">
        <div
          className="h-full rounded-full bg-gradient-to-r from-saving to-accent"
          style={{ width: `${progress.progressRate * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-ink-subtle">
        {interpolate(messages.character.nextLevel, {
          current: formatNumber(locale, progress.currentLevelPoints),
          next: formatNumber(locale, progress.nextLevelPoints),
        })}
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/features/campus-energy/components/participant-dashboard.tsx src/features/campus-energy/components/group-rank-table.tsx src/features/campus-energy/components/character-card.tsx
git commit -m "feat(design): restyle participant dashboard, group table, and character card"
```

---

## Task 13: Campus map polish (frame + chrome + legend + palette)

Keep the entire test-pinned map pipeline (Constraints 1 & 2). Add only: a framed rounded container with a vignette overlay, a "live" pill, a status legend (reusing `messages.status.*`), a polished missing-token state, and a retuned extrusion/outline palette. Extend the map test's mock with the new message keys it reads.

**Files:**
- Modify: `src/features/campus-energy/components/mapbox-style.ts`
- Modify: `src/features/campus-energy/components/campus-map.tsx`
- Modify: `src/features/campus-energy/__tests__/campus-map.test.tsx` (mock only)

- [ ] **Step 1: Retune the palette in `src/features/campus-energy/components/mapbox-style.ts`**

Only the `fill-extrusion-color` and the outline `line-color` change (colors are not asserted by the style test). All pinned props (`base`, `opacity`, `vertical-gradient`, `height`, hit `fill-opacity: 0`) stay identical.

```ts
import type {
  FillExtrusionLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
} from "mapbox-gl";

export const ENERGY_SUBJECT_POLYGON_HIT_PAINT: FillLayerSpecification["paint"] =
  {
    "fill-color": "#ffffff",
    "fill-opacity": 0,
  };

export const ENERGY_SUBJECT_EXTRUSION_PAINT: FillExtrusionLayerSpecification["paint"] =
  {
    "fill-extrusion-color": [
      "match",
      ["get", "status"],
      "saving",
      "#34d399",
      "overuse",
      "#fb7185",
      "#64748b",
    ],
    "fill-extrusion-height": [
      "+",
      3,
      ["coalesce", ["to-number", ["get", "displayHeightMeters"]], 0],
    ],
    "fill-extrusion-base": 0,
    "fill-extrusion-opacity": 0.86,
    "fill-extrusion-vertical-gradient": true,
    "fill-extrusion-ambient-occlusion-intensity": 0.4,
    "fill-extrusion-cast-shadows": false,
  };

export const ENERGY_SUBJECT_OUTLINE_PAINT: LineLayerSpecification["paint"] = {
  "line-color": [
    "match",
    ["get", "status"],
    "saving",
    "#10b981",
    "overuse",
    "#e11d48",
    "#475569",
  ],
  "line-opacity": ["case", ["get", "selected"], 0.95, 0.5],
  "line-width": ["case", ["get", "selected"], 3, 1.2],
};
```

- [ ] **Step 2: Run the style test to confirm the palette change is valid**

Run: `npm run test -- mapbox-style`
Expected: PASS (validate succeeds with the new colors; pinned `toMatchObject` checks untouched).

- [ ] **Step 3: Replace the render/return section of `src/features/campus-energy/components/campus-map.tsx`**

Leave **all** of the existing code from the top of the file through the end of the third `useEffect` (the `easeTo` effect, ending at line `}, [school.pitch, selectedSubject]);`) **exactly as-is**. Replace only from the `if (!mapboxToken)` block to the end of the component (the final `return`). Add the `legend` constant just before the `if (!mapboxToken)` check.

Replace this existing tail:

```tsx
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

with:

```tsx
  const legend = [
    { key: "saving" as const, color: "bg-saving" },
    { key: "neutral" as const, color: "bg-ink-subtle" },
    { key: "overuse" as const, color: "bg-overuse" },
  ];

  if (!mapboxToken) {
    return (
      <div className="flex h-[56vh] min-h-[22rem] w-full items-center justify-center rounded-2xl border border-line bg-inset p-6 lg:h-[42rem]">
        <div className="max-w-sm rounded-xl border border-line-strong bg-surface/80 p-5 text-center shadow-pop">
          <h2 className="font-semibold text-ink">
            {messages.map.missingTokenTitle}
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            {messages.map.missingTokenDescription}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[56vh] min-h-[22rem] w-full overflow-hidden rounded-2xl ring-1 ring-line lg:h-[42rem]">
      <div ref={containerRef} className="absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_70px_24px_rgb(6_9_16_/_0.55)]"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface/80 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-saving" aria-hidden="true" />
        {messages.map.live}
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 rounded-full border border-line-strong bg-surface/80 px-3 py-1.5 text-[11px] text-ink-muted backdrop-blur">
        {legend.map(({ key, color }) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
            {messages.status[key]}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Extend the `useI18n` mock in `src/features/campus-energy/__tests__/campus-map.test.tsx`**

The map now reads `messages.map.live` and `messages.status[...]`. Add them to the mock so the rendered (token-present) path does not throw. Replace the existing `vi.mock("@/i18n/client", ...)` block (around lines 93–105) with:

```tsx
vi.mock(
  "@/i18n/client",
  () => ({
    useI18n: () => ({
      messages: {
        map: {
          live: "Live campus",
          missingTokenDescription: "Missing token",
          missingTokenTitle: "Map unavailable",
        },
        status: {
          saving: "Saving",
          neutral: "Neutral",
          overuse: "Overuse",
        },
      },
    }),
  }),
);
```

- [ ] **Step 5: Run the full map test suite to confirm nothing pinned broke**

Run: `npm run test -- campus-map`
Expected: PASS (all four tests). Style/minZoom/setLight/setLayoutProperty/label/easeTo assertions remain green; the new overlay reads the extended mock without throwing.

- [ ] **Step 6: Commit**

```bash
git add src/features/campus-energy/components/mapbox-style.ts src/features/campus-energy/components/campus-map.tsx src/features/campus-energy/__tests__/campus-map.test.tsx
git commit -m "feat(design): frame campus map with vignette, legend, and dark palette"
```

---

## Task 14: Full verification + responsive check

**Files:**
- No code changes (verification + docs).

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: All tests PASS (domain, i18n, map, bottom-nav, style).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: No errors. (If an unused import slipped in during edits, remove it and re-run.)

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: Build succeeds, all routes compile.

- [ ] **Step 4: Whitespace/diff check**

Run: `git diff --check`
Expected: No whitespace errors. (Working tree may already be clean if every task committed; run against the last task's commit range if needed: `git diff --check HEAD~13`.)

- [ ] **Step 5: Manual responsive check on the dev server**

Run: `npm run dev` (ensure `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is set in `.env.local` to see the live map; without it, confirm the polished missing-token card renders).

Verify in a browser at these widths (DevTools device toolbar):
- **375px (mobile):** Header shows brand tile + school name + language pill (no desktop tabs). The **bottom tab bar** is visible and fixed; switching Admin/Participant works; content is not hidden behind the bar (bottom padding clears it). Map fills ~56vh with rounded frame, vignette, live pill, and legend. Metric cards are a clean 2-up grid. No horizontal scroll.
- **768px (tablet):** Single-column dashboard still readable; bottom nav still present until `lg`.
- **1280px (desktop):** Bottom nav hidden; desktop segmented mode tabs appear in the header. Admin map + aside sit in the `1fr / 26rem` two-column grid. Mapbox navigation control is dark-themed (rounded, translucent, light icons).

Expected: All pass. Note any visual issue and fix before finishing.

- [ ] **Step 6: Update working docs**

Append a dated entry to `docs/working/meeting-notes.md` under a `## 2026-06-23` heading summarizing: the dark map-first redesign, the confirmed design decisions (dark theme, bottom tab bar, emerald+sky accent), the new design-token system in `globals.css`, the new `AppHeader`/`BottomNav`/`BrandMark` components, and that the test-pinned Mapbox `dark-v11` pipeline was preserved. Update `docs/working/current-state.md` only if the next session's entry point changed (e.g., note the dark design system as the current UI baseline).

Do **not** commit the docs or push unless the user explicitly asks (per `AGENTS.md` recording rules).

---

## Self-Review

**Spec coverage:**
- "전체 테마 및 디자인 수준 상향" → Tasks 1, 4–13 (token system + every surface restyled). ✅
- "데모 형태 탈피" → flat bordered boxes replaced with elevated rounded dark cards everywhere. ✅
- "Mapbox 호환성/흐름" → Task 13 (framed map, vignette, dark-themed controls via Task 1 CSS, retuned palette) while preserving the tested pipeline. ✅
- "navbar 정리" → Tasks 5–9 (sticky AppHeader + desktop segmented tabs + mobile bottom nav + brand mark). ✅
- "UI 전체 흐름" → Task 9 shell (max-width container, consistent responsive padding, sticky header). ✅
- "모바일 반응성" → bottom tab bar (Task 8), `min-h-dvh` + `viewportFit: cover` + safe-area padding (Tasks 2, 8), responsive grids/paddings/map height (Tasks 9, 11–13). ✅

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to" — every changed file shows complete final content or an exact replace-region with full code. ✅

**Type consistency:** `Mode = "admin" | "participant"` is identical across `mode-tabs`, `bottom-nav`, `app-header`, and the shell. `MetricCard` tone union `"neutral" | "saving" | "overuse" | "accent"` matches every call site (admin uses `accent`/`saving`/`overuse`/default; participant uses `saving`/`accent`). New message keys `app.brandName` and `map.live` are added to both `ko.ts` and `en.ts`; the map's legend reuses existing `status.*`. The map test mock is extended to match exactly what `campus-map.tsx` reads. ✅

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-dark-map-first-design-system.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
