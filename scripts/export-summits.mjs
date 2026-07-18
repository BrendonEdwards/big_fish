import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const match = src.match(/const peakData = (\[[\s\S]*?\n\]);/);
if (!match) throw new Error('peakData array not found in src/main.js');
const peaks = new Function(`return ${match[1]};`)();
if (peaks.length !== 40) throw new Error(`expected 40 summits, got ${peaks.length}`);
if (!peaks.some((peak) => peak.id === 'everest')) throw new Error('everest missing from peakData');
mkdirSync(new URL('./.cache', import.meta.url), { recursive: true });
writeFileSync(new URL('./.cache/summits.json', import.meta.url), JSON.stringify(peaks, null, 2));
console.log(`wrote ${peaks.length} summits to scripts/.cache/summits.json`);
