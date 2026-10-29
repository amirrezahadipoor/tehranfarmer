#!/usr/bin/env node
// بررسی آفلاین‌بودن بیلد: هیچ URL، فونت، اسکریپت یا استایل خارجی
import fs from 'node:fs';
const f = 'dist/index.html';
if (!fs.existsSync(f)) { console.error('dist/index.html نیست — اول vite build'); process.exit(1); }
const html = fs.readFileSync(f, 'utf8');
const bad = [];
for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
  const u = m[1];
  if (/^(https?:)?\/\//.test(u)) bad.push(u);
}
for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
  const u = m[1];
  if (/^(https?:)?\/\//.test(u) || u.startsWith('data:')) continue;
  bad.push(u);
}
for (const m of html.matchAll(/@import\s+["']([^"']+)["']/g)) bad.push(m[1]);
if (bad.length) { console.error('[ERR] منابع خارجی:'); bad.forEach((b) => console.error('  ' + b)); process.exit(1); }
if (!html.includes('<!-- offline-music-pack:7 -->')) {
  console.error('[ERR] نشانهٔ بستهٔ هفت‌آهنگهٔ درون‌خطی در HTML نیست'); process.exit(1);
}
if (fs.existsSync('dist/music')) {
  console.error('[ERR] پوشهٔ music در artifact باقی است؛ بیلد باید مستقل از فایل‌های همراه باشد'); process.exit(1);
}
const kb = Math.round(html.length / 1024);
// هفت MP3 با کیفیت اصلی + کد/فونت/تصاویر در همان فایل‌اند؛ سقف ۶MiB برای WebView موبایل.
if (kb > 6144) { console.error(`[ERR] بیلد ${kb}KB است — بودجهٔ ۶۱۴۴KB رد شد`); process.exit(1); }
console.log(`[OK] بیلد آفلاین، تک‌فایل و همراه با هر ۷ آهنگ است — ${kb}KB`);
