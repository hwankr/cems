# 리그 수상 시스템 — Plan A: 코어 + 명예의 전당 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 리그(기간이 정해진 한 대회)의 데이터 코어 — 3개 테이블, 순위/확정/수상조회 RPC, 데모 리그 시드·확정 — 를 만들고, 그 결과를 `/hall-of-fame`(명예의 전당)에서 시상대로 보여준다.

**Architecture:** 기존 서버 권위 패턴을 따른다. 신규 테이블 `leagues`/`league_participants`/`league_awards`(authenticated 읽기 전용, 클라이언트 쓰기 없음). 순위는 **1인당 평균 포인트**(리그 기간 윈도우)로 계산하는 SECURITY DEFINER RPC `get_league_standings`가 RLS(본인 그룹만)를 넘어 합산한다. **운영자 전용** `finalize_league`가 1·2·3위 팀상(금·은·동)과 1위팀 상위 N명 학생상을 `league_awards`에 불변 기록한다. 명예의 전당은 `get_league_awards`(이름 투영) RPC로 결과를 읽어 시상대를 렌더한다. 순수 계산(shaping/티어)은 `src/features/leagues/domain/`에서 Vitest TDD, DB는 SQL 프로브로 검증.

**Tech Stack:** Next.js 16 (App Router, 서버 컴포넌트), React 19, TypeScript, Tailwind CSS v4(디자인 토큰 `globals.css`), Supabase(Postgres + RLS + SECURITY DEFINER RPC), Vitest + jsdom. 로케일 라우트 `/ko`·`/en`.

## Global Constraints

- 모든 변형은 **서버 권위**. 신규 3개 테이블에 클라이언트 쓰기 정책을 두지 않는다. `finalize_league`는 **운영자(MCP/service-role) 전용**: `revoke execute ... from anon, authenticated`.
- 읽기 RPC(`get_league_standings`, `get_league_awards`)는 **leaderboard 투영**(이름·점수·티어·순위)만 노출. 이메일/handle/bio 금지. `revoke execute from anon`, `grant execute to authenticated`, `set search_path = public`(기존 `get_subject_contributor_rankings` 패턴과 동일).
- 기존 `point_events`/그룹 풀/캐릭터/영지 로직은 **변경하지 않는다**. 리그는 기존 포인트를 *읽기만* 한다.
- 순위 지표 = **1인당 평균 포인트** = 그룹원의 리그 기간(`point_events.created_at ∈ [starts_at, ends_at)`) 포인트 합 ÷ 그룹원 수. 타이브레이크: 평균 desc → 합계 desc → competitor_id asc.
- 티어: rank 1→`gold`, 2→`silver`, 3→`bronze`. 학생상: 1위(gold) 그룹 상위 N명, `tier='gold'`.
- 한국어 우선. 모든 표시 문자열은 `src/i18n/messages/ko.ts`·`en.ts` 양쪽에 추가(타입은 `koMessages`에서 자동 파생 — 별도 타입 편집 불필요).
- Supabase 적용: MCP `apply_migration`(DDL/함수) + `execute_sql`(시드/프로브), 프로젝트 ref `zvuqmagfpdyrrzyjntue`. 적용한 SQL은 `docs/superpowers/migrations/`에 기록한다.
- Next.js 코드 작성 전 `AGENTS.md`에 따라 `node_modules/next/dist/docs/`의 관련 문서를 확인한다(이 Plan에서 서버 컴포넌트 데이터 패칭은 기존 `Promise.all` 패턴 재사용이라 표면 작음).
- 검증 베이스라인: `npm run lint`는 기존 `game-preview.tsx` 경고 **2개**만, errors 0. `npm run test`/`npm run build` 통과.
- 검증 데이터는 정리하고 실계정 `it@naver.com`(it1/student-services)은 보존한다. (단, 이 Plan의 데모 리그 시드는 *의도된 영구 데모 데이터*이므로 보존한다.)

---

## File Structure

**Create:**
- `src/features/leagues/domain/types.ts` — 리그/순위/수상 타입(스네이크 RPC 행 + 카멜 도메인).
- `src/features/leagues/domain/standings.ts` — `tierForRank`, `shapeStandings`, `groupLeagueAwards`(순수, TDD).
- `src/features/leagues/__tests__/standings.test.ts` — 도메인 테스트.
- `src/features/leagues/data/leagues-dal.ts` — `getLeagueStandings`/`getLeagueAwards`(RPC), `getFinalizedLeagues`/`getMyLeagueAwards`/`getSubjectAwardTiers`(테이블 읽기).
- `src/features/leagues/components/award-podium.tsx` — 팀 시상대(금·은·동) presentational.
- `src/features/leagues/components/league-hall-section.tsx` — 리그 1개 섹션(시상대 + 학생 명단).
- `src/features/leagues/__tests__/award-podium.test.tsx` — 컴포넌트 테스트.
- `src/features/leagues/__tests__/league-hall-section.test.tsx` — 컴포넌트 테스트.
- `src/app/[locale]/hall-of-fame/page.tsx` — 명예의 전당 라우트(서버 컴포넌트).
- `docs/superpowers/migrations/2026-06-28-league-awards-schema.sql` — 기록.
- `docs/superpowers/migrations/2026-06-28-league-awards-rpcs.sql` — 기록.
- `docs/superpowers/migrations/2026-06-28-league-awards-demo-seed.sql` — 기록.

**Modify:**
- `src/i18n/messages/ko.ts` — `hallOfFame` 블록 + 지도 진입 라벨.
- `src/i18n/messages/en.ts` — 동일 구조.
- `src/app/[locale]/me/page.tsx` — `/hall-of-fame` 링크(헤더 또는 섹션).
- `src/features/campus-energy/components/map-controls.tsx` — 명예의 전당 진입 아이콘(레일).
- `src/features/campus-energy/components/admin-map-view.tsx` — `map-controls`에 `hallOfFameHref` 전달.

---

## Interfaces (이 Plan이 만들고 Plan B가 소비)

- `AwardTier = "gold" | "silver" | "bronze"`, `CompetitorKind = "group" | "school"` (`leagues/domain/types.ts`).
- `getSubjectAwardTiers(): Promise<SubjectAwardTiers>` — `Record<subjectId, { tier, leagueId, leagueName }>` (Plan B 지도/영지가 사용).
- `getMyLeagueAwards(): Promise<MyLeagueAward[]>` — 내 학생상 (Plan B `/me` 뱃지가 사용).
- RPC `get_league_standings(p_league_id text)`, `finalize_league(p_league_id text)`, `get_league_awards(p_league_id text)`.

---

## Task 1: 리그 도메인 — 타입 + shaping (순수, TDD)

프레임워크/DB 무관. 나머지 전부가 import하는 데이터 형태를 고정한다.

**Files:**
- Create: `src/features/leagues/domain/types.ts`
- Create: `src/features/leagues/domain/standings.ts`
- Test: `src/features/leagues/__tests__/standings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/leagues/__tests__/standings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  groupLeagueAwards,
  shapeStandings,
  tierForRank,
} from "../domain/standings";
import type { LeagueAwardRow, LeagueStandingRow } from "../domain/types";

const standingRow = (
  competitorId: string,
  rank: number,
  avg: number,
  total: number,
  members: number,
): LeagueStandingRow => ({
  competitor_kind: "group",
  competitor_id: competitorId,
  competitor_name: `${competitorId} name`,
  member_count: members,
  total_points: total,
  avg_points: avg,
  rank,
});

describe("tierForRank", () => {
  it("maps 1/2/3 to gold/silver/bronze and others to null", () => {
    expect(tierForRank(1)).toBe("gold");
    expect(tierForRank(2)).toBe("silver");
    expect(tierForRank(3)).toBe("bronze");
    expect(tierForRank(4)).toBeNull();
    expect(tierForRank(0)).toBeNull();
  });
});

describe("shapeStandings", () => {
  it("maps snake_case rows to camelCase, preserving order", () => {
    const result = shapeStandings([
      standingRow("student-services", 1, 1200, 6000, 5),
      standingRow("humanities", 2, 1100, 5500, 5),
    ]);
    expect(result).toEqual([
      {
        competitorKind: "group",
        competitorId: "student-services",
        competitorName: "student-services name",
        memberCount: 5,
        totalPoints: 6000,
        avgPoints: 1200,
        rank: 1,
      },
      {
        competitorKind: "group",
        competitorId: "humanities",
        competitorName: "humanities name",
        memberCount: 5,
        totalPoints: 5500,
        avgPoints: 1100,
        rank: 2,
      },
    ]);
  });
});

describe("groupLeagueAwards", () => {
  const teamRow = (
    competitorId: string,
    tier: string,
    rank: number,
  ): LeagueAwardRow => ({
    award_type: "team",
    tier,
    rank,
    competitor_id: competitorId,
    competitor_name: `${competitorId} name`,
    user_id: null,
    display_name: null,
    metric_value: 1200,
  });
  const studentRow = (
    userId: string,
    rank: number,
  ): LeagueAwardRow => ({
    award_type: "student",
    tier: "gold",
    rank,
    competitor_id: null,
    competitor_name: null,
    user_id: userId,
    display_name: `User ${userId}`,
    metric_value: 1600,
  });

  it("splits team and student awards into camelCase lists sorted by rank", () => {
    const result = groupLeagueAwards([
      studentRow("u2", 2),
      teamRow("humanities", "silver", 2),
      teamRow("student-services", "gold", 1),
      studentRow("u1", 1),
    ]);
    expect(result.teams.map((t) => t.competitorId)).toEqual([
      "student-services",
      "humanities",
    ]);
    expect(result.teams[0]).toEqual({
      tier: "gold",
      rank: 1,
      competitorId: "student-services",
      competitorName: "student-services name",
      metricValue: 1200,
    });
    expect(result.students.map((s) => s.userId)).toEqual(["u1", "u2"]);
    expect(result.students[0]).toEqual({
      tier: "gold",
      rank: 1,
      userId: "u1",
      displayName: "User u1",
      metricValue: 1600,
    });
  });

  it("returns empty lists for no rows", () => {
    expect(groupLeagueAwards([])).toEqual({ teams: [], students: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/leagues/__tests__/standings.test.ts`
Expected: FAIL — `Cannot find module '../domain/standings'`.

- [ ] **Step 3: Write the types**

Create `src/features/leagues/domain/types.ts`:

```ts
export type AwardTier = "gold" | "silver" | "bronze";
export type CompetitorKind = "group" | "school";

/** Raw row from get_league_standings RPC. */
export type LeagueStandingRow = {
  competitor_kind: string;
  competitor_id: string;
  competitor_name: string;
  member_count: number;
  total_points: number;
  avg_points: number;
  rank: number;
};

export type LeagueStanding = {
  competitorKind: CompetitorKind;
  competitorId: string;
  competitorName: string;
  memberCount: number;
  totalPoints: number;
  avgPoints: number;
  rank: number;
};

/** Raw row from get_league_awards RPC. */
export type LeagueAwardRow = {
  award_type: string;
  tier: string;
  rank: number;
  competitor_id: string | null;
  competitor_name: string | null;
  user_id: string | null;
  display_name: string | null;
  metric_value: number | null;
};

export type TeamAward = {
  tier: AwardTier;
  rank: number;
  competitorId: string;
  competitorName: string;
  metricValue: number | null;
};

export type StudentAward = {
  tier: AwardTier;
  rank: number;
  userId: string;
  displayName: string;
  metricValue: number | null;
};

export type LeagueAwards = {
  teams: TeamAward[];
  students: StudentAward[];
};

/** A finalized league (table read). */
export type FinalizedLeague = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

/** My student award (table read), for the /me badge (Plan B). */
export type MyLeagueAward = {
  leagueId: string;
  leagueName: string;
  tier: AwardTier;
  rank: number;
};

/** Per-subject award tier from the latest finalized league (Plan B map/estate). */
export type SubjectAwardTier = {
  tier: AwardTier;
  leagueId: string;
  leagueName: string;
};
export type SubjectAwardTiers = Record<string, SubjectAwardTier>;
```

- [ ] **Step 4: Write the shaping functions**

Create `src/features/leagues/domain/standings.ts`:

```ts
import type {
  AwardTier,
  LeagueAwardRow,
  LeagueAwards,
  LeagueStanding,
  LeagueStandingRow,
  StudentAward,
  TeamAward,
} from "./types";

const TIER_BY_RANK: Record<number, AwardTier> = {
  1: "gold",
  2: "silver",
  3: "bronze",
};

export function tierForRank(rank: number): AwardTier | null {
  return TIER_BY_RANK[rank] ?? null;
}

export function shapeStandings(
  rows: readonly LeagueStandingRow[],
): LeagueStanding[] {
  return rows.map((row) => ({
    competitorKind: row.competitor_kind === "school" ? "school" : "group",
    competitorId: row.competitor_id,
    competitorName: row.competitor_name,
    memberCount: row.member_count,
    totalPoints: row.total_points,
    avgPoints: row.avg_points,
    rank: row.rank,
  }));
}

export function groupLeagueAwards(
  rows: readonly LeagueAwardRow[],
): LeagueAwards {
  const teams: TeamAward[] = [];
  const students: StudentAward[] = [];

  for (const row of rows) {
    const tier = (row.tier === "silver" || row.tier === "bronze"
      ? row.tier
      : "gold") as AwardTier;

    if (row.award_type === "student" && row.user_id) {
      students.push({
        tier,
        rank: row.rank,
        userId: row.user_id,
        displayName: row.display_name ?? row.user_id,
        metricValue: row.metric_value,
      });
    } else if (row.award_type === "team" && row.competitor_id) {
      teams.push({
        tier,
        rank: row.rank,
        competitorId: row.competitor_id,
        competitorName: row.competitor_name ?? row.competitor_id,
        metricValue: row.metric_value,
      });
    }
  }

  teams.sort((a, b) => a.rank - b.rank);
  students.sort((a, b) => a.rank - b.rank);
  return { teams, students };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/leagues/__tests__/standings.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/leagues/domain/types.ts src/features/leagues/domain/standings.ts src/features/leagues/__tests__/standings.test.ts
git commit -m "feat(leagues): add league standings/awards domain types and shaping"
```

---

## Task 2: DB — 스키마 마이그레이션 (테이블 3 + RLS + 인덱스)

Supabase MCP로 적용 후 SQL 기록. Vitest 없음(DB 레이어).

**Files:**
- Create: `docs/superpowers/migrations/2026-06-28-league-awards-schema.sql`

- [ ] **Step 1: Write the migration SQL file**

Create `docs/superpowers/migrations/2026-06-28-league-awards-schema.sql`:

```sql
-- League awards core schema (applied to project zvuqmagfpdyrrzyjntue, 2026-06-28).
-- A league = one bounded competition. No separate "season" layer.
-- All three tables are authenticated read-only; writes go only through RPCs /
-- the operator-only finalize_league. Mirrors the existing server-authoritative
-- pattern (point_events/estates have no client write policies).

create table public.leagues (
  id text primary key,
  name text not null,
  scope text not null check (scope in ('group','school')),
  school_id text references public.schools (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'upcoming'
    check (status in ('upcoming','active','finalized')),
  badge_winner_count int not null default 3 check (badge_winner_count >= 0),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.league_participants (
  league_id text not null references public.leagues (id) on delete cascade,
  competitor_kind text not null check (competitor_kind in ('group','school')),
  competitor_id text not null,
  primary key (league_id, competitor_kind, competitor_id)
);

create table public.league_awards (
  id uuid primary key default gen_random_uuid(),
  league_id text not null references public.leagues (id) on delete cascade,
  award_type text not null check (award_type in ('team','student')),
  tier text not null check (tier in ('gold','silver','bronze')),
  competitor_kind text,
  competitor_id text,
  user_id uuid references public.profiles (id) on delete cascade,
  rank int not null,
  metric_value numeric,
  created_at timestamptz not null default now()
);
create unique index league_awards_team_uniq
  on public.league_awards (league_id, competitor_id) where award_type = 'team';
create unique index league_awards_student_uniq
  on public.league_awards (league_id, user_id) where award_type = 'student';
create index league_awards_league_idx on public.league_awards (league_id);

alter table public.leagues enable row level security;
alter table public.league_participants enable row level security;
alter table public.league_awards enable row level security;

-- Reference/result data: any authenticated user may read. No write policies
-- (RPC / operator only).
create policy "leagues readable" on public.leagues
  for select to authenticated using (true);
create policy "league participants readable" on public.league_participants
  for select to authenticated using (true);
create policy "league awards readable" on public.league_awards
  for select to authenticated using (true);
```

- [ ] **Step 2: Apply via the Supabase MCP**

Use Supabase MCP `apply_migration` (ref `zvuqmagfpdyrrzyjntue`, name `league_awards_schema`) with the SQL above.
Expected: success, no error.

- [ ] **Step 3: Probe the schema**

Use Supabase MCP `execute_sql`:

```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('leagues','league_participants','league_awards')
order by table_name;
```

Expected: 3 rows (`league_awards`, `league_participants`, `leagues`).

- [ ] **Step 4: Commit the recorded SQL**

```bash
git add docs/superpowers/migrations/2026-06-28-league-awards-schema.sql
git commit -m "feat(db): add league awards core schema (leagues/participants/awards)"
```

---

## Task 3: DB — `get_league_standings` + `finalize_league` RPC

순위(1인당 평균)와 확정(팀상+학생상)을 권위 있게 계산. `get_league_standings`는 RLS를 넘는 leaderboard 투영, `finalize_league`는 운영자 전용.

**Files:**
- Create: `docs/superpowers/migrations/2026-06-28-league-awards-rpcs.sql` (이 Task에서 시작, Task 4에서 이어 추가)

- [ ] **Step 1: Write the RPC SQL (standings + finalize)**

Create `docs/superpowers/migrations/2026-06-28-league-awards-rpcs.sql`:

```sql
-- League awards RPCs (applied to project zvuqmagfpdyrrzyjntue, 2026-06-28).

-- Standings: per-capita average points over the league window, across ALL
-- participant groups. SECURITY DEFINER deliberately crosses the per-group
-- point_events RLS to compute a cross-group leaderboard (name + points + rank).
create or replace function public.get_league_standings(p_league_id text)
returns table (
  competitor_kind text,
  competitor_id text,
  competitor_name text,
  member_count int,
  total_points int,
  avg_points numeric,
  rank int
)
language sql
security definer
stable
set search_path = public
as $$
  with lg as (
    select starts_at, ends_at from public.leagues where id = p_league_id
  ),
  parts as (
    select competitor_kind, competitor_id
    from public.league_participants
    where league_id = p_league_id
  ),
  members as (
    select pa.competitor_kind, pa.competitor_id, pr.id as user_id
    from parts pa
    join public.profiles pr
      on pa.competitor_kind = 'group' and pr.group_id = pa.competitor_id
  ),
  scored as (
    select
      m.competitor_kind,
      m.competitor_id,
      count(distinct m.user_id) as member_count,
      coalesce(sum(pe.points), 0)::int as total_points
    from members m
    left join public.point_events pe
      on pe.user_id = m.user_id
     and pe.created_at >= (select starts_at from lg)
     and pe.created_at <  (select ends_at from lg)
    group by m.competitor_kind, m.competitor_id
  ),
  named as (
    select
      s.competitor_kind,
      s.competitor_id,
      coalesce(g.name, s.competitor_id) as competitor_name,
      s.member_count,
      s.total_points,
      case when s.member_count > 0
        then round(s.total_points::numeric / s.member_count, 2)
        else 0 end as avg_points
    from scored s
    left join public.groups g
      on s.competitor_kind = 'group' and g.id = s.competitor_id
  )
  select
    competitor_kind,
    competitor_id,
    competitor_name,
    member_count,
    total_points,
    avg_points,
    row_number() over (
      order by avg_points desc, total_points desc, competitor_id asc
    )::int as rank
  from named
  order by rank;
$$;
revoke all on function public.get_league_standings(text) from public;
revoke execute on function public.get_league_standings(text) from anon;
grant execute on function public.get_league_standings(text) to authenticated;
comment on function public.get_league_standings(text) is
  'Per-capita average points standings for a league, across all participant groups. SECURITY DEFINER leaderboard projection (name+points+rank). EXECUTE revoked from anon.';

-- Finalize: write podium team awards (gold/silver/bronze) + top-N student
-- awards from the gold group. OPERATOR-ONLY (EXECUTE revoked from authenticated
-- and anon; only service_role / MCP can run it). Idempotent.
create or replace function public.finalize_league(p_league_id text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge_n int;
  v_starts timestamptz;
  v_ends timestamptz;
  v_gold text;
  v_count int := 0;
  v_n int;
begin
  select badge_winner_count, starts_at, ends_at
    into v_badge_n, v_starts, v_ends
  from public.leagues where id = p_league_id;
  if not found then
    raise exception 'league % not found', p_league_id;
  end if;

  delete from public.league_awards where league_id = p_league_id;

  insert into public.league_awards
    (league_id, award_type, tier, competitor_kind, competitor_id, rank, metric_value)
  select
    p_league_id, 'team',
    (array['gold','silver','bronze'])[s.rank],
    s.competitor_kind, s.competitor_id, s.rank, s.avg_points
  from public.get_league_standings(p_league_id) s
  where s.rank <= 3;
  get diagnostics v_n = row_count;
  v_count := v_count + v_n;

  select competitor_id into v_gold
  from public.get_league_standings(p_league_id)
  where rank = 1;

  if v_gold is not null and v_badge_n > 0 then
    insert into public.league_awards
      (league_id, award_type, tier, user_id, rank, metric_value)
    select p_league_id, 'student', 'gold', t.user_id, t.rk, t.pts
    from (
      select
        pr.id as user_id,
        coalesce(sum(pe.points), 0)::int as pts,
        row_number() over (
          order by coalesce(sum(pe.points), 0) desc, pr.display_name asc
        ) as rk
      from public.profiles pr
      left join public.point_events pe
        on pe.user_id = pr.id
       and pe.created_at >= v_starts
       and pe.created_at <  v_ends
      where pr.group_id = v_gold
      group by pr.id, pr.display_name
    ) t
    where t.rk <= v_badge_n;
    get diagnostics v_n = row_count;
    v_count := v_count + v_n;
  end if;

  update public.leagues set status = 'finalized' where id = p_league_id;
  return v_count;
end;
$$;
revoke all on function public.finalize_league(text) from public;
revoke execute on function public.finalize_league(text) from anon, authenticated;
comment on function public.finalize_league(text) is
  'OPERATOR-ONLY (service_role/MCP). Writes podium team awards + top-N gold-team student awards for a league, then marks it finalized. Idempotent. EXECUTE revoked from anon and authenticated.';
```

- [ ] **Step 2: Apply via the Supabase MCP**

Use `apply_migration` (name `league_awards_rpcs`) with the SQL above.
Expected: success.

- [ ] **Step 3: Probe the standings RPC shape (pre-seed)**

Use `execute_sql`:

```sql
-- No league yet → empty result, but the function resolves/typechecks.
select * from public.get_league_standings('nonexistent');
```

Expected: 0 rows, no error.

- [ ] **Step 4: Check advisors**

Use Supabase MCP `get_advisors` (type `security`).
Expected: only the benign "function executable by authenticated" WARN for `get_league_standings` (consistent with existing `claim_period_reward`/`save_estate`/`get_subject_contributor_rankings`). `finalize_league` is NOT executable by authenticated (no such WARN, or a "no EXECUTE" note). No ERROR-level findings introduced.

- [ ] **Step 5: Commit (interim — Task 4 appends to the same file)**

```bash
git add docs/superpowers/migrations/2026-06-28-league-awards-rpcs.sql
git commit -m "feat(db): add get_league_standings and finalize_league RPCs"
```

---

## Task 4: DB — `get_league_awards` RPC

명예의 전당이 읽을 수상 결과(팀 + 학생, 이름 투영). 학생 이름은 타 그룹이라 profiles RLS를 넘어야 하므로 SECURITY DEFINER.

**Files:**
- Modify: `docs/superpowers/migrations/2026-06-28-league-awards-rpcs.sql` (append)

- [ ] **Step 1: Append the RPC SQL**

Append to `docs/superpowers/migrations/2026-06-28-league-awards-rpcs.sql`:

```sql
-- Hall of fame read: a league's full award set (team podium + students) with
-- names. SECURITY DEFINER because winners' display_name spans groups (profiles
-- RLS is own-group only). Leaderboard projection: name + tier + rank only.
create or replace function public.get_league_awards(p_league_id text)
returns table (
  award_type text,
  tier text,
  rank int,
  competitor_id text,
  competitor_name text,
  user_id uuid,
  display_name text,
  metric_value numeric
)
language sql
security definer
stable
set search_path = public
as $$
  select
    la.award_type,
    la.tier,
    la.rank,
    la.competitor_id,
    coalesce(g.name, la.competitor_id) as competitor_name,
    la.user_id,
    pr.display_name,
    la.metric_value
  from public.league_awards la
  left join public.groups g on la.competitor_id = g.id
  left join public.profiles pr on la.user_id = pr.id
  where la.league_id = p_league_id
  order by la.award_type desc, la.rank;  -- 'team' before 'student'
$$;
revoke all on function public.get_league_awards(text) from public;
revoke execute on function public.get_league_awards(text) from anon;
grant execute on function public.get_league_awards(text) to authenticated;
comment on function public.get_league_awards(text) is
  'Returns a league''s team podium + student winners with names (leaderboard projection). SECURITY DEFINER crosses profiles RLS for cross-group winner names. EXECUTE revoked from anon.';
```

- [ ] **Step 2: Apply via the Supabase MCP**

Use `apply_migration` (name `league_awards_get_awards`) with the appended SQL block (just the `get_league_awards` function + grants).
Expected: success.

- [ ] **Step 3: Probe**

Use `execute_sql`:

```sql
select count(*) from public.get_league_awards('nonexistent');
```

Expected: `0`, no error.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/migrations/2026-06-28-league-awards-rpcs.sql
git commit -m "feat(db): add get_league_awards RPC for the hall of fame"
```

---

## Task 5: DB — 데모 리그 + 참가자 + 균형 시드 + 확정

명확한 금·은·동이 나오는 데모 리그를 만들고 확정한다. **윈도우를 2026-05로 두어** `it@naver.com`의 6/27 +1,000,000 톱업과 6월 게스트 시드가 채점에서 제외되게 한다. 로그인 사용자(it1, student-services)가 **gold 팀 + 학생 1위**가 되도록 배분한다.

**Files:**
- Create: `docs/superpowers/migrations/2026-06-28-league-awards-demo-seed.sql`

- [ ] **Step 1: Confirm current group memberships (sanity)**

Use `execute_sql`:

```sql
select group_id, count(*) from public.profiles group by group_id order by group_id;
```

Expected (per the seeded guests + it1): `engineering` 6, `humanities` 5, `student-services` 5 (it1 + 게스트12~15). If counts differ, adjust the per-group seed sums below so the intended podium (avg: student-services > humanities > engineering) still holds; record any adjustment in the SQL file comment.

- [ ] **Step 2: Write the demo seed SQL file**

Create `docs/superpowers/migrations/2026-06-28-league-awards-demo-seed.sql`:

```sql
-- Demo league for the awards system (applied to zvuqmagfpdyrrzyjntue, 2026-06-28).
-- Window = 2026-05 so the June +1,000,000 manual top-up (it@naver.com) and the
-- June guest contribution seed are OUTSIDE the scoring window and do not distort
-- the per-capita average. Balanced May points produce a clean podium with
-- student-services #1 (gold) and it1 the #1 student, so the logged-in demo
-- account sees its building lit gold, its top-student badge, and (Plan B) the
-- gold emblem. Idempotent: fixed league id + ON CONFLICT on point_events.

insert into public.leagues
  (id, name, scope, school_id, starts_at, ends_at, status, badge_winner_count)
values (
  'yu-college-2026-05',
  '영남대 단과대 에너지 절감 리그',
  'group', 'yeungnam',
  '2026-05-01T00:00:00+09:00', '2026-06-01T00:00:00+09:00',
  'upcoming', 3
)
on conflict (id) do update set
  name = excluded.name, scope = excluded.scope, school_id = excluded.school_id,
  starts_at = excluded.starts_at, ends_at = excluded.ends_at,
  badge_winner_count = excluded.badge_winner_count;

insert into public.league_participants (league_id, competitor_kind, competitor_id)
values
  ('yu-college-2026-05', 'group', 'engineering'),
  ('yu-college-2026-05', 'group', 'humanities'),
  ('yu-college-2026-05', 'group', 'student-services')
on conflict do nothing;

-- Balanced May points (reason 'seed:league-demo', period_label '2026-05',
-- created_at mid-May so they land in the window). Per-capita target:
--   student-services 6000/5 = 1200 (gold), it1 top (1600)
--   humanities       5500/5 = 1100 (silver)
--   engineering      6000/6 = 1000 (bronze)
-- Members are resolved by group; guests use their fixed seed UUIDs
-- (a0000000-0000-4000-8000-0000000000NN) and it1 by its real id.
insert into public.point_events (user_id, points, reason, period_label, created_at)
select v.user_id, v.points, 'seed:league-demo', '2026-05', '2026-05-15T12:00:00+09:00'
from (
  -- student-services: it1 + 게스트12~15
  select (select id from public.profiles where group_id = 'student-services'
            and id <> 'a0000000-0000-4000-8000-000000000012'::uuid
            and id <> 'a0000000-0000-4000-8000-000000000013'::uuid
            and id <> 'a0000000-0000-4000-8000-000000000014'::uuid
            and id <> 'a0000000-0000-4000-8000-000000000015'::uuid
          limit 1) as user_id, 1600 as points
  union all select 'a0000000-0000-4000-8000-000000000012'::uuid, 1300
  union all select 'a0000000-0000-4000-8000-000000000013'::uuid, 1100
  union all select 'a0000000-0000-4000-8000-000000000014'::uuid, 1000
  union all select 'a0000000-0000-4000-8000-000000000015'::uuid, 1000
  -- humanities: 게스트7~11
  union all select 'a0000000-0000-4000-8000-000000000007'::uuid, 1300
  union all select 'a0000000-0000-4000-8000-000000000008'::uuid, 1200
  union all select 'a0000000-0000-4000-8000-000000000009'::uuid, 1100
  union all select 'a0000000-0000-4000-8000-000000000010'::uuid, 1000
  union all select 'a0000000-0000-4000-8000-000000000011'::uuid, 900
  -- engineering: 게스트1~6
  union all select 'a0000000-0000-4000-8000-000000000001'::uuid, 1200
  union all select 'a0000000-0000-4000-8000-000000000002'::uuid, 1100
  union all select 'a0000000-0000-4000-8000-000000000003'::uuid, 1050
  union all select 'a0000000-0000-4000-8000-000000000004'::uuid, 950
  union all select 'a0000000-0000-4000-8000-000000000005'::uuid, 900
  union all select 'a0000000-0000-4000-8000-000000000006'::uuid, 800
) v
where v.user_id is not null
on conflict (user_id, reason, period_label) do nothing;
```

> NOTE: the `it1` resolution selects the one `student-services` profile that is not a seeded guest UUID. If a different real account joins `student-services` later this could match the wrong row — for this controlled demo DB, `it@naver.com` is the only non-guest student-services member (verified in Step 1). If Step 1 shows otherwise, replace the subquery with `it@naver.com`'s explicit UUID (look it up via `select id from auth.users where email='it@naver.com'`) and note it in the file.

- [ ] **Step 3: Apply the seed via the Supabase MCP**

Run the SQL with `execute_sql`. Re-running is a no-op (idempotent).
Expected: success.

- [ ] **Step 4: Verify standings, then finalize, then verify awards**

Use `execute_sql` (standings preview):

```sql
select rank, competitor_id, member_count, total_points, avg_points
from public.get_league_standings('yu-college-2026-05') order by rank;
```

Expected: rank1 `student-services` avg 1200, rank2 `humanities` avg 1100, rank3 `engineering` avg 1000.

Then finalize (operator call via MCP):

```sql
select public.finalize_league('yu-college-2026-05') as awards_written;
```

Expected: `6` (3 team + 3 student).

Then verify awards:

```sql
select award_type, tier, rank, competitor_id, display_name
from public.get_league_awards('yu-college-2026-05')
order by award_type desc, rank;
```

Expected:
- team gold rank1 `student-services`, team silver rank2 `humanities`, team bronze rank3 `engineering`.
- student gold rank1 = it1's display name, rank2 = 게스트 12, rank3 = 게스트 13.
- `select status from public.leagues where id='yu-college-2026-05';` → `finalized`.

- [ ] **Step 5: Commit the recorded SQL**

```bash
git add docs/superpowers/migrations/2026-06-28-league-awards-demo-seed.sql
git commit -m "feat(db): seed and finalize the 2026-05 demo college league"
```

---

## Task 6: DAL — leagues 데이터 접근 계층

RPC 2개(standings/awards) + 테이블 읽기 3개(finalized leagues / my awards / subject tiers). 서버 전용. shaping은 Task 1에서 이미 단위 테스트됨 → 여기선 타입체크/빌드/런타임 프로브로 검증.

**Files:**
- Create: `src/features/leagues/data/leagues-dal.ts`

- [ ] **Step 1: Write the DAL**

Create `src/features/leagues/data/leagues-dal.ts`:

```ts
import "server-only";
import { createServerSupabaseClient } from "@/features/account/supabase/server";
import {
  groupLeagueAwards,
  shapeStandings,
} from "../domain/standings";
import type {
  AwardTier,
  FinalizedLeague,
  LeagueAwardRow,
  LeagueAwards,
  LeagueStanding,
  LeagueStandingRow,
  MyLeagueAward,
  SubjectAwardTiers,
} from "../domain/types";

function asTier(value: string): AwardTier {
  return value === "silver" || value === "bronze" ? value : "gold";
}

export async function getLeagueStandings(
  leagueId: string,
): Promise<LeagueStanding[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_league_standings", {
    p_league_id: leagueId,
  });
  if (error) {
    throw new Error(`Failed to load league standings: ${error.message}`);
  }
  return shapeStandings((data ?? []) as LeagueStandingRow[]);
}

export async function getLeagueAwards(leagueId: string): Promise<LeagueAwards> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_league_awards", {
    p_league_id: leagueId,
  });
  if (error) {
    throw new Error(`Failed to load league awards: ${error.message}`);
  }
  return groupLeagueAwards((data ?? []) as LeagueAwardRow[]);
}

export async function getFinalizedLeagues(): Promise<FinalizedLeague[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("leagues")
    .select("id, name, starts_at, ends_at")
    .eq("status", "finalized")
    .order("ends_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to load finalized leagues: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
  }));
}

export async function getMyLeagueAwards(
  userId: string,
): Promise<MyLeagueAward[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("league_awards")
    .select("league_id, tier, rank, leagues!inner(name, ends_at)")
    .eq("award_type", "student")
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Failed to load my league awards: ${error.message}`);
  }
  return (data ?? [])
    .map((row) => {
      const league = row.leagues as unknown as { name: string; ends_at: string };
      return {
        leagueId: row.league_id as string,
        leagueName: league?.name ?? (row.league_id as string),
        tier: asTier(row.tier as string),
        rank: row.rank as number,
        endsAt: league?.ends_at ?? "",
      };
    })
    .sort((a, b) => (a.endsAt < b.endsAt ? 1 : a.endsAt > b.endsAt ? -1 : 0))
    .map(({ endsAt: _endsAt, ...rest }) => rest);
}

export async function getSubjectAwardTiers(): Promise<SubjectAwardTiers> {
  const supabase = await createServerSupabaseClient();

  const { data: leagueRows, error: leagueError } = await supabase
    .from("leagues")
    .select("id, name")
    .eq("status", "finalized")
    .order("ends_at", { ascending: false })
    .limit(1);
  if (leagueError) {
    throw new Error(`Failed to load latest league: ${leagueError.message}`);
  }
  const latest = (leagueRows ?? [])[0] as
    | { id: string; name: string }
    | undefined;
  if (!latest) return {};

  const { data: awardRows, error: awardError } = await supabase
    .from("league_awards")
    .select("tier, competitor_id")
    .eq("league_id", latest.id)
    .eq("award_type", "team");
  if (awardError) {
    throw new Error(`Failed to load league team awards: ${awardError.message}`);
  }

  const { data: subjectRows, error: subjectError } = await supabase
    .from("estate_subjects")
    .select("subject_id, owner_group_id");
  if (subjectError) {
    throw new Error(`Failed to load estate subjects: ${subjectError.message}`);
  }

  const tierByGroup = new Map<string, AwardTier>();
  for (const row of awardRows ?? []) {
    if (row.competitor_id) {
      tierByGroup.set(row.competitor_id as string, asTier(row.tier as string));
    }
  }

  const result: SubjectAwardTiers = {};
  for (const row of subjectRows ?? []) {
    const tier = tierByGroup.get(row.owner_group_id as string);
    if (tier) {
      result[row.subject_id as string] = {
        tier,
        leagueId: latest.id,
        leagueName: latest.name,
      };
    }
  }
  return result;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. (RPC names are strings; `.from("leagues")`/`.from("league_awards")` are not in the generated Supabase types, so the rows are loosely typed and cast explicitly — matches how `account-dal.ts` casts `point_events`/`estate_subjects` rows.)

- [ ] **Step 3: Runtime probe (optional but recommended)**

With `it@naver.com` logged in (dev), add a temporary server log or hit a scratch route that calls `getLeagueAwards('yu-college-2026-05')` and `getSubjectAwardTiers()`; confirm awards group into `{teams:3, students:3}` and `getSubjectAwardTiers()` returns `{ "yu-b04": {tier:"gold"...}, "yu-c02": {tier:"silver"...}, "yu-e21..e24": {tier:"bronze"...} }`. Remove the scratch code before committing. (The shaping is already unit-tested in Task 1; this just confirms the live wiring.)

- [ ] **Step 4: Commit**

```bash
git add src/features/leagues/data/leagues-dal.ts
git commit -m "feat(leagues): add leagues data access layer (standings/awards/tiers)"
```

---

## Task 7: i18n — `hallOfFame` 문자열 (ko/en)

**Files:**
- Modify: `src/i18n/messages/ko.ts`
- Modify: `src/i18n/messages/en.ts`

- [ ] **Step 1: Add the Korean block**

In `src/i18n/messages/ko.ts`, add a new top-level entry to the `koMessages` object (e.g., immediately after the `mapView: { … }` block's closing `},`):

```ts
  hallOfFame: {
    title: "명예의 전당",
    subtitle: "리그 수상 기록",
    empty: "아직 확정된 리그가 없어요",
    emptyHint: "리그가 종료되면 수상 팀과 우수 학생이 여기 표시됩니다",
    teamSectionTitle: "수상 팀",
    studentSectionTitle: "우수 학생",
    tierGold: "금상",
    tierSilver: "은상",
    tierBronze: "동상",
    rankUnit: "위",
    avgPointsLabel: "1인당 평균 {points}P",
    periodFormat: "{start} – {end}",
    back: "지도로",
  },
```

Also add a map-control label for the hall-of-fame entry. Inside the existing `mapView.controls` object (where `myOrg`/`profile` live), add:

```ts
      hallOfFame: "명예의 전당",
```

And a `/me` link label — inside the existing `me` object, add:

```ts
    hallOfFameLink: "명예의 전당",
```

- [ ] **Step 2: Add the matching English block**

In `src/i18n/messages/en.ts`, add the parallel entries:

```ts
  hallOfFame: {
    title: "Hall of Fame",
    subtitle: "League award records",
    empty: "No finalized leagues yet",
    emptyHint: "Award-winning teams and top students appear here once a league ends",
    teamSectionTitle: "Winning teams",
    studentSectionTitle: "Top students",
    tierGold: "Gold",
    tierSilver: "Silver",
    tierBronze: "Bronze",
    rankUnit: "",
    avgPointsLabel: "{points}P avg / member",
    periodFormat: "{start} – {end}",
    back: "To map",
  },
```

`mapView.controls`:

```ts
      hallOfFame: "Hall of Fame",
```

`me`:

```ts
    hallOfFameLink: "Hall of Fame",
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (the `Messages` type now includes `hallOfFame.*`, `mapView.controls.hallOfFame`, `me.hallOfFameLink`). Do not introduce new errors in `ko.ts`/`en.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/messages/ko.ts src/i18n/messages/en.ts
git commit -m "feat(i18n): add hall of fame strings (ko/en)"
```

---

## Task 8: 컴포넌트 — AwardPodium + LeagueHallSection

Presentational(데이터 패칭 없음). 디자인 토큰(`text-ink`, `text-ink-subtle`, `bg-surface`, `bg-surface-3`, `border-line`)과 티어 색은 컴포넌트 내 상수로 둔다. `formatNumber(locale, value)`(`@/i18n/format`)·`interpolate`(`@/i18n/interpolate`) 사용.

**Files:**
- Create: `src/features/leagues/components/award-podium.tsx`
- Create: `src/features/leagues/components/league-hall-section.tsx`
- Test: `src/features/leagues/__tests__/award-podium.test.tsx`
- Test: `src/features/leagues/__tests__/league-hall-section.test.tsx`

- [ ] **Step 1: Write the failing test (AwardPodium)**

Create `src/features/leagues/__tests__/award-podium.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AwardPodium } from "../components/award-podium";
import type { TeamAward } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      hallOfFame: {
        tierGold: "금상",
        tierSilver: "은상",
        tierBronze: "동상",
        rankUnit: "위",
        avgPointsLabel: "1인당 평균 {points}P",
        teamSectionTitle: "수상 팀",
      },
    },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const teams: TeamAward[] = [
  { tier: "gold", rank: 1, competitorId: "student-services", competitorName: "학생지원팀", metricValue: 1200 },
  { tier: "silver", rank: 2, competitorId: "humanities", competitorName: "인문대학", metricValue: 1100 },
  { tier: "bronze", rank: 3, competitorId: "engineering", competitorName: "공과대학", metricValue: 1000 },
];

describe("AwardPodium", () => {
  afterEach(() => document.body.replaceChildren());

  it("renders all podium teams with names and per-capita average", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => root.render(<AwardPodium teams={teams} />));

    const text = container.textContent ?? "";
    expect(text).toContain("학생지원팀");
    expect(text).toContain("인문대학");
    expect(text).toContain("공과대학");
    expect(text).toContain("1,200");
    expect(container.querySelectorAll("li")).toHaveLength(3);

    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/leagues/__tests__/award-podium.test.tsx`
Expected: FAIL — cannot find module `../components/award-podium`.

- [ ] **Step 3: Write AwardPodium**

Create `src/features/leagues/components/award-podium.tsx`:

```tsx
"use client";

import { Medal } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { AwardTier, TeamAward } from "../domain/types";

const TIER_STYLE: Record<AwardTier, { ring: string; text: string }> = {
  gold: { ring: "border-[#f5c518] bg-[#fdf3cf]", text: "text-[#a07a00]" },
  silver: { ring: "border-[#c3cad3] bg-[#eef1f4]", text: "text-[#5b6470]" },
  bronze: { ring: "border-[#cd7f32] bg-[#f4e3d3]", text: "text-[#8a5320]" },
};

export function AwardPodium({ teams }: { teams: TeamAward[] }) {
  const { locale, messages } = useI18n();
  const copy = messages.hallOfFame;
  const tierLabel: Record<AwardTier, string> = {
    gold: copy.tierGold,
    silver: copy.tierSilver,
    bronze: copy.tierBronze,
  };

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink">
        {copy.teamSectionTitle}
      </h3>
      <ol className="flex flex-col gap-2">
        {teams.map((team) => {
          const style = TIER_STYLE[team.tier];
          return (
            <li
              key={team.competitorId}
              className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${style.ring}`}
            >
              <span
                className={`grid h-9 w-9 flex-none place-items-center rounded-full bg-surface ${style.text}`}
              >
                <Medal className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-bold text-ink">
                  {team.competitorName}
                </span>
                <span className={`text-[11px] font-semibold ${style.text}`}>
                  {tierLabel[team.tier]} · {team.rank}
                  {copy.rankUnit}
                </span>
              </span>
              {team.metricValue !== null ? (
                <span className="flex-none text-[11px] text-ink-subtle">
                  {interpolate(copy.avgPointsLabel, {
                    points: formatNumber(locale, Math.round(team.metricValue)),
                  })}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
```

- [ ] **Step 4: Run AwardPodium test (pass)**

Run: `npx vitest run src/features/leagues/__tests__/award-podium.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Write the failing test (LeagueHallSection)**

Create `src/features/leagues/__tests__/league-hall-section.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeagueHallSection } from "../components/league-hall-section";
import type { FinalizedLeague, LeagueAwards } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      hallOfFame: {
        tierGold: "금상", tierSilver: "은상", tierBronze: "동상",
        rankUnit: "위", avgPointsLabel: "1인당 평균 {points}P",
        teamSectionTitle: "수상 팀", studentSectionTitle: "우수 학생",
        periodFormat: "{start} – {end}",
      },
    },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const league: FinalizedLeague = {
  id: "yu-college-2026-05",
  name: "영남대 단과대 에너지 절감 리그",
  startsAt: "2026-05-01T00:00:00+09:00",
  endsAt: "2026-06-01T00:00:00+09:00",
};

const awards: LeagueAwards = {
  teams: [
    { tier: "gold", rank: 1, competitorId: "student-services", competitorName: "학생지원팀", metricValue: 1200 },
  ],
  students: [
    { tier: "gold", rank: 1, userId: "it1", displayName: "it1", metricValue: 1600 },
    { tier: "gold", rank: 2, userId: "g12", displayName: "게스트 12", metricValue: 1300 },
  ],
};

describe("LeagueHallSection", () => {
  afterEach(() => document.body.replaceChildren());

  it("renders the league name, podium, and student winners", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(<LeagueHallSection league={league} awards={awards} />),
    );

    const text = container.textContent ?? "";
    expect(text).toContain("영남대 단과대 에너지 절감 리그");
    expect(text).toContain("학생지원팀"); // team podium
    expect(text).toContain("it1"); // student winner
    expect(text).toContain("게스트 12");

    await act(async () => root.unmount());
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/features/leagues/__tests__/league-hall-section.test.tsx`
Expected: FAIL — cannot find module `../components/league-hall-section`.

- [ ] **Step 7: Write LeagueHallSection**

Create `src/features/leagues/components/league-hall-section.tsx`:

```tsx
"use client";

import { useI18n } from "@/i18n/client";
import { interpolate } from "@/i18n/interpolate";
import type { FinalizedLeague, LeagueAwards } from "../domain/types";
import { AwardPodium } from "./award-podium";

function shortDate(locale: string, iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
  }).format(date);
}

export function LeagueHallSection({
  league,
  awards,
}: {
  league: FinalizedLeague;
  awards: LeagueAwards;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.hallOfFame;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <header className="mb-3">
        <h2 className="text-base font-bold text-ink">{league.name}</h2>
        <p className="text-xs text-ink-subtle">
          {interpolate(copy.periodFormat, {
            start: shortDate(locale, league.startsAt),
            end: shortDate(locale, league.endsAt),
          })}
        </p>
      </header>

      <AwardPodium teams={awards.teams} />

      {awards.students.length > 0 ? (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-ink">
            {copy.studentSectionTitle}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {awards.students.map((student) => (
              <li
                key={student.userId}
                className="flex items-center gap-1.5 rounded-full border border-[#f5c518] bg-[#fdf3cf] px-2.5 py-1"
              >
                <span className="text-[11px] font-bold text-[#a07a00]">
                  {student.rank}
                  {copy.rankUnit}
                </span>
                <span className="text-xs font-semibold text-ink">
                  {student.displayName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 8: Run LeagueHallSection test (pass)**

Run: `npx vitest run src/features/leagues/__tests__/league-hall-section.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 9: Commit**

```bash
git add src/features/leagues/components/award-podium.tsx src/features/leagues/components/league-hall-section.tsx src/features/leagues/__tests__/award-podium.test.tsx src/features/leagues/__tests__/league-hall-section.test.tsx
git commit -m "feat(leagues): add award podium and league hall section components"
```

---

## Task 9: 라우트 — `/[locale]/hall-of-fame` (서버 컴포넌트)

확정 리그 목록을 받아 각 리그의 수상을 병렬로 로드해 섹션을 렌더. 인증 게이트는 기존 `/me` 패턴과 동일.

**Files:**
- Create: `src/app/[locale]/hall-of-fame/page.tsx`

- [ ] **Step 1: Read the relevant Next.js 16 docs (per AGENTS.md)**

Skim `node_modules/next/dist/docs/` for the App Router server-component data fetching / metadata page (the same pattern `me/page.tsx` uses). Confirm `Promise.all` server fetch + `params: Promise<…>` is current.

- [ ] **Step 2: Write the page**

Create `src/app/[locale]/hall-of-fame/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { LeagueHallSection } from "@/features/leagues/components/league-hall-section";
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/account/data/account-dal";
import {
  getFinalizedLeagues,
  getLeagueAwards,
} from "@/features/leagues/data/leagues-dal";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import styles from "@/features/account/components/profile-surface.module.css";

type HallOfFameProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: HallOfFameProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);
  return { title: messages.hallOfFame.title };
}

export default async function HallOfFamePage({ params }: HallOfFameProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/hall-of-fame`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const [messages, leagues] = await Promise.all([
    getMessages(locale),
    getFinalizedLeagues(),
  ]);

  const sections = await Promise.all(
    leagues.map(async (league) => ({
      league,
      awards: await getLeagueAwards(league.id),
    })),
  );

  const copy = messages.hallOfFame;

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className={styles.surface}>
        <div className={styles.sheet}>
          <header className="flex items-center justify-between gap-3 px-1">
            <div>
              <h1 className="text-lg font-bold text-ink">{copy.title}</h1>
              <p className="text-xs text-ink-subtle">{copy.subtitle}</p>
            </div>
            <Link
              href={`/${locale}`}
              className="flex flex-none items-center gap-1 rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-subtle transition hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.back}
            </Link>
          </header>

          {sections.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-12 text-center">
              <p className="text-sm font-semibold text-ink">{copy.empty}</p>
              <p className="text-xs text-ink-subtle">{copy.emptyHint}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {sections.map(({ league, awards }) => (
                <LeagueHallSection
                  key={league.id}
                  league={league}
                  awards={awards}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </CampusEnergyProviders>
  );
}
```

> NOTE: `profile-surface.module.css` provides the warm "잔디 정원" `.surface`/`.sheet` wrappers already used by `/me`. Reusing it keeps the hall of fame visually consistent with the profile and scopes the palette locally (it overrides `--color-*` tokens only under `.surface`).

- [ ] **Step 3: Type-check + build the route**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npm run build`
Expected: build succeeds; route `/[locale]/hall-of-fame` appears (Dynamic, like other auth-gated routes).

- [ ] **Step 4: HTTP smoke (logged out → redirect)**

With the dev server running, request `/ko/hall-of-fame` while logged out.
Expected: 307 → `/ko/login?next=/ko/hall-of-fame`.

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/hall-of-fame/page.tsx
git commit -m "feat(hall-of-fame): add the hall of fame route"
```

---

## Task 10: 진입점 — `/me`와 지도 레일에서 명예의 전당 링크

**Files:**
- Modify: `src/app/[locale]/me/page.tsx`
- Modify: `src/features/campus-energy/components/map-controls.tsx`
- Modify: `src/features/campus-energy/components/admin-map-view.tsx`

- [ ] **Step 1: Add a `/me` link**

In `src/app/[locale]/me/page.tsx`, import `Link` and add a hall-of-fame link in the sheet. At the top imports add:

```tsx
import Link from "next/link";
import { Trophy } from "lucide-react";
```

Then, inside the `<div className={styles.sheet}>` immediately after `<AchievementHighlights … />`, add:

```tsx
          <Link
            href={`/${locale}/hall-of-fame`}
            className="mx-4 flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-3"
          >
            <span className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#a07a00]" aria-hidden="true" />
              {messages.hallOfFame.title}
            </span>
            <span className="text-ink-subtle">→</span>
          </Link>
```

(`messages` and `locale` are already in scope in this server component.)

- [ ] **Step 2: Add a control-rail entry**

First inspect `src/features/campus-energy/components/map-controls.tsx` to match its existing prop/button shape (it already takes `onGoToMyOrg`, `profileHref`, `onToggleLabels`, `onOpenSettings`). Add an optional `hallOfFameHref?: string` prop and, when present, render a `lucide-react` `Trophy` icon button (mirroring the existing `profileHref` link button) with `aria-label={messages.mapView.controls.hallOfFame}` (the component already uses `useI18n`).

```tsx
// in the props type:
  hallOfFameHref?: string;
// in the destructure:
  hallOfFameHref,
// in the rail, next to the profile link button (follow the existing markup):
  {hallOfFameHref ? (
    <Link
      href={hallOfFameHref}
      aria-label={messages.mapView.controls.hallOfFame}
      className={/* reuse the same className the profile link button uses */ ""}
    >
      <Trophy className="h-5 w-5" aria-hidden="true" />
    </Link>
  ) : null}
```

(Use the exact wrapper/button classes already present in `map-controls.tsx` for visual consistency; import `Trophy` from `lucide-react` and `Link` from `next/link` if not already imported.)

- [ ] **Step 3: Pass the href from `AdminMapView`**

In `src/features/campus-energy/components/admin-map-view.tsx`, the `<MapControls … />` element (around lines 109–117) already passes `profileHref={`/${locale}/me`}`. Add the hall-of-fame href next to it:

```tsx
            hallOfFameHref={`/${locale}/hall-of-fame`}
```

- [ ] **Step 4: Type-check + lint**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npm run lint`
Expected: 0 errors (the 2 pre-existing `game-preview.tsx` warnings remain).

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/me/page.tsx src/features/campus-energy/components/map-controls.tsx src/features/campus-energy/components/admin-map-view.tsx
git commit -m "feat(hall-of-fame): link to the hall of fame from /me and the map rail"
```

---

## Task 11: 전체 검증 (Plan A)

**Files:** none (검증만).

- [ ] **Step 1: Full Vitest**

Run: `npm run test`
Expected: all pass, including new `standings` (4), `award-podium` (1), `league-hall-section` (1). No pre-existing tests broken (domain tests use fixed inputs; the live seed doesn't affect them).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 errors; exactly the 2 pre-existing `game-preview.tsx` warnings.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success; `/[locale]/hall-of-fame` route present.

- [ ] **Step 4: Live smoke (recommended)**

With `it@naver.com` logged in, open `/ko/hall-of-fame`: one section "영남대 단과대 에너지 절감 리그" with podium 🥇 학생지원팀 / 🥈 인문대학 / 🥉 공과대학 and student winners (it1 first). From `/ko/me` and the map rail (Trophy icon), the link reaches the page.

- [ ] **Step 5: DB advisors final check**

Use Supabase MCP `get_advisors` (type `security`).
Expected: new SECURITY DEFINER functions (`get_league_standings`, `get_league_awards`) produce the same benign "executable by authenticated" WARN class as existing RPCs; `finalize_league` is not authenticated-executable. No ERROR-level findings.

- [ ] **Step 6: Final commit (if fixups were needed)**

```bash
git add -A
git commit -m "test: verify league awards core and hall of fame"
```

---

## Self-Review Notes (author)

- **Spec coverage (Plan A scope = P0 + P1):** 3 테이블 + RLS(Task 2), standings/finalize RPC(Task 3), get_league_awards RPC(Task 4), 데모 리그·시드·확정(Task 5), DAL(Task 6) = 코어. 명예의 전당 i18n/컴포넌트/라우트/링크(Task 7–10) = P1. 순위 지표(1인당 평균)·티어(금·은·동)·학생 top-N·운영자 전용 finalize·1M 톱업 윈도우 제외 모두 반영.
- **Type consistency:** `AwardTier`/`LeagueStanding`/`LeagueAwards`/`TeamAward`/`StudentAward`/`SubjectAwardTiers`는 `leagues/domain/types.ts`에 1회 정의, DAL·컴포넌트·(Plan B)에서 import. RPC 반환 컬럼(`get_league_standings`: competitor_kind/_id/_name/member_count/total_points/avg_points/rank, `get_league_awards`: award_type/tier/rank/competitor_id/competitor_name/user_id/display_name/metric_value)이 `LeagueStandingRow`/`LeagueAwardRow`와 정확히 일치. DAL 함수명(`getLeagueStandings`/`getLeagueAwards`/`getFinalizedLeagues`/`getMyLeagueAwards`/`getSubjectAwardTiers`)은 Plan B에서 동일하게 참조.
- **No placeholders:** 모든 코드 스텝에 실제 코드. SQL·테스트·컴포넌트 전부 완성. 데모 시드 값은 구체 정수로 고정(예시 아님).
- **Interfaces for Plan B:** `getSubjectAwardTiers`/`getMyLeagueAwards`/`SubjectAwardTiers`/`MyLeagueAward`/`AwardTier`가 이 Plan에서 만들어져 Plan B(P2 뱃지·P3 지도·P4 영지)가 소비한다.
- **Open follow-ups(범위 밖, 문서화):** 관리자 UI(리그 생성·확정 버튼) 없음(운영자 MCP); school scope 멤버 해석은 미구현(group만); 진행 중 리그 실시간 순위 보드 없음. → Plan B 및 후속.
