import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = fileURLToPath(new URL('./.cache', import.meta.url));
mkdirSync(cacheDir, { recursive: true });
const PORT = 5199;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
let browser;

try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  for (let attempt = 0; ; attempt += 1) {
    try {
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
      break;
    } catch (error) {
      if (attempt >= 20) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  await page.waitForFunction(() => window.__bigfish?.map?.isStyleLoaded?.(), null, { timeout: 30000 });

  await page.evaluate(() => window.__bigfish.selectSummit('kilimanjaro'));
  await page.waitForFunction(
    () => (window.__bigfish.map.getSource('voronoi-cell')?._data?.features?.length ?? 0) > 0,
    null, { timeout: 15000 },
  );
  const peakCount = await page.evaluate(() => window.__bigfish.map.getSource('cell-peaks')._data.features.length);
  if (peakCount < 1) throw new Error('expected contributing peaks for Kilimanjaro');
  const computedText = await page.textContent('#summit-computed');
  if (!/km/.test(computedText)) throw new Error(`unexpected computed isolation text: ${computedText}`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${cacheDir}/smoke-kilimanjaro.png` });

  await page.evaluate(() => window.__bigfish.selectSummit('everest'));
  await page.waitForFunction(
    () => document.querySelector('#summit-computed').textContent.includes('No cell'),
    null, { timeout: 15000 },
  );
  const cellCount = await page.evaluate(() => window.__bigfish.map.getSource('voronoi-cell')._data.features.length);
  if (cellCount !== 0) throw new Error('expected empty cell source for Everest');

  console.log('SMOKE PASS');
} finally {
  await browser?.close();
  server.kill();
}
