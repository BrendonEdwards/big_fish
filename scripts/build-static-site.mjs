import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const outputDirectory = 'dist';
const requiredFiles = ['index.html', 'src/main.js', 'src/styles.css'];

await Promise.all(requiredFiles.map((file) => readFile(file, 'utf8')));
const main = await readFile('src/main.js', 'utf8');
for (const expected of ['maplibregl.Map', 'type: \'geojson\'', 'MAX_TILE_ZOOM = 19', 'const peakData = [', "glyphs: '/fonts/{fontstack}/{range}.pbf'", "'text-font': ['Noto Sans Regular']"]) {
  if (!main.includes(expected)) {
    throw new Error(`Missing expected MapLibre implementation detail: ${expected}`);
  }
}
const peakCount = (main.match(/id: '/g) ?? []).length;
if (peakCount < 40) {
  throw new Error(`Expected at least 40 mapped peaks, found ${peakCount}.`);
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp('index.html', join(outputDirectory, 'index.html'));
await cp('src', join(outputDirectory, 'src'), { recursive: true });
await cp('public', outputDirectory, { recursive: true });

console.log(`Static site files and MapLibre configuration validated in ${outputDirectory}.`);
