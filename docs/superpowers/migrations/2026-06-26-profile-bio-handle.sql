-- profiles: add editable handle (@id) + one-line bio.
-- Non-economic, non-affiliation columns. Existing immutable-affiliation
-- trigger still guards school_id/group_id; own-row updates already allowed.
alter table public.profiles
  add column if not exists handle text,
  add column if not exists bio text;

-- handle is optional but unique when present, lowercased a-z0-9_ 3..20.
create unique index if not exists profiles_handle_key
  on public.profiles (handle)
  where handle is not null;

alter table public.profiles
  add constraint profiles_handle_fmt
    check (handle is null or handle ~ '^[a-z0-9_]{3,20}$'),
  add constraint profiles_bio_len
    check (bio is null or char_length(bio) <= 80);
