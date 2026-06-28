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
