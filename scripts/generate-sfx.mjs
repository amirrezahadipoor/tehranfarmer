#!/usr/bin/env node
// Original, deterministic SFX synthesis. No third-party recordings or samples are used.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Mp3Encoder } from '@breezystack/lamejs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'src/assets/sfx');
const RATE = 44100;
const KBPS = 24;
const GENERATED = ['boop', 'buy', 'cluck', 'coin', 'dig', 'err', 'fanfare', 'guitar', 'nibble', 'pad', 'paper', 'pop', 'splash', 'step', 'tap'];
const DUR = { boop: .12, buy: .55, cluck: .32, coin: .45, dig: .25, err: .3, fanfare: 1.1, guitar: 1, nibble: .22, pad: 1.2, paper: .32, pop: .1, splash: .45, step: .14, tap: .08 };
const TAU = Math.PI * 2;
const clamp = (x, a = -1, b = 1) => Math.max(a, Math.min(b, x));
const envelope = (t, d, attack = .008) => Math.min(1, t / attack) * Math.pow(Math.max(0, 1 - t / d), 2);
const sweep = (t, d, f0, f1) => Math.sin(TAU * (f0 * t + (f1 - f0) * t * t / (2 * d)));
const note = (t, start, dur, freq) => t < start || t > start + dur ? 0 : Math.sin(TAU * freq * (t - start)) * envelope(t - start, dur, .012);

function noiseFor(id) {
  let seed = [...id].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
  let low = 0, brown = 0;
  return (kind = 'white') => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const white = seed / 2147483648 - 1;
    low += .18 * (white - low);
    brown = clamp((brown + white * .035) * .985);
    return kind === 'low' ? low : kind === 'brown' ? brown : white;
  };
}

function sample(id, t, d, rnd) {
  const u = t / d;
  switch (id) {
    case 'tap': return .65 * sweep(t, d, 840, 520) * envelope(t, d, .004);
    case 'boop': return .65 * sweep(t, d, 460, 230) * envelope(t, d, .01);
    case 'pop': return .7 * sweep(t, d, 480, 980) * envelope(t, d, .006) + .08 * rnd('low') * envelope(t, d);
    case 'coin': return .52 * note(t, 0, .28, 1568) + .42 * note(t, .09, .34, 2093) + .14 * note(t, 0, .3, 3136);
    case 'buy': return .42 * note(t, 0, .25, 523.25) + .4 * note(t, .11, .27, 659.25) + .38 * note(t, .23, .3, 783.99);
    case 'err': return .55 * sweep(t, d, 310, 175) * envelope(t, d, .015) + .12 * Math.sin(TAU * 155 * t) * envelope(t, d, .02);
    case 'dig': return .72 * rnd('brown') * envelope(t, d, .004) + .32 * sweep(t, d, 115, 65) * envelope(t, d, .003);
    case 'cluck': {
      const local = t < .15 ? t : t - .17, dur = t < .15 ? .15 : .15;
      if (local < 0) return 0;
      const f = 650 + 160 * Math.sin(TAU * 24 * local);
      return .52 * Math.sin(TAU * f * local) * envelope(local, dur, .012) + .08 * rnd('low') * envelope(local, dur);
    }
    case 'fanfare': return [.52325, .65925, .78399, 1.0465].reduce((v, f, i) => v + .25 * note(t, i * .19, .42, f * 1000), 0) + .08 * Math.sin(TAU * 261.63 * t) * envelope(t, d, .04);
    case 'guitar': return [220, 329.63, 440].reduce((v, f, i) => {
      const start = i * .16;
      return v + .27 * note(t, start, .72, f) + .1 * note(t, start, .55, f * 2) + .05 * note(t, start, .4, f * 3);
    }, 0) + .06 * rnd('brown') * envelope(t, d, .01);
    case 'nibble': return (.55 * rnd('low') + .18 * Math.sin(TAU * 190 * t)) * (Math.sin(TAU * 31 * t) > 0 ? 1 : .25) * envelope(t, d, .003);
    case 'pad': return [220, 277.18, 329.63, 440].reduce((v, f, i) => v + (.15 - i * .015) * Math.sin(TAU * f * t + i * .4), 0) * Math.sin(Math.PI * u) ** 2;
    case 'paper': return (.6 * rnd() - .35 * rnd('low')) * envelope(t, d, .006) * (.65 + .35 * Math.sin(TAU * 19 * t));
    case 'splash': return .52 * rnd('low') * envelope(t, d, .005) + .24 * sweep(t, d, 740, 210) * envelope(t, d, .008) + .16 * rnd('brown') * envelope(t, d);
    case 'step': return .55 * rnd('brown') * envelope(t, d, .003) + .38 * sweep(t, d, 105, 70) * envelope(t, d, .003);
    default: throw new Error(`Unknown SFX ${id}`);
  }
}

function encode(id) {
  const d = DUR[id], count = Math.ceil(d * RATE), rnd = noiseFor(id);
  const raw = new Float64Array(count);
  let peak = 0;
  for (let i = 0; i < count; i++) {
    const t = i / RATE;
    raw[i] = sample(id, t, d, rnd);
    peak = Math.max(peak, Math.abs(raw[i]));
  }
  const pcm = new Int16Array(count);
  const gain = .82 / Math.max(.001, peak);
  let pcmPeak = 0, sumSquares = 0;
  for (let i = 0; i < count; i++) {
    const t = i / RATE;
    const edge = Math.min(1, t / .004, (d - t) / .008);
    pcm[i] = Math.round(clamp(raw[i] * gain * Math.max(0, edge)) * 32767);
    pcmPeak = Math.max(pcmPeak, Math.abs(pcm[i]) / 32767);
    sumSquares += (pcm[i] / 32767) ** 2;
  }
  const encoder = new Mp3Encoder(1, RATE, KBPS);
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const out = encoder.encodeBuffer(pcm.subarray(i, Math.min(i + 1152, pcm.length)));
    if (out.length) chunks.push(Buffer.from(out));
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(Buffer.from(tail));
  return { bytes: Buffer.concat(chunks), duration: d, peak: Number(peak.toFixed(5)), pcmPeak, pcmRms: Math.sqrt(sumSquares / count) };
}

function rebuildBank() {
  const entries = fs.readdirSync(DIR).filter((f) => f.endsWith('.mp3')).sort().map((file) => {
    const id = path.basename(file, '.mp3');
    const uri = `data:audio/mpeg;base64,${fs.readFileSync(path.join(DIR, file)).toString('base64')}`;
    return `  ${id}: ${JSON.stringify(uri)},`;
  });
  fs.writeFileSync(path.join(DIR, 'bank.ts'), `// Auto-generated inline URI bank mirrored 1:1 from src/assets/sfx/*.mp3\nexport const SFX_DATA_URIS = {\n${entries.join('\n')}\n} as const;\n`);
}

const evidence = { version: 1, generator: 'scripts/generate-sfx.mjs', command: 'npm run generate:sfx', sampleRate: RATE, bitrateKbps: KBPS, sourceMaterial: 'None; original mathematical PCM synthesis only', records: {} };
for (const id of GENERATED) {
  const out = encode(id);
  fs.writeFileSync(path.join(DIR, `${id}.mp3`), out.bytes);
  evidence.records[id] = { sha256: crypto.createHash('sha256').update(out.bytes).digest('hex'), bytes: out.bytes.length, durationSeconds: out.duration, sourcePeakBeforeNormalization: out.peak, pcmPeak: out.pcmPeak, pcmRms: out.pcmRms };
}
rebuildBank();
fs.writeFileSync(path.join(ROOT, 'docs/sfx-provenance.json'), JSON.stringify(evidence, null, 2) + '\n');

const manifestPath = path.join(ROOT, 'docs/media-provenance.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
for (const rec of manifest.records) {
  const match = /^src\/assets\/sfx\/([^.]+)\.mp3$/.exec(rec.path);
  if (!match || !GENERATED.includes(match[1])) continue;
  const id = match[1];
  Object.assign(rec, {
    status: 'documented',
    title: `Original procedural ${id} sound effect`,
    author: 'Tehran Farmer contributors',
    source: `Original project synthesis: scripts/generate-sfx.mjs#${id}; no sampled source material`,
    license: 'MIT (project LICENSE)',
    changes: `Replacement for unverified legacy audio; deterministic PCM synthesis, ${RATE} Hz mono, ${KBPS} kbps MP3, anti-click edge envelopes.`,
    evidence: `docs/sfx-provenance.json#${id} (SHA-256 and reproducible npm run generate:sfx recipe)`,
  });
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Generated ${GENERATED.length} original SFX; bank and provenance updated.`);
