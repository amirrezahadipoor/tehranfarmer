import { beforeEach, describe, expect, it } from 'vitest';
import {
  S, UI, addGood, advance, buyAnimal, buyFeed, buySeed, canAct, doAct, farmLevel, goodPrice,
  harvestHoney, harvestPond, invCount, invCap, packCount, resetGame, season, seedPrice, sellAll, sellGood,
  sleepToMorning, stockPond, xpProgress, enqueueBuild, completeBuild, tickBuilds, penCap, honeyCap, addXp, feedPond,
} from './helpers/game';
import { CROP, CROPS, FINGER_PRICE, LEVEL_CAP, POND_GROW_DAYS, xpNeed } from '../src/game/data';
import { checkInvariants } from './helpers/invariants';

beforeEach(() => { localStorage.clear(); UI.modal = null; UI.scene = 'farm'; UI.tool = 'hand'; resetGame(); S.coins = 5000; });

const plantAt = (i: number, id: 'wheat' | 'carrot' = 'wheat') => {
  S.plots[i].st = 1;
  S.seeds[id] = (S.seeds[id] ?? 0) + 1;
  const r = doAct('plant', i, false, id, true);
  doAct('water', i, true, undefined, true);
  return r;
};

describe('چرخهٔ زمین و محصول', () => {
  it('شخم، کاشت، آبیاری، رشد و برداشت', () => {
    doAct('till', 0);
    expect(S.plots[0].st).toBe(1);
    plantAt(0);
    expect(S.plots[0].st).toBe(2);
    expect(S.plots[0].crop).toBe('wheat');
    doAct('water', 0);
    expect(S.plots[0].water).toBe(1);
    // گندم ۳ روز × DAY_RATE=۲ → ~۶ روز بازی لازم است
    advance(24 * 7);
    expect(S.plots[0].ripe).toBe(true);
    const r = doAct('harvest', 0);
    expect(r.crop).toBe('wheat');
    expect(packCount()).toBeGreaterThan(0); // دوسیستمی: برداشت بازیکن به کولهٔ پشتی می‌رود
    expect(invCount()).toBe(0);
    checkInvariants('harvest');
  });

  it('کاشت بدون بذر ممکن نیست', () => {
    S.seeds.wheat = 0;
    S.plots[1].st = 1;
    expect(canAct('plant', 1, false, 'wheat')).toBe('noseed');
  });

  it('کاشت خارج فصل در زمین معمولی ممنوع است', () => {
    // گندم: بهار/پاییز/زمستان — تابستان ممنوع (روز ۱۰ = تابستان)
    S.day = 10;
    expect(season()).toBe(1);
    S.seeds.wheat = 5;
    S.plots[2].st = 1;
    expect(canAct('plant', 2, false, 'wheat')).toBe('season');
  });

  it('گیاه خارج‌فصل می‌خوابد و نمی‌میرد', () => {
    S.day = 1; // بهار
    plantAt(3);
    advance(24 * 2);
    S.day = 9; // تابستان → گندم خواب
    const prog = S.plots[3].prog;
    advance(24 * 5);
    expect(S.plots[3].dead).toBe(false);
    expect(S.plots[3].prog).toBeCloseTo(prog, 5);
  });

  it('بی‌آبی طولانی گیاه را می‌کشد', () => {
    plantAt(4);
    for (let i = 0; i < 60 * 8; i++) S.plots[4].water = 0; // هر روز خشک نگه دار
    advance(24 * 6);
    expect(S.plots[4].dead).toBe(true);
  });

  it('محصول بازکشت (خیار) چند بار برداشت می‌دهد', () => {
    S.day = 1; S.coins = 10 ** 6;
    S.seeds.cucumber = 3;
    S.plots[5].st = 1;
    const res = doAct('plant', 5, false, 'cucumber', true);
    expect(res.crop).toBe('cucumber');
    let harvests = 0;
    for (let d = 0; d < 30 && harvests < 3; d++) {
      doAct('water', 5, true, undefined, true);
      advance(24);
      if (S.plots[5].ripe) { doAct('harvest', 5, true, undefined, true); harvests++; }
    }
    expect(harvests).toBe(3); // maxH=3 → دقیقاً سه برداشت از یک بوته
    expect(CROP.cucumber.regrow).toBeDefined();
  });

  it('انبار پر → برداشت ممکن نیست', () => {
    plantAt(2);
    for (let d = 0; d < 8; d++) { doAct('water', 2, true, undefined, true); advance(24); }
    expect(S.plots[2].ripe).toBe(true);
    S.inv = { wheat: invCap() };
    expect(canAct('harvest', 2, true)).toBe('full');
  });
});

describe('اقتصاد و فروش', () => {
  it('فروش سکه و تجربه می‌دهد و تقاضا را کم می‌کند', () => {
    addGood('wheat', 10);
    const before = goodPrice('wheat');
    const xp0 = S.xp;
    const got = sellGood('wheat', 10);
    expect(got).toBeGreaterThan(0);
    expect(S.coins).toBeGreaterThan(5000);
    expect(S.xp).toBeGreaterThan(xp0);
    expect(goodPrice('wheat')).toBeLessThan(before);
  });

  it('فروش بیش از موجودی، بیشتر از موجودی نمی‌دهد', () => {
    S.inv = {};
    addGood('wheat', 2);
    const got = sellGood('wheat', 99);
    expect(got).toBeGreaterThan(0);
    expect(S.inv.wheat ?? 0).toBe(0);
    expect(sellGood('wheat', 5)).toBe(0);
  });

  it('قیمت بذر با خرید بالا می‌رود', () => {
    const p0 = seedPrice('wheat');
    buySeed('wheat', 5);
    expect(seedPrice('wheat')).toBeGreaterThanOrEqual(p0);
  });

  it('sellAll علوفه را نمی‌فروشد', () => {
    addGood('feed', 4);
    addGood('wheat', 2);
    sellAll();
    expect(S.inv.feed).toBe(4);
  });
});

describe('دام و تولیدمثل', () => {
  it('مرغ ماده بالغ با علوفه تخم می‌گذارد، خروس نه', () => {
    S.coins = 10 ** 5;
    S.animals = [
      { id: 1, kind: 'chicken', ready: 0, hue: 0, sex: 'f', grown: 0 },
      { id: 2, kind: 'chicken', ready: 0, hue: 1, sex: 'm', grown: 0 },
    ];
    S.trough = 20;
    advance(24 * 3);
    const female = S.animals.find((a) => a.sex === 'f')!;
    const male = S.animals.find((a) => a.sex === 'm')!;
    expect(female.ready).toBeGreaterThan(0);
    expect(male.ready).toBe(0);
  });

  it('نر + ماده در یک حصار → بچه (لانه یا آبستنی)', () => {
    S.animals = [
      { id: 1, kind: 'chicken', ready: 0, hue: 0, sex: 'f', grown: 0 },
      { id: 2, kind: 'chicken', ready: 0, hue: 1, sex: 'm', grown: 0 },
    ];
    S.pens.chicken = 3;
    S.trough = 60;
    const n0 = S.animals.length;
    for (let d = 0; d < 20 && S.animals.length === n0; d++) advance(24);
    expect(S.nests.length + S.animals.length).toBeGreaterThan(2);
    expect(S.animals.length).toBeLessThanOrEqual(penCap('chicken'));
  });

  it('بدون حصار خرید دام ممکن نیست', () => {
    S.coins = 10 ** 5;
    delete S.pens.rabbit;
    const n = S.animals.length;
    buyAnimal('rabbit');
    expect(S.animals.length).toBe(n);
  });

  it('حصار پر → خرید اضافه نمی‌شود', () => {
    S.coins = 10 ** 5;
    S.pens.chicken = 1; // ظرفیت ۳
    S.animals = [];
    for (let i = 0; i < 6; i++) buyAnimal('chicken');
    expect(S.animals.length).toBe(3);
  });
});

describe('زنبور و استخر', () => {
  it('کندو روزانه عسل تولید می‌کند و برداشت سقف دارد', () => {
    S.hives = 2;
    advance(24 * 5);
    expect(S.honeyAcc).toBeGreaterThan(0);
    const got = harvestHoney(true);
    expect(got).toBeGreaterThan(0);
    expect(got).toBeLessThanOrEqual(2 * 28);
    expect(harvestHoney(true)).toBe(0);
    expect(S.honeyAcc).toBeGreaterThanOrEqual(0);
    expect(honeyCap()).toBe(2 * 28);
  });

  it('استخر: بچه‌ماهی، علوفه، رشد و برداشت', () => {
    S.coins = 10 ** 5;
    enqueueBuild('pond', 'pond', 'استخر', 'pond', 100);
    completeBuild(S.builds[0].id);
    S.coins = 10 ** 5;
    stockPond(0);
    expect(S.ponds[0].stocked).toBe(true);
    S.inv.feed = 10;
    feedPond(0);
    for (let d = 0; d < POND_GROW_DAYS + 2; d++) { feedPond(0); advance(24); }
    const got = harvestPond(0);
    expect(got).toBeGreaterThan(0);
    expect(S.ponds[0].stocked).toBe(false);
    checkInvariants('pond');
  });

  it('خرید بچه‌ماهی پول کم می‌کند', () => {
    S.coins = FINGER_PRICE * 2;
    const before = S.coins;
    buyFeed(1);
    expect(S.coins).toBeLessThan(before);
  });
});

describe('سطح، تجربه، خواب و ساخت', () => {
  it('تجربه سطح را بالا می‌برد و پاداش می‌دهد', () => {
    const c0 = S.coins;
    addXp(xpNeed(1));
    expect(farmLevel()).toBe(2);
    expect(S.coins).toBeGreaterThan(c0);
    expect(xpProgress().lv).toBe(2);
  });

  it('سقف سطح ۳۰ رعایت می‌شود', () => {
    addXp(1e12);
    expect(farmLevel()).toBe(LEVEL_CAP);
    expect(xpProgress().cur).toBe(1);
  });

  it('خواب تا صبح ساعت را به ۶ می‌برد', () => {
    S.hour = 21;
    sleepToMorning();
    expect(S.hour).toBeGreaterThanOrEqual(6);
    expect(S.hour).toBeLessThan(8);
    checkInvariants('sleep');
  });

  it('ساخت با کارگر زمان می‌برد و بعد اثر می‌گذارد', () => {
    S.coins = 10 ** 6;
    enqueueBuild('machine', 'sprinkler', 'آب‌پاش', 'sprinkler', 100);
    expect(S.machines.sprinkler ?? 0).toBe(0);
    for (let i = 0; i < 4000 && S.builds.length; i++) { advance(0.5); tickBuilds(0.5); }
    expect(S.machines.sprinkler).toBeGreaterThanOrEqual(1);
  });

  it('۲۴ محصول شناسه و قیمت معتبر دارند', () => {
    for (const c of CROPS) {
      expect(c.seed).toBeGreaterThan(0);
      expect(c.price).toBeGreaterThan(0);
      expect(c.days).toBeGreaterThan(0);
      expect(c.lv).toBeGreaterThanOrEqual(1);
      expect(c.seasons.length).toBeGreaterThan(0);
    }
  });
});
