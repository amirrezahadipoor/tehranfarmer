#!/usr/bin/env node
// ساخت کامل APK اندروید (debug / release) با Capacitor + Gradle و تأیید خروجی (P10-02)
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// رفع C-7: همگام‌سازی Capacitor بخشی از خودِ اسکریپت است و با هر بار ساخت اجرا می‌شود؛
// قبلاً اگر کسی مستقیم gradlew می‌زد، settings.gradle به پوشهٔ ناموجود
// capacitor-cordova-android-plugins ارجاع می‌داد و بیلد شکست می‌خورد.
const mode = process.argv[2] === 'release' ? 'release' : 'debug';
const withE2EAssets = mode === 'debug';
const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
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

console.log(`[1/4] ساخت وب (vite build) برای حالت ${mode}...`);
execFileSync('npx', ['vite', 'build'], {
  stdio: 'inherit',
  cwd: rootDir,
  env: withE2EAssets ? { ...env, VITE_E2E_ASSETS: '1' } : env,
});

console.log('[2/4] همگام‌سازی دارایی‌ها با Capacitor Android (cap sync — اجباری)...');
execFileSync('npx', ['cap', 'sync', 'android'], { stdio: 'inherit', cwd: rootDir, env });
const cordovePluginsDir = path.resolve(rootDir, 'android/capacitor-cordova-android-plugins');
if (!fs.existsSync(cordovePluginsDir)) {
  console.error('[ERR] پوشهٔ android/capacitor-cordova-android-plugins پس از cap sync ساخته نشد؛ Gradle شکست می‌خورد.');
  process.exit(1);
}

const outDir = path.resolve('android/app/build/outputs/apk', mode);
if (fs.existsSync(outDir)) {
  for (const old of fs.readdirSync(outDir)) {
    if (old.endsWith('.apk') || old.endsWith('.idsig')) fs.rmSync(path.join(outDir, old), { force: true });
  }
}

console.log(`[3/4] اجرای Gradle (${task})...`);
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const gradleArgs = mode === 'release' ? ['--no-daemon', task, '-x', 'lintVitalRelease', '-x', 'lintVitalAnalyzeRelease'] : ['--no-daemon', task];
execFileSync(gradlew, gradleArgs, { cwd: path.resolve(rootDir, 'android'), stdio: 'inherit', env });

console.log('[4/4] بازرسی باینری خروجی و کپی به artifacts/...');

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
