import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

// Vendors the Noto Sans Regular glyph PBF ranges needed by every label the
// app can render (summit names, contributing-peak names, elevation text).
// Missing glyph ranges 404 and MapLibre then drops the WHOLE tile — circles
// included — so public/fonts must cover exactly this closed character set.
// Re-run after regenerating cells: node scripts/fetch-glyphs.mjs
const GLYPH_HOST = 'https://demotiles.maplibre.org/font/Noto Sans Regular';
const outDir = new URL('../public/fonts/Noto Sans Regular/', import.meta.url);

const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const peaks = new Function(`return ${src.match(/const peakData = (\[[\s\S]*?\n\]);/)[1]};`)();
let text = peaks.map((peak) => peak.name).join('') + '0123456789 ·m';
const jailersPath = new URL('../public/data/jailers.json', import.meta.url);
const jailersData = JSON.parse(readFileSync(jailersPath, 'utf8'));
for (const entry of Object.values(jailersData.summits)) {
  for (const jailer of entry.jailers) text += jailer.name;
}

const ranges = new Set([0]);
for (const ch of text) ranges.add(Math.floor(ch.codePointAt(0) / 256));
mkdirSync(outDir, { recursive: true });
for (const range of [...ranges].sort((a, b) => a - b)) {
  const name = `${range * 256}-${range * 256 + 255}.pbf`;
  const response = await fetch(`${GLYPH_HOST}/${name}`);
  if (!response.ok) throw new Error(`glyph fetch failed: ${name} → ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.subarray(0, 32).includes(Buffer.from('<!DOCTYPE'))) throw new Error(`glyph host returned HTML for ${name}`);
  writeFileSync(new URL(name, outDir), bytes);
  console.log(`wrote public/fonts/Noto Sans Regular/${name} (${bytes.length} bytes)`);
}
console.log(`${ranges.size} glyph ranges vendored`);
