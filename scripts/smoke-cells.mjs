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
  if (!title.includes('Big Fish')) throw new Error(`${target} is serving something else: "${title}"`);
  await page.waitForFunction(() => window.__bigfish?.map?.isStyleLoaded?.(), null, { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Markers must actually render (regression: missing glyphs killed the tiles)
  const rendered = await page.evaluate(() => window.__bigfish.map.queryRenderedFeatures({ layers: ['summits'] }).length);
  if (rendered < 3) throw new Error(`expected summit markers rendered at world view, got ${rendered}`);

  // Real click on Kilimanjaro's marker selects it and loads its cell
  await clickSummitMarker(page, 'kilimanjaro', [37.36, -3.07]);
  await expectPanel(page, 'Kilimanjaro');
  await page.waitForFunction(
    () => (window.__bigfish.map.getSource('voronoi-cell')?._data?.features?.length ?? 0) > 0,
    null, { timeout: 15000 },
  );
  const selected = await page.evaluate(() =>
    window.__bigfish.map.getFeatureState({ source: 'summits', id: 'kilimanjaro' }).selected ?? false);
  if (!selected) throw new Error('kilimanjaro not marked selected after marker click');
  const peakCount = await page.evaluate(() => window.__bigfish.map.getSource('cell-peaks')._data.features.length);
  if (peakCount < 1) throw new Error('expected contributing peaks for Kilimanjaro');
  const computedText = await page.textContent('#summit-computed');
  if (!/km/.test(computedText)) throw new Error(`unexpected computed isolation text: ${computedText}`);

  // Clicking elsewhere inside the cell fill keeps the summit selected
  await page.mouse.click(1000, 250);
  await page.waitForTimeout(800);
  const panelAfterCellClick = await page.textContent('#summit-name');
  if (panelAfterCellClick !== 'Kilimanjaro') throw new Error(`cell-fill click changed selection to "${panelAfterCellClick}"`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${cacheDir}/smoke-kilimanjaro.png` });

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

  // Real click on Everest's marker: selectable, but no cell
  await clickSummitMarker(page, 'everest', [86.93, 27.99]);
  await expectPanel(page, 'Mount Everest');
  await page.waitForFunction(
    () => document.querySelector('#summit-computed').textContent.includes('No cell'),
    null, { timeout: 15000 },
  );
  const cellCount = await page.evaluate(() => window.__bigfish.map.getSource('voronoi-cell')._data.features.length);
  if (cellCount !== 0) throw new Error('expected empty cell source for Everest');

  console.log(`SMOKE PASS (${baseUrl ? 'remote: ' + baseUrl : 'local dev server'})`);
} finally {
  await browser?.close();
  server?.kill();
}
