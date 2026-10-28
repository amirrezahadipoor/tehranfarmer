// ===== ممیزی «دو سیستم کولهٔ پشتی + انبار»، هشدارهای صبحگاهی و بندهای گزارش رنج =====
import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { installDom } from './helpers/dom';
import {
  S, UI, canAct, doAct, deliverContract, fulfillMailDeal, holdCount, invCap, invCount, packCap, packCount, resetGame,
  rollMailTradeOffer, sellAll, sellGood, srcHave, startDebt, transferPackToBarn, addPack, setSimBatchMode, harvestPond, harvestHoney,
} from '../src/game/state';
import { giftVillager, findBestGiftInBag } from '../src/story/socialVillagers';
import { ROYAL_DECREES, fulfillRoyalDecree, judgeFestivalSubmission } from '../src/game/core/frontier';
import { Modals } from '../src/ui/Modals';
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
    expect(packCap()).toBe(80);  // PACK_CAP[0]
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
    expect(packCap()).toBe(80);
    S.lv.bag = 2;
    expect(packCap()).toBe(320);
    expect(invCap()).toBe(160);
  });

  it('منبع فروش در بازار: کوله / انبار / هر دو مستقل عمل می‌کنند', () => {
    expect(S.sellFrom).toBe('both'); // پیش‌فرض برای بات و رفتار قدیمی
    S.pack = { wheat: 10 };
    S.inv = { wheat: 20, carrot: 5 };

    S.sellFrom = 'pack';
    expect(srcHave('wheat')).toBe(10);
    expect(sellAll()).toBeGreaterThan(0);
    expect(S.pack.wheat ?? 0).toBe(0);   // کوله خالی شد
    expect(S.inv.wheat).toBe(20);        // انبار دست‌نخورده ماند
    expect(S.inv.carrot).toBe(5);

    S.pack = { wheat: 10 };
    S.sellFrom = 'barn';
    expect(sellAll()).toBeGreaterThan(0);
    expect(S.pack.wheat).toBe(10);       // کوله دست‌نخورده ماند
    expect(S.inv.wheat ?? 0).toBe(0);
    expect(S.inv.carrot ?? 0).toBe(0);

    S.sellFrom = 'both';
    S.pack = { wheat: 10 };
    S.inv = { wheat: 20 };
    S.contract = { good: 'wheat', qty: 6, deposit: 100, reward: 500, dueDay: S.day + 9 };
    expect(sellAll()).toBeGreaterThan(0);
    expect(S.pack.wheat ?? 0).toBe(0);
    expect(S.inv.wheat).toBe(6); // سهم قرارداد در هر دو حالت محفوظ ماند
    S.contract = null;
  });

  it('فروش تکی در بازار از منبع انتخابی کم می‌شود', () => {
    S.pack = { carrot: 4 };
    S.inv = { carrot: 9 };
    S.sellFrom = 'pack';
    const barnBefore = S.inv.carrot;
    expect(sellGood('carrot', 3)).toBeGreaterThan(0);
    expect(S.pack.carrot).toBe(1);
    expect(S.inv.carrot).toBe(barnBefore);
    S.sellFrom = 'barn';
    expect(sellGood('carrot', 2)).toBeGreaterThan(0);
    expect(S.pack.carrot).toBe(1);
    expect(S.inv.carrot).toBe(barnBefore - 2);
    S.sellFrom = 'both';
  });

  it('قرارداد بازار از کوله هم تحویل می‌گیرد — ناقص، هیچ‌چیز کم نمی‌شود', () => {
    S.contract = { good: 'wheat', qty: 6, deposit: 100, reward: 500, dueDay: S.day + 9 };
    S.pack = { wheat: 4 };
    S.inv = { wheat: 5 };
    expect(holdCount('wheat')).toBe(9);
    expect(deliverContract()).toBe(true);
    expect(S.pack.wheat ?? 0).toBe(0); // اول از کولهٔ پشتی کم شد (کلید صفر حذف می‌شود)
    expect(S.inv.wheat).toBe(3);       // ۴ از کوله + ۲ از انبار = ۶ تحویل شد
    expect(S.contract).toBeNull();
    expect(holdCount('wheat')).toBe(3);

    S.contract = { good: 'wheat', qty: 6, deposit: 0, reward: 500, dueDay: S.day + 9 };
    S.pack = { wheat: 2 };
    S.inv = { wheat: 1 };
    const c0 = S.coins;
    expect(deliverContract()).toBe(false); // اتمیک: نه کوله، نه انبار دست می‌خورند
    expect(S.pack.wheat).toBe(2);
    expect(S.inv.wheat).toBe(1);
    expect(S.coins).toBe(c0);
    S.contract = null;
  });

  it('سفارش پستی عمده با کالای موجود در کوله ارسال می‌شود', () => {
    const entry = rollMailTradeOffer(true);
    expect(entry?.trade).toBeTruthy();
    const tr = entry!.trade!;
    S.pack = { [tr.good]: tr.qty };
    S.inv = {};
    const c0 = S.coins;
    expect(fulfillMailDeal(entry!.id)).toBe(true);
    expect(S.coins).toBeGreaterThanOrEqual(c0 + tr.reward); // افزایش XP ممکن است پاداش سطح هم بدهد
    expect(S.pack[tr.good] ?? 0).toBe(0);
  });

  it('فرمان شاهی کالای کوله را می‌پذیرد', () => {
    S.xp = 5_000_000;
    S.pack = { potato: 6, egg: 5, herb: 3 };
    S.inv = {};
    const c0 = S.coins;
    expect(fulfillRoyalDecree(ROYAL_DECREES[0].id)).toBe(true);
    expect(S.pack.potato ?? 0).toBe(0);
    expect(S.pack.egg ?? 0).toBe(0);
    expect(S.pack.herb ?? 0).toBe(0);
    expect(S.coins).toBeGreaterThan(c0);
  });

  it('هدیهٔ روستاییان از کوله انتخاب و کم می‌شود', () => {
    S.pack = { saffron: 1 };
    S.inv = {};
    expect(findBestGiftInBag('grandma')).toBe('saffron');
    expect(giftVillager('grandma', 'saffron')).toBe(true);
    expect(S.pack.saffron ?? 0).toBe(0);
    expect(S.affinity?.grandma ?? 0).toBeGreaterThan(0);
    S.pack = {};
    S.inv = {};
    expect(findBestGiftInBag('grandma')).toBeNull();
    expect(giftVillager('grandma')).toBe(false);
  });

  it('داوری جشنواره: از کوله هم شمرده می‌شود و هر قلم تحویل داوران (مصرف) می‌شود', () => {
    S.pack = { saffron: 2, cheese: 2, turquoise: 1 };
    S.inv = {};
    const r = judgeFestivalSubmission(['saffron', 'cheese', 'turquoise']);
    expect(r).not.toBeNull();
    expect(r!.rank).toBe(1);
    expect(S.pack.saffron).toBe(1);    // ۱ قلم تحویل داوران
    expect(S.pack.cheese).toBe(1);
    expect(S.pack.turquoise ?? 0).toBe(0);
    expect(judgeFestivalSubmission(['saffron'])).toBeNull(); // در همان روز یک بار
  });

  it('مودال بازار کلید انتخاب منبع فروش را نشان می‌دهد', () => {    UI.modal = 'market';
    const html = renderToString(<Modals />);
    UI.modal = null;
    expect(html).toContain('data-market-sellfrom');
    expect(html).toContain('data-sell-src="pack"');
    expect(html).toContain('data-sell-src="barn"');
    expect(html).toContain('data-sell-src="both"');
    expect(html).toContain('فروش از');
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
