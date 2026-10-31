import { describe, expect, it } from 'vitest';
import { xpRewardMultiplier } from './progress';

describe('late-campaign XP reward pacing', () => {
  it('keeps early XP intact and boosts only newly earned mid/late rewards', () => {
    expect(xpRewardMultiplier(1)).toBe(1);
    expect(xpRewardMultiplier(9)).toBe(1);
    expect(xpRewardMultiplier(10)).toBe(2);
    expect(xpRewardMultiplier(13)).toBe(2);
    expect(xpRewardMultiplier(14)).toBe(6);
    expect(xpRewardMultiplier(30)).toBe(6);
  });
});
