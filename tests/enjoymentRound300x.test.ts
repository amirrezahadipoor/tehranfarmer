import { beforeEach, describe, expect, it } from 'vitest';
import { S, resetGame } from './helpers/game';
import { landPrice } from '../src/game/core/economy';
import { startDebt, minPay, maybeOpenNextNote } from '../src/game/core/debt';
import { dueWarningText, playerMood } from '../src/story/engine';
import { LAND_PRICES, WEALTH_MULT_CAP, SOIL_PRICES, SOIL_LV, SOIL_BONUS } from '../src/game/data';
import { NOTES } from '../src/story/debtData';
import { fa } from '../src/strings/fa';

beforeEach(() => { localStorage.clear(); resetGame(); S.coins = 100000; startDebt(0); });

describe('اجرای پیشنهادات گزارش ۳۰۰X', () => {
  it('۴-ب: ضریب ثروتِ زمین فقط از درآمدِ ۳۰ روز اخیر می‌آید (پسانداز عمری تنبیه نمی‌شود)', () => {
    S.earned = 50_000_000; // درآمدِ عمریِ غول‌پیکر
    S.earn30 = [];         // ولی در ۳۰ روز اخیر هیچ درآمدی نداشته
    expect(landPrice(0)).toBe(LAND_PRICES[0]);
    S.earn30 = Array.from({ length: 30 }, () => 2000); // ۶۰هزار در ۳۰ روز = ضریب ۲
    expect(landPrice(0)).toBe(Math.round(LAND_PRICES[0] * 2));
    S.earn30 = Array.from({ length: 30 }, () => 100000); // بالای سقف → ضریب حداکثر
    expect(landPrice(1)).toBe(Math.round(LAND_PRICES[1] * (1 + WEALTH_MULT_CAP)));
  });

  it('۴-ج: خاکِ طلایی پله‌ای شد و سقف کل پاداش همان +۳۶٪ قبلی است', () => {
    expect(SOIL_PRICES.length).toBe(5);
    expect(SOIL_PRICES[0]).toBe(90000);
    expect(SOIL_LV.length).toBe(SOIL_PRICES.length);
    expect(SOIL_PRICES.length * SOIL_BONUS).toBeCloseTo(0.36, 5);
  });

  it('۴-د: هشدار قسط از ۱۰ روز قبل + اعلامِ واقعِ کمبود تا حداقلِ سرسید', () => {
    expect(dueWarningText(11)).toBeNull();
    expect(dueWarningText(7)).toContain('۷ روز');
    expect(dueWarningText(4, minPay())).toContain('کم داری');
    expect(dueWarningText(4, minPay())).toContain(fa(minPay()));
    expect(dueWarningText(4)).not.toContain('کم داری'); // چیپ HUD بدون پسوند کوتاه می‌ماند
    S.debt!.paidThisCycle = minPay();
    const shortNow = Math.max(0, minPay() - (S.debt!.paidThisCycle ?? 0));
    expect(dueWarningText(4, shortNow)).not.toContain('کم داری');
  });

  it('۴-الف: سقفِ غنیِ فصل ۱ کوچک و فصل ۶ متعادل است', () => {
    S.story.chapter = 1;
    S.debt!.standing = 50;
    S.coins = 3000;
    expect(playerMood()).toBe('rich');
    S.coins = 2000;
    expect(playerMood()).toBe('debt');
    S.story.chapter = 6;
    S.coins = Math.round(minPay() * 1.4);
    expect(playerMood()).toBe('rich');
    S.coins = Math.round(minPay() * 1.1);
    expect(playerMood()).toBe('debt');
  });

  it('۴-و: حالت داستانِ فشرده فاصلهٔ باز شدنِ سند بعدی را نصف می‌کند (پیش‌فرض خاموش)', () => {
    S.story.chapter = 1;
    S.story.questDone[1] = true;
    S.debt!.remaining = 0;
    const next = NOTES[1];
    const half = Math.ceil(next.minDays / 2);

    // پیش‌فرض: هنوز زود است
    S.debt!.chapterStartDay = S.day - (half - 1);
    S.custom = { farmerName: 'x', farmName: 'y', outfit: 0, morningCard: true, compactStory: false };
    expect(maybeOpenNextNote()).toBe(false);

    // فشرده: با نصفِ انتظار باز می‌شود
    S.custom.compactStory = true;
    S.debt!.chapterStartDay = S.day - half;
    expect(maybeOpenNextNote()).toBe(true);
    expect(S.debt!.noteIdx).toBe(1);
  });
});
