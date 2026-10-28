#!/usr/bin/env node
// ===== همگام‌سازی نسخه در همهٔ جاها (رفع C-9/N-4) =====
// قبلاً نسخه باید دستی در چهار جا تکرار می‌شد: package.json، android/app/build.gradle
// (versionName + versionCode)، فایل CHANGELOG و آرایهٔ CHANGELOG در src/strings/version.ts.
// این اسکریپت همه را با هم و اتمیک به‌روز می‌کند تا ناهم‌خوانی ممکن نباشد.
//
// استفاده:
//   npm run version:bump -- patch           -> 10.0.0 -> 10.0.1  (versionCode +1)
//   npm run version:bump -- minor           -> 10.0.1 -> 10.1.0  (versionCode +10)
//   npm run version:bump -- major           -> 10.1.0 -> 11.0.0  (versionCode +100)
//   npm run version:bump -- 10.2.3          -> نسخهٔ دقیق (versionCode = 1000 + major*100 + minor*10 + patch)
//   npm run version:bump -- patch --dry-run -> فقط نمایش تغییرات
//   npm run version:bump -- patch --notes "توضیح کوتاه فارسی"
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
const dryRun = flags.includes('--dry-run');
const notesIdx = process.argv.indexOf('--notes');
const notes = notesIdx >= 0 ? process.argv[notesIdx + 1] : '';
const notesEnIdx = process.argv.indexOf('--notes-en');
// نکته: توضیح انگلیسی هرگز نباید فارسی داشته باشد (تست دوزبانگی)؛ اگر --notes-en
// داده نشود، یک متن کوتاه انگلیسی پیش‌فرض گذاشته می‌شود.
const notesEn = notesEnIdx >= 0 ? process.argv[notesEnIdx + 1] : '';
const target = (args[0] ?? 'patch').trim();

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pkgPath = path.join(root, 'package.json');
const gradlePath = path.join(root, 'android/app/build.gradle');
const versionTsPath = path.join(root, 'src/strings/version.ts');
const changelogPath = path.join(root, 'CHANGELOG.md');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const current = String(pkg.version);

function parse(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) throw new Error(`نسخهٔ نامعتبر در package.json: ${v}`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

const cur = parse(current);
let next;
if (/^\d+\.\d+\.\d+$/.test(target)) {
  next = parse(target);
} else if (target === 'patch') {
  next = { ...cur, patch: cur.patch + 1 };
} else if (target === 'minor') {
  next = { major: cur.major, minor: cur.minor + 1, patch: 0 };
} else if (target === 'major') {
  next = { major: cur.major + 1, minor: 0, patch: 0 };
} else {
  throw new Error(`نوع افزایش نامعتبر: ${target} (patch | minor | major | x.y.z)`);
}

const nextName = `${next.major}.${next.minor}.${next.patch}`;
if (nextName === current) {
  console.error(`[!] نسخه تغییر نکرد (${current}).`);
  process.exit(1);
}

// versionCode باید اکیداً صعودی بماند (شرط کافه‌بازار و گوگل‌پلی)
const codeOf = (v) => v.major * 100 + v.minor * 10 + v.patch;
const nextCode = Math.max(codeOf(next), codeOf(cur) + 1);
const today = new Date().toISOString().slice(0, 10);

const jdate = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const edits = [];

// ۱) package.json
const pkgNext = { ...pkg, version: nextName };
edits.push({ file: pkgPath, content: `${JSON.stringify(pkgNext, null, 2)}\n`, label: `package.json -> ${nextName}` });

// ۲) android/app/build.gradle
let gradle = fs.readFileSync(gradlePath, 'utf8');
const beforeGradle = `${gradle.match(/versionCode\s+\d+/)?.[0]} / ${gradle.match(/versionName\s+"[^"]+"/)?.[0]}`;
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${nextCode}`);
gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${nextName}"`);
edits.push({ file: gradlePath, content: gradle, label: `build.gradle -> versionCode ${nextCode} / ${nextName} (بود: ${beforeGradle})` });

// ۳) src/strings/version.ts — آرایهٔ CHANGELOG با getterهای دوزبانه
if (fs.existsSync(versionTsPath)) {
  let vts = fs.readFileSync(versionTsPath, 'utf8');
  const idx = vts.indexOf('export const CHANGELOG');
  if (idx >= 0) {
    // نقطهٔ درج: ابتدای آرایهٔ مقداردهی (`= [`)، نه `[` داخل نوع آرایه
    const eq = vts.indexOf('= [', idx);
    const open = eq >= 0 ? eq + 2 : vts.indexOf('[', idx);
    const faNum = nextName
      .replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
      .replace(/\./g, '٫');
    const faNote = (notes || `انتشار نسخهٔ ${faNum}`).replace(/'/g, '’');
    const enNote = (notesEn || `Release ${nextName}: bug fixes, readability and store build tooling`).replace(/'/g, '’');
    const entry =
      `  {\n` +
      `    get v() { return locText('${faNum}', '${nextName}'); },\n` +
      `    get note() {\n` +
      `      return locText(\n` +
      `        '${faNote}',\n` +
      `        '${enNote}',\n` +
      `      );\n` +
      `    },\n` +
      `  },\n`;
    // اگر بعد از `[` خط خالی/فاصله بود، تمیز می‌کنیم تا قالب فایل یکدست بماند
    const after = vts.slice(open + 1).replace(/^\s*\n?/, '\n');
    vts = `${vts.slice(0, open + 1)}\n${entry}${after}`;
    edits.push({ file: versionTsPath, content: vts, label: `version.ts -> CHANGELOG += ${nextName}` });
  }
}

// ۴) CHANGELOG.md
if (fs.existsSync(changelogPath)) {
  const cl = fs.readFileSync(changelogPath, 'utf8');
  const header = `## [${nextName}] — ${jdate}\n\n- ${notes || `نسخهٔ ${nextName}`}\n\n`;
  const idx = cl.indexOf('\n## ');
  const updated = idx >= 0 ? `${cl.slice(0, idx + 1)}${header}${cl.slice(idx + 1)}` : `${cl}\n${header}`;
  edits.push({ file: changelogPath, content: updated, label: `CHANGELOG.md -> ${nextName}` });
}

for (const e of edits) {
  console.log(`${dryRun ? '[dry] ' : '[ok] '}${e.label}`);
  if (!dryRun) fs.writeFileSync(e.file, e.content, 'utf8');
}

if (dryRun) {
  console.log(`\n[dry-run] ${current} -> ${nextName} (versionCode ${nextCode})`);
} else {
  console.log(`\n[OK] نسخه از ${current} به ${nextName} رسید (versionCode ${nextCode}).`);
  console.log('    یادآوری: تغییرات را کامیت و تگ کنید: git commit -am "v' + nextName + '" && git tag v' + nextName);
}
