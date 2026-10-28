#!/usr/bin/env node
// ممیزی: ۱) صفر ایموجی/گلیف تزئینی در کل کد، اسکریپت‌ها، تست‌های E2E، HTML و مستندات ۲) هر آیکون ارجاع‌شده واقعاً نقاشی شده باشد
import fs from 'node:fs';
import path from 'node:path';

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

// بازه‌های ایموجی و گلیف‌های تزئینی یونیکد (بدون ارقام و حروف فارسی)
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;
const targets = [
  'index.html',
  ...walk('src'),
  ...walk('e2e'),
  ...walk('scripts'),
  ...walk('docs'),
].filter((f) => /\.(ts|tsx|js|mjs|css|html|json|md)$/.test(f));

let emojiHits = 0;
for (const f of targets) {
  const txt = fs.readFileSync(f, 'utf8');
  txt.split('\n').forEach((line, i) => {
    const m = line.match(EMOJI);
    if (m) {
      console.log(`[ERR] ایموجی/گلیف تزئینی: ${f}:${i + 1} «${m[0]}» -> ${line.trim().slice(0, 90)}`);
      emojiHits++;
    }
  });
}

// آیکون‌های نقاشی‌شده (case های drawIcon/drawProduce در art.ts و artIcons.ts)
const art = ['src/game/art.ts', 'src/game/artIcons.ts']
  .filter((p) => fs.existsSync(p))
  .map((p) => fs.readFileSync(p, 'utf8'))
  .join('\n');
const drawn = new Set([...art.matchAll(/case '([a-zA-Z0-9:_-]+)'/g)].map((m) => m[1]));
drawn.add('seed:');

// آیکون‌های ارجاع‌شده در کل سورس (شامل عبارات پویا <Ic n={...}>)
const srcFiles = walk('src').filter((x) => x.endsWith('.tsx') || x.endsWith('.ts'));
const used = new Set();
for (const f of srcFiles) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/<Ic\s+n="([a-zA-Z0-9:_-]+)"/g)) used.add(m[1]);
  for (const m of txt.matchAll(/toast\('([a-zA-Z0-9:_-]+)'/g)) used.add(m[1]);
  for (const m of txt.matchAll(/\bic(?:on)?:\s*'([a-zA-Z0-9:_-]+)'/g)) used.add(m[1]);
  for (const m of txt.matchAll(/<Ic\s+n=\{([^}]+)\}/g)) {
    for (const s of m[1].matchAll(/['"]([a-zA-Z0-9:_-]+)['"]/g)) used.add(s[1]);
  }
}

let missing = 0;
for (const n of [...used].sort()) {
  if (n === 'seed:') continue;
  const ok = drawn.has(n) || art.includes(`'${n}'`);
  if (!ok) {
    console.log(`[ERR] آیکون نقاشی‌نشده: ${n}`);
    missing++;
  }
}

console.log(`\n— ${targets.length} فایل اسکن شد | ایموجی: ${emojiHits} | آیکون گم: ${missing}`);
if (emojiHits || missing) process.exit(1);
console.log('[OK] ممیزی آیکون و ایموجی پاک است');
