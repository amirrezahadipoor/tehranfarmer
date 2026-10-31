import { afterEach, describe, expect, it } from 'vitest';
import { LAND_PRICES } from '../data';
import { fresh, landPrice, S } from '../state';

afterEach(() => { Object.assign(S, fresh()); });

describe('heritage charter pricing', () => {
  it('does not punish a high recent income on the final charter', () => {
    S.earn30 = [0];
    const ordinary = landPrice(3);
    S.earn30 = [60000, 90000, 240000];
    expect(landPrice(3)).toBe(ordinary);
    expect(landPrice(3)).toBe(LAND_PRICES[3]);
  });

  it('keeps the existing recent-income curve on earlier estate tiers', () => {
    S.earn30 = [0];
    const ordinary = landPrice(2);
    S.earn30 = [60000, 60000];
    expect(landPrice(2)).toBeGreaterThan(ordinary);
  });
});
