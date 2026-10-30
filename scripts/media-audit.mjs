#!/usr/bin/env node
// Coverage and completeness audit for audio provenance. Unknown stays unknown:
// this tool verifies records, never the legal truth of human-provided evidence.
import fs from 'node:fs';
import path from 'node:path';

const manifestPath = 'docs/media-provenance.json';
const roots = ['public/music', 'src/assets/sfx'];
const mediaExtensions = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.flac']);
const required = ['title', 'author', 'source', 'license', 'changes', 'evidence'];
const reportOnly = process.argv.includes('--report');

function mediaFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return mediaFiles(file);
    return mediaExtensions.has(path.extname(entry.name).toLowerCase()) ? [file.split(path.sep).join('/')] : [];
  });
}

const files = roots.flatMap(mediaFiles).sort();
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const records = Array.isArray(manifest.records) ? manifest.records : [];
const byPath = new Map();
const errors = [];
for (const record of records) {
  if (!record || typeof record.path !== 'string' || !record.path) {
    errors.push('رکورد بدون path معتبر'); continue;
  }
  if (byPath.has(record.path)) errors.push(`رکورد تکراری: ${record.path}`);
  byPath.set(record.path, record);
}
for (const file of files) if (!byPath.has(file)) errors.push(`بدون رکورد: ${file}`);
for (const record of records) {
  if (!record?.path) continue;
  if (!fs.existsSync(record.path)) errors.push(`رکورد برای فایل ناموجود: ${record.path}`);
  if (!['documented', 'unverified'].includes(record.status)) errors.push(`وضعیت نامعتبر: ${record.path}`);
}
const incomplete = files.filter((file) => {
  const record = byPath.get(file);
  return !record || record.status !== 'documented' || required.some((key) => typeof record[key] !== 'string' || !record[key].trim());
});
const documented = files.length - incomplete.length;
console.log(`رسانه: ${files.length} فایل · سند کامل: ${documented} · نیازمند مدرک انسانی: ${incomplete.length}`);
for (const file of incomplete) console.log(`  [unverified] ${file}`);
for (const error of errors) console.error(`  [ERR] ${error}`);
if (errors.length || incomplete.length) {
  console.error(`[BLOCK] provenance کامل نیست؛ ${manifestPath} را فقط با مدرک واقعی تکمیل کنید.`);
  if (!reportOnly) process.exit(1);
} else {
  console.log('[OK] برای هر فایل رسانه‌ای رکورد کامل وجود دارد؛ صحت حقوقی مدارک همچنان مسئولیت انسانی است.');
}
