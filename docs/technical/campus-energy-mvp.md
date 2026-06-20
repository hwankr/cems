# Campus Energy MVP Technical Notes

This document records the current implemented MVP. It is not a future architecture plan.

## Current Implementation

- `src/app/page.tsx` is a Server Component that passes `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` into the client app.
- `src/features/campus-energy/components/campus-energy-app.tsx` owns the admin and participant mode switch.
- `src/features/campus-energy/components/admin-dashboard.tsx` composes summary metrics, building rankings, selected building details, and the campus map.
- `src/features/campus-energy/components/campus-map.tsx` is the only component that imports `mapbox-gl`.
- `src/features/campus-energy/components/participant-dashboard.tsx` composes affiliation metrics, group ranking, and character progress.
- `src/features/campus-energy/domain/energy.ts` compares actual electricity usage against forecast usage.
- `src/features/campus-energy/domain/scoring.ts` turns savings into points, rankings, and character levels.
- `src/features/campus-energy/data/demo-campus.ts` holds the Yeungnam University demo school, buildings, groups, participant, and mock readings.

## Runtime Data

The MVP uses mock data only:

- Yeungnam University is the first demo school.
- Buildings are represented as energy saving subjects with latitude and longitude.
- Groups are represented as affiliations for participant rankings.
- Actual and forecast electricity usage are hard-coded mock readings.

The same comparison and scoring functions feed both admin and participant surfaces.

## Mapbox

The public runtime token is read from:

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
```

`.env.example` intentionally leaves this value blank. Do not commit `.env.local`.

When the token is missing, the app still builds and the map area renders a configuration state. When a valid token is provided, Mapbox renders the Yeungnam campus view and building markers.

## Verification

Use these checks after changing the MVP:

```powershell
npm run test
npm run lint
npm run build
git diff --check
```

Current test coverage is focused on pure domain logic:

- `src/features/campus-energy/__tests__/energy.test.ts`
- `src/features/campus-energy/__tests__/scoring.test.ts`

## Not Implemented Yet

- real electricity ingestion
- database schema
- authentication or verified school membership
- LightGBM training or inference
- multi-school onboarding UI
- production deployment
- full RPG gameplay beyond character progress display
