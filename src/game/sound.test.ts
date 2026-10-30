import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CFG } from './settings';
import { ambient, snd, syncAudioSettings } from './sound';

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
    FakeAudio.instances = [];
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
    const track = FakeAudio.instances[0];
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
});
