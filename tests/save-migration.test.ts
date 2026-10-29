import { beforeEach, describe, expect, it } from 'vitest';
import { SAVE_VERSION, migrateSave } from '../src/game/core/saveMigrations';
import { S, hasSave, loadGame, saveGame, resetGame, COLSxROWS } from './helpers/game';

const v1 = {
  v: 1, coins: 500, day: 40, hour: 8, stamina: 90, plots: [], inv: {}, seeds: {},
  fert: 0, can: 5, rod: 0, lv: { hoe: 1, can: 1, bag: 1, stam: 1, land: 2, soil: 0 },
  animals: [{ id: 1, kind: 'chicken', ready: 0, hue: 0, sex: 'f', grown: 0 }],
  trough: 3, workers: 1, dem: {}, sdem: {}, weather: 0, nextId: 9, earned: 3000,
  machines: { sprinkler: 1 }, auto: { water: true }, xp: 400, stats: {}, ach: {},
};

describe('مهاجرت سِیو', () => {
  it('نسخهٔ ۱ به ۳ می‌رسد و سطح زمین یک پله جابه‌جا می‌شود', () => {
    const d = migrateSave(v1)!;
    expect(d.v).toBe(SAVE_VERSION);
    expect((d.lv as { land: number }).land).toBe(3);
    expect(d.workers).toBe(1);
  });

  it('نسخهٔ ۲ به ۳ داستان و بدهی اضافه می‌کند', () => {
    const d = migrateSave({ ...v1, v: 2, day: 3 })!;
    expect(d.v).toBe(SAVE_VERSION);
    expect(d.story).toBeTruthy();
    expect('debt' in d).toBe(true);
  });

  it('نسخهٔ ۷ به ۸ حلقهٔ درآمدِ ۳۰ روز اخیر را می‌سازد و دادهٔ قدیمی را نگه می‌دارد', () => {
    const d = migrateSave({ v: 7, coins: 999, day: 30, earn30: [10, 20, 30] })!;
    expect(d.v).toBe(8);
    expect(Array.isArray(d.earn30)).toBe(true);
    expect((d.earn30 as number[]).slice(-3)).toEqual([10, 20, 30]);
    const d2 = migrateSave({ v: 7, coins: 1, day: 2 })!;
    expect(d2.v).toBe(8);
    expect(Array.isArray(d2.earn30)).toBe(true);
    expect((d2.earn30 as unknown[]).length).toBe(0);
  });

  it('سِیو خراب یا نسخهٔ آینده رد می‌شود', () => {
    expect(migrateSave(null)).toBeNull();
    expect(migrateSave('x')).toBeNull();
    expect(migrateSave({ v: 99, coins: 1 })).toBeNull();
    expect(migrateSave({ v: 0 })).toBeNull();
    expect(migrateSave({ v: 3 })).toBeNull(); // بدون دادهٔ پایه
  });

  it('سِیو ناقص نسخهٔ ۳ با پیش‌فرض‌ها لود می‌شود و کرش نمی‌کند', () => {
    localStorage.setItem('mazrae-rangi-save-v1', JSON.stringify({ v: 3, coins: 42, day: 9 }));
    expect(loadGame()).toBe(true);
    expect(S.coins).toBe(42);
    expect(S.plots.length).toBe(COLSxROWS());
    expect(S.animals.length).toBeGreaterThanOrEqual(0);
  });

  it('نسخهٔ ۶ به ۷ آرایه‌های ۵۴ و ۶۰ کرتی دو مزرعهٔ جدید را بدون آسیب به سِیو می‌سازد', () => {
    const d = migrateSave({ v: 6, coins: 1234, day: 18, lv: { hoe: 2, can: 2, bag: 2, stam: 2, land: 3, soil: 0 } })!;
    expect(d.v).toBe(SAVE_VERSION);
    expect(Array.isArray(d.northPlots)).toBe(true);
    expect((d.northPlots as unknown[]).length).toBe(54);
    expect(Array.isArray(d.valleyPlots)).toBe(true);
    expect((d.valleyPlots as unknown[]).length).toBe(60);
  });

  it('پشتیبان چرخشی: سِیو خراب از بکاپ بازیابی می‌شود', () => {
    resetGame();
    S.coins = 777;
    saveGame();
    S.coins = 888;
    saveGame(); // نسخهٔ قبلی به bak می‌رود
    localStorage.setItem('mazrae-rangi-save-v1', '{ broken json');
    expect(hasSave()).toBe(true);
    expect(loadGame()).toBe(true);
    expect(S.coins).toBe(777);
  });
});

beforeEach(() => {
  localStorage.clear();
  resetGame();
});
