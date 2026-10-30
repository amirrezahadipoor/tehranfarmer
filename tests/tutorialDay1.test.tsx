// ===== آموزش روز اول: چهار گام عملی و سپس فروش/دفتر/خواب، بدون تداخل با داستان =====
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { installDom } from './helpers/dom';
import { S, UI, resetGame } from '../src/game/state';
import {
  TUT_PLOT, syncTut, tutActive, tutExpectedTool, tutMaybeStart, tutOnLedger, tutOnPlotAction, tutOnSale, tutOnSleep, tutSkip, tutStep, tutTapOk, tutToolBlocked, tutToolHi,
} from '../src/game/tutorial';
import { TutorialOverlay } from '../src/ui/TutorialOverlay';
import { CFG } from '../src/game/settings';

beforeAll(() => { installDom(); });
beforeEach(() => {
  localStorage.clear();
  resetGame();
  UI.started = true;
  UI.scene = 'farm';
  UI.modal = null;
  UI.tool = 'hand';
  UI.seedTray = false;
  S.story.pending = null;
});

describe('آموزش تعاملی روز اول — عمل روی کرت و راهنمای اختیاری ادامهٔ مسیر', () => {
  it('شروع خودکار: ابزار آماده است اما هیچ کرت یا ابزار دیگری قفل نمی‌شود', () => {
    tutMaybeStart();
    expect(tutActive()).toBe(true);
    expect(tutStep()).toBe(0);
    expect(tutExpectedTool()).toBe('till');
    expect(UI.tool).toBe('till'); // بازیکن نیازی به انتخاب ندارد — خودش روشن می‌شود

    expect(tutTapOk(TUT_PLOT)).toBe(true);
    expect(tutTapOk(1)).toBe(true); // گشت‌وگذار و تمرین روی بقیهٔ کرت‌ها آزاد است
    UI.tool = 'water';
    syncTut();
    expect(UI.tool).toBe('water'); // راهنما انتخاب تازهٔ بازیکن را پس نمی‌گیرد
    expect(tutTapOk(TUT_PLOT)).toBe(true);
    UI.tool = 'till';

    expect(tutToolBlocked('water')).toBe(false);
    expect(tutToolBlocked('till')).toBe(false);
    expect(tutToolHi('till')).toBe(true);
    expect(tutToolHi('plant')).toBe(false);
  });

  it('گام‌به‌گام تا پایان: شخم، کاشت، آبیاری، برداشت، فروش، دفتر و استراحت', () => {
    tutMaybeStart();
    expect(UI.seedTray).toBe(false);

    tutOnPlotAction(TUT_PLOT); // پس از ثبتِ شخم
    expect(tutStep()).toBe(1);
    expect(UI.tool).toBe('plant');
    expect(UI.seedTray).toBe(false); // بذر آماده است؛ یک پنجرهٔ اضافه جلوی عمل را نمی‌گیرد
    expect(UI.seed).toBe('wheat');

    tutOnPlotAction(TUT_PLOT); // کاشت
    expect(tutStep()).toBe(2);
    expect(UI.tool).toBe('water');
    expect(UI.seedTray).toBe(false);

    // با ابزار غلط عمل ثبت نمی‌شود و گام هم جلو نمی‌رود
    UI.tool = 'hand';
    tutOnPlotAction(TUT_PLOT);
    expect(tutStep()).toBe(2);
    UI.tool = 'water';

    tutOnPlotAction(TUT_PLOT); // آبیاری
    expect(tutStep()).toBe(3);
    expect(UI.tool).toBe('harvest');

    // ورود به گام برداشت: کرت آموزشی بلافاصله می‌رسد تا حلقهٔ کامل همان روز تمرین شود
    S.plots[TUT_PLOT].st = 2;
    S.plots[TUT_PLOT].crop = 'wheat';
    S.plots[TUT_PLOT].ripe = false;
    S.plots[TUT_PLOT].prog = 0.4;
    syncTut();
    expect(S.plots[TUT_PLOT].ripe).toBe(true);
    expect(S.plots[TUT_PLOT].prog).toBe(1);

    tutOnPlotAction(TUT_PLOT); // برداشت
    expect(tutStep()).toBe(4);
    expect(S.tut!.done).toBe(false);
    expect(S.tut!.active).toBe(true);

    tutOnSale();
    expect(tutStep()).toBe(5);
    tutOnLedger();
    expect(tutStep()).toBe(6);
    tutOnSleep();
    expect(S.tut!.done).toBe(true);
    expect(S.tut!.active).toBe(false);
    expect(tutActive()).toBe(false);

    tutMaybeStart(); // پایان‌یافته، دوباره شروع نمی‌شود
    expect(S.tut!.active).toBe(false);
    expect(tutActive()).toBe(false);
  });

  it('با داستان تداخل نمی‌کند: هنگام صحنهٔ داستان پنهان و بعد برمی‌گردد', () => {
    tutMaybeStart();
    expect(tutActive()).toBe(true);
    S.story.pending = 'p1';
    expect(tutActive()).toBe(false); // صحنهٔ داستان اولویت دارد
    S.story.pending = null;
    expect(tutActive()).toBe(true);
    UI.modal = 'market';
    expect(tutActive()).toBe(false); // حین مودال هم دخالتی ندارد
    UI.modal = null;
    UI.scene = 'town';
    expect(tutActive()).toBe(false);
    UI.scene = 'farm';
    expect(tutActive()).toBe(true);
  });

  it('دکمهٔ رد کردن همیشه کار می‌کند و آموزش را برای همیشه می‌بندد', () => {
    tutMaybeStart();
    const html = renderToString(<TutorialOverlay />);
    expect(html).toContain('data-tutorial="1"');
    expect(html).toContain('رد کردن آموزش'); // کنترل خروج با متنِ دیدنی، نه یک ضربدرِ بی‌توضیح
    expect(html).toContain('کرت را شخم بزن');
    expect(html).toContain('بیل آماده است');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('جمع کردن راهنما');
    const locale = CFG.locale;
    try {
      CFG.locale = 'en';
      const english = renderToString(<TutorialOverlay />);
      expect(english).toContain('Till the plot');
      expect(english).toContain('The hoe is ready');
      expect(english).not.toContain('کرت را شخم بزن');
    } finally { CFG.locale = locale; }

    tutSkip();
    expect(S.tut!.done).toBe(true);
    expect(tutActive()).toBe(false);
    expect(renderToString(<TutorialOverlay />)).not.toContain('data-tutorial="1"');
    tutMaybeStart();
    expect(S.tut!.active).toBe(false);
  });

  it('در postgame نه شروع می‌شود و نه گام پنهانی جلو می‌رود', () => {
    S.story.postgame = true;
    tutMaybeStart();
    expect(S.tut!.active).toBe(false);
    S.tut = { step: 4, active: true, done: false };
    tutOnSale();
    expect(tutStep()).toBe(4);
    expect(tutActive()).toBe(false);
  });

  it('سیوی قدیمی (بدون فیلد tut) هرگز آموزش نمی‌بیند', () => {
    S.tut = undefined;
    tutMaybeStart();
    expect(S.tut).toBeUndefined();
    expect(tutActive()).toBe(false);
  });

  it('در Playwright هم همان آموزش واقعی کاربر شروع می‌شود', () => {
    const g = globalThis as { navigator?: unknown };
    const orig = Object.getOwnPropertyDescriptor(g, 'navigator');
    Object.defineProperty(g, 'navigator', { value: { webdriver: true }, configurable: true, writable: true });
    try {
      S.tut = { step: 0, active: false, done: false };
      tutMaybeStart();
      expect(S.tut.active).toBe(true);
      expect(tutActive()).toBe(true);
    } finally {
      if (orig) Object.defineProperty(g, 'navigator', orig);
      else delete g.navigator;
    }
  });
});
