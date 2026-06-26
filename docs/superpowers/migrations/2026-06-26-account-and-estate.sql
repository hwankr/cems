-- Applied to Supabase project `cems` (ref zvuqmagfpdyrrzyjntue) on 2026-06-26
-- via apply_migration name `account_and_estate`.

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
