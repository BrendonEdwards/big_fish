# Embedded Dominance-Region Explainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed the interactive dominance-region radar (draggable higher peaks, owned wedges, polygon, perpendicular bisectors) into the "For the data geeks" panel of The Loneliest Peaks.

**Architecture:** One new vanilla ES module `src/dominance-explainer.js` draws and drives a `<canvas>` placed in the existing `#methodology-dialog`. `main.js` instantiates it and hands its `draw` to `initMethodology` so the modal redraws on open (the canvas has zero width while the `<dialog>` is `display:none`). No bundler, no data-pipeline change.

**Tech Stack:** Plain ES modules served by `python3 -m http.server`; HTML5 canvas 2D; Playwright smoke test.

## Global Constraints

- App is single-theme dark. Do NOT add light-mode or `data-theme` machinery to the explainer; use the app's dark palette.
- User-facing copy uses mathematical terms only. Do NOT use the words "cushion", "pool", or "cue" anywhere in the app.
- No em dashes anywhere in user-facing copy.
- Do NOT rename internal ids, layer/source ids, `window.__bigfish`, or the npm package.
- No change to the pipeline, `public/data/jailers.json`, isolation/NHN/area computation, or `public/edwards-polygon.svg`.
- Every git commit message ends with the trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Work on the existing branch `feature/jailers-v2`.

---

### Task 1: Markup and styles for the explainer

**Files:**
- Modify: `index.html` (insert inside `#methodology-dialog .prose-scroll`, between the opening paragraph at line 78 and `<figure class="formula">` at line 79)
- Modify: `src/styles.css` (append explainer styles)

**Interfaces:**
- Produces: DOM ids consumed by Task 2 — `#dominance-explainer` (canvas), `#de-readout` (dl), and buttons `#de-reset`, `#de-shadow`, `#de-spread`, `#de-bisectors`. CSS classes `.de-board`, `.de-controls`, `.de-readout`, `.de-shadowed`, `.de-swatch`.

- [ ] **Step 1: Insert the markup in `index.html`**

Find this existing block (lines 77-79):

```html
          <h3>The dominance region</h3>
          <p>Topographic isolation reduces a summit to a single number: the distance to its nearest higher neighbour. The dominance region generalises that number into a two dimensional region, the ground a summit owns before higher terrain takes over, bounded by the higher peaks that surround it.</p>
          <figure class="formula"><img src="/edwards-polygon.svg" alt="Dominance region formal definition" /></figure>
```

Insert the following between the `</p>` and the `<figure ...>` line, so it reads paragraph, then explainer, then figure:

```html
          <h3>See how a summit picks its higher neighbours</h3>
          <p>Looking straight down on a summit (amber, centre). Every other dot is a higher peak. Each compass direction is awarded to whichever higher peak is nearest that way, so each surviving peak owns a wedge of directions and becomes a vertex of the region. The faint line at right angles across each spoke is that peak's perpendicular bisector, the halfway boundary the direction has to reach it. Drag any peak: park it behind a nearer one and it wins nothing; slide it to the side and it carves out its own wedge.</p>
          <div id="dominance-explainer-board" class="de-board">
            <canvas id="dominance-explainer" width="720" height="720" aria-label="Top-down diagram of a summit and the higher peaks around it"></canvas>
          </div>
          <div class="de-controls">
            <button id="de-reset" type="button" class="rankings-button">Reset</button>
            <button id="de-shadow" type="button" class="rankings-button">Show a peak in shadow</button>
            <button id="de-spread" type="button" class="rankings-button">Spread them out</button>
            <button id="de-bisectors" type="button" class="rankings-button" aria-pressed="true">Perpendicular bisectors: on</button>
          </div>
          <dl class="de-readout" id="de-readout"></dl>
```

- [ ] **Step 2: Append the styles in `src/styles.css`**

Add at the end of the file (the global `dt`/`dd` rules use uppercase and letter-spacing, so `.de-readout` must override them explicitly):

```css
.de-board {
  margin: .75rem 0;
  padding: .6rem;
  background: rgb(255 255 255 / 4%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: .6rem;
}
#dominance-explainer {
  width: 100%;
  height: auto;
  display: block;
  border-radius: .5rem;
  touch-action: none;
  cursor: grab;
}
#dominance-explainer:active { cursor: grabbing; }
.de-controls { display: flex; flex-wrap: wrap; gap: .5rem; margin: 0 0 .6rem; }
.de-readout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: .25rem .75rem;
  margin: 0 0 .5rem;
  font-size: .8rem;
  font-variant-numeric: tabular-nums;
}
.de-readout dt {
  display: flex;
  align-items: center;
  margin: 0;
  color: #e8eef5;
  font-size: .8rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}
.de-readout dd { margin: 0; color: #9fb3c8; }
.de-readout .de-shadowed { color: #6b7a8d; }
.de-swatch { display: inline-block; width: .62rem; height: .62rem; border-radius: 2px; margin-right: .45rem; }
```

- [ ] **Step 3: Verify no regression and that the markup renders**

Run: `cd ~/Developer/big_fish && node scripts/smoke-cells.mjs`
Expected: `SMOKE PASS (local dev server)` (the existing modal assertions still pass; the new canvas is present but blank until Task 2).

Then confirm the new elements exist:
Run: `grep -c 'id="dominance-explainer"' index.html && grep -c 'de-readout' src/styles.css`
Expected: `1` then `1`.

- [ ] **Step 4: Commit**

```bash
cd ~/Developer/big_fish
git add index.html src/styles.css
git commit -m "Add data-geeks explainer markup and styles

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Explainer module and modal wiring

**Files:**
- Create: `src/dominance-explainer.js`
- Modify: `src/methodology.js` (accept an `onOpen` callback)
- Modify: `src/main.js` (import the explainer, instantiate it, pass `draw` to `initMethodology`)

**Interfaces:**
- Consumes: DOM ids from Task 1 (`#dominance-explainer`, `#de-readout`, `#de-reset`, `#de-shadow`, `#de-spread`, `#de-bisectors`).
- Produces: `initDominanceExplainer(): { draw: () => void }` (exported from `src/dominance-explainer.js`). `initMethodology(options?: { onOpen?: () => void }): { open: () => void }` (updated signature; still returns `{ open }`).

- [ ] **Step 1: Create `src/dominance-explainer.js`**

```js
// Interactive schematic for the "For the data geeks" panel. Looking straight
// down on a summit: each compass direction is won by the nearest higher peak
// (doubled-bisector reach, matching the pipeline), so a peak becomes a vertex
// when it wins at least one direction. Locked to the app's dark palette.

const DIST_MAX = 62; // degrees mapped to the board rim
const N = 720;       // sampled bearings
const PALETTE = ['#48b8ff', '#4bd4c0', '#c58cf0', '#ff8fa3', '#8ec36b', '#f0b24b', '#7aa7ff', '#e07a5f'];
const COLORS = {
  ink: '#e8eef5', muted: '#9fb3c8', hair: 'rgba(255,255,255,0.12)',
  accent: '#48b8ff', amber: '#ffd166', shadow: '#6b7a8d', ringlbl: '#6b7f92', ground: '#07111f',
};

const PRESETS = {
  reset: [
    { name: 'Alba', bearing: 20, dist: 22 },
    { name: 'Brant', bearing: 95, dist: 30 },
    { name: 'Corrie', bearing: 158, dist: 18 },
    { name: 'Drum', bearing: 232, dist: 40 },
    { name: 'Esk', bearing: 300, dist: 26 },
    { name: 'You', bearing: 55, dist: 45 },
  ],
  shadow: [
    { name: 'Alba', bearing: 20, dist: 22 },
    { name: 'Brant', bearing: 95, dist: 30 },
    { name: 'Corrie', bearing: 158, dist: 18 },
    { name: 'Drum', bearing: 232, dist: 40 },
    { name: 'Esk', bearing: 300, dist: 26 },
    { name: 'You', bearing: 22, dist: 46 }, // parked directly behind Alba
  ],
  spread: [
    { name: 'Alba', bearing: 15, dist: 30 },
    { name: 'Brant', bearing: 80, dist: 30 },
    { name: 'Corrie', bearing: 145, dist: 30 },
    { name: 'Drum', bearing: 210, dist: 30 },
    { name: 'Esk', bearing: 275, dist: 30 },
    { name: 'You', bearing: 340, dist: 30 },
  ],
};

export function initDominanceExplainer() {
  const canvas = document.querySelector('#dominance-explainer');
  if (!canvas) return { draw() {} };
  const ctx = canvas.getContext('2d');
  if (!ctx) return { draw() {} };
  const readout = document.querySelector('#de-readout');

  let peaks = clone(PRESETS.reset);
  let showBisectors = true;
  let cx = 0, cy = 0, R = 0;

  function clone(preset) { return preset.map((q, i) => ({ ...q, color: PALETTE[i % PALETTE.length] })); }
  const rad = (d) => (d * Math.PI) / 180;

  function reach(distDeg, bearingDeg, thetaDeg) {
    const d = rad(distDeg), a = rad(bearingDeg), t = rad(thetaDeg);
    let rho = Math.atan2(Math.tan(d / 2), Math.cos(t - a));
    rho = ((rho % Math.PI) + Math.PI) % Math.PI;
    return Math.min(2 * rho, rad(179));
  }

  function computeWinners() {
    const owned = peaks.map(() => []);
    for (let k = 0; k < N; k++) {
      const theta = (k / N) * 360;
      let best = Infinity, bi = -1;
      for (let i = 0; i < peaks.length; i++) {
        const r = reach(peaks[i].dist, peaks[i].bearing, theta);
        if (r < best) { best = r; bi = i; }
      }
      owned[bi].push(k);
    }
    return owned;
  }

  function toArcs(idx) {
    if (!idx.length) return [];
    const runs = [];
    let start = idx[0], prev = idx[0];
    for (let m = 1; m < idx.length; m++) {
      if (idx[m] !== prev + 1) { runs.push([start, prev]); start = idx[m]; }
      prev = idx[m];
    }
    runs.push([start, prev]);
    if (runs.length > 1 && runs[0][0] === 0 && runs[runs.length - 1][1] === N - 1) {
      const last = runs.pop();
      runs[0][0] = last[0] - N;
    }
    return runs;
  }

  function polar(bearingDeg, distDeg) {
    const rr = (Math.min(distDeg, DIST_MAX) / DIST_MAX) * R;
    const ang = rad(bearingDeg - 90);
    return [cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)];
  }
  function polarRim(bearingDeg, r) {
    const ang = rad(bearingDeg - 90);
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  }
  function hexA(hex, a) {
    const n = hex.replace('#', '');
    const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function draw() {
    const size = canvas.clientWidth;
    if (!size) return; // dialog still display:none — redraw on open / resize
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = size / 2; cy = size / 2; R = size / 2 - 34;
    ctx.clearRect(0, 0, size, size);

    const owned = computeWinners();
    const arcs = owned.map(toArcs);
    const winners = peaks.map((_, i) => owned[i].length > 0);
    let nhn = -1, nd = Infinity;
    peaks.forEach((p, i) => { if (winners[i] && p.dist < nd) { nd = p.dist; nhn = i; } });

    // owned wedges to the rim
    peaks.forEach((p, i) => {
      arcs[i].forEach(([a0, a1]) => {
        const s = rad((a0 / N) * 360 - 90), e = rad(((a1 + 1) / N) * 360 - 90);
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, s, e); ctx.closePath();
        ctx.fillStyle = hexA(p.color, 0.14); ctx.fill();
      });
    });

    // distance rings + labels
    ctx.font = '11px Inter, system-ui, sans-serif';
    [15, 30, 45, 60].forEach((dg) => {
      const rr = (dg / DIST_MAX) * R;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 2 * Math.PI);
      ctx.strokeStyle = COLORS.hair; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = COLORS.ringlbl; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`${dg}° · ${(dg * 111).toLocaleString()} km`, cx + 4, cy - rr);
    });
    // bearing ticks
    ctx.fillStyle = COLORS.muted; ctx.textAlign = 'center';
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([lbl, b]) => {
      const [x, y] = polarRim(b, R + 16);
      ctx.textBaseline = 'middle'; ctx.fillText(lbl, x, y);
    });

    // perpendicular bisectors (half distance, perpendicular to each spoke)
    if (showBisectors) {
      peaks.forEach((p, i) => {
        const rr = (Math.min(p.dist, DIST_MAX) / DIST_MAX) * R;
        const half = rr / 2;
        const ang = rad(p.bearing - 90);
        const mx = cx + half * Math.cos(ang), my = cy + half * Math.sin(ang);
        const px = -Math.sin(ang), py = Math.cos(ang);
        const chord = Math.sqrt(Math.max(0, R * R - half * half));
        const hl = Math.min(chord, R * 0.45);
        ctx.beginPath();
        ctx.moveTo(mx - px * hl, my - py * hl);
        ctx.lineTo(mx + px * hl, my + py * hl);
        ctx.strokeStyle = winners[i] ? hexA(p.color, 0.45) : hexA(COLORS.shadow, 0.4);
        ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      });
    }

    // dominance polygon through survivors in bearing order
    const surv = peaks.map((p, i) => ({ p, i })).filter((o) => winners[o.i]).sort((a, b) => a.p.bearing - b.p.bearing);
    if (surv.length >= 3) {
      ctx.beginPath();
      surv.forEach((o, j) => { const [x, y] = polar(o.p.bearing, o.p.dist); j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.closePath();
      ctx.strokeStyle = hexA(COLORS.accent, 0.9); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = hexA(COLORS.accent, 0.05); ctx.fill();
    }

    // spokes + peaks
    peaks.forEach((p, i) => {
      const [x, y] = polar(p.bearing, p.dist);
      const on = winners[i];
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y);
      ctx.setLineDash(on ? [] : [4, 4]);
      ctx.strokeStyle = on ? hexA(p.color, 0.75) : hexA(COLORS.shadow, 0.7);
      ctx.lineWidth = i === nhn ? 2.4 : 1.2; ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x, y, on ? 7 : 6, 0, 2 * Math.PI);
      ctx.fillStyle = on ? p.color : COLORS.shadow; ctx.fill();
      if (i === nhn) { ctx.lineWidth = 2.5; ctx.strokeStyle = COLORS.amber; ctx.stroke(); }
      ctx.fillStyle = on ? COLORS.ink : COLORS.shadow; ctx.font = '600 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(p.name + (i === nhn ? ' (nearest)' : ''), x, y - 10);
    });

    // target summit
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
    ctx.fillStyle = COLORS.amber; ctx.fill();
    ctx.strokeStyle = COLORS.ground; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = COLORS.ink; ctx.font = '600 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('This summit', cx, cy + 12);

    renderReadout(arcs, winners, nhn);
  }

  function renderReadout(arcs, winners, nhn) {
    if (!readout) return;
    readout.innerHTML = '';
    peaks.map((p, i) => ({ p, i })).sort((a, b) => a.p.bearing - b.p.bearing).forEach(({ p, i }) => {
      const degOwned = (arcs[i].reduce((s, [a0, a1]) => s + (a1 - a0 + 1), 0) / N) * 360;
      const dt = document.createElement('dt');
      dt.innerHTML = `<span class="de-swatch" style="background:${winners[i] ? p.color : '#8899aa'}"></span>${p.name}${i === nhn ? ' ★' : ''}`;
      const dd = document.createElement('dd');
      const stem = `${p.bearing.toFixed(0)}° bearing · ${p.dist.toFixed(0)}° (${(p.dist * 111).toLocaleString()} km) · `;
      dd.textContent = winners[i] ? `${stem}owns ${degOwned.toFixed(0)}°` : `${stem}in shadow`;
      if (!winners[i]) { dt.classList.add('de-shadowed'); dd.classList.add('de-shadowed'); }
      readout.appendChild(dt); readout.appendChild(dd);
    });
  }

  // dragging
  let dragging = -1;
  function pointerPos(ev) { const r = canvas.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; }
  function pick(pxv, pyv) {
    for (let i = 0; i < peaks.length; i++) {
      const [x, y] = polar(peaks[i].bearing, peaks[i].dist);
      if (Math.hypot(pxv - x, pyv - y) < 16) return i;
    }
    return -1;
  }
  canvas.addEventListener('pointerdown', (ev) => {
    const [pxv, pyv] = pointerPos(ev);
    dragging = pick(pxv, pyv);
    if (dragging >= 0) canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (dragging < 0) return;
    const [pxv, pyv] = pointerPos(ev);
    const dx = pxv - cx, dy = pyv - cy;
    const bearing = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
    const dist = (Math.hypot(dx, dy) / R) * DIST_MAX;
    peaks[dragging].bearing = bearing;
    peaks[dragging].dist = Math.max(6, Math.min(DIST_MAX, dist));
    draw();
  });
  canvas.addEventListener('pointerup', () => { dragging = -1; });
  canvas.addEventListener('pointercancel', () => { dragging = -1; });

  // presets + toggle
  document.querySelector('#de-reset')?.addEventListener('click', () => { peaks = clone(PRESETS.reset); draw(); });
  document.querySelector('#de-shadow')?.addEventListener('click', () => { peaks = clone(PRESETS.shadow); draw(); });
  document.querySelector('#de-spread')?.addEventListener('click', () => { peaks = clone(PRESETS.spread); draw(); });
  const bis = document.querySelector('#de-bisectors');
  bis?.addEventListener('click', () => {
    showBisectors = !showBisectors;
    bis.textContent = `Perpendicular bisectors: ${showBisectors ? 'on' : 'off'}`;
    bis.setAttribute('aria-pressed', String(showBisectors));
    draw();
  });

  const ro = new ResizeObserver(() => draw());
  ro.observe(canvas);
  window.addEventListener('resize', draw);

  draw();
  return { draw };
}
```

- [ ] **Step 2: Update `src/methodology.js` to accept an `onOpen` callback**

Replace the whole file with:

```js
export function initMethodology(options = {}) {
  const dialog = document.querySelector('#methodology-dialog');
  const open = () => { dialog.showModal(); options.onOpen?.(); };
  document.querySelector('#open-methodology').addEventListener('click', open);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  const copyButton = document.querySelector('#copy-formula');
  copyButton?.addEventListener('click', async () => {
    const source = document.querySelector('#formula-source')?.textContent ?? '';
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(source).catch(() => {});
    const original = copyButton.textContent;
    copyButton.textContent = 'Copied';
    window.setTimeout(() => { copyButton.textContent = original; }, 1500);
  });
  return { open };
}
```

- [ ] **Step 3: Wire it up in `src/main.js`**

At the top of `src/main.js`, after the existing line `import { initMethodology } from './methodology.js';` (line 2), add:

```js
import { initDominanceExplainer } from './dominance-explainer.js';
```

Then find the call `initMethodology();` (near line 311) and replace it with:

```js
  const dominanceExplainer = initDominanceExplainer();
  initMethodology({ onOpen: dominanceExplainer.draw });
```

- [ ] **Step 4: Verify in a real browser via the smoke test (no regression) and manually**

Run: `cd ~/Developer/big_fish && node scripts/smoke-cells.mjs`
Expected: `SMOKE PASS (local dev server)` (existing modal assertions still pass; the module now draws on open without throwing).

Manual check: `npm run dev`, open `http://127.0.0.1:5173/`, click "For the data geeks". Confirm the radar renders at full width inside the modal, dragging a peak updates the wedges and readout, "Show a peak in shadow" marks a peak `in shadow`, and "Perpendicular bisectors: on/off" toggles the dashed bisector lines and its own label.

- [ ] **Step 5: Commit**

```bash
cd ~/Developer/big_fish
git add src/dominance-explainer.js src/methodology.js src/main.js
git commit -m "Embed interactive dominance-region explainer in the data-geeks panel

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Smoke coverage and screenshot for the explainer

**Files:**
- Modify: `scripts/smoke-cells.mjs` (extend the existing data-geeks modal block)

**Interfaces:**
- Consumes: the DOM from Tasks 1-2 (`#dominance-explainer`, `#de-readout`, `#de-shadow`, `#de-reset`, `#de-bisectors`) and the existing `#methodology-dialog[open]` state.

- [ ] **Step 1: Add explainer assertions in the modal block**

In `scripts/smoke-cells.mjs`, the data-geeks modal is opened at line 137-138 and closed with `page.keyboard.press('Escape')` at line 154. Insert the following block immediately BEFORE the `await page.keyboard.press('Escape');` line (so the modal is still open):

```js
  // embedded dominance-region explainer: sized on open, interactive, math-only copy
  const explainerWidth = await page.evaluate(() => document.querySelector('#dominance-explainer')?.clientWidth ?? 0);
  if (explainerWidth <= 0) throw new Error('dominance explainer canvas has zero width after modal open');
  const explainerBacking = await page.evaluate(() => document.querySelector('#dominance-explainer')?.width ?? 0);
  if (explainerBacking <= 0) throw new Error('dominance explainer canvas was never drawn (backing width 0)');
  for (const id of ['#de-reset', '#de-shadow', '#de-spread', '#de-bisectors']) {
    const present = await page.evaluate((s) => !!document.querySelector(s), id);
    if (!present) throw new Error(`explainer control ${id} missing`);
  }
  await page.click('#de-shadow');
  await page.waitForTimeout(150);
  const shadowRows = await page.evaluate(() => document.querySelector('#de-readout').textContent.match(/in shadow/g)?.length ?? 0);
  if (shadowRows < 1) throw new Error('explainer "Show a peak in shadow" produced no shadowed row');
  await page.click('#de-reset');
  await page.waitForTimeout(150);
  const resetShadow = await page.evaluate(() => document.querySelector('#de-readout').textContent.includes('in shadow'));
  if (resetShadow) throw new Error('explainer Reset should leave no shadowed peaks');
  const bisBefore = await page.evaluate(() => document.querySelector('#de-bisectors').getAttribute('aria-pressed'));
  await page.click('#de-bisectors');
  const bisAfter = await page.evaluate(() => document.querySelector('#de-bisectors').getAttribute('aria-pressed'));
  if (bisBefore === bisAfter) throw new Error('bisectors toggle did not flip aria-pressed');
  await page.click('#de-bisectors'); // restore default (on)
  if (/cushion|pool|\bcue\b/i.test(geekText)) throw new Error('informal terms (cushion/pool/cue) leaked into the data-geeks copy');
  await page.screenshot({ path: `${cacheDir}/explainer-embedded.png` });
```

Note: `geekText` is already captured at line 139 (`const geekText = await page.textContent('#methodology-dialog');`) and includes the explainer copy, so the term check reuses it.

- [ ] **Step 2: Run the smoke test**

Run: `cd ~/Developer/big_fish && node scripts/smoke-cells.mjs`
Expected: `SMOKE PASS (local dev server)`.

- [ ] **Step 3: Eyeball the screenshot**

Open `scripts/.cache/explainer-embedded.png` and confirm the radar is fully drawn inside the modal (summit centre, labelled peaks, coloured wedges, the dominance polygon, dashed perpendicular bisectors, distance rings and N/E/S/W ticks), not blank or clipped.

- [ ] **Step 4: Commit**

```bash
cd ~/Developer/big_fish
git add scripts/smoke-cells.mjs
git commit -m "Extend smoke: embedded dominance-region explainer

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Radar with wedges/polygon/bisectors, draggable peaks, presets, toggle default on → Task 2 module. ✓
- Placement near top of modal before formula → Task 1 markup insertion point. ✓
- Dark-only palette, no theme machinery → Task 2 `COLORS` constant, no `getComputedStyle`. ✓
- Math-only copy, no cushion/pool/cue, no em dashes → Task 1 copy + Task 3 assertion. ✓
- Wiring redraws on open (zero-width gotcha) → Task 2 `onOpen` + `draw()` size guard + `ResizeObserver`. ✓
- No-op guard when canvas/context missing → Task 2 early returns. ✓
- Smoke: canvas sized on open, controls, toggle, shadow/reset, no forbidden terms, screenshot → Task 3. ✓
- No pipeline/data/svg change; no id/`__bigfish`/package renames → nothing in any task touches these. ✓

**Placeholder scan:** No TBD/TODO; every code step contains complete code. ✓

**Type/name consistency:** `initDominanceExplainer` returns `{ draw }`; `main.js` passes `dominanceExplainer.draw` to `initMethodology({ onOpen })`; `methodology.js` calls `options.onOpen?.()`. DOM ids (`#dominance-explainer`, `#de-readout`, `#de-reset`, `#de-shadow`, `#de-spread`, `#de-bisectors`) match across Tasks 1-3. ✓
