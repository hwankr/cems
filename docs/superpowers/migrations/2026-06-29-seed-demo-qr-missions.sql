-- Operational demo seed for presentation QR stickers.
-- Applied manually to the live `cems` Supabase project when creating demo QR
-- cards. This is data-only; it does not add the future checkpoint sequence
-- schema.

insert into public.missions (code, points, category, active) values
  ('chem-2f-stairs', 50, 'stairs', true)
on conflict (code) do update
  set points = excluded.points,
      category = excluded.category,
      active = excluded.active;
