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
- Official Yeungnam campus catalog entries are represented as spatial subjects.
- Subjects with reviewed geometry render on the map; subjects without geometry remain stable identity records until their geometry is reviewed.
- Groups are represented as affiliations for participant rankings.
- Actual and forecast electricity usage are hard-coded mock readings.

The same comparison and scoring functions feed both admin and participant surfaces.

## Mapbox

The public runtime token is read from:

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
```

`.env.example` intentionally leaves this value blank. Do not commit `.env.local`.

When the token is missing, the app still builds and the map area renders a configuration state. When a valid token is provided, Mapbox renders the Yeungnam campus view with reviewed polygon fills, outlines, point fallback support, and labels based on official campus codes.

## Yeungnam Building Mapping

The Yeungnam building map uses these data layers:

- official Korean campus catalog from `https://www.yu.ac.kr/campus_vr-k/vr.php`
- official English campus catalog from `https://www.yu.ac.kr/campus_vr-e/vr_eng.php`
- OSM building footprints fetched into `data/raw/yeungnam-osm-buildings.geojson`
- reviewed or auto-estimated matches in `data/raw/yeungnam-building-matches.json`

Generated app data lives in:

- `src/features/campus-energy/data/yeungnam-building-catalog.json`
- `src/features/campus-energy/data/yeungnam-building-geometries.json`
- `src/features/campus-energy/data/yeungnam-buildings.ts`

Current generated counts:

- 101 official catalog entries
- 86 building entries
- 15 non-building official place entries: 9 landmarks, 5 outdoor facilities, and 1 utility
- 305 OSM building footprints in the Yeungnam bbox
- 48 mapped campus geometries
- 53 catalog entries still needing reviewed geometry matches

The runtime adapter loads all 101 catalog entries as subjects. The generated geometry file currently attaches reviewed or estimated geometry to 48 of them, and Mapbox omits the remaining geometry-less subjects until they receive a reviewed footprint or point.

Regenerate the map data with:

```powershell
node scripts/fetch-yeungnam-campus-catalog.mjs
node scripts/fetch-yeungnam-osm-buildings.mjs
node scripts/build-yeungnam-building-geometries.mjs
```

Use strict mode when the reviewed match set is expected to be complete:

```powershell
node scripts/build-yeungnam-building-geometries.mjs --strict
```

Strict mode fails while catalog entries are missing reviewed geometry and does not promote incomplete app geometry output.

## Verification

Use these checks after changing the MVP:

```powershell
npm run test
npm run lint
npm run build
git diff --check
```

Current test coverage includes domain logic, generated Yeungnam data validation, GeoJSON conversion, and localization fallback behavior:

- `src/features/campus-energy/__tests__/energy.test.ts`
- `src/features/campus-energy/__tests__/geojson.test.ts`
- `src/features/campus-energy/__tests__/localized-demo-campus.test.ts`
- `src/features/campus-energy/__tests__/scoring.test.ts`

## Not Implemented Yet

- real electricity ingestion
- database schema
- authentication or verified school membership
- LightGBM training or inference
- multi-school onboarding UI
- production deployment
- full RPG gameplay beyond character progress display

## Internationalization

The app uses Korean as the default locale and supports English through locale-prefixed routes:

- `/ko`
- `/en`

Requests without a locale are handled by `src/proxy.ts`. The proxy redirects to the saved `cems-locale` cookie when it is valid, or to Korean (`ko`) when no valid cookie exists.

Locale dictionaries live under `src/i18n/messages/`. Server routes load messages with `src/i18n/dictionaries.ts`, then pass the selected locale and messages into the client app. Client components read them through `I18nProvider` and `useI18n`.

The language selector currently appears in the app header. It writes the same locale cookie that a future settings screen should use.
