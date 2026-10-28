#!/usr/bin/env node
// ممیزی حریم خصوصی و دادهٔ شخصی (P9-10):
// صفر فراخوانی شبکه، تله‌متری، ردیاب، تبلیغ یا دسترسی به حسگرهای حساس در کل سورس بازی
import fs from 'node:fs';
import path from 'node:path';

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs|css|html)$/.test(p)) out.push(p);
  }
  return out;
};

const FORBIDDEN = [
  { name: 'fetch()', re: /\bfetch\s*\(/ },
  { name: 'XMLHttpRequest', re: /\bXMLHttpRequest\b/ },
  { name: 'sendBeacon', re: /\bsendBeacon\s*\(/ },
  { name: 'WebSocket', re: /\bnew\s+WebSocket\s*\(/ },
  { name: 'EventSource', re: /\bnew\s+EventSource\s*\(/ },
  { name: 'RTCPeerConnection', re: /\bRTCPeerConnection\b/ },
  { name: 'Geolocation', re: /\bnavigator\.geolocation\b/ },
  { name: 'MediaDevices', re: /\bgetUserMedia\s*\(/ },
  { name: 'Tracker/Analytics SDK', re: /\b(sentry|posthog|mixpanel|amplitude|firebase|gtag|googletagmanager|adsense|appsflyer|adjust)\b/i },
];

const URL_RE = /(?:https?|wss?):\/\/[^\s"'`)]+/gi;
const SAFE_NAMESPACES = new Set(['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xhtml']);

const files = ['index.html', ...walk('src')];
const hits = [];

for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  txt.split('\n').forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    for (const rule of FORBIDDEN) {
      if (rule.re.test(line)) {
        hits.push(`${f}:${idx + 1} [${rule.name}] -> ${trimmed.slice(0, 90)}`);
      }
    }
    for (const m of line.matchAll(URL_RE)) {
      if (!SAFE_NAMESPACES.has(m[0])) {
        hits.push(`${f}:${idx + 1} [URL خارجی: ${m[0]}] -> ${trimmed.slice(0, 90)}`);
      }
    }
  });
}

// بررسی وابستگی‌های package.json و مانیفست اندروید (نبود مجوز اینترنت و نبود بکاپ ابری خودکار گوگل)
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
for (const dep of allDeps) {
  if (/(sentry|posthog|mixpanel|amplitude|firebase|analytics|ads|appsflyer|adjust)/i.test(dep)) {
    hits.push(`package.json [وابستگی ردیاب: ${dep}]`);
  }
}
const manifestPath = 'android/app/src/main/AndroidManifest.xml';
if (fs.existsSync(manifestPath)) {
  const mf = fs.readFileSync(manifestPath, 'utf8');
  if (/android\.permission\.INTERNET/.test(mf)) hits.push(`${manifestPath} [مجوز اینترنت غیرمجاز]`);
  if (!/android:allowBackup="false"/.test(mf)) hits.push(`${manifestPath} [باید allowBackup="false" باشد تا سِیو به ابر گوگل نرود]`);
}

console.log(`— ممیزی حریم خصوصی: ${files.length} فایل اسکن شد | تخطی: ${hits.length}`);
if (hits.length) {
  for (const h of hits) console.error('[ERR] ' + h);
  process.exit(1);
}
console.log('[OK] صفر ارسال شبکه، صفر تله‌متری و صفر جمع‌آوری دادهٔ شخصی');
