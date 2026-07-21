# The Loneliest Peaks — embedded dominance-region explainer

**Date:** 2026-07-21
**Status:** Approved by Brendon (design review in Claude Code session)
**Builds on:** v2.3 (PR #4 branch `feature/jailers-v2`).

## Purpose

Fold the interactive dominance-region explainer (the top-down radar developed as a
standalone artifact during the geometry Q&A) into the "For the data geeks" panel so
site visitors can build the same intuition: each compass direction is won by the
nearest higher peak, so a higher peak becomes a vertex of the region exactly when it
wins at least one direction. The embedded version adds each higher peak's
**perpendicular bisector** as a visible layer, which is the piece that makes the
construction legible.

## Decisions (from design review)

| Decision | Choice |
|----------|--------|
| Which explainer | The radar (draggable peaks, owned wedges, polygon), with perpendicular bisectors added. |
| Interaction | Bisectors (toggle, default on) + draggable peaks + Reset / Shadow / Spread presets. No hover cue line. |
| Placement | Near the top of `#methodology-dialog`, after the opening "dominance region" paragraph, before the formula figure. |
| Theme | Lock to the app's fixed dark palette. No light-mode / `data-theme` machinery. |
| Copy | Mathematical terms only. No "cushion", "pool", or "cue" wording. No em dashes. |

## Context: the existing app

- Vanilla ES modules served statically (`python3 -m http.server`); **no bundler**.
  `index.html` loads `/src/main.js` as a module, which imports `./rankings.js` and
  `./methodology.js`.
- `#methodology-dialog` is a native `<dialog>` opened via `showModal()` from
  `src/methodology.js` (`initMethodology()` returns `{ open }`). Its body is a
  `.prose-scroll` div (`max-height: 66vh; overflow: auto`).
- The app is single-theme dark: `:root { color: #f8fbff; background: #07111f }`.
  The methodology dialog uses literal hex colours (accent `#8bd3ff`, amber `#ffd166`,
  hairline `rgb(255 255 255 / 8-14%)`, muted `#9fb3c8` / `#c9d8e8`).
- The standalone radar source lives at
  `scratchpad/dominance-explainer.html` (this session) and is the porting base. Its
  geometry (`reach()`, `computeWinners()`, `toArcs()`) matches the real pipeline's
  doubled-bisector construction and is reused verbatim.

## Architecture

One new module, one markup block, one CSS block, and a small wiring change.

### New module: `src/dominance-explainer.js`

- Exports `initDominanceExplainer()`. It:
  - Finds `#dominance-explainer` (the canvas). If absent, returns a no-op
    `{ draw() {} }` so the app never throws when the markup is missing.
  - Holds the peak state, palette constants (hardcoded dark palette, not
    `getComputedStyle`), geometry, drawing, drag handlers, preset buttons, and the
    bisector toggle.
  - Returns `{ draw }` so the caller can force a redraw when the modal opens.
- Geometry (ported unchanged from the artifact):
  - `reach(distDeg, bearingDeg, thetaDeg)` = `min(2·rho, rad(179))` where
    `rho = ((atan2(tan(d/2), cos(theta-alpha)) mod PI) + PI) mod PI`.
  - `computeWinners()` samples `N = 720` bearings; each bearing goes to the peak with
    minimum `reach`; returns per-peak arrays of won bearing indices.
  - `toArcs(idx)` collapses a sorted index list into contiguous arcs with wraparound.
  - Nearest higher neighbour = the surviving peak with the smallest `dist`.
- New drawing layer: **perpendicular bisectors**. For each peak, draw the chord
  perpendicular to its spoke at half its distance (radius `dist/2` mapped through the
  same `DIST_MAX` scale), clipped to the board. Surviving peaks use their colour at
  ~0.5 alpha; shadowed peaks use the muted/shadow colour. Controlled by
  `showBisectors` (default `true`).
- Presets `reset`, `shadow`, `spread`: reuse the artifact's coordinates. `shadow`
  parks "You" directly behind "Alba" to demonstrate a peak winning nothing.
- Palette: a module constant object, e.g.
  `{ ground:'#07111f', panel:'#0d1c30', ink:'#e8eef5', muted:'#9fb3c8',
     hair:'rgba(255,255,255,0.12)', accent:'#48b8ff', amber:'#ffd166',
     shadow:'#6b7a8d', ringlbl:'#6b7f92' }`, plus the existing 8-colour peak
  `PALETTE`.

### Markup (in `index.html`, inside `#methodology-dialog .prose-scroll`)

Inserted immediately after the opening paragraph (`<p>Topographic isolation reduces
a summit ...</p>`) and before `<figure class="formula">`:

```html
<h3>See how a summit picks its higher neighbours</h3>
<p>Looking straight down on a summit (amber, centre). Every other dot is a higher
peak. Each compass direction is awarded to whichever higher peak is nearest that way,
so each surviving peak owns a wedge of directions and becomes a vertex of the region.
The faint line at right angles across each spoke is that peak's perpendicular
bisector. Drag any peak: park it behind a nearer one and it wins nothing; slide it to
the side and it carves out its own wedge.</p>
<div id="dominance-explainer-board" class="de-board">
  <canvas id="dominance-explainer" width="720" height="720"
    aria-label="Top-down diagram of a summit and the higher peaks around it"></canvas>
</div>
<div class="de-controls">
  <button id="de-reset" type="button" class="rankings-button">Reset</button>
  <button id="de-shadow" type="button" class="rankings-button">Show a peak in shadow</button>
  <button id="de-spread" type="button" class="rankings-button">Spread them out</button>
  <button id="de-bisectors" type="button" class="rankings-button" aria-pressed="true">Perpendicular bisectors: on</button>
</div>
<dl class="de-readout" id="de-readout"></dl>
```

The readout is rendered from JS as `<dt>` peak name (+ star for NHN) / `<dd>` bearing,
distance, and degrees owned (or "in shadow").

### CSS (in `src/styles.css`, scoped under the explainer ids/classes)

- `.de-board` panel styling matching the dialog (dark panel, hairline border,
  rounded, small padding).
- `#dominance-explainer` sized `width:100%; height:auto; display:block;
  border-radius:.5rem; touch-action:none; cursor:grab` (`:active` grabbing).
- `.de-controls` flex-wrap row; reuse `.rankings-button` for buttons.
- `.de-readout` two-column grid, tabular-nums, muted labels; a `.de-shadowed`
  modifier greys shadowed rows.

### Wiring (in `src/main.js` and `src/methodology.js`)

- `main.js` imports `initDominanceExplainer`, calls it once during setup, and passes
  its `draw` into methodology so the modal redraws on open:
  - `const explainer = initDominanceExplainer();`
  - `initMethodology({ onOpen: explainer.draw });`
- `methodology.js`: `initMethodology(options = {})` calls `options.onOpen?.()` after
  `dialog.showModal()` in its `open` handler. Everything else (copy-formula) is
  unchanged. This is the fix for the canvas having zero width while the dialog is
  `display:none`.
- The module also registers a `ResizeObserver` on the canvas that calls `draw` when
  the element gains a non-zero box, as a backstop.

## Data flow

`initDominanceExplainer()` builds initial peak state and draws once (a no-op paint
while hidden). On modal open, `onOpen` -> `draw()` runs with a real width. Drag and
preset/toggle events mutate state and call `draw()`. `draw()` computes winners, renders
wedges, rings, bisectors, polygon, spokes, peaks, and the centre summit, then renders
the readout.

## Error handling

- Missing canvas: `initDominanceExplainer` returns `{ draw(){} }`; `main.js` and
  `methodology.js` tolerate a no-op `onOpen`.
- Zero-width canvas (modal closed): `draw()` guards on `canvas.clientWidth > 0` and
  returns early; the open hook and `ResizeObserver` trigger the real paint.
- No 2D context: guard and return.

## Testing

Extend `scripts/smoke-cells.mjs` (real-browser Playwright), adding a block that:

- Clicks `#open-methodology`, waits for `#methodology-dialog[open]`.
- Asserts `#dominance-explainer` exists and, after open, has `clientWidth > 0` and
  `canvas.width > 0` (guards the dialog-sizing gotcha).
- Asserts the four controls exist; clicks `#de-bisectors` and asserts its label/
  `aria-pressed` toggles.
- Clicks `#de-shadow` and asserts `#de-readout` contains at least one row marked
  in shadow (text "in shadow"); clicks `#de-reset` and asserts no row is in shadow.
- Asserts the dialog text contains none of "cushion", "pool", or "cue"
  (case-insensitive).
- Captures a screenshot `scripts/.cache/explainer-embedded.png` for manual visual
  verification (the review must eyeball it, not just trust the assertions).

Existing smoke assertions and the pipeline build are unchanged (no data changes).

## Out of scope

- Any change to the pipeline, `jailers.json`, isolation/NHN/area computation, or the
  formula SVG.
- Light-mode / theme-toggle support for the explainer.
- A hover/aim cue line, sweep animation, or the pool-table framing.
- Renaming internal ids, layer/source ids, `window.__bigfish`, or the npm package.
