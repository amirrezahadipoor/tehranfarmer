import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CFG } from './settings';
import { ambient, musicPlaylist, sfxSampleGain, snd, syncAudioSettings } from './sound';

class FakeAudio {
  static instances: FakeAudio[] = [];
  paused = true;
  currentTime = 0;
  volume = 1;
  loop = false;
  preload = '';
  onended: (() => void) | null = null;
  constructor(public src: string) { FakeAudio.instances.push(this); }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}

describe('immediate audio setting reconciliation', () => {
  beforeEach(() => {
    vi.stubGlobal('Audio', FakeAudio);
    CFG.music = true;
    CFG.sound = true;
    CFG.musicVolume = 100;
    snd.on = true;
  });

  afterEach(() => {
    ambient.stop();
    CFG.music = true;
    CFG.sound = true;
    snd.on = true;
    vi.unstubAllGlobals();
  });

  it('pauses the playing track as soon as music or master sound is disabled', () => {
    ambient.note(0, 12, 1);
    const track = FakeAudio.instances.at(-1)!;
    expect(track).toBeDefined();
    expect(track.paused).toBe(false);

    CFG.music = false;
    syncAudioSettings();
    expect(track.paused).toBe(true);

    CFG.music = true;
    syncAudioSettings();
    expect(track.paused).toBe(false);

    CFG.sound = false;
    syncAudioSettings();
    expect(track.paused).toBe(true);
  });

  it('rotates four distinct local tracks and applies the quieter track gain', () => {
    expect(musicPlaylist(5)).toEqual([5, 1, 4, 7]);
    for (let chapter = 1; chapter <= 7; chapter++) {
      const list = musicPlaylist(chapter);
      expect(list).toHaveLength(4);
      expect(new Set(list).size).toBe(4);
      expect(list[0]).toBe(chapter);
      expect(list[list.length - 1]).not.toBe(list[0]);
    }

    ambient.note(0, 12, 5);
    const track = FakeAudio.instances.at(-1)!;
    expect(track.src.endsWith('ch5.mp3')).toBe(true);
    const ch5Volume = track.volume;
    track.onended?.();
    expect(track.src.endsWith('peaceful-forest.mp3')).toBe(true);
    expect(track.volume).toBeGreaterThan(ch5Volume);
    track.onended?.();
    expect(track.src.endsWith('ch4.mp3')).toBe(true);
    track.onended?.();
    expect(track.src.endsWith('ch7.mp3')).toBe(true);
    track.onended?.();
    expect(track.src.endsWith('ch5.mp3')).toBe(true);
  });

  it('normalizes loud and quiet SFX toward the same measured playback RMS', () => {
    expect(sfxSampleGain('coin')).toBeLessThan(1);
    expect(sfxSampleGain('buy')).toBeLessThan(1);
    expect(sfxSampleGain('paper')).toBeGreaterThan(2);
    expect(sfxSampleGain('water')).toBeGreaterThan(2);
    expect(sfxSampleGain('nibble')).toBeGreaterThan(1);
    expect(sfxSampleGain('pop')).toBeCloseTo(1.07, 2);
  });
});
