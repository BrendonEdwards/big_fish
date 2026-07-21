# The Loneliest Peaks — v2.3 (drop Edwards name, fix spotlight, collapsible panels, copy tweaks)

**Date:** 2026-07-20
**Status:** Approved by Brendon (design review in Claude Code session)
**Builds on:** v2.2 (PR #4 branch `feature/jailers-v2`).

## Purpose

Post-review polish: retire the "Edwards Polygon" name, fix the spotlight dim
which renders as broken facets for large dominance regions, make the hero and
info panel collapsible so the map can stand alone, and soften two copy items.

## Root cause (spotlight), already investigated

The spotlight mask is built in the browser as a world rectangle (+/-85 deg
latitude) with the dominance ring punched as a hole. For 20 of 39 summits the
ring is a large region that reaches a pole (latitude 90) and spans the full
+/-180 longitude, so the "hole" extends outside the rectangle. That is an
invalid polygon (a hole not contained by its shell), which MapLibre renders as
faceted, incomplete patches. Shapely confirms exactly the large-region summits
are invalid. The fix is to stop building a rectangle-with-hole and instead
render a proper complement polygon computed in the pipeline.

## Decisions (from design review)

| Decision | Choice |
|----------|--------|
| "Edwards Polygon" name | Removed everywhere; revert to "dominance region". Drop the vanity name note. |
| Spotlight | Fix via pipeline: precompute the complement polygon (`dimRegion`) per summit; render it directly. One rebuild. |
| Flat map | Keep the instant globe/Mercator toggle (no native unfurl animation exists). |
| Panels | Hero and info panel each collapsible to a small toggle, leaving map + tools. |
| Wikipedia link | Remove "rabbit hole" wording. |

## 1. Drop the "Edwards Polygon" name

Text-only rename across the UI (no id/layer changes):

- Panel: `<dt>Edwards Polygon</dt>` -> `<dt>Dominance region</dt>` (id `#summit-area` unchanged).
- Rankings: header "Edwards Polygon (km²)" -> "Dominance region (km²)" (data-metric `ringAreaKm2` unchanged); legend text updated to say "dominance region".
- Data-geeks modal: section heading "The Edwards Polygon" -> "The dominance region"; every "Edwards Polygon" phrase -> "dominance region"; REMOVE the entire "A note on the name" section. The formula `<img>` alt text "Edwards Polygon formal definition" -> "Dominance region formal definition". The copyable LaTeX `E(P) = ...` line stays (E for the region is fine as a symbol).
- The "For the data geeks" button label stays (Brendon likes it).
- The formula SVG contains only equations (no "Edwards" text), so no SVG regeneration is needed.

## 2. Fix the spotlight via a precomputed complement polygon

### Pipeline (`scripts/build_jailers.py`, `scripts/cell_geometry.py`)

- Extract the geometry-building tail of `jailer_ring` into a reusable
  `build_star_geometry(hub_lat, hub_lon, theta, R)` that, given bearings `theta`
  and boundary radii `R` (radians) about a hub, returns a valid GeoJSON
  geometry (it computes `cell_ring`, `poles_inside`, and handles the single
  pole and both-poles world-with-hole cases exactly as `jailer_ring` does now,
  ending with the `is_valid` assert). `jailer_ring` calls it for the ring; its
  area calculation is unchanged.
- Compute the complement per summit. The dominance region is star-shaped about
  the hub P with boundary radius R(theta); its complement (everything outside)
  is star-shaped about the antipode P' = (-lat, lon + 180). Construction:
  1. Get the ring boundary points `(lats, lons) = cell_ring(P, theta, R)`.
  2. From the antipode, `d_prime, phi = angular_distance_and_bearing(P'_lat, P'_lon, lats, lons)` (radians).
  3. Sort the boundary points by `phi`.
  4. `dim_geometry = build_star_geometry(P'_lat, P'_lon, phi_sorted, d_prime_sorted)`.
  This reuses the identical robust machinery, so the complement is a valid
  polygon (including the both-poles world-with-hole case for summits whose
  dominance region is small, e.g. the complement contains both poles).
- Store `dimRegion` (GeoJSON Polygon/MultiPolygon, or null when there is no
  ring) alongside `ring` in each summit's `jailers.json` entry. Hard-assert
  `dimRegion` is shapely-valid.
- Aconcagua: its ring already covers the world minus an antipodal cap; its
  complement is that small cap, now a clean small polygon that finally dims
  correctly (previously "nothing dimmed").
- Rebuild `public/data/jailers.json`. Existing invariants and the Aconcagua
  isolation assert must still pass; no isolation/NHN/ring-area values change
  (only the new `dimRegion` field is added).

### Front-end (`src/main.js`)

- Remove `spotlightMaskFeatures` (the browser-side rectangle-with-hole).
- In `refreshOverlays`, the selected branch sets the `spotlight-mask` source to
  the summit's `dimRegion` wrapped as a Feature (or empty when absent):
  `map.getSource('spotlight-mask').setData(collection(visible && data?.dimRegion ? [{ type: 'Feature', properties: {}, geometry: data.dimRegion }] : []))`.
  Web mode and `resetInfoPanel` clear it as now.
- The `spotlight-dim` fill layer, its `SPOTLIGHT_OPACITY`, and layer ordering
  are unchanged.

## 3. Collapsible hero and info panel

- Add a small toggle control to each of the `.hero` card and the
  `#info-panel`. Clicking it collapses the panel to a compact state showing
  only the toggle (so both collapsed leaves just the map and MapLibre's
  navigation control visible). Clicking again expands.
- Implementation: a `<button class="panel-collapse">` in each panel that
  toggles a `collapsed` class on its panel; CSS hides the panel body when
  `collapsed` and shrinks the panel to the toggle. Icon: a chevron/character
  that flips (for example "-" expanded, "+" collapsed), with an
  `aria-expanded` attribute. Session-only, no persistence. Vanilla JS wiring
  in the load handler (or inline).
- Default: both expanded on load.

## 4. Copy tweaks

- Wikipedia link text: "Inspired by a Wikipedia rabbit hole: Topographic
  isolation." -> "Inspired by Wikipedia's Topographic isolation article."
  (keep the same href/anchor).
- No em dashes anywhere (unchanged rule).

## Error handling

- `dimRegion` null (Everest, <3 neighbours): no dim, as now.
- Collapsed panels: purely presentational; no failure path.

## Testing

- **Pipeline:** the build's existing asserts plus a new one that every
  `dimRegion` is shapely-valid; a quick check that a large-region summit
  (mont-blanc) now has a valid `dimRegion` (previously the browser mask was
  invalid).
- **Smoke (extends the real-click script):**
  - Replace the "Edwards Polygon" modal assertion with "dominance region";
    ensure no "Edwards Polygon" text remains anywhere in the page.
  - Select mont-blanc (a previously-broken summit) and assert `spotlight-mask`
    has one feature whose geometry is a valid Polygon/MultiPolygon (feature
    present + `spotlight-dim` layer exists).
  - Collapse toggles: click each panel's collapse button, assert the panel
    gains the `collapsed` class and its body is hidden; expand and assert it
    returns.
  - Wikipedia link no longer contains "rabbit hole".
  - Flat-map toggle unchanged (still asserted).

## Out of scope

- Any change to isolation/NHN/ring-area computation (only `dimRegion` added).
- Animated projection morph (not natively supported; instant toggle kept).
- Renaming internal ids, `window.__bigfish`, or the npm package.
