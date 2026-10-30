import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const packs = html.match(/data-music-pack=/g) ?? [];
const expectedMusic = ['peaceful-forest.mp3', 'ch2.mp3', 'ch3.mp3', 'ch4.mp3', 'ch5.mp3', 'ch6.mp3', 'ch7.mp3'];
const missing = expectedMusic.filter((file) => !fs.existsSync(path.join(dist, 'music', file)));

if (packs.length !== 1) throw new Error(`Expected one inline starter track, found ${packs.length}`);
if (missing.length) throw new Error(`Missing local music: ${missing.join(', ')}`);
if (Buffer.byteLength(html) > 3_000_000) throw new Error('Initial HTML exceeds the 3 MB budget');
const sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
if (!sw.includes('CACHE_MUSIC')) throw new Error('Offline music precache handler is missing');

console.log(`[OK] dist: ${(Buffer.byteLength(html) / 1e6).toFixed(2)} MB HTML, 1 inline track, ${expectedMusic.length} local tracks, offline cache ready`);
