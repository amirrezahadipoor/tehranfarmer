import { afterEach, describe, expect, it } from 'vitest';
import { voiceBlipVolume } from './cinemaAudio';
import { CFG } from './settings';

describe('independent dialogue voice gain', () => {
  afterEach(() => {
    CFG.voiceVolume = 100;
    CFG.sfxVolume = 100;
  });

  it('uses the dialogue slider rather than the effects slider', () => {
    CFG.voiceVolume = 50;
    CFG.sfxVolume = 100;
    expect(voiceBlipVolume(0.04)).toBeCloseTo(0.02);
    CFG.sfxVolume = 0;
    expect(voiceBlipVolume(0.04)).toBeCloseTo(0.02);
    CFG.voiceVolume = 0;
    CFG.sfxVolume = 100;
    expect(voiceBlipVolume(0.04)).toBe(0);
  });

  it('clamps malformed values to a safe gain range', () => {
    CFG.voiceVolume = 180;
    expect(voiceBlipVolume(0.04)).toBeCloseTo(0.04);
    CFG.voiceVolume = -20;
    expect(voiceBlipVolume(0.04)).toBe(0);
  });
});
