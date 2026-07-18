# Jailers v2 — Spokes, Web, Rings, Rankings, Terrain

**Date:** 2026-07-18
**Status:** Approved by Brendon (design review in Claude Code session)
**Supersedes:** the polygon-rendering half of
`2026-07-18-voronoi-dominance-cells-design.md`. The GeoNames pipeline,
geometry primitives, and validation from that spec remain the foundation;
its doubled-cell *rendering* and per-summit cell files are removed.

## Purpose

Replace dominance-cell polygons with a "ring of jailers" visual language:
for each summit, the higher peaks that hem it in (its *jailers*) rendered as
glowing hub-to-jailer spokes plus a polygon whose vertices ARE the jailers.
Add a global web mode, min/max isolation filtering, ring-area stats, a
rankings popup, and optional 3D terrain.

### Definitions

- **Jailer**: a higher peak that wins at least one bearing in the radial
  frontier construction (`boundary_distances` argmin) — unchanged from v1's
  "contributing peak". A jailer is the first hemming constraint in some
  direction, which is not always the nearest higher peak on its own bearing.
- **Spoke**: the geodesic from the summit (hub) to one jailer. The shortest
  spoke is the NHN spoke; its length is the computed isolation.
- **Ring of jailers**: the polygon with jailers as vertices, connected in
  bearing order around the hub by geodesic edges. This is *the* polygon of
  v2 — no Voronoi (halved or doubled) polygons anywhere.

## Decisions (from design review)

| Decision | Choice |
|----------|--------|
| Voronoi polygons (any form) | Removed entirely |
| Jailer definition | v1 contributing-peak set (radial argmin), unchanged |
| Perimeter labels | Jailer markers (name · elevation) sit on ring vertices |
| NHN arc | Removed as separate layer; NHN spoke is emphasized instead |
| Display modes | Selected (one summit) / Web (all summits, hover highlight) |
| Filter | Min AND max isolation, applies in both modes |
| Rankings | Popup table; metrics: ring area, jailer count, mean spoke, isolation |
| Terrain | Toggle, AWS Terrarium raster-DEM, subject to globe-interop spike |
| deck.gl arcs | Timeboxed spike; fallback is stacked-glow line layers |
| Data | ONE aggregate `public/data/jailers.json`; per-summit cell files deleted |

## Architecture

### Offline pipeline (`scripts/build_jailers.py`, evolved from `build_cells.py`)

Same GeoNames download/filter (feature codes PK/PKS/MT/VLC/HLL,
stale-elevation guard, per-summit exclusions) and the same
`boundary_distances` radial argmin to find jailers. New outputs, one file:

`public/data/jailers.json`:

```json
{
  "generated": "<ISO date>",
  "datasetNote": "…GeoNames-derived…",
  "summits": {
    "<id>": {
      "isolationKmComputed": 3135.5,
      "nhn": { "name": "Mount Adam", "elevationM": 4010, "distanceKm": 3135.5,
               "bearingDeg": 181.0, "coordinates": [lon, lat] },
      "jailers": [ { name, elevationM, distanceKm, bearingDeg,
                     coordinates: [lon, lat] }, …  // bearing-sorted, includes NHN
      ],
      "ring": <GeoJSON Polygon|MultiPolygon|null>,   // null when < 3 jailers
      "ringAreaKm2": 61234567.8 | null,
      "meanSpokeKm": 5210.4
    }
  }
}
```

- Ring construction: jailer vertices in bearing order; edges are hub-bearing-
  interpolated arcs (bearing and distance linearly interpolated between
  adjacent jailers, 0.5° steps), star-shaped by construction — self-
  intersection is impossible, and the boundary never dips below the nearer
  adjacent jailer's distance, so min boundary distance ≥ isolation, with
  equality at the NHN vertex. Poles via the exact star-shaped `poles_inside`
  test. Single-pole rings use the v1 `ring_to_geojson_geometry` handling;
  both-poles rings (Aconcagua's closing sweep across its empty bearing arc
  produces one) are built directly as the world rectangle with the ring as an
  interior hole — no geodesic-library heuristics needed, since the geometry
  is fully determined. Every ring is hard-asserted shapely-valid inside
  `jailer_ring`.
- Area: computed directly from the sampled radius profile via the exact
  spherical star-shaped-region formula, `R_earth² · ∫(1 − cos R(θ)) dθ`
  over the full 360° sweep — uniform across normal, single-pole, and
  both-poles rings alike, with no geodesic-library edge cases (a
  pole-touching world-rectangle shell degenerates `pyproj`'s geodesic area
  calculation to zero, which this sidesteps entirely). No `pyproj` dependency.
- Everest: no entry. `< 3` jailers: `ring`/`ringAreaKm2` null, spokes still
  valid.
- Validation (hard): min jailer `distanceKm` == computed isolation; Aconcagua
  within 5% of 16,520 km; every ring valid per shapely. Report
  (`scripts/cell-report.md`, renamed `scripts/jailers-report.md`): computed
  vs Wikipedia isolation as in v1, plus jailer count and ring area per
  summit.
- `public/data/cells/` and its generator paths are deleted;
  `scripts/fetch-glyphs.mjs` now reads label text from `jailers.json`
  (jailer names) + `src/main.js` summit names, and is re-run.

### Front-end (`src/main.js`, `index.html`, `src/styles.css`)

Single fetch of `jailers.json` at startup (no per-summit lazy loading, no
cache map). Spokes are built client-side with the existing `greatCircle()`
from hub + jailer coordinates.

**Layers** (bottom → top):
1. `ring-fill` (translucent ~0.06) + `ring-outline` — selected summit's ring
   (Selected mode only).
2. Spoke glow stack: `spokes-glow-outer` (wide, faint), `spokes-glow-inner`
   (medium), `spokes-core` (narrow, bright) — all `line` layers over one
   GeoJSON source whose features carry `distanceKm`, `summitId`, `isNhn`.
   Colour: `interpolate` on `distanceKm`, amber (#ffb703, near) → cyan
   (#48b8ff, far). Width: taper by distance. NHN spoke: +50% width, warmer
   colour. `spokes-core` has an animated `line-dasharray` offset
   (requestAnimationFrame, ~8 fps step) drifting hub→jailer.
3. `jailer-points` + `jailer-labels` (amber markers, name · elevation) — the
   ring's perimeter labels by construction.
4. Existing `summits` / `summit-labels` unchanged (incl. promoteId click fix).
   `nhn-points` source/layers and `summit-arcs` are removed.

**Modes** (radio in the info panel):
- *Selected*: click a summit → its ring + spokes + jailer markers.
- *Web*: all filtered summits' spokes at once, opacity ~0.25, no rings, no
  jailer labels. Hovering a summit marker (or its spokes) sets a
  `hovered` feature-state: that summit's spokes go full opacity, others dim
  to ~0.08. Click still selects (switches panel data; stays in Web mode).

**Filter**: two range inputs (min, max) over isolation, log-scaled like v1's
single slider; both modes filter summit markers, labels, and spokes.
Everest stays exempt/visible as in v1.

**Info panel additions**: ring area (km², formatted), jailer count, mean
spoke; a scrollable jailer chip list sorted by distance — each chip
`name · elevation · distance`, click → `map.flyTo` the jailer.

**Rankings popup**: a modal (`<dialog>` or fixed div) with a table of all
summits × {ring area, jailer count, mean spoke, isolation}; header buttons
sort by each metric (desc); row click selects the summit and closes.
Data straight from `jailers.json` + `peakData`. Openable via a "Rankings"
button in the panel; Esc/backdrop closes.

**Terrain toggle**: checkbox "3D terrain". On: add `raster-dem` source
(AWS Terrarium `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`,
`encoding: 'terrarium'`, attribution per AWS open data terms),
`map.setTerrain({ exaggeration: 1.4 })`, plus a hillshade layer. Off:
`setTerrain(null)`, remove hillshade. Subject to the spike below.

### Spikes (each timeboxed, run before the main front-end task)

1. **Terrain × globe on MapLibre 5.6**: enable terrain on the globe
   projection; if broken, terrain toggle switches projection to mercator
   while active (accepted degradation) — spike decides which branch the
   spec's terrain section takes.
2. **deck.gl interleaved ArcLayer × MapLibre 5.6 globe**: if arcs render
   correctly anchored during pan/rotate/pitch, spokes upgrade to lifted 3D
   arcs (deck.gl via CDN, same colour ramp, `getHeight` ∝ distance) and the
   glow-stack becomes the no-JS fallback; if not, glow-stack ships and
   deck.gl is not added. Spike outcome recorded in the plan before the
   spokes task.

## Error handling

- `jailers.json` fetch failure: map still works (markers, selection, panel
  shows "jailer data unavailable"); no crash.
- Terrain tile failures: MapLibre degrades gracefully (no terrain); toggle
  stays functional.
- Summits absent from `jailers.json` (Everest): panel notes "global high
  point — no jailers"; no spokes/ring.

## Testing

- **Pytest** (existing suite continues to pass minus deleted cell-file
  assertions): ring builder (bearing-sorted vertices, geodesic
  densification, antimeridian ring, <3-jailer degenerate, no-antipode
  assert), area sanity (a known quadrilateral vs pyproj reference),
  aggregate JSON schema.
- **Smoke (real clicks, extends v1 script)**: select Kilimanjaro → spokes +
  ring + jailer labels render, panel stats present; open rankings, sort by
  area, click a row → selection changes; switch to Web mode → multiple
  summits' spokes rendered, hover changes feature-state; min/max filter
  narrows markers and spokes; terrain toggle on/off without console errors;
  Everest → no spokes, panel note. Screenshots eyeballed.

## Out of scope

- Fixing the 11 inconsistent hardcoded `nhn` rows in `peakData` (the NHN
  used by v2 visuals is the *computed* one from `jailers.json`, which
  sidesteps the bad rows for spokes; the panel's Wikipedia isolation text
  stays as-is).
- Voronoi tessellation of the 40 summits.
- Mobile-specific layout for the rankings modal beyond basic responsiveness.
