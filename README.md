# cems

Campus Energy Management System MVP built with Next.js.

## Docs

Before starting work, read:

1. [docs/working/current-state.md](docs/working/current-state.md)
2. [docs/working/meeting-notes.md](docs/working/meeting-notes.md)
3. [docs/product/campus-energy-platform.md](docs/product/campus-energy-platform.md)

Before editing Next.js code, follow [AGENTS.md](AGENTS.md) and read the relevant local Next.js 16 docs under `node_modules/next/dist/docs/`.

## Campus Energy MVP

The MVP uses Yeungnam University as the first school and shows two surfaces:

- Admin mode: actual electricity usage versus forecast usage by building
- Participant mode: affiliation points and character progress from verified savings

For the map:

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` to a public Mapbox token that starts with `pk.`.
3. Restrict the token to local and deployed origins.

The app builds without the token and shows a configuration state for the map.

## Commands

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
```

## Verification

```powershell
npm run test
npm run lint
npm run build
git diff --check
```
