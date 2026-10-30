import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FISH_STAM } from './data';
import { setSeed } from './rng';
import { fresh, S, UI } from './state';
import { catchRegionalFish } from './core/rpgSystems';
import { PRACTICE_FISH_PROFILE, fishingStaminaCost, isPracticeFishing } from './fishingRules';

describe('fishing reward balance', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, String(value)); },
      removeItem: (key: string) => { values.delete(key); },
      clear: () => values.clear(),
    });
    Object.assign(S, fresh());
    UI.toasts = [];
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps the same species and weight under the same seed but reduces quick-cast rewards', () => {
    setSeed(12345);
    const normal = catchRegionalFish(0.75, 1);
    Object.assign(S, fresh());
    UI.toasts = [];
    setSeed(12345);
    const quick = catchRegionalFish(0.75, 0.35);

    expect(quick.species.id).toBe(normal.species.id);
    expect(quick.kg).toBe(normal.kg);
    expect(quick.qty).toBeLessThanOrEqual(normal.qty);
    if (quick.qty > 0) expect(quick.qty).toBe(normal.qty);
    expect(quick.sweet).toBe(false);
    expect(quick.coins).toBeLessThanOrEqual(Math.ceil(normal.coins * 0.35) + 1);
  });

  it('bounds quick-cast cash and makes unskilled catches probabilistic', () => {
    let landed = 0;
    let escaped = 0;
    for (let seed = 1; seed <= 40; seed++) {
      Object.assign(S, fresh());
      setSeed(seed);
      const result = catchRegionalFish(0.75, 0.35);
      expect(result.sweet).toBe(false);
      expect(result.coins).toBeLessThanOrEqual(35);
      expect(result.qty).toBeGreaterThanOrEqual(0);
      expect(result.qty).toBeLessThanOrEqual(1);
      expect(result.species.good).toBe('fish');
      expect(result.species.coinBonus).toBeLessThanOrEqual(42);
      if (result.qty > 0) landed++;
      else {
        escaped++;
        expect(result.coins).toBe(0);
      }
    }
    expect(landed).toBeGreaterThanOrEqual(10);
    expect(escaped).toBeGreaterThanOrEqual(5);
  });

  it('keeps a won hold catch and rod-assisted quick cast deterministic landings', () => {
    for (let seed = 1; seed <= 20; seed++) {
      Object.assign(S, fresh());
      setSeed(seed);
      expect(catchRegionalFish(0.9, 1).qty).toBeGreaterThan(0);
      Object.assign(S, fresh());
      S.rod = 1;
      setSeed(seed);
      expect(catchRegionalFish(1, 0.55).qty).toBeGreaterThan(0);
    }
  });

  it('uses the rebalanced stamina cost', () => {
    expect(FISH_STAM).toBe(6);
  });

  it('starts with a slow, large-window practice fish until the first catch', () => {
    expect(isPracticeFishing({})).toBe(true);
    expect(isPracticeFishing({ fish: 1 })).toBe(false);
    expect(isPracticeFishing({ roeN: 1 })).toBe(false);
    expect(PRACTICE_FISH_PROFILE.speed).toBeLessThan(0.5);
    expect(PRACTICE_FISH_PROFILE.barH).toBeGreaterThanOrEqual(38);
  });

  it('waives stamina only for the first failed attempt, never for later failures or a catch', () => {
    expect(fishingStaminaCost(1, false, FISH_STAM)).toBe(0);
    expect(fishingStaminaCost(2, false, FISH_STAM)).toBe(FISH_STAM);
    expect(fishingStaminaCost(1, true, FISH_STAM)).toBe(FISH_STAM);
  });
});
