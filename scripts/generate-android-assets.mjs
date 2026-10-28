#!/usr/bin/env node
// تولید خودکار آیکون تطبیقی برداری و همهٔ ۲۶ فایل آیکون و اسپلش اندروید در تمام چگالی‌ها (P10-03)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const RES = path.resolve('android/app/src/main/res');

// ۱) بردار پس‌زمینه و پیش‌زمینهٔ Adaptive Icon اندروید ۸+
fs.writeFileSync(
  path.join(RES, 'values/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#8FD35A</color>\n</resources>\n`,
);

fs.writeFileSync(
  path.join(RES, 'drawable/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#8FD8FF" android:pathData="M0,0h108v62h-108z"/>
    <path android:fillColor="#8FD35A" android:pathData="M0,58Q54,48 108,58L108,108L0,108Z"/>
    <path android:fillColor="#8A5A34" android:pathData="M0,82Q54,75 108,82L108,108L0,108Z"/>
</vector>
`,
);

fs.writeFileSync(
  path.join(RES, 'drawable-v24/ic_launcher_foreground.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <!-- خورشید -->
    <path android:fillColor="#FFD93B" android:strokeColor="#503426" android:strokeWidth="2.5"
        android:pathData="M74,31m-9,0a9,9 0,1 1,18 0a9,9 0,1 1,-18 0"/>
    <!-- کلبهٔ مزرعه -->
    <path android:fillColor="#FFF0CF" android:strokeColor="#503426" android:strokeWidth="2.6"
        android:pathData="M30,49h28v22h-28z"/>
    <path android:fillColor="#D9534A" android:strokeColor="#503426" android:strokeWidth="2.6"
        android:pathData="M25,51L44,33L63,51Z"/>
    <path android:fillColor="#8A5A34" android:strokeColor="#503426" android:strokeWidth="2"
        android:pathData="M40,58h8v13h-8z"/>
    <!-- خوشهٔ گندم طلایی -->
    <path android:strokeColor="#4FB046" android:strokeWidth="3" android:strokeLineCap="round"
        android:pathData="M73,74L73,50"/>
    <path android:fillColor="#FFD93B" android:strokeColor="#503426" android:strokeWidth="2.2"
        android:pathData="M73,40C77,40 79,45 79,50C79,55 77,58 73,58C69,58 67,55 67,50C67,45 69,40 73,40Z"/>
</vector>
`,
);

const ICON_SVG = (mode) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="100%" height="100%">
  <defs>
    <clipPath id="clip">
      ${mode === 'round' ? '<circle cx="96" cy="96" r="94"/>' : '<rect width="192" height="192" rx="36"/>'}
    </clipPath>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8fd8ff"/>
      <stop offset="100%" stop-color="#d8f3ff"/>
    </linearGradient>
  </defs>
  <g ${mode === 'fg' ? '' : 'clip-path="url(#clip)"'}>
    ${mode === 'fg' ? '' : `
      <rect width="192" height="192" fill="url(#sky)"/>
      <path d="M0 112 Q96 92 192 114 L192 192 L0 192 Z" fill="#8fd35a" stroke="#503426" stroke-width="5"/>
      <path d="M0 144 Q96 132 192 146 L192 192 L0 192 Z" fill="#8a5a34" stroke="#503426" stroke-width="5"/>
    `}
    <g transform="${mode === 'fg' ? 'translate(24,20) scale(0.75)' : ''}">
      <circle cx="142" cy="50" r="20" fill="#ffd93b" stroke="#503426" stroke-width="5"/>
      <rect x="44" y="78" width="56" height="44" rx="4" fill="#fff0cf" stroke="#503426" stroke-width="5"/>
      <polygon points="34,82 72,48 110,82" fill="#d9534a" stroke="#503426" stroke-width="5" stroke-linejoin="round"/>
      <rect x="65" y="98" width="14" height="24" fill="#8a5a34" stroke="#503426" stroke-width="4"/>
      <line x1="138" y1="154" x2="138" y2="110" stroke="#4fb046" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="128" cy="126" rx="11" ry="5.5" transform="rotate(-28 128 126)" fill="#6cc84c" stroke="#503426" stroke-width="4"/>
      <ellipse cx="148" cy="120" rx="11" ry="5.5" transform="rotate(28 148 120)" fill="#6cc84c" stroke="#503426" stroke-width="4"/>
      <ellipse cx="138" cy="102" rx="9" ry="15" fill="#ffd93b" stroke="#503426" stroke-width="4"/>
    </g>
    ${mode === 'round' ? '<circle cx="96" cy="96" r="92" fill="none" stroke="#503426" stroke-width="6"/>' : ''}
  </g>
</svg>`;

const SPLASH_SVG = (w, h) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8fd8ff"/>
      <stop offset="55%" stop-color="#d8f3ff"/>
      <stop offset="55.1%" stop-color="#8fd35a"/>
      <stop offset="100%" stop-color="#6dbb3e"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#s)"/>
  <circle cx="${Math.round(w * 0.82)}" cy="${Math.round(h * 0.2)}" r="${Math.round(Math.min(w, h) * 0.09)}" fill="#ffd93b" stroke="#503426" stroke-width="4"/>
  <g transform="translate(${Math.round(w / 2)}, ${Math.round(h / 2)})">
    <rect x="-150" y="-68" width="300" height="126" rx="22" fill="#fff4d8" stroke="#503426" stroke-width="6"/>
    <text x="0" y="-8" text-anchor="middle" direction="rtl" font-family="sans-serif" font-weight="900" font-size="42" fill="#e8564a">مزرعه رنگی</text>
    <text x="0" y="34" text-anchor="middle" direction="rtl" font-family="sans-serif" font-weight="700" font-size="20" fill="#503426">کشاورزی و داستان نقاشی‌شده</text>
  </g>
</svg>`;

const MIPMAPS = [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
];

const SPLASHES = [
  ['drawable/splash.png', 480, 320],
  ['drawable-land-mdpi/splash.png', 480, 320],
  ['drawable-land-hdpi/splash.png', 800, 480],
  ['drawable-land-xhdpi/splash.png', 1280, 720],
  ['drawable-land-xxhdpi/splash.png', 1600, 960],
  ['drawable-land-xxxhdpi/splash.png', 1920, 1280],
  ['drawable-port-mdpi/splash.png', 320, 480],
  ['drawable-port-hdpi/splash.png', 480, 800],
  ['drawable-port-xhdpi/splash.png', 720, 1280],
  ['drawable-port-xxhdpi/splash.png', 960, 1600],
  ['drawable-port-xxxhdpi/splash.png', 1280, 1920],
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function renderSvgToPng(svg, width, height, outPath, omitBg = false) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent">${svg}</body></html>`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, omitBackground: omitBg });
}

let written = 0;
for (const [dens, launcherPx, fgPx] of MIPMAPS) {
  await renderSvgToPng(ICON_SVG('square'), launcherPx, launcherPx, path.join(RES, `mipmap-${dens}/ic_launcher.png`), true);
  await renderSvgToPng(ICON_SVG('round'), launcherPx, launcherPx, path.join(RES, `mipmap-${dens}/ic_launcher_round.png`), true);
  await renderSvgToPng(ICON_SVG('fg'), fgPx, fgPx, path.join(RES, `mipmap-${dens}/ic_launcher_foreground.png`), true);
  written += 3;
}

for (const [rel, w, h] of SPLASHES) {
  await renderSvgToPng(SPLASH_SVG(w, h), w, h, path.join(RES, rel), false);
  written++;
}

await browser.close();
console.log(`[OK] ${written} فایل PNG آیکون و اسپلش اختصاصی + ۳ فایل برداری Adaptive Icon تولید شد.`);
