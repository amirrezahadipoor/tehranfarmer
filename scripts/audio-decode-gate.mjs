import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'src/assets/sfx');
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.mp3')).sort();
const input = files.map((file) => ({ id: path.basename(file, '.mp3'), base64: fs.readFileSync(path.join(DIR, file)).toString('base64') }));
const browser = await chromium.launch({ headless: true });
let report;
try {
  const page = await browser.newPage();
  report = await page.evaluate(async (items) => {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const results = [];
    for (const item of items) {
      const bin = atob(item.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      try {
        const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
        let peak = 0, finite = true, sumSquares = 0, nonzero = 0, sampleCount = 0;
        for (let c = 0; c < buffer.numberOfChannels; c++) {
          const data = buffer.getChannelData(c);
          for (let i = 0; i < data.length; i++) {
            if (!Number.isFinite(data[i])) finite = false;
            peak = Math.max(peak, Math.abs(data[i]));
            sumSquares += data[i] * data[i];
            if (data[i] !== 0) nonzero++;
            sampleCount++;
          }
        }
        const rms = Math.sqrt(sumSquares / Math.max(1, sampleCount));
        const nonzeroRatio = nonzero / Math.max(1, sampleCount);
        const generated = item.id !== 'water';
        // MP3 می‌تواند overshoot کوچکِ کدک داشته باشد؛ بالای ۱٫۰۵ یعنی خروجی واقعاً نامناسب است.
        // برای صداهای تازه، RMS و نمونهٔ غیرصفر مانع سبزشدن فایلِ عمدتاً سکوت می‌شوند.
        const ok = finite && peak <= 1.05 && buffer.duration > .03
          && (generated ? peak >= .25 && rms >= .02 && nonzeroRatio >= .1 : peak > 0);
        results.push({ id: item.id, ok, duration: buffer.duration, channels: buffer.numberOfChannels, peak, rms, nonzeroRatio, finite });
      } catch (error) {
        results.push({ id: item.id, ok: false, error: String(error) });
      }
    }
    await ctx.close();
    return results;
  }, input);
} finally {
  await browser.close();
}
const failed = report.filter((r) => !r.ok);
const out = path.resolve(ROOT, '../tehranfarmer-review/audio-decode-gate.json');
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), files: report, failed: failed.length }, null, 2));
console.log(JSON.stringify({ decoded: report.length - failed.length, total: report.length, failed, out }, null, 2));
if (failed.length) process.exitCode = 1;
