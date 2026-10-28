// ===== ممیزی «دو سیستم کولهٔ پشتی + انبار»، هشدارهای صبحگاهی و بندهای گزارش رنج =====
import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { installDom } from './helpers/dom';
import {
  S, UI, canAct, doAct, invCap, invCount, packCap, packCount, resetGame,
  startDebt, transferPackToBarn, addPack, setSimBatchMode, harvestPond, harvestHoney,
} from '../src/game/state';
import { sellAll } from '../src/game/core/economy';
import { GT } from '../src/strings/gameText';
import { GT_EN } from '../src/strings/en';
import { loadSettings } from '../src/game/settings';
import { triggerEvent } from '../src/game/core/events';
import { Hud } from '../src/ui/Hud';

beforeAll(() => { installDom(); });
beforeEach(() => { localStorage.clear(); UI.modal = null; UI.scene = 'farm'; UI.started = true; resetGame(); });

const ripeWheat = (i: number) => {
  S.plots[i].st = 2;
  S.plots[i].crop = 'wheat';
  S.plots[i].ripe = true;
  S.plots[i].water = 1;
  S.plots[i].dry = 0;
  S.plots[i].dead = false;
  S.plots[i].prog = 1;
};

describe('دو سیستم کولهٔ پشتی و انبار', () => {
  it('ظرفیت‌ها جداست، برداشت بازیکن به کوله می‌رود و تخلیه به انبار کار می‌کند', () => {
    expect(packCap()).toBe(24);  // PACK_CAP[0]
    expect(invCap()).toBe(40);   // BARN_CAP — منحنی قدیمی کیف برای ثبات بات
    expect(packCount()).toBe(0);

    ripeWheat(0);
    expect(canAct('harvest', 0, false)).toBe('');
    const r = doAct('harvest', 0, false, undefined, true);
    expect(r.crop).toBe('wheat');
    expect(packCount()).toBeGreaterThan(0);
    expect(invCount()).toBe(0);

    // کوله پر → برداشت بازیکن بلوکه؛ کارگر با انبار خالی آزاد است
    ripeWheat(0);
    S.pack = { wheat: packCap() };
    expect(canAct('harvest', 0, false)).toBe('full');
    expect(canAct('harvest', 0, true)).toBe('');
    // انبار پر → مسیر کارگر بلوکه
    S.inv = { wheat: invCap() };
    expect(canAct('harvest', 0, true)).toBe('full');

    // انتقال کوله به انبار و ایزوله بودن ارتقاها
    S.inv = {};
    S.pack = { wheat: 10, carrot: 5 };
    expect(transferPackToBarn()).toBe(15);
    expect(packCount()).toBe(0);
    expect(invCount()).toBe(15);
    S.lv.barn = 2;
    expect(invCap()).toBe(160);
    expect(packCap()).toBe(24);
    S.lv.bag = 2;
    expect(packCap()).toBe(96);
    expect(invCap()).toBe(160);
  });

  it('کارگر به انبار می‌برد؛ صید و عسل با کولهٔ پر بلوکه و مسیر شبیه‌ساز به انبار می‌رود', () => {
    ripeWheat(1);
    doAct('harvest', 1, true, undefined, true); // worker=true
    expect(invCount()).toBeGreaterThan(0);
    expect(packCount()).toBe(0);

    // بازیکن: کولهٔ پر → صید صفر و استخر سالم می‌ماند
    S.ponds = [{ id: 1, stocked: true, grow: 99, feed: 3 }];
    S.pack = { wheat: packCap() };
    expect(harvestPond(0, false)).toBe(0);
    expect(S.ponds[0].stocked).toBe(true);

    // عسل با کولهٔ پر (مسیر بازیکن، انبار خالی نیست در حالت عادی) → اول کوله، سپس انبار
    S.hives = 1;
    S.honeyAcc = 3;
    S.pack = { wheat: packCap() };
    S.inv = {};
    expect(harvestHoney(false)).toBe(3); // کوله پر ولی انبار جا دارد → اتلاف صفر
    expect(S.honeyAcc).toBe(0);

    // حالت شبیه‌ساز/بات: انبار پر → صید صفر (مثل رفتار قدیمی)
    setSimBatchMode(true);
    try {
      S.inv = { wheat: invCap() };
      S.ponds = [{ id: 1, stocked: true, grow: 99, feed: 3 }];
      expect(harvestPond(0, false)).toBe(0);
      expect(S.ponds[0].stocked).toBe(true);
      S.honeyAcc = 3;
      expect(harvestHoney(false)).toBe(0);
      expect(S.honeyAcc).toBe(3);
    } finally {
      setSimBatchMode(false);
    }
  });

  it('«فروش همه» کولهٔ بازیکن را هم می‌فروشد', () => {
    addPack('wheat', 12);
    expect(packCount()).toBe(12);
    const got = sellAll();
    expect(got).toBeGreaterThan(0);
    expect(packCount()).toBe(0);
  });
});

describe('کارت صبحگاهی همان روز (هشدارها)', () => {
  const morningOn = () => {
    S.morning = { day: 1, earned: 0, gathered: 0, ripe: 0, shown: false };
    S.hour = 7;
  };

  it('تشنگی، حقوق، سررسید قسط و راهنمای باج‌گیری نمایش داده می‌شوند', () => {
    morningOn();
    Object.assign(S.plots[0], { crop: 'wheat', st: 1, water: 0, dry: 5, dead: false });
    S.workers = 1;
    S.coins = 0;
    startDebt(0);
    S.debt!.dueDay = S.day;
    S.debt!.lastVisit = { kind: 'raid', day: S.day, taken: 0, toDebt: 0, lateFee: 0, remaining: S.debt!.remaining, noteName: '', text: '' };
    const html = renderToString(<Hud />);
    expect(html).toContain('data-morning-report="1"');
    expect(html).toContain('زمین تشنه');
    expect(html).toContain('حقوق امشب');
    expect(html).toContain('امروز روز سررسید');
    expect(html).toContain('مترسک بخر');
  });

  it('بدون بدهی هرگز هشدار سررسید نشان نمی‌دهد', () => {
    morningOn();
    expect(S.debt).toBeFalsy();
    const html = renderToString(<Hud />);
    expect(html).toContain('data-morning-report="1"');
    expect(html).not.toContain('سررسید قسط');
  });
});

describe('بندهای دیگر گزارش رنج', () => {
  it('خشکسالی صادق می‌گوید ۲۵٪ آب بخار رفت (FA و EN)', () => {
    expect(GT.evDroughtDesc).toContain('۲۵٪');
    expect(GT_EN.evDroughtDesc).toContain('25%');
  });

  it('سیل دیگر کود زمین را نمی‌سوزاند', () => {
    Object.assign(S.plots[0], { st: 1, water: 0, dry: 8, fert: 0.5 });
    triggerEvent('flood');
    expect(S.plots[0].water).toBe(1);
    expect(S.plots[0].dry).toBe(0);
    expect(S.plots[0].fert).toBe(0.5);
  });

  it('لرزش پیش‌فرض خاموش است', () => {
    expect(loadSettings().haptics).toBe(false);
  });

  it('پرچم‌های کدی: کارت جریمه، کولهٔ هنری، بات انبار می‌خرد، شمارش تشنگی', () => {
    const cut = readFileSync('src/ui/Cutscene.tsx', 'utf8');
    expect(cut).toContain('data-fine-card="1"');
    expect(cut).toContain('data-fine-ack="1"');
    expect(cut).toContain('STAND_BEAT');
    expect(cut).toContain('fineAck');
    const er = readFileSync('src/game/engineRender.ts', 'utf8');
    expect(er).toContain('drawBackpack(');
    expect(er).toContain('drawThirstLeft(');
    expect(readFileSync('src/game/estateScenes.ts', 'utf8')).toContain('drawBackpack(');
    const bot = readFileSync('scripts/bot.ts', 'utf8');
    expect(bot).toContain("['land', 'barn'");
    expect(bot).not.toContain("'bag'");
    expect(readFileSync('src/game/core/events.ts', 'utf8')).not.toContain('EVENT_FLOOD_FERT_LOSS');
  });
});
