# Current State - cems

**Last updated:** 2026-06-26

## Current Context

The project direction is now a campus energy management and engagement platform.
The first concrete demo target is Yeungnam University, but Yeungnam should be treated as the first registered school and a scalable sample dataset, not as a product limit.

The core product idea is that energy saving should be measured against predicted electricity usage. The same saving result supports two product surfaces:

- an administrator dashboard for facility teams to find buildings or groups that use more electricity than forecast
- a user engagement experience where students, faculty, or other members register an affiliation, earn points from verified savings, and grow a character

The key abstraction is an **energy saving subject**. A subject can be a building, department, college, dormitory, school, region, or any other comparable group.

## Confirmed Product Direction

- Admin users need a map and dashboard that compares actual electricity usage with forecast electricity usage.
- A future prediction model, such as LightGBM, should produce expected usage baselines.
- User-facing competition exists because monitoring alone does not create energy saving behavior. The product should raise interest from the actual people who can influence energy use.
- Participants should register their school and affiliation.
- Savings against forecast should become points or another reward value.
- Points should support a character or RPG-style growth system.
- Admin and participant experiences should be separate UI surfaces but share the same energy comparison and scoring logic.

## Actual Repository State

- The repository now contains the first campus energy MVP, committed and pushed as `94560de Add campus energy MVP`.
- The stack is Next.js 16.2.9, React 19.2.4, TypeScript, Tailwind CSS v4, Mapbox GL JS, lucide-react, and Vitest.
- The app now uses locale-prefixed routes for the main MVP: `/ko` and `/en`.
- `src/proxy.ts` redirects locale-less requests to the saved `cems-locale` cookie when valid, or to Korean (`ko`) by default.
- The main localized route renders `CampusEnergyApp` from `src/app/[locale]/page.tsx` and passes locale messages into the client app.
- Korean is the default product language. English is also supported through `src/i18n/messages/`.
- `src/i18n/client.tsx` provides `I18nProvider` and `useI18n` for client components, and `src/features/campus-energy/components/language-switcher.tsx` writes the same locale cookie that a future settings screen should reuse.
- `src/features/campus-energy/domain/` contains shared energy comparison, scoring, ranking, and character progression logic.
- `src/features/campus-energy/data/demo-campus.ts` contains Yeungnam University demo school, building, group, participant, and mock energy readings.
- `src/features/campus-energy/data/localized-demo-campus.ts` maps the demo school, subjects, groups, and participant name into the active locale.
- Admin mode shows actual versus forecast usage, saved and overused kWh, building diagnosis ranking, selected building details, and a Mapbox-backed campus map.
- The admin campus map avoids visible app-level polygon floor fills and point circles. It uses Mapbox `dark-v11`, hides default Mapbox building layers, renders height-bearing polygon geometries as floor-count-based extrusions from official Yeungnam campus-map floor data, keeps lightweight status outlines and centered building-name labels, and only makes those extruded polygons clickable/focusable on the map.
- Yeungnam generated geometry now contains 121 mapped campus subjects: 73 polygon footprints and 48 official point fallbacks. 69 polygons have positive extrusion height and render as map click zones. 24 of the polygon footprints come from the offline local `campus-ems` reference file, while `fallback_square` reference entries remain excluded from 3D extrusion.
- Participant mode shows the demo user's affiliation, affiliation points, saved energy, rank, group leaderboard, and character progress.
- An estate ("영지 꾸미기") feature lives under `src/features/estate/`, reached from a building map popup's "Open estate" action at `/[locale]/subjects/[subjectId]/estate`. It is an isometric, HTML-canvas estate builder: players spend points earned from energy saved vs forecast to buy/place items, paint ground tiles, and unlock expansion parcels, with state persisted in localStorage. Domain logic, the isometric engine, i18n, and accessibility are covered by Vitest.
- As of 2026-06-25 the estate UI is a full-bleed "sunny garden": the canvas world fills the viewport with floating cream-glass chrome modeled on the campus map (desktop: right-docked builder console; mobile: a slim bottom dock that opens an on-demand ~46dvh sheet so the world stays visible). The estate's self-contained warm palette and the sheet height live in `src/features/estate/components/estate-shell.module.css`; the old brittle full-screen `estate-page.module.css` `.shell` was removed.
- The same day the estate was iterated twice more. A quality pass warmed the palette (sunny sky gradient + canvas sun glow, two-tone grass, faint internal cell seams), turned locked land into warm dashed "buildable plots" with an on-canvas honey "+price" badge on adjacent-unlockable parcels (clicking opens the existing expansion dialog), enriched the starter garden, and added isometric item thumbnails (grass-tile backed) plus honey price pills to the shop and inventory cards (`renderer.ts`, `estate-asset-manifest.ts`, `estate-game-client.tsx`, `estate-shell.module.css`, `demo-estate-data.ts`).
- The expansion catalog was then enlarged: the free initial `central-campus` parcel is now 16x16, surrounded by eight lockable 16x16 parcels (north/east/south/west edges + four corners) forming a 48x48 map centered on the core (x and y span -16..31). Edges unlock directly from the core; corners require an adjacent edge first. Costs run 3,000/4,000/6,000/8,000 (edges) and 12,000/15,000/18,000/22,000 (corners). On first load the camera zooms out ~28% so the surrounding locked ring is visible (the fit button still frames the unlocked area); `renderer.ts` culls off-screen parcels/cells for the larger map; the starter garden was re-spread symmetrically across the 16x16 core; parcel names exist for the 9 ids in `ko`/`en`.
- Estate verification: Vitest 87/87 (affected expansion/commands/renderer-scene/repository/placement tests updated, plus a new seed no-overlap guard), ESLint 0 errors, and `npm run build` pass. The estate canvas page cannot be screenshotted by the preview tool (it hangs on this full-bleed canvas route — pre-existing, environment-specific), so estate visuals are verified via tests, live DOM, and the build rather than a captured image.
- A design spec for the estate redesign lives at `docs/superpowers/specs/2026-06-25-estate-redesign-design.md`.
- The app builds without a Mapbox token. If `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is missing, the map area shows a configuration state instead of constructing a map.
- Authentication and a real database now exist (as of 2026-06-26), implemented on the **local, unpushed** branch `feat/affiliation-login-group-estate`. A dedicated free Supabase project `cems` (ref `zvuqmagfpdyrrzyjntue`, ap-northeast-2) holds tables `schools/groups/profiles/point_events/estates` with RLS + Yeungnam/3-group seed (migration `account_and_estate`; recorded at `docs/superpowers/migrations/2026-06-26-account-and-estate.sql`). `.env.local` (git-ignored) carries the Supabase URL + anon key. The plan is `docs/superpowers/plans/2026-06-26-affiliation-login-group-estate-economy.md`.
- The new `src/features/account/` feature adds Supabase clients (browser/server/proxy), email+password auth (server actions + login/signup pages), affiliation onboarding writing a `profiles` row, a personal `point_events` ledger with a "claim weekly saving reward" action, and a server DAL. `src/proxy.ts` now refreshes the Supabase session (async) before locale redirect. The home page and estate page are auth-gated (→ `/login`, then `/onboarding`). The participant dashboard shows real personal points + group pool + claim button, and the character grows from personal points.
- The estate is still keyed by `subjectId` ("building unit") but its snapshot is now server-shared via `SupabaseEstateRepository` (one `estates` row per building, `owner_group_id`), its purchase budget is the owning group's pooled points, and writes are RLS-gated to that group's members. Estate point math is unchanged — only the source of `earnedPoints` moved to the group pool.
- Setup caveat for live browser use: the Supabase project still has email confirmation ON, and the MCP cannot toggle it — disable "Confirm email" in the dashboard (Authentication → Email) for immediate post-signup login. GoTrue also rejects `*.test`/`example.com` signups.
- Known MVP limitation: estate spend is enforced client-side + RLS write-gating (no server-side spend re-validation; demo assumes one estate per group). No energy ingestion pipeline, ML pipeline, deployment configuration, or full RPG system yet.
- Verification (2026-06-26): Vitest 213/213, ESLint 0 errors (2 pre-existing `game-preview.tsx` warnings), `npm run build` passes, Supabase security advisors clean; HTTP auth-gate checks and a 10/10 RLS script (test data removed afterward) all passed. The branch is not pushed.
- `.env.example` intentionally leaves `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` blank so example files do not look like real Mapbox tokens.

## Working Docs

Read these files at the start of the next session:

1. `docs/working/current-state.md` - current repo and product context
2. `docs/working/meeting-notes.md` - user-stated decisions and directions
3. `docs/README.md` - docs map and maintenance rules

After that, use the docs map to open:

- `docs/product/campus-energy-platform.md` - current product framing
- `docs/technical/campus-energy-mvp.md` - implemented MVP structure and verification notes

`docs/superpowers/plans/2026-06-20-campus-energy-platform-mvp.md` is a completed execution plan, not the current backlog.
`docs/superpowers/plans/2026-06-21-korean-first-i18n.md` records the Korean-first i18n implementation plan.
`docs/superpowers/plans/2026-06-23-mapbox-building-click-focus.md` records the markerless Mapbox building click-focus implementation plan.
`docs/superpowers/plans/2026-06-23-mapbox-campus-ems-geometry-parity.md` records the local `campus-ems` geometry parity implementation plan.

Before editing Next.js code, follow `AGENTS.md` and read the relevant local Next.js docs under `node_modules/next/dist/docs/`.

## Recording Rule

When the user asks to record or summarize the session, append only user-stated decisions, cancelled assumptions, and facts verified during work to `docs/working/meeting-notes.md`. Update this file only if the next session entry point changes. Commit and push only when the user explicitly asks.
