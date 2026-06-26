# Affiliation Login & Group Estate Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a participant sign up / log in, register their school + affiliation, accrue personal points (which grow a character), and have those personal points pool into a shared **group point budget** that funds purchases in their group's building estate.

**Architecture:** A new `account` feature provides Supabase email/password auth, a `profiles` row (school + group), a personal append-only `point_events` ledger, and server-side data access (DAL). Personal points sum into a per-group pool. The existing estate stays keyed by `subjectId` ("building unit"), but its purchase budget becomes `groupEarnedPoints` and its snapshot moves from `localStorage` to a server-shared `estates` table (one row per building, owned by `subject.groupId`, writable only by that group's members via RLS). The estate's existing point math (`calculateEstatePointAccount(earnedPoints, transactions)`) is reused unchanged — only the source of `earnedPoints` changes from per-subject demo savings to the group pool.

**Tech Stack:** Next.js 16.2.9 (App Router, Server Components, Server Actions, `proxy.ts`), React 19, TypeScript (strict, `moduleResolution: bundler`), Supabase (Auth + Postgres 17 + RLS) via `@supabase/ssr` + `@supabase/supabase-js`, Vitest 4 (jsdom), Tailwind v4, existing `@/*` path alias.

## Global Constraints

- **Read first (per `AGENTS.md`):** before writing any Next.js code in a task, read the relevant guide under `node_modules/next/dist/docs/01-app/` — especially `02-guides/authentication.md`, `03-api-reference/04-functions/cookies.md`, and `03-api-reference/03-file-conventions/proxy.md`. This Next.js has breaking changes vs. training data.
- **`proxy.ts` is this repo's middleware** (Next 16 renamed `middleware` → `proxy`). It already exists at `src/proxy.ts` with a named `export function proxy` and `export const config`. Preserve that export shape; do not rename to a default export.
- **`cookies()` from `next/headers` is async** — always `await cookies()`. Cookies can only be *written* in Server Actions / Route Handlers / `proxy.ts`, never during Server Component render.
- **Korean is the default locale.** Every user-facing string must be added to BOTH `src/i18n/messages/ko.ts` and `src/i18n/messages/en.ts` with identical key paths (the `Messages` type is derived from `ko.ts`, so `ko.ts` is the source of truth and `en.ts` must structurally match or the build fails).
- **Locale-prefixed routes only.** All new pages live under `src/app/[locale]/...` and link with `/${locale}/...`.
- **Supabase secrets:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` go in `.env.local` (real values) and stay blank in `.env.example`. Never commit real keys. The service-role key is NEVER used in app code.
- **Point amounts are non-negative integers.** Personal `point_events.points >= 0`; estate spend is recorded as negative `pointDelta` exactly as today.
- **Test command:** `npm run test` (Vitest, `--passWithNoTests`). Run a single file with `npx vitest run <path>`. Lint with `npm run lint`. Production type-check + build with `npm run build`.
- **Commit after every task** with a `feat:`/`test:`/`chore:` message. Do not push unless the user asks.
- **Known MVP limitation (document, do not silently skip):** estate spend is enforced client-side + gated by RLS write access (only group members can write the row). Server-side re-validation of the spend against the live group pool is a documented follow-up, not part of this plan. State this in the estate task's notes rather than implying full server enforcement.

---

## File Structure

New `account` feature (auth, profile, points, group pool, Supabase access):

- `src/features/account/domain/types.ts` — `AccountProfile`, `ProfileDraft`, `ProfileValidationError`, `SchoolOption`, `GroupOption`.
- `src/features/account/domain/profile.ts` — pure profile-draft validation.
- `src/features/account/domain/points.ts` — `PointEvent`, `sumPersonalPoints`, `calculateMemberPeriodReward`.
- `src/features/account/domain/group-pool.ts` — `GroupContribution`, `GroupPointPool`, `calculateGroupPointPool`.
- `src/features/account/supabase/env.ts` — pure env reader + runtime accessor.
- `src/features/account/supabase/client.ts` — browser Supabase client factory.
- `src/features/account/supabase/server.ts` — server Supabase client factory (uses `cookies()`).
- `src/features/account/supabase/proxy-session.ts` — Supabase session refresh for `proxy.ts`.
- `src/features/account/data/account-dal.ts` — server data access (`getCurrentUser`, `getCurrentProfile`, `getPersonalPointTotal`, `getGroupPointPool`, `getEstateOwnerGroupId`).
- `src/features/account/actions/auth.ts` — `signUpAction`, `signInAction`, `signOutAction`.
- `src/features/account/actions/profile.ts` — `saveProfileAction`.
- `src/features/account/actions/points.ts` — `claimPeriodRewardAction`.
- `src/features/account/components/{login-form,signup-form,onboarding-form,sign-out-button,claim-reward-button}.tsx` — client forms.
- `src/app/[locale]/login/page.tsx`, `src/app/[locale]/signup/page.tsx`, `src/app/[locale]/onboarding/page.tsx` — auth/onboarding routes.

Modified:

- `src/proxy.ts` — refresh Supabase session before locale redirect.
- `src/features/estate/persistence/supabase-estate-repository.ts` — new server-shared repository.
- `src/features/estate/data/get-estate-page-data.ts` — async, group-funded budget + auth guard.
- `src/features/estate/components/estate-game-client.tsx` — default to Supabase repository.
- `src/app/[locale]/subjects/[subjectId]/estate/page.tsx` — `await` data, redirect when unauthenticated/unregistered.
- `src/features/campus-energy/components/participant-dashboard.tsx` + `src/app/[locale]/page.tsx` — wire real profile/points + claim button.
- `src/i18n/messages/ko.ts` + `src/i18n/messages/en.ts` — new copy.
- `.env.example` — add blank Supabase vars.
- `package.json` — add Supabase deps.

Database (Supabase, applied via `apply_migration`): tables `schools`, `groups`, `profiles`, `point_events`, `estates` with RLS + seed.

---

## Task 1: Supabase project + dependencies + env reader

**Files:**
- Modify: `package.json` (dependencies)
- Create: `.env.local` (untracked, real values)
- Modify: `.env.example`
- Create: `src/features/account/supabase/env.ts`
- Test: `src/features/account/__tests__/env.test.ts`

**Interfaces:**
- Produces: `readSupabaseEnv(source: Record<string, string | undefined>): { ok: true; url: string; anonKey: string } | { ok: false; missing: string[] }` and `getSupabaseEnv(): { url: string; anonKey: string }` (throws if missing, reads `process.env`).

- [ ] **Step 1: Create the Supabase project (MCP, one-time)**

Use the Supabase MCP tools. Create a dedicated project for cems (do NOT reuse `fomopomo`):
- `mcp__claude_ai_Supabase__get_cost` then `confirm_cost`, then `create_project` with name `cems` in org `jzwzzsdovlztmbcvakzv`, region `ap-northeast-2`.
- After it is `ACTIVE_HEALTHY`, call `get_project_url` and `get_publishable_keys` (anon key) and record both.
- In the Supabase dashboard Auth settings, **disable "Confirm email"** (Authentication → Providers → Email) so demo signups log in immediately. Note this in the task's commit message.

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install @supabase/ssr @supabase/supabase-js
```
Expected: `package.json` `dependencies` gains `@supabase/ssr` and `@supabase/supabase-js`; `package-lock.json` updates; install exits 0.

- [ ] **Step 3: Write `.env.local` (untracked) and update `.env.example`**

Append to `.env.example` (keep values blank):
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
Create `.env.local` with the REAL values from Step 1 (this file is already git-ignored by Next's default `.gitignore`; confirm with `git status --short` that `.env.local` is not listed):
```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=
NEXT_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

- [ ] **Step 4: Write the failing test**

Create `src/features/account/__tests__/env.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { readSupabaseEnv } from "../supabase/env";

describe("readSupabaseEnv", () => {
  it("returns url and anonKey when both are present", () => {
    const result = readSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });

    expect(result).toEqual({
      ok: true,
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
  });

  it("reports every missing variable name", () => {
    const result = readSupabaseEnv({});

    expect(result).toEqual({
      ok: false,
      missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    });
  });

  it("treats empty strings as missing", () => {
    const result = readSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });

    expect(result).toEqual({ ok: false, missing: ["NEXT_PUBLIC_SUPABASE_URL"] });
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run src/features/account/__tests__/env.test.ts`
Expected: FAIL — cannot resolve `../supabase/env`.

- [ ] **Step 6: Write minimal implementation**

Create `src/features/account/supabase/env.ts`:
```ts
type SupabaseEnvSource = Record<string, string | undefined>;

export type SupabaseEnvResult =
  | { ok: true; url: string; anonKey: string }
  | { ok: false; missing: string[] };

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

export function readSupabaseEnv(source: SupabaseEnvSource): SupabaseEnvResult {
  const url = source[URL_KEY];
  const anonKey = source[ANON_KEY];
  const missing: string[] = [];

  if (!url) missing.push(URL_KEY);
  if (!anonKey) missing.push(ANON_KEY);

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  return { ok: true, url: url as string, anonKey: anonKey as string };
}

export function getSupabaseEnv(): { url: string; anonKey: string } {
  const result = readSupabaseEnv({
    [URL_KEY]: process.env[URL_KEY],
    [ANON_KEY]: process.env[ANON_KEY],
  });

  if (!result.ok) {
    throw new Error(
      `Missing Supabase environment variables: ${result.missing.join(", ")}`,
    );
  }

  return { url: result.url, anonKey: result.anonKey };
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/features/account/__tests__/env.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .env.example src/features/account/supabase/env.ts src/features/account/__tests__/env.test.ts
git commit -m "feat(account): add supabase deps and env reader"
```

---

## Task 2: Database schema, RLS, and seed

**Files:**
- Applied via Supabase MCP `apply_migration` (SQL below). No repo file required, but save the SQL to `docs/superpowers/migrations/2026-06-26-account-and-estate.sql` for the record.

**Interfaces:**
- Produces (DB contract used by later tasks):
  - `schools(id text pk, name text, short_name text)`
  - `groups(id text pk, school_id text fk→schools, name text, type text)`
  - `profiles(id uuid pk fk→auth.users, display_name text, school_id text fk→schools, group_id text fk→groups, created_at timestamptz)`
  - `point_events(id uuid pk, user_id uuid fk→profiles, points int >= 0, reason text, period_label text, created_at timestamptz, UNIQUE(user_id, reason, period_label))`
  - `estates(subject_id text pk, owner_group_id text fk→groups, snapshot jsonb, updated_at timestamptz)`

- [ ] **Step 1: Write the migration SQL**

Save this as `docs/superpowers/migrations/2026-06-26-account-and-estate.sql` and use it as the `query` for `apply_migration` (name: `account_and_estate`):
```sql
-- schools / groups: reference data seeded from demo
create table public.schools (
  id text primary key,
  name text not null,
  short_name text not null
);

create table public.groups (
  id text primary key,
  school_id text not null references public.schools (id),
  name text not null,
  type text not null
);

-- profiles: one per auth user
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  school_id text not null references public.schools (id),
  group_id text not null references public.groups (id),
  created_at timestamptz not null default now()
);

-- personal point ledger (append only); idempotent per (user, reason, period)
create table public.point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  points int not null check (points >= 0),
  reason text not null,
  period_label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, period_label)
);
create index point_events_user_id_idx on public.point_events (user_id);

-- server-shared estate snapshot, one row per building, owned by a group
create table public.estates (
  subject_id text primary key,
  owner_group_id text not null references public.groups (id),
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);
create index estates_owner_group_id_idx on public.estates (owner_group_id);

alter table public.schools enable row level security;
alter table public.groups enable row level security;
alter table public.profiles enable row level security;
alter table public.point_events enable row level security;
alter table public.estates enable row level security;

-- reference data: readable by any authenticated user
create policy "schools readable" on public.schools
  for select to authenticated using (true);
create policy "groups readable" on public.groups
  for select to authenticated using (true);

-- profiles: a user manages only their own row
create policy "own profile select" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- point_events: a user reads any member's events in their own group
-- (needed to compute the group pool) but writes only their own.
create policy "group point events select" on public.point_events
  for select to authenticated using (
    user_id in (
      select p.id from public.profiles p
      where p.group_id = (
        select me.group_id from public.profiles me where me.id = auth.uid()
      )
    )
  );
create policy "own point events insert" on public.point_events
  for insert to authenticated with check (user_id = auth.uid());

-- estates: any authenticated user may read; only members of the owning
-- group may insert/update (decorate the shared group estate).
create policy "estates readable" on public.estates
  for select to authenticated using (true);
create policy "estates group insert" on public.estates
  for insert to authenticated with check (
    owner_group_id = (
      select me.group_id from public.profiles me where me.id = auth.uid()
    )
  );
create policy "estates group update" on public.estates
  for update to authenticated using (
    owner_group_id = (
      select me.group_id from public.profiles me where me.id = auth.uid()
    )
  ) with check (
    owner_group_id = (
      select me.group_id from public.profiles me where me.id = auth.uid()
    )
  );

-- seed reference data (matches src/features/campus-energy/data/demo-campus.ts)
insert into public.schools (id, name, short_name) values
  ('yeungnam', 'Yeungnam University', 'YU');

insert into public.groups (id, school_id, name, type) values
  ('engineering', 'yeungnam', 'College of Engineering', 'college'),
  ('humanities', 'yeungnam', 'College of Humanities', 'college'),
  ('student-services', 'yeungnam', 'Student Services', 'other');
```

- [ ] **Step 2: Apply the migration**

Use `mcp__claude_ai_Supabase__apply_migration` with name `account_and_estate` and the SQL above (target the cems project ref from Task 1).
Expected: success, no error.

- [ ] **Step 3: Verify schema and security**

- `mcp__claude_ai_Supabase__list_tables` (schema `public`) → confirm all five tables exist with the columns above.
- `mcp__claude_ai_Supabase__get_advisors` (type `security`) → confirm no `rls_disabled_in_public` findings for the new tables. Address any other high-severity finding it reports for these tables.

- [ ] **Step 4: Commit the recorded SQL**

```bash
git add docs/superpowers/migrations/2026-06-26-account-and-estate.sql
git commit -m "chore(db): record account and estate migration"
```

---

## Task 3: Supabase clients + proxy session refresh

**Files:**
- Create: `src/features/account/supabase/client.ts`
- Create: `src/features/account/supabase/server.ts`
- Create: `src/features/account/supabase/proxy-session.ts`
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: `getSupabaseEnv()` (Task 1).
- Produces:
  - `createBrowserSupabaseClient(): SupabaseClient` (client components).
  - `createServerSupabaseClient(): Promise<SupabaseClient>` (Server Components / Actions / Route Handlers; reads & writes cookies via `next/headers`).
  - `updateSupabaseSession(request: NextRequest): Promise<NextResponse>` (refreshes auth cookies; returned response's cookies must be preserved by `proxy.ts`).

This task wires external SDK + framework glue that is not unit-testable in jsdom; verify via `npm run build` and a runtime smoke check rather than a Vitest test.

- [ ] **Step 1: Read the Supabase + Next docs**

Read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` and `node_modules/next/dist/docs/01-app/02-guides/authentication.md` (the `proxy.ts` section). Optionally `mcp__claude_ai_Supabase__search_docs` for "ssr nextjs server client". Confirm the `@supabase/ssr` cookie-handler shape (`getAll`/`setAll`).

- [ ] **Step 2: Browser client**

Create `src/features/account/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

export function createBrowserSupabaseClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
```

- [ ] **Step 3: Server client**

Create `src/features/account/supabase/server.ts`:
```ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

export async function createServerSupabaseClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render where cookies are read-only.
          // Session refresh happens in proxy.ts, so this is safe to ignore.
        }
      },
    },
  });
}
```

- [ ] **Step 4: Proxy session refresh**

Create `src/features/account/supabase/proxy-session.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

export async function updateSupabaseSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touch the user to trigger token refresh + Set-Cookie.
  await supabase.auth.getUser();

  return response;
}
```

- [ ] **Step 5: Integrate into `proxy.ts`**

Modify `src/proxy.ts`. Make `proxy` async; run the Supabase refresh first, then apply the existing locale-redirect logic, copying the refreshed cookies onto any redirect response so they are not lost. Replace the body of `proxy` while keeping the named export and `config`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import {
  defaultLocale,
  isLocale,
  localeCookieName,
  supportedLocales,
} from "./i18n/config";
import { updateSupabaseSession } from "./features/account/supabase/proxy-session";

function pathnameHasLocale(pathname: string) {
  return supportedLocales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

function getPreferredLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  return isLocale(cookieLocale) ? cookieLocale : defaultLocale;
}

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSupabaseSession(request);
  const { pathname } = request.nextUrl;

  if (pathnameHasLocale(pathname)) {
    return sessionResponse;
  }

  const locale = getPreferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;

  const redirect = NextResponse.redirect(url);
  for (const cookie of sessionResponse.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
```

- [ ] **Step 6: Verify build + runtime smoke**

Run: `npm run build`
Expected: build succeeds (type-checks the new modules).

Then run `npm run dev` and load `http://localhost:3000/ko`. Expected: page renders with no server error in the terminal; browser shows Supabase auth cookies being set on navigation (DevTools → Application → Cookies, names starting with `sb-`).

- [ ] **Step 7: Commit**

```bash
git add src/features/account/supabase/client.ts src/features/account/supabase/server.ts src/features/account/supabase/proxy-session.ts src/proxy.ts
git commit -m "feat(account): add supabase clients and proxy session refresh"
```

---

## Task 4: Account domain types + profile validation

**Files:**
- Create: `src/features/account/domain/types.ts`
- Create: `src/features/account/domain/profile.ts`
- Test: `src/features/account/__tests__/profile.test.ts`

**Interfaces:**
- Produces:
  - `SchoolOption = { id: string; name: string; shortName: string }`
  - `GroupOption = { id: string; schoolId: string; name: string; type: "college" | "department" | "dormitory" | "staff" | "other" }`
  - `AccountProfile = { userId: string; displayName: string; schoolId: string; groupId: string }`
  - `ProfileDraft = { displayName: string; schoolId: string; groupId: string }`
  - `ProfileValidationError = "display-name-required" | "display-name-too-long" | "school-required" | "group-required" | "group-school-mismatch"`
  - `validateProfileDraft(draft: ProfileDraft, groups: readonly GroupOption[]): { ok: true; value: ProfileDraft } | { ok: false; error: ProfileValidationError }`

- [ ] **Step 1: Write the failing test**

Create `src/features/account/__tests__/profile.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { validateProfileDraft } from "../domain/profile";
import type { GroupOption } from "../domain/types";

const groups: GroupOption[] = [
  { id: "engineering", schoolId: "yeungnam", name: "Eng", type: "college" },
  { id: "humanities", schoolId: "yeungnam", name: "Hum", type: "college" },
];

describe("validateProfileDraft", () => {
  it("accepts a valid draft and trims the display name", () => {
    const result = validateProfileDraft(
      { displayName: "  Jin  ", schoolId: "yeungnam", groupId: "engineering" },
      groups,
    );

    expect(result).toEqual({
      ok: true,
      value: { displayName: "Jin", schoolId: "yeungnam", groupId: "engineering" },
    });
  });

  it("rejects an empty display name", () => {
    const result = validateProfileDraft(
      { displayName: "   ", schoolId: "yeungnam", groupId: "engineering" },
      groups,
    );

    expect(result).toEqual({ ok: false, error: "display-name-required" });
  });

  it("rejects a display name longer than 40 characters", () => {
    const result = validateProfileDraft(
      { displayName: "x".repeat(41), schoolId: "yeungnam", groupId: "engineering" },
      groups,
    );

    expect(result).toEqual({ ok: false, error: "display-name-too-long" });
  });

  it("rejects a missing school", () => {
    const result = validateProfileDraft(
      { displayName: "Jin", schoolId: "", groupId: "engineering" },
      groups,
    );

    expect(result).toEqual({ ok: false, error: "school-required" });
  });

  it("rejects a group that does not exist", () => {
    const result = validateProfileDraft(
      { displayName: "Jin", schoolId: "yeungnam", groupId: "" },
      groups,
    );

    expect(result).toEqual({ ok: false, error: "group-required" });
  });

  it("rejects a group that belongs to another school", () => {
    const result = validateProfileDraft(
      { displayName: "Jin", schoolId: "other", groupId: "engineering" },
      groups,
    );

    expect(result).toEqual({ ok: false, error: "group-school-mismatch" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/account/__tests__/profile.test.ts`
Expected: FAIL — cannot resolve `../domain/profile`.

- [ ] **Step 3: Write the types**

Create `src/features/account/domain/types.ts`:
```ts
import type { AffiliationGroup } from "@/features/campus-energy/domain/types";

export type SchoolOption = {
  id: string;
  name: string;
  shortName: string;
};

export type GroupOption = {
  id: string;
  schoolId: string;
  name: string;
  type: AffiliationGroup["type"];
};

export type AccountProfile = {
  userId: string;
  displayName: string;
  schoolId: string;
  groupId: string;
};

export type ProfileDraft = {
  displayName: string;
  schoolId: string;
  groupId: string;
};

export type ProfileValidationError =
  | "display-name-required"
  | "display-name-too-long"
  | "school-required"
  | "group-required"
  | "group-school-mismatch";
```

- [ ] **Step 4: Write the validation**

Create `src/features/account/domain/profile.ts`:
```ts
import type {
  GroupOption,
  ProfileDraft,
  ProfileValidationError,
} from "./types";

const MAX_DISPLAY_NAME_LENGTH = 40;

export type ProfileValidationResult =
  | { ok: true; value: ProfileDraft }
  | { ok: false; error: ProfileValidationError };

export function validateProfileDraft(
  draft: ProfileDraft,
  groups: readonly GroupOption[],
): ProfileValidationResult {
  const displayName = draft.displayName.trim();

  if (displayName.length === 0) {
    return { ok: false, error: "display-name-required" };
  }

  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return { ok: false, error: "display-name-too-long" };
  }

  if (draft.schoolId.length === 0) {
    return { ok: false, error: "school-required" };
  }

  const group = groups.find((candidate) => candidate.id === draft.groupId);

  if (!group) {
    return { ok: false, error: "group-required" };
  }

  if (group.schoolId !== draft.schoolId) {
    return { ok: false, error: "group-school-mismatch" };
  }

  return {
    ok: true,
    value: { displayName, schoolId: draft.schoolId, groupId: draft.groupId },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/account/__tests__/profile.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/account/domain/types.ts src/features/account/domain/profile.ts src/features/account/__tests__/profile.test.ts
git commit -m "feat(account): add profile validation domain"
```

---

## Task 5: Personal points + group pool domain

**Files:**
- Create: `src/features/account/domain/points.ts`
- Create: `src/features/account/domain/group-pool.ts`
- Test: `src/features/account/__tests__/points.test.ts`
- Test: `src/features/account/__tests__/group-pool.test.ts`

**Interfaces:**
- Consumes: `EnergyComparison` and `calculatePoints` from `@/features/campus-energy`.
- Produces:
  - `PointEvent = { id: string; userId: string; points: number; reason: string; periodLabel: string; createdAt: string }`
  - `sumPersonalPoints(events: readonly PointEvent[]): number`
  - `calculateMemberPeriodReward(comparison: EnergyComparison | null): number`
  - `GroupContribution = { userId: string; points: number }`
  - `GroupPointPool = { groupId: string; earnedPoints: number; memberCount: number }`
  - `calculateGroupPointPool(groupId: string, contributions: readonly GroupContribution[]): GroupPointPool`

- [ ] **Step 1: Write the failing points test**

Create `src/features/account/__tests__/points.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { calculateMemberPeriodReward, sumPersonalPoints } from "../domain/points";
import type { PointEvent } from "../domain/points";
import type { EnergyComparison } from "@/features/campus-energy/domain/types";

const event = (points: number): PointEvent => ({
  id: `e-${points}`,
  userId: "u1",
  points,
  reason: "verified-savings",
  periodLabel: "2026-W25",
  createdAt: "2026-06-26T00:00:00.000Z",
});

describe("sumPersonalPoints", () => {
  it("returns 0 for no events", () => {
    expect(sumPersonalPoints([])).toBe(0);
  });

  it("adds every event's points", () => {
    expect(sumPersonalPoints([event(120), event(80)])).toBe(200);
  });
});

describe("calculateMemberPeriodReward", () => {
  it("returns 0 when there is no comparison", () => {
    expect(calculateMemberPeriodReward(null)).toBe(0);
  });

  it("mirrors calculatePoints for a saving comparison", () => {
    const comparison: EnergyComparison = {
      subjectId: "yu-e21",
      actualKwh: 1360,
      forecastKwh: 1500,
      periodLabel: "2026-W25",
      deltaKwh: -140,
      savingsKwh: 140,
      overuseKwh: 0,
      savingsRate: 140 / 1500,
      status: "saving",
    };

    // calculatePoints = round(savingsKwh * 10) = 1400
    expect(calculateMemberPeriodReward(comparison)).toBe(1400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/account/__tests__/points.test.ts`
Expected: FAIL — cannot resolve `../domain/points`.

- [ ] **Step 3: Implement points domain**

Create `src/features/account/domain/points.ts`:
```ts
import { calculatePoints } from "@/features/campus-energy/domain/scoring";
import type { EnergyComparison } from "@/features/campus-energy/domain/types";

export type PointEvent = {
  id: string;
  userId: string;
  points: number;
  reason: string;
  periodLabel: string;
  createdAt: string;
};

export function sumPersonalPoints(events: readonly PointEvent[]): number {
  return events.reduce((sum, current) => sum + Math.max(0, current.points), 0);
}

export function calculateMemberPeriodReward(
  comparison: EnergyComparison | null,
): number {
  if (!comparison) return 0;
  return calculatePoints(comparison);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/account/__tests__/points.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing group-pool test**

Create `src/features/account/__tests__/group-pool.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { calculateGroupPointPool } from "../domain/group-pool";
import type { GroupContribution } from "../domain/group-pool";

const contributions: GroupContribution[] = [
  { userId: "u1", points: 1400 },
  { userId: "u2", points: 600 },
];

describe("calculateGroupPointPool", () => {
  it("sums member contributions and counts members", () => {
    expect(calculateGroupPointPool("engineering", contributions)).toEqual({
      groupId: "engineering",
      earnedPoints: 2000,
      memberCount: 2,
    });
  });

  it("returns a zero pool when there are no contributions", () => {
    expect(calculateGroupPointPool("humanities", [])).toEqual({
      groupId: "humanities",
      earnedPoints: 0,
      memberCount: 0,
    });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/features/account/__tests__/group-pool.test.ts`
Expected: FAIL — cannot resolve `../domain/group-pool`.

- [ ] **Step 7: Implement group-pool domain**

Create `src/features/account/domain/group-pool.ts`:
```ts
export type GroupContribution = {
  userId: string;
  points: number;
};

export type GroupPointPool = {
  groupId: string;
  earnedPoints: number;
  memberCount: number;
};

export function calculateGroupPointPool(
  groupId: string,
  contributions: readonly GroupContribution[],
): GroupPointPool {
  const earnedPoints = contributions.reduce(
    (sum, current) => sum + Math.max(0, current.points),
    0,
  );

  return {
    groupId,
    earnedPoints,
    memberCount: contributions.length,
  };
}
```

- [ ] **Step 8: Run both tests to verify they pass**

Run: `npx vitest run src/features/account/__tests__/points.test.ts src/features/account/__tests__/group-pool.test.ts`
Expected: PASS (6 tests total).

- [ ] **Step 9: Commit**

```bash
git add src/features/account/domain/points.ts src/features/account/domain/group-pool.ts src/features/account/__tests__/points.test.ts src/features/account/__tests__/group-pool.test.ts
git commit -m "feat(account): add personal points and group pool domain"
```

---

## Task 6: Auth server actions + i18n copy

**Files:**
- Create: `src/features/account/actions/auth.ts`
- Modify: `src/i18n/messages/ko.ts`
- Modify: `src/i18n/messages/en.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient()` (Task 3).
- Produces (each is a Server Action; returns `{ ok: false; error: string }` on failure or `redirect()`s on success):
  - `signUpAction(prevState: AuthActionState, formData: FormData): Promise<AuthActionState>`
  - `signInAction(prevState: AuthActionState, formData: FormData): Promise<AuthActionState>`
  - `signOutAction(): Promise<void>`
  - `AuthActionState = { error: string | null }`

Server Actions wiring is verified by build + runtime, not Vitest.

- [ ] **Step 1: Add i18n copy**

In `src/i18n/messages/ko.ts`, add a top-level `account` key (place it alongside the existing top-level message groups). Use these exact key paths:
```ts
  account: {
    login: {
      title: "로그인",
      email: "이메일",
      password: "비밀번호",
      submit: "로그인",
      pending: "로그인 중…",
      noAccount: "계정이 없으신가요?",
      signupLink: "회원가입",
      failed: "이메일 또는 비밀번호가 올바르지 않습니다.",
    },
    signup: {
      title: "회원가입",
      email: "이메일",
      password: "비밀번호",
      submit: "가입하기",
      pending: "가입 중…",
      hasAccount: "이미 계정이 있으신가요?",
      loginLink: "로그인",
      failed: "가입에 실패했습니다. 다시 시도해 주세요.",
      weakPassword: "비밀번호는 6자 이상이어야 합니다.",
    },
    signOut: "로그아웃",
    onboarding: {
      title: "소속 등록",
      description: "학교와 소속을 선택하면 절감 활동이 그룹 영지 포인트로 모입니다.",
      displayName: "표시 이름",
      school: "학교",
      group: "소속",
      submit: "등록 완료",
      pending: "저장 중…",
      errors: {
        "display-name-required": "표시 이름을 입력해 주세요.",
        "display-name-too-long": "표시 이름이 너무 깁니다.",
        "school-required": "학교를 선택해 주세요.",
        "group-required": "소속을 선택해 주세요.",
        "group-school-mismatch": "선택한 소속이 학교와 일치하지 않습니다.",
        unknown: "저장에 실패했습니다. 다시 시도해 주세요.",
      },
    },
    reward: {
      claim: "이번 주 절감 보상 받기",
      claimed: "보상을 받았습니다!",
      alreadyClaimed: "이번 주 보상은 이미 받았습니다.",
      pending: "처리 중…",
    },
    estatePool: {
      label: "그룹 영지 포인트",
      memberCount: "{count}명 참여",
    },
  },
```
Mirror the SAME key structure in `src/i18n/messages/en.ts` with English values (e.g. `login.title: "Log in"`, `reward.claim: "Claim this week's saving reward"`, `estatePool.label: "Group estate points"`, `estatePool.memberCount: "{count} members"`, etc.). All keys present in `ko.ts` MUST exist in `en.ts`.

- [ ] **Step 2: Implement auth actions**

Create `src/features/account/actions/auth.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../supabase/server";

export type AuthActionState = { error: string | null };

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "ko");
  return { email, password, locale };
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email, password, locale } = readCredentials(formData);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(`/${locale}/onboarding`);
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email, password, locale } = readCredentials(formData);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(`/${locale}`);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/ko/login");
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds; no type errors from the new action file or the message dictionaries (a missing/renamed i18n key fails the build here).

- [ ] **Step 4: Commit**

```bash
git add src/features/account/actions/auth.ts src/i18n/messages/ko.ts src/i18n/messages/en.ts
git commit -m "feat(account): add auth server actions and account i18n copy"
```

---

## Task 7: Login & signup pages

**Files:**
- Create: `src/features/account/components/login-form.tsx`
- Create: `src/features/account/components/signup-form.tsx`
- Create: `src/app/[locale]/login/page.tsx`
- Create: `src/app/[locale]/signup/page.tsx`

**Interfaces:**
- Consumes: `signInAction`, `signUpAction`, `AuthActionState` (Task 6); `useI18n` (`@/i18n/client`); `getMessages` (`@/i18n/dictionaries`); `isLocale` (`@/i18n/config`); `CampusEnergyProviders` (`@/features/campus-energy/components/campus-energy-providers`).
- Produces: `LoginForm`, `SignupForm` client components; `/[locale]/login` and `/[locale]/signup` routes.

- [ ] **Step 1: Login form**

Create `src/features/account/components/login-form.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { signInAction, type AuthActionState } from "../actions/auth";

const initialState: AuthActionState = { error: null };

export function LoginForm() {
  const { locale, messages } = useI18n();
  const copy = messages.account.login;
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="locale" value={locale} />
      <label className="grid gap-1 text-sm">
        <span>{copy.email}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11 rounded-xl border border-line bg-surface px-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{copy.password}</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11 rounded-xl border border-line bg-surface px-3"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-danger">{copy.failed}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-xl bg-accent font-semibold text-white disabled:opacity-60"
      >
        {pending ? copy.pending : copy.submit}
      </button>
      <p className="text-sm text-ink-muted">
        {copy.noAccount}{" "}
        <Link href={`/${locale}/signup`} className="font-semibold text-accent">
          {copy.signupLink}
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 2: Signup form**

Create `src/features/account/components/signup-form.tsx` — identical structure to `login-form.tsx` but: import `signUpAction`; `copy = messages.account.signup`; `autoComplete="new-password"`; the footer uses `copy.hasAccount` + a link to `/${locale}/login` with `copy.loginLink`.
```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { signUpAction, type AuthActionState } from "../actions/auth";

const initialState: AuthActionState = { error: null };

export function SignupForm() {
  const { locale, messages } = useI18n();
  const copy = messages.account.signup;
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="locale" value={locale} />
      <label className="grid gap-1 text-sm">
        <span>{copy.email}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11 rounded-xl border border-line bg-surface px-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{copy.password}</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="h-11 rounded-xl border border-line bg-surface px-3"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-danger">{copy.failed}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-xl bg-accent font-semibold text-white disabled:opacity-60"
      >
        {pending ? copy.pending : copy.submit}
      </button>
      <p className="text-sm text-ink-muted">
        {copy.hasAccount}{" "}
        <Link href={`/${locale}/login`} className="font-semibold text-accent">
          {copy.loginLink}
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 3: Login page**

Create `src/app/[locale]/login/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { LoginForm } from "@/features/account/components/login-form";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type LoginPageProps = { params: Promise<{ locale: string }> };

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-6 px-5">
        <h1 className="text-2xl font-semibold">{messages.account.login.title}</h1>
        <LoginForm />
      </main>
    </CampusEnergyProviders>
  );
}
```

- [ ] **Step 4: Signup page**

Create `src/app/[locale]/signup/page.tsx` — identical to the login page but importing `SignupForm` and titling with `messages.account.signup.title`.
```tsx
import { notFound } from "next/navigation";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { SignupForm } from "@/features/account/components/signup-form";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type SignupPageProps = { params: Promise<{ locale: string }> };

export default async function SignupPage({ params }: SignupPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-6 px-5">
        <h1 className="text-2xl font-semibold">{messages.account.signup.title}</h1>
        <SignupForm />
      </main>
    </CampusEnergyProviders>
  );
}
```

- [ ] **Step 5: Verify build + runtime**

Run: `npm run build` → expected success.
Then `npm run dev`: visit `/ko/signup`, create a test account (email confirmation disabled in Task 1). Expected: redirect to `/ko/onboarding` (which 404s until Task 9 — that is fine for now; the redirect itself proves signup worked). Visit `/ko/login` and sign in with the same account → redirect to `/ko`. Confirm a `profiles`-less user still reaches `/ko` (onboarding gate comes in Task 9).

- [ ] **Step 6: Commit**

```bash
git add src/features/account/components/login-form.tsx src/features/account/components/signup-form.tsx "src/app/[locale]/login/page.tsx" "src/app/[locale]/signup/page.tsx"
git commit -m "feat(account): add login and signup pages"
```

---

## Task 8: Account DAL (current user, profile, reference data)

**Files:**
- Create: `src/features/account/data/account-dal.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient()` (Task 3); `AccountProfile`, `SchoolOption`, `GroupOption` (Task 4).
- Produces (all server-only, `getCurrentUser`/`getCurrentProfile` wrapped in React `cache`):
  - `getCurrentUser(): Promise<{ id: string; email: string | null } | null>`
  - `getCurrentProfile(): Promise<AccountProfile | null>`
  - `getSchoolOptions(): Promise<SchoolOption[]>`
  - `getGroupOptions(): Promise<GroupOption[]>`

This module is server-bound (uses `cookies()` / network); verify by build + downstream task runtime, not Vitest.

- [ ] **Step 1: Read the auth DAL guide**

Read the "Creating a Data Access Layer (DAL)" section of `node_modules/next/dist/docs/01-app/02-guides/authentication.md` to confirm the `cache()` + `getUser()` pattern.

- [ ] **Step 2: Implement the DAL**

Create `src/features/account/data/account-dal.ts`:
```ts
import "server-only";
import { cache } from "react";
import { createServerSupabaseClient } from "../supabase/server";
import type {
  AccountProfile,
  GroupOption,
  SchoolOption,
} from "../domain/types";

export const getCurrentUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
});

export const getCurrentProfile = cache(
  async (): Promise<AccountProfile | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, school_id, group_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!data) return null;

    return {
      userId: data.id,
      displayName: data.display_name,
      schoolId: data.school_id,
      groupId: data.group_id,
    };
  },
);

export async function getSchoolOptions(): Promise<SchoolOption[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("schools")
    .select("id, name, short_name")
    .order("name");

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    shortName: row.short_name,
  }));
}

export async function getGroupOptions(): Promise<GroupOption[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("groups")
    .select("id, school_id, name, type")
    .order("name");

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    type: row.type as GroupOption["type"],
  }));
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/features/account/data/account-dal.ts
git commit -m "feat(account): add server data access layer"
```

---

## Task 9: Affiliation onboarding (profile registration)

**Files:**
- Create: `src/features/account/actions/profile.ts`
- Create: `src/features/account/components/onboarding-form.tsx`
- Create: `src/app/[locale]/onboarding/page.tsx`

**Interfaces:**
- Consumes: `validateProfileDraft` (Task 4); `getSchoolOptions`, `getGroupOptions`, `getCurrentUser`, `getCurrentProfile` (Task 8); `createServerSupabaseClient` (Task 3).
- Produces:
  - `saveProfileAction(prevState: ProfileActionState, formData: FormData): Promise<ProfileActionState>` where `ProfileActionState = { error: ProfileValidationError | "unknown" | null }`.
  - `OnboardingForm` client component; `/[locale]/onboarding` route (redirects to login if unauthenticated, to `/` if a profile already exists).

- [ ] **Step 1: Implement the profile action**

Create `src/features/account/actions/profile.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../supabase/server";
import { getCurrentUser, getGroupOptions } from "../data/account-dal";
import { validateProfileDraft } from "../domain/profile";
import type { ProfileValidationError } from "../domain/types";

export type ProfileActionState = {
  error: ProfileValidationError | "unknown" | null;
};

export async function saveProfileAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getCurrentUser();
  const locale = String(formData.get("locale") ?? "ko");
  if (!user) redirect(`/${locale}/login`);

  const groups = await getGroupOptions();
  const validation = validateProfileDraft(
    {
      displayName: String(formData.get("displayName") ?? ""),
      schoolId: String(formData.get("schoolId") ?? ""),
      groupId: String(formData.get("groupId") ?? ""),
    },
    groups,
  );

  if (!validation.ok) {
    return { error: validation.error };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: validation.value.displayName,
    school_id: validation.value.schoolId,
    group_id: validation.value.groupId,
  });

  if (error) {
    return { error: "unknown" };
  }

  redirect(`/${locale}`);
}
```

- [ ] **Step 2: Implement the onboarding form**

Create `src/features/account/components/onboarding-form.tsx`:
```tsx
"use client";

import { useActionState, useState } from "react";
import { useI18n } from "@/i18n/client";
import { saveProfileAction, type ProfileActionState } from "../actions/profile";
import type { GroupOption, SchoolOption } from "../domain/types";

const initialState: ProfileActionState = { error: null };

export function OnboardingForm({
  schools,
  groups,
}: {
  schools: SchoolOption[];
  groups: GroupOption[];
}) {
  const { locale, messages } = useI18n();
  const copy = messages.account.onboarding;
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? "");
  const [state, formAction, pending] = useActionState(
    saveProfileAction,
    initialState,
  );
  const visibleGroups = groups.filter((group) => group.schoolId === schoolId);

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="locale" value={locale} />
      <label className="grid gap-1 text-sm">
        <span>{copy.displayName}</span>
        <input
          name="displayName"
          type="text"
          required
          maxLength={40}
          className="h-11 rounded-xl border border-line bg-surface px-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{copy.school}</span>
        <select
          name="schoolId"
          value={schoolId}
          onChange={(event) => setSchoolId(event.target.value)}
          className="h-11 rounded-xl border border-line bg-surface px-3"
        >
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>{copy.group}</span>
        <select
          name="groupId"
          required
          defaultValue=""
          className="h-11 rounded-xl border border-line bg-surface px-3"
        >
          <option value="" disabled>
            —
          </option>
          {visibleGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </label>
      {state.error ? (
        <p className="text-sm text-danger">{copy.errors[state.error]}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-xl bg-accent font-semibold text-white disabled:opacity-60"
      >
        {pending ? copy.pending : copy.submit}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Implement the onboarding page (auth-gated)**

Create `src/app/[locale]/onboarding/page.tsx`:
```tsx
import { notFound, redirect } from "next/navigation";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { OnboardingForm } from "@/features/account/components/onboarding-form";
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupOptions,
  getSchoolOptions,
} from "@/features/account/data/account-dal";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type OnboardingPageProps = { params: Promise<{ locale: string }> };

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const profile = await getCurrentProfile();
  if (profile) redirect(`/${locale}`);

  const [messages, schools, groups] = await Promise.all([
    getMessages(locale),
    getSchoolOptions(),
    getGroupOptions(),
  ]);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-5 px-5">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">
            {messages.account.onboarding.title}
          </h1>
          <p className="text-sm text-ink-muted">
            {messages.account.onboarding.description}
          </p>
        </div>
        <OnboardingForm schools={schools} groups={groups} />
      </main>
    </CampusEnergyProviders>
  );
}
```

- [ ] **Step 4: Verify build + runtime**

Run: `npm run build` → expected success.
`npm run dev`: as the test user from Task 7, visit `/ko/onboarding`, register display name + `engineering`. Expected: redirect to `/ko`, and a row appears in `profiles` (verify with `mcp__claude_ai_Supabase__execute_sql`: `select * from profiles;`). Revisiting `/ko/onboarding` now redirects to `/ko` (profile exists).

- [ ] **Step 5: Commit**

```bash
git add src/features/account/actions/profile.ts src/features/account/components/onboarding-form.tsx "src/app/[locale]/onboarding/page.tsx"
git commit -m "feat(account): add affiliation onboarding"
```

---

## Task 10: Points DAL + claim reward action + group pool query

**Files:**
- Modify: `src/features/account/data/account-dal.ts`
- Create: `src/features/account/actions/points.ts`

**Interfaces:**
- Consumes: `sumPersonalPoints`, `PointEvent` (Task 5); `calculateGroupPointPool`, `GroupPointPool`, `GroupContribution` (Task 5); `calculateMemberPeriodReward` (Task 5); `getDemoEnergyComparisons` + `demoGroupIdsByOfficialCode`/`demoSubjects` (`@/features/campus-energy/data/demo-campus`); `getCurrentProfile` (Task 8).
- Produces:
  - DAL: `getPersonalPointTotal(userId: string): Promise<number>`, `getGroupPointPool(groupId: string): Promise<GroupPointPool>`.
  - `claimPeriodRewardAction(prevState: ClaimState, formData: FormData): Promise<ClaimState>` where `ClaimState = { status: "idle" | "claimed" | "already" | "error" }`.

- [ ] **Step 1: Extend the DAL**

Append to `src/features/account/data/account-dal.ts`:
```ts
import {
  sumPersonalPoints,
  type PointEvent,
} from "../domain/points";
import {
  calculateGroupPointPool,
  type GroupContribution,
  type GroupPointPool,
} from "../domain/group-pool";

function toPointEvents(
  rows: Array<{
    id: string;
    user_id: string;
    points: number;
    reason: string;
    period_label: string;
    created_at: string;
  }>,
): PointEvent[] {
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    points: row.points,
    reason: row.reason,
    periodLabel: row.period_label,
    createdAt: row.created_at,
  }));
}

export async function getPersonalPointTotal(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("point_events")
    .select("id, user_id, points, reason, period_label, created_at")
    .eq("user_id", userId);

  return sumPersonalPoints(toPointEvents(data ?? []));
}

export async function getGroupPointPool(
  groupId: string,
): Promise<GroupPointPool> {
  const supabase = await createServerSupabaseClient();
  // RLS scopes point_events to the current user's group, so a join through
  // profiles returns exactly this group's members' events.
  const { data } = await supabase
    .from("point_events")
    .select(
      "id, user_id, points, reason, period_label, created_at, profiles!inner(group_id)",
    )
    .eq("profiles.group_id", groupId);

  const events = toPointEvents(
    (data ?? []) as Array<{
      id: string;
      user_id: string;
      points: number;
      reason: string;
      period_label: string;
      created_at: string;
    }>,
  );

  const byUser = new Map<string, number>();
  for (const event of events) {
    byUser.set(event.userId, (byUser.get(event.userId) ?? 0) + event.points);
  }
  const contributions: GroupContribution[] = [...byUser.entries()].map(
    ([userId, points]) => ({ userId, points }),
  );

  return calculateGroupPointPool(groupId, contributions);
}
```

- [ ] **Step 2: Implement the claim action**

Create `src/features/account/actions/points.ts`. The reward equals `calculateMemberPeriodReward` of the user's group's energy comparison for the current demo period. Idempotency is enforced by the `unique (user_id, reason, period_label)` constraint — a duplicate insert returns a unique-violation, which we map to `already`.
```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  demoSubjects,
  getDemoEnergyComparisons,
} from "@/features/campus-energy/data/demo-campus";
import { compareEnergy } from "@/features/campus-energy/domain/energy";
import { createServerSupabaseClient } from "../supabase/server";
import { getCurrentProfile } from "../data/account-dal";
import { calculateMemberPeriodReward } from "../domain/points";

export type ClaimState = {
  status: "idle" | "claimed" | "already" | "error";
};

const DEMO_PERIOD_LABEL = "2026-W25";
const REWARD_REASON = "verified-savings";

export async function claimPeriodRewardAction(
  _prevState: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  const locale = String(formData.get("locale") ?? "ko");
  void locale;
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error" };

  // Aggregate the member's group savings for the demo period.
  const subjectIds = new Set(
    demoSubjects
      .filter((subject) => subject.groupId === profile.groupId)
      .map((subject) => subject.id),
  );
  const comparisons = getDemoEnergyComparisons().filter((comparison) =>
    subjectIds.has(comparison.subjectId),
  );
  const actualKwh = comparisons.reduce((sum, c) => sum + c.actualKwh, 0);
  const forecastKwh = comparisons.reduce((sum, c) => sum + c.forecastKwh, 0);
  const groupComparison =
    comparisons.length > 0
      ? compareEnergy({
          subjectId: profile.groupId,
          actualKwh,
          forecastKwh,
          periodLabel: DEMO_PERIOD_LABEL,
        })
      : null;

  const points = calculateMemberPeriodReward(groupComparison);
  if (points <= 0) return { status: "error" };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("point_events").insert({
    user_id: profile.userId,
    points,
    reason: REWARD_REASON,
    period_label: DEMO_PERIOD_LABEL,
  });

  if (error) {
    // 23505 = unique_violation → already claimed this period.
    if (error.code === "23505") {
      return { status: "already" };
    }
    return { status: "error" };
  }

  revalidatePath("/", "layout");
  return { status: "claimed" };
}
```

- [ ] **Step 3: Verify build + runtime**

Run: `npm run build` → expected success.
`npm run dev`: trigger the action only after Task 11 wires its button. For now, verify the build and that `select` queries run by calling `mcp__claude_ai_Supabase__execute_sql` `select * from point_events;` (empty is fine).

- [ ] **Step 4: Commit**

```bash
git add src/features/account/data/account-dal.ts src/features/account/actions/points.ts
git commit -m "feat(account): add points DAL and claim reward action"
```

---

## Task 11: Wire real profile, personal points, character, and claim button into the dashboard

**Files:**
- Create: `src/features/account/components/sign-out-button.tsx`
- Create: `src/features/account/components/claim-reward-button.tsx`
- Modify: `src/features/campus-energy/components/participant-dashboard.tsx`
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `getCurrentUser`, `getCurrentProfile`, `getPersonalPointTotal`, `getGroupPointPool` (Tasks 8, 10); `signOutAction` (Task 6); `claimPeriodRewardAction`, `ClaimState` (Task 10); `getCharacterProgress` (`@/features/campus-energy/domain/scoring`).
- Produces: real participant data on the home page; an onboarding/login gate; a personal-points-driven character; a claim-reward button; a sign-out button.

- [ ] **Step 1: Read the current home page**

Read `src/app/[locale]/page.tsx` to see how `CampusEnergyApp` / `ParticipantDashboard` are currently composed and what props flow in (the file passes locale messages into the client app). Capture the exact current structure before editing so the gate is inserted without breaking admin mode.

- [ ] **Step 2: Sign-out button**

Create `src/features/account/components/sign-out-button.tsx`:
```tsx
"use client";

import { useI18n } from "@/i18n/client";
import { signOutAction } from "../actions/auth";

export function SignOutButton() {
  const { messages } = useI18n();
  return (
    <form action={signOutAction}>
      <button type="submit" className="text-sm font-medium text-ink-muted">
        {messages.account.signOut}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Claim-reward button**

Create `src/features/account/components/claim-reward-button.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import {
  claimPeriodRewardAction,
  type ClaimState,
} from "../actions/points";

const initialState: ClaimState = { status: "idle" };

export function ClaimRewardButton() {
  const { locale, messages } = useI18n();
  const copy = messages.account.reward;
  const [state, formAction, pending] = useActionState(
    claimPeriodRewardAction,
    initialState,
  );

  const label =
    state.status === "claimed"
      ? copy.claimed
      : state.status === "already"
        ? copy.alreadyClaimed
        : pending
          ? copy.pending
          : copy.claim;

  return (
    <form action={formAction}>
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        disabled={pending || state.status === "claimed" || state.status === "already"}
        className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {label}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Make `ParticipantDashboard` consume real data**

Modify `src/features/campus-energy/components/participant-dashboard.tsx`. Replace the demo-derived `points` source with props supplied by the server page, keeping the existing layout/markup. Change the props type and the points/progress source:
```tsx
type ParticipantDashboardProps = {
  groups: AffiliationGroup[];
  participant: ParticipantProfile;
  personalPoints: number;
  groupPoolPoints: number;
  groupMemberCount: number;
};

export function ParticipantDashboard({
  groups,
  participant,
  personalPoints,
  groupPoolPoints,
  groupMemberCount,
}: ParticipantDashboardProps) {
  const { locale, messages } = useI18n();
  const groupRankings = getDemoGroupRankings();
  const myGroup = groups.find((group) => group.id === participant.groupId);
  const myRanking = groupRankings.find(
    (ranking) => ranking.subjectId === participant.groupId,
  );
  const progress = getCharacterProgress(personalPoints);
  // ...existing markup, but:
  //  - the "my points" MetricCard value uses formatPoints(locale, personalPoints)
  //  - add a group-pool line using messages.account.estatePool.label +
  //    interpolate(messages.account.estatePool.memberCount, { count: groupMemberCount })
  //    and formatPoints(locale, groupPoolPoints)
  //  - render <ClaimRewardButton /> near the points metrics
  //  - <CharacterCard progress={progress} points={personalPoints} />
}
```
Keep `myRanking` for the saved-energy and rank metrics (those remain demo-derived). Import `ClaimRewardButton` from `@/features/account/components/claim-reward-button` and `interpolate` from `@/i18n/interpolate`. Remove the now-unused local `const points = myRanking?.points ?? 0;`.

- [ ] **Step 5: Gate the home page and pass real data**

Modify `src/app/[locale]/page.tsx`. Before rendering the participant experience, resolve auth + profile on the server and pass real values down. Insert after the locale check (adapt to the file's actual structure found in Step 1):
```tsx
import { redirect } from "next/navigation";
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupPointPool,
  getPersonalPointTotal,
} from "@/features/account/data/account-dal";
// ...existing imports

// inside the component, after `if (!isLocale(locale)) notFound();`:
const user = await getCurrentUser();
if (!user) redirect(`/${locale}/login`);
const profile = await getCurrentProfile();
if (!profile) redirect(`/${locale}/onboarding`);

const [personalPoints, groupPool] = await Promise.all([
  getPersonalPointTotal(profile.userId),
  getGroupPointPool(profile.groupId),
]);
```
Then pass `personalPoints={personalPoints}`, `groupPoolPoints={groupPool.earnedPoints}`, `groupMemberCount={groupPool.memberCount}`, and a `participant` built from the real profile (`{ id: profile.userId, displayName: profile.displayName, schoolId: profile.schoolId, groupId: profile.groupId }`) into wherever `ParticipantDashboard` is rendered. Render `<SignOutButton />` in the app header area. If `CampusEnergyApp` currently owns the participant rendering with demo data, thread these props through it (update its props type accordingly) — do not duplicate the dashboard.

- [ ] **Step 6: Verify build + runtime**

Run: `npm run build` → expected success.
`npm run dev` as the registered test user at `/ko`:
- The affiliation card shows the real group; "my points" starts at 0; character is level 1.
- Click **이번 주 절감 보상 받기** → points jump to the group reward (engineering demo savings) and the character/group pool reflect it; clicking again shows "이미 받았습니다".
- Verify with `execute_sql`: `select points, reason, period_label from point_events;` shows one row.
- Sign out → redirected to `/ko/login`. Visiting `/ko` while signed out redirects to `/ko/login`.

- [ ] **Step 7: Commit**

```bash
git add src/features/account/components/sign-out-button.tsx src/features/account/components/claim-reward-button.tsx src/features/campus-energy/components/participant-dashboard.tsx "src/app/[locale]/page.tsx"
git commit -m "feat(account): wire real profile, points, and claim into dashboard"
```

---

## Task 12: Supabase estate repository

**Files:**
- Create: `src/features/estate/persistence/supabase-estate-repository.ts`
- Test: `src/features/estate/__tests__/supabase-estate-repository.test.ts`

**Interfaces:**
- Consumes: `EstateRepository`, `EstateRepositoryLoadResult`, `EstateRepositoryWriteResult`, `migrateEstateSnapshot`, `toPersistableEstateSnapshot` (`./estate-repository`); `EstateSnapshot` (`../domain/types`); `createDemoEstateSeedSnapshot` (`../data/demo-estate-data`).
- Produces: `class SupabaseEstateRepository implements EstateRepository` with constructor `({ client, ownerGroupId, seedSnapshot? })`. `client` is a minimal injected interface so the mapping logic is unit-testable without the real SDK:
  ```ts
  export interface EstateTableClient {
    select(subjectId: string): Promise<{ data: { snapshot: unknown } | null; error: { message: string } | null }>;
    upsert(row: { subject_id: string; owner_group_id: string; snapshot: EstateSnapshot }): Promise<{ error: { message: string } | null }>;
    delete(subjectId: string): Promise<{ error: { message: string } | null }>;
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `src/features/estate/__tests__/supabase-estate-repository.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { createDemoEstateSeedSnapshot } from "../data/demo-estate-data";
import {
  SupabaseEstateRepository,
  type EstateTableClient,
} from "../persistence/supabase-estate-repository";

const subjectId = "yu-e21";

function fakeClient(overrides: Partial<EstateTableClient> = {}): EstateTableClient {
  return {
    select: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
}

describe("SupabaseEstateRepository", () => {
  it("returns a null snapshot (not recovered) when the row is absent", async () => {
    const repo = new SupabaseEstateRepository({
      client: fakeClient(),
      ownerGroupId: "engineering",
    });

    const result = await repo.load(subjectId);
    expect(result).toEqual({ ok: true, snapshot: null, recovered: false });
  });

  it("returns the stored snapshot when present and valid", async () => {
    const seed = createDemoEstateSeedSnapshot(subjectId);
    const repo = new SupabaseEstateRepository({
      client: fakeClient({
        select: vi.fn().mockResolvedValue({ data: { snapshot: seed }, error: null }),
      }),
      ownerGroupId: "engineering",
    });

    const result = await repo.load(subjectId);
    expect(result.ok).toBe(true);
    if (result.ok && result.snapshot) {
      expect(result.snapshot.subjectId).toBe(subjectId);
    } else {
      throw new Error("expected a snapshot");
    }
  });

  it("recovers with a seed snapshot when stored data is corrupt", async () => {
    const repo = new SupabaseEstateRepository({
      client: fakeClient({
        select: vi
          .fn()
          .mockResolvedValue({ data: { snapshot: { schemaVersion: 99 } }, error: null }),
      }),
      ownerGroupId: "engineering",
    });

    const result = await repo.load(subjectId);
    expect(result.ok).toBe(true);
    if (result.ok && "recovered" in result) {
      expect(result.recovered).toBe(true);
    }
  });

  it("upserts the owner group id and snapshot on save", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const repo = new SupabaseEstateRepository({
      client: fakeClient({ upsert }),
      ownerGroupId: "engineering",
    });
    const seed = createDemoEstateSeedSnapshot(subjectId);

    const result = await repo.save(subjectId, seed);
    expect(result).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ subject_id: subjectId, owner_group_id: "engineering" }),
    );
  });

  it("reports a write error when upsert fails", async () => {
    const repo = new SupabaseEstateRepository({
      client: fakeClient({
        upsert: vi.fn().mockResolvedValue({ error: { message: "denied" } }),
      }),
      ownerGroupId: "engineering",
    });

    const result = await repo.save(subjectId, createDemoEstateSeedSnapshot(subjectId));
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/estate/__tests__/supabase-estate-repository.test.ts`
Expected: FAIL — cannot resolve `../persistence/supabase-estate-repository`.

- [ ] **Step 3: Implement the repository**

Create `src/features/estate/persistence/supabase-estate-repository.ts`:
```ts
import { createDemoEstateSeedSnapshot } from "../data/demo-estate-data";
import type { EstateSnapshot } from "../domain/types";
import {
  migrateEstateSnapshot,
  toPersistableEstateSnapshot,
  type EstateRepository,
  type EstateRepositoryError,
  type EstateRepositoryLoadResult,
  type EstateRepositoryWriteResult,
} from "./estate-repository";

export interface EstateTableClient {
  select(
    subjectId: string,
  ): Promise<{ data: { snapshot: unknown } | null; error: { message: string } | null }>;
  upsert(row: {
    subject_id: string;
    owner_group_id: string;
    snapshot: EstateSnapshot;
  }): Promise<{ error: { message: string } | null }>;
  delete(subjectId: string): Promise<{ error: { message: string } | null }>;
}

export type SupabaseEstateRepositoryOptions = {
  client: EstateTableClient;
  ownerGroupId: string;
  seedSnapshot?: (subjectId: string) => EstateSnapshot;
};

export class SupabaseEstateRepository implements EstateRepository {
  private readonly client: EstateTableClient;
  private readonly ownerGroupId: string;
  private readonly seedSnapshot: (subjectId: string) => EstateSnapshot;

  constructor(options: SupabaseEstateRepositoryOptions) {
    this.client = options.client;
    this.ownerGroupId = options.ownerGroupId;
    this.seedSnapshot = options.seedSnapshot ?? createDemoEstateSeedSnapshot;
  }

  async load(subjectId: string): Promise<EstateRepositoryLoadResult> {
    const { data, error } = await this.client.select(subjectId);

    if (error) {
      return this.recover(subjectId, {
        code: "storage-unavailable",
        subjectId,
        message: error.message,
      });
    }

    if (!data) {
      return { ok: true, snapshot: null, recovered: false };
    }

    const migrated = migrateEstateSnapshot(data.snapshot, { subjectId });
    if (!migrated.ok) {
      return this.recover(subjectId, migrated.error);
    }

    return { ok: true, snapshot: migrated.snapshot, recovered: false };
  }

  async save(
    subjectId: string,
    snapshot: EstateSnapshot,
  ): Promise<EstateRepositoryWriteResult> {
    const migrated = migrateEstateSnapshot(snapshot, { subjectId });
    if (!migrated.ok) return { ok: false, error: migrated.error };

    const { error } = await this.client.upsert({
      subject_id: subjectId,
      owner_group_id: this.ownerGroupId,
      snapshot: toPersistableEstateSnapshot(migrated.snapshot),
    });

    if (error) {
      return {
        ok: false,
        error: { code: "write-failed", subjectId, message: error.message },
      };
    }

    return { ok: true };
  }

  async remove(subjectId: string): Promise<EstateRepositoryWriteResult> {
    const { error } = await this.client.delete(subjectId);
    if (error) {
      return {
        ok: false,
        error: { code: "write-failed", subjectId, message: error.message },
      };
    }
    return { ok: true };
  }

  private recover(
    subjectId: string,
    error: EstateRepositoryError,
  ): EstateRepositoryLoadResult {
    return {
      ok: true,
      snapshot: this.seedSnapshot(subjectId),
      recovered: true,
      error,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/estate/__tests__/supabase-estate-repository.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/estate/persistence/supabase-estate-repository.ts src/features/estate/__tests__/supabase-estate-repository.test.ts
git commit -m "feat(estate): add supabase estate repository"
```

---

## Task 13: Group-funded estate page data + auth guard

**Files:**
- Modify: `src/features/estate/data/get-estate-page-data.ts`
- Modify: `src/app/[locale]/subjects/[subjectId]/estate/page.tsx`
- Test: `src/features/estate/__tests__/estate-page-data.test.ts` (update existing)

**Interfaces:**
- Consumes: `getCurrentProfile`, `getGroupPointPool` (Tasks 8, 10); `demoSubjects` (`@/features/campus-energy/data/demo-campus`).
- Produces: `getEstatePageData(locale, subjectId): Promise<EstatePageData | null>` now async, with `pointAccount.earnedPoints` = owner group's pool and a new `ownerGroupId: string` field; estate page redirects unauthenticated/unregistered users.

Note: this task changes the budget source. The estate snapshot's own transactions still subtract via `calculateEstatePointAccount`. Per the **Known MVP limitation** in Global Constraints, spend is enforced client-side + RLS, and each group maps to a single building estate in the demo, so cross-estate spend aggregation is out of scope.

- [ ] **Step 1: Read the existing page-data test**

Read `src/features/estate/__tests__/estate-page-data.test.ts` to see the current assertions and how `getEstatePageData` is invoked (it is currently synchronous). The update must keep the subject/snapshot assertions and adapt to `await` + injected dependencies.

- [ ] **Step 2: Refactor `getEstatePageData` to be async and group-funded**

Modify `src/features/estate/data/get-estate-page-data.ts`. Resolve the subject's owner group from `subject.groupId`; if absent, fall back to the current profile's group (so any building is still decoratable in the demo). Replace the `earnedPoints` computation:
```ts
// add fields to EstatePageData:
export type EstatePageData = {
  school: EstatePageSchool;
  subject: EstatePageSubject;
  comparison: EnergyComparison | null;
  pointAccount: EstatePointAccount;
  initialSnapshot: EstateSnapshot;
  ownerGroupId: string;
};

// signature becomes async with injectable resolvers (default to the real DAL):
export async function getEstatePageData(
  locale: Locale,
  subjectId: string,
  deps: {
    getProfileGroupId: () => Promise<string | null>;
    getGroupEarnedPoints: (groupId: string) => Promise<number>;
  },
): Promise<EstatePageData | null> {
  const localizedDemo = localizeDemoCampus(locale, messagesByLocale[locale]);
  const subject = localizedDemo.subjects.find((c) => c.id === subjectId);
  if (!subject || subject.type !== "building") return null;

  const profileGroupId = await deps.getProfileGroupId();
  if (!profileGroupId) return null;

  const rawSubject = demoSubjects.find((c) => c.id === subjectId);
  const ownerGroupId = rawSubject?.groupId ?? profileGroupId;
  const earnedPoints = await deps.getGroupEarnedPoints(ownerGroupId);

  const comparison =
    getDemoEnergyComparisons().find((c) => c.subjectId === subjectId) ?? null;

  return {
    school: { /* unchanged */ },
    subject: { /* unchanged */ },
    comparison,
    pointAccount: calculateEstatePointAccount(earnedPoints, []),
    initialSnapshot: createDemoEstateSeedSnapshot(subjectId),
    ownerGroupId,
  };
}
```
Add `import { demoSubjects } from "@/features/campus-energy/data/demo-campus";`. Remove the now-unused `calculatePoints` + `demoHistoricalEarnedPointsBySubjectId` import if they are no longer referenced.

- [ ] **Step 3: Update the estate page to await data + guard auth**

Modify `src/app/[locale]/subjects/[subjectId]/estate/page.tsx`:
```tsx
import { notFound, redirect } from "next/navigation";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { EstateGameClient } from "@/features/estate/components/estate-game-client";
import { getEstatePageData } from "@/features/estate/data/get-estate-page-data";
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupPointPool,
} from "@/features/account/data/account-dal";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type EstatePageProps = {
  params: Promise<{ locale: string; subjectId: string }>;
};

export default async function EstatePage({ params }: EstatePageProps) {
  const { locale, subjectId } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const messages = await getMessages(locale);
  const data = await getEstatePageData(locale, subjectId, {
    getProfileGroupId: async () => profile.groupId,
    getGroupEarnedPoints: async (groupId) =>
      (await getGroupPointPool(groupId)).earnedPoints,
  });
  if (!data) notFound();

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <EstateGameClient data={data} />
    </CampusEnergyProviders>
  );
}
```

- [ ] **Step 4: Update the page-data test**

Update `src/features/estate/__tests__/estate-page-data.test.ts` to `await` the function and pass stub deps, e.g.:
```ts
const data = await getEstatePageData("ko", "yu-e21", {
  getProfileGroupId: async () => "engineering",
  getGroupEarnedPoints: async () => 5000,
});
expect(data?.ownerGroupId).toBe("engineering");
expect(data?.pointAccount.earnedPoints).toBe(5000);
```
Keep any existing subject/snapshot assertions, adapting them to the awaited result. If a prior assertion checked the old per-subject `earnedPoints` math, replace it with the injected value above.

- [ ] **Step 5: Run the test + build**

Run: `npx vitest run src/features/estate/__tests__/estate-page-data.test.ts`
Expected: PASS.
Run: `npm run build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/features/estate/data/get-estate-page-data.ts "src/app/[locale]/subjects/[subjectId]/estate/page.tsx" src/features/estate/__tests__/estate-page-data.test.ts
git commit -m "feat(estate): fund estate budget from group pool with auth guard"
```

---

## Task 14: Default the estate client to the Supabase repository

**Files:**
- Modify: `src/features/estate/components/estate-game-client.tsx`

**Interfaces:**
- Consumes: `SupabaseEstateRepository`, `EstateTableClient` (Task 12); `createBrowserSupabaseClient` (Task 3); `EstatePageData.ownerGroupId` (Task 13).
- Produces: when no `repository` prop is supplied, the client builds a `SupabaseEstateRepository` bound to the browser Supabase client + `data.ownerGroupId`, instead of `LocalStorageEstateRepository`. The `repository?` prop is preserved for tests.

- [ ] **Step 1: Add a browser estate-table adapter**

In `src/features/estate/components/estate-game-client.tsx`, add a helper that adapts the browser Supabase client to the `EstateTableClient` interface (place it near the other module-scope helpers, e.g. above `EstateGameClient`):
```tsx
import { createBrowserSupabaseClient } from "@/features/account/supabase/client";
import {
  SupabaseEstateRepository,
  type EstateTableClient,
} from "../persistence/supabase-estate-repository";

function createEstateTableClient(): EstateTableClient {
  const supabase = createBrowserSupabaseClient();
  return {
    async select(subjectId) {
      const { data, error } = await supabase
        .from("estates")
        .select("snapshot")
        .eq("subject_id", subjectId)
        .maybeSingle();
      return {
        data: data ? { snapshot: data.snapshot } : null,
        error: error ? { message: error.message } : null,
      };
    },
    async upsert(row) {
      const { error } = await supabase.from("estates").upsert(row);
      return { error: error ? { message: error.message } : null };
    },
    async delete(subjectId) {
      const { error } = await supabase
        .from("estates")
        .delete()
        .eq("subject_id", subjectId);
      return { error: error ? { message: error.message } : null };
    },
  };
}
```

- [ ] **Step 2: Swap the default repository construction**

Replace the existing default-repository line:
```tsx
  if (repositoryRef.current === null) {
    repositoryRef.current = repository ?? new LocalStorageEstateRepository();
  }
```
with:
```tsx
  if (repositoryRef.current === null) {
    repositoryRef.current =
      repository ??
      new SupabaseEstateRepository({
        client: createEstateTableClient(),
        ownerGroupId: data.ownerGroupId,
      });
  }
```
Remove the now-unused `LocalStorageEstateRepository` import if no other reference remains. Keep `EstateRepository` type import.

- [ ] **Step 3: Verify build + existing estate tests**

Run: `npm run build` → expected success.
Run: `npm run test` → expected: full suite passes (the estate client a11y/canvas tests inject their own `repository`/memory repo, so they are unaffected; if any test relied on the localStorage default, update it to inject `MemoryEstateRepository`).

- [ ] **Step 4: Runtime end-to-end check**

`npm run dev` as the registered user who has claimed the reward:
- Open the engineering building estate via the map popup "Open estate" → `/ko/subjects/yu-e21/estate`.
- The coin chip shows the group pool balance (the claimed reward), not a per-subject number.
- Buy an item → balance drops, save chip reaches "saved". Reload the page → the purchase persists (now server-side). Verify with `execute_sql`: `select subject_id, owner_group_id from estates;`.
- Sign in as a SECOND user registered to the SAME group (engineering) in another browser/profile → opening the same estate shows the first user's placed item (shared snapshot) and the shared pool.
- A user in a DIFFERENT group opening this estate can view it but their write is rejected by RLS (save chip → "failed"); confirm this is the expected RLS gate.

- [ ] **Step 5: Commit**

```bash
git add src/features/estate/components/estate-game-client.tsx
git commit -m "feat(estate): persist shared estate via supabase repository"
```

---

## Task 15: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all Vitest files pass (new account domain tests + supabase repo test + updated estate-page-data test + pre-existing suite).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 errors. (Pre-existing warnings in `game-preview.tsx` are acceptable per prior sessions; introduce no new ones.)

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: success (type-checks all new server/client modules + i18n dictionaries).

- [ ] **Step 4: Supabase advisors**

Run `mcp__claude_ai_Supabase__get_advisors` (type `security`) and (type `performance`). Expected: no high-severity RLS or unindexed-FK findings for `profiles`, `point_events`, `estates`. Address any high-severity finding (the FK indexes in Task 2 cover the common performance advisories).

- [ ] **Step 5: Manual smoke checklist (dev server)**

Confirm each, in order, signed out at the start:
- `/ko` while signed out → redirects to `/ko/login`.
- Sign up at `/ko/signup` → lands on `/ko/onboarding`.
- Register school + group → lands on `/ko`, dashboard shows the real group, 0 points, level 1.
- Claim reward → points + group pool increase; second claim → "already claimed".
- Open the group's building estate → balance equals the group pool; buy + place an item; reload → persists.
- Sign out → `/ko/login`; `git diff --check` reports only CRLF/whitespace warnings, no real conflicts.

- [ ] **Step 6: Commit any verification fixups**

If Steps 1–5 required code changes, commit them with a `fix:` message describing what verification surfaced. If nothing changed, skip.

---

## Self-Review

**Spec coverage:**
- "로그인 기능을 통해 자신의 소속을 등록" → Tasks 6–9 (auth) + Task 9 (affiliation onboarding writing `profiles`).
- "자신만의 캐릭터 또는 포인트 적립 시스템" → Tasks 5, 10, 11 (personal `point_events` ledger, `sumPersonalPoints`, character from personal points via `getCharacterProgress`).
- "이걸 통해 그룹 영지 포인트를 얻을 수 있고" → Tasks 5, 10 (`calculateGroupPointPool`, `getGroupPointPool` summing members' personal points).
- "그걸로 영지 물품 구매가 가능" → Tasks 12–14 (group-pool budget feeds the estate; shared server-persisted snapshot; RLS-gated group writes).

**Type consistency check:** `AccountProfile.userId` used consistently (DAL → page → dashboard `participant.id`). `GroupPointPool.earnedPoints` consumed as estate `earnedPoints`. `EstatePageData.ownerGroupId` produced in Task 13, consumed in Task 14. `EstateTableClient` defined in Task 12, implemented in Task 14. `ProfileValidationError` union identical across Task 4 domain, Task 9 action, and the `onboarding.errors` i18n keys.

**Placeholder scan:** every code step contains real code/SQL; integration tasks that can't be unit-tested in jsdom (Supabase clients, server actions, DAL, proxy) state that explicitly and verify by build + runtime, not by a vacuous test — this is an honest constraint, not a skipped requirement.

**Known limitation (surfaced, not hidden):** server-side spend re-validation and multi-estate-per-group spend aggregation are explicitly out of scope (Global Constraints + Task 13 note), enforced instead by client checks + RLS write-gating with one estate per group in the demo.
