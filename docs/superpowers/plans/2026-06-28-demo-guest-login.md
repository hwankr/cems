# Demo Guest Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add presentation-ready guest persona buttons to the login and onboarding entry flow so a presenter can enter the app immediately without typing credentials.

**Architecture:** Reuse the existing Supabase email/password session flow and `signInWithPassword`; do not introduce service-role impersonation. The client renders only friendly guest persona labels, while the server action accepts an allowlisted persona key and resolves the real email plus a server-only shared guest password from environment variables. The UI exposes at most three curated scenarios rather than all seeded guest accounts.

**Tech Stack:** Next.js 16 App Router, React 19 Server Actions, Supabase Auth, TypeScript, Tailwind CSS v4 token utilities, CSS Modules, Vitest.

---

## Decision Summary

Agent brainstorming produced three useful constraints:

- UX: put `데모로 바로 입장` under the login form; keep it to three compact scenario cards so the auth card stays readable on mobile.
- Security: do not expose raw credentials, do not use service-role auth in app code, and gate the feature with a server-only env flag.
- Architecture: reuse the current server-action auth boundary and keep onboarding as a separate switch action, not part of the affiliation form.

Final decision: expose three curated personas backed by existing seeded guest accounts:

| Persona key | Visible scenario | Backing user | Why |
| --- | --- | --- | --- |
| `engineering-leader` | `공과대학 1위` | `guest1@cems.demo` | Shows a clean top contributor ranking in mapped engineering buildings. |
| `humanities-leader` | `문과대학 1위` | `guest7@cems.demo` | Shows another organization perspective without changing DB shape. |
| `estate-builder` | `영지 꾸미기 체험` | `guest12@cems.demo` | Student-services member can use the large shared group estate pool without exposing `it@naver.com` as one-click login. |

Do not expose `it@naver.com` as a one-click demo account. It remains useful for manual testing, but it is a real test account with an intentionally inflated balance.

Implementation addendum (2026-06-28): live password auth for the seeded `guest*@cems.demo` rows originally returned Supabase Auth `500 Database error querying schema`, while the existing manual test account authenticated successfully. The root cause was that the manual seed created `auth.users` rows for ranking display but did not create matching `auth.identities` rows or normalize Auth token fields required for password login. `docs/superpowers/migrations/2026-06-28-repair-demo-guest-auth-identities.sql` was applied to the live `cems` project on 2026-06-28; all 15 guest rows are now confirmed and have email identities. The code still supports a server-only single-account fallback with `CEMS_DEMO_GUEST_SINGLE_EMAIL`, but local demo mode is currently back on the three seeded personas.

Verification addendum (2026-06-28): `guest1@cems.demo`, `guest7@cems.demo`, and `guest12@cems.demo` authenticate successfully with the configured demo password. Browser smoke against `http://127.0.0.1:3001/ko/login` confirmed that the three demo cards land on `/ko`, create Supabase auth cookies, and emit no browser page errors.

## Files

- Create: `src/features/account/demo/demo-guest-personas.ts`
- Create: `src/features/account/demo/demo-guest-credentials.ts`
- Create: `src/features/account/components/demo-guest-entry.tsx`
- Create: `src/features/account/components/demo-guest-entry-client.tsx`
- Create: `src/features/account/__tests__/demo-guest-personas.test.ts`
- Create: `src/features/account/__tests__/demo-guest-entry.test.tsx`
- Create: `docs/superpowers/migrations/2026-06-28-rotate-demo-guest-passwords.sql`
- Create: `docs/superpowers/migrations/2026-06-28-repair-demo-guest-auth-identities.sql`
- Modify: `src/features/account/actions/auth.ts`
- Modify: `src/features/account/components/auth-shell.module.css`
- Modify: `src/app/[locale]/login/page.tsx`
- Modify: `src/app/[locale]/onboarding/page.tsx`
- Modify: `src/i18n/messages/ko.ts`
- Modify: `src/i18n/messages/en.ts`
- Modify: `.env.example`

## Environment And DB Contract

Runtime env vars:

```env
CEMS_DEMO_GUEST_LOGIN_ENABLED=false
CEMS_DEMO_GUEST_PASSWORD=
CEMS_DEMO_GUEST_SINGLE_EMAIL=
```

For local/demo deployment, set `CEMS_DEMO_GUEST_LOGIN_ENABLED=true` and set `CEMS_DEMO_GUEST_PASSWORD` to the generated password in `.env.local` and in the deployment environment. The SQL file records the operational rotation step, but the real password must not be committed. Generate one locally:

If the seeded `guest*@cems.demo` auth rows ever regress or a separate demo environment has not run the repair SQL, set `CEMS_DEMO_GUEST_SINGLE_EMAIL` to a working presentation account. The client still sees only the complete-account persona label; the email remains server-only.

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Then replace only the SQL session variable value in a local, uncommitted copy before applying it through Supabase SQL editor or MCP.

---

### Task 1: Guest Persona Registry

**Files:**
- Create: `src/features/account/demo/demo-guest-personas.ts`
- Create: `src/features/account/__tests__/demo-guest-personas.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/account/__tests__/demo-guest-personas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  demoGuestPersonas,
  isDemoGuestKey,
} from "../demo/demo-guest-personas";

describe("demoGuestPersonas", () => {
  it("exposes exactly the three presentation personas in display order", () => {
    expect(demoGuestPersonas.map((guest) => guest.key)).toEqual([
      "engineering-leader",
      "humanities-leader",
      "estate-builder",
    ]);
  });

  it("validates demo guest keys without accepting arbitrary input", () => {
    expect(isDemoGuestKey("engineering-leader")).toBe(true);
    expect(isDemoGuestKey("guest1@cems.demo")).toBe(false);
    expect(isDemoGuestKey("")).toBe(false);
    expect(isDemoGuestKey(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npx vitest run src/features/account/__tests__/demo-guest-personas.test.ts
```

Expected: fail because `demo-guest-personas.ts` does not exist.

- [ ] **Step 3: Add the persona registry**

Create `src/features/account/demo/demo-guest-personas.ts`:

```ts
export const demoGuestPersonas = [
  {
    key: "engineering-leader",
    icon: "trophy",
    accent: "green",
  },
  {
    key: "humanities-leader",
    icon: "sparkles",
    accent: "honey",
  },
  {
    key: "estate-builder",
    icon: "building",
    accent: "grass",
  },
] as const;

export type DemoGuestPersona = (typeof demoGuestPersonas)[number];
export type DemoGuestKey = DemoGuestPersona["key"];

const demoGuestKeys = new Set<string>(
  demoGuestPersonas.map((guest) => guest.key),
);

export function isDemoGuestKey(value: unknown): value is DemoGuestKey {
  return typeof value === "string" && demoGuestKeys.has(value);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npx vitest run src/features/account/__tests__/demo-guest-personas.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add src/features/account/demo/demo-guest-personas.ts src/features/account/__tests__/demo-guest-personas.test.ts
git commit -m "feat(account): define demo guest personas"
```

---

### Task 2: Server-Only Credential Resolution

**Files:**
- Create: `src/features/account/demo/demo-guest-credentials.ts`
- Modify: `src/features/account/actions/auth.ts`
- Modify: `.env.example`

- [ ] **Step 1: Create the server-only credential resolver**

Create `src/features/account/demo/demo-guest-credentials.ts`:

```ts
import "server-only";
import type { DemoGuestKey } from "./demo-guest-personas";

type DemoGuestCredential = {
  email: string;
  password: string;
};

const demoGuestEmails: Record<DemoGuestKey, string> = {
  "engineering-leader": "guest1@cems.demo",
  "humanities-leader": "guest7@cems.demo",
  "estate-builder": "guest12@cems.demo",
};

export type DemoGuestCredentialError =
  | "disabled"
  | "missing-password"
  | "invalid-guest";

export function resolveDemoGuestCredential(
  key: DemoGuestKey,
): DemoGuestCredential | { error: DemoGuestCredentialError } {
  if (process.env.CEMS_DEMO_GUEST_LOGIN_ENABLED !== "true") {
    return { error: "disabled" };
  }

  const password = process.env.CEMS_DEMO_GUEST_PASSWORD;
  if (!password) {
    return { error: "missing-password" };
  }

  const email = demoGuestEmails[key];
  if (!email) {
    return { error: "invalid-guest" };
  }

  return { email, password };
}
```

- [ ] **Step 2: Add the server action**

Modify `src/features/account/actions/auth.ts`.

Add imports:

```ts
import {
  isDemoGuestKey,
  type DemoGuestKey,
} from "../demo/demo-guest-personas";
import { resolveDemoGuestCredential } from "../demo/demo-guest-credentials";
```

Extend the action state types:

```ts
export type AuthActionState = { error: string | null };
export type DemoGuestActionState = {
  error:
    | null
    | "disabled"
    | "missing-password"
    | "invalid-guest"
    | "failed";
};
```

Add this action after `signInAction`:

```ts
export async function signInDemoGuestAction(
  guestKey: DemoGuestKey,
  _prevState: DemoGuestActionState,
  formData: FormData,
): Promise<DemoGuestActionState> {
  const locale = normalizeLocale(formData.get("locale"));
  const next = isSafeNextPath(formData.get("next"));

  if (!isDemoGuestKey(guestKey)) {
    return { error: "invalid-guest" };
  }

  const credential = resolveDemoGuestCredential(guestKey);
  if ("error" in credential) {
    return { error: credential.error };
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword(credential);

  if (error) {
    return { error: "failed" };
  }

  redirect(next ?? `/${locale}`);
}
```

- [ ] **Step 3: Add env documentation**

Modify `.env.example`:

```env
CEMS_DEMO_GUEST_LOGIN_ENABLED=false
CEMS_DEMO_GUEST_PASSWORD=
```

- [ ] **Step 4: Type-check the touched auth code**

Run:

```powershell
npx tsc --noEmit --pretty false
```

Expected: no new TypeScript errors from `auth.ts` or demo guest files. If the repo has pre-existing test-only type errors, confirm none mention these new files.

- [ ] **Step 5: Commit**

```powershell
git add src/features/account/actions/auth.ts src/features/account/demo/demo-guest-credentials.ts .env.example
git commit -m "feat(account): add server-side demo guest sign-in"
```

---

### Task 3: Login And Onboarding Demo Guest UI

**Files:**
- Create: `src/features/account/components/demo-guest-entry.tsx`
- Create: `src/features/account/__tests__/demo-guest-entry.test.tsx`
- Modify: `src/features/account/components/auth-shell.module.css`
- Modify: `src/app/[locale]/login/page.tsx`
- Modify: `src/app/[locale]/onboarding/page.tsx`

- [ ] **Step 1: Write the component test**

Create `src/features/account/__tests__/demo-guest-entry.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { koMessages } from "@/i18n/messages/ko";
import { DemoGuestEntry } from "../components/demo-guest-entry";

vi.mock("../actions/auth", () => ({
  signInDemoGuestAction: async () => ({ error: null }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("DemoGuestEntry", () => {
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

  it("renders three guest scenario buttons without exposing emails", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <I18nProvider locale="ko" messages={koMessages}>
          <DemoGuestEntry next="/ko/me" />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain("데모로 바로 입장");
    expect(container.textContent).toContain("공과대학 1위");
    expect(container.textContent).toContain("문과대학 1위");
    expect(container.textContent).toContain("영지 꾸미기 체험");
    expect(container.textContent).not.toContain("@cems.demo");
    expect(container.querySelectorAll("form")).toHaveLength(3);
    expect(container.querySelectorAll('input[name="next"]')).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npx vitest run src/features/account/__tests__/demo-guest-entry.test.tsx
```

Expected: fail because `DemoGuestEntry` does not exist.

- [ ] **Step 3: Create the component**

Create `src/features/account/components/demo-guest-entry.tsx`:

```tsx
"use client";

import { Building2, Sparkles, Trophy } from "lucide-react";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { signInDemoGuestAction, type DemoGuestActionState } from "../actions/auth";
import {
  demoGuestPersonas,
  type DemoGuestPersona,
} from "../demo/demo-guest-personas";
import styles from "./auth-shell.module.css";

const initialState: DemoGuestActionState = { error: null };

function DemoIcon({ guest }: { guest: DemoGuestPersona }) {
  if (guest.icon === "trophy") return <Trophy aria-hidden="true" />;
  if (guest.icon === "sparkles") return <Sparkles aria-hidden="true" />;
  return <Building2 aria-hidden="true" />;
}

function DemoGuestCard({
  guest,
  next,
}: {
  guest: DemoGuestPersona;
  next?: string;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.account.demoGuest;
  const personaCopy = copy.personas[guest.key];
  const action = signInDemoGuestAction.bind(null, guest.key);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.demoGuestForm}>
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <button type="submit" disabled={pending} className={styles.demoGuestCard}>
        <span className={styles.demoGuestIcon}>
          <DemoIcon guest={guest} />
        </span>
        <span className={styles.demoGuestText}>
          <span className={styles.demoGuestTitle}>{personaCopy.title}</span>
          <span className={styles.demoGuestMeta}>{personaCopy.meta}</span>
        </span>
        <span className={styles.demoGuestAction}>
          {pending ? copy.entering : copy.enter}
        </span>
      </button>
      {state.error ? (
        <p className={styles.demoGuestError}>{copy.errors[state.error]}</p>
      ) : null}
    </form>
  );
}

export function DemoGuestEntry({ next }: { next?: string }) {
  const { messages } = useI18n();
  const copy = messages.account.demoGuest;

  return (
    <section className={styles.demoGuestSection} aria-label={copy.title}>
      <div className={styles.demoGuestHeader}>
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>
      <div className={styles.demoGuestList}>
        {demoGuestPersonas.map((guest) => (
          <DemoGuestCard key={guest.key} guest={guest} next={next} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Add CSS module styles**

Append to `src/features/account/components/auth-shell.module.css`:

```css
.demoGuestSection {
  margin-top: 1.35rem;
  padding-top: 1.15rem;
  border-top: 1px solid var(--color-line);
  text-align: left;
}

.demoGuestHeader {
  display: grid;
  gap: 0.2rem;
  text-align: center;
}

.demoGuestHeader h2 {
  color: var(--color-ink);
  font-size: 0.95rem;
  font-weight: 720;
}

.demoGuestHeader p {
  color: var(--color-ink-muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

.demoGuestList {
  display: grid;
  gap: 0.55rem;
  margin-top: 0.8rem;
}

.demoGuestForm {
  display: grid;
  gap: 0.3rem;
}

.demoGuestCard {
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  min-height: 3.25rem;
  padding: 0.55rem 0.65rem;
  border-radius: 18px;
  border: 1px solid var(--color-line-strong);
  background: rgb(255 255 255 / 0.62);
  color: var(--color-ink);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    transform 0.05s ease;
}

.demoGuestCard:hover:not(:disabled) {
  border-color: rgb(15 122 82 / 0.32);
  background: rgb(255 255 255 / 0.82);
}

.demoGuestCard:active:not(:disabled) {
  transform: translateY(1px);
}

.demoGuestCard:disabled {
  cursor: default;
  opacity: 0.72;
}

.demoGuestIcon {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.demoGuestIcon svg {
  width: 1rem;
  height: 1rem;
}

.demoGuestText {
  display: grid;
  min-width: 0;
  gap: 0.1rem;
}

.demoGuestTitle {
  color: var(--color-ink);
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.2;
}

.demoGuestMeta {
  overflow: hidden;
  color: var(--color-ink-muted);
  font-size: 0.75rem;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demoGuestAction {
  color: var(--color-accent);
  font-size: 0.75rem;
  font-weight: 720;
  white-space: nowrap;
}

.demoGuestError {
  color: var(--color-overuse);
  font-size: 0.74rem;
  line-height: 1.35;
  text-align: center;
}
```

- [ ] **Step 5: Wire login and onboarding pages**

Modify `src/app/[locale]/login/page.tsx`.

Add import:

```ts
import { DemoGuestEntry } from "@/features/account/components/demo-guest-entry";
```

Render the demo entry after `LoginForm`:

```tsx
<LoginForm next={next} />
<DemoGuestEntry next={next} />
```

Modify `src/app/[locale]/onboarding/page.tsx`.

Add import:

```ts
import { DemoGuestEntry } from "@/features/account/components/demo-guest-entry";
```

Render the demo entry after `OnboardingForm`:

```tsx
<OnboardingForm schools={schools} groups={groups} />
<DemoGuestEntry />
```

- [ ] **Step 6: Run the component test**

Run:

```powershell
npx vitest run src/features/account/__tests__/demo-guest-entry.test.tsx
```

Expected: pass.

- [ ] **Step 7: Commit**

```powershell
git add src/features/account/components/demo-guest-entry.tsx src/features/account/components/auth-shell.module.css src/features/account/__tests__/demo-guest-entry.test.tsx src/app/[locale]/login/page.tsx src/app/[locale]/onboarding/page.tsx
git commit -m "feat(account): show demo guest entry cards"
```

---

### Task 4: Korean And English Copy

**Files:**
- Modify: `src/i18n/messages/ko.ts`
- Modify: `src/i18n/messages/en.ts`

- [ ] **Step 1: Add Korean copy**

Modify `src/i18n/messages/ko.ts` under `account`:

```ts
demoGuest: {
  title: "데모로 바로 입장",
  description: "발표 시연용 계정으로 입력 없이 시작합니다.",
  enter: "입장",
  entering: "입장 중…",
  personas: {
    "engineering-leader": {
      title: "공과대학 1위",
      meta: "기여 랭킹 · 공학관",
    },
    "humanities-leader": {
      title: "문과대학 1위",
      meta: "기여 랭킹 · 인문관",
    },
    "estate-builder": {
      title: "영지 꾸미기 체험",
      meta: "학생지원 · 중앙도서관 영지",
    },
  },
  errors: {
    disabled: "현재 데모 입장이 꺼져 있습니다.",
    "missing-password": "데모 계정 비밀번호 환경 변수가 없습니다.",
    "invalid-guest": "사용할 수 없는 데모 계정입니다.",
    failed: "데모 계정 입장에 실패했습니다.",
  },
},
```

- [ ] **Step 2: Add English copy**

Modify `src/i18n/messages/en.ts` under `account`:

```ts
demoGuest: {
  title: "Enter demo instantly",
  description: "Use a presentation account without typing credentials.",
  enter: "Enter",
  entering: "Entering…",
  personas: {
    "engineering-leader": {
      title: "Engineering #1",
      meta: "Contribution ranking · Engineering Hall",
    },
    "humanities-leader": {
      title: "Humanities #1",
      meta: "Contribution ranking · Humanities Hall",
    },
    "estate-builder": {
      title: "Estate builder",
      meta: "Student Services · Central Library estate",
    },
  },
  errors: {
    disabled: "Demo entry is currently disabled.",
    "missing-password": "The demo password environment variable is missing.",
    "invalid-guest": "This demo account is not available.",
    failed: "Failed to enter with the demo account.",
  },
},
```

- [ ] **Step 3: Run message tests**

Run:

```powershell
npx vitest run src/i18n/__tests__/messages.test.ts src/features/account/__tests__/demo-guest-entry.test.tsx
```

Expected: pass. `Messages` is derived from Korean, so English missing keys should fail TypeScript or message tests.

- [ ] **Step 4: Commit**

```powershell
git add src/i18n/messages/ko.ts src/i18n/messages/en.ts
git commit -m "feat(i18n): add demo guest entry copy"
```

---

### Task 5: Rotate Live Demo Guest Passwords

**Files:**
- Create: `docs/superpowers/migrations/2026-06-28-rotate-demo-guest-passwords.sql`

- [ ] **Step 1: Create the SQL record**

Create `docs/superpowers/migrations/2026-06-28-rotate-demo-guest-passwords.sql`:

```sql
-- Operational SQL record for rotating presentation guest passwords.
-- Applied manually to Supabase project `cems` when demo one-click login is enabled.
--
-- Do not commit the real password. Before applying, generate a new password,
-- set it as `CEMS_DEMO_GUEST_PASSWORD` in the runtime environment, then set the
-- same value into the local SQL session variable below.

-- Local-only step before applying:
-- Run select set_config('cems.demo_guest_password', generated_password, false)
-- in the same SQL session, where generated_password is the secret value stored
-- in CEMS_DEMO_GUEST_PASSWORD.

do $$
declare
  demo_password text := current_setting('cems.demo_guest_password', true);
begin
  if demo_password is null or length(demo_password) < 24 then
    raise exception 'Set cems.demo_guest_password to a generated password before applying.';
  end if;

  update auth.users
  set
    encrypted_password = crypt(demo_password, gen_salt('bf')),
    updated_at = now()
  where email in (
    'guest1@cems.demo',
    'guest2@cems.demo',
    'guest3@cems.demo',
    'guest4@cems.demo',
    'guest5@cems.demo',
    'guest6@cems.demo',
    'guest7@cems.demo',
    'guest8@cems.demo',
    'guest9@cems.demo',
    'guest10@cems.demo',
    'guest11@cems.demo',
    'guest12@cems.demo',
    'guest13@cems.demo',
    'guest14@cems.demo',
    'guest15@cems.demo'
  );
end $$;
```

- [ ] **Step 2: Generate and apply the live password rotation**

Run locally:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$secret = [Convert]::ToBase64String($bytes)
$secret
```

Set `CEMS_DEMO_GUEST_PASSWORD` to the printed value in `.env.local` and in the deployment environment.

Apply the SQL in Supabase in one SQL session: first call `set_config('cems.demo_guest_password', generatedPassword, false)` with the generated value, then run the committed `do` block. Do not save the generated value in this repository.

Expected SQL result: the `do` block completes without raising an exception.

- [ ] **Step 3: Confirm selected guest accounts can authenticate**

With `.env.local` containing `CEMS_DEMO_GUEST_LOGIN_ENABLED=true` and `CEMS_DEMO_GUEST_PASSWORD` set to the same generated secret used for the DB rotation, run the app and manually try the three demo cards on `/ko/login`.

Expected:

- `공과대학 1위` lands on `/ko` as the engineering persona.
- `문과대학 1위` lands on `/ko` as the humanities persona.
- `영지 꾸미기 체험` lands on `/ko` as the student-services persona.
- None of these accounts reaches `/ko/onboarding`, because each already has a `profiles` row.

- [ ] **Step 4: Commit the SQL record**

```powershell
git add docs/superpowers/migrations/2026-06-28-rotate-demo-guest-passwords.sql
git commit -m "docs(db): record demo guest password rotation"
```

---

### Task 6: Full Verification

**Files:**
- No new files.
- Verify all files touched in Tasks 1-5.

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
npx vitest run src/features/account/__tests__/demo-guest-personas.test.ts src/features/account/__tests__/demo-guest-entry.test.tsx src/i18n/__tests__/messages.test.ts
```

Expected: all targeted tests pass.

- [ ] **Step 2: Run full test suite**

Run:

```powershell
npm run test
```

Expected: all tests pass.

- [ ] **Step 3: Run lint**

Run:

```powershell
npm run lint
```

Expected: 0 errors. The existing `src/features/campus-energy/components/game-preview.tsx` warnings may remain if they are still part of the repo baseline.

- [ ] **Step 4: Run production build**

Run:

```powershell
npm run build
```

Expected: build passes and includes `/[locale]/login` and `/[locale]/onboarding`.

- [ ] **Step 5: Manual browser smoke**

Start the app:

```powershell
npm run dev
```

Check:

- `/ko/login`: three demo cards render under the normal login form.
- `/en/login`: English demo cards render under the normal login form.
- `/ko/onboarding`: when logged into a no-profile account, the demo entry appears below the onboarding form and replaces the session with the selected demo account.
- `/ko/me`: selected demo account has a profile page.
- `/ko/subjects/yu-e21/estate`: engineering persona can load the estate flow.
- `/ko/subjects/yu-c02/estate`: humanities persona can load the estate flow.
- `/ko/subjects/yu-b04/estate`: student-services persona can load the estate flow.

- [ ] **Step 6: Commit verification notes if docs are updated**

Only if implementation updates docs beyond this plan:

```powershell
git add docs/working/current-state.md docs/working/meeting-notes.md
git commit -m "docs: record demo guest login verification"
```

Do not update working docs unless the user asks to record the session or the implementation changes the next-session entry point.

---

## Self-Review

- Spec coverage: The plan creates clickable guest entry on login and onboarding, supports multiple demo situations without exposing all 15 seed users, preserves the normal auth flow, and gates the feature for presentation use.
- Placeholder scan: The only angle-bracket values are secret-handling examples that must not be committed; the plan gives concrete generation and rotation commands instead of requiring a hard-coded secret.
- Type consistency: `DemoGuestKey` is defined once in `demo-guest-personas.ts`, used by the server action and UI component, and all i18n persona keys match the three literal keys.
- Security check: Client receives only persona labels and keys. Emails and password resolution stay server-only. No service-role key is introduced in app runtime.
