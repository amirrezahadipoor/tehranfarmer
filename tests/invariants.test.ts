import { beforeEach, describe, expect, it } from 'vitest';
import { S, advance, resetGame, addGood, sellAll, buySeed, buyFeed, buyAnimal, enqueueBuild, completeBuild, harvestPond, stockPond } from './helpers/game';
import { checkInvariants } from './helpers/invariants';

beforeEach(() => { localStorage.clear(); resetGame(); });

describe('نامتغیرهای سلامت', () => {
  it('وضعیت تازه سالم است', () => checkInvariants('fresh'));

  it('پس از ۳۰ روز پیشرفت تصادفی سالم می‌ماند', () => {
    for (let d = 0; d < 30; d++) {
      buySeed('wheat', 3);
      for (let i = 0; i < 12; i++) { S.plots[i].st = 1; }
      advance(24);
      sellAll();
      checkInvariants('day ' + S.day);
    }
  });

  it('پرکردن انبار و فروش، سکه را منفی نمی‌کند', () => {
    addGood('wheat', 500);
    sellAll();
    checkInvariants();
    expect(S.coins).toBeGreaterThan(0);
  });

  it('خرید بدون پول ناموفق است ولی کرش نمی‌کند', () => {
    S.coins = 0;
    buySeed('wheat', 10);
    buyFeed(5);
    expect(S.coins).toBe(0);
    checkInvariants();
  });

  it('ساخت‌وساز بیش از ظرفیت حصار، دام اضافه نمی‌کند', () => {
    S.coins = 10 ** 9;
    for (let i = 0; i < 12; i++) buyAnimal('chicken');
    expect(S.animals.filter((a) => a.kind === 'chicken').length).toBeLessThanOrEqual(3);
    checkInvariants();
  });

  it('استخر بدون بچه‌ماهی برداشت نمی‌دهد', () => {
    S.coins = 10 ** 6;
    enqueueBuild('pond', 'pond', 'استخر', 'pond', 0);
    const id = S.builds[0].id;
    completeBuild(id);
    expect(S.ponds.length).toBe(1);
    expect(harvestPond(0)).toBe(0);
    stockPond(0);
    advance(24 * 4);
    harvestPond(0);
    checkInvariants();
  });
});
