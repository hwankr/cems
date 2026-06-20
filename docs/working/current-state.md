# Current State - cems

**Last updated:** 2026-06-20

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

- The app is still a basic Next.js 16.2.9, React 19.2.4, TypeScript, Tailwind CSS v4 scaffold.
- `package.json` has `dev`, `build`, `start`, and `lint` scripts.
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, and `src/app/favicon.ico` are still close to the create-next-app baseline.
- No production UI, API, database, authentication, energy data pipeline, ML pipeline, or deployment configuration has been implemented yet.
- A previous Mapbox-only implementation plan was replaced by a broader campus energy platform MVP plan.

## Working Docs

Read these files at the start of the next session:

1. `docs/working/current-state.md` - current repo and product context
2. `docs/working/meeting-notes.md` - user-stated decisions and directions
3. `docs/product/campus-energy-platform.md` - current product framing
4. `docs/superpowers/plans/2026-06-20-campus-energy-platform-mvp.md` - current implementation plan

Before editing Next.js code, follow `AGENTS.md` and read the relevant local Next.js docs under `node_modules/next/dist/docs/`.

## Recording Rule

When the user asks to record or summarize the session, append only user-stated decisions, cancelled assumptions, and facts verified during work to `docs/working/meeting-notes.md`. Update this file only if the next session entry point changes. Commit and push only when the user explicitly asks.
