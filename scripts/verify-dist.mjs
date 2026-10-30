import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const native = process.env.NATIVE_BUILD === '1' || process.env.VITE_NATIVE_BUILD === '1';
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const packs = html.match(/data-music-pack=/g) ?? [];
const expectedMusic = ['peaceful-forest.mp3', 'ch2.mp3', 'ch3.mp3', 'ch4.mp3', 'ch5.mp3', 'ch6.mp3', 'ch7.mp3'];
const missing = expectedMusic.filter((file) => !fs.existsSync(path.join(dist, 'music', file)));

if (missing.length) throw new Error(`Missing local music: ${missing.join(', ')}`);
if (packs.length !== (native ? 1 : 0)) throw new Error(`Expected ${native ? 1 : 0} inline starter tracks, found ${packs.length}`);
if (Buffer.byteLength(html) > (native ? 3_000_000 : 100_000)) throw new Error('Initial HTML exceeds its budget');

const sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
if (!sw.includes('CACHE_MUSIC')) throw new Error('Offline music cache handler is missing');

if (native) {
  console.log(`[OK] native dist: ${(Buffer.byteLength(html) / 1e6).toFixed(2)} MB HTML, 1 inline track, ${expectedMusic.length} local tracks`);
} else {
  if (sw.includes('/*__TF_BUILD_ASSETS__*/')) throw new Error('Web service-worker asset manifest was not injected');
  const refs = [...html.matchAll(/(?:src|href)="(?:\.\/)?(assets\/[^"]+)"/g)].map((match) => match[1]);
  const initialFiles = ['index.html', ...new Set(refs)];
  let initialRaw = 0;
  let initialGzip = 0;
  for (const file of initialFiles) {
    const bytes = fs.readFileSync(path.join(dist, file));
    initialRaw += bytes.length;
    initialGzip += zlib.gzipSync(bytes, { level: 9 }).length;
  }
  if (initialGzip > 650_000) throw new Error(`Initial web gzip payload ${initialGzip} exceeds 650000 bytes`);
  const assets = fs.existsSync(path.join(dist, 'assets')) ? fs.readdirSync(path.join(dist, 'assets')) : [];
  const missingPrecache = assets.filter((file) => /\.(?:js|css)$/.test(file) && !sw.includes(`./assets/${file}`));
  if (missingPrecache.length) throw new Error(`Assets missing from offline precache: ${missingPrecache.join(', ')}`);
  console.log(`[OK] web dist: ${(Buffer.byteLength(html) / 1e3).toFixed(1)} kB HTML, no inline music, initial gzip ${(initialGzip / 1e3).toFixed(1)} kB (${(initialRaw / 1e6).toFixed(2)} MB raw), ${assets.length} precached assets`);
}
