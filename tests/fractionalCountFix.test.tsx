import { beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { installDom } from './helpers/dom';
import { S, UI, resetGame } from './helpers/game';
import { addGood, addPack, packCount, troughCap } from '../src/game/state';
import { newDay } from '../src/game/core/dayLoop';
import { migrateSave, SAVE_VERSION } from '../src/game/core/saveMigrations';
import { FishingModal } from '../src/ui/FishingModal';

beforeEach(() => {
  localStorage.clear();
  resetGame();
  installDom();
});

describe('سقف‌های صحیح کالا: نفوذ کسری به انبار/کوله (نقص کدی ریشه‌ای)', () => {
  it('addGood با ورودیِ کسری و انبارِ کسری فقط صحیح می‌نویسد و پسماند را ترمیم می‌کند', () => {
    S.inv.feed = 7.3; // پسماند سیوِ خراب قدیمی (زیر سقف انبار)
    const got = addGood('feed', 2);
    expect(got).toBe(2);
    expect(S.inv.feed).toBe(9);
    expect(Number.isInteger(S.inv.feed)).toBe(true);
    const gotFrac = addGood('cucumber', 3.7); // ورودی کسری
    expect(gotFrac).toBe(3);
    expect(Number.isInteger(S.inv.cucumber ?? 0)).toBe(true);
  });

  it('addPack فضای کسری را کف می‌زند و کوله را صحیح نگه می‌دارد', () => {
    S.pack.tomato = 36.1;
    const got = addPack('tomato', 5);
    expect(got).toBe(5);
    expect(S.pack.tomato).toBe(41);
    expect(Number.isInteger(packCount())).toBe(true);
  });

  it('خوراک آخورِ خودکار هرگز کسری وارد انبار نمی‌کند (مبدأ باگ)', () => {
    S.inv.feed = 10.6;
    S.trough = troughCap() - 1.5; // جایِ کسری در آخور
    S.auto.feed = true;
    S.machines.feeder = 1;
    newDay();
    expect(Number.isInteger(S.inv.feed ?? 0)).toBe(true);
    expect(S.inv.feed).toBe(9); // ۱۰ واحد صحیح، ۱ واحد به آخور رفت
  });

  it('ذخیرهٔ قدیمیِ کسری بعد از مهاجرت صحیح می‌شود (انبار، کوله، آمار)', () => {
    const raw = {
      v: SAVE_VERSION,
      coins: 100,
      day: 3,
      inv: { feed: 7.7, wheat: 3 },
      pack: { tomato: 2.5 },
      stats: { fish: 25679.5 },
      seeds: { wheat: 4 },
    };
    const out = migrateSave(raw)!;
    expect(out).not.toBeNull();
    expect((out.inv as Record<string, number>).feed).toBe(7);
    expect((out.pack as Record<string, number>).tomato).toBe(2);
    expect((out.stats as Record<string, number>).fish).toBe(25679);
    expect((out.seeds as Record<string, number>).wheat).toBe(4);
  });

  it('حیوانات سیوی کسری (شناسه/پالت/آمادگی) نرمال می‌شوند تا رندر رنگ کرش نکند', () => {
    const raw = {
      v: SAVE_VERSION,
      coins: 1,
      day: 1,
      animals: [{ id: 2.5, kind: 'chicken', hue: 7.5, ready: 3.7, sex: 'f', grown: 0 }],
    };
    const out = migrateSave(raw)!;
    const an = (out.animals as Array<Record<string, unknown>>)[0];
    expect(an.id).toBe(2);
    expect(an.hue).toBe(3);
    expect(an.ready).toBe(3);
  });
});

describe('نقص ظاهری: کرش مودال ماهیگیری با آمارِ کسری', () => {
  it('moodal ماهیگیری با fish کسری رندر می‌شود و ایندکس پروفایل خارج از محدوده نمی‌رود', () => {
    UI.started = true;
    S.stats.fish = 25679.5; // دقیقاً مقداری که صدای ۱۰۰ ایکس را شکست
    const raw = S.day + Math.floor(S.hour) + S.stats.fish;
    const idx = Number.isFinite(raw) ? Math.abs(Math.floor(raw)) % 5 : 0;
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(5);
    expect(() => renderToString(<FishingModal />)).not.toThrow();
  });
});
