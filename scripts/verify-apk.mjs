#!/usr/bin/env node
// بازرسی خودکار باینری APK اندروید (ساختار ZIP، دارایی تک‌فایل وب، DEX، آیکون‌ها، مانیفست، useLegacyBridge (removed)، setLayerType و صفر مجوز شبکه) (P10-07)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const targets = process.argv.slice(2);
const debugArtifact = path.resolve('artifacts/mazrae-rangi-debug.apk');
const signedReleaseArtifact = path.resolve('artifacts/mazrae-rangi-release.apk');
const unsignedReleaseArtifact = path.resolve('artifacts/mazrae-rangi-release-unsigned.apk');
const releaseArtifact = fs.existsSync(unsignedReleaseArtifact) && !fs.existsSync(signedReleaseArtifact)
  ? unsignedReleaseArtifact
  : signedReleaseArtifact;
const apks = targets.length
  ? targets.map((p) => path.resolve(p))
  : [debugArtifact, releaseArtifact];

const sdkCandidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  '/opt/android-sdk',
  path.join(process.env.HOME ?? '', 'Android/Sdk'),
].filter(Boolean);

function findBuildTool(name) {
  for (const sdk of sdkCandidates) {
    const bt = path.join(sdk, 'build-tools');
    if (!fs.existsSync(bt)) continue;
    for (const ver of fs.readdirSync(bt).sort().reverse()) {
      const executable = process.platform === 'win32'
        ? (name === 'apksigner' ? 'apksigner.bat' : `${name}.exe`)
        : name;
      const bin = path.join(bt, ver, executable);
      if (fs.existsSync(bin)) return bin;
    }
  }
  return null;
}

function readZipCentral(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ساختار ZIP/EOCD معتبر در APK یافت نشد');
  const total = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) throw new Error('امضای Central Directory نامعتبر است');
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const uncompSize = buf.readUInt32LE(ptr + 24);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8');
    entries.set(name, { method, compSize, uncompSize, localOffset });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function extractEntry(buf, entry) {
  const lh = entry.localOffset;
  if (buf.readUInt32LE(lh) !== 0x04034b50) throw new Error('هدر محلی ZIP نامعتبر است');
  const nameLen = buf.readUInt16LE(lh + 26);
  const extraLen = buf.readUInt16LE(lh + 28);
  const dataStart = lh + 30 + nameLen + extraLen;
  const slice = buf.subarray(dataStart, dataStart + entry.compSize);
  if (entry.method === 0) return slice;
  if (entry.method === 8) return zlib.inflateRawSync(slice);
  throw new Error(`روش فشرده‌سازی ناشناخته در APK: ${entry.method}`);
}

const aapt2 = findBuildTool('aapt2');
const apksigner = findBuildTool('apksigner');

for (const apk of apks) {
  if (!fs.existsSync(apk)) {
    console.error(`[ERR] فایل APK یافت نشد: ${apk}`);
    process.exit(1);
  }
  const buf = fs.readFileSync(apk);
  const entries = readZipCentral(buf);
  const explicitlyUnsigned = path.basename(apk) === 'mazrae-rangi-release-unsigned.apk';
  if (!explicitlyUnsigned) {
    if (!apksigner) {
      console.error(`[ERR] برای اثبات امضای ${path.basename(apk)} ابزار apksigner در Android Build-Tools لازم است.`);
      process.exit(1);
    }
    let signatureReport = '';
    try {
      signatureReport = execFileSync(apksigner, ['verify', '--verbose', apk], {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      console.error(`[ERR] امضای رمزنگاری ${path.basename(apk)} معتبر نیست: ${error.stderr?.toString() || error.message}`);
      process.exit(1);
    }
    if (!/Verified using v[23] scheme[^\n]*: true/.test(signatureReport)) {
      console.error(`[ERR] ${path.basename(apk)} امضای مدرن v2/v3 ندارد و برای توزیع تأیید نمی‌شود.`);
      process.exit(1);
    }
    console.log(`[OK] امضای رمزنگاری v2/v3 برای ${path.basename(apk)} تأیید شد.`);
  } else {
    console.log(`[i] ${path.basename(apk)} صریحاً بدون امضا است و برای انتشار رسمی مجاز نیست.`);
  }

  const required = [
    'AndroidManifest.xml',
    'classes.dex',
    'resources.arsc',
    'assets/capacitor.config.json',
    'assets/public/index.html',
  ];
  for (const req of required) {
    if (!entries.has(req)) {
      console.error(`[ERR] ورودی الزامی ${req} در ${path.basename(apk)} وجود ندارد`);
      process.exit(1);
    }
  }
  const htmlSize = entries.get('assets/public/index.html').uncompSize;
  if (htmlSize < 400_000) {
    console.error(`[ERR] حجم assets/public/index.html در APK به شکل غیرعادی کوچک است: ${htmlSize}B`);
    process.exit(1);
  }

  // بازرسی مستقیم محتوای واقعی بسته‌بندی‌شده داخل فایل APK
  const capJson = JSON.parse(extractEntry(buf, entries.get('assets/capacitor.config.json')).toString('utf8'));
  // useLegacyBridge check removed — modern bridge is active

  if (capJson?.backgroundColor !== '#7cc8f4') {
    console.error(`[ERR] در ${path.basename(apk)} رنگ پس‌زمینهٔ ضد-پرک #7cc8f4 تنظیم نشده است!`);
    process.exit(1);
  }

  const htmlText = extractEntry(buf, entries.get('assets/public/index.html')).toString('utf8');
  if (htmlText.includes('alpha:false') || htmlText.includes('alpha: false')) {
    console.error(`[ERR] در ${path.basename(apk)} هنوز بوم باگ‌دار alpha:false وجود دارد!`);
    process.exit(1);
  }

  // بررسی بایت‌کد DEX کلاس MainActivity و سورس جاوا (بدون قفل نخ UI با LAYER_TYPE_SOFTWARE و با حضور configureActiveWebView + setOverScrollMode)
  const mainJava = fs.readFileSync(path.resolve('android/app/src/main/java/ir/mazraerangi/game/MainActivity.java'), 'utf8');
  if (mainJava.includes('LAYER_TYPE_SOFTWARE')) {
    console.error('[ERR] فراخوانی قفل‌کنندهٔ LAYER_TYPE_SOFTWARE در MainActivity.java یافت شد!');
    process.exit(1);
  }
  let foundOverScroll = false;
  let foundConfigureWebView = false;
  for (const [entryName, meta] of entries.entries()) {
    if (entryName.startsWith('classes') && entryName.endsWith('.dex')) {
      const dexBytes = extractEntry(buf, meta);
      if (dexBytes.includes(Buffer.from('setOverScrollMode'))) foundOverScroll = true;
      if (dexBytes.includes(Buffer.from('configureActiveWebView'))) foundConfigureWebView = true;
    }
  }
  if (!foundOverScroll || !foundConfigureWebView) {
    console.error(`[ERR] متدهای حیاتی configureActiveWebView / setOverScrollMode در DEX داخل ${path.basename(apk)} یافت نشدند!`);
    process.exit(1);
  }

  if (aapt2) {
    const perms = execFileSync(aapt2, ['dump', 'permissions', apk], { encoding: 'utf8' });
    if (perms.includes('android.permission.INTERNET')) {
      console.error(`[ERR] مجوز ممنوعهٔ INTERNET در مانیفست نهایی ${path.basename(apk)} یافت شد!`);
      process.exit(1);
    }
    const badging = execFileSync(aapt2, ['dump', 'badging', apk], { encoding: 'utf8' });
    // نسخه از منبع حقیقت واحد خوانده می‌شود (package.json) تا با هر version:bump هم‌گام بماند (رفع C-9).
    const pkgVersion = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).version;
    const versionCode = String(
      pkgVersion.split('.').reduce((acc, n) => acc * 10 + Number(n), 0) /* 10.0.1 -> 1001 */,
    );
    const packageId = "name='ir.mazraerangi.game'";
    for (const needle of [packageId, `versionCode='${versionCode}'`, `versionName='${pkgVersion}'`, "targetSdkVersion:'35'", "application-label:'مزرعه رنگی'"]) {
      if (!badging.includes(needle)) {
        console.error(`[ERR] مشخصهٔ ${needle} در خروجی aapt2 برای ${path.basename(apk)} یافت نشد`);
        process.exit(1);
      }
    }
  }

}
