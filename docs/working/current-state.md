# Current State - cems

**Last updated:** 2026-06-23

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
- The app builds without a Mapbox token. If `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is missing, the map area shows a configuration state instead of constructing a map.
- No real API, database, authentication, energy ingestion pipeline, ML pipeline, deployment configuration, or full RPG system has been implemented yet.
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
