import { describe, expect, it } from 'vitest';
import { CROP } from '../data';
import { seedDurationDays } from './cropGrowth';
import { effectivePlotDailyRate } from './dayLoop';
import { fresh, S } from '../state';

describe('displayed and simulated crop growth duration', () => {
  it('shows effective base days instead of the raw 1.8-day wheat constant', () => {
    expect(seedDurationDays(CROP.wheat)).toBe(1.1);
    expect(seedDurationDays(CROP.wheat, 'farm', 0, 0.6)).toBe(0.8);
  });

  it('matches the live plot daily-rate formula when fertility changes', () => {
    Object.assign(S, fresh());
    S.plots[0].crop = 'wheat';
    S.plots[0].st = 2;
    S.plots[0].fert = 0.6;
    const actualDays = Math.round((1 / effectivePlotDailyRate('farm', 0)) * 10) / 10;
    expect(actualDays).toBe(seedDurationDays(CROP.wheat, 'farm', 0, 0.6));
  });
});
