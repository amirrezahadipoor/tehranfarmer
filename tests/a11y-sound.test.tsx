import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { installDom } from './helpers/dom';
import { S, UI, resetGame } from './helpers/game';
import { AUDIO_SAMPLE_URIS, ambient, haptic, sfx, snd } from '../src/game/sound';
import { startDebt } from '../src/game/core/debt';
import { Hud } from '../src/ui/Hud';
import { Modals } from '../src/ui/Modals';
import { Cutscene } from '../src/ui/Cutscene';
import { CFG, isReducedMotion, loadSettings, resetSettings, updateSetting } from '../src/game/settings';
import { COLORBLIND_PALETTE, DEFAULT_PALETTE, contrastRatio } from '../src/ui/palette';
import { rnd, setSeed } from '../src/game/rng';

let oscCount = 0;
let rampCount = 0;
let musicPlayCount = 0;
let musicPauseCount = 0;
let lastMusic: { paused: boolean; loop: boolean; volume: number } | null = null;

beforeAll(() => {
  installDom();
  class MockAudioContext {
    currentTime = 1;
    sampleRate = 22050;
    state = 'running';
    destination = {};
    resume() { return Promise.resolve(); }
    createOscillator() {
      oscCount++;
      return {
        type: 'sine',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {},
      };
    }
    createGain() {
      return {
        gain: {
          value: 0,
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => { rampCount++; },
          exponentialRampToValueAtTime: () => { rampCount++; },
        },
        connect: () => {},
      };
    }
    createBuffer(_ch: number, len: number) {
      const arr = new Float32Array(len);
      return { getChannelData: () => arr };
    }
    createBufferSource() {
      return { buffer: null, connect: () => {}, start: () => {} };
    }
    createBiquadFilter() {
      return { type: 'lowpass', frequency: { value: 800 }, connect: () => {} };
    }
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
  class MockAudio {
    paused = true;
    loop = false;
    volume = 1;
    preload = '';
    constructor(_src: string) { lastMusic = this; }
    play() { musicPlayCount++; this.paused = false; return Promise.resolve(); }
    pause() { musicPauseCount++; this.paused = true; }
  }
  (globalThis as unknown as { Audio: unknown }).Audio = MockAudio;
});

beforeEach(() => {
  oscCount = 0;
  rampCount = 0;
  localStorage.clear();
  resetGame();
  resetSettings();
  snd.on = true;
});

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'test-results') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

describe('موتور صدای استودیویی کم‌حجم (.mp3 درون‌خطی + AudioBuffer سخت‌افزاری) و دسترسی‌پذیری (P7-01)', () => {
  it('هر ۱۶ فایل صوتی .mp3 معتبر و کم‌حجم (< ۴۰ کیلوبایت) هستند، صفر موج گوش‌خراش مربعی/اره‌ای دارند و همهٔ جلوه‌ها بدون خطا و بدون تغییر RNG اجرا می‌شوند', () => {
    const audioFiles = walkFiles('src/assets/sfx').filter((f) => /\.mp3$/i.test(f));
    expect(audioFiles.length).toBe(16);
    for (const f of audioFiles) {
      const id = path.basename(f, '.mp3') as keyof typeof AUDIO_SAMPLE_URIS;
      const diskB64 = fs.readFileSync(f).toString('base64');
      expect(AUDIO_SAMPLE_URIS[id]).toBe(`data:audio/mpeg;base64,${diskB64}`);
    }
    let totalBytes = 0;
    for (const f of audioFiles) {
      const buf = fs.readFileSync(f);
      expect(buf.byteLength).toBeGreaterThan(250);
      // Valid MPEG frame sync (0xFF 0xE0+) or ID3 header
      const isMpeg = (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)
        || (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33);
      expect(isMpeg).toBe(true);
      totalBytes += buf.byteLength;
    }
    expect(totalBytes).toBeLessThan(40 * 1024);

    // Ensure zero harsh 8-bit square/sawtooth waves exist anywhere in src/game/sound.ts
    const soundSrc = fs.readFileSync('src/game/sound.ts', 'utf8');
    expect(soundSrc).not.toMatch(/['"]square['"]|['"]sawtooth['"]/);

    setSeed(4242);
    const expectedNext = rnd();
    setSeed(4242);
    for (const k of Object.keys(sfx) as Array<keyof typeof sfx>) {
      expect(() => sfx[k]()).not.toThrow();
    }
    expect(oscCount).toBeGreaterThanOrEqual(10);
    expect(rampCount).toBeGreaterThanOrEqual(20);
    expect(rnd()).toBe(expectedNext);
  });

  it('موسیقی CC0 واقعی در ۴ فصل و روز/شب لوپ می‌شود و با خاموش‌کردن متوقف می‌گردد (P7-02)', () => {
    musicPlayCount = 0;
    musicPauseCount = 0;
    const track = fs.statSync('public/music/peaceful-forest.mp3');
    expect(track.size).toBeGreaterThan(100_000);
    expect(track.size).toBeLessThan(1_000_000);
    for (let sn = 0; sn < 4; sn++) {
      ambient.note(sn, 10);
      ambient.note(sn, 22);
    }
    expect(ambient.playing).toBe(true);
    expect(musicPlayCount).toBeGreaterThan(0);
    expect(lastMusic?.loop).toBe(true);
    expect(lastMusic?.volume).toBeLessThanOrEqual(0.2);

    CFG.music = false;
    ambient.note(0, 12);
    expect(ambient.playing).toBe(false);
    expect(lastMusic?.paused).toBe(true);
    expect(musicPauseCount).toBeGreaterThan(0);
  });

  it('تنظیمات صدا، موسیقی، لرزش، فونت، کاهش حرکت و سرعت انیمیشن کار ذخیره می‌شوند (P7-03)', () => {
    updateSetting('actionSpeed', 2);
    updateSetting('fontScale', 1.2);
    updateSetting('reduceMotion', true);
    updateSetting('music', false);
    updateSetting('haptics', false);
    expect(document.documentElement.dataset.fontScale).toBe('1.2');
    expect(document.documentElement.dataset.reduceMotion).toBe('1');
    resetGame();
    loadSettings();
    expect(CFG.actionSpeed).toBe(2);
    expect(CFG.fontScale).toBe(1.2);
    expect(CFG.reduceMotion).toBe(true);
    expect(CFG.music).toBe(false);
    expect(CFG.haptics).toBe(false);
  });

  it('نسبت کنتراست همهٔ پس‌زمینه‌ها و دکمه‌ها در هر دو پالت معمولی و کوررنگی ≥ ۴٫۵ است (P7-04)', () => {
    for (const [name, pal] of [['معمولی', DEFAULT_PALETTE], ['کوررنگی', COLORBLIND_PALETTE]] as const) {
      expect(contrastRatio(pal.ink, pal.paper), `${name} paper`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(pal.paperDarkText, pal.paperDark), `${name} paperDark`).toBeGreaterThanOrEqual(4.5);
      for (const k of ['btnG', 'btnY', 'btnR', 'btnB', 'btnP'] as const) {
        expect(contrastRatio(pal.ink, pal[k]), `${name} ${k}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('هیچ دکمهٔ بدون برچسب دسترسی‌پذیری در HUD (همهٔ صحنه‌ها) و همهٔ ۱۷ مودال وجود ندارد (P7-05)', () => {
    const assertAllButtonsLabeled = (html: string, ctxName: string) => {
      for (const m of html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)) {
        const attrs = m[1];
        const innerText = m[2].replace(/<[^>]+>/g, '').trim();
        const hasAria = /aria-label="[^"]+"/.test(attrs) || /title="[^"]+"/.test(attrs);
        expect(innerText.length > 0 || hasAria, `دکمهٔ بی‌برچسب در ${ctxName}: <button${attrs}>`).toBe(true);
      }
    };

    startDebt(0);
    S.hour = 22;
    for (const sc of ['farm', 'town', 'river', 'apiary'] as const) {
      UI.scene = sc;
      assertAllButtonsLabeled(renderToString(<Hud />), `HUD-${sc}`);
    }
    UI.scene = 'farm';
    for (const md of ['seed', 'market', 'work', 'animal', 'inv', 'menu', 'auto', 'pond', 'hive', 'achieve', 'carp', 'estate', 'ledger', 'quests', 'museum', 'home', 'almanac'] as const) {
      UI.modal = md;
      assertAllButtonsLabeled(renderToString(<Modals />), `Modal-${md}`);
    }
    UI.modal = null;
    UI.confirm = 'reset';
    assertAllButtonsLabeled(renderToString(<Modals />), 'Confirm');
    UI.confirm = null;
  });

  it('prefers-reduced-motion سیستم‌عامل و گزینهٔ دستی هر دو حرکت را کم می‌کنند (P7-06)', () => {
    expect(isReducedMotion()).toBe(false);
    updateSetting('reduceMotion', true);
    expect(isReducedMotion()).toBe(true);
    updateSetting('reduceMotion', false);
    const origMatch = window.matchMedia;
    (window as unknown as { matchMedia: (q: string) => { matches: boolean } }).matchMedia =
      (q: string) => ({ matches: q.includes('reduce') });
    expect(isReducedMotion()).toBe(true);
    window.matchMedia = origMatch;
  });

  it('صفر خطا و صفر اخطار کنسول در هر ۴ صحنه + همهٔ صداها + همهٔ ۱۷ مودال + کات‌سین (P7-07)', () => {
    const logged: string[] = [];
    const origErr = console.error;
    const origWarn = console.warn;
    console.error = (...a: unknown[]) => logged.push('ERR:' + a.join(' '));
    console.warn = (...a: unknown[]) => logged.push('WARN:' + a.join(' '));
    try {
      startDebt(0);
      for (const sc of ['farm', 'town', 'river', 'apiary'] as const) {
        UI.scene = sc;
        renderToString(<Hud />);
      }
      UI.scene = 'farm';
      for (const k of Object.keys(sfx) as Array<keyof typeof sfx>) sfx[k]();
      ambient.note(0, 11);
      for (const md of ['seed', 'market', 'work', 'animal', 'inv', 'menu', 'auto', 'pond', 'hive', 'achieve', 'carp', 'estate', 'ledger', 'quests', 'museum', 'home', 'almanac'] as const) {
        UI.modal = md;
        renderToString(<Modals />);
      }
      UI.modal = null;
      S.story.pending = 'p1';
      renderToString(<Cutscene />);
      S.story.pending = null;
    } finally {
      console.error = origErr;
      console.warn = origWarn;
    }
    expect(logged).toEqual([]);
  });

  it('لرزش haptics روی لمس‌های مهم فعال است و با خاموش‌کردن قطع می‌شود (P7-08)', () => {
    const vibrated: number[] = [];
    Object.defineProperty(globalThis, 'navigator', {
      value: { vibrate: (ms: number) => { vibrated.push(ms); return true; } },
      configurable: true,
      writable: true,
    });
    updateSetting('haptics', true);
    expect(haptic('heavy')).toBe(35);
    sfx.coin();
    expect(vibrated.length).toBeGreaterThanOrEqual(2);

    const countBefore = vibrated.length;
    updateSetting('haptics', false);
    expect(haptic('heavy')).toBe(0);
    sfx.coin();
    expect(vibrated.length).toBe(countBefore);
  });
});
