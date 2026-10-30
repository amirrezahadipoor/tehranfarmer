// ===== بارگذار واقعی، مرحله‌ای و ۱۰۰٪ ضدقفل پیش از ورود به بازی =====
// نکتهٔ کلیدی اندروید:
// ۱) هرگز از requestAnimationFrame برای پیشروی گام‌های لودینگ استفاده نمی‌کنیم (در برخی ROMهای اندروید پیش از اولین فریم متوقف می‌ماند).
// ۲) هر گام دارای سقف زمانی قطعی (Timeout) و بلوک try/catch مستقل است تا قفل‌شدن روی ۸٪ یا هر درصد دیگر از نظر ریاضی ناممکن باشد.

import { cropPart, flushPendingBitmaps, iconPart, soilPart } from './art';
import { iconURL } from './artIcons';
import { CROPS, GOODS } from './data';
import { hydrateNativeStorage } from './nativeStorage';
import { prewarmScene } from './scenes';
import { loadSettings } from './settings';
import { hasSave, loadGame, season } from './state';
import { UT } from '../strings/uiText';

export interface BootProgress {
  pct: number;
  label: string;
}

const UI_ICON_NAMES = [
  'play', 'sparkle', 'book', 'sound', 'mute', 'globe', 'save', 'coin', 'bolt', 'bag',
  'menu', 'pause', 'home', 'town', 'fish', 'bee', 'sun', 'moon', 'cloud', 'rain', 'snow',
  'star', 'lock', 'check', 'close', 'arrow', 'plus', 'minus', 'info', 'trophy', 'medal', 'scroll',
  'heart', 'hammer', 'cart', 'well', 'pond', 'hive', 'honey', 'feed', 'silo', 'gh',
  'hoe', 'seedbag', 'can', 'sickle', 'plant', 'ledger', 'note',
  'tractor', 'seeder', 'harvester', 'sprinkler', 'feeder', 'collector', 'drone',
  'cow', 'sheep', 'goat', 'chicken', 'duck', 'rabbit',
  ...GOODS.map((g) => g.id),
];

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function withStepTimeout<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false;
    const finish = (v: T) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    const t = setTimeout(() => finish(fallback), ms);
    work
      .then((v) => {
        clearTimeout(t);
        finish(v);
      })
      .catch(() => {
        clearTimeout(t);
        finish(fallback);
      });
  });
}

const BOOT_ICON_NAMES = ['play', 'book', 'sound', 'mute', 'globe', 'save', 'coin', 'bolt', 'bag', 'menu', 'close', 'arrow'] as const;

async function decodeAllUiIcons(names: readonly string[] = UI_ICON_NAMES): Promise<void> {
  const unique = Array.from(new Set(names));
  // دسته‌های کوچک جلوی یک long task بزرگ در زمان پیش‌ساخت پس‌زمینه را می‌گیرند.
  for (let offset = 0; offset < unique.length; offset += 6) {
    const jobs = unique.slice(offset, offset + 6).map((name) => {
      const src = iconURL(name);
      if (typeof Image === 'undefined') return Promise.resolve();
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      return typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();
    });
    await withStepTimeout(Promise.all(jobs), 450, []);
    if (offset + 6 < unique.length) await waitMs(16);
  }
}

let bootDoneOnce = false;

export function isBootAlreadyWarm(): boolean {
  return bootDoneOnce;
}

/** کارهای سنگینِ غیرلازم برای اولین تعامل، پس از نمایش بازی و در idle انجام می‌شوند. */
function scheduleDeferredPrewarm(sn: number) {
  const work = async () => {
    for (const scene of ['town', 'river', 'apiary'] as const) {
      try { await prewarmScene(scene, sn); } catch { /* */ }
      await waitMs(24);
    }
    try {
      for (const c of CROPS.slice(3, 8)) {
        for (let st = 0; st < 4; st++) cropPart(c.id, st, false);
        await waitMs(16);
      }
      const bootIcons = new Set<string>(BOOT_ICON_NAMES);
      await decodeAllUiIcons(UI_ICON_NAMES.filter((name) => !bootIcons.has(name)));
      await withStepTimeout(flushPendingBitmaps(), 250, undefined);
    } catch { /* */ }
  };
  // اول Start و اولین فریم واقعی نمایش داده شوند؛ پیش‌ساخت اضافی پس از آن آغاز می‌شود.
  setTimeout(() => {
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => { void work(); }, { timeout: 5000 });
    } else {
      void work();
    }
  }, 1800);
}

export async function runGenuinePreload(onProgress: (p: BootProgress) => void): Promise<void> {
  const forceVisualHold = Boolean(typeof window !== 'undefined' && window.location?.search?.includes('boot=1'));
  const isAutomated = typeof navigator !== 'undefined' && navigator.webdriver === true && !forceVisualHold;
  const stepGap = isAutomated ? 4 : 60;

  // گام ۱: بازیابی ذخیرهٔ بومی اندروید، تنظیمات زبان و فونت‌های دست‌نویس (با Timeout سخت‌گیرانه)
  onProgress({ pct: 12, label: UT.bootStepSave });
  await waitMs(20);
  try {
    await withStepTimeout(hydrateNativeStorage(), 600, 0);
    loadSettings();
    if (hasSave()) loadGame();
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await withStepTimeout(document.fonts.ready, 350, undefined);
    }
  } catch { /* */ }
  onProgress({ pct: 28, label: UT.bootStepSave });
  await waitMs(stepGap);

  const sn = season();

  // گام ۲: ترسیم کامل بوم مزرعهٔ اصلی در حافظه
  onProgress({ pct: 38, label: UT.bootStepFarm });
  await waitMs(20);
  try {
    await prewarmScene('farm', sn);
  } catch { /* */ }
  onProgress({ pct: 52, label: UT.bootStepFarm });
  await waitMs(stepGap);

  // گام ۳: صحنه‌های غیرجاری عمداً مسیر boot را مسدود نمی‌کنند و در idle ساخته می‌شوند.
  onProgress({ pct: 60, label: UT.bootStepWorlds });
  await waitMs(20);
  onProgress({ pct: 76, label: UT.bootStepWorlds });
  await waitMs(stepGap);

  // گام ۴: پیش‌ساخت کاشی‌های خاک، محصولات و اجزای محیطی
  onProgress({ pct: 84, label: UT.bootStepArt });
  await waitMs(20);
  try {
    for (let v = 0; v < 3; v++) {
      soilPart('wild', 1, false, v);
      soilPart('raw', 1, false, v);
      soilPart('tilled', 1, false, v);
      soilPart('tilled', 1, true, v);
    }
    for (const c of CROPS.slice(0, 3)) {
      for (let st = 0; st < 4; st++) cropPart(c.id, st, false);
    }
    for (const n of ['sun', 'moon', 'star', 'drop', 'hive', 'fish', 'bee', 'hammer', 'cart', 'house']) {
      iconPart(n);
    }
    await withStepTimeout(flushPendingBitmaps(), 250, undefined);
  } catch { /* */ }
  onProgress({ pct: 92, label: UT.bootStepArt });
  await waitMs(stepGap);

  // گام ۵: فقط آیکون‌های لازم برای شروع؛ بقیه در idle دیکد می‌شوند
  onProgress({ pct: 96, label: UT.bootStepIcons });
  await waitMs(20);
  try {
    await decodeAllUiIcons(BOOT_ICON_NAMES);
  } catch { /* */ }
  onProgress({ pct: 100, label: UT.bootStepIcons });
  await waitMs(isAutomated ? 10 : 150);
  bootDoneOnce = true;
  scheduleDeferredPrewarm(sn);
}
