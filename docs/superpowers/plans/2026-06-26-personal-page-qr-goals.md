# Personal Page + QR Missions + Goals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `/me` personal page, a server-authoritative QR mission point-earning loop (`/scan/[code]`), and predefined daily/weekly goals with server-verified completion bonuses, surfaced on the map and in the group estate.

**Architecture:** New `missions` Supabase feature (tables `missions`/`mission_completions`/`goals`, RPCs `complete_mission`/`claim_goal_reward`/`get_my_goal_progress`) reuses the existing append-only `point_events` ledger so one insert updates personal points, character, group pool, and estate budget at once. New `/me` and `/scan/[code]` routes plus a map profile chip and an estate contribution chip read this data. All economic mutations go through SECURITY DEFINER RPCs; direct client writes stay blocked by RLS.

**Tech Stack:** Next.js 16.2.9 (App Router, locale-prefixed routes), React 19.2.7, TypeScript, Tailwind CSS v4, Supabase (`@supabase/ssr`), lucide-react, Vitest 4.

## Global Constraints

- All point-earning mutations are server-authoritative SECURITY DEFINER RPCs; the client cannot supply or forge the amount. Direct insert into `point_events` / `mission_completions` stays blocked by RLS.
- Reuse the existing `point_events` schema verbatim: `points int check (points >= 0)`, `unique (user_id, reason, period_label)`. QR points use `reason = 'qr:'||code`, goal bonuses use `reason = 'goal:'||id`.
- "Today" / "this week" boundaries are computed in Postgres with `at time zone 'Asia/Seoul'`; weekly labels use ISO week `to_char(day, 'IYYY-"W"IW')` (e.g. `2026-W26`), matching the existing `YYYY-Www` convention.
- Korean is the default language. Every user-facing string is added to BOTH `src/i18n/messages/ko.ts` and `src/i18n/messages/en.ts` (the `Messages` type derives from `ko.ts`; `en.ts` is `satisfies Messages`, so missing keys are a type error).
- No open redirects: the login `next` return path is validated to be a same-site, locale-prefixed path.
- Before writing route/page code, follow `AGENTS.md` and read the relevant local Next.js docs under `node_modules/next/dist/docs/` (this Next.js diverges from training data; `params` and `searchParams` are Promises).
- Supabase project ref: `zvuqmagfpdyrrzyjntue`. Migrations are applied with the Supabase MCP `apply_migration` tool and recorded as a `.sql` file under `docs/superpowers/migrations/`.
- The existing `ParticipantDashboard` stays; only a "내 페이지 →" link is added.
- Commits follow the repo's conventional-commit style (`feat:`, `fix:`, `docs:`). Co-located tests live in `__tests__/` folders.

---

## File Structure

New feature module `src/features/missions/`:
- `domain/goals.ts` — `Goal`, `GoalScope`, `GoalCounts`, `GoalProgress`, `computeGoalProgress()` (pure).
- `data/missions-dal.ts` — `getActiveMissions()`, `getMission(code)`, `getGoalsWithProgress(userId)`.
- `actions/complete-mission.ts` — `completeMissionAction` server action.
- `actions/claim-goal.ts` — `claimGoalRewardAction` server action.
- `components/goal-list.tsx` — `GoalList` (+ internal `GoalCard`).
- `components/mission-confirm.tsx` — `MissionConfirm` (scan confirm + result).
- `__tests__/goals.test.ts` — Vitest for `computeGoalProgress`.

Additions to `src/features/account/`:
- `domain/point-reason.ts` + `__tests__/point-reason.test.ts` — `parsePointEventReason()`.
- `domain/safe-redirect.ts` + `__tests__/safe-redirect.test.ts` — `isSafeNextPath()`.
- `data/account-dal.ts` — add `getMyPointEvents()`, `getGroupEstateSubjectId()`.
- `components/profile-summary.tsx`, `components/points-history.tsx`, `components/estate-contribution.tsx`, `components/estate-contribution-chip.tsx`.
- `actions/auth.ts`, `components/login-form.tsx` — `next` support.

New routes:
- `src/app/[locale]/me/page.tsx`
- `src/app/[locale]/scan/[code]/page.tsx`

Map:
- `src/features/campus-energy/components/profile-chip.tsx` (new); modify `admin-map-view.tsx`, `campus-energy-app.tsx`, `participant-dashboard.tsx`.

Estate:
- modify `src/app/[locale]/subjects/[subjectId]/estate/page.tsx`.

i18n: modify `src/i18n/messages/ko.ts`, `src/i18n/messages/en.ts`, `src/app/[locale]/login/page.tsx`.

Migration record: `docs/superpowers/migrations/2026-06-26-missions-and-goals.sql`.

---

## Task 1: Database — missions/goals tables, seeds, and RPCs

**Files:**
- Create: `docs/superpowers/migrations/2026-06-26-missions-and-goals.sql` (record of the applied migration)
- Apply via Supabase MCP `apply_migration` (project `zvuqmagfpdyrrzyjntue`, name `missions_and_goals`)

**Interfaces:**
- Produces (DB): tables `public.missions(code, points, category, active)`, `public.mission_completions(id, user_id, mission_code, day, created_at)`, `public.goals(id, scope, target_count, bonus_points, active)`; functions `public.complete_mission(p_code text) returns text`, `public.claim_goal_reward(p_goal_id text) returns text`, `public.get_my_goal_progress() returns table(today_label text, week_label text, today_count int, week_count int)`.
- Consumes: existing `public.profiles`, `public.point_events` (unique `(user_id, reason, period_label)`), `public.estate_subjects`.

- [ ] **Step 1: Write the migration SQL to the record file**

Create `docs/superpowers/migrations/2026-06-26-missions-and-goals.sql` with this exact content:

```sql
-- Applied to Supabase project `cems` (ref zvuqmagfpdyrrzyjntue) on 2026-06-26
-- via apply_migration name `missions_and_goals`.
--
-- Adds the QR mission point-earning loop and predefined daily/weekly goals.
-- All point grants stay server-authoritative: missions/goals write to
-- point_events only through SECURITY DEFINER RPCs; clients cannot insert.

-- ---- tables ----
create table public.missions (
  code text primary key,
  points int not null check (points >= 0),
  category text not null,
  active boolean not null default true
);
alter table public.missions enable row level security;
create policy "missions readable" on public.missions
  for select to authenticated using (true);

create table public.mission_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_code text not null references public.missions (code),
  day date not null,
  created_at timestamptz not null default now(),
  unique (user_id, mission_code, day)
);
create index mission_completions_user_idx on public.mission_completions (user_id);
alter table public.mission_completions enable row level security;
create policy "own mission completions select" on public.mission_completions
  for select to authenticated using (user_id = auth.uid());

create table public.goals (
  id text primary key,
  scope text not null check (scope in ('daily', 'weekly')),
  target_count int not null check (target_count > 0),
  bonus_points int not null check (bonus_points >= 0),
  active boolean not null default true
);
alter table public.goals enable row level security;
create policy "goals readable" on public.goals
  for select to authenticated using (true);

-- ---- seeds ----
insert into public.missions (code, points, category) values
  ('stairs', 50, 'stairs'),
  ('lights-off', 80, 'facility'),
  ('recycle', 40, 'waste'),
  ('eco-commute', 60, 'transport'),
  ('tumbler', 30, 'waste');

insert into public.goals (id, scope, target_count, bonus_points) values
  ('daily-1', 'daily', 1, 20),
  ('daily-3', 'daily', 3, 80),
  ('weekly-10', 'weekly', 10, 300);

-- ---- complete_mission: authoritative QR award, 1 per mission per day ----
create or replace function public.complete_mission(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_points int;
  v_active boolean;
  v_day date := (now() at time zone 'Asia/Seoul')::date;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select points, active into v_points, v_active
  from public.missions where code = p_code;
  if v_points is null or v_active is not true then return 'invalid'; end if;

  begin
    insert into public.mission_completions (user_id, mission_code, day)
    values (v_user, p_code, v_day);
  exception when unique_violation then
    return 'already';
  end;

  insert into public.point_events (user_id, points, reason, period_label)
  values (v_user, v_points, 'qr:' || p_code, to_char(v_day, 'YYYY-MM-DD'))
  on conflict (user_id, reason, period_label) do nothing;

  return 'completed';
end;
$$;
revoke all on function public.complete_mission(text) from public;
revoke execute on function public.complete_mission(text) from anon;
grant execute on function public.complete_mission(text) to authenticated;

-- ---- get_my_goal_progress: single source of truth for counts/labels ----
create or replace function public.get_my_goal_progress()
returns table(today_label text, week_label text, today_count int, week_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Seoul')::date;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  today_label := to_char(v_day, 'YYYY-MM-DD');
  week_label := to_char(v_day, 'IYYY-"W"IW');
  select count(*)::int into today_count
    from public.mission_completions
    where user_id = v_user and day = v_day;
  select count(*)::int into week_count
    from public.mission_completions
    where user_id = v_user
      and to_char(day, 'IYYY-"W"IW') = week_label;
  return next;
end;
$$;
revoke all on function public.get_my_goal_progress() from public;
revoke execute on function public.get_my_goal_progress() from anon;
grant execute on function public.get_my_goal_progress() to authenticated;

-- ---- claim_goal_reward: server recomputes eligibility, idempotent ----
create or replace function public.claim_goal_reward(p_goal_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_scope text;
  v_target int;
  v_bonus int;
  v_active boolean;
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_count int;
  v_period text;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select scope, target_count, bonus_points, active
    into v_scope, v_target, v_bonus, v_active
    from public.goals where id = p_goal_id;
  if v_scope is null or v_active is not true then return 'not-met'; end if;

  if v_scope = 'daily' then
    v_period := to_char(v_day, 'YYYY-MM-DD');
    select count(*)::int into v_count
      from public.mission_completions
      where user_id = v_user and day = v_day;
  else
    v_period := to_char(v_day, 'IYYY-"W"IW');
    select count(*)::int into v_count
      from public.mission_completions
      where user_id = v_user
        and to_char(day, 'IYYY-"W"IW') = v_period;
  end if;

  if v_count < v_target then return 'not-met'; end if;

  begin
    insert into public.point_events (user_id, points, reason, period_label)
    values (v_user, v_bonus, 'goal:' || p_goal_id, v_period);
  exception when unique_violation then
    return 'already';
  end;

  return 'claimed';
end;
$$;
revoke all on function public.claim_goal_reward(text) from public;
revoke execute on function public.claim_goal_reward(text) from anon;
grant execute on function public.claim_goal_reward(text) to authenticated;
```

- [ ] **Step 2: Apply the migration**

Call the Supabase MCP tool `apply_migration` with `project_id: "zvuqmagfpdyrrzyjntue"`, `name: "missions_and_goals"`, and `query` set to the SQL body above (everything after the leading comment block is fine to include).

Expected: success with no error. If it reports "relation already exists", a prior partial apply happened — inspect with `list_tables` before retrying.

- [ ] **Step 3: Verify schema + seeds exist (read-only)**

Call the Supabase MCP `execute_sql` (project `zvuqmagfpdyrrzyjntue`) with:

```sql
select
  (select count(*) from public.missions) as missions,
  (select count(*) from public.goals) as goals,
  (select count(*) from pg_proc
     where proname in ('complete_mission','claim_goal_reward','get_my_goal_progress')) as fns,
  (select bool_and(relrowsecurity) from pg_class
     where relname in ('missions','mission_completions','goals')) as rls_on;
```

Expected: `missions=5`, `goals=3`, `fns=3`, `rls_on=true`.

- [ ] **Step 4: Verify RPC behavior end-to-end (self-rolling-back)**

Call the Supabase MCP `execute_sql` with this transactional probe. It creates a temp user, impersonates it via the JWT claim, asserts every RPC path, then forces a rollback so no test data persists:

```sql
do $$
declare
  v_id uuid := '11111111-1111-1111-1111-111111111111';
  r text;
  p record;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    'plan-tester@yeungnam.ac.kr', crypt('x', gen_salt('bf')), now(), now(), now(),
    '{"provider":"email"}', '{}', false);
  insert into public.profiles (id, display_name, school_id, group_id)
  values (v_id, 'Plan Tester', 'yeungnam', 'engineering');

  perform set_config('request.jwt.claims', json_build_object('sub', v_id::text)::text, true);

  select complete_mission('stairs') into r;          assert r = 'completed', 'm1='||r;
  select complete_mission('stairs') into r;          assert r = 'already',   'm2='||r;
  select complete_mission('does-not-exist') into r;  assert r = 'invalid',   'm3='||r;
  select complete_mission('recycle') into r;         assert r = 'completed', 'm4='||r;

  select * into p from get_my_goal_progress();        assert p.today_count = 2, 'today='||p.today_count;

  select claim_goal_reward('daily-1') into r;         assert r = 'claimed',  'g1='||r;
  select claim_goal_reward('daily-1') into r;         assert r = 'already',  'g2='||r;
  select claim_goal_reward('daily-3') into r;         assert r = 'not-met',  'g3='||r;

  -- stairs(50) + recycle(40) + daily-1 bonus(20) = 110
  assert (select coalesce(sum(points),0) from public.point_events where user_id = v_id) = 110, 'sum';

  raise exception 'TEST_ROLLBACK_OK';
end $$;
```

Expected: the call fails with the message `TEST_ROLLBACK_OK` (every assertion passed; the transaction rolled back so `missions`/`goals` keep only their seed rows and no test user/profile/point rows remain). Any other message (e.g. `m2=completed`) means an assertion failed — fix the RPC and re-apply via `apply_migration` with the same name.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/migrations/2026-06-26-missions-and-goals.sql
git commit -m "feat(db): add QR missions and goals (server-authoritative RPCs)"
```

---

## Task 2: Pure domain logic — goal progress + reason parsing

**Files:**
- Create: `src/features/missions/domain/goals.ts`
- Test: `src/features/missions/__tests__/goals.test.ts`
- Create: `src/features/account/domain/point-reason.ts`
- Test: `src/features/account/__tests__/point-reason.test.ts`

**Interfaces:**
- Produces: `type GoalScope = "daily" | "weekly"`; `type Goal = { id: string; scope: GoalScope; targetCount: number; bonusPoints: number }`; `type GoalCounts = { todayCount: number; weekCount: number }`; `type GoalProgress = { id: string; scope: GoalScope; targetCount: number; bonusPoints: number; current: number; met: boolean; claimed: boolean; claimable: boolean }`; `computeGoalProgress(goals, counts, claimedGoalIds: ReadonlySet<string>): GoalProgress[]`.
- Produces: `type PointEventReason = { kind: "verified-savings" } | { kind: "mission"; code: string } | { kind: "goal"; id: string } | { kind: "other"; reason: string }`; `parsePointEventReason(reason: string): PointEventReason`.

- [ ] **Step 1: Write the failing test for `computeGoalProgress`**

Create `src/features/missions/__tests__/goals.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeGoalProgress, type Goal } from "../domain/goals";

const daily: Goal = { id: "daily-3", scope: "daily", targetCount: 3, bonusPoints: 80 };
const weekly: Goal = { id: "weekly-10", scope: "weekly", targetCount: 10, bonusPoints: 300 };

describe("computeGoalProgress", () => {
  it("returns [] for no goals", () => {
    expect(computeGoalProgress([], { todayCount: 0, weekCount: 0 }, new Set())).toEqual([]);
  });

  it("uses today count for daily goals and stays unmet below target", () => {
    const [p] = computeGoalProgress([daily], { todayCount: 2, weekCount: 9 }, new Set());
    expect(p.current).toBe(2);
    expect(p.met).toBe(false);
    expect(p.claimable).toBe(false);
  });

  it("marks a met, unclaimed daily goal claimable", () => {
    const [p] = computeGoalProgress([daily], { todayCount: 3, weekCount: 0 }, new Set());
    expect(p.met).toBe(true);
    expect(p.claimed).toBe(false);
    expect(p.claimable).toBe(true);
  });

  it("marks a met but claimed goal not claimable", () => {
    const [p] = computeGoalProgress([daily], { todayCount: 5, weekCount: 0 }, new Set(["daily-3"]));
    expect(p.met).toBe(true);
    expect(p.claimed).toBe(true);
    expect(p.claimable).toBe(false);
  });

  it("uses week count for weekly goals", () => {
    const [p] = computeGoalProgress([weekly], { todayCount: 1, weekCount: 10 }, new Set());
    expect(p.current).toBe(10);
    expect(p.met).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/missions/__tests__/goals.test.ts`
Expected: FAIL — cannot find module `../domain/goals`.

- [ ] **Step 3: Implement `goals.ts`**

Create `src/features/missions/domain/goals.ts`:

```ts
export type GoalScope = "daily" | "weekly";

export type Goal = {
  id: string;
  scope: GoalScope;
  targetCount: number;
  bonusPoints: number;
};

export type GoalCounts = {
  todayCount: number;
  weekCount: number;
};

export type GoalProgress = {
  id: string;
  scope: GoalScope;
  targetCount: number;
  bonusPoints: number;
  current: number;
  met: boolean;
  claimed: boolean;
  claimable: boolean;
};

export function computeGoalProgress(
  goals: readonly Goal[],
  counts: GoalCounts,
  claimedGoalIds: ReadonlySet<string>,
): GoalProgress[] {
  return goals.map((goal) => {
    const current =
      goal.scope === "daily" ? counts.todayCount : counts.weekCount;
    const met = current >= goal.targetCount;
    const claimed = claimedGoalIds.has(goal.id);
    return {
      id: goal.id,
      scope: goal.scope,
      targetCount: goal.targetCount,
      bonusPoints: goal.bonusPoints,
      current,
      met,
      claimed,
      claimable: met && !claimed,
    };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/missions/__tests__/goals.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the failing test for `parsePointEventReason`**

Create `src/features/account/__tests__/point-reason.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parsePointEventReason } from "../domain/point-reason";

describe("parsePointEventReason", () => {
  it("recognizes verified savings", () => {
    expect(parsePointEventReason("verified-savings")).toEqual({ kind: "verified-savings" });
  });
  it("extracts a mission code", () => {
    expect(parsePointEventReason("qr:stairs")).toEqual({ kind: "mission", code: "stairs" });
  });
  it("extracts a goal id", () => {
    expect(parsePointEventReason("goal:daily-1")).toEqual({ kind: "goal", id: "daily-1" });
  });
  it("falls back to other", () => {
    expect(parsePointEventReason("mystery")).toEqual({ kind: "other", reason: "mystery" });
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/features/account/__tests__/point-reason.test.ts`
Expected: FAIL — cannot find module `../domain/point-reason`.

- [ ] **Step 7: Implement `point-reason.ts`**

Create `src/features/account/domain/point-reason.ts`:

```ts
export type PointEventReason =
  | { kind: "verified-savings" }
  | { kind: "mission"; code: string }
  | { kind: "goal"; id: string }
  | { kind: "other"; reason: string };

export function parsePointEventReason(reason: string): PointEventReason {
  if (reason === "verified-savings") return { kind: "verified-savings" };
  if (reason.startsWith("qr:")) return { kind: "mission", code: reason.slice(3) };
  if (reason.startsWith("goal:")) return { kind: "goal", id: reason.slice(5) };
  return { kind: "other", reason };
}
```

- [ ] **Step 8: Run both tests to verify they pass**

Run: `npx vitest run src/features/missions/__tests__/goals.test.ts src/features/account/__tests__/point-reason.test.ts`
Expected: PASS (9 tests total).

- [ ] **Step 9: Commit**

```bash
git add src/features/missions/domain/goals.ts src/features/missions/__tests__/goals.test.ts src/features/account/domain/point-reason.ts src/features/account/__tests__/point-reason.test.ts
git commit -m "feat(missions): add goal progress + point reason domain logic"
```

---

## Task 3: Data layer — missions DAL + account DAL additions

**Files:**
- Create: `src/features/missions/data/missions-dal.ts`
- Modify: `src/features/account/data/account-dal.ts` (append two functions)

**Interfaces:**
- Consumes: `computeGoalProgress`, `Goal`, `GoalProgress`, `GoalScope` from Task 2; `createServerSupabaseClient` from `@/features/account/supabase/server`; `toPointEvents`, `PointEventRow`, `PointEvent` already in `account-dal.ts`; RPC `get_my_goal_progress` from Task 1.
- Produces: `type Mission = { code: string; points: number; category: string }`; `getActiveMissions(): Promise<Mission[]>`; `getMission(code: string): Promise<Mission | null>`; `getGoalsWithProgress(userId: string): Promise<GoalProgress[]>`; and in account-dal: `getMyPointEvents(userId: string): Promise<PointEvent[]>`, `getGroupEstateSubjectId(groupId: string): Promise<string | null>`.

- [ ] **Step 1: Read the Supabase RPC return-shape note**

`supabase.rpc("get_my_goal_progress")` returns an array of rows (one row) because the function `returns table(...)`. Read `node_modules/next/dist/docs/` only if you touch routing here (you do not); no Next.js doc needed for this task.

- [ ] **Step 2: Create `missions-dal.ts`**

Create `src/features/missions/data/missions-dal.ts`:

```ts
import "server-only";
import { createServerSupabaseClient } from "@/features/account/supabase/server";
import {
  computeGoalProgress,
  type Goal,
  type GoalProgress,
  type GoalScope,
} from "../domain/goals";

export type Mission = {
  code: string;
  points: number;
  category: string;
};

type MissionRow = { code: string; points: number; category: string };

export async function getActiveMissions(): Promise<Mission[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("missions")
    .select("code, points, category")
    .eq("active", true)
    .order("code");
  if (error) throw new Error(`Failed to load missions: ${error.message}`);
  return (data ?? []) as MissionRow[];
}

export async function getMission(code: string): Promise<Mission | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("missions")
    .select("code, points, category")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(`Failed to load mission: ${error.message}`);
  return (data as MissionRow | null) ?? null;
}

type GoalRow = {
  id: string;
  scope: string;
  target_count: number;
  bonus_points: number;
};

type GoalProgressRow = {
  today_label: string;
  week_label: string;
  today_count: number;
  week_count: number;
};

export async function getGoalsWithProgress(
  userId: string,
): Promise<GoalProgress[]> {
  const supabase = await createServerSupabaseClient();

  const { data: goalRows, error: goalsError } = await supabase
    .from("goals")
    .select("id, scope, target_count, bonus_points")
    .eq("active", true)
    .order("id");
  if (goalsError) throw new Error(`Failed to load goals: ${goalsError.message}`);

  const goals: Goal[] = ((goalRows ?? []) as GoalRow[]).map((row) => ({
    id: row.id,
    scope: row.scope as GoalScope,
    targetCount: row.target_count,
    bonusPoints: row.bonus_points,
  }));

  const { data: progressRows, error: progressError } =
    await supabase.rpc("get_my_goal_progress");
  if (progressError) {
    throw new Error(`Failed to load goal progress: ${progressError.message}`);
  }
  const progress = ((progressRows ?? []) as GoalProgressRow[])[0];
  const todayLabel = progress?.today_label ?? "";
  const weekLabel = progress?.week_label ?? "";
  const counts = {
    todayCount: progress?.today_count ?? 0,
    weekCount: progress?.week_count ?? 0,
  };

  const goalReasons = goals.map((goal) => `goal:${goal.id}`);
  const { data: claimRows, error: claimError } = await supabase
    .from("point_events")
    .select("reason, period_label")
    .eq("user_id", userId)
    .in("reason", goalReasons.length ? goalReasons : ["__none__"])
    .in("period_label", [todayLabel, weekLabel]);
  if (claimError) {
    throw new Error(`Failed to load goal claims: ${claimError.message}`);
  }

  const claims = (claimRows ?? []) as { reason: string; period_label: string }[];
  const claimedGoalIds = new Set<string>();
  for (const goal of goals) {
    const period = goal.scope === "daily" ? todayLabel : weekLabel;
    if (
      claims.some(
        (c) => c.reason === `goal:${goal.id}` && c.period_label === period,
      )
    ) {
      claimedGoalIds.add(goal.id);
    }
  }

  return computeGoalProgress(goals, counts, claimedGoalIds);
}
```

- [ ] **Step 3: Append the two functions to `account-dal.ts`**

Add to the end of `src/features/account/data/account-dal.ts` (it already imports `createServerSupabaseClient`, `toPointEvents`, `PointEventRow`, and `PointEvent`):

```ts
export async function getMyPointEvents(userId: string): Promise<PointEvent[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("point_events")
    .select("id, user_id, points, reason, period_label, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load point events: ${error.message}`);
  return toPointEvents((data ?? []) as PointEventRow[]);
}

export async function getGroupEstateSubjectId(
  groupId: string,
): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("estate_subjects")
    .select("subject_id")
    .eq("owner_group_id", groupId)
    .order("subject_id")
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load group estate subject: ${error.message}`);
  }
  return (data as { subject_id: string } | null)?.subject_id ?? null;
}
```

Note: `PointEvent` is already imported in `account-dal.ts` via `import { sumPersonalPoints, type PointEvent } from "../domain/points";`. If your editor reports it unused before this step, that is expected — the new function uses it.

- [ ] **Step 4: Typecheck via build**

Run: `npm run build`
Expected: build succeeds (compiles `missions-dal.ts` and the new account-dal functions). No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/missions/data/missions-dal.ts src/features/account/data/account-dal.ts
git commit -m "feat(missions): add missions/goals data access layer"
```

---

## Task 4: Server actions — complete mission + claim goal

**Files:**
- Create: `src/features/missions/actions/complete-mission.ts`
- Create: `src/features/missions/actions/claim-goal.ts`

**Interfaces:**
- Consumes: RPCs `complete_mission(p_code)`, `claim_goal_reward(p_goal_id)` from Task 1; `normalizeLocale` from `@/i18n/config`; `createServerSupabaseClient`.
- Produces: `type CompleteMissionState = { status: "idle" | "completed" | "already" | "invalid" | "error" }`; `completeMissionAction(prev, formData): Promise<CompleteMissionState>`; `type ClaimGoalState = { status: "idle" | "claimed" | "already" | "not-met" | "error" }`; `claimGoalRewardAction(prev, formData): Promise<ClaimGoalState>`. Form fields consumed: `complete` → `code`, `locale`; `claim` → `goalId`, `locale`.

- [ ] **Step 1: Create `complete-mission.ts`**

Create `src/features/missions/actions/complete-mission.ts` (mirrors the existing `src/features/account/actions/points.ts` pattern):

```ts
"use server";

import { revalidatePath } from "next/cache";
import { normalizeLocale } from "@/i18n/config";
import { createServerSupabaseClient } from "@/features/account/supabase/server";

export type CompleteMissionState = {
  status: "idle" | "completed" | "already" | "invalid" | "error";
};

export async function completeMissionAction(
  _prevState: CompleteMissionState,
  formData: FormData,
): Promise<CompleteMissionState> {
  const code = String(formData.get("code") ?? "");
  const locale = normalizeLocale(formData.get("locale"));
  const supabase = await createServerSupabaseClient();

  // Authoritative: complete_mission validates the mission and awards the
  // mission's own point value server-side. The client cannot set points.
  const { data, error } = await supabase.rpc("complete_mission", {
    p_code: code,
  });
  if (error) return { status: "error" };

  if (data === "completed") {
    revalidatePath(`/${locale}/me`);
    revalidatePath(`/${locale}`);
    return { status: "completed" };
  }
  if (data === "already") return { status: "already" };
  if (data === "invalid") return { status: "invalid" };
  return { status: "error" };
}
```

- [ ] **Step 2: Create `claim-goal.ts`**

Create `src/features/missions/actions/claim-goal.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { normalizeLocale } from "@/i18n/config";
import { createServerSupabaseClient } from "@/features/account/supabase/server";

export type ClaimGoalState = {
  status: "idle" | "claimed" | "already" | "not-met" | "error";
};

export async function claimGoalRewardAction(
  _prevState: ClaimGoalState,
  formData: FormData,
): Promise<ClaimGoalState> {
  const goalId = String(formData.get("goalId") ?? "");
  const locale = normalizeLocale(formData.get("locale"));
  const supabase = await createServerSupabaseClient();

  // Authoritative: claim_goal_reward recomputes eligibility from
  // mission_completions and awards the goal's bonus. Forgery is rejected.
  const { data, error } = await supabase.rpc("claim_goal_reward", {
    p_goal_id: goalId,
  });
  if (error) return { status: "error" };

  if (data === "claimed") {
    revalidatePath(`/${locale}/me`);
    revalidatePath(`/${locale}`);
    return { status: "claimed" };
  }
  if (data === "already") return { status: "already" };
  if (data === "not-met") return { status: "not-met" };
  return { status: "error" };
}
```

- [ ] **Step 3: Typecheck via build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/missions/actions/complete-mission.ts src/features/missions/actions/claim-goal.ts
git commit -m "feat(missions): add complete-mission and claim-goal server actions"
```

---

## Task 5: Login `next` safe redirect

**Files:**
- Create: `src/features/account/domain/safe-redirect.ts`
- Test: `src/features/account/__tests__/safe-redirect.test.ts`
- Modify: `src/features/account/actions/auth.ts` (signInAction)
- Modify: `src/features/account/components/login-form.tsx`
- Modify: `src/app/[locale]/login/page.tsx`

**Interfaces:**
- Produces: `isSafeNextPath(value: unknown): string | null` — returns the path only if it is a same-site, locale-prefixed path; otherwise `null`.
- Consumes: `isLocale` from `@/i18n/config`. `LoginForm` gains an optional `next?: string` prop; the login page reads `searchParams.next`.

- [ ] **Step 1: Write the failing test for `isSafeNextPath`**

Create `src/features/account/__tests__/safe-redirect.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isSafeNextPath } from "../domain/safe-redirect";

describe("isSafeNextPath", () => {
  it("accepts a locale-prefixed path", () => {
    expect(isSafeNextPath("/ko/scan/stairs")).toBe("/ko/scan/stairs");
    expect(isSafeNextPath("/en/me")).toBe("/en/me");
  });
  it("rejects protocol-relative and absolute urls", () => {
    expect(isSafeNextPath("//evil.example")).toBeNull();
    expect(isSafeNextPath("https://evil.example")).toBeNull();
  });
  it("rejects backslash tricks and non-locale paths", () => {
    expect(isSafeNextPath("/\\evil.example")).toBeNull();
    expect(isSafeNextPath("/dashboard")).toBeNull();
  });
  it("rejects non-strings", () => {
    expect(isSafeNextPath(null)).toBeNull();
    expect(isSafeNextPath(123)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/account/__tests__/safe-redirect.test.ts`
Expected: FAIL — cannot find module `../domain/safe-redirect`.

- [ ] **Step 3: Implement `safe-redirect.ts`**

Create `src/features/account/domain/safe-redirect.ts`:

```ts
import { isLocale } from "@/i18n/config";

// Returns the path only if it is a safe, same-site, locale-prefixed path.
// Rejects absolute URLs, protocol-relative ("//evil"), and backslash tricks
// so a forged ?next= cannot become an open redirect.
export function isSafeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  const firstSegment = value.split("/")[1];
  if (!isLocale(firstSegment)) return null;
  return value;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/account/__tests__/safe-redirect.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire `next` into `signInAction`**

In `src/features/account/actions/auth.ts`, add the import near the top (after the existing imports):

```ts
import { isSafeNextPath } from "../domain/safe-redirect";
```

Then replace the body of `signInAction` (currently ending with `redirect(\`/${locale}\`);`) so it honors a safe `next`:

```ts
export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email, password, locale } = readCredentials(formData);
  const next = isSafeNextPath(formData.get("next"));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(next ?? `/${locale}`);
}
```

- [ ] **Step 6: Add the hidden `next` field to `LoginForm`**

In `src/features/account/components/login-form.tsx`, change the component signature and add the hidden input. Replace `export function LoginForm() {` with:

```tsx
export function LoginForm({ next }: { next?: string }) {
```

And immediately after the existing `<input type="hidden" name="locale" value={locale} />` line, add:

```tsx
      {next ? <input type="hidden" name="next" value={next} /> : null}
```

- [ ] **Step 7: Pass `searchParams.next` from the login page**

Replace the contents of `src/app/[locale]/login/page.tsx` with:

```tsx
import { notFound } from "next/navigation";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { LoginForm } from "@/features/account/components/login-form";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { locale } = await params;
  const { next } = await searchParams;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-6 px-5">
        <h1 className="text-2xl font-semibold">
          {messages.account.login.title}
        </h1>
        <LoginForm next={next} />
      </main>
    </CampusEnergyProviders>
  );
}
```

- [ ] **Step 8: Verify build + tests**

Run: `npm run build && npx vitest run src/features/account/__tests__/safe-redirect.test.ts`
Expected: build succeeds; 4 tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/features/account/domain/safe-redirect.ts src/features/account/__tests__/safe-redirect.test.ts src/features/account/actions/auth.ts src/features/account/components/login-form.tsx "src/app/[locale]/login/page.tsx"
git commit -m "feat(account): honor safe next redirect after login"
```

---

## Task 6: i18n strings — `me` and `scan`

**Files:**
- Modify: `src/i18n/messages/ko.ts`
- Modify: `src/i18n/messages/en.ts`

**Interfaces:**
- Produces (message keys consumed by Tasks 7–10): `me.title`, `me.backToMap`, `me.openMyPage`, `me.goals.{title,claim,claiming,claimed,inProgress}`, `me.goalTitles.{daily-1,daily-3,weekly-10}`, `me.missions.<code>.{title,location}` for the 5 seeded codes, `me.history.{title,verifiedSavings,goalBonus,empty}`, `me.contribution.{title,summary,chip,viewEstate}`, and `scan.{invalidTitle,invalidBody,missionPoints,confirm,confirming,completed,already,error,toMyPage,toMap}`.
- The `Messages` type derives from `ko.ts`; `en.ts` must contain the identical key shape or `npm run build` fails.

- [ ] **Step 1: Add the `me` and `scan` blocks to `ko.ts`**

In `src/i18n/messages/ko.ts`, add these two top-level keys to the `koMessages` object (place them right after the `mapView: { ... },` block, before `modes:`). Keep the trailing commas:

```ts
  me: {
    title: "내 페이지",
    backToMap: "지도로",
    openMyPage: "내 페이지",
    goals: {
      title: "목표",
      claim: "보너스 받기",
      claiming: "처리 중…",
      claimed: "받음",
      inProgress: "진행 중",
    },
    goalTitles: {
      "daily-1": "오늘 미션 1회 완료",
      "daily-3": "오늘 미션 3회 완료",
      "weekly-10": "이번 주 미션 10회 완료",
    },
    missions: {
      stairs: { title: "계단 이용 인증", location: "건물 계단" },
      "lights-off": { title: "강의실 소등 확인", location: "강의실" },
      recycle: { title: "분리수거 인증", location: "분리수거장" },
      "eco-commute": { title: "친환경 등교 인증", location: "정문" },
      tumbler: { title: "텀블러 사용 인증", location: "교내 카페" },
    },
    history: {
      title: "포인트 이력",
      verifiedSavings: "주간 절감 보상",
      goalBonus: "목표 보너스",
      empty: "아직 적립 내역이 없습니다.",
    },
    contribution: {
      title: "내 영지 기여",
      summary: "내 적립 {points} · 그룹 풀의 {percent}%",
      chip: "내 기여 {points} · 풀의 {percent}%",
      viewEstate: "내 그룹 영지 보기",
    },
  },
  scan: {
    invalidTitle: "유효하지 않은 미션",
    invalidBody: "이 QR은 더 이상 사용할 수 없습니다.",
    missionPoints: "{points} 적립 미션",
    confirm: "미션 인증",
    confirming: "처리 중…",
    completed: "{points} 적립 완료!",
    already: "오늘은 이미 인증했어요.",
    error: "인증에 실패했습니다. 다시 시도해 주세요.",
    toMyPage: "내 페이지로",
    toMap: "지도로",
  },
```

- [ ] **Step 2: Add the matching `me` and `scan` blocks to `en.ts`**

In `src/i18n/messages/en.ts`, add the identical key shape (place right after the `mapView: { ... },` block, before `modes:`):

```ts
  me: {
    title: "My page",
    backToMap: "To map",
    openMyPage: "My page",
    goals: {
      title: "Goals",
      claim: "Claim bonus",
      claiming: "Processing…",
      claimed: "Claimed",
      inProgress: "In progress",
    },
    goalTitles: {
      "daily-1": "Complete 1 mission today",
      "daily-3": "Complete 3 missions today",
      "weekly-10": "Complete 10 missions this week",
    },
    missions: {
      stairs: { title: "Stairs check-in", location: "Building stairs" },
      "lights-off": { title: "Lights-off check", location: "Classroom" },
      recycle: { title: "Recycling check-in", location: "Recycling point" },
      "eco-commute": { title: "Eco commute check-in", location: "Main gate" },
      tumbler: { title: "Tumbler check-in", location: "Campus cafe" },
    },
    history: {
      title: "Points history",
      verifiedSavings: "Weekly saving reward",
      goalBonus: "Goal bonus",
      empty: "No points earned yet.",
    },
    contribution: {
      title: "My estate contribution",
      summary: "You earned {points} · {percent}% of the group pool",
      chip: "You: {points} · {percent}% of pool",
      viewEstate: "View my group estate",
    },
  },
  scan: {
    invalidTitle: "Invalid mission",
    invalidBody: "This QR code is no longer usable.",
    missionPoints: "{points} mission",
    confirm: "Verify mission",
    confirming: "Processing…",
    completed: "{points} earned!",
    already: "You already checked in today.",
    error: "Could not verify. Please try again.",
    toMyPage: "To my page",
    toMap: "To map",
  },
```

- [ ] **Step 3: Verify key parity via build**

Run: `npm run build`
Expected: build succeeds. If it fails with a TypeScript error about missing properties on `enMessages`, a key is present in `ko.ts` but missing in `en.ts` (or vice versa) — reconcile them.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/messages/ko.ts src/i18n/messages/en.ts
git commit -m "feat(i18n): add me and scan message strings (ko/en)"
```

---

## Task 7: `/me` page + profile/history/goals/contribution components

**Files:**
- Create: `src/features/account/components/profile-summary.tsx`
- Create: `src/features/account/components/points-history.tsx`
- Create: `src/features/account/components/estate-contribution.tsx`
- Create: `src/features/missions/components/goal-list.tsx`
- Create: `src/app/[locale]/me/page.tsx`

**Interfaces:**
- Consumes: `getCharacterProgress` from `@/features/campus-energy/domain/scoring`; `PointEvent` from `@/features/account/domain/points`; `parsePointEventReason` (Task 2); `GoalProgress` (Task 2); `claimGoalRewardAction`, `ClaimGoalState` (Task 4); DAL `getMyPointEvents`, `getGroupEstateSubjectId`, `getGroupPointPool`, `getPersonalPointTotal`, `getCurrentUser`, `getCurrentProfile` (account-dal); `getGoalsWithProgress` (missions-dal); `useI18n`, `formatPoints`, `interpolate`, `getMessages`, `isLocale`.
- Produces: components `ProfileSummary`, `PointsHistory`, `EstateContribution`, `GoalList`; route `/[locale]/me`.

- [ ] **Step 1: Read the Next.js routing doc**

Per `AGENTS.md`, before adding a route confirm the App Router conventions in this Next.js version: read the dynamic-routes / pages doc under `node_modules/next/dist/docs/` and confirm `params` is a Promise (it is, matching existing pages like `src/app/[locale]/page.tsx`).

- [ ] **Step 2: Create `ProfileSummary`**

Create `src/features/account/components/profile-summary.tsx`:

```tsx
"use client";

import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import { getCharacterProgress } from "@/features/campus-energy/domain/scoring";

export function ProfileSummary({
  displayName,
  personalPoints,
}: {
  displayName: string;
  personalPoints: number;
}) {
  const { locale, messages } = useI18n();
  const progress = getCharacterProgress(personalPoints);
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <section className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-xl font-bold text-on-accent">
        {initial}
      </span>
      <div>
        <h1 className="text-xl font-semibold text-ink">{displayName}</h1>
        <p className="text-sm font-medium text-saving">
          {messages.character.titles[progress.titleKey]} ·{" "}
          {interpolate(messages.character.level, { level: progress.level })}
        </p>
        <p className="text-sm tabular-nums text-ink-muted">
          {formatPoints(locale, personalPoints)}
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create `PointsHistory`**

Create `src/features/account/components/points-history.tsx`:

```tsx
"use client";

import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import type { PointEvent } from "@/features/account/domain/points";
import { parsePointEventReason } from "@/features/account/domain/point-reason";

export function PointsHistory({ events }: { events: PointEvent[] }) {
  const { locale, messages } = useI18n();
  const me = messages.me;
  const missions = me.missions as Record<
    string,
    { title: string; location: string }
  >;
  const goalTitles = me.goalTitles as Record<string, string>;

  function label(reason: string): string {
    const parsed = parsePointEventReason(reason);
    if (parsed.kind === "verified-savings") return me.history.verifiedSavings;
    if (parsed.kind === "mission") return missions[parsed.code]?.title ?? parsed.code;
    if (parsed.kind === "goal")
      return `${goalTitles[parsed.id] ?? parsed.id} · ${me.history.goalBonus}`;
    return parsed.reason;
  }

  const dateFmt = new Intl.DateTimeFormat(
    locale === "ko" ? "ko-KR" : "en-US",
    { month: "short", day: "numeric" },
  );

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{me.history.title}</h2>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{me.history.empty}</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-ink">{label(event.reason)}</span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums text-saving">
                  +{formatPoints(locale, event.points)}
                </span>
                <span className="text-xs text-ink-subtle">
                  {dateFmt.format(new Date(event.createdAt))}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Create `EstateContribution`**

Create `src/features/account/components/estate-contribution.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";

export function EstateContribution({
  personalPoints,
  groupPoolPoints,
  estateHref,
}: {
  personalPoints: number;
  groupPoolPoints: number;
  estateHref: string;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.me.contribution;
  const percent =
    groupPoolPoints > 0
      ? Math.round((personalPoints / groupPoolPoints) * 100)
      : 0;

  return (
    <section className="rounded-2xl border border-line bg-gradient-to-br from-accent-soft to-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{copy.title}</h2>
      <p className="mt-2 text-sm text-ink-muted">
        {interpolate(copy.summary, {
          points: formatPoints(locale, personalPoints),
          percent,
        })}
      </p>
      <Link
        href={estateHref}
        className="mt-3 inline-block text-sm font-semibold text-accent"
      >
        {copy.viewEstate} →
      </Link>
    </section>
  );
}
```

- [ ] **Step 5: Create `GoalList` (with internal `GoalCard`)**

Create `src/features/missions/components/goal-list.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { claimGoalRewardAction, type ClaimGoalState } from "../actions/claim-goal";
import type { GoalProgress } from "../domain/goals";

const initialState: ClaimGoalState = { status: "idle" };

function GoalCard({ goal }: { goal: GoalProgress }) {
  const { locale, messages } = useI18n();
  const copy = messages.me.goals;
  const titles = messages.me.goalTitles as Record<string, string>;
  const [state, formAction, pending] = useActionState(
    claimGoalRewardAction,
    initialState,
  );

  const claimed =
    goal.claimed || state.status === "claimed" || state.status === "already";
  const percent = Math.min(
    100,
    Math.round((goal.current / goal.targetCount) * 100),
  );

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink">
          {titles[goal.id] ?? goal.id}
        </span>
        <span className="text-xs font-semibold text-accent">
          +{formatPoints(locale, goal.bonusPoints)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-inset">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-ink-muted">
          {goal.current}/{goal.targetCount}
        </span>
      </div>
      <div className="mt-3">
        {claimed ? (
          <span className="text-xs font-semibold text-saving">
            {copy.claimed}
          </span>
        ) : goal.claimable ? (
          <form action={formAction}>
            <input type="hidden" name="goalId" value={goal.id} />
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              disabled={pending}
              className="h-9 rounded-lg bg-accent px-3 text-xs font-semibold text-white disabled:opacity-60"
            >
              {pending ? copy.claiming : copy.claim}
            </button>
          </form>
        ) : (
          <span className="text-xs text-ink-subtle">{copy.inProgress}</span>
        )}
      </div>
    </li>
  );
}

export function GoalList({ goals }: { goals: GoalProgress[] }) {
  const { messages } = useI18n();
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{messages.me.goals.title}</h2>
      <ul className="mt-3 grid gap-3">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 6: Create the `/me` page**

Create `src/app/[locale]/me/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { SignOutButton } from "@/features/account/components/sign-out-button";
import { ProfileSummary } from "@/features/account/components/profile-summary";
import { PointsHistory } from "@/features/account/components/points-history";
import { EstateContribution } from "@/features/account/components/estate-contribution";
import { GoalList } from "@/features/missions/components/goal-list";
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupEstateSubjectId,
  getGroupPointPool,
  getMyPointEvents,
  getPersonalPointTotal,
} from "@/features/account/data/account-dal";
import { getGoalsWithProgress } from "@/features/missions/data/missions-dal";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type MePageProps = { params: Promise<{ locale: string }> };

export default async function MePage({ params }: MePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/me`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const [messages, personalPoints, groupPool, events, goals, estateSubjectId] =
    await Promise.all([
      getMessages(locale),
      getPersonalPointTotal(profile.userId),
      getGroupPointPool(profile.groupId),
      getMyPointEvents(profile.userId),
      getGoalsWithProgress(profile.userId),
      getGroupEstateSubjectId(profile.groupId),
    ]);

  const estateHref = estateSubjectId
    ? `/${locale}/subjects/${estateSubjectId}/estate`
    : `/${locale}`;

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between">
          <Link
            href={`/${locale}`}
            className="text-sm font-medium text-ink-muted"
          >
            ← {messages.me.backToMap}
          </Link>
          <SignOutButton />
        </header>
        <ProfileSummary
          displayName={profile.displayName}
          personalPoints={personalPoints}
        />
        <GoalList goals={goals} />
        <EstateContribution
          personalPoints={personalPoints}
          groupPoolPoints={groupPool.earnedPoints}
          estateHref={estateHref}
        />
        <PointsHistory events={events} />
      </main>
    </CampusEnergyProviders>
  );
}
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: build succeeds; `/[locale]/me` appears in the route list. No type errors.

- [ ] **Step 8: Verify the route renders behind auth (HTTP)**

Start the dev server if not running (`npm run dev`), then:
Run: `curl -i -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/ko/me`
Expected: a redirect status (`307`/`308`) to `/ko/login?next=/ko/me` (not logged in). If you have a logged-in session cookie in a browser, loading `/ko/me` shows the profile, goals, contribution, and history.

- [ ] **Step 9: Commit**

```bash
git add src/features/account/components/profile-summary.tsx src/features/account/components/points-history.tsx src/features/account/components/estate-contribution.tsx src/features/missions/components/goal-list.tsx "src/app/[locale]/me/page.tsx"
git commit -m "feat(me): add personal page with profile, goals, history, contribution"
```

---

## Task 8: `/scan/[code]` route + `MissionConfirm`

**Files:**
- Create: `src/features/missions/components/mission-confirm.tsx`
- Create: `src/app/[locale]/scan/[code]/page.tsx`

**Interfaces:**
- Consumes: `completeMissionAction`, `CompleteMissionState` (Task 4); `getMission` (Task 3); `getCurrentUser`, `getCurrentProfile` (account-dal); `useI18n`, `formatPoints`, `interpolate`, `getMessages`, `isLocale`.
- Produces: component `MissionConfirm` (props `{ code: string; points: number }`); route `/[locale]/scan/[code]`. QR URL format: `https://<host>/<locale>/scan/<code>`.

- [ ] **Step 1: Read the Next.js dynamic-segment doc**

Per `AGENTS.md`, confirm nested dynamic segments (`[code]`) and `params` shape under `node_modules/next/dist/docs/` before writing the route.

- [ ] **Step 2: Create `MissionConfirm`**

Create `src/features/missions/components/mission-confirm.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import {
  completeMissionAction,
  type CompleteMissionState,
} from "../actions/complete-mission";

const initialState: CompleteMissionState = { status: "idle" };

export function MissionConfirm({
  code,
  points,
}: {
  code: string;
  points: number;
}) {
  const { locale, messages } = useI18n();
  const scan = messages.scan;
  const missions = messages.me.missions as Record<
    string,
    { title: string; location: string }
  >;
  const mission = missions[code];
  const [state, formAction, pending] = useActionState(
    completeMissionAction,
    initialState,
  );

  if (state.status === "completed" || state.status === "already") {
    return (
      <div className="grid gap-4 text-center">
        <p className="text-lg font-semibold text-ink">
          {state.status === "completed"
            ? interpolate(scan.completed, {
                points: formatPoints(locale, points),
              })
            : scan.already}
        </p>
        <div className="grid gap-2">
          <Link
            href={`/${locale}/me`}
            className="h-11 rounded-xl bg-accent text-center font-semibold leading-[2.75rem] text-white"
          >
            {scan.toMyPage}
          </Link>
          <Link
            href={`/${locale}`}
            className="text-sm font-medium text-ink-muted"
          >
            {scan.toMap}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="locale" value={locale} />
      <div>
        <p className="text-xl font-semibold text-ink">
          {mission?.title ?? code}
        </p>
        {mission?.location ? (
          <p className="mt-0.5 text-sm text-ink-muted">{mission.location}</p>
        ) : null}
        <p className="mt-1 text-sm font-semibold text-accent">
          {interpolate(scan.missionPoints, {
            points: formatPoints(locale, points),
          })}
        </p>
      </div>
      {state.status === "error" || state.status === "invalid" ? (
        <p className="text-sm text-overuse">{scan.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-xl bg-accent font-semibold text-white disabled:opacity-60"
      >
        {pending ? scan.confirming : scan.confirm}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create the `/scan/[code]` page**

Create `src/app/[locale]/scan/[code]/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { MissionConfirm } from "@/features/missions/components/mission-confirm";
import { getMission } from "@/features/missions/data/missions-dal";
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/account/data/account-dal";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type ScanPageProps = {
  params: Promise<{ locale: string; code: string }>;
};

export default async function ScanPage({ params }: ScanPageProps) {
  const { locale, code } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/scan/${code}`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const [messages, mission] = await Promise.all([
    getMessages(locale),
    getMission(code),
  ]);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-6 px-5">
        {mission ? (
          <MissionConfirm code={mission.code} points={mission.points} />
        ) : (
          <div className="grid gap-3 text-center">
            <h1 className="text-xl font-semibold text-ink">
              {messages.scan.invalidTitle}
            </h1>
            <p className="text-sm text-ink-muted">{messages.scan.invalidBody}</p>
            <Link
              href={`/${locale}/me`}
              className="text-sm font-semibold text-accent"
            >
              {messages.scan.toMyPage}
            </Link>
          </div>
        )}
      </main>
    </CampusEnergyProviders>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds; `/[locale]/scan/[code]` appears in the route list.

- [ ] **Step 5: Verify auth gating + valid/invalid codes (HTTP)**

With the dev server running:
Run: `curl -i -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/ko/scan/stairs`
Expected: redirect to `/ko/login?next=/ko/scan/stairs` when logged out. In a logged-in browser, `/ko/scan/stairs` shows the mission with a "미션 인증" button; clicking it shows "+50점 적립 완료!" the first time and "오늘은 이미 인증했어요." on a second submit the same day. `/ko/scan/nope` shows the invalid-mission message.

- [ ] **Step 6: Commit**

```bash
git add src/features/missions/components/mission-confirm.tsx "src/app/[locale]/scan/[code]/page.tsx"
git commit -m "feat(scan): add QR mission scan landing and confirm flow"
```

---

## Task 9: Map profile chip + dashboard link

**Files:**
- Create: `src/features/campus-energy/components/profile-chip.tsx`
- Modify: `src/features/campus-energy/components/admin-map-view.tsx`
- Modify: `src/features/campus-energy/components/campus-energy-app.tsx`
- Modify: `src/features/campus-energy/components/participant-dashboard.tsx`

**Interfaces:**
- Consumes: `getCharacterProgress` from `../domain/scoring`; `useI18n`, `formatPoints`, `interpolate`; `CampusEnergyAccount` shape (`displayName`, `personalPoints`) already passed into `CampusEnergyShell`.
- Produces: component `ProfileChip` (props `{ displayName: string; personalPoints: number }`); `AdminMapView` gains an `account: { displayName: string; personalPoints: number }` prop.

- [ ] **Step 1: Create `ProfileChip`**

Create `src/features/campus-energy/components/profile-chip.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import { getCharacterProgress } from "../domain/scoring";

export function ProfileChip({
  displayName,
  personalPoints,
}: {
  displayName: string;
  personalPoints: number;
}) {
  const { locale, messages } = useI18n();
  const progress = getCharacterProgress(personalPoints);
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <Link
      href={`/${locale}/me`}
      aria-label={messages.me.openMyPage}
      className="flex items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 py-2 shadow-pop backdrop-blur"
    >
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-xs font-bold text-on-accent">
        {initial}
      </span>
      <span className="leading-tight">
        <span className="block text-[11px] font-semibold text-accent">
          {interpolate(messages.character.level, { level: progress.level })}
        </span>
        <span className="block text-[11px] tabular-nums text-ink-muted">
          {formatPoints(locale, personalPoints)}
        </span>
      </span>
    </Link>
  );
}
```

- [ ] **Step 2: Add the `account` prop to `AdminMapView` and render the chip**

In `src/features/campus-energy/components/admin-map-view.tsx`:

Add the import after the existing component imports (e.g. after the `MapTopBar` import):

```tsx
import { ProfileChip } from "./profile-chip";
```

Add `account` to the props type (`AdminMapViewProps`), after `mapboxToken`:

```tsx
  account: { displayName: string; personalPoints: number };
```

Add `account` to the destructured parameters in the function signature (after `mapboxToken,`):

```tsx
  account,
```

Replace the existing top-right summary cluster:

```tsx
        <div className="pointer-events-auto">
          <MapSummaryChips summary={summary} />
        </div>
```

with a stacked cluster that adds the chip:

```tsx
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <MapSummaryChips summary={summary} />
          <ProfileChip
            displayName={account.displayName}
            personalPoints={account.personalPoints}
          />
        </div>
```

- [ ] **Step 3: Pass `account` into `AdminMapView`**

In `src/features/campus-energy/components/campus-energy-app.tsx`, in the admin-mode branch, add the `account` prop to the `<AdminMapView ... />` element (after `mapboxToken={mapboxToken}`):

```tsx
          account={{
            displayName: account.displayName,
            personalPoints: account.personalPoints,
          }}
```

- [ ] **Step 4: Add the "내 페이지 →" link to the participant dashboard**

In `src/features/campus-energy/components/participant-dashboard.tsx`:

Add the import at the top (after the `"use client";` block imports):

```tsx
import Link from "next/link";
```

Wrap the existing returned grid so the link sits above it. Replace the opening of the return:

```tsx
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-6">
```

with:

```tsx
  return (
    <div className="grid gap-4">
      <Link
        href={`/${locale}/me`}
        className="text-sm font-semibold text-accent"
      >
        {messages.me.openMyPage} →
      </Link>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-6">
```

Then add one extra closing `</div>` before the final `);` so the new wrapper is balanced. The component already destructures `locale` and `messages` from `useI18n()`, so no signature change is needed.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds, no type errors (the `account` prop is now required by `AdminMapView` and supplied by `campus-energy-app.tsx`).

- [ ] **Step 6: Verify on the map (HTTP/preview)**

With the dev server running and a logged-in session, load `/ko`. Expected: the map's top-right shows the summary chips with the profile chip below (avatar initial + level + points); clicking it navigates to `/ko/me`. The participant dashboard (settings → 참여자 모드) shows a "내 페이지 →" link at the top.

- [ ] **Step 7: Commit**

```bash
git add src/features/campus-energy/components/profile-chip.tsx src/features/campus-energy/components/admin-map-view.tsx src/features/campus-energy/components/campus-energy-app.tsx src/features/campus-energy/components/participant-dashboard.tsx
git commit -m "feat(map): add profile chip entry point and dashboard my-page link"
```

---

## Task 10: Estate contribution chip

**Files:**
- Create: `src/features/account/components/estate-contribution-chip.tsx`
- Modify: `src/app/[locale]/subjects/[subjectId]/estate/page.tsx`

**Interfaces:**
- Consumes: `getPersonalPointTotal`, `getGroupPointPool` (account-dal); `useI18n`, `formatPoints`, `interpolate`; message keys `me.contribution.chip`.
- Produces: component `EstateContributionChip` (props `{ personalPoints: number; groupPoolPoints: number }`) rendered as a fixed overlay sibling of `EstateGameClient` — the large estate canvas client is NOT modified.

- [ ] **Step 1: Create `EstateContributionChip`**

Create `src/features/account/components/estate-contribution-chip.tsx`. It is `position: fixed`, top-center, above the estate canvas overlays (the estate uses up to `z-[55]`; this uses `z-[60]`). It avoids the estate's top-left header and top-right chips:

```tsx
"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";

export function EstateContributionChip({
  personalPoints,
  groupPoolPoints,
}: {
  personalPoints: number;
  groupPoolPoints: number;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.me.contribution;
  const percent =
    groupPoolPoints > 0
      ? Math.round((personalPoints / groupPoolPoints) * 100)
      : 0;

  return (
    <Link
      href={`/${locale}/me`}
      className="pointer-events-auto fixed left-1/2 top-3 z-[60] -translate-x-1/2 rounded-full border border-line bg-surface/95 px-4 py-2 text-xs font-semibold text-ink shadow-pop backdrop-blur"
    >
      {interpolate(copy.chip, {
        points: formatPoints(locale, personalPoints),
        percent,
      })}
    </Link>
  );
}
```

- [ ] **Step 2: Load personal points and render the chip in the estate page**

In `src/app/[locale]/subjects/[subjectId]/estate/page.tsx`:

Update the account-dal import to add `getPersonalPointTotal` (the file already imports `getCurrentProfile`, `getCurrentUser`, `getGroupPointPool`):

```tsx
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupPointPool,
  getPersonalPointTotal,
} from "@/features/account/data/account-dal";
```

Add the chip import after the `EstateGameClient` import:

```tsx
import { EstateContributionChip } from "@/features/account/components/estate-contribution-chip";
```

After the existing `if (!data) notFound();` line, load the contribution numbers:

```tsx
  const [personalPoints, groupPool] = await Promise.all([
    getPersonalPointTotal(profile.userId),
    getGroupPointPool(profile.groupId),
  ]);
```

Replace the existing return block:

```tsx
  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <EstateGameClient data={data} />
    </CampusEnergyProviders>
  );
```

with:

```tsx
  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <EstateContributionChip
        personalPoints={personalPoints}
        groupPoolPoints={groupPool.earnedPoints}
      />
      <EstateGameClient data={data} />
    </CampusEnergyProviders>
  );
```

- [ ] **Step 3: Verify build + estate tests stay green**

Run: `npm run build && npx vitest run src/features/estate`
Expected: build succeeds; all existing estate tests pass (the chip is an additive sibling overlay, so estate-quality layout guards are unaffected).

- [ ] **Step 4: Verify the chip on the estate (HTTP/preview)**

With the dev server running and a logged-in session, open a group estate, e.g. `/ko/subjects/yu-e21/estate`. Expected: a top-center pill reads "내 기여 … · 풀의 …%" and links to `/ko/me`; the estate canvas and its own controls remain usable. (Note: the estate full-bleed canvas route is known to hang the preview screenshot tool — verify via live DOM/HTTP as prior sessions did, not a captured image.)

- [ ] **Step 5: Commit**

```bash
git add src/features/account/components/estate-contribution-chip.tsx "src/app/[locale]/subjects/[subjectId]/estate/page.tsx"
git commit -m "feat(estate): show personal contribution chip in the group estate"
```

---

## Task 11: Full verification pass + docs

**Files:**
- Modify: `docs/working/current-state.md`
- Modify: `docs/working/meeting-notes.md`

**Interfaces:**
- Consumes: everything above. No new code.

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all Vitest suites pass, including the new `goals`, `point-reason`, and `safe-redirect` tests (existing total + 13 new test cases). 0 failures.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: 0 errors. (The repo has 2 pre-existing warnings in `src/features/campus-energy/components/game-preview.tsx`; no new warnings from this work.)

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: build succeeds; route list includes `/[locale]/me` and `/[locale]/scan/[code]`.

- [ ] **Step 4: Re-run the DB RPC probe to confirm the live schema**

Re-run the Task 1 Step 4 `execute_sql` probe (the self-rolling-back `do $$ ... $$` block). Expected: fails with `TEST_ROLLBACK_OK` (all assertions passed, no residue). This confirms the deployed RPCs still behave correctly end-to-end.

- [ ] **Step 5: HTTP smoke of the new routes**

With the dev server running:

```bash
curl -i -s -o /dev/null -w "me      %{http_code} %{redirect_url}\n" http://localhost:3000/ko/me
curl -i -s -o /dev/null -w "scan    %{http_code} %{redirect_url}\n" http://localhost:3000/ko/scan/stairs
curl -i -s -o /dev/null -w "login   %{http_code}\n" "http://localhost:3000/ko/login?next=/ko/me"
```

Expected: `me` and `scan` redirect (`307`/`308`) to `/ko/login?next=...` when logged out; `login` returns `200`.

- [ ] **Step 6: Update `current-state.md`**

Append a dated note to `docs/working/current-state.md` (in the "Actual Repository State" section) recording: the new `src/features/missions/` feature; the `/me` and `/scan/[code]` routes; the `missions`/`mission_completions`/`goals` tables and `complete_mission`/`claim_goal_reward`/`get_my_goal_progress` RPCs (migration `missions_and_goals`, recorded at `docs/superpowers/migrations/2026-06-26-missions-and-goals.sql`); the map profile chip + estate contribution chip; the login `next` safe-redirect; and that QR points flow through the same `point_events` ledger so personal points, character, group pool, and estate budget update together. Note the documented limitation: static QR (no geofencing/rotation), admin QR-issuing UI deferred. Record verification numbers (Vitest total, lint, build, DB probe) actually observed.

- [ ] **Step 7: Update `meeting-notes.md`**

Append a `## 2026-06-26` sub-entry to `docs/working/meeting-notes.md` summarizing the user-confirmed decisions made during brainstorming (dedicated `/me` route; QR = URL deep-link; goals = predefined + server-verified completion bonus; dashboard kept + `/me` link) and the implemented result, following the existing Korean meeting-note style. Reference the spec `docs/superpowers/specs/2026-06-26-personal-page-qr-goals-design.md` and this plan.

- [ ] **Step 8: Commit the docs**

```bash
git add docs/working/current-state.md docs/working/meeting-notes.md
git commit -m "docs: record personal page, QR missions, and goals"
```

---

## Done

All tasks complete when: `npm run test`, `npm run lint`, and `npm run build` pass; the DB RPC probe returns `TEST_ROLLBACK_OK`; `/ko/me` and `/ko/scan/<code>` gate correctly and work for a logged-in user; the map profile chip and estate contribution chip link to `/me`; and the docs are updated. Per `AGENTS.md`, commit history stays local — push only when the user explicitly asks.
