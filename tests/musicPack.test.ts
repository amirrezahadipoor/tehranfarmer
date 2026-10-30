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
let lastAudio: { onended: null | (() => void) } | null = null;

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
    onended: null | (() => void) = null;
    private _src: string;
    get src() { return this._src; }
    set src(value: string) { this._src = value; lastSrc = value; }
    constructor(src: string) { this._src = src; lastSrc = src; lastAudio = this; }
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
  it('materializes packed tracks on demand and rotates to a companion after a natural ending', () => {
    const pack = document.createElement('script');
    pack.type = 'application/octet-stream';
    pack.dataset.musicPack = 'ch2.mp3';
    pack.textContent = 'QUJD';
    const companion = document.createElement('script');
    companion.type = 'application/octet-stream';
    companion.dataset.musicPack = 'ch5.mp3';
    companion.textContent = 'REVG';
    document.body.append(pack, companion);
    try {
      ambient.note(0, 10, 2);
      expect(lastSrc).toBe('data:audio/mpeg;base64,QUJD');
      expect(lastLoop).toBe(false);
      expect(ambient.playing).toBe(true);
      expect(lastAudio?.onended).toEqual(expect.any(Function));
      lastAudio?.onended?.();
      expect(lastSrc).toBe('data:audio/mpeg;base64,REVG');
      lastAudio?.onended?.();
      expect(lastSrc).toBe('data:audio/mpeg;base64,QUJD');
    } finally {
      ambient.stop();
      pack.remove();
      companion.remove();
    }
  });
});
