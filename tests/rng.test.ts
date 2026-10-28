import { beforeEach, describe, expect, it } from 'vitest';
import { chance, pick, randInt, rnd, setSeed } from '../src/game/rng';
import { S, advance, buySeed, doAct, resetGame, sellAll } from './helpers/game';

const run = (seed: number) => {
  setSeed(seed);
  resetGame();
  S.coins = 2000;
  buySeed('wheat', 8);
  for (let i = 0; i < 8; i++) { S.plots[i].st = 1; doAct('plant', i, true, 'wheat', true); doAct('water', i, true, undefined, true); }
  for (let d = 0; d < 12; d++) { advance(24); sellAll(); }
  return { coins: S.coins, xp: S.xp, day: S.day, dem: JSON.stringify(S.dem) };
};

describe('RNG قابل تعیین', () => {
  beforeEach(() => { localStorage.clear(); resetGame(); });

  it('همان seed → همان نتیجه', () => {
    const a = run(1234);
    const b = run(1234);
    expect(a).toEqual(b);
  });

  it('seed متفاوت → نتیجهٔ متفاوت', () => {
    const a = run(1);
    const b = run(2);
    expect(a).not.toEqual(b);
  });

  it('خروجی rnd در بازهٔ [۰,۱) است', () => {
    setSeed(7);
    for (let i = 0; i < 10000; i++) {
      const v = rnd();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('randInt/chance/pick در محدودهٔ درست‌اند', () => {
    setSeed(99);
    for (let i = 0; i < 1000; i++) {
      const n = randInt(5);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(5);
    }
    let trues = 0;
    for (let i = 0; i < 1000; i++) if (chance(0.5)) trues++;
    expect(trues).toBeGreaterThan(400);
    expect(trues).toBeLessThan(600);
    expect(['a', 'b']).toContain(pick(['a', 'b']));
  });
});
