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
- Subjects with reviewed geometry render as reviewed polygons. Official campus-map GPS points are emitted as fallback Point geometry for entries without reviewed geometry.
- Groups are represented as affiliations for participant rankings.
- Actual and forecast electricity usage are hard-coded mock readings.

The same comparison and scoring functions feed both admin and participant surfaces.

## Mapbox

The public runtime token is read from:

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
```

`.env.example` intentionally leaves this value blank. Do not commit `.env.local`.

When the token is missing, the app still builds and the map area renders a configuration state. When a valid token is provided, Mapbox renders the Yeungnam campus view with Mapbox Standard 3D objects disabled, floor-count-based building extrusions, transparent polygon click hit areas, lightweight status outlines, invisible point fallback hit areas, and labels based on official campus codes. The admin map intentionally avoids visible polygon floor fills and visible point circles so users can click campus subjects without extra marker clutter.

## Yeungnam Building Mapping

The Yeungnam building map uses these data layers:

- official Korean campus map from `https://www.yu.ac.kr/main/intro/campus-map.do`
- official English campus map from `https://www.yu.ac.kr/english/about/campus-map.do`
- OSM building footprints fetched into `data/raw/yeungnam-osm-buildings.geojson`
- reviewed or auto-estimated matches in `data/raw/yeungnam-building-matches.json`

The official campus catalog preserves `bFloor` as `officialFloorText` and parses it into `aboveGroundFloors` and `basementFloors`. If `bFloor` cannot be parsed, `fList` labels such as `1F` and `2F` are used as a fallback for the above-ground floor count. OSM `level` is not used as a building floor count. Generated polygon and multipolygon building features can carry `displayHeightMeters` and `heightSource`; the default official-floor display height is `aboveGroundFloors * 3.6`. Point fallback features do not receive height metadata and are not rendered as 3D buildings.

Generated app data lives in:

- `src/features/campus-energy/data/yeungnam-building-catalog.json`
- `src/features/campus-energy/data/yeungnam-building-geometries.json`
- `src/features/campus-energy/data/yeungnam-buildings.ts`

Current generated counts:

- 121 official campus-map entries with GPS points
- generated geometry metadata covers `gyeongsan` and `daemyeong`
- 305 OSM building footprints in the Yeungnam bbox
- 121 mapped campus geometries after official point fallback: 48 polygons, 73 points
- 42 polygon building geometries currently have floor-count-based extrusion height
- 73 official campus-map point fallbacks

The runtime adapter loads all 121 catalog entries as subjects. It matches geometry by subject id first, then by official building code for legacy/reviewed features.

Official campus-map point fallbacks are still data fallbacks, not exact building footprints. The UI keeps them clickable through invisible hit areas, but exact building-footprint clicking for those entries requires adding reviewed polygon geometry in `data/raw/yeungnam-building-matches.json` or `data/raw/yeungnam-manual-building-geometries.geojson`.

Regenerate the map data with:

```powershell
node scripts/fetch-yeungnam-campus-catalog.mjs
node scripts/fetch-yeungnam-osm-buildings.mjs
node scripts/build-yeungnam-building-geometries.mjs --strict --allow-official-point-fallbacks
```

Strict mode without fallback acceptance is reserved for a fully reviewed polygon/manual mapping set:

```powershell
node scripts/build-yeungnam-building-geometries.mjs --strict
```

That command fails if any official point fallback remains. Use `--strict --allow-official-point-fallbacks` when official campus-map points are acceptable for mapping completeness.

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
