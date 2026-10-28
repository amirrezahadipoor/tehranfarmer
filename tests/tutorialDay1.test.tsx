// ===== آموزش تعاملی روز اول (U-4): بدون متن، اجبارِ انجام، بدون تداخل با داستان، قابل رد شدن =====
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { installDom } from './helpers/dom';
import { S, UI, resetGame } from '../src/game/state';
import {
  TUT_PLOT, syncTut, tutActive, tutExpectedTool, tutMaybeStart, tutOnPlotAction, tutSkip, tutStep, tutTapOk, tutToolBlocked, tutToolHi,
} from '../src/game/tutorial';
import { TutorialOverlay } from '../src/ui/TutorialOverlay';

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

describe('آموزش تعاملی روز اول — یادگیری با اجبار، بدون یک کلمه', () => {
  it('شروع خودکار: ابزارِ گامِ اول انتخاب می‌شود و فقط کرت هدف با ابزار درست باز است', () => {
    tutMaybeStart();
    expect(tutActive()).toBe(true);
    expect(tutStep()).toBe(0);
    expect(tutExpectedTool()).toBe('till');
    expect(UI.tool).toBe('till'); // بازیکن نیازی به انتخاب ندارد — خودش روشن می‌شود

    expect(tutTapOk(TUT_PLOT)).toBe(true);
    expect(tutTapOk(1)).toBe(false); // کرت دیگر پاسخ نمی‌دهد
    UI.tool = 'water';
    expect(tutTapOk(TUT_PLOT)).toBe(false); // ابزار غلط هم پاسخ نمی‌دهد
    UI.tool = 'till';
    expect(tutTapOk(TUT_PLOT)).toBe(true);

    expect(tutToolBlocked('water')).toBe(true);
    expect(tutToolBlocked('till')).toBe(false);
    expect(tutToolHi('till')).toBe(true);
    expect(tutToolHi('plant')).toBe(false);
  });

  it('گام‌به‌گام تا پایان: شخم، کاشت، آبیاری، برداشت — بدون رد شدنِ آموزش', () => {
    tutMaybeStart();
    expect(UI.seedTray).toBe(false);

    tutOnPlotAction(TUT_PLOT); // پس از ثبتِ شخم
    expect(tutStep()).toBe(1);
    expect(UI.tool).toBe('plant');
    expect(UI.seedTray).toBe(true); // سینی بذر خودش باز می‌شود
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
    expect(UI.tool).toBe('hand');

    // ورود به گام برداشت: کرت آموزشی بلافاصله می‌رسد تا حلقهٔ کامل همان روز تمرین شود
    S.plots[TUT_PLOT].st = 2;
    S.plots[TUT_PLOT].crop = 'wheat';
    S.plots[TUT_PLOT].ripe = false;
    S.plots[TUT_PLOT].prog = 0.4;
    syncTut();
    expect(S.plots[TUT_PLOT].ripe).toBe(true);
    expect(S.plots[TUT_PLOT].prog).toBe(1);

    tutOnPlotAction(TUT_PLOT); // برداشت
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
    expect(html).toContain('رد کردن آموزش'); // فقط aria/title — هیچ متنِ دیدنی‌ای در کار نیست

    tutSkip();
    expect(S.tut!.done).toBe(true);
    expect(tutActive()).toBe(false);
    expect(renderToString(<TutorialOverlay />)).not.toContain('data-tutorial="1"');
    tutMaybeStart();
    expect(S.tut!.active).toBe(false);
  });

  it('سیوی قدیمی (بدون فیلد tut) هرگز آموزش نمی‌بیند', () => {
    S.tut = undefined;
    tutMaybeStart();
    expect(S.tut).toBeUndefined();
    expect(tutActive()).toBe(false);
  });

  it('در محیط خودکار (پلی‌رایت/CI) آموزش شروع نمی‌شود', () => {
    const g = globalThis as { navigator?: unknown };
    const orig = Object.getOwnPropertyDescriptor(g, 'navigator');
    Object.defineProperty(g, 'navigator', { value: { webdriver: true }, configurable: true, writable: true });
    try {
      S.tut = { step: 0, active: false, done: false };
      tutMaybeStart();
      expect(S.tut.active).toBe(false);
      expect(tutActive()).toBe(false);
    } finally {
      if (orig) Object.defineProperty(g, 'navigator', orig);
      else delete g.navigator;
    }
  });
});
