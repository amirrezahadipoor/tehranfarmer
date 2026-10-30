import { describe, expect, it } from 'vitest';
import { frameIsSlow, frameIsStable, lowerQualityCap, raiseQualityCap } from './renderQuality';

describe('adaptive render quality', () => {
  it('moves one DPR step at a time in both directions', () => {
    expect(lowerQualityCap(2)).toBe(1.5);
    expect(lowerQualityCap(1.5)).toBe(1);
    expect(lowerQualityCap(1)).toBe(1);
    expect(raiseQualityCap(1)).toBe(1.5);
    expect(raiseQualityCap(1.5)).toBe(2);
    expect(raiseQualityCap(2)).toBe(2);
  });

  it('uses separate active and idle thresholds', () => {
    expect(frameIsSlow(23, true)).toBe(true);
    expect(frameIsSlow(23, false)).toBe(false);
    expect(frameIsSlow(41, false)).toBe(true);
    expect(frameIsStable(17, true)).toBe(true);
    expect(frameIsStable(17, false)).toBe(true);
    expect(frameIsStable(35, false)).toBe(false);
  });
});
