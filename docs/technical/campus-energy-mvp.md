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

## Building Estate Demo

The participant estate route is implemented at:

- `/ko/subjects/yu-e21/estate`
- `/en/subjects/yu-e21/estate`

The route is a Mapbox-free App Router page under `src/app/[locale]/subjects/[subjectId]/estate/page.tsx`. It validates the locale and subject id on the server, loads locale messages, resolves `EstatePageData`, and passes serializable data into the client estate game.

The implemented estate structure is:

- `src/features/estate/data/` - item catalog, expansion catalog, asset manifest, page data, and demo seed snapshots
- `src/features/estate/domain/` - point accounting, commands/reducer, placement/collision, expansion, inventory, serialization, and editor helpers
- `src/features/estate/isometric/` - projection, camera, hit testing, render order, asset loader, and Canvas renderer
- `src/features/estate/persistence/` - repository interface, localStorage adapter, and memory adapter for tests
- `src/features/estate/components/estate-game-client.tsx` - client shell for points, save status, shop, inventory, selection, expansion dialog, and keyboard shortcuts
- `src/features/estate/components/estate-canvas.tsx` - lazy-loaded Canvas renderer with pan, zoom, hit testing, asset loading, ResizeObserver cleanup, and pointer/touch listener cleanup

The Canvas and asset code is loaded through `next/dynamic` from the estate client so the route can split the heavier renderer work. The estate game route does not import `mapbox-gl` or `CampusMap`; Mapbox remains in the campus map surface.

The UI includes screen-reader-only live state for selection, balance, save status, and errors. The Canvas has an ARIA label plus a text summary of placed objects, unlocked parcels, and ground tiles. The expansion dialog traps focus, closes with Escape, and returns focus to the button that opened it. Touch targets in the shop, inventory, selection, expansion, dialog, and Canvas controls are at least 44px.

### localStorage Limitations

The first estate MVP stores progress in browser `localStorage` through `LocalStorageEstateRepository`. It is a convenience store only:

- It can be unavailable when storage is blocked.
- Writes can fail when quota is exceeded.
- Corrupted or incompatible records are recovered to the subject seed snapshot.
- Saved state is not authoritative and does not verify a user's real school membership or earned points.
- A future server-backed repository must recompute earned points server-side and validate spending before accepting writes.

The current client handles storage load failure and write failure as recoverable UI states. It flushes pending saves on `pagehide`, `visibilitychange`, and route unmount, but route-exit save is still best-effort because localStorage can fail.

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

When the token is missing, the app still builds and the map area renders a configuration state. When a valid token is provided, Mapbox renders the Yeungnam campus view on the `dark-v11` style, hides default Mapbox building layers, and overlays floor-count-based building extrusions, transparent polygon click hit areas, lightweight status outlines, and centered building-name labels. The admin map intentionally avoids visible polygon floor fills and visible point circles. Only polygon or multipolygon features with positive `displayHeightMeters` are rendered as clickable map zones; official point fallbacks remain data fallbacks and are not map click targets.

## Yeungnam Building Mapping

The Yeungnam building map uses these data layers:

- official Korean campus map from `https://www.yu.ac.kr/main/intro/campus-map.do`
- official English campus map from `https://www.yu.ac.kr/english/about/campus-map.do`
- OSM building footprints fetched into `data/raw/yeungnam-osm-buildings.geojson`
- reviewed or auto-estimated matches in `data/raw/yeungnam-building-matches.json`
- offline `campus-ems` reference footprints copied into `data/reference/campus-ems-yu-buildings.geojson`

The official campus catalog preserves `bFloor` as `officialFloorText` and parses it into `aboveGroundFloors` and `basementFloors`. If `bFloor` cannot be parsed, `fList` labels such as `1F` and `2F` are used as a fallback for the above-ground floor count. OSM `level` is not used as a building floor count. Generated polygon and multipolygon building features can carry `displayHeightMeters` and `heightSource`; the default official-floor display height is `aboveGroundFloors * 3.6`. Point fallback features do not receive height metadata and are not rendered as 3D buildings.

The local `campus-ems` project was used as an offline reference for improving Gyeongsan-campus footprint coverage. Only non-`fallback_square` reference polygons are imported into the main geometry pipeline. `fallback_square` entries remain excluded from 3D extrusion unless the product explicitly accepts approximate artificial footprints later.

Generated app data lives in:

- `src/features/campus-energy/data/yeungnam-building-catalog.json`
- `src/features/campus-energy/data/yeungnam-building-geometries.json`
- `src/features/campus-energy/data/yeungnam-buildings.ts`

Current generated counts:

- 121 official campus-map entries with GPS points
- generated geometry metadata covers `gyeongsan` and `daemyeong`
- 305 OSM building footprints in the Yeungnam bbox
- 121 mapped campus geometries after official point fallback: 73 polygons, 48 points
- 69 polygon geometries currently have extrusion height metadata and are rendered as map click zones
- 24 polygons use the offline `campus-ems` reference as their footprint source
- 48 official campus-map point fallbacks

The runtime adapter loads all 121 catalog entries as subjects. It matches geometry by subject id first, then by official building code for legacy/reviewed features.

Official campus-map point fallbacks are still data fallbacks, not exact building footprints. The UI does not create invisible click zones for them. Exact building-footprint clicking for those entries requires adding reviewed polygon geometry in `data/raw/yeungnam-building-matches.json` or `data/raw/yeungnam-manual-building-geometries.geojson`.

Regenerate the map data with:

```powershell
node scripts/fetch-yeungnam-campus-catalog.mjs
node scripts/fetch-yeungnam-osm-buildings.mjs
node scripts/import-campus-ems-reference-geometries.mjs
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
git status --short
```

Current test coverage includes domain logic, generated Yeungnam data validation, GeoJSON conversion, localization fallback behavior, and estate regressions:

- `src/features/campus-energy/__tests__/energy.test.ts`
- `src/features/campus-energy/__tests__/geojson.test.ts`
- `src/features/campus-energy/__tests__/localized-demo-campus.test.ts`
- `src/features/campus-energy/__tests__/scoring.test.ts`
- `src/features/estate/__tests__/point-account.test.ts`
- `src/features/estate/__tests__/commands.test.ts`
- `src/features/estate/__tests__/placement.test.ts`
- `src/features/estate/__tests__/expansion.test.ts`
- `src/features/estate/__tests__/serialization.test.ts`
- `src/features/estate/__tests__/estate-repository.test.ts`
- `src/features/estate/__tests__/isometric-hit-testing.test.ts`
- `src/features/estate/__tests__/estate-canvas.test.tsx`
- `src/features/estate/__tests__/estate-quality.test.ts`

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
