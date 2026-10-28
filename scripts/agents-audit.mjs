#!/usr/bin/env node
// ممیزی جامع قواعد سخت AGENTS.md برای بازبینی نهایی انتشار (P10-10)
import fs from 'node:fs';
import path from 'node:path';

const errors = [];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'build', '.gradle', 'artifacts', 'test-results', 'playwright-report'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// ۱. سقف ۶۰۰ خط و نبود any / ts-ignore در تمام فایل‌های src/**/*.{ts,tsx}
const srcTs = walk('src').filter((f) => /\.(ts|tsx)$/.test(f));
let maxLines = 0;
for (const f of srcTs) {
  const txt = fs.readFileSync(f, 'utf8');
  const n = txt.split('\n').length;
  if (n > maxLines) maxLines = n;
  if (n > 600) errors.push(`عبور از سقف ۶۰۰ خط: ${f} (${n} خط)`);
  if (/(: *any\b|as +any\b|@ts-ignore|@ts-expect-error)/.test(txt)) {
    errors.push(`استفادهٔ غیرمجاز از any یا ts-ignore در ${f}`);
  }
}

// ۲. اعتبار هدر باینری فونت‌های WOFF2 تعبیه‌شده (آفلاین ۱۰۰٪)
const fonts = walk('src').filter((f) => f.endsWith('.woff2'));
if (fonts.length < 4) errors.push(`تعداد فونت‌های WOFF2 تعبیه‌شده ناکافی است (${fonts.length})`);
for (const f of fonts) {
  const magic = fs.readFileSync(f).subarray(0, 4).toString('ascii');
  if (magic !== 'wOF2') errors.push(`فونت نامعتبر (${magic}): ${f}`);
}

// ۳. حفظ محتوای نسخه‌های پیشین (نجاری، آغل اختصاصی، گلخانه، سیلو، تولیدمثل) و نبود کلید خصوصی
const stateTxt = fs.readFileSync('src/game/state.ts', 'utf8');
for (const token of ["'carp'", 'pens:', 'gh:', 'silo:', 'nests:']) {
  if (!stateTxt.includes(token)) errors.push(`ویژگی الزامی ${token} در state.ts یافت نشد`);
}
for (const f of walk('.')) {
  if (/\.(keystore|jks|p12|pfx)$/i.test(f)) errors.push(`فایل کلید در مخزن یافت شد: ${f}`);
}

// ۴. هم‌خوانی مستندات داستان و مانیفست اندروید + تکمیل ۱۰۰٪ تمام تسک‌های ROADMAP.md
const storyMd = fs.readFileSync('STORY.md', 'utf8');
if (storyMd.includes('فتحی') || storyMd.includes('حاج‌آقا دامدار')) {
  errors.push('عدم یکدستی نام شخصیت‌ها در STORY.md با کد بازی (مهندس کاوه / عمو مراد)');
}
const manifest = fs.readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
if (!manifest.includes('android:allowBackup="false"')) {
  errors.push('AndroidManifest.xml باید allowBackup="false" داشته باشد');
}
const roadmap = fs.readFileSync('ROADMAP.md', 'utf8');
const unchecked = [...roadmap.matchAll(/^- \[ \] (P\d+-\d+)/gm)].map((m) => m[1]);
const checked = [...roadmap.matchAll(/^- \[x\] (P\d+-\d+)/gm)].map((m) => m[1]);
if (unchecked.length > 0) errors.push(`تسک‌های تیک‌نخورده در ROADMAP.md: ${unchecked.join(', ')}`);

if (errors.length) {
  for (const e of errors) console.error(`[ERR] ${e}`);
  process.exit(1);
}
console.log(`[OK] ممیزی جامع AGENTS.md سبز است (${srcTs.length} ماژول، بیشینه=${maxLines} خط، فونت‌ها=${fonts.length}، نقشهٔ راه=${checked.length}/${checked.length})`);
