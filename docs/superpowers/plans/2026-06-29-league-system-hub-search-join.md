# League System (Hub · Search · Join) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the static "명예의 전당" into a **리그 hub** where users see in-progress standings for leagues their group is in, search & join open leagues (group as the competitor), and view past winners — and fix the Korean-locale English group-name bug.

**Architecture:** Add an `is_open` flag + server-authoritative `join_league`/`leave_league` RPCs to the existing leagues schema; reads go through RLS-permitted Supabase queries. A new `/leagues` hub (진행 중 / 리그 찾기 / 지난 기록) and `/leagues/[leagueId]` detail reuse the warm one-sheet plus the already-built `AwardPodium`/`StudentWinners`/tier palette for finalized leagues. Group/team names are localized in the UI via a pure `competitorLabel` helper over the existing `demo.groups` i18n.

**Tech Stack:** Next.js 16.2.9 (App Router, server components + server actions), React 19.2.4, TypeScript, Tailwind v4 + CSS Modules, Supabase (Postgres + RLS + SECURITY DEFINER RPCs), lucide-react, Vitest (jsdom for components, node for domain). Live Supabase project ref: `zvuqmagfpdyrrzyjntue`.

**Branch:** continue on `feat/league-hall-of-fame-design` (this feature absorbs/extends the unmerged Hall of Fame redesign already on that branch).

## Global Constraints

- **Writes are server-authoritative.** No client write policy on `league_participants`; all mutations go through `join_league`/`leave_league` (SECURITY DEFINER, `set search_path = public`, `authenticated` EXECUTE, `anon` revoked). Reads use the existing `for select to authenticated using (true)` policy.
- **Do not change** existing point/group-pool/character/estate/award logic or `get_league_standings` (confirmed already participants-based — no patch). Only `is_open` is added to `leagues`.
- **Korean-first + ko/en symmetry.** Every display string lives in BOTH `src/i18n/messages/ko.ts` and `en.ts`; the `Messages` type derives from `koMessages` and the i18n test enforces parity. Team/group names reuse the existing `demo.groups` block (no new name keys).
- **Tailwind v4 JIT-safe:** dynamic tier colors via inline `style` from `TIER_PALETTE`, never dynamically built arbitrary classes. Warm palette via the existing `profile-surface.module.css` `.surface` token override (no global token edits).
- **Participant unit = group.** A user enrolls their own group (`current_group_id()`), any logged-in member may enroll (no role concept), idempotent. League creation is operator/seed-only (no user-facing creation).
- **Before any Next.js API** (server actions, `revalidatePath`, dynamic routes, `redirect`), follow `AGENTS.md` and read the matching guide under `node_modules/next/dist/docs/`.
- **DB changes apply to the live `cems` project** (ref `zvuqmagfpdyrrzyjntue`) via the Supabase MCP (`apply_migration` for DDL, `execute_sql` for probes/seed), then are recorded under `docs/superpowers/migrations/`. Clean up verification data; **preserve `demo@cems.kr`**.
- **Verification bar:** Vitest green, ESLint 0 errors (only the 2 pre-existing `game-preview.tsx` warnings allowed), `npm run build` passes. DB verified by SQL probes.

---

## File Structure

**DB (apply via MCP, record SQL):**
- `docs/superpowers/migrations/2026-06-29-league-join-open.sql` — `is_open` column + `join_league` + `leave_league`.
- `docs/superpowers/migrations/2026-06-29-seed-league-active-open.sql` — demo active + joinable leagues + balanced points.

**Domain / data (`src/features/leagues/`):**
- Create `domain/competitor-label.ts` (+ `__tests__/competitor-label.test.ts`) — pure name localization.
- Modify `domain/types.ts` — add `LeagueStatus`, `LeagueSummary`.
- Modify `data/leagues-dal.ts` — `getMyGroupLeagues`, `getJoinableLeagues`, `getLeague`, `getLeagueParticipantCount`.
- Create `actions/join-league.ts`, `actions/leave-league.ts` — server actions.

**Components (`src/features/leagues/components/`):**
- Create `league-status-badge.tsx`, `league-standings-table.tsx`, `league-card.tsx`, `join-league-button.tsx`, `league-browse-list.tsx` (+ jsdom tests).
- Modify `award-podium.tsx` — localize team names via `competitorLabel` (+ test update).
- Reuse (no change): `student-winners.tsx`, `award-tier.ts`, `league-hall.module.css`, `account/components/profile-surface.module.css`.

**Routes (`src/app/[locale]/`):**
- Create `leagues/page.tsx` (hub), `leagues/[leagueId]/page.tsx` (detail).
- Modify `hall-of-fame/page.tsx` → redirect to `/leagues`.
- Modify `features/campus-energy/components/map-controls.tsx` (+ callers + test) and `me/page.tsx` — trophy/link → `/leagues`.

**i18n:** Modify `ko.ts` + `en.ts` — new top-level `leagues` namespace; relabel the map control entry.

---

## Task 1: DB — `is_open` column + `join_league` / `leave_league` RPCs

**Files:**
- Create (record): `docs/superpowers/migrations/2026-06-29-league-join-open.sql`
- Apply to live DB via Supabase MCP `apply_migration` (name `league_join_open`), project `zvuqmagfpdyrrzyjntue`.

**Interfaces:**
- Produces RPCs: `join_league(p_league_id text) returns text` (`'joined'|'already'`, raises on invalid), `leave_league(p_league_id text) returns text` (`'left'|'absent'`, raises on finalized/missing). Adds `leagues.is_open boolean not null default false`.
- Consumes existing `current_group_id()` and `league_participants` PK `(league_id, competitor_kind, competitor_id)`.

- [ ] **Step 1: Apply the migration**

Use the Supabase MCP `apply_migration` (project_id `zvuqmagfpdyrrzyjntue`, name `league_join_open`) with this SQL, and save the identical SQL to `docs/superpowers/migrations/2026-06-29-league-join-open.sql`:

```sql
alter table public.leagues
  add column if not exists is_open boolean not null default false;

create or replace function public.join_league(p_league_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
  v_status text;
  v_open boolean;
  v_scope text;
  v_inserted int;
begin
  v_group := public.current_group_id();
  if v_group is null then
    raise exception 'no group affiliation';
  end if;

  select status, is_open, scope into v_status, v_open, v_scope
  from public.leagues where id = p_league_id;
  if not found then
    raise exception 'league not found: %', p_league_id;
  end if;
  if v_scope <> 'group' then
    raise exception 'league is not group-scoped';
  end if;
  if not v_open or v_status not in ('upcoming', 'active') then
    raise exception 'league not open for joining';
  end if;

  insert into public.league_participants (league_id, competitor_kind, competitor_id)
  values (p_league_id, 'group', v_group)
  on conflict (league_id, competitor_kind, competitor_id) do nothing;
  get diagnostics v_inserted = row_count;
  return case when v_inserted > 0 then 'joined' else 'already' end;
end;
$$;

create or replace function public.leave_league(p_league_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
  v_status text;
  v_deleted int;
begin
  v_group := public.current_group_id();
  if v_group is null then
    raise exception 'no group affiliation';
  end if;

  select status into v_status from public.leagues where id = p_league_id;
  if not found then
    raise exception 'league not found: %', p_league_id;
  end if;
  if v_status = 'finalized' then
    raise exception 'cannot leave a finalized league';
  end if;

  delete from public.league_participants
  where league_id = p_league_id
    and competitor_kind = 'group'
    and competitor_id = v_group;
  get diagnostics v_deleted = row_count;
  return case when v_deleted > 0 then 'left' else 'absent' end;
end;
$$;

revoke execute on function public.join_league(text) from anon;
revoke execute on function public.leave_league(text) from anon;
grant execute on function public.join_league(text) to authenticated;
grant execute on function public.leave_league(text) to authenticated;
```

- [ ] **Step 2: Probe — column + anon revoke + privilege**

Run via MCP `execute_sql` (project `zvuqmagfpdyrrzyjntue`):

```sql
select
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='leagues' and column_name='is_open') as has_is_open,
  has_function_privilege('anon','public.join_league(text)','execute') as anon_join,
  has_function_privilege('authenticated','public.join_league(text)','execute') as auth_join,
  has_function_privilege('anon','public.leave_league(text)','execute') as anon_leave;
```
Expected: `has_is_open=1`, `anon_join=false`, `auth_join=true`, `anon_leave=false`.

- [ ] **Step 3: Probe — join/leave behavior as the demo user (transaction, rolled back)**

This impersonates `demo@cems.kr` (group `student-services`) and rolls back so no state persists. It references `yu-open-2026-fall`, seeded in Task 2 — **run this step after Task 2 is applied** (or temporarily insert a throwaway open group league). Run via `execute_sql`:

```sql
begin;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select id::text from auth.users where email='demo@cems.kr'))::text,
  true);
set local role authenticated;
select public.join_league('yu-open-2026-fall')  as first_join;   -- expect 'joined'
select public.join_league('yu-open-2026-fall')  as second_join;  -- expect 'already'
select public.leave_league('yu-open-2026-fall') as first_leave;  -- expect 'left'
select public.leave_league('yu-open-2026-fall') as second_leave; -- expect 'absent'
rollback;
```
Expected: `joined`, `already`, `left`, `absent`.

- [ ] **Step 4: Probe — rejection of a finalized league (exception caught)**

```sql
do $$
declare v_msg text;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select id::text from auth.users where email='demo@cems.kr'))::text, true);
  begin
    perform public.join_league('yu-college-2026-05');  -- finalized, is_open=false
    raise notice 'FAIL: expected exception';
  exception when others then
    raise notice 'OK rejected finalized: %', sqlerrm;
  end;
end $$;
```
Expected: a notice `OK rejected finalized: league not open for joining` (no `FAIL`).

- [ ] **Step 5: Commit the recorded SQL**

```bash
git add docs/superpowers/migrations/2026-06-29-league-join-open.sql
git commit -m "feat(db): add is_open + join_league/leave_league RPCs"
```

---

## Task 2: DB — demo seed (active + joinable leagues)

**Files:**
- Create (record): `docs/superpowers/migrations/2026-06-29-seed-league-active-open.sql`
- Apply via MCP `execute_sql` (data seed, idempotent).

**Interfaces:**
- Produces leagues `yu-energy-2026-summer` (status `active`, `is_open=true`, my group `student-services` participating) and `yu-open-2026-fall` (status `upcoming`, `is_open=true`, `student-services` NOT participating). Active-league standings come from `get_league_standings` over points seeded with `created_at` inside the window and after the 2026-06-27 1,000,000 top-up.

- [ ] **Step 1: Apply the seed**

Run via MCP `execute_sql` and save identical SQL to `docs/superpowers/migrations/2026-06-29-seed-league-active-open.sql`:

```sql
-- Active, open league the demo group is in. Window starts AFTER the
-- 2026-06-27 1,000,000 manual:demo-topup so per-capita averages stay realistic.
insert into public.leagues (id, name, scope, school_id, starts_at, ends_at, status, is_open, badge_winner_count)
values ('yu-energy-2026-summer', '영남대 여름 상시 에너지 리그', 'group', 'yeungnam',
        '2026-06-28T00:00:00+09:00', '2026-07-31T23:59:59+09:00', 'active', true, 3)
on conflict (id) do update set
  name=excluded.name, status=excluded.status, is_open=excluded.is_open,
  starts_at=excluded.starts_at, ends_at=excluded.ends_at;

insert into public.league_participants (league_id, competitor_kind, competitor_id) values
  ('yu-energy-2026-summer','group','student-services'),
  ('yu-energy-2026-summer','group','humanities'),
  ('yu-energy-2026-summer','group','engineering')
on conflict do nothing;

-- Balanced points inside the active window (per-capita avg ≈ the flat amount,
-- since avg = total/member_count and every member of a group gets the same):
-- student-services 220 > humanities 200 > engineering 180.
insert into public.point_events (user_id, points, reason, period_label, created_at)
select id, 220, 'seed:league-active', '2026-W27-ss', '2026-06-29T00:00:00+09:00'
from public.profiles where group_id='student-services'
on conflict (user_id, reason, period_label) do nothing;

insert into public.point_events (user_id, points, reason, period_label, created_at)
select id, 200, 'seed:league-active', '2026-W27-hu', '2026-06-29T00:00:00+09:00'
from public.profiles where group_id='humanities'
on conflict (user_id, reason, period_label) do nothing;

insert into public.point_events (user_id, points, reason, period_label, created_at)
select id, 180, 'seed:league-active', '2026-W27-en', '2026-06-29T00:00:00+09:00'
from public.profiles where group_id='engineering'
on conflict (user_id, reason, period_label) do nothing;

-- Upcoming, open league the demo group has NOT joined (for the join demo).
insert into public.leagues (id, name, scope, school_id, starts_at, ends_at, status, is_open, badge_winner_count)
values ('yu-open-2026-fall', '가을 신규 에너지 리그 (모집 중)', 'group', 'yeungnam',
        '2026-09-01T00:00:00+09:00', '2026-09-30T23:59:59+09:00', 'upcoming', true, 3)
on conflict (id) do update set
  name=excluded.name, status=excluded.status, is_open=excluded.is_open;

insert into public.league_participants (league_id, competitor_kind, competitor_id) values
  ('yu-open-2026-fall','group','engineering'),
  ('yu-open-2026-fall','group','humanities')
on conflict do nothing;
```

- [ ] **Step 2: Probe — standings + joinability**

```sql
select competitor_id, member_count, total_points, avg_points, rank
from public.get_league_standings('yu-energy-2026-summer') order by rank;

select id, status, is_open from public.leagues where id in ('yu-energy-2026-summer','yu-open-2026-fall');

select league_id, competitor_id from public.league_participants
where league_id in ('yu-energy-2026-summer','yu-open-2026-fall') order by league_id, competitor_id;
```
Expected: summer standings ranked `student-services` (avg 220) → `humanities` (200) → `engineering` (180), each with `member_count > 0`; both leagues `is_open=true`; `yu-open-2026-fall` participants are only `engineering`+`humanities` (so `student-services` can join).

- [ ] **Step 3: Commit the recorded SQL**

```bash
git add docs/superpowers/migrations/2026-06-29-seed-league-active-open.sql
git commit -m "feat(db): seed active + joinable demo leagues"
```

---

## Task 3: Localization foundation — `competitorLabel` + `leagues` i18n namespace

**Files:**
- Create: `src/features/leagues/domain/competitor-label.ts`
- Test: `src/features/leagues/__tests__/competitor-label.test.ts`
- Modify: `src/i18n/messages/ko.ts`, `src/i18n/messages/en.ts`

**Interfaces:**
- Produces `competitorLabel(groupLabels: Record<string, string>, competitorId: string, fallback: string): string`.
- Produces a new top-level `leagues` namespace in messages (keys consumed by Tasks 5–11).

- [ ] **Step 1: Write the failing test**

Create `src/features/leagues/__tests__/competitor-label.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { competitorLabel } from "../domain/competitor-label";

const labels = {
  engineering: "공과대학",
  humanities: "문과대학",
  "student-services": "학생지원",
};

describe("competitorLabel", () => {
  it("maps a known group id to its localized label", () => {
    expect(competitorLabel(labels, "student-services", "Student Services")).toBe("학생지원");
  });
  it("falls back to the raw name for an unknown id", () => {
    expect(competitorLabel(labels, "yeungnam-school", "Yeungnam")).toBe("Yeungnam");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/leagues/__tests__/competitor-label.test.ts`
Expected: FAIL — `Cannot find module '../domain/competitor-label'`.

- [ ] **Step 3: Write the helper**

Create `src/features/leagues/domain/competitor-label.ts`:

```ts
/**
 * Localize a league competitor (group) id. Group names are stored in English
 * in the DB; the localized labels live in i18n under `demo.groups`. Unknown
 * ids (e.g. future school-scope competitors) fall back to the raw RPC name.
 */
export function competitorLabel(
  groupLabels: Record<string, string>,
  competitorId: string,
  fallback: string,
): string {
  return groupLabels[competitorId] ?? fallback;
}
```

- [ ] **Step 4: Add the `leagues` i18n namespace (both locales)**

In `src/i18n/messages/ko.ts`, add a new top-level key `leagues` immediately AFTER the existing `hallOfFame: { ... }` block:

```ts
  leagues: {
    title: "리그",
    subtitle: "에너지 절감 리그",
    back: "지도로",
    sections: { active: "진행 중 · 내 그룹", browse: "리그 찾기", past: "지난 기록" },
    status: { upcoming: "예정", active: "진행 중", finalized: "종료" },
    search: { placeholder: "리그 이름 검색", noResults: "검색 결과가 없어요" },
    join: { join: "참가하기", joining: "참가 중…", joined: "참가됨", leave: "참가 취소", leaving: "처리 중…", error: "잠시 후 다시 시도해주세요" },
    standings: { rank: "순위", team: "팀", avg: "1인당 평균", total: "합계", members: "{count}명", you: "내 그룹", empty: "아직 순위가 없어요" },
    participants: "참가 {count}팀",
    period: "{start} – {end}",
    emptyActive: "참가 중인 리그가 없어요",
    emptyActiveHint: "‘리그 찾기’에서 공개 리그에 참가해보세요",
    emptyBrowse: "참가 가능한 공개 리그가 없어요",
    emptyPast: "아직 종료된 리그가 없어요",
    detailBack: "리그 목록",
  },
```

In `src/i18n/messages/en.ts`, add the symmetric block after its `hallOfFame` block:

```ts
  leagues: {
    title: "Leagues",
    subtitle: "Energy-saving leagues",
    back: "To map",
    sections: { active: "In progress · my team", browse: "Find leagues", past: "Past results" },
    status: { upcoming: "Upcoming", active: "Live", finalized: "Ended" },
    search: { placeholder: "Search league name", noResults: "No matching leagues" },
    join: { join: "Join", joining: "Joining…", joined: "Joined", leave: "Leave", leaving: "Processing…", error: "Please try again shortly" },
    standings: { rank: "Rank", team: "Team", avg: "Avg / member", total: "Total", members: "{count}", you: "My team", empty: "No standings yet" },
    participants: "{count} teams",
    period: "{start} – {end}",
    emptyActive: "You're not in any league yet",
    emptyActiveHint: "Join an open league from “Find leagues”",
    emptyBrowse: "No open leagues to join right now",
    emptyPast: "No finalized leagues yet",
    detailBack: "All leagues",
  },
```

- [ ] **Step 5: Run domain test + i18n symmetry**

Run: `npx vitest run src/features/leagues/__tests__/competitor-label.test.ts src/i18n/__tests__`
Expected: PASS (helper 2/2; i18n symmetry green — `leagues` added to both locales).

- [ ] **Step 6: Commit**

```bash
git add src/features/leagues/domain/competitor-label.ts src/features/leagues/__tests__/competitor-label.test.ts src/i18n/messages/ko.ts src/i18n/messages/en.ts
git commit -m "feat(leagues): competitorLabel helper + leagues i18n namespace"
```

---

## Task 4: DAL + types

**Files:**
- Modify: `src/features/leagues/domain/types.ts`
- Modify: `src/features/leagues/data/leagues-dal.ts`

**Interfaces:**
- Produces type `LeagueStatus = "upcoming" | "active" | "finalized"` and `LeagueSummary = { id; name; scope: CompetitorKind; status: LeagueStatus; startsAt; endsAt; isOpen }`.
- Produces DAL: `getMyGroupLeagues(groupId: string): Promise<LeagueSummary[]>`, `getJoinableLeagues(groupId: string): Promise<LeagueSummary[]>`, `getLeague(leagueId: string): Promise<LeagueSummary | null>`, `getLeagueParticipantCount(leagueId: string): Promise<number>`.
- Consumes existing `createServerSupabaseClient`, `getLeagueStandings`, `getLeagueAwards`, `getFinalizedLeagues`.

> DAL functions are thin Supabase wrappers; following the repo convention (no unit tests for `*-dal.ts`), they are verified by `tsc` + the SQL probes in Tasks 1–2 (which proved the underlying queries) + the pages that consume them. No new test file here.

- [ ] **Step 1: Add types**

In `src/features/leagues/domain/types.ts`, append:

```ts
export type LeagueStatus = "upcoming" | "active" | "finalized";

export type LeagueSummary = {
  id: string;
  name: string;
  scope: CompetitorKind;
  status: LeagueStatus;
  startsAt: string;
  endsAt: string;
  isOpen: boolean;
};
```

- [ ] **Step 2: Add DAL functions**

In `src/features/leagues/data/leagues-dal.ts`, add the import of the new types to the existing type import block (`LeagueStatus`, `LeagueSummary`) and append these functions:

```ts
type LeagueRow = {
  id: string;
  name: string;
  scope: string;
  status: string;
  starts_at: string;
  ends_at: string;
  is_open: boolean;
};

function shapeLeague(row: LeagueRow): LeagueSummary {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope === "school" ? "school" : "group",
    status:
      row.status === "active" || row.status === "finalized"
        ? (row.status as LeagueStatus)
        : "upcoming",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isOpen: Boolean(row.is_open),
  };
}

const LEAGUE_COLUMNS = "id, name, scope, status, starts_at, ends_at, is_open";

export async function getMyGroupLeagues(
  groupId: string,
): Promise<LeagueSummary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("league_participants")
    .select(`leagues!inner(${LEAGUE_COLUMNS})`)
    .eq("competitor_kind", "group")
    .eq("competitor_id", groupId);
  if (error) throw new Error(`Failed to load my group leagues: ${error.message}`);
  return (data ?? [])
    .map((row) => shapeLeague(row.leagues as unknown as LeagueRow))
    .sort((a, b) => (a.endsAt < b.endsAt ? 1 : a.endsAt > b.endsAt ? -1 : 0));
}

export async function getJoinableLeagues(
  groupId: string,
): Promise<LeagueSummary[]> {
  const supabase = await createServerSupabaseClient();
  const [openRes, mineRes] = await Promise.all([
    supabase
      .from("leagues")
      .select(LEAGUE_COLUMNS)
      .eq("is_open", true)
      .in("status", ["upcoming", "active"])
      .order("ends_at", { ascending: true }),
    supabase
      .from("league_participants")
      .select("league_id")
      .eq("competitor_kind", "group")
      .eq("competitor_id", groupId),
  ]);
  if (openRes.error)
    throw new Error(`Failed to load open leagues: ${openRes.error.message}`);
  if (mineRes.error)
    throw new Error(`Failed to load my participations: ${mineRes.error.message}`);
  const mine = new Set((mineRes.data ?? []).map((r) => r.league_id as string));
  return (openRes.data ?? [])
    .map((row) => shapeLeague(row as LeagueRow))
    .filter((league) => !mine.has(league.id));
}

export async function getLeague(
  leagueId: string,
): Promise<LeagueSummary | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("leagues")
    .select(LEAGUE_COLUMNS)
    .eq("id", leagueId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load league: ${error.message}`);
  return data ? shapeLeague(data as LeagueRow) : null;
}

export async function getLeagueParticipantCount(
  leagueId: string,
): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("league_participants")
    .select("*", { count: "exact", head: true })
    .eq("league_id", leagueId);
  if (error)
    throw new Error(`Failed to count participants: ${error.message}`);
  return count ?? 0;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no NEW errors in `types.ts` / `leagues-dal.ts` (pre-existing unrelated test-type errors may remain).

- [ ] **Step 4: Commit**

```bash
git add src/features/leagues/domain/types.ts src/features/leagues/data/leagues-dal.ts
git commit -m "feat(leagues): DAL for my-group/joinable/single leagues + counts"
```

---

## Task 5: Localize team names in the podium (`competitorLabel`)

**Files:**
- Modify: `src/features/leagues/components/award-podium.tsx`
- Modify: `src/features/leagues/__tests__/award-podium.test.tsx`

**Interfaces:**
- Consumes `competitorLabel` (Task 3) and `messages.demo.groups`.

- [ ] **Step 1: Update the test to assert localized team names**

In `src/features/leagues/__tests__/award-podium.test.tsx`, extend the `vi.mock("@/i18n/client", …)` `messages` object to include `demo.groups`, and add an assertion. Replace the mock's `messages` with:

```tsx
    messages: {
      hallOfFame: {
        tierGold: "금상", tierSilver: "은상", tierBronze: "동상",
        rankUnit: "위", avgPointsLabel: "1인당 평균 {points}P", teamSectionTitle: "수상 팀",
      },
      demo: { groups: { engineering: "공과대학", humanities: "문과대학", "student-services": "학생지원" } },
    },
```

Then add to the existing test, after the `expect(text).toContain("1,200")` line:

```tsx
    expect(text).toContain("학생지원"); // localized, not "student-services"/"학생지원팀"
```

And change the team fixture's gold entry `competitorName` to the raw English so the localization is meaningfully exercised — set the gold team to:

```tsx
  { tier: "gold", rank: 1, competitorId: "student-services", competitorName: "Student Services", metricValue: 1200 },
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/leagues/__tests__/award-podium.test.tsx`
Expected: FAIL — podium renders `team.competitorName` ("Student Services"), so `toContain("학생지원")` fails.

- [ ] **Step 3: Apply `competitorLabel` in the podium**

In `src/features/leagues/components/award-podium.tsx`:

Add the import:
```tsx
import { competitorLabel } from "../domain/competitor-label";
```

Inside `AwardPodium`, after `const copy = messages.hallOfFame;`, add:
```tsx
  const groupLabels = messages.demo.groups;
```

Replace the `slotName` rendering — change:
```tsx
              <span className={styles.slotName} title={team.competitorName}>
                {team.competitorName}
              </span>
```
to:
```tsx
              <span
                className={styles.slotName}
                title={competitorLabel(groupLabels, team.competitorId, team.competitorName)}
              >
                {competitorLabel(groupLabels, team.competitorId, team.competitorName)}
              </span>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/leagues/__tests__/award-podium.test.tsx`
Expected: PASS (names localized; the 3-li / gold-centered assertions still hold).

- [ ] **Step 5: Commit**

```bash
git add src/features/leagues/components/award-podium.tsx src/features/leagues/__tests__/award-podium.test.tsx
git commit -m "fix(leagues): localize podium team names via competitorLabel"
```

---

## Task 6: `LeagueStatusBadge` + `LeagueStandingsTable`

**Files:**
- Create: `src/features/leagues/components/league-status-badge.tsx`
- Create: `src/features/leagues/components/league-standings-table.tsx`
- Test: `src/features/leagues/__tests__/league-standings-table.test.tsx`

**Interfaces:**
- Produces `LeagueStatusBadge({ status }: { status: LeagueStatus })`.
- Produces `LeagueStandingsTable({ standings, myCompetitorId }: { standings: LeagueStanding[]; myCompetitorId: string | null })`. Consumes `competitorLabel`, `messages.demo.groups`, `messages.leagues.standings`, `TIER_PALETTE` (rank 1–3 accent via `tierForRank`).

- [ ] **Step 1: Write the failing test**

Create `src/features/leagues/__tests__/league-standings-table.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeagueStandingsTable } from "../components/league-standings-table";
import type { LeagueStanding } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      leagues: { standings: { rank: "순위", team: "팀", avg: "1인당 평균", total: "합계", members: "{count}명", you: "내 그룹", empty: "아직 순위가 없어요" } },
      demo: { groups: { engineering: "공과대학", humanities: "문과대학", "student-services": "학생지원" } },
    },
  }),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const standings: LeagueStanding[] = [
  { competitorKind: "group", competitorId: "student-services", competitorName: "Student Services", memberCount: 12, totalPoints: 2640, avgPoints: 220, rank: 1 },
  { competitorKind: "group", competitorId: "humanities", competitorName: "College of Humanities", memberCount: 10, totalPoints: 2000, avgPoints: 200, rank: 2 },
];

describe("LeagueStandingsTable", () => {
  afterEach(() => document.body.replaceChildren());

  it("renders localized team names, avg, and highlights my group", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () =>
      root.render(<LeagueStandingsTable standings={standings} myCompetitorId="student-services" />),
    );
    const text = container.textContent ?? "";
    expect(text).toContain("학생지원");
    expect(text).toContain("문과대학");
    expect(text).not.toContain("Student Services");
    expect(text).toContain("220");
    const mine = container.querySelector('[data-me="true"]');
    expect(mine?.getAttribute("data-competitor")).toBe("student-services");
    await act(async () => root.unmount());
  });

  it("shows an empty state when there are no standings", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () =>
      root.render(<LeagueStandingsTable standings={[]} myCompetitorId={null} />),
    );
    expect(container.textContent).toContain("아직 순위가 없어요");
    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/leagues/__tests__/league-standings-table.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `LeagueStatusBadge`**

Create `src/features/leagues/components/league-status-badge.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/i18n/client";
import type { LeagueStatus } from "../domain/types";

const TONE: Record<LeagueStatus, CSSProperties> = {
  active: { background: "var(--color-saving-soft)", color: "var(--color-saving)" },
  upcoming: { background: "var(--honey-soft)", color: "var(--honey-strong)" },
  finalized: { background: "var(--color-surface-3)", color: "var(--color-ink-subtle)" },
};

export function LeagueStatusBadge({ status }: { status: LeagueStatus }) {
  const { messages } = useI18n();
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={TONE[status]}
    >
      {messages.leagues.status[status]}
    </span>
  );
}
```

- [ ] **Step 4: Write `LeagueStandingsTable`**

Create `src/features/leagues/components/league-standings-table.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import { TIER_PALETTE } from "../domain/award-tier";
import { competitorLabel } from "../domain/competitor-label";
import { tierForRank } from "../domain/standings";
import type { LeagueStanding } from "../domain/types";

export function LeagueStandingsTable({
  standings,
  myCompetitorId,
}: {
  standings: LeagueStanding[];
  myCompetitorId: string | null;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.leagues.standings;
  const groupLabels = messages.demo.groups;

  if (standings.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-ink-subtle">{copy.empty}</p>;
  }

  return (
    <ol className="flex flex-col gap-1.5">
      {standings.map((row) => {
        const tier = tierForRank(row.rank);
        const palette = tier ? TIER_PALETTE[tier] : null;
        const isMe = row.competitorId === myCompetitorId;
        return (
          <li
            key={row.competitorId}
            data-competitor={row.competitorId}
            data-me={isMe ? "true" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${isMe ? "bg-accent-soft" : "bg-inset"}`}
          >
            <span
              className="grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-bold"
              style={
                (palette
                  ? { background: palette.soft, color: palette.text }
                  : { background: "var(--color-surface-3)", color: "var(--color-ink-subtle)" }) as CSSProperties
              }
            >
              {row.rank}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
              {competitorLabel(groupLabels, row.competitorId, row.competitorName)}
              {isMe ? <span className="ml-1.5 text-[11px] font-medium text-accent">· {copy.you}</span> : null}
            </span>
            <span className="flex-none text-right text-xs text-ink-subtle">
              <span className="font-semibold text-ink">{formatNumber(locale, Math.round(row.avgPoints))}</span>
              <span className="ml-1">{copy.avg}</span>
              <span className="ml-2 hidden sm:inline">{interpolate(copy.members, { count: formatNumber(locale, row.memberCount) })}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/leagues/__tests__/league-standings-table.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/leagues/components/league-status-badge.tsx src/features/leagues/components/league-standings-table.tsx src/features/leagues/__tests__/league-standings-table.test.tsx
git commit -m "feat(leagues): status badge + standings table components"
```

---

## Task 7: `LeagueCard`

**Files:**
- Create: `src/features/leagues/components/league-card.tsx`
- Test: `src/features/leagues/__tests__/league-card.test.tsx`

**Interfaces:**
- Produces `LeagueCard({ league, participantCount, href, action }: { league: LeagueSummary; participantCount: number; href?: string; action?: ReactNode })`. Renders name, `LeagueStatusBadge`, period, participant count, optional right-aligned `action` slot; wraps in a `next/link` when `href` is set. Consumes `messages.leagues`.

- [ ] **Step 1: Write the failing test**

Create `src/features/leagues/__tests__/league-card.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeagueCard } from "../components/league-card";
import type { LeagueSummary } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      leagues: { status: { upcoming: "예정", active: "진행 중", finalized: "종료" }, participants: "참가 {count}팀", period: "{start} – {end}" },
    },
  }),
}));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const league: LeagueSummary = {
  id: "yu-energy-2026-summer", name: "여름 리그", scope: "group",
  status: "active", startsAt: "2026-06-28T00:00:00+09:00", endsAt: "2026-07-31T00:00:00+09:00", isOpen: true,
};

describe("LeagueCard", () => {
  afterEach(() => document.body.replaceChildren());
  it("renders name, status, participant count, and links when href is set", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () =>
      root.render(<LeagueCard league={league} participantCount={3} href="/ko/leagues/yu-energy-2026-summer" />),
    );
    const text = container.textContent ?? "";
    expect(text).toContain("여름 리그");
    expect(text).toContain("진행 중");
    expect(text).toContain("참가 3팀");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/ko/leagues/yu-energy-2026-summer");
    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/leagues/__tests__/league-card.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `LeagueCard`**

Create `src/features/leagues/components/league-card.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { interpolate } from "@/i18n/interpolate";
import { formatNumber } from "@/i18n/format";
import type { LeagueSummary } from "../domain/types";
import { LeagueStatusBadge } from "./league-status-badge";

function shortDate(locale: string, iso: string): string {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function LeagueCard({
  league,
  participantCount,
  href,
  action,
}: {
  league: LeagueSummary;
  participantCount: number;
  href?: string;
  action?: ReactNode;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.leagues;

  const body = (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:bg-surface-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-bold text-ink">{league.name}</h3>
          <LeagueStatusBadge status={league.status} />
        </div>
        <p className="mt-0.5 text-[11px] text-ink-subtle">
          {interpolate(copy.period, { start: shortDate(locale, league.startsAt), end: shortDate(locale, league.endsAt) })}
          {" · "}
          {interpolate(copy.participants, { count: formatNumber(locale, participantCount) })}
        </p>
      </div>
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/leagues/__tests__/league-card.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/features/leagues/components/league-card.tsx src/features/leagues/__tests__/league-card.test.tsx
git commit -m "feat(leagues): league card component"
```

---

## Task 8: Server actions — `joinLeagueAction` / `leaveLeagueAction`

**Files:**
- Create: `src/features/leagues/actions/join-league.ts`
- Create: `src/features/leagues/actions/leave-league.ts`

**Interfaces:**
- Produces `joinLeagueAction(prevState: LeagueActionState, formData: FormData): Promise<LeagueActionState>` and `leaveLeagueAction(...)` with `type LeagueActionState = { status: "idle" | "joined" | "already" | "left" | "absent" | "error" }`. Each reads `leagueId` + `locale` from `formData`, calls the matching RPC, and `revalidatePath(\`/${locale}/leagues\`)`.

- [ ] **Step 1: Write `joinLeagueAction`**

Create `src/features/leagues/actions/join-league.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { normalizeLocale } from "@/i18n/config";
import { createServerSupabaseClient } from "@/features/account/supabase/server";

export type LeagueActionState = {
  status: "idle" | "joined" | "already" | "left" | "absent" | "error";
};

export async function joinLeagueAction(
  _prevState: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const locale = normalizeLocale(formData.get("locale"));
  const leagueId = formData.get("leagueId");
  if (typeof leagueId !== "string" || leagueId.length === 0) {
    return { status: "error" };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("join_league", {
    p_league_id: leagueId,
  });
  if (error) return { status: "error" };

  if (data === "joined" || data === "already") {
    revalidatePath(`/${locale}/leagues`);
    revalidatePath(`/${locale}/leagues/${leagueId}`);
    return { status: data };
  }
  return { status: "error" };
}
```

- [ ] **Step 2: Write `leaveLeagueAction`**

Create `src/features/leagues/actions/leave-league.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { normalizeLocale } from "@/i18n/config";
import { createServerSupabaseClient } from "@/features/account/supabase/server";
import type { LeagueActionState } from "./join-league";

export async function leaveLeagueAction(
  _prevState: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const locale = normalizeLocale(formData.get("locale"));
  const leagueId = formData.get("leagueId");
  if (typeof leagueId !== "string" || leagueId.length === 0) {
    return { status: "error" };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("leave_league", {
    p_league_id: leagueId,
  });
  if (error) return { status: "error" };

  if (data === "left" || data === "absent") {
    revalidatePath(`/${locale}/leagues`);
    revalidatePath(`/${locale}/leagues/${leagueId}`);
    return { status: data };
  }
  return { status: "error" };
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/features/leagues/actions`
Expected: no new type errors; ESLint clean for the new files.

- [ ] **Step 4: Commit**

```bash
git add src/features/leagues/actions/join-league.ts src/features/leagues/actions/leave-league.ts
git commit -m "feat(leagues): join/leave server actions"
```

---

## Task 9: `JoinLeagueButton` + `LeagueBrowseList`

**Files:**
- Create: `src/features/leagues/components/join-league-button.tsx`
- Create: `src/features/leagues/components/league-browse-list.tsx`
- Test: `src/features/leagues/__tests__/league-browse-list.test.tsx`

**Interfaces:**
- Produces `JoinLeagueButton({ leagueId }: { leagueId: string })` — `useActionState(joinLeagueAction)`, hidden `locale`+`leagueId` inputs, label cycles 참가하기 → 참가 중… → 참가됨.
- Produces `LeagueBrowseList({ leagues, participantCounts }: { leagues: LeagueSummary[]; participantCounts: Record<string, number> })` — search input (client-side name filter) + `LeagueCard` per league with a `JoinLeagueButton` action; empty/no-result states. Consumes `messages.leagues`.

- [ ] **Step 1: Write the failing test**

Create `src/features/leagues/__tests__/league-browse-list.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeagueBrowseList } from "../components/league-browse-list";
import type { LeagueSummary } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      leagues: {
        status: { upcoming: "예정", active: "진행 중", finalized: "종료" },
        participants: "참가 {count}팀", period: "{start} – {end}",
        search: { placeholder: "리그 이름 검색", noResults: "검색 결과가 없어요" },
        emptyBrowse: "참가 가능한 공개 리그가 없어요",
        join: { join: "참가하기", joining: "참가 중…", joined: "참가됨", error: "오류" },
      },
    },
  }),
}));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("react", async (orig) => {
  const actual = await orig<typeof import("react")>();
  return { ...actual, useActionState: () => [{ status: "idle" }, () => {}, false] };
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const leagues: LeagueSummary[] = [
  { id: "a", name: "여름 리그", scope: "group", status: "active", startsAt: "2026-06-28T00:00:00+09:00", endsAt: "2026-07-31T00:00:00+09:00", isOpen: true },
  { id: "b", name: "가을 리그", scope: "group", status: "upcoming", startsAt: "2026-09-01T00:00:00+09:00", endsAt: "2026-09-30T00:00:00+09:00", isOpen: true },
];

describe("LeagueBrowseList", () => {
  afterEach(() => document.body.replaceChildren());
  it("renders joinable leagues with join buttons", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () =>
      root.render(<LeagueBrowseList leagues={leagues} participantCounts={{ a: 3, b: 2 }} />),
    );
    const text = container.textContent ?? "";
    expect(text).toContain("여름 리그");
    expect(text).toContain("가을 리그");
    expect(container.querySelectorAll("button").length).toBeGreaterThanOrEqual(2); // a join button per league
    await act(async () => root.unmount());
  });
  it("shows an empty state with no joinable leagues", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () => root.render(<LeagueBrowseList leagues={[]} participantCounts={{}} />));
    expect(container.textContent).toContain("참가 가능한 공개 리그가 없어요");
    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/leagues/__tests__/league-browse-list.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `JoinLeagueButton`**

Create `src/features/leagues/components/join-league-button.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { joinLeagueAction, type LeagueActionState } from "../actions/join-league";

const initialState: LeagueActionState = { status: "idle" };

export function JoinLeagueButton({ leagueId }: { leagueId: string }) {
  const { locale, messages } = useI18n();
  const copy = messages.leagues.join;
  const [state, formAction, pending] = useActionState(joinLeagueAction, initialState);

  const joined = state.status === "joined" || state.status === "already";
  const label = joined ? copy.joined : pending ? copy.joining : copy.join;

  return (
    <form action={formAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="leagueId" value={leagueId} />
      <button
        type="submit"
        disabled={pending || joined}
        className="h-9 rounded-full bg-accent px-4 text-xs font-semibold text-on-accent disabled:opacity-60"
      >
        {label}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Write `LeagueBrowseList`**

Create `src/features/leagues/components/league-browse-list.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { LeagueSummary } from "../domain/types";
import { LeagueCard } from "./league-card";
import { JoinLeagueButton } from "./join-league-button";

export function LeagueBrowseList({
  leagues,
  participantCounts,
}: {
  leagues: LeagueSummary[];
  participantCounts: Record<string, number>;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.leagues;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? leagues.filter((l) => l.name.toLowerCase().includes(q)) : leagues;
  }, [leagues, query]);

  if (leagues.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-ink-subtle">{copy.emptyBrowse}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2">
        <Search className="h-4 w-4 flex-none text-ink-subtle" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.search.placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
      </label>
      {filtered.length === 0 ? (
        <p className="px-1 py-4 text-center text-sm text-ink-subtle">{copy.search.noResults}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((league) => (
            <LeagueCard
              key={league.id}
              league={league}
              participantCount={participantCounts[league.id] ?? 0}
              href={`/${locale}/leagues/${league.id}`}
              action={<JoinLeagueButton leagueId={league.id} />}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/leagues/__tests__/league-browse-list.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/leagues/components/join-league-button.tsx src/features/leagues/components/league-browse-list.tsx src/features/leagues/__tests__/league-browse-list.test.tsx
git commit -m "feat(leagues): join button + searchable browse list"
```

---

## Task 10: `/leagues` hub page

**Files:**
- Create: `src/app/[locale]/leagues/page.tsx`

**Interfaces:**
- Consumes DAL (`getMyGroupLeagues`, `getJoinableLeagues`, `getFinalizedLeagues`, `getLeagueStandings`, `getLeagueParticipantCount`), `LeagueCard`, `LeagueStandingsTable`, `LeagueBrowseList`, warm sheet (`profile-surface.module.css`) + hero (`league-hall.module.css`). Auth-gated like `/me`/`hall-of-fame`.

- [ ] **Step 1: Write the page**

Create `src/app/[locale]/leagues/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/account/data/account-dal";
import {
  getFinalizedLeagues,
  getJoinableLeagues,
  getLeague,
  getLeagueParticipantCount,
  getLeagueStandings,
  getMyGroupLeagues,
} from "@/features/leagues/data/leagues-dal";
import { LeagueCard } from "@/features/leagues/components/league-card";
import { LeagueStandingsTable } from "@/features/leagues/components/league-standings-table";
import { LeagueBrowseList } from "@/features/leagues/components/league-browse-list";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import styles from "@/features/account/components/profile-surface.module.css";
import leagueStyles from "@/features/leagues/components/league-hall.module.css";

type LeaguesProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LeaguesProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);
  return { title: messages.leagues.title };
}

export default async function LeaguesPage({ params }: LeaguesProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/leagues`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const [messages, myLeagues, joinable, finalized] = await Promise.all([
    getMessages(locale),
    getMyGroupLeagues(profile.groupId),
    getJoinableLeagues(profile.groupId),
    getFinalizedLeagues(),
  ]);

  // Active "my" leagues get a live standings preview; counts for cards.
  const activeMine = myLeagues.filter((l) => l.status === "active");
  const [activeStandings, myCounts, joinableCounts] = await Promise.all([
    Promise.all(activeMine.map((l) => getLeagueStandings(l.id))),
    Promise.all(myLeagues.map((l) => getLeagueParticipantCount(l.id))),
    Promise.all(joinable.map((l) => getLeagueParticipantCount(l.id))),
  ]);
  const standingsById = new Map(activeMine.map((l, i) => [l.id, activeStandings[i]]));
  const myCountById = new Map(myLeagues.map((l, i) => [l.id, myCounts[i]]));
  const joinableCountById: Record<string, number> = {};
  joinable.forEach((l, i) => (joinableCountById[l.id] = joinableCounts[i]));

  const copy = messages.leagues;

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className={styles.surface}>
        <div className={styles.sheet}>
          <div className={leagueStyles.hero}>
            <div className={leagueStyles.heroBloom} />
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
              <Link
                href={`/${locale}`}
                aria-label={copy.back}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-3 p-4">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-white/20 text-white backdrop-blur-sm">
                <Trophy className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-white">{copy.title}</h1>
                <p className="truncate text-xs text-white/85">{copy.subtitle}</p>
              </div>
            </div>
          </div>

          {/* 진행 중 · 내 그룹 */}
          <section className={styles.section}>
            <h2 className="mb-3 text-sm font-semibold text-ink">{copy.sections.active}</h2>
            {myLeagues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-center">
                <p className="text-sm font-semibold text-ink">{copy.emptyActive}</p>
                <p className="mt-1 text-xs text-ink-subtle">{copy.emptyActiveHint}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {myLeagues.map((league) => (
                  <div key={league.id} className="flex flex-col gap-2">
                    <LeagueCard
                      league={league}
                      participantCount={myCountById.get(league.id) ?? 0}
                      href={`/${locale}/leagues/${league.id}`}
                    />
                    {standingsById.has(league.id) ? (
                      <div className="px-1">
                        <LeagueStandingsTable
                          standings={(standingsById.get(league.id) ?? []).slice(0, 3)}
                          myCompetitorId={profile.groupId}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 리그 찾기 */}
          <section className={styles.section}>
            <h2 className="mb-3 text-sm font-semibold text-ink">{copy.sections.browse}</h2>
            <LeagueBrowseList leagues={joinable} participantCounts={joinableCountById} />
          </section>

          {/* 지난 기록 */}
          <section className={styles.section}>
            <h2 className="mb-3 text-sm font-semibold text-ink">{copy.sections.past}</h2>
            {finalized.length === 0 ? (
              <p className="px-1 py-4 text-center text-sm text-ink-subtle">{copy.emptyPast}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {finalized.map((league) => (
                  <LeagueCard
                    key={league.id}
                    league={{ ...league, scope: "group", status: "finalized", isOpen: false }}
                    participantCount={0}
                    href={`/${locale}/leagues/${league.id}`}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </CampusEnergyProviders>
  );
}
```

> Note: `getFinalizedLeagues` returns `FinalizedLeague` (`{id,name,startsAt,endsAt}`); the spread adapts it to the `LeagueSummary` shape `LeagueCard` expects. Participant count for past leagues is omitted (shown as 0) to avoid N extra queries; if undesired, fetch counts like the other sections.

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit` then `npm run build`
Expected: no new type errors; build succeeds with route `/[locale]/leagues` present (Dynamic).

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/leagues/page.tsx"
git commit -m "feat(leagues): /leagues hub page (active/browse/past)"
```

---

## Task 11: `/leagues/[leagueId]` detail page

**Files:**
- Create: `src/app/[locale]/leagues/[leagueId]/page.tsx`

**Interfaces:**
- Consumes `getLeague`, `getLeagueAwards`, `getLeagueStandings`, `getLeagueParticipantCount`, `getJoinableLeagues` (to know if joinable), `AwardPodium`, `StudentWinners`, `LeagueStandingsTable`, `LeagueStatusBadge`, `JoinLeagueButton`.

- [ ] **Step 1: Write the page**

Create `src/app/[locale]/leagues/[leagueId]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/account/data/account-dal";
import {
  getJoinableLeagues,
  getLeague,
  getLeagueAwards,
  getLeagueParticipantCount,
  getLeagueStandings,
} from "@/features/leagues/data/leagues-dal";
import { AwardPodium } from "@/features/leagues/components/award-podium";
import { StudentWinners } from "@/features/leagues/components/student-winners";
import { LeagueStandingsTable } from "@/features/leagues/components/league-standings-table";
import { LeagueStatusBadge } from "@/features/leagues/components/league-status-badge";
import { JoinLeagueButton } from "@/features/leagues/components/join-league-button";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/interpolate";
import { formatNumber } from "@/i18n/format";
import styles from "@/features/account/components/profile-surface.module.css";
import leagueStyles from "@/features/leagues/components/league-hall.module.css";

type DetailProps = { params: Promise<{ locale: string; leagueId: string }> };

export async function generateMetadata({ params }: DetailProps): Promise<Metadata> {
  const { locale, leagueId } = await params;
  if (!isLocale(locale)) notFound();
  const league = await getLeague(leagueId);
  const messages = await getMessages(locale);
  return { title: league ? league.name : messages.leagues.title };
}

function shortDate(locale: string, iso: string): string {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export default async function LeagueDetailPage({ params }: DetailProps) {
  const { locale, leagueId } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/leagues/${leagueId}`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const league = await getLeague(leagueId);
  if (!league) notFound();

  const messages = await getMessages(locale);
  const copy = messages.leagues;

  const [participantCount, joinable] = await Promise.all([
    getLeagueParticipantCount(leagueId),
    getJoinableLeagues(profile.groupId),
  ]);
  const canJoin = joinable.some((l) => l.id === leagueId);

  const isFinalized = league.status === "finalized";
  const awards = isFinalized ? await getLeagueAwards(leagueId) : null;
  const standings = isFinalized ? [] : await getLeagueStandings(leagueId);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className={styles.surface}>
        <div className={styles.sheet}>
          <div className={leagueStyles.hero}>
            <div className={leagueStyles.heroBloom} />
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
              <Link
                href={`/${locale}/leagues`}
                aria-label={copy.detailBack}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 p-4">
              <h1 className="text-lg font-bold text-white">{league.name}</h1>
              <p className="mt-0.5 text-xs text-white/85">
                {interpolate(copy.period, { start: shortDate(locale, league.startsAt), end: shortDate(locale, league.endsAt) })}
                {" · "}
                {interpolate(copy.participants, { count: formatNumber(locale, participantCount) })}
              </p>
            </div>
          </div>

          <section className={styles.section}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <LeagueStatusBadge status={league.status} />
              {canJoin ? <JoinLeagueButton leagueId={league.id} /> : null}
            </div>

            {isFinalized && awards ? (
              <div className="flex flex-col gap-4">
                <AwardPodium teams={awards.teams} />
                <StudentWinners students={awards.students} />
              </div>
            ) : (
              <LeagueStandingsTable standings={standings} myCompetitorId={profile.groupId} />
            )}
          </section>
        </div>
      </main>
    </CampusEnergyProviders>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit` then `npm run build`
Expected: no new type errors; build succeeds with route `/[locale]/leagues/[leagueId]` present (Dynamic).

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/leagues/[leagueId]/page.tsx"
git commit -m "feat(leagues): /leagues/[leagueId] detail (podium or live standings + join)"
```

---

## Task 12: Entry points — redirect, map rail, /me link, label

**Files:**
- Modify: `src/app/[locale]/hall-of-fame/page.tsx` (→ redirect)
- Modify: `src/features/campus-energy/components/map-controls.tsx` (+ its callers) and `src/features/campus-energy/__tests__/map-controls.test.tsx`
- Modify: `src/app/[locale]/me/page.tsx`
- Modify: `src/i18n/messages/ko.ts`, `src/i18n/messages/en.ts` (control label)

**Interfaces:**
- The map control rail and `/me` link now target `/[locale]/leagues`; `/hall-of-fame` permanently forwards to `/leagues`.

- [ ] **Step 1: Redirect the old route**

Replace the entire contents of `src/app/[locale]/hall-of-fame/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";

type Props = { params: Promise<{ locale: string }> };

export default async function HallOfFameRedirect({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/leagues`);
}
```

- [ ] **Step 2: Relabel the map control i18n key**

In `src/i18n/messages/ko.ts`, change the `mapView.controls.hallOfFame` value from `"명예의 전당"` to `"리그"`. In `src/i18n/messages/en.ts`, change the matching `hallOfFame` value from `"Hall of Fame"` to `"Leagues"`. (Key name kept to avoid wider churn; it is the trophy-rail label.)

- [ ] **Step 3: Point the trophy rail + /me link to /leagues**

In `src/features/campus-energy/components/map-controls.tsx`, the `hallOfFameHref` prop is already wired to the Trophy `ControlLink`; no code change is needed here — only the value passed in changes. Find where `hallOfFameHref` is supplied (grep: `hallOfFameHref=`; it is threaded from `src/app/[locale]/page.tsx` → `CampusEnergyApp` → `AdminMapView` → `MapControls`). At the origin in `src/app/[locale]/page.tsx`, change the value passed from `/${locale}/hall-of-fame` to `/${locale}/leagues`.

In `src/app/[locale]/me/page.tsx`, change the hall-of-fame `Link`'s `href` from `` `/${locale}/hall-of-fame` `` to `` `/${locale}/leagues` `` (keep the `messages.hallOfFame.title` label or switch to `messages.leagues.title` — use `messages.leagues.title`).

- [ ] **Step 4: Update the map-controls test for the new label**

In `src/features/campus-energy/__tests__/map-controls.test.tsx`, update any assertion referencing the control label text `"명예의 전당"`/`"Hall of Fame"` to `"리그"`/`"Leagues"` (the mock `messages.mapView.controls.hallOfFame` value). If the test asserts the href, set the expected href to the value the test passes in (tests pass their own `hallOfFameHref`, so href assertions are unaffected).

- [ ] **Step 5: Run affected tests + i18n symmetry + build**

Run: `npx vitest run src/features/campus-energy/__tests__/map-controls.test.tsx src/i18n/__tests__`
Expected: PASS.

Run: `npm run build`
Expected: success; `/[locale]/hall-of-fame` builds as a redirect; `/[locale]/leagues` present.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/hall-of-fame/page.tsx" "src/app/[locale]/page.tsx" "src/app/[locale]/me/page.tsx" src/features/campus-energy/components/map-controls.tsx src/features/campus-energy/__tests__/map-controls.test.tsx src/i18n/messages/ko.ts src/i18n/messages/en.ts
git commit -m "feat(leagues): route entry points to /leagues (redirect, rail, /me)"
```

---

## Task 13: Full verification + DB cleanup

**Files:** none (verification only).

- [ ] **Step 1: Full suite, lint, build**

Run: `npm run test`
Expected: all green (existing + new league tests).

Run: `npm run lint`
Expected: `0 errors`; only the 2 pre-existing `game-preview.tsx` warnings.

Run: `npm run build`
Expected: success; routes `/[locale]/leagues`, `/[locale]/leagues/[leagueId]` present (Dynamic); `/[locale]/hall-of-fame` is a redirect.

- [ ] **Step 2: DB cleanup probe (preserve demo + seeds)**

Run via MCP `execute_sql` to confirm no stray verification rows remain and the demo account is intact:

```sql
select email from auth.users where email = 'demo@cems.kr';                 -- 1 row
select count(*) as active_parts from public.league_participants
  where league_id = 'yu-energy-2026-summer';                              -- 3 (seed intact)
select count(*) as fall_parts from public.league_participants
  where league_id = 'yu-open-2026-fall' and competitor_id='student-services'; -- 0 (demo not pre-joined)
```
Expected: `demo@cems.kr` present; summer has 3 participants; `student-services` is NOT pre-joined to the fall league (so the join demo works). If a probe in Task 1/earlier left `student-services` joined to `yu-open-2026-fall`, remove it: `delete from public.league_participants where league_id='yu-open-2026-fall' and competitor_id='student-services';`

- [ ] **Step 3: Report honestly**

Summarize automated evidence (tests/lint/build + SQL probes). State that pixel confirmation of `/leagues` and the join flow is pending the user's dev server (no app screenshot in this environment). Do not claim visual verification that was not performed.

---

## Self-Review

**1. Spec coverage:**
- `/leagues` hub (진행 중 / 리그 찾기 / 지난 기록) → Task 10. ✔
- `/leagues/[id]` detail (finalized podium / active standings + join) → Task 11. ✔
- Group-unit join + `is_open` + `join_league`/`leave_league` (server-authoritative, anon-revoked) → Task 1; actions → Task 8; button/search → Task 9. ✔
- English-name fix via `competitorLabel` + `demo.groups` → Task 3 (helper/i18n), Task 5 (podium), Task 6 (standings table), Task 7/9 (cards via standings/podium). ✔
- Demo seed (active in-window-after-topup + joinable not-joined) → Task 2. ✔
- Reuse podium/winners/tier palette/warm sheet → Tasks 10–11. ✔
- Entry points (redirect, rail, /me, label) → Task 12. ✔
- `get_league_standings` participants-based (confirmed, no patch) → reflected in Task 1 note + spec. ✔
- ko/en symmetry, lint, build, DB probes, preserve `demo@cems.kr` → Tasks 3/12 (i18n test), 13. ✔

**2. Placeholder scan:** No TBD/TODO/"handle errors". Every code step has full content; SQL and commands are concrete with expected output. Empty/no-result/not-found states are all handled (hub sections, standings, browse, detail `notFound`).

**3. Type consistency:**
- `LeagueActionState` defined in `join-league.ts` (Task 8), imported by `leave-league.ts` (Task 8) and `JoinLeagueButton` (Task 9). ✔
- `LeagueSummary`/`LeagueStatus` defined in Task 4, consumed by DAL (4), `LeagueCard` (7), `LeagueBrowseList` (9), `LeagueStatusBadge` (6), pages (10–11). ✔
- `competitorLabel(groupLabels, competitorId, fallback)` signature identical in Tasks 3, 5, 6. ✔
- RPC names `join_league`/`leave_league` and return strings `joined/already/left/absent` consistent between Task 1 (SQL) and Task 8 (actions). ✔
- `getLeagueStandings`/`getLeagueAwards`/`getFinalizedLeagues` reused with existing signatures; new DAL names (`getMyGroupLeagues`, `getJoinableLeagues`, `getLeague`, `getLeagueParticipantCount`) consistent between Task 4 and Tasks 10–11. ✔
- `messages.leagues.*` keys used in components (Tasks 6–11) all exist in the Task 3 namespace (status/sections/search/join/standings/participants/period/empty*). ✔

One cross-task note for the executor: Task 1 Step 3's probe references `yu-open-2026-fall` (seeded in Task 2) — run that probe after Task 2, or it will report "league not found".

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-29-league-system-hub-search-join.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session with checkpoints.

Which approach?
