import { beforeEach, describe, expect, it } from 'vitest';
import {
  S, addGood, advance, buyAnimal, buyFeed, buySeed, canAct, doAct, harvestPond, loadGame,
  resetGame, sellAll, sellGood, stockPond, tickBuilds, harvestHoney, invCount,
} from './helpers/game';
import { ANIMALS, COLS, CROPS, ROWS } from '../src/game/data';
import { checkInvariants } from './helpers/invariants';

beforeEach(() => { localStorage.clear(); resetGame(); });

const rnd = (n: number) => Math.floor(Math.random() * n);

describe('هرج‌ومرج', () => {
  it('فراخوانی مرزی APIها کرش نمی‌کند', () => {
    expect(() => {
      doAct('till', -1); doAct('harvest', 9999); doAct('plant', 1e9);
      canAct('water', -5); canAct('plant', NaN); doAct('fert', 0);
      sellGood('wheat', -10); sellGood('ناشناس', 5); addGood('wheat', NaN); addGood('wheat', -5);
      harvestPond(-1); stockPond(99); harvestHoney(true);
      buySeed('wheat', -3); buyFeed(0); buyAnimal('chicken');
      for (let i = 0; i < COLS * ROWS; i++) doAct('till', i);
    }).not.toThrow();
    checkInvariants('boundary');
  });

  it('۳۰۰۰ روز تصمیم تصادفی بدون کرش و نقض نامتغیر', () => {
    S.coins = 500;
    for (let d = 0; d < 3000; d++) {
      const seed = CROPS[rnd(CROPS.length)].id;
      if (S.coins > 200) buySeed(seed, 1 + rnd(4));
      if (rnd(3) === 0 && S.coins > 400) buyFeed(1 + rnd(5));
      for (let k = 0; k < 12; k++) {
        const i = rnd(COLS * ROWS);
        const act = ['till', 'plant', 'water', 'harvest', 'fert'][rnd(5)];
        if (canAct(act, i, true, seed) === '') doAct(act, i, true, seed, true);
      }
      if (invCount() > 30) sellAll();
      advance(24);
      tickBuilds(24);
      if (d % 50 === 0) checkInvariants('chaos day ' + d);
    }
    checkInvariants('chaos end');
    expect(S.day).toBeGreaterThan(3000);
    expect(S.coins).toBeGreaterThanOrEqual(0);
  });

  it('سِیو خراب بازی را نمی‌شکند', () => {
    localStorage.setItem('mazrae-rangi-save-v1', 'null');
    expect(loadGame()).toBe(false);
    localStorage.setItem('mazrae-rangi-save-v1', JSON.stringify({ v: 3, coins: 'x', day: null, plots: 'bad' }));
    loadGame();
    checkInvariants('corrupt');
  });

  it('به‌روزرسانی‌های تنبل با مقادیر بزرگ منفجر نمی‌شوند', () => {
    S.coins = 1e15;
    addGood('wheat', 1e6);
    const got = sellAll();
    expect(Number.isFinite(got)).toBe(true);
    expect(Number.isFinite(S.coins)).toBe(true);
    checkInvariants('huge');
  });

  it('دام‌ها/لانه‌ها هرگز از ظرفیت حصار بیشتر نمی‌شوند', () => {
    S.coins = 1e9;
    for (let d = 0; d < 200; d++) {
      for (const k of Object.keys(ANIMALS) as (keyof typeof ANIMALS)[]) buyAnimal(k);
      advance(24);
    }
    checkInvariants('animals');
  });
});
