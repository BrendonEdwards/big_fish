# The Loneliest Peaks — v2.1 (rename, methodology, Underdog Index, Everest Easter egg)

**Date:** 2026-07-20
**Status:** Approved by Brendon (design review in Claude Code session)
**Builds on:** the Jailers v2 app (PR #4 branch `feature/jailers-v2`).

## Purpose

Polish the app for a punchy public/LinkedIn share and a GIS-literate audience:
rename from "Big Fish" to "The Loneliest Peaks", add a methodology modal for
the technical crowd, add an approachable "Underdog Index" ranking (dominance
per metre of height), and give Everest — which has no higher neighbour on
Earth — a factually-correct off-world Easter egg.

## Decisions (from design review)

| Decision | Choice |
|----------|--------|
| Name | "The Loneliest Peaks" (was "Big Fish") |
| Methodology UI | Modal, same pattern/styling as the Rankings dialog |
| Metric name | "Underdog Index" — playful for wide reach |
| Metric maths | ring area ÷ height, log-normalised to a 0–100 score |
| Metric placement | New sortable column in the Rankings table |
| Everest NHN | Venus's Maxwell Montes (nearest *and* higher), with the "why not Mars/Olympus Mons" explanation |
| Everest in Underdog ranking | Excluded from the log scaling (no ring); shown as "—" |
| Data pipeline | No change — Underdog Index is client-side from existing fields |

## 1. Rename → "The Loneliest Peaks"

Textual rebrand only; no id/class/source/layer names change (they stay
`jailer-*` etc. internally). Update every user-facing string:

- `index.html`: `<title>` → `The Loneliest Peaks — Topographical Isolation`;
  hero `<h1>` "Big Fish" → "The Loneliest Peaks"; keep the eyebrow
  "TOPOGRAPHICAL ISOLATION"; the hero paragraph stays as-is (already generic).
- `scripts/smoke-cells.mjs`: the two `title.includes('Big Fish')` guards →
  `title.includes('Loneliest Peaks')`.
- `README.md`: heading and prose "Big Fish" → "The Loneliest Peaks".
- `package.json` `name` stays `big-fish` (npm package id; not user-facing) to
  avoid churn — note this explicitly so the rename looks intentional, not
  missed. The repo/dir name is out of scope.
- Do NOT rename `window.__bigfish` (smoke + internal hook); leave it, note it
  as an internal name. (Renaming would ripple through every test/script for no
  user benefit — YAGNI.)

No MapLibre label text changes, so no glyph re-fetch needed.

## 2. Methodology modal

A "Methodology" button in the info panel (next to/near the "Rankings" button)
opens a scrollable modal built exactly like the rankings dialog
(`<dialog>` + backdrop-click + Esc close, reusing `#rankings-dialog` CSS
patterns; new id `#methodology-dialog`). New module `src/methodology.js`
exporting `initMethodology()` that wires the open button and close behaviour
(no data needed — static content lives in `index.html`).

Content (static HTML in `index.html`, written for a GIS audience), sections:

- **What this shows** — the 40 most topographically isolated summits on Earth
  (source: Wikipedia "Topographic isolation"). For each, the *jailers* that
  hem it in and its dominance ring.
- **Isolation & jailers** — isolation = great-circle distance to the nearest
  higher point. Here "higher point" = nearest higher *catalogued peak*. A
  *jailer* is a higher peak that guards at least one of 1,440 compass bearings
  (every 0.25°) sampled around the summit; each bearing is won by the higher
  peak with the smallest effective (angular-offset-weighted) distance. The
  nearest higher neighbour (NHN) is the shortest spoke and equals the
  isolation.
- **Dominance ring** — the polygon whose vertices are the jailers, connected in
  bearing order by hub-bearing-interpolated arcs (star-shaped, so it never
  self-intersects); area by closed-form spherical integral. The most isolated
  peaks produce near-global rings (Aconcagua: world minus an antipodal cap).
- **Underdog Index** — ring area (km²) ÷ height (m), log-normalised to 0–100
  across the 39 ranked summits. Rewards modest peaks that dominate vast
  territory per metre of their own height (a 13 m atoll hill scores ~100).
- **Data & caveats** — GeoNames `allCountries` (feature classes/codes
  PK/PKS/MT/VLC/HLL), a stale-elevation guard (reject elevation − DEM > 1000 m
  where DEM > 0), and two datum corrections (Mascarin Peak → Marion Island;
  Joe's Hill → Kiritimati). Coverage is thinnest near sea level, so low-lying
  summits reflect the nearest higher *catalogued* peak, not a DEM-traced ridge.
- **Rendering** — MapLibre GL globe projection, Esri World Imagery, optional
  AWS Terrarium 3D terrain.

## 3. Underdog Index (Rankings column)

Client-side only. In `src/rankings.js`:

- Compute per summit `underdogRaw = ringAreaKm2 / elevationM` when both exist,
  else null.
- Log-normalise across summits with a non-null `underdogRaw` to a 0–100
  `underdogIndex`: `round(100 × (ln(raw) − ln(min)) / (ln(max) − ln(min)))`.
  If only one summit qualifies or min == max, that summit scores 100. Everest
  (no ring → null) and any <3-jailer summit with null ring are excluded from
  the min/max and render as "—".
- Add a `<th data-metric="underdogIndex">Underdog Index</th>` column; make it
  the **default sort** (highest first) so the leaderboard opens on the
  surprise winner. Existing metrics (ring area, jailers, mean spoke,
  isolation) remain sortable.
- Rows are still built from `getRows()` (summits × jailersData); extend the row
  shape with `underdogIndex`. The existing null-metric sort (null → −Infinity)
  already sinks "—" rows to the bottom.

No change to `jailers.json` or the pipeline.

## 4. Everest off-world Easter egg

Everest has no `jailers.json` entry (global high point). In `renderJailerDetails`
(or the Everest branch of the panel), when the selected summit is Everest,
override the panel text:

- **Nearest higher neighbour:** `Maxwell Montes, Venus (~11 km)`
- **Isolation:** `~38 million km (at closest approach)`
- **Notes / a short line:** explain the counterintuitive bit — most people
  (reasonably) assume Mars is our nearest neighbour and picture Olympus Mons
  (the solar system's tallest, ~22 km), but **Venus** makes the closest
  planetary approaches to Earth (~38M km vs Mars's ~55M km) and its Maxwell
  Montes (~11 km) already tops Everest — so Venus, not Mars, holds Everest's
  true nearest *higher* neighbour.

This is presentation-only, hardcoded for the `everest` id; no data model
change. Everest's Underdog Index stays "—" (no ring). Keep the existing
"No jailers — nothing higher" computed-isolation line OR replace it with the
Easter-egg framing — implementation chooses the cleaner panel layout, but the
Maxwell Montes fact and the "why not Olympus Mons" explanation must both be
visible when Everest is selected.

## Error handling

- Methodology modal is static; no failure modes beyond the dialog not existing
  (guard the open wiring like rankings does).
- Underdog Index: null-safe (missing ring/height → "—"); log guarded against
  raw ≤ 0 (can't occur — area and height are positive — but treat non-finite
  results as null defensively).

## Testing

- **Smoke (extends the real-click script):** title assertion updated to
  "Loneliest Peaks"; open the Methodology modal (button → `#methodology-dialog`
  open → backdrop/Esc closes); open Rankings, confirm the Underdog Index column
  exists and is the default sort (first row has the max index), sort by it and
  another metric; select Everest and assert the panel shows "Maxwell Montes"
  and mentions Olympus Mons (the why-not explanation).
- No new pytest (no pipeline/geometry change).

## Out of scope

- The compass-quadrant NHN layer (declined — would dilute the post).
- Renaming the repo, npm package id, or `window.__bigfish` hook.
- Any change to `jailers.json`, the geometry, or the build pipeline.
