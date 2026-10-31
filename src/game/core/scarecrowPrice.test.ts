import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fresh, S, startDebt } from '../state';
import { minPay, scarecrowPrice } from './debt';
import { NOTES, SCARECROW_PRICE_MULT, TOTAL_DEBT } from '../../story/debtData';

describe('guard scarecrow late-game pricing', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, String(value)); },
      removeItem: (key: string) => { values.delete(key); },
      clear: () => values.clear(),
    });
    Object.assign(S, fresh());
    S.story.prologueSeen = true;
    startDebt(5);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps all three levels useful without a second final-deed-sized grind', () => {
    const expectedMin = Math.ceil(NOTES[5].amount / NOTES[5].monthsTarget);
    expect(minPay()).toBe(expectedMin);
    expect(SCARECROW_PRICE_MULT).toEqual([1, 2, 3]);
    const prices = [0, 1, 2].map((level) => {
      S.debt!.scarecrow = level as 0 | 1 | 2;
      return scarecrowPrice();
    });
    expect(prices).toEqual([expectedMin, expectedMin * 2, expectedMin * 3]);
    expect(prices.reduce((sum, price) => sum + price, 0)).toBe(expectedMin * 6);
    expect(prices.reduce((sum, price) => sum + price, 0) / TOTAL_DEBT).toBeLessThan(0.25);
  });
});
