import { access, readFile } from 'node:fs/promises';

const requiredFiles = ['index.html', 'src/main.js', 'src/styles.css'];
await Promise.all(requiredFiles.map((file) => access(file)));

const main = await readFile('src/main.js', 'utf8');
for (const expected of ['maplibregl.Map', 'type: \'geojson\'', 'MAX_TILE_ZOOM = 19']) {
  if (!main.includes(expected)) {
    throw new Error(`Missing expected MapLibre implementation detail: ${expected}`);
  }
}
console.log('Static site files and MapLibre configuration validated.');
