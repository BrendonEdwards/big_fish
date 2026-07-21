# The Loneliest Peaks — v2.2 (terminology, Edwards Polygon, source link, Mercator, polish)

**Date:** 2026-07-20
**Status:** Approved by Brendon (design review in Claude Code session)
**Builds on:** v2.1 (PR #4 branch `feature/jailers-v2`).

## Purpose

Tighten the app for a public/LinkedIn share and for a GIS-literate audience:
honest terminology, a formally-defined and proudly-named "Edwards Polygon",
a prominent Wikipedia source credit, rankings that recenter the globe and
explain their columns, a "For the data geeks" modal with an academic-style
formula, and a Web Mercator (flat) toggle. No em dashes anywhere in UI copy.

## Decisions (from design review)

| Decision | Choice |
|----------|--------|
| Terminology | Drop "jailer" from UI. Peaks -> "higher neighbours"; region -> "Edwards Polygon"; keep "nearest higher neighbour", "spokes", "hub". Internal layer/source ids (`jailer-*`) unchanged. |
| Isolation in panel | Computed value only (remove the Wikipedia/computed split) |
| Wikipedia | Prominent source link to the "Topographic isolation" article |
| Rankings row click | Also recenter the globe on the summit (animated flyTo) |
| Rankings columns | Add short per-column descriptions |
| Methodology modal | Renamed "For the data geeks"; detailed; leads with the Edwards Polygon |
| Edwards Polygon prominence | Named in the panel area row + hero section in the modal |
| Formula rendering | Pre-rendered SVG (crisp), plus a copyable LaTeX source block |
| Self-reference | Concise, dry, self-deprecating note on the name ("inner Trump") |
| Mercator | Globe/Flat animated toggle (starts on globe) |
| Mawson | Left as-is (computed shown); caveat already in the modal |
| Em dashes | None in any UI/modal copy |

## 1. Terminology rework (UI copy only; internal ids unchanged)

User-facing strings only. Do NOT rename layer/source ids, `window.__bigfish`,
or the npm package.

- Panel computed line: `N higher neighbours` (was `N jailers`).
- Panel area row label: `Edwards Polygon` (was `Ring area`); value stays the
  km2 area.
- Chips: unchanged content (name / elevation / distance), still fly-to; the
  section stays the higher-neighbour list.
- `#summit-notes` default + hero paragraph: replace "jailers" phrasing with
  "the higher peaks that hem them in" / "higher neighbours".
- Keep "spokes" and "hub" (ordinary GIS phrasing, accepted).

## 2. Info panel

- **Single isolation row.** Remove the separate "Isolation" (Wikipedia) and
  "Computed isolation" rows; show ONE row labelled `Isolation` with the
  computed value (`${computedIsolationKm} km`). Everest's Easter-egg override
  (Maxwell Montes / ~38M km) still applies unchanged.
- **Wikipedia source link.** Add a prominent link to
  `https://en.wikipedia.org/wiki/Topographic_isolation` (target=_blank,
  rel="noopener"), e.g. a line in the hero card: "Inspired by Wikipedia's
  Topographic isolation article." Styled as a visible link.

## 3. Rankings

- **Recenter on row click.** `onSelect(id)` in `src/main.js` currently calls
  `selectSummit(id)`. `selectSummit` already positions the popup; add a
  `map.flyTo({ center: summit.coordinates, zoom: <=current or ~3 }, ...)` so
  the globe animates to center the summit. Implement by having the rankings
  `onSelect` (or `selectSummit`) trigger the flyTo; keep it a gentle animated
  move, not a jump.
- **Column descriptions.** Add a one-line legend / caption row beneath the
  "Rankings" heading describing each column in plain terms:
  Underdog Index (dominance per metre of height, 0-100), Edwards Polygon
  (km2 of the summit's dominance region), Higher neighbours (count of higher
  peaks that bound it), Mean spoke (average distance to those peaks),
  Isolation (distance to the nearest higher peak). Header cells also get
  `title` tooltips with the same text. (Rename the existing "Ring area" and
  "Jailers" headers to "Edwards Polygon (km2)" and "Higher neighbours".)

## 4. "For the data geeks" modal (renamed from Methodology)

Rename the button and dialog heading to "For the data geeks". Keep the modal
mechanics (`#methodology-dialog`, id unchanged to avoid churn; only visible
text changes). NO em dashes anywhere in this content. Sections, in order:

### 4a. The Edwards Polygon (hero section, first)

- Short intro: topographic isolation reduces a summit to a single number,
  the distance to its nearest higher neighbour. The Edwards Polygon
  generalises that one number into a two-dimensional region: the ground a
  summit "owns" before higher terrain takes over, bounded by the higher
  peaks that surround it.
- **Formal definition, rendered as a pre-rendered SVG** (`/edwards-polygon.svg`,
  see section 7) styled to read like an academic paper: the higher-neighbour
  set, the per-bearing dominating-neighbour selection, the vertex set, and
  the spherical-area integral.
- **How it differs from Voronoi / Thiessen** (one crisp paragraph): a Voronoi
  or Thiessen boundary falls halfway between points; the Edwards Polygon's
  boundary runs through the higher peaks themselves (they are its vertices).
  It is ego-centric (one summit's region, not a global tessellation), its
  generators are attribute-filtered (only higher peaks qualify), and its
  narrowest radius equals the topographic isolation. It is built on
  established parts (spherical Voronoi / Delaunay neighbours and topographic
  isolation); the named polygon and its use as an isolation region is the
  new bit.
- **Copyable source block:** a `<pre><code>` block containing the LaTeX
  source of the definition, with a "Copy" button (writes to clipboard via
  `navigator.clipboard.writeText`), so others can reproduce it.
- **Extensions** (short list): the same construction applies to all catalogued
  peaks (not just these 40), to submarine seamounts, to base-to-peak height
  instead of sea-level elevation, and to other planetary bodies.
- **A note on the name** (concise, dry, self-deprecating): make explicit this
  is vanity nomenclature, not peer-reviewed; Voronoi and Thiessen did the
  load-bearing maths. Example tone (final wording in the plan): "A note on
  the name: there is no naming committee for polygons, which is precisely how
  this one ended up called the Edwards Polygon. Voronoi and Thiessen did the
  difficult mathematics; the author supplied only the ego."

### 4b. Isolation and higher neighbours

Plain-language: isolation = great-circle distance to the nearest higher
catalogued peak; that is the shortest spoke. Each of 1,440 compass bearings
(every 0.25 degrees) is won by the higher peak that most tightly bounds it;
the winners are the summit's higher neighbours and the polygon's vertices.

### 4c. Reading the map

Spokes run from the summit (hub) to each higher neighbour, coloured by
distance; the nearest is the isolation. The dominance region is the Edwards
Polygon. Web mode shows every summit's spokes at once.

### 4d. Why Aconcagua looks like the whole world with a hole

Aconcagua's higher neighbours are all clustered in one direction (the
Himalaya and Karakoram, thousands of km away across Asia). With no higher
ground in any other direction, its dominance region wraps almost the entire
planet, leaving only a small excluded cap near its antipode. That is why its
Edwards Polygon renders as the world minus a hole, and why it tops the
dominance-area ranking.

### 4e. Data and caveats

GeoNames allCountries (feature codes PK, PKS, MT, VLC, HLL), a
stale-elevation guard (reject listed elevation more than 1000 m above the
DEM where a DEM exists), and two corrected coordinates (Mascarin Peak to
Marion Island; Joe's Hill to Kiritimati). Coverage is thinnest near sea
level and over Antarctica, so a few summits (for example Mawson Peak) reflect
the nearest higher catalogued peak rather than a terrain-traced ridge, and
can differ from the Wikipedia figure.

### 4f. Rendering

MapLibre GL JS, globe or Web Mercator projection, Esri World Imagery,
optional AWS Terrarium 3D terrain.

## 5. Web Mercator toggle

A checkbox `#projection-toggle` "Flat map" beside the "3D terrain" toggle.
`setProjectionMode(flat)` calls `map.setProjection({ type: flat ? 'mercator'
: 'globe' })`. Starts on globe (unchecked). Verified working: spokes, Edwards
Polygon, spotlight, and terrain all reproject. Exposed on `window.__bigfish`
as `setProjectionMode` for the smoke test.

## 6. No em dashes

All new and edited UI/modal copy must use commas, colons, or full stops
instead of em dashes. Also sweep existing user-facing copy (index.html,
src/main.js DOM strings) for any em dashes introduced earlier and replace
them. (Does not apply to code comments or docs.)

## 7. Formula SVG generation (dev-only, committed output)

- `scripts/render-formula.py` (Python, dev-only): renders the Edwards Polygon
  definition from a LaTeX/mathtext string to `public/edwards-polygon.svg`
  using matplotlib mathtext. matplotlib is added to `scripts/.venv` only
  (dev dependency, never shipped, not in the runtime). The SVG is committed;
  the script is re-runnable to regenerate it.
- The committed `public/edwards-polygon.svg` ships via the existing
  `cp('public', dist)` build step; the LaTeX source string is ALSO embedded
  as the copyable block in index.html so the two stay legible together.
- Definition content (both SVG and copyable source), faithful to
  `scripts/cell_geometry.py`:
  - Higher-neighbour set: H(P) = { q : h_q > h_P, delta(P,q) > epsilon }
    (epsilon = 2 km self-exclusion; delta = great-circle angular distance).
  - Per-bearing dominating neighbour: for theta in [0, 2*pi),
    j(theta) = argmin over q in H of rho(theta,q),
    rho(theta,q) = atan2( tan(d_q / 2), cos(theta - alpha_q) ),
    with d_q the angular distance and alpha_q the initial bearing from P to q.
  - Vertices: V = { q in H : exists theta with j(theta) = q } (the summit's
    higher Voronoi/Delaunay neighbours).
  - Edwards Polygon E(P): the spherical polygon with vertices V ordered by
    alpha, edges swept by linear interpolation of bearing and distance from P.
  - Area: A(E) = R^2 * closed-integral over theta of (1 - cos r(theta)) d theta,
    R the Earth radius, r(theta) the boundary distance at bearing theta.
  - Property: min over theta of r(theta) = topographic isolation of P.

## Error handling

- Projection toggle: `setProjection` is synchronous and safe; no failure path
  beyond MapLibre's own handling.
- Formula SVG missing: the copyable LaTeX block still conveys the definition;
  the `<img>` simply shows nothing (acceptable, but the SVG is committed so
  this should not occur).
- Clipboard copy: guard `navigator.clipboard` presence; no-op if unavailable.

## Testing

- **Smoke (extends the real-click script):** rankings row click recenters the
  map (assert `map.getCenter()` moved toward the clicked summit); the panel
  shows a single Isolation row (no "Computed isolation" label); the Wikipedia
  link is present with the correct href; "For the data geeks" opens and
  contains "Edwards Polygon" and the formula image/source; the Flat-map
  toggle switches `getProjection().type` to 'mercator' and back to 'globe';
  no em dash character appears in the panel or modal text content.
- No new pytest (no pipeline/geometry change). `scripts/render-formula.py` is
  dev-only; verify it produces a non-empty SVG when run, but it is not part
  of `npm run build` or CI.

## Out of scope

- Recomputing jailers.json / any geometry or pipeline change.
- Renaming internal ids, the npm package, or `window.__bigfish`.
- The compass-quadrant layer (declined earlier).
- Relaxing the stale-elevation guard for Mawson (declined; left as-is).
