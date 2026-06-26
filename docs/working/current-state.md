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
- Economic mutations are now **server-authoritative** (after the Codex review hardening): direct client writes to `point_events`/`estates` are blocked, and all changes go through SECURITY DEFINER RPCs — `claim_period_reward()` (authoritative amount from `group_period_rewards`), `save_estate()` (authoritative owner via `estate_subjects`, rejects positive deltas and spend beyond the group pool, optimistic concurrency via `estates.version`), plus an immutable-affiliation trigger on `profiles`. The group pool reads correctly across members via the `current_group_id()` SECURITY DEFINER helper + same-group profiles policy.
- Remaining MVP limitation (documented): `save_estate()` caps net spend ≤ pool and blocks self-credit, but does not fully validate per-item cost legality, so a client could still write its own group's estate snapshot with unpaid items (a within-own-group cosmetic cheat — not a points-economy or cross-group breach). Full validation would require porting the item/parcel cost catalog into the DB. No energy ingestion pipeline, ML pipeline, deployment configuration, or full RPG system yet.
- Verification (2026-06-26): Vitest 214/214, ESLint 0 errors (2 pre-existing `game-preview.tsx` warnings), `npm run build` passes; a 14/14 server-authoritative DB script + the group-pool/isolation checks all passed (test data removed afterward). Remaining Supabase advisors are benign (3 SECURITY DEFINER RPCs executable by `authenticated` — intended entry points — and the pre-existing leaked-password-protection toggle). The branch is not pushed.
- `.env.example` intentionally leaves `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` blank so example files do not look like real Mapbox tokens.
- A personal page + QR mission + goals slice was implemented (2026-06-26), **merged to `main` (`dd5b403`) and deployed to Vercel** (`https://cems-kappa.vercel.app`). New `src/features/missions/` feature plus a dedicated `/[locale]/me` page (profile/character header, daily/weekly goals with progress + claim, point-event history, estate-contribution card) and a `/[locale]/scan/[code]` QR landing (deep-link: phone camera opens the route; logged-in user taps "미션 인증"). The main map (`AdminMapView`) gained a profile chip linking to `/me`; the group estate page shows a personal contribution chip; the participant dashboard links to `/me`; login now honors a validated `?next=` return path.
- DB: migration `missions_and_goals` (recorded at `docs/superpowers/migrations/2026-06-26-missions-and-goals.sql`) added tables `missions`/`mission_completions`/`goals` (+ RLS, seeds: 5 missions, 3 goals) and SECURITY DEFINER RPCs `complete_mission()` (1 award per mission per day, Asia/Seoul), `claim_goal_reward()` (server recomputes eligibility from `mission_completions`, idempotent), and read-only `get_my_goal_progress()` (single source of truth for today/week counts + labels). QR/goal points are plain `point_events` rows, so one insert updates personal points, character, group pool, and estate budget together; no new economy axis. Direct writes stay RLS-blocked.
- Documented limitations for this slice: static QR (no signing/rotation, no geofencing — anyone with the URL can check in), and no admin QR-issuing UI (missions are seeded). Spec: `docs/superpowers/specs/2026-06-26-personal-page-qr-goals-design.md`; plan: `docs/superpowers/plans/2026-06-26-personal-page-qr-goals.md`.
- Verification (2026-06-26, personal-page slice): Vitest 227/227 (13 new: goals/point-reason/safe-redirect), ESLint 0 errors (same 2 pre-existing `game-preview.tsx` warnings), `npm run build` passes (routes `/[locale]/me` and `/[locale]/scan/[code]` present). A DB RPC probe (self-rolling-back, 10 asserts: completed/already/invalid, daily-3 claim, weekly-10 not-met, point sums) passed; no residue, seeds intact, real account `it@naver.com` preserved. Supabase security advisors are the expected benign WARNs (the 3 new SECURITY DEFINER RPCs are authoritative entry points executable by `authenticated`, like `claim_period_reward`/`save_estate`; plus the pre-existing leaked-password toggle). HTTP: `/ko/me` and `/ko/scan/stairs` → `/ko/login?next=…` when logged out, `/ko/login?next=…` 200. Merged to `main` and pushed; Vercel auto-deploy is live. Production E2E with the real test account `it@naver.com` confirmed the full loop on the live DB: login OK, `complete_mission('stairs')`→`completed` (+50), `get_my_goal_progress`→today/week=1, `claim_goal_reward('daily-1')`→`claimed` (+20, server-verified), `claim_goal_reward('daily-3')`→`not-met`; personal total 70 (that test account now holds 70 demo points). A demo QR for the `stairs` mission lives at `docs/demo/qr-it-2f-stairs.{svg,html}` encoding `https://cems-kappa.vercel.app/ko/scan/stairs`.
- Demo re-test helper (2026-06-26): a server-authoritative `cancel_mission(p_code)` RPC (migration `cancel_mission_demo`, recorded at `docs/superpowers/migrations/2026-06-26-cancel-mission.sql`) deletes the caller's own check-in for today (the `mission_completions` row + the matching `qr:<code>` `point_event`) so a mission can be re-scanned the same day. Not an economy hole: cancelling removes the points it added, so the per-mission daily cap still holds. A "테스트: 인증 취소" button on the `/scan/[code]` result calls it via `cancelMissionAction` and reloads to a fresh confirm form. Verified on production with the test account (cancel → today 1→0, points −50 → re-scan `completed`). Cancel undoes the QR check-in only, not goal-bonus claims; the button is labelled as a test affordance and can be hidden behind a flag for production.

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
