import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { ambient, snd } from '../src/game/sound';
import { resetSettings } from '../src/game/settings';

const { JSDOM } = createRequire(import.meta.url)('jsdom') as {
  JSDOM: new (html: string, opts?: { url?: string }) => {
    window: { document: Document; localStorage: Storage; close(): void };
  };
};
let lastSrc = '';
let lastLoop = false;

beforeAll(() => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://game.test' });
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = dom.window;
  g.document = dom.window.document;
  g.localStorage = dom.window.localStorage;
  Object.defineProperty(dom.window.document, 'hidden', { value: false, configurable: true });
  class MockAudio {
    paused = true;
    loop = false;
    volume = 1;
    preload = '';
    currentTime = 0;
    src: string;
    constructor(src: string) { this.src = src; lastSrc = src; }
    play() { this.paused = false; lastLoop = this.loop; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  g.Audio = MockAudio;
});

beforeEach(() => {
  resetSettings();
  snd.on = true;
  lastSrc = '';
  lastLoop = false;
});

describe('single-file inert music pack', () => {
  it('materializes only the requested packed track and keeps normal looping playback', () => {
    const pack = document.createElement('script');
    pack.type = 'application/octet-stream';
    pack.dataset.musicPack = 'ch2.mp3';
    pack.textContent = 'QUJD';
    document.body.appendChild(pack);
    try {
      ambient.note(0, 10, 2);
      expect(lastSrc).toBe('data:audio/mpeg;base64,QUJD');
      expect(lastLoop).toBe(true);
      expect(ambient.playing).toBe(true);
    } finally {
      ambient.stop();
      pack.remove();
    }
  });
});
