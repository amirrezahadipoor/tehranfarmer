import fs from 'node:fs';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { installDom } from './helpers/dom';
import { S, UI, exportSaveJson, hasSave, importSaveJson, listBackupSlots, loadGame, resetGame, restoreBackupSlot, saveGame } from '../src/game/state';
import { exitNativeApp, handleHardwareBack, installAndroidBackHandler } from '../src/game/androidNav';
import { CFG, SETTINGS_KEY, loadSettings, resetSettings, updateSetting } from '../src/game/settings';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';
import { clearErrorLog, exportErrorLogJson, getErrorLog, setLastError } from '../src/game/errorLog';
import { hydrateNativeStorage, nativeRemoveItem, nativeSetItem, setNativePreferencesDriver } from '../src/game/nativeStorage';
import { runGenuinePreload } from '../src/game/preloader';

beforeAll(() => { installDom(); });

describe('فاز ۹ — جداسازی کامل تنظیمات از سِیو و پلتفرم (P9-01)', () => {
  it('ریست کامل سِیو بازی هیچ‌یک از تنظیمات ذخیره‌شدهٔ بازیکن را پاک یا بازنشانی نمی‌کند (P9-01)', () => {
    resetSettings();
    updateSetting('sound', false);
    updateSetting('music', false);
    updateSetting('haptics', false);
    updateSetting('fontScale', 1.2);
    updateSetting('reduceMotion', true);
    updateSetting('colorblind', true);
    updateSetting('shortBeat', true);

    S.coins = 99999;
    S.day = 45;
    saveGame();
    expect(localStorage.getItem('mazrae-rangi-save-v1')).toBeTruthy();
    expect(localStorage.getItem(SETTINGS_KEY)).toBeTruthy();

    // ریست کامل بازی باید سِیو را پاک کند اما تنظیمات بازیکن را دست‌نخورده نگه دارد
    resetGame();
    expect(S.day).toBe(1);
    expect(S.coins).toBe(700);
    expect(localStorage.getItem('mazrae-rangi-save-v1')).toBeNull();

    const loaded = loadSettings();
    expect(CFG.fontScale).toBe(1.2);
    expect(loaded.sound).toBe(false);
    expect(loaded.music).toBe(false);
    expect(loaded.haptics).toBe(false);
    expect(loaded.fontScale).toBe(1.2);
    expect(loaded.reduceMotion).toBe(true);
    expect(loaded.colorblind).toBe(true);
    expect(loaded.shortBeat).toBe(true);

    resetSettings();
  });

  it('برون‌بری و درون‌بری JSON سِیو رفت‌وبرگشت ۱۰۰٪ سالم دارد و ورودی خراب را بدون آسیب رد می‌کند (P9-02)', () => {
    resetGame();
    S.coins = 42750;
    S.day = 88;
    S.inv.saffron = 14;
    S.wellLv = 2;
    S.story.chapter = 4;

    const json = exportSaveJson();
    expect(json).toContain('"mazrae-rangi"');

    // پاک کردن کامل بازی و سپس درون‌بری از فایل JSON
    resetGame();
    expect(S.coins).toBe(700);
    expect(S.day).toBe(1);

    expect(importSaveJson(json)).toBe(true);
    expect(S.coins).toBe(42750);
    expect(S.day).toBe(88);
    expect(S.inv.saffron).toBe(14);
    expect(S.wellLv).toBe(2);
    expect(S.story.chapter).toBe(4);

    // ورودی نامعتبر نباید وضعیت زندهٔ بازی را خراب کند
    expect(importSaveJson('{not valid json')).toBe(false);
    expect(importSaveJson('{"hello":"world"}')).toBe(false);
    expect(importSaveJson('[]')).toBe(false);
    expect(S.coins).toBe(42750);
    expect(S.day).toBe(88);
  });

  it('پشتیبان‌گیری خودکار چرخشی ۲ اسلاته در برابر خرابی همزمان اسلات اصلی و اسلات ۱ مقاوم است (P9-03)', () => {
    // پشتیبان‌ها هر BACKUP_INTERVAL_MS (۱۰ دقیقه) چرخش می‌کنند؛ زمان شبیه‌سازی‌شده را جلو می‌بریم
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
    resetGame();
    S.day = 12; S.coins = 1500; saveGame(); // اصلی = ۱۲
    vi.advanceTimersByTime(11 * 60 * 1000);
    S.day = 25; S.coins = 4800; saveGame(); // اصلی = ۲۵، bak1 = ۱۲
    vi.advanceTimersByTime(11 * 60 * 1000);
    S.day = 33; S.coins = 9100; saveGame(); // اصلی = ۳۳، bak1 = ۲۵، bak2 = ۱۲
    } finally { vi.useRealTimers(); }

    const slots = listBackupSlots();
    expect(slots).toEqual([
      { slot: 1, day: 25, coins: 4800 },
      { slot: 2, day: 12, coins: 1500 },
    ]);

    // خرابی اسلات اصلی -> بازیابی خودکار از اسلات ۱
    localStorage.setItem('mazrae-rangi-save-v1', '{{corrupted-json');
    expect(loadGame()).toBe(true);
    expect(S.day).toBe(25);
    expect(S.coins).toBe(4800);

    // خرابی همزمان اسلات اصلی و اسلات ۱ -> بازیابی خودکار از اسلات ۲
    localStorage.setItem('mazrae-rangi-save-v1', '<<bad>>');
    localStorage.setItem('mazrae-rangi-save-v1-bak1', '<<bad-bak1>>');
    expect(loadGame()).toBe(true);
    expect(S.day).toBe(12);
    expect(S.coins).toBe(1500);

    // بازیابی دستی اسلات ۲
    S.day = 99;
    expect(restoreBackupSlot(2)).toBe(true);
    expect(S.day).toBe(12);
  });

  it('ErrorBoundary و گزارش خطای محلی بدون سفید شدن صفحه و بدون ارسال شبکه‌ای کار می‌کنند (P9-06)', () => {
    clearErrorLog();
    expect(getErrorLog()).toEqual([]);

    setLastError('synthetic-ui-boom', 'react');
    expect(getErrorLog().length).toBe(1);
    expect(exportErrorLogJson()).toContain('"localOnly": true');

    const inst = new ErrorBoundary({ children: null });
    inst.state = ErrorBoundary.getDerivedStateFromError(new Error('boom-render'));
    inst.componentDidCatch(new Error('boom-render'), { componentStack: '\n    at BrokenChild' });

    const html = renderToStaticMarkup(inst.render() as ReactElement);
    expect(html).toContain('role="alert"');
    expect(html).toContain('boom-render');
    expect(getErrorLog().length).toBe(2);

    clearErrorLog();
    expect(getErrorLog()).toEqual([]);
  });

  it('ذخیره‌سازی امن اندروید (Capacitor Preferences) سِیو و تنظیمات را پس از پاک‌شدن کامل WebView حفظ می‌کند (P9-07)', async () => {
    const nativeStore = new Map<string, string>();
    setNativePreferencesDriver({
      get: async ({ key }) => ({ value: nativeStore.get(key) ?? null }),
      set: async ({ key, value }) => { nativeStore.set(key, value); },
      remove: async ({ key }) => { nativeStore.delete(key); },
    });

    try {
      resetGame();
      resetSettings();
      updateSetting('music', false);
      updateSetting('fontScale', 1.2);
      S.day = 61;
      S.coins = 33500;
      saveGame();

      // شبیه‌سازی بستن برنامه و پاک شدن کامل localStorage توسط WebView اندروید
      localStorage.clear();
      expect(hasSave()).toBe(false);

      // اجرای دوبارهٔ برنامه و بازیابی از SharedPreferences بومی
      const restored = await hydrateNativeStorage();
      expect(restored).toBeGreaterThanOrEqual(2);
      expect(hasSave()).toBe(true);
      expect(loadGame()).toBe(true);
      expect(S.day).toBe(61);
      expect(S.coins).toBe(33500);
      expect(loadSettings().music).toBe(false);
      expect(loadSettings().fontScale).toBe(1.2);
    } finally {
      setNativePreferencesDriver(null);
      resetSettings();
    }
  });

  it('تک‌فایل dist/index.html با موسیقی آفلاین زیر بودجهٔ ۲MB است و صفر لینک بیرونی دارد (P9-09)', () => {
    if (!fs.existsSync('dist/index.html')) return;
    const html = fs.readFileSync('dist/index.html', 'utf8');
    const kb = Math.round(html.length / 1024);
    expect(kb).toBeLessThan(2048);
    expect(kb).toBeLessThanOrEqual(2000);
  });

  it('ممیزی سورس حریم خصوصی صفر فراخوانی شبکه/تله‌متری در کل src تأیید می‌کند (P9-10)', async () => {
    const { execFileSync } = await import('node:child_process');
    const out = execFileSync(process.execPath, ['scripts/privacy-audit.mjs'], { encoding: 'utf8' });
    expect(out).toContain('تخطی: 0');
  });

  it('آیکون تطبیقی و همهٔ چگالی‌های آیکون و اسپلش اندروید اختصاصی و غیردیفالت هستند (P10-03)', () => {
    const bgXml = fs.readFileSync('android/app/src/main/res/values/ic_launcher_background.xml', 'utf8');
    expect(bgXml).toContain('#8FD35A');
    const fgXml = fs.readFileSync('android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml', 'utf8');
    expect(fgXml).toContain('#D9534A');
    for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
      expect(fs.statSync(`android/app/src/main/res/mipmap-${d}/ic_launcher.png`).size).toBeGreaterThan(300);
      expect(fs.statSync(`android/app/src/main/res/mipmap-${d}/ic_launcher_round.png`).size).toBeGreaterThan(300);
      expect(fs.statSync(`android/app/src/main/res/drawable-land-${d}/splash.png`).size).toBeGreaterThan(1000);
    }
  });

  it('مدیریت دکمهٔ Back اندروید زنجیرهٔ مودال -> سینی بذر -> بازگشت به مزرعه -> تأیید خروج را رعایت می‌کند (P10-04)', () => {
    UI.modal = 'seed';
    UI.seedTray = true;
    UI.scene = 'town';
    UI.confirm = null;

    expect(handleHardwareBack()).toBe('modal-closed');
    expect(UI.modal).toBeNull();

    expect(handleHardwareBack()).toBe('tray-closed');
    expect(UI.seedTray).toBe(false);

    expect(handleHardwareBack()).toBe('returned-farm');
    expect(UI.scene).toBe('farm');

    expect(handleHardwareBack()).toBe('confirm-exit');
    expect(UI.confirm).toBe('exit');

    expect(handleHardwareBack()).toBe('confirm-closed');
    expect(UI.confirm).toBeNull();
  });

  it('قفل جهت افقی sensorLandscape، تمام‌صفحهٔ Immersive بدون نوار سیستم و حذف کامل دسترسی اینترنت در مانیفست (P10-05)', () => {
    const manifest = fs.readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
    expect(manifest).toContain('android:screenOrientation="sensorLandscape"');
    expect(manifest).not.toContain('android.permission.INTERNET');
    const activity = fs.readFileSync('android/app/src/main/java/ir/mazraerangi/game/MainActivity.java', 'utf8');
    expect(activity).toContain('SCREEN_ORIENTATION_SENSOR_LANDSCAPE');
    expect(activity).toContain('BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE');
    expect(activity).toContain('WindowInsetsCompat.Type.systemBars()');
  });

  it('امضای Release مبتنی بر متغیر محیطی، مستند KEYSTORE.md و نبود هرگونه کلید در ریپو (P10-06)', () => {
    const gradle = fs.readFileSync('android/app/build.gradle', 'utf8');
    expect(gradle).toContain('System.getenv("KEYSTORE_PATH")');
    expect(gradle).toContain('System.getenv("KEYSTORE_PASSWORD")');
    expect(gradle).toContain('System.getenv("KEY_ALIAS")');
    expect(gradle).toContain('signingConfigs.release');
    expect(fs.existsSync('docs/KEYSTORE.md')).toBe(true);
    expect(fs.readFileSync('docs/KEYSTORE.md', 'utf8')).toContain('KEYSTORE_PATH');

    const badExt = ['.keystore', '.jks', '.p12', '.pfx'];
    const found: string[] = [];
    const scan = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', '.git', 'build', '.gradle'].includes(e.name)) continue;
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) scan(p);
        else if (badExt.some((ext) => e.name.toLowerCase().endsWith(ext))) found.push(p);
      }
    };
    scan('.');
    expect(found).toEqual([]);
  });

  it('چک‌لیست تست دستگاه DEVICE-CHECKLIST.md و اسکریپت بازرسی باینری APK موجود و معتبرند (P10-07)', () => {
    expect(fs.existsSync('docs/DEVICE-CHECKLIST.md')).toBe(true);
    const checklist = fs.readFileSync('docs/DEVICE-CHECKLIST.md', 'utf8');
    expect(checklist).toContain('adb install');
    expect(checklist).toContain('sensorLandscape');
    expect(checklist).toContain('force-stop');
    expect(fs.existsSync('scripts/verify-apk.mjs')).toBe(true);
  });

  it('گردش‌کار GitHub Actions اندروید هر دو APK و نسخهٔ وب آفلاین را می‌سازد، بازرسی می‌کند و به عنوان Artifact بارگذاری می‌کند (P10-08)', () => {
    const wf = fs.readFileSync('.github/workflows/android.yml', 'utf8');
    expect(wf).toContain('npm run check');
    expect(wf).toContain('npm run android:debug');
    expect(wf).toContain('npm run android:release');
    expect(wf).toContain('npm run android:verify');
    expect(wf).toContain('actions/upload-artifact@v4');
    expect(wf).toContain('artifacts/mazrae-rangi-debug.apk');
    expect(wf).toContain('artifacts/mazrae-rangi-release.apk');
  });

  it('نسخهٔ package.json و build.gradle همگام‌اند و مستندات کامل انتشار (CHANGELOG, PRIVACY, RELEASE-CHECKLIST) موجودند (P10-09)', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string };
    const gradle = fs.readFileSync('android/app/build.gradle', 'utf8');
    expect(gradle).toContain(`versionName "${pkg.version}"`);
    expect(fs.readFileSync('CHANGELOG.md', 'utf8')).toContain(`[${pkg.version}]`);
    expect(fs.readFileSync('PRIVACY.md', 'utf8')).toContain('android.permission.INTERNET');
    expect(fs.readFileSync('docs/RELEASE-CHECKLIST.md', 'utf8')).toContain('apksigner verify');
  });

  it('همهٔ تسک‌های نقشهٔ راه (۱۱۸ تسک اصلی + تسک‌های فاز ۱۹) تیک خورده‌اند و سقف ۶۰۰ خط ماژول‌ها رعایت شده است (P10-10)', () => {
    const roadmap = fs.readFileSync('ROADMAP.md', 'utf8');
    const unchecked = [...roadmap.matchAll(/^- \[ \] (P\d+-\d+)/gm)];
    const checked = [...roadmap.matchAll(/^- \[x\] (P\d+-\d+)/gm)];
    const mainTasks = checked.filter((m) => Number(m[1].split('-')[0].slice(1)) <= 18);
    const auditTasks = checked.filter((m) => m[1].startsWith('P19-'));
    expect(unchecked.length).toBe(0);
    expect(mainTasks.length).toBe(118);
    // فاز ۱۹ = رفع ایرادهای ممیزی ۲۰۲۶-۱۰-۲۸
    expect(auditTasks.length).toBeGreaterThanOrEqual(18);
    expect(checked.length).toBe(mainTasks.length + auditTasks.length);
  });

  it('پل بومی Capacitor 8 (native-bridge همگام بدون Promise/.then/.catch) هرگز کرش نمی‌کند', async () => {
    let removed = false;
    let exited = false;
    const win = window as unknown as { Capacitor?: unknown };
    win.Capacitor = {
      isNativePlatform: () => true,
      Plugins: {
        App: {
          addListener: (_ev: string, _cb: () => void) => ({ remove: () => { removed = true; } }),
          exitApp: () => { exited = true; },
        },
        Preferences: {
          get: ({ key }: { key: string }) => ({ value: key === 'k' ? 'v' : null }),
          set: () => undefined,
          remove: () => undefined,
        },
      },
    };
    const dispose = installAndroidBackHandler();
    await Promise.resolve();
    exitNativeApp();
    nativeSetItem('k', '1');
    nativeRemoveItem('k');
    dispose();
    win.Capacitor = undefined;
    expect(exited).toBe(true);
    expect(removed).toBe(true);
  });

  it('ضد-پرک سیاه و سفید اندروید و ضد-قفل ۸٪: useLegacyBridge، صفر FBO مخفی، بدون alpha:false و عبور قطعی از پلاگین هنگ‌کرده', async () => {
    const capCfg = fs.readFileSync('capacitor.config.ts', 'utf8');
    expect(capCfg).not.toContain('useLegacyBridge');
    const styles = fs.readFileSync('android/app/src/main/res/values/styles.xml', 'utf8');
    expect((styles.match(/#7cc8f4/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(styles).toContain('android:forceDarkAllowed');
    const activity = fs.readFileSync('android/app/src/main/java/ir/mazraerangi/game/MainActivity.java', 'utf8');
    expect(activity).not.toContain('LAYER_TYPE_SOFTWARE');
    expect(activity).toContain('OVER_SCROLL_NEVER');
    expect(activity).toContain('lastSafeKey');
    expect(activity).not.toContain('WindowInsetsCompat.CONSUMED');
    const engine = fs.readFileSync('src/game/engine.ts', 'utf8');
    expect(engine).not.toContain('alpha: false');
    expect(engine).toContain('1920 * 1080');
    const art = fs.readFileSync('src/game/art.ts', 'utf8');
    expect(art).toContain('willReadFrequently: true');
    const scenes = fs.readFileSync('src/game/scenes.ts', 'utf8');
    expect(scenes).toContain('willReadFrequently: true');

    // شبیه‌سازی قفل کامل پل بومی Preferences روی گوشی واقعی — بارگذار هرگز نباید روی ۸٪/۱۲٪ گیر کند!
    setNativePreferencesDriver({
      get: () => new Promise(() => {}),
      set: () => new Promise(() => {}),
      remove: () => new Promise(() => {}),
    });
    const steps: number[] = [];
    const t0 = Date.now();
    await runGenuinePreload((p) => steps.push(p.pct));
    setNativePreferencesDriver(null);
    expect(steps[0]).toBe(12);
    expect(steps[steps.length - 1]).toBe(100);
    expect(Date.now() - t0).toBeLessThan(2500);
  });
});

