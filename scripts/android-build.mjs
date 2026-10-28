#!/usr/bin/env node
// ساخت کامل APK اندروید (debug / release) با Capacitor + Gradle و تأیید خروجی (P10-02)
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const mode = process.argv[2] === 'release' ? 'release' : 'debug';
const task = mode === 'release' ? 'assembleRelease' : 'assembleDebug';

const sdkCandidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  '/opt/android-sdk',
  path.join(process.env.HOME ?? '', 'Android/Sdk'),
].filter(Boolean);
const sdk = sdkCandidates.find((p) => fs.existsSync(p));
if (!sdk) {
  console.error('[ERR] Android SDK یافت نشد؛ ANDROID_HOME را تنظیم کنید.');
  process.exit(1);
}

const env = {
  ...process.env,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
  GRADLE_USER_HOME: process.env.GRADLE_USER_HOME ?? (fs.existsSync('/opt/gradle-cache') ? '/opt/gradle-cache' : path.join(process.env.HOME ?? '/tmp', '.gradle')),
};

console.log(`[1/3] ساخت وب (vite build) برای حالت ${mode}...`);
execFileSync('npx', ['vite', 'build'], { stdio: 'inherit', env });

console.log('[2/3] همگام‌سازی دارایی‌ها با Capacitor Android...');
execFileSync('npx', ['cap', 'sync', 'android'], { stdio: 'inherit', env });

const outDir = path.resolve('android/app/build/outputs/apk', mode);
if (fs.existsSync(outDir)) {
  for (const old of fs.readdirSync(outDir)) {
    if (old.endsWith('.apk') || old.endsWith('.idsig')) fs.rmSync(path.join(outDir, old), { force: true });
  }
}

console.log(`[3/3] اجرای Gradle (${task})...`);
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const gradleArgs = mode === 'release' ? ['--no-daemon', task, '-x', 'lintVitalRelease', '-x', 'lintVitalAnalyzeRelease'] : ['--no-daemon', task];
execFileSync(gradlew, gradleArgs, { cwd: path.resolve('android'), stdio: 'inherit', env });

const apks = fs.existsSync(outDir) ? fs.readdirSync(outDir).filter((f) => f.endsWith('.apk')).sort() : [];
if (!apks.length) {
  console.error(`[ERR] هیچ فایل APK در ${outDir} تولید نشد.`);
  process.exit(1);
}

const srcApk = path.join(outDir, apks[0]);
const signedTag = apks[0].includes('unsigned') ? 'unsigned' : 'signed';
fs.mkdirSync('artifacts', { recursive: true });
const destApk = path.resolve('artifacts', `mazrae-rangi-${mode}.apk`);
fs.copyFileSync(srcApk, destApk);

const buf = fs.readFileSync(destApk);
const sha = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
const mb = (buf.length / (1024 * 1024)).toFixed(2);
console.log(`[OK] APK آماده شد (${signedTag}): ${destApk} (${mb} MB, sha256=${sha})`);
