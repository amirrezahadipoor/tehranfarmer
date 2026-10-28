// رگرسیون‌های بررسی ریزبینانهٔ «مزرعه رنگی» — هر تست یک باگ مشخص را قفل می‌کند
import { beforeEach, describe, expect, it } from 'vitest';
import {
  S, UI, saveGame, loadGame, resetGame, newDay, advance, sellAll, invCount,
} from './helpers/game';
import { migrateSave, SAVE_VERSION } from '../src/game/core/saveMigrations';
import { tickLiveDaylightGrowth } from '../src/game/core/dayLoop';
import { HONEY_SEASON_MULT, COLS, ROWS } from '../src/game/data';
import { setNativePreferencesDriver, hydrateNativeStorage, nativeSetItem } from '../src/game/nativeStorage';
import { isSaveLocked, importSaveJson } from '../src/game/state';
import { getErrorLog } from '../src/game/errorLog';
import { GT } from '../src/strings/gameText';

const KEY = 'mazrae-rangi-save-v1';
const BAK1 = KEY + '-bak1';

beforeEach(() => {
  localStorage.clear();
  setNativePreferencesDriver(null);
  resetGame();
});

describe('H1: ادامه با سِیوِ خوانده‌نشده، سیو را بازنویسی نمی‌کند', () => {
  it('loadGame شکست می‌خورد و ذخیره قفل می‌شود', () => {
    const corrupt = '{"v":99,"day":3,"coins":5';
    localStorage.setItem(KEY, corrupt);
    expect(loadGame()).toBe(false);
    expect(isSaveLocked()).toBe(true);
    expect(saveGame()).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(corrupt);
  });

  it('پس از بارگذاری موفق قفل باز می‌شود', () => {
    localStorage.setItem(KEY, '{"v":99,"day":3}');
    loadGame();
    localStorage.setItem(KEY, JSON.stringify({ ...S, v: SAVE_VERSION, coins: 42 }));
    expect(loadGame()).toBe(true);
    expect(isSaveLocked()).toBe(false);
  });
});

describe('H2: کلید ناشناخته در کوله‌پشتی کرش فروش نمی‌سازد', () => {
  it('migrateSave کلید ناشناخته inv را حذف می‌کند', () => {
    const d = migrateSave({ v: SAVE_VERSION, day: 3, coins: 10, inv: { bogus: 5, wheat: 2 }, seeds: { nope: 3, wheat: 1 } }) as Record<string, any>;
    expect(d.inv).toEqual({ wheat: 2 });
    expect(d.seeds).toEqual({ wheat: 1 });
  });

  it('sellAll بعد از وارد کردن سِیوِ دست‌کاری‌شده کرش نمی‌کند', () => {
    expect(importSaveJson(JSON.stringify({ v: SAVE_VERSION, day: 3, coins: 10, inv: { bogus: 5, wheat: 3 } }))).toBe(true);
    expect(() => sellAll()).not.toThrow();
    expect(S.inv.bogus).toBeUndefined();
  });
});

describe('H3: ضریب عسل فصلی در شبیه‌ساز روزانه و زنده یکسان است', () => {
  it('نسبت تولید زنده بین فصل‌ها با جدول مشترک برابر است', () => {
    const gains: number[] = [];
    for (let sn = 0; sn < 4; sn++) {
      resetGame();
      S.day = 1 + sn * 7;
      S.hives = 1;
      S.honeyAcc = 0;
      S.weather = 0;
      S.hour = 8;
      tickLiveDaylightGrowth(24);
      gains.push(S.honeyAcc);
    }
    for (let sn = 0; sn < 4; sn++) {
      expect(gains[sn] / gains[0]).toBeCloseTo(HONEY_SEASON_MULT[sn] / HONEY_SEASON_MULT[0], 5);
    }
  });
});

describe('M1: پشتیبان‌ها فقط در بازهٔ زمانی چرخش می‌کنند و خطای ذخیره ثبت می‌شود', () => {
  it('ذخیرهٔ دوم در ۱۰ دقیقه پشتیبان را تغییر نمی‌دهد', () => {
    resetGame();
    S.coins = 1;
    expect(saveGame()).toBe(true);
    S.coins = 2;
    expect(saveGame()).toBe(true);
    expect(JSON.parse(localStorage.getItem(BAK1)!).coins).toBe(1);
    expect(JSON.parse(localStorage.getItem(KEY)!).coins).toBe(2);
  });

  it('خطای حافظه (QuotaExceeded) شکست ذخیره را گزارش می‌کند', () => {
    resetGame();
    const orig = localStorage.setItem.bind(localStorage);
    (localStorage as any).setItem = (k: string, v: string) => {
      if (k === KEY) throw new Error('QuotaExceededError');
      return orig(k, v);
    };
    try {
      expect(saveGame()).toBe(false);
    } finally {
      (localStorage as any).setItem = orig;
    }
    expect(getErrorLog().some((e) => e.msg.includes('save-failed'))).toBe(true);
  });
});

describe('M2: همگام‌سازی بومی سیوِ جدیدتر را برمی‌گزیند', () => {
  it('سیوِ بومیِ جدیدتر به localStorage برمی‌گردد', async () => {
    const older = JSON.stringify({ savedAt: 100, coins: 1 });
    const newer = JSON.stringify({ savedAt: 200, coins: 9 });
    localStorage.setItem(KEY, older);
    setNativePreferencesDriver({
      get: async ({ key }) => ({ value: key === KEY ? newer : null }),
      set: async () => {},
      remove: async () => {},
    });
    await hydrateNativeStorage();
    expect(localStorage.getItem(KEY)).toBe(newer);
  });

  it('سیوِ محلیِ جدیدتر حفظ و به بومی نوشته می‌شود', async () => {
    const newer = JSON.stringify({ savedAt: 300, coins: 7 });
    const older = JSON.stringify({ savedAt: 50, coins: 1 });
    localStorage.setItem(KEY, newer);
    const writes: Array<{ key: string; value: string }> = [];
    setNativePreferencesDriver({
      get: async ({ key }) => ({ value: key === KEY ? older : null }),
      set: async (o) => { writes.push(o); },
      remove: async () => {},
    });
    await hydrateNativeStorage();
    expect(localStorage.getItem(KEY)).toBe(newer);
    await new Promise((r) => setTimeout(r, 5));
    expect(writes.some((w) => w.key === KEY && w.value === newer)).toBe(true);
  });

  it('نوشتن‌های بومی به ترتیب انجام می‌شوند', async () => {
    const order: string[] = [];
    setNativePreferencesDriver({
      get: async () => ({ value: null }),
      set: async ({ value }) => { await new Promise((r) => setTimeout(r, 5)); order.push(value); },
      remove: async () => {},
    });
    nativeSetItem('a-test-key', '1');
    nativeSetItem('a-test-key', '2');
    nativeSetItem('a-test-key', '3');
    await new Promise((r) => setTimeout(r, 60));
    expect(order).toEqual(['1', '2', '3']);
  });
});

describe('M4: اعتبارسنجی عمیق سِیو', () => {
  it('سِیوِ نسخهٔ فعلی با طول کرت‌های نامعتبر رد می‌شود', () => {
    const d = migrateSave({ v: SAVE_VERSION, day: 3, coins: 10, plots: [{ st: 0 }] });
    expect(d).toBeNull();
  });

  it('سِیوِ قدیمی با کرت‌های ناهمخوان همچنان ترمیم می‌شود', () => {
    const d = migrateSave({ v: 6, day: 3, coins: 10, plots: [{ st: 0 }] });
    expect(d).not.toBeNull();
  });

  it('گونهٔ محصول ناشناخته در کرت پاک می‌شود و حیوان ناشناخته حذف می‌شود', () => {
    const plots = Array.from({ length: COLS * ROWS }, () => ({ st: 2, crop: null, prog: 0, water: 0, fert: 0, last: null, dead: false, dry: 0, ripe: false, n: 0 }));
    plots[0].crop = 'ghost-crop' as any;
    const d = migrateSave({
      v: SAVE_VERSION, day: 3, coins: 10, plots,
      animals: [{ id: 1, kind: 'dragon', ready: 0, hue: 0, grown: 0 }, { id: 2, kind: 'chicken', ready: 0, hue: 0, grown: 0 }],
    }) as any;
    expect(d.plots[0].crop).toBeNull();
    expect(d.plots[0].st).toBe(1);
    expect(d.animals.map((a: any) => a.kind)).toEqual(['chicken']);
  });

  it('migrateSave آرایهٔ ورودی را جهش نمی‌دهد', () => {
    const raw = { v: 1, day: 3, coins: 10, lv: { land: 2 } };
    migrateSave(raw);
    expect(raw.lv.land).toBe(2);
  });
});

describe('M5: کسری دستمزد کارگران پیشاپیش اعلام می‌شود', () => {
  it('شب، پیش از سررسید، هشدار کسری دستمزد یک‌بار نمایش داده می‌شود', () => {
    resetGame();
    S.workers = 2;
    S.coins = 0;
    S.hour = 19;
    advance(1.5);
    const warned = UI.toasts.some((t) => t.text === GT.gWageWarn);
    expect(warned).toBe(true);
  });

  it('سکهٔ کافی باشد، هشداری داده نمی‌شود', () => {
    resetGame();
    S.workers = 1;
    S.coins = 1_000_000;
    S.hour = 19;
    UI.toasts = [];
    advance(1.5);
    expect(UI.toasts.some((t) => t.text === GT.gWageWarn)).toBe(false);
  });

  it('کسری دستمزد همچنان کارگران را می‌برد (اقتصاد بدون تغییر)', () => {
    resetGame();
    S.workers = 2;
    S.coins = 0;
    newDay();
    expect(S.workers).toBe(0);
  });
});

describe('L3: بارگذاری، جریان RNG بازی را تغییر نمی‌دهد', () => {
  it('جنسیت حیوان بدون sex از شناسه تعیین می‌شود', () => {
    expect(importSaveJson(JSON.stringify({ v: SAVE_VERSION, day: 3, coins: 10, animals: [{ id: 2, kind: 'chicken', ready: 0, hue: 0, grown: 0 }] }))).toBe(true);
    expect(S.animals[0].sex).toBe('m');
  });
});

describe('سازگاری کلی', () => {
  it('زمان ذخیره در سِیو ثبت می‌شود', () => {
    resetGame();
    saveGame();
    expect(typeof JSON.parse(localStorage.getItem(KEY)!).savedAt).toBe('number');
  });
  it('invCount کار می‌کند (بدون کرش)', () => {
    expect(invCount()).toBeGreaterThanOrEqual(0);
  });
});
