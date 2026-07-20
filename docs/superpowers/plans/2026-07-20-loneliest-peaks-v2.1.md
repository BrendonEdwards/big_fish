# The Loneliest Peaks v2.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the app to "The Loneliest Peaks", add a GIS-audience methodology modal, add an approachable log-normalised "Underdog Index" ranking, and give Everest a factually-correct off-world nearest-higher-neighbour Easter egg.

**Architecture:** All changes are front-end and client-side — no pipeline, geometry, or `jailers.json` change. Rename is textual. The methodology modal reuses the rankings `<dialog>` pattern via a new `src/methodology.js`. The Underdog Index is computed in `src/rankings.js` from data already shipped (ring area ÷ height, log-normalised). The Everest Easter egg is presentation-only in `src/main.js`.

**Tech Stack:** Vanilla ES modules + MapLibre GL (existing), Playwright smoke. No new dependencies, no rebuild.

**Spec:** `docs/superpowers/specs/2026-07-20-loneliest-peaks-v2.1-design.md` — read it first.

## Global Constraints

- Branch `feature/jailers-v2` (PR #4). Repo `~/Developer/big_fish`.
- Vanilla ES modules, single quotes, 2-space indent, semicolons. No new deps, no `jailers.json`/pipeline change, no glyph re-fetch (no MapLibre label text changes).
- Rename is textual/user-facing ONLY. Do NOT rename: npm package id `big-fish`, the `window.__bigfish` hook, or any `jailer-*`/`spokes-*`/`ring-*`/`spotlight-*` layer/source id.
- User-facing name is exactly `The Loneliest Peaks`.
- Underdog Index: `underdogRaw = ringAreaKm2 / elevationM` (null if either missing); `underdogIndex = round(100 × (ln(raw) − ln(min)) / (ln(max) − ln(min)))` over summits with a finite positive raw; if only one qualifies or min == max → that summit scores 100; excluded summits (no ring, e.g. Everest) render `—`. Default sort metric becomes `underdogIndex`.
- Everest Easter-egg facts (exact strings): NHN `Maxwell Montes, Venus (~11 km)`; isolation `~38 million km (at closest approach)`; explanation must state Venus makes the closest planetary approaches (~38M km vs Mars ~55M km) and Maxwell Montes already tops Everest, so it — not Mars's Olympus Mons (~22 km, the solar system's tallest) — is Everest's nearest *higher* neighbour.
- Verify each task: `node --check` on changed JS; `npm run build`; `npm run smoke` → SMOKE PASS. One retry allowed on tile flake (report it).
- Every commit message ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Rename to "The Loneliest Peaks"

**Files:**
- Modify: `index.html`, `README.md`, `scripts/smoke-cells.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: page `<title>` and `<h1>` containing "The Loneliest Peaks"; the smoke title guard now matches "Loneliest Peaks".

- [ ] **Step 1: `index.html` title + hero**

Change line 6 `<title>Big Fish — Topographical Isolation</title>` to:
```html
    <title>The Loneliest Peaks — Topographical Isolation</title>
```
Change line 14 `<h1>Big Fish</h1>` to:
```html
        <h1>The Loneliest Peaks</h1>
```
(Leave the eyebrow `Topographical isolation` and the hero paragraph unchanged.)

- [ ] **Step 2: `scripts/smoke-cells.mjs` title guard**

There is one title check: `if (!title.includes('Big Fish')) throw new Error(...)`. Change `'Big Fish'` to `'Loneliest Peaks'` (and update the error message text if it names "Big Fish").

- [ ] **Step 3: `README.md`**

Replace user-facing "Big Fish" occurrences in the heading and prose with "The Loneliest Peaks". Leave any reference to the npm package id / directory as-is (the project dir is still `big_fish`). Run:
`grep -n "Big Fish" README.md` and change each prose hit; confirm none remain except intentional package/path mentions.

- [ ] **Step 4: Verify**

```bash
node --check scripts/smoke-cells.mjs
npm run build
npm run smoke
```
Expected: build validation message; `SMOKE PASS` (the updated title guard now asserts "Loneliest Peaks").

- [ ] **Step 5: Commit**

```bash
git add index.html README.md scripts/smoke-cells.mjs
git commit -m "Rename app to The Loneliest Peaks (user-facing strings)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Underdog Index column in Rankings

**Files:**
- Modify: `src/rankings.js`, `src/main.js`, `index.html`

**Interfaces:**
- Consumes: `getRows()` row objects (currently `{id, name, isolationKm, ringAreaKm2, jailerCount, meanSpokeKm}`) from `src/main.js`.
- Produces: rows additionally carry `underdogIndex` (0–100 int or null); the rankings table has a `data-metric="underdogIndex"` column and defaults to sorting by it.

- [ ] **Step 1: Add `underdogIndex` to the row data in `src/main.js`**

In the `initRankings({ getRows: () => summits.map((summit) => { ... }) })` block, the map currently returns `{ id, name, isolationKm, ringAreaKm2, jailerCount, meanSpokeKm }`. Replace the whole `getRows` with a version that computes the raw ratio, then log-normalises across the set:

```js
    getRows: () => {
      const base = summits.map((summit) => {
        const data = jailersData?.summits?.[summit.id];
        const ringAreaKm2 = data?.ringAreaKm2 ?? null;
        const raw = ringAreaKm2 && summit.elevationM > 0 ? ringAreaKm2 / summit.elevationM : null;
        return {
          id: summit.id, name: summit.name, isolationKm: summit.isolationKm,
          ringAreaKm2,
          jailerCount: data ? data.jailers.length : null,
          meanSpokeKm: data?.meanSpokeKm ?? null,
          underdogRaw: Number.isFinite(raw) && raw > 0 ? raw : null,
        };
      });
      const raws = base.map((row) => row.underdogRaw).filter((value) => value != null);
      const lnMin = Math.log(Math.min(...raws));
      const lnMax = Math.log(Math.max(...raws));
      const span = lnMax - lnMin;
      return base.map((row) => ({
        ...row,
        underdogIndex: row.underdogRaw == null ? null
          : span > 0 ? Math.round(100 * (Math.log(row.underdogRaw) - lnMin) / span) : 100,
      }));
    },
```

- [ ] **Step 2: Render + default-sort the column in `src/rankings.js`**

Change the initial metric from `ringAreaKm2` to the new default:
```js
  let metric = 'underdogIndex';
```
In `render()`, extend the `cells` array to include the index (place it right after `row.name`, so it's the prominent second data column):
```js
      const cells = [index + 1, row.name, format(row.underdogIndex), format(row.ringAreaKm2), row.jailerCount ?? '—', format(row.meanSpokeKm), format(row.isolationKm)];
```
(No other change needed — `format` already renders null as `—`, and the null-metric sort already sinks `—` rows to the bottom.)

- [ ] **Step 3: Add the column header in `index.html`**

In the `#rankings-dialog` `<thead>` row, the columns are `# / Summit / Ring area / Jailers / Mean spoke / Isolation`, with `ringAreaKm2` marked `class="active"`. Insert the Underdog Index header immediately after the `Summit` `<th>` and move the `active` class to it:
```html
          <th data-metric="underdogIndex" class="active">Underdog Index</th>
```
and remove `class="active"` from the `ringAreaKm2` header (`<th data-metric="ringAreaKm2">Ring area (km²)</th>`). Header order must now match the Step 2 cell order: `# / Summit / Underdog Index / Ring area (km²) / Jailers / Mean spoke (km) / Isolation (km)`.

- [ ] **Step 4: Verify**

```bash
node --check src/main.js
node --check src/rankings.js
npm run build
```
Then a quick data sanity check that Joe's Hill tops the index and Everest is null:
```bash
node -e "
const fs=require('fs');
const j=JSON.parse(fs.readFileSync('public/data/jailers.json','utf8')).summits;
const src=fs.readFileSync('src/main.js','utf8');
const peaks=new Function('return '+src.match(/const peakData = (\[[\s\S]*?\n\]);/)[1])();
const raws=peaks.map(p=>{const d=j[p.id];return d&&p.elevationM>0?{id:p.id,raw:d.ringAreaKm2/p.elevationM}:null}).filter(Boolean);
raws.sort((a,b)=>b.raw-a.raw);
console.log('top:',raws[0].id,'| everest in set:', raws.some(r=>r.id==='everest'));
"
```
Expected: `top: joes-hill | everest in set: false`.

- [ ] **Step 5: Commit**

```bash
git add src/rankings.js src/main.js index.html
git commit -m "Add log-normalised Underdog Index as default Rankings sort

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Methodology modal

**Files:**
- Create: `src/methodology.js`
- Modify: `index.html`, `src/main.js`, `src/styles.css`

**Interfaces:**
- Consumes: nothing (static content).
- Produces: `initMethodology()` exported from `src/methodology.js`; DOM `#open-methodology` button and `#methodology-dialog`.

- [ ] **Step 1: `src/methodology.js`**

```js
export function initMethodology() {
  const dialog = document.querySelector('#methodology-dialog');
  const open = () => dialog.showModal();
  document.querySelector('#open-methodology').addEventListener('click', open);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  return { open };
}
```

- [ ] **Step 2: Button in `index.html`**

Immediately after the existing `<button id="open-rankings" ...>Rankings</button>` line, add:
```html
        <button id="open-methodology" type="button" class="rankings-button">Methodology</button>
```

- [ ] **Step 3: Modal markup in `index.html`**

Immediately after the closing `</dialog>` of `#rankings-dialog`, add the methodology dialog (static content, GIS audience):
```html
      <dialog id="methodology-dialog" aria-label="Methodology">
        <h2>Methodology</h2>
        <div class="prose-scroll">
          <h3>What this shows</h3>
          <p>The 40 most topographically isolated summits on Earth (source: Wikipedia, “Topographic isolation”). For each summit you see its <em>jailers</em> — the higher peaks that hem it in — and its dominance ring.</p>
          <h3>Isolation &amp; jailers</h3>
          <p>Topographic isolation is the great-circle distance from a summit to the nearest higher point. Here “higher point” means the nearest higher <em>catalogued peak</em>. A <em>jailer</em> is a higher peak that guards at least one of 1,440 compass bearings (every 0.25°) sampled around the summit; each bearing is won by the higher peak with the smallest angular-offset-weighted distance. The nearest higher neighbour is the shortest spoke, and its length is the isolation.</p>
          <h3>Dominance ring</h3>
          <p>The ring is the polygon whose vertices are the jailers, joined in bearing order by hub-bearing-interpolated arcs, so it is star-shaped and never self-intersects. Its area is computed by a closed-form spherical integral. The most isolated peaks produce near-global rings — Aconcagua’s is the whole world minus a small antipodal cap.</p>
          <h3>Underdog Index</h3>
          <p>Ring area (km²) ÷ summit height (m), log-normalised to a 0–100 score across the ranked summits. It rewards modest peaks that dominate vast territory per metre of their own height — a 13 m atoll high point scores ~100, while towering, equally-dominant giants score far lower.</p>
          <h3>Data &amp; caveats</h3>
          <p>Higher peaks come from the GeoNames <code>allCountries</code> gazetteer (feature codes PK, PKS, MT, VLC, HLL), with a stale-elevation guard (rejecting entries whose listed elevation exceeds the DEM by more than 1,000 m) and two corrected summit coordinates (Mascarin Peak → Marion Island; Joe’s Hill → Kiritimati). Catalogue coverage is thinnest near sea level, so low-lying summits reflect the nearest higher <em>catalogued</em> peak rather than a DEM-traced ridge.</p>
          <h3>Rendering</h3>
          <p>MapLibre GL JS globe projection, Esri World Imagery basemap, optional AWS Terrarium 3D terrain.</p>
        </div>
      </dialog>
```

- [ ] **Step 4: Wire it in `src/main.js`**

At the top, add the import beside the rankings import:
```js
import { initMethodology } from './methodology.js';
```
In the load handler, immediately after the `initRankings({ ... });` call, add:
```js
  initMethodology();
```

- [ ] **Step 5: CSS in `src/styles.css`**

The rankings dialog rules are scoped by `#rankings-dialog`. Add matching rules for the methodology dialog after the existing `#rankings-dialog` block:
```css
#methodology-dialog {
  border: 1px solid rgb(255 255 255 / 14%); border-radius: 1rem; background: rgb(7 17 31 / 96%);
  color: #f8fbff; padding: 1.25rem; width: min(44rem, 92vw);
}
#methodology-dialog::backdrop { background: rgb(0 0 0 / 55%); }
#methodology-dialog .prose-scroll { max-height: 66vh; overflow: auto; }
#methodology-dialog h2 { margin: 0 0 .5rem; }
#methodology-dialog h3 { margin: 1rem 0 .25rem; color: #8bd3ff; font-size: .82rem; letter-spacing: .04em; text-transform: uppercase; }
#methodology-dialog p { margin: 0 0 .5rem; color: #c9d8e8; line-height: 1.5; font-size: .9rem; }
#methodology-dialog code { color: #ffe0a3; }
```

- [ ] **Step 6: Verify**

```bash
node --check src/main.js
node --check src/methodology.js
npm run build
```
Expected: build validates and copies `src/methodology.js` into `dist` (the build's `cp('src', ...)` already covers it).

- [ ] **Step 7: Commit**

```bash
git add src/methodology.js index.html src/main.js src/styles.css
git commit -m "Add GIS-audience methodology modal

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Everest off-world Easter egg

**Files:**
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `renderJailerDetails(summit)` (existing), `#summit-computed` / `#summit-nhn` / `#summit-notes` DOM.
- Produces: Everest-specific panel text (Maxwell Montes / Venus / the why-not-Olympus-Mons explanation).

- [ ] **Step 1: Special-case Everest in `renderJailerDetails`**

`renderJailerDetails` currently sets `#summit-computed` and `#summit-nhn` with a generic Everest branch ("No jailers — nothing higher" / "None — global high point"). Add an explicit Everest branch at the TOP of the function body (right after `const data = ...`), before the existing generic lines, so Everest gets the Easter egg and returns early:

```js
  if (summit.id === 'everest') {
    document.querySelector('#summit-computed').textContent = '~38 million km (at closest approach)';
    document.querySelector('#summit-nhn').textContent = 'Maxwell Montes, Venus (~11 km)';
    document.querySelector('#summit-area').textContent = '—';
    document.querySelector('#summit-mean-spoke').textContent = '—';
    document.querySelector('#summit-notes').textContent =
      'Nothing on Earth is higher, so Everest’s nearest higher neighbour is off-world. '
      + 'Most people picture Mars and Olympus Mons (~22 km, the solar system’s tallest), '
      + 'but Venus makes the closest planetary approaches to Earth (~38M km vs Mars’s ~55M km), '
      + 'and its Maxwell Montes (~11 km) already tops Everest — so Venus, not Mars, holds the title.';
    document.querySelector('#jailer-chips').replaceChildren();
    return;
  }
```

(`#summit-notes` is otherwise set by `selectSummit` from `peakData` notes; this override is fine because `renderJailerDetails` runs after selection. Everest's existing `peakData` note remains the fallback for any non-Everest path — unchanged.)

- [ ] **Step 2: Verify**

```bash
node --check src/main.js
npm run build
npm run smoke
```
Expected: `SMOKE PASS` (the smoke's existing Everest step selects Everest; the panel now shows the Easter egg — the current smoke only asserts empty spokes, which still holds; the text assertions are added in Task 5).

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "Add Everest off-world nearest-higher-neighbour easter egg (Maxwell Montes)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Smoke coverage for v2.1 + final verification

**Files:**
- Modify: `scripts/smoke-cells.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: `#open-methodology`/`#methodology-dialog`, the Underdog Index column, Everest panel text.

- [ ] **Step 1: Methodology modal assertions**

In `scripts/smoke-cells.mjs`, after the rankings click-through block (before the web-mode switch), add:
```js
  // methodology modal opens and closes
  await page.click('#open-methodology');
  await page.waitForSelector('#methodology-dialog[open]');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#methodology-dialog').open, null, { timeout: 5000 });
```

- [ ] **Step 2: Underdog Index default-sort assertion**

In the existing rankings block (where the dialog is opened and a row is clicked), before clicking a row, assert the Underdog Index column exists and is the active default sort, and that the top row is Joe's Hill:
```js
  const activeMetric = await page.evaluate(() => document.querySelector('#rankings-dialog th.active')?.dataset.metric);
  if (activeMetric !== 'underdogIndex') throw new Error(`default sort ${activeMetric}, expected underdogIndex`);
  const topRowName = await page.evaluate(() => document.querySelector('#rankings-dialog tbody tr td:nth-child(2)')?.textContent);
  if (topRowName !== "Joe's Hill") throw new Error(`top underdog row ${topRowName}, expected Joe's Hill`);
```
(Place these right after `await page.waitForSelector('#rankings-dialog[open]')` and before any re-sort/row-click already in that block.)

- [ ] **Step 3: Everest Easter-egg assertion**

In the Everest block (after selecting Everest), add:
```js
  const nhnText = await page.textContent('#summit-nhn');
  if (!/Maxwell Montes/.test(nhnText)) throw new Error(`Everest NHN text: ${nhnText}`);
  const notesText = await page.textContent('#summit-notes');
  if (!/Olympus Mons/.test(notesText)) throw new Error('Everest notes missing the Olympus Mons explanation');
```

- [ ] **Step 4: README feature note**

Add a short line to the README's feature section noting the Methodology modal and Underdog Index (one sentence each), so the docs match the app.

- [ ] **Step 5: Full verification**

```bash
node --check src/main.js && node --check src/rankings.js && node --check src/methodology.js
npm run build && ls dist/src/methodology.js
npm run smoke
```
Expected: all `node --check` clean; build validates and `dist/src/methodology.js` exists; `SMOKE PASS` exercising the new methodology, Underdog-default-sort, and Everest assertions.

- [ ] **Step 6: Commit**

```bash
git add scripts/smoke-cells.mjs README.md
git commit -m "Extend smoke test for methodology modal, Underdog Index, and Everest easter egg

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
