import { describe, expect, it } from 'vitest';
import { S, UI, advance, buySeed, canAct, doAct, resetGame, sellAll } from './helpers/game';
import { floorCoins, processDueDay, startDebt } from '../src/game/core/debt';
import { setSeed } from '../src/game/rng';

describe('تست هیچ قفل نرم (P5-05)', () => {
  for (const [snName, startDay, cropId] of [
    ['بهار', 1, 'wheat'],
    ['تابستان', 8, 'corn'],
    ['پاییز', 15, 'wheat'],
    ['زمستان', 22, 'wheat'],
  ] as const) {
    it(`در ${snName} با کف امن پس از کتک شرخر و حتی با صفر مطلق، بازیکن دوباره می‌کارد و به سود می‌رسد`, () => {
      resetGame();
      setSeed(777 + startDay);
      UI.started = true;
      S.day = startDay;
      S.coins = 500;
      S.seeds = {};
      S.inv = {};
      S.animals = [];
      for (const p of S.plots) { p.st = 2; p.crop = 'wheat'; p.dead = true; p.ripe = false; }
      startDebt(0);
      processDueDay();
      expect(S.coins).toBeGreaterThanOrEqual(floorCoins());

      S.coins = 0;
      advance(24);
      expect(S.seeds[cropId] ?? 0).toBeGreaterThanOrEqual(3);

      doAct('till', 0, false, undefined, true);
      doAct('till', 1, false, undefined, true);
      expect(canAct('plant', 0, false, cropId)).toBe('');
      doAct('plant', 0, false, cropId, true);
      doAct('plant', 1, false, cropId, true);
      for (let d = 0; d < 4; d++) {
        S.can = 8;
        S.stamina = 100;
        doAct('water', 0, false, undefined, true);
        doAct('water', 1, false, undefined, true);
        advance(24);
      }
      expect(S.plots[0].ripe).toBe(true);
      doAct('harvest', 0, false, undefined, true);
      doAct('harvest', 1, false, undefined, true);
      const earned = sellAll();
      expect(earned).toBeGreaterThan(30);
      expect(S.coins).toBeGreaterThan(30);
      buySeed(cropId, 2);
      expect(S.seeds[cropId]).toBeGreaterThanOrEqual(2);
    });
  }
});
