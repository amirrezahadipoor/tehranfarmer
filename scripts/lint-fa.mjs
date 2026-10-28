#!/usr/bin/env node
// قاعدهٔ AGENTS: متن فارسی فقط در src/story/** و src/strings/**
// در فاز ۳ (P3-13) سخت‌گیر می‌شود؛ فعلاً گزارش می‌دهد تا مهاجرت تدریجی ممکن باشد.
import fs from 'node:fs';
import path from 'node:path';
const STRICT = process.argv.includes('--strict');
const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out); else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
};
const OK = /^src[\\/](story|strings)[\\/]/;
const PERSIAN = /[\u0600-\u06FF]/;
let hits = 0;
for (const f of walk('src')) {
  if (OK.test(f)) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((l, i) => {
    // فقط رشته‌های درون کوتیشن/بک‌تیک یا JSX text را می‌سنجیم
    const m = l.match(/(['"`])([^'"`]*[\u0600-\u06FF][^'"`]*)\1/) || l.match(/>\s*([^<>{}]*[\u0600-\u06FF][^<>{}]*)\s*</);
    if (m && PERSIAN.test(m[2] ?? m[1])) {
      console.log(`${f}:${i + 1} -> ${(m[2] ?? m[1]).trim().slice(0, 70)}`);
      hits++;
    }
  });
}
console.log(`\n— رشته‌های فارسی بیرون از story/strings: ${hits}`);
if (STRICT && hits) process.exit(1);
