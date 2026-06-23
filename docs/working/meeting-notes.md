# Meeting Notes

User-stated decisions and verified working facts are recorded here by date. Do not treat unstated product, architecture, ML, or deployment ideas as confirmed.

## 2026-06-23

- The user wanted the uncomfortable black floor-only Mapbox building appearance removed.
- The user wanted visible circular building markers removed so clicking a building focuses that building instead.
- A markerless Mapbox interaction implementation plan was created at `docs/superpowers/plans/2026-06-23-mapbox-building-click-focus.md`.
- The admin campus map now disables Mapbox Standard 3D objects, removes visible app-level polygon fills and point circles, and uses transparent polygon and point hit layers for selection.
- Reviewed polygon subjects can be selected by clicking their building area, point fallback subjects remain selectable through invisible hit areas or labels, and selected subjects still focus the map with `flyTo()`.
- Verified checks were targeted map tests, all Vitest tests, ESLint, production build, `git diff --check`, and an HTTP check for `/ko` on the existing local dev server.
- The user wanted official Yeungnam campus-map floor data parsed so building shapes can show height instead of floor-only footprints.
- The implementation now parses official `bFloor` first and falls back to `fList` floor labels, stores `displayHeightMeters` separately from `heightSource`, and uses `1 floor = 3.6m` for official-floor display height.
- The floor-height implementation initially gave 42 polygon building features floor-count-based extrusion height; point fallback features kept no height metadata and were not rendered as arbitrary 3D buildings.
- Verified checks for the floor-height implementation were official catalog regeneration, generated geometry regeneration with strict point-fallback acceptance, all Vitest tests, ESLint, production build, and `git diff --check`.
- The user pointed to the local `campus-ems` project as a better Yeungnam Mapbox reference and asked to compare the difference and apply a fix.
- The local `campus-ems` reference had 96 shared Gyeongsan entries as polygons; the current app previously had 48 polygons and 73 point fallbacks across 121 official entries.
- The implementation imported only non-`fallback_square` reference polygons from `campus-ems`, adding 22 OSM matches and 2 manual reference geometries while excluding 24 artificial fallback squares.
- Generated Yeungnam geometries now contain 72 polygons and 49 point fallbacks, with 24 polygon footprints marked as `campus-ems-reference`.
- The admin Mapbox view now uses `dark-v11`, hides default Mapbox building layers, uses stronger floor-count extrusion styling, shows centered building-name labels, and focuses selected subjects with `easeTo()`.
- The user reported remaining floor-only items such as E26 and F29 and wanted every map zone to either have no clickable area when footprint/height data is missing, or show as a building form that focuses on click.
- E26 had an OSM polygon and official floor data but no height because utility subjects were excluded from height calculation; height generation now includes `building`, `utility`, and `outdoor` polygon subjects with official floors.
- F29 was a point fallback because `campus-ems` only had a `fallback_square`; it is now manually matched to the nearest named OSM footprint `way/468971867`.
- Generated Yeungnam geometries now contain 73 polygons and 48 point fallbacks. 69 height-bearing polygons render as clickable Mapbox zones; point fallbacks and no-height polygons are not rendered as map click zones.

## 2026-06-21

- The user wanted the project's default language to be Korean.
- The user also wanted multilingual support implemented early so the language can later be changed from settings.
- A Korean-first i18n implementation plan was created at `docs/superpowers/plans/2026-06-21-korean-first-i18n.md`.
- The implementation added locale-prefixed routes for `/ko` and `/en`.
- Locale-less requests are handled by `src/proxy.ts`, which redirects to a valid `cems-locale` cookie or to Korean (`ko`) by default.
- Korean and English message dictionaries now live under `src/i18n/messages/`.
- Client components read locale and messages through `I18nProvider` and `useI18n`, and the current header language selector writes the `cems-locale` cookie for future settings reuse.
- Demo school, subject, group, and participant display names are localized through `src/features/campus-energy/data/localized-demo-campus.ts`.
- Character progression now stores a title key instead of hard-coded English display text.
- Verified checks were `npm run test`, `npm run lint`, `npm run build`, `git diff --check`, and runtime HTTP checks for `/`, `/ko`, `/en`, the saved-locale cookie redirect, Korean text, English text, language options, and the missing Mapbox token fallback.

## 2026-06-20

- The user first asked for a Mapbox web view that shows Yeungnam University buildings well.
- The direction was then expanded beyond a Yeungnam-only map. Yeungnam University should be the first concrete demo case, but the system should support multiple schools later.
- The user clarified that the product goal is not only a map. It is a campus energy platform that lets schools see electricity usage, forecast usage, and savings.
- Admin and facility-team users should be able to identify which buildings are using more electricity than predicted.
- The user plans to add a prediction model later, such as LightGBM, to estimate expected electricity usage.
- The user stated that energy is often not saved because the actual actors, such as students and faculty, lack interest, not only because monitoring systems are missing.
- The product should therefore include a competition or engagement system.
- Participants should register their school and affiliation.
- If their school or affiliation saves electricity compared with predicted usage, that saving should become points or another reward format.
- The reward should be used to grow a character, with an RPG-style experience later.
- The product should have two UI surfaces: an administrator-facing advanced energy dashboard and a user-facing participation and character experience.
- The implementation plan should be reset from a Yeungnam-only Mapbox view to a campus energy platform MVP that uses Yeungnam as the first school.
- The first campus energy MVP was implemented and pushed as `94560de Add campus energy MVP`.
- The implemented MVP contains admin and participant modes, mock Yeungnam energy data, shared energy comparison and scoring logic, a Mapbox-backed admin map with a missing-token fallback, and Vitest domain tests.
- The verified checks for the MVP were `npm run test`, `npm run lint`, `npm run build`, and `git diff --check`.
- `.env.example` leaves `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` blank so the repository does not contain a Mapbox-looking token value.

## 2026-06-19

- The user preferred manual session recording over always-on background logging.
- Recording mode should start only when the user explicitly asks with phrases such as `정리 시작`, `세션 정리해줘`, `기록해줘`, or `회의록 정리해줘`.

## 2026-06-18

- The user explored the idea of a system that records project context from Codex sessions.
- The idea was described as close to a `session recorder`, `context logger`, `agent session recorder`, or `session logging harness`.

## 2026-06-17

- The user said the existing docs contained planning content that no longer matched the desired direction.
- The old planning docs should not be preserved as the baseline.
- Going forward, docs should work more like meeting notes: user statements and facts verified during work should be accumulated gradually.
