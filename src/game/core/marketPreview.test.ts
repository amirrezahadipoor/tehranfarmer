import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demandAfterSale, fresh, goodPrice, goodPriceAfterSale, S, saleValueSel, sellGood, UI } from '../state';

describe('market sale and demand previews', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    });
    Object.assign(S, fresh());
    S.day = 1; // spring: wheat has the real 0.95 seasonal price multiplier
    S.sellFrom = 'pack';
    S.pack = { wheat: 8 };
    S.inv = {};
    S.dem = { wheat: 1 };
    UI.toasts = [];
  });
  afterEach(() => vi.unstubAllGlobals());

  it('quotes the exact 7-to-6 rounded wheat sale and the separate 2.8% demand decay', () => {
    expect(goodPrice('wheat')).toBe(7);
    expect(goodPriceAfterSale('wheat')).toBe(6);
    expect(demandAfterSale('wheat')).toBeCloseTo(0.972, 8);
    expect(saleValueSel('wheat', 1)).toBe(7);
    // Preview functions are pure and must not themselves alter price or demand.
    expect(goodPrice('wheat')).toBe(7);
    expect(S.dem.wheat).toBe(1);

    expect(sellGood('wheat', 1)).toBe(7);
    expect(goodPrice('wheat')).toBe(6);
    expect(S.dem.wheat).toBeCloseTo(0.972, 8);
  });

  it('quotes all units in a stack with the same per-unit decay used by the sale', () => {
    const quote = saleValueSel('wheat', 8);
    expect(sellGood('wheat', 8)).toBe(quote);
    expect(S.pack.wheat).toBeUndefined();
  });
});
