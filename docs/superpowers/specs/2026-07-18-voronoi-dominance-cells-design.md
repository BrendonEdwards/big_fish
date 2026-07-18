# Voronoi Dominance Cells — Design

**Date:** 2026-07-18
**Status:** Approved by Brendon (design review in Claude Code session)

## Purpose

Replace the isolation-circle layer with a "dominance cell" per summit: click a
summit and see the polygon whose boundary passes through the higher peaks that
hem it in. This generalises the isolation radius (a single distance) into a
full region — the cell's minimum boundary distance *is* the isolation, and the
boundary touches the nearest higher neighbour (NHN).

### Why not a plain Voronoi?

A classic Voronoi edge sits on the perpendicular bisector — halfway to each
higher peak. We want the boundary to pass *through* the peaks themselves.
In the plane that is exactly the Voronoi cell of the summit (among
{summit} ∪ higher peaks) scaled ×2 about the summit. On the sphere, naive ×2
vertex scaling distorts edges and breaks for beyond-hemisphere cells, so we
compute the equivalent object directly (see Geometry).

## Decisions (from design review)

| Decision | Choice |
|----------|--------|
| Higher-peaks set | Real global dataset (GeoNames), precomputed offline |
| Geometry method | Radial frontier sampling (Approach A), not Voronoi-library-then-scale |
| Interaction | Cell + contributing peaks shown on summit click |
| Isolation circles | **Removed** as a layer (radii gone) |
| Summit→NHN arc | Kept — endpoint should land on the cell boundary |
| Everest | No cell (nothing higher); info panel says so |

## Architecture

Two pieces, cleanly separated:

1. **`scripts/build-cells.py`** — Python 3.12 + NumPy, run offline by a
   developer; output committed to the repo.
   - Downloads and caches the GeoNames `allCountries` dump (~400 MB zip,
     cached under `scripts/.cache/`, never committed).
   - Filters to mountain-type features with elevations: feature class `T`,
     feature codes `PK, PKS, MT, MTS, VLC, HLL, HLLS`. Use the `elevation`
     column, falling back to the `dem` (SRTM) column when empty. Hills are
     included because the lowest summit (Joe's Hill, 13 m) competes with
     hills, not mountains.
   - For each of the 40 summits in `src/main.js`, computes the doubled cell
     and writes `public/data/cells/<id>.json`.
2. **`src/main.js` changes** — on summit click, lazily `fetch` the summit's
   cell file (in-memory cache) and render it. No new front-end dependencies,
   no runtime GIS.

### Cell file format

One FeatureCollection per summit:

- 1 Polygon or MultiPolygon feature — the cell. Properties: `summitId`,
  `computedIsolationKm`, `nearestHigherName`, `nearestHigherElevationM`,
  `contributingPeakCount`, `datasetNote` (short "derived from GeoNames
  catalogued peaks" disclaimer string).
- N Point features — the *contributing* peaks only (higher peaks that win at
  least one bearing and shape the boundary). Properties: `name`,
  `elevationM`, `distanceKm`, `bearingDeg`.

Everest gets no file. Expected size: tens of KB per file (1,440-vertex ring).

## Geometry (heart of the script)

For summit P:

1. Candidate set H = catalogued peaks strictly higher than P's `elevationM`,
   excluding anything within 2 km of P (guards against the dataset's own
   entry for P, which may differ from ours by a metre or two).
2. One vectorized pass computes each q ∈ H's great-circle distance `d_q` and
   initial bearing `α_q` from P.
3. For each q, the spherical Voronoi *bisector* (the great circle equidistant
   from P and q) has its closest approach to P at distance `d_q / 2` along
   bearing `α_q`. Its first crossing along bearing θ has closed form
   (Napier's rule): `ρ(θ, q) = atan2(tan(d_q / 2), cos(θ − α_q))` mapped
   into (0°, 180°).
4. For 1,440 bearings θ, the cell boundary is the *doubled* Voronoi radius:
   `R(θ) = min(2 · min over q of ρ(θ, q), 179°)`. Doubling the bisector
   radially about P is exactly the planar "×2-scaled Voronoi cell" whose
   edges pass through their generating peaks, generalised to the sphere. The
   179° cap (just inside the antipode) bounds directions with no higher
   ground within half the antipodal distance — only near-pathological cells
   (Aconcagua, whose only higher ground is ~148° away) hit it.

   *Why not a great circle through q itself:* a great circle bounds both
   directions — Tirich Mir's would also clip Aconcagua's cell at ~31° on the
   far side, breaking the min-boundary-distance == isolation invariant. The
   doubled-bisector form keeps both invariants everywhere.

   - Numerical guard: `d_q / 2` is clamped below 89.9° before `tan()` (only
     near-antipodal peaks are affected).
5. The ring of 1,440 destination points (existing destination formula) is
   the cell; `argmin` per bearing yields the contributing peaks.

### GeoJSON legality post-steps

MapLibre (globe, `renderWorldCopies: false`) needs legal rings:

- **Antimeridian:** split rings crossing ±180° into MultiPolygons using the
  tried-and-tested `antimeridian` PyPI package (with `shapely`). Many of
  these cells cross it (Pacific summits, Aconcagua's near-global cell).
- **Poles:** because cells are star-shaped about the summit, pole containment
  is exact and cheap: the north pole is inside iff `R(0°) > 90° − lat`, the
  south pole iff `R(180°) > 90° + lat`. One pole inside → pass the matching
  `force_north_pole`/`force_south_pole` flag to `antimeridian.fix_polygon`
  (Vinson contains the South Pole). Both poles inside (near-global cells,
  e.g. Aconcagua) → represent as the world rectangle minus the complement
  blob (`shapely` difference), which yields a polygon with a hole.
- Known rendering limit: MapLibre's mercator-based pipeline clips fills
  beyond ±85.05° latitude even on the globe projection; polar slivers of
  cells won't fill. Accepted.

## Validation (baked into the script)

The math self-checks, and the script asserts:

- min over θ of `r(θ)` == distance to the nearest peak in H (tolerance: one
  bearing step).
- The nearest higher peak lies on the cell boundary (within tolerance).
- Aconcagua's computed isolation is within tolerance of Wikipedia's
  16,520 km.

Per-summit report printed and written to `scripts/cell-report.md`: computed
isolation + computed NHN vs the hardcoded Wikipedia `isolationKm` / `nhn`,
warning on relative mismatch > 10 %. Expected honest discrepancies:

- GeoNames is incomplete, worst near sea level — low summits (Joe's Hill
  13 m, Olavtoppen, Green Mountain) get "nearest higher *catalogued* peak"
  cells. Labelled, not hidden.
- At least one hardcoded row is internally inconsistent (Joe's Hill's NHN is
  listed as Puʻu Kī, Hawaiʻi at 1,903 km; Bermuda→Hawaiʻi is ~7,500 km). The
  report surfaces these; we keep Wikipedia's numbers in the info panel and
  label the cell as dataset-derived.

The report is informational — the build fails only on the hard assertions
above, not on Wikipedia mismatches.

## Front-end changes

- **Remove** the `isolation-circles` source, `isolation-fill` /
  `isolation-outline` layers, the `circle()` helper, and the circle branch of
  `updateSelectedOverlays()`.
- **Add** sources/layers:
  - `voronoi-cell`: fill (existing blue `#48b8ff`, opacity ~0.08) + line
    outline.
  - `cell-peaks`: small circle markers, visually distinct from the cyan NHN
    dots (warm amber), plus a symbol layer with `name` + elevation text,
    styled like the existing `summit-labels` layer.
- **Selection flow:** `selectSummit()` fetches `/data/cells/<id>.json`
  (memoised in a Map), then `setData()`s both sources. Everest or fetch
  failure → both sources emptied, arc still shown, panel notes why.
- **Click priority:** `getPrioritizedInteractiveFeature()` swaps
  `isolation-fill` for the cell fill layer, so clicking inside a cell still
  selects its summit.
- **Info panel:** one added line — computed isolation + contributing-peak
  count — plus the short GeoNames-derivation note. Wikipedia isolation stays
  as-is.
- **Isolation filter slider:** unchanged; it filters on the hardcoded
  Wikipedia values as today.

## Error handling

- Cell fetch failure: console warning + info-panel note; map still shows
  summit + arc. No retries, no spinner (files are tiny and same-origin).
- Script: hard-fails on assertion violations or a missing/corrupt GeoNames
  download; warns (not fails) on Wikipedia mismatches.

## Testing

- **Script:** assertions above run on every build; `cell-report.md` for
  eyeball review.
- **Front-end:** Playwright smoke script (`scripts/smoke-cells.mjs`):
  serve via `npm run dev`, click Kilimanjaro, assert the cell
  polygon and contributing-peak features are rendered, screenshot for manual
  review. Repeat for Everest (asserts *no* cell, panel note correct).

## Out of scope

- DEM-based "true higher terrain" isolation (the real Wikipedia definition) —
  peak-database approximation is accepted and labelled.
- Correcting the hardcoded Wikipedia rows (surfaced in the report only).
- Rendering all 40 cells at once; cells render one at a time on selection.
