import { describe, expect, it, beforeEach } from 'vitest';
import {
  S, UI, advance, buyWorker, doAct, resetGame, runAuto, startDebt, payDebt,
} from '../src/game/state';
import { ANIMALS, CROPS, POND_GROW_DAYS } from '../src/game/data';
import {
  FEED_TROUGH, RANCH_PEN_SLOTS, STRAW_NEST, collectAllStrawEggs, hasGrazingLivestock, pendingStrawEggs, unifiedPondGeom,
} from '../src/game/farmZones';
import { handleFarmAnimalTap } from '../src/game/farmVisuals';
import { areaFor, compileSceneScript } from '../src/story/sceneScripts';
import { talkToSharkhar, talkToTownNpc, advanceNode, pendingNode } from '../src/story/engine';

describe('۱۱ فیکس کامل گزارش پلی‌تست واقعی موبایل', () => {
  beforeEach(() => {
    resetGame();
    UI.started = true;
  });

  it('۱ و ۱۱: محصولات فصلی چندچین (مثل توت‌فرنگی و فلفل) سریع‌تر رشد می‌کنند و هرگز وسط تغییر فصل منجمد نمی‌شوند', () => {
    expect(CROPS.find((c) => c.id === 'wheat')!.days).toBeLessThanOrEqual(2);
    expect(CROPS.find((c) => c.id === 'strawberry')!.regrow).toBeLessThanOrEqual(1);
    S.xp = 50000;
    S.day = 6; // روز ششم بهار — فردا وارد تابستان می‌شود!
    S.seeds.strawberry = 3;
    doAct('till', 0, true, undefined, true);
    doAct('plant', 0, true, 'strawberry', true);

    let harvests = 0;
    for (let d = 0; d < 8 && S.plots[0].st === 2; d++) {
      S.plots[0].water = 1;
      advance(24);
      if (S.plots[0].ripe) {
        const res = doAct('harvest', 0, true, undefined, true);
        expect((res.qty ?? 0)).toBeGreaterThan(0);
        harvests++;
      }
    }
    expect(harvests).toBe(3);
    expect(S.plots[0].st).toBe(0);
  });

  it('۲: مکالمه در شهر (مردم، جهانگیر، پرداخت سند و ملاقات) هرگز بازیکن را به مزرعه تلپورت نمی‌کند', () => {
    startDebt(0);
    S.story.chapter = 1;
    S.story.prologueSeen = true;
    UI.scene = 'town';

    expect(areaFor('sharkhar-0')).toBe('town');
    expect(areaFor('visit-due-missed-1')).toBe('town');
    expect(areaFor('ch1-outro')).toBe('town');
    expect(areaFor('note-open-2')).toBe('town');

    const compiled = compileSceneScript('visit-due-missed-1')!;
    expect(compiled.area).toBe('town');
    expect(compiled.beats.every((b) => b.area !== 'farm')).toBe(true);

    talkToTownNpc(0);
    while (pendingNode()) {
      expect(UI.scene).toBe('town');
      advanceNode(pendingNode()!);
    }
    expect(UI.scene).toBe('town');

    talkToSharkhar();
    while (pendingNode()) {
      expect(UI.scene).toBe('town');
      advanceNode(pendingNode()!);
    }
    expect(UI.scene).toBe('town');

    S.coins = 5000;
    payDebt(500);
    while (pendingNode()) {
      expect(UI.scene).toBe('town');
      advanceNode(pendingNode()!);
    }
    expect(UI.scene).toBe('town');
  });

  it('۳: استخدام کارگر بلافاصله و بدون آمدن نجار/ساخت‌وساز انجام می‌شود', () => {
    S.xp = 50000;
    S.coins = 20000;
    expect(S.workers).toBe(0);
    buyWorker();
    expect(S.workers).toBe(1);
    expect(S.builds.length).toBe(0);
  });

  it('۵ و ۶: مرغ و جوجه و اردک بدون علوفه تخم می‌گذارند و تا گاو/گوسفند نداریم مطلقاً علوفه مصرف نمی‌شود', () => {
    expect(ANIMALS.chicken.eat).toBe(0);
    expect(ANIMALS.duck.eat).toBe(0);
    expect(S.trough).toBe(0);
    expect(hasGrazingLivestock()).toBe(false);

    S.inv.wheat = 10;
    S.inv.feed = 10;
    S.auto.feed = true;
    runAuto();
    // حتی با دستگاه غذاده خودکار، چون گاو/گوسفند نداریم هیچ علوفه‌ای مصرف یا ریخته نمی‌شود!
    expect(S.trough).toBe(0);
    expect(S.inv.wheat).toBe(10);
    expect(S.inv.feed).toBe(10);

    advance(48);
    expect(pendingStrawEggs()).toBeGreaterThan(0);
    expect(S.trough).toBe(0);
    expect(FEED_TROUGH.cx).toBe(FEED_TROUGH.walkX);
  });

  it('۷ و ۸: هر ۶ گونهٔ دام در بخش‌های کاملاً مجزا و بدون هم‌پوشانی قرار دارند و تخم‌ها یکجا از روی کاه جمع می‌شوند', () => {
    expect(RANCH_PEN_SLOTS.length).toBe(6);
    for (let i = 0; i < RANCH_PEN_SLOTS.length; i++) {
      for (let j = i + 1; j < RANCH_PEN_SLOTS.length; j++) {
        const a = RANCH_PEN_SLOTS[i], b = RANCH_PEN_SLOTS[j];
        const overlap = a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
        expect(overlap).toBe(false);
      }
    }

    S.animals.push({ id: 99, kind: 'duck', ready: 4, hue: 0, sex: 'f', grown: 0 });
    S.animals[0].ready = 3;
    // لمس خود مرغ دیگر تخم جمع نمی‌کند (فقط نوازش می‌کند)
    expect(handleFarmAnimalTap(S.animals[0])).toBe('handled');
    expect(STRAW_NEST.cx).toBeGreaterThan(0);
    // یک لمس روی کاه همهٔ ۷ تخم را یکجا جمع می‌کند!
    expect(pendingStrawEggs()).toBe(7);
    expect(collectAllStrawEggs(true)).toBe(7);
    expect(pendingStrawEggs()).toBe(0);
    expect(S.inv.egg).toBe(7);
  });

  it('۹ و ۱۰: استخر یکپارچه پیوسته بزرگ می‌شود و کارگران در همهٔ بخش‌ها (زمین، کاه تخم، دام، استخر، ماهی رودخانه و عسل) کار می‌کنند', () => {
    const g1 = unifiedPondGeom();
    S.ponds.push({ id: 1, stocked: true, grow: POND_GROW_DAYS, feed: 2 });
    S.ponds.push({ id: 2, stocked: false, grow: 0, feed: 0 });
    const g2 = unifiedPondGeom();
    expect(g2.w).toBeGreaterThan(g1.w);

    S.workers = 2;
    S.coins = 5000;
    S.inv.feed = 10;
    S.hives = 3;
    S.honeyAcc = 4;
    S.animals[0].ready = 4;
    S.animals.push({ id: 50, kind: 'cow', ready: 2, hue: 0, sex: 'f', grown: 0 });
    S.seeds.wheat = 6;
    doAct('till', 0, true, undefined, true);

    S.hour = 8;
    advance(12);

    expect(S.inv.egg ?? 0).toBeGreaterThanOrEqual(4);
    expect(S.inv.milk ?? 0).toBeGreaterThanOrEqual(2);
    expect(S.inv.honey ?? 0).toBeGreaterThan(0);
    expect((S.inv.fish ?? 0) + (S.inv.roe ?? 0)).toBeGreaterThan(0);
    expect(S.ponds[1].stocked).toBe(true);
    expect(S.plots[0].st).toBe(2);
  });
});
