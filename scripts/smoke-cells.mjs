import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Usage: node scripts/smoke-cells.mjs [baseUrl]
// Without baseUrl, serves the repo root on :5199. With baseUrl (e.g. a
// Vercel preview), tests that deployment instead.
// Selection is driven by REAL canvas clicks at projected marker positions —
// the window.__bigfish hook is only used to read map state, never to select.
const baseUrl = process.argv[2] ?? null;
const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = fileURLToPath(new URL('./.cache', import.meta.url));
mkdirSync(cacheDir, { recursive: true });
const PORT = 5199;
const server = baseUrl ? null : spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
let serverExited = false;
server?.on('exit', () => { serverExited = true; });
server?.on('error', () => { serverExited = true; });
let browser;

async function clickSummitMarker(page, summitId, center) {
  await page.evaluate((c) => window.__bigfish.map.jumpTo({ center: c, zoom: 4 }), center);
  await page.waitForTimeout(1500);
  const point = await page.evaluate((id) => {
    const map = window.__bigfish.map;
    const feature = map.getSource('summits')._data.features.find((f) => f.id === id);
    const projected = map.project(feature.geometry.coordinates);
    return { x: projected.x, y: projected.y };
  }, summitId);
  await page.mouse.move(point.x, point.y);
  await page.waitForTimeout(300);
  const cursor = await page.evaluate(() => window.__bigfish.map.getCanvas().style.cursor);
  if (cursor !== 'pointer') throw new Error(`expected pointer cursor over ${summitId}, got "${cursor}"`);
  await page.mouse.click(point.x, point.y);
  return point;
}

async function expectPanel(page, name) {
  await page.waitForFunction(
    (expected) => document.querySelector('#summit-name').textContent === expected,
    name, { timeout: 15000 },
  );
}

try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const target = baseUrl ?? `http://127.0.0.1:${PORT}/`;
  for (let attempt = 0; ; attempt += 1) {
    if (serverExited) throw new Error('dev server failed to start — is port 5199 in use?');
    try {
      await page.goto(target, { waitUntil: 'load' });
      break;
    } catch (error) {
      if (attempt >= 20) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  const title = await page.title();
  if (!title.includes('Loneliest Peaks')) throw new Error(`${target} is serving something else: "${title}"`);
  await page.waitForFunction(() => window.__bigfish?.map?.isStyleLoaded?.(), null, { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Markers must actually render (regression: missing glyphs killed the tiles)
  const rendered = await page.evaluate(() => window.__bigfish.map.queryRenderedFeatures({ layers: ['summits'] }).length);
  if (rendered < 3) throw new Error(`expected summit markers rendered at world view, got ${rendered}`);

  // Real click on Kilimanjaro's marker selects it and loads its spokes
  await clickSummitMarker(page, 'kilimanjaro', [37.36, -3.07]);
  await expectPanel(page, 'Kilimanjaro');
  await page.waitForFunction(
    () => (window.__bigfish.map.getSource('jailer-spokes')?._data?.features?.length ?? 0) > 0,
    null, { timeout: 15000 },
  );
  const selected = await page.evaluate(() =>
    window.__bigfish.map.getFeatureState({ source: 'summits', id: 'kilimanjaro' }).selected ?? false);
  if (!selected) throw new Error('kilimanjaro not marked selected after marker click');
  const peakCount = await page.evaluate(() => window.__bigfish.map.getSource('jailer-points')._data.features.length);
  if (peakCount < 1) throw new Error('expected contributing peaks for Kilimanjaro');
  const computedText = await page.textContent('#summit-isolation');
  if (!/km/.test(computedText)) throw new Error(`unexpected isolation text: ${computedText}`);
  const computedRow = await page.evaluate(() => !!document.querySelector('#summit-computed'));
  if (computedRow) throw new Error('#summit-computed row should be removed');
  const wikiHref = await page.evaluate(() => document.querySelector('.source-link a')?.href);
  if (!/Topographic_isolation/.test(wikiHref ?? '')) throw new Error(`wiki link missing: ${wikiHref}`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${cacheDir}/smoke-kilimanjaro.png` });

  // ring + stats + chips
  const ringCount = await page.evaluate(() => window.__bigfish.map.getSource('jailer-ring')._data.features.length);
  if (ringCount !== 1) throw new Error(`expected 1 ring feature, got ${ringCount}`);
  const maskCount = await page.evaluate(() => window.__bigfish.map.getSource('spotlight-mask')._data.features.length);
  if (maskCount !== 1) throw new Error(`expected 1 spotlight-mask feature for Kilimanjaro, got ${maskCount}`);
  const hasDimLayer = await page.evaluate(() => !!window.__bigfish.map.getLayer('spotlight-dim'));
  if (!hasDimLayer) throw new Error('spotlight-dim layer missing');
  const dimOpacity = await page.evaluate(() => window.__bigfish.map.getPaintProperty('spotlight-dim', 'fill-opacity'));
  if (dimOpacity !== 0.6) throw new Error(`spotlight-dim opacity ${dimOpacity}, expected 0.6`);
  const areaText = await page.textContent('#summit-area');
  if (!/km²/.test(areaText)) throw new Error(`unexpected ring area text: ${areaText}`);
  const chipCount = await page.evaluate(() => document.querySelectorAll('#jailer-chips .jailer-chip').length);
  if (chipCount < 1) throw new Error('expected jailer chips');

  // spotlight validity for a previously-broken large-region summit
  await clickSummitMarker(page, 'mont-blanc', [6.8652, 45.8326]);
  await expectPanel(page, 'Mont Blanc');
  const mbMask = await page.evaluate(() => window.__bigfish.map.getSource('spotlight-mask')._data.features.length);
  if (mbMask !== 1) throw new Error(`expected 1 dimRegion feature for Mont Blanc, got ${mbMask}`);
  const mbDimLayer = await page.evaluate(() => !!window.__bigfish.map.getLayer('spotlight-dim'));
  if (!mbDimLayer) throw new Error('spotlight-dim layer missing for Mont Blanc');

  // rankings: open, re-sort, click through
  await page.click('#open-rankings');
  await page.waitForSelector('#rankings-dialog[open]');
  const activeMetric = await page.evaluate(() => document.querySelector('#rankings-dialog th.active')?.dataset.metric);
  if (activeMetric !== 'underdogIndex') throw new Error(`default sort ${activeMetric}, expected underdogIndex`);
  const topRowName = await page.evaluate(() => document.querySelector('#rankings-dialog tbody tr td:nth-child(2)')?.textContent);
  if (topRowName !== "Joe's Hill") throw new Error(`top underdog row ${topRowName}, expected Joe's Hill`);
  await page.click('#rankings-dialog th[data-metric="jailerCount"]');
  const centerBefore = await page.evaluate(() => window.__bigfish.map.getCenter());
  const clickedName = await page.evaluate(() => {
    const row = document.querySelector('#rankings-dialog tbody tr');
    const name = row.children[1].textContent;
    row.click();
    return name;
  });
  await page.waitForFunction(() => !document.querySelector('#rankings-dialog').open, null, { timeout: 5000 });
  await page.waitForTimeout(1600);
  const centerAfter = await page.evaluate(() => window.__bigfish.map.getCenter());
  if (centerBefore.lng === centerAfter.lng && centerBefore.lat === centerAfter.lat) {
    throw new Error('rankings row click did not recenter the map');
  }
  const panelAfterRanking = await page.textContent('#summit-name');
  if (panelAfterRanking !== clickedName) throw new Error(`rankings selected ${panelAfterRanking}, expected ${clickedName}`);

  // data-geeks modal: dominance region copy, formula image, no em dashes; then flat/globe toggle
  await page.click('#open-methodology');
  await page.waitForSelector('#methodology-dialog[open]');
  const geekText = await page.textContent('#methodology-dialog');
  if (!/dominance region/.test(geekText)) throw new Error('data-geeks modal missing dominance region');
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (/Edwards Polygon/i.test(bodyText)) throw new Error('stale Edwards Polygon text still present');
  if (/rabbit hole/i.test(bodyText)) throw new Error('stale rabbit hole text still present');
  if (geekText.includes('—')) throw new Error('em dash found in data-geeks modal');
  const hasFormula = await page.evaluate(() => !!document.querySelector('#methodology-dialog .formula img'));
  if (!hasFormula) throw new Error('formula image missing');
  const formulaLoaded = await page.evaluate(async () => {
    const img = document.querySelector('#methodology-dialog .formula img');
    if (img.complete) return img.naturalWidth > 0;
    await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
    return img.naturalWidth > 0;
  });
  if (!formulaLoaded) throw new Error('formula image failed to load (check /edwards-polygon.svg path)');
  // embedded dominance-region explainer: sized on open, interactive, math-only copy
  const explainerWidth = await page.evaluate(() => document.querySelector('#dominance-explainer')?.clientWidth ?? 0);
  if (explainerWidth <= 0) throw new Error('dominance explainer canvas has zero width after modal open');
  // backing store must match the displayed size, proving draw() ran on open rather than the static 720 default
  const backingMatches = await page.evaluate(() => {
    const c = document.querySelector('#dominance-explainer');
    const dpr = window.devicePixelRatio || 1;
    return !!c && Math.abs(c.width - c.clientWidth * dpr) <= 2;
  });
  if (!backingMatches) throw new Error('dominance explainer canvas backing store does not match displayed size (draw did not run on open)');
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
  const explainerCopy = await page.textContent('#methodology-dialog');
  if (/cushion|pool|\bcue\b/i.test(explainerCopy)) throw new Error('informal terms (cushion/pool/cue) leaked into the data-geeks copy');
  await page.locator('#dominance-explainer').screenshot({ path: `${cacheDir}/explainer-embedded.png` });
  await page.keyboard.press('Escape');
  const panelText = await page.textContent('#info-panel');
  if (panelText.includes('—')) throw new Error('em dash found in info panel');
  await page.evaluate(() => window.__bigfish.setProjectionMode(true));
  await page.waitForTimeout(800);
  const flat = await page.evaluate(() => window.__bigfish.map.getProjection().type);
  if (flat !== 'mercator') throw new Error(`flat toggle gave ${flat}`);
  await page.evaluate(() => window.__bigfish.setProjectionMode(false));
  await page.waitForTimeout(400);
  const globe = await page.evaluate(() => window.__bigfish.map.getProjection().type);
  if (globe !== 'globe') throw new Error(`globe restore gave ${globe}`);

  // web mode: many spokes, hover highlight filter updates
  await page.evaluate(() => window.__bigfish.setDisplayMode('web'));
  await page.waitForTimeout(500);
  const webSpokes = await page.evaluate(() => window.__bigfish.map.getSource('jailer-spokes')._data.features.length);
  if (webSpokes < 100) throw new Error(`expected many web-mode spokes, got ${webSpokes}`);
  const webMask = await page.evaluate(() => window.__bigfish.map.getSource('spotlight-mask')._data.features.length);
  if (webMask !== 0) throw new Error(`expected no spotlight-mask in web mode, got ${webMask}`);
  // rankings click-through may have selected a different summit and moved the
  // camera — re-click Kilimanjaro's marker so its point is on-screen for the hover check
  await clickSummitMarker(page, 'kilimanjaro', [37.36, -3.07]);
  await page.waitForTimeout(400);
  const hoverFilter = await page.evaluate(() => JSON.stringify(window.__bigfish.map.getFilter('spokes-core-hover')));
  if (!hoverFilter.includes('kilimanjaro')) throw new Error(`hover filter not set: ${hoverFilter}`);
  await page.evaluate(() => window.__bigfish.setDisplayMode('selected'));

  // terrain toggle round-trip
  await page.evaluate(() => window.__bigfish.setTerrainEnabled(true));
  await page.waitForTimeout(1500);
  const terrainOn = await page.evaluate(() => !!window.__bigfish.map.getTerrain());
  if (!terrainOn) throw new Error('terrain did not enable');
  await page.evaluate(() => window.__bigfish.setTerrainEnabled(false));
  const terrainOff = await page.evaluate(() => window.__bigfish.map.getTerrain() === null);
  if (!terrainOff) throw new Error('terrain did not disable');

  // Slider at max: only Everest (exempt) and Aconcagua (16,520 km) remain
  await page.evaluate(() => {
    const slider = document.querySelector('#isolation-filter');
    slider.value = '1000';
    slider.dispatchEvent(new Event('input'));
    window.__bigfish.map.jumpTo({ center: [20, 18], zoom: 1.3 });
  });
  await page.waitForTimeout(2000);
  const visibleIds = await page.evaluate(() =>
    [...new Set(window.__bigfish.map.queryRenderedFeatures({ layers: ['summits'] }).map((f) => f.id))]);
  if (!visibleIds.every((id) => id === 'everest' || id === 'aconcagua')) {
    throw new Error(`slider max should leave only everest/aconcagua, saw: ${visibleIds.join(', ')}`);
  }
  await page.evaluate(() => {
    const slider = document.querySelector('#isolation-filter');
    slider.value = '0';
    slider.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(1000);

  // Real click on Everest's marker: selectable, but no jailers
  await clickSummitMarker(page, 'everest', [86.93, 27.99]);
  await expectPanel(page, 'Mount Everest');
  const spokeCount = await page.evaluate(() => window.__bigfish.map.getSource('jailer-spokes')._data.features.length);
  if (spokeCount !== 0) throw new Error('expected empty spokes source for Everest');
  const everestMask = await page.evaluate(() => window.__bigfish.map.getSource('spotlight-mask')._data.features.length);
  if (everestMask !== 0) throw new Error('expected no spotlight-mask for Everest');
  const nhnText = await page.textContent('#summit-nhn');
  if (!/Maxwell Montes/.test(nhnText)) throw new Error(`Everest NHN text: ${nhnText}`);
  const notesText = await page.textContent('#summit-notes');
  if (!/Olympus Mons/.test(notesText)) throw new Error('Everest notes missing the Olympus Mons explanation');

  // collapse-toggle round-trip for hero and info panel
  for (const selector of ['.hero', '#info-panel']) {
    const button = await page.$(`${selector} .panel-collapse`);
    await button.click();
    const collapsed = await page.evaluate((s) => document.querySelector(s).classList.contains('collapsed'), selector);
    if (!collapsed) throw new Error(`${selector} did not collapse`);
    await button.click();
    const expanded = await page.evaluate((s) => !document.querySelector(s).classList.contains('collapsed'), selector);
    if (!expanded) throw new Error(`${selector} did not expand`);
  }

  console.log(`SMOKE PASS (${baseUrl ? 'remote: ' + baseUrl : 'local dev server'})`);
} finally {
  await browser?.close();
  server?.kill();
}
