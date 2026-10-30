import React from 'react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { installDom } from './helpers/dom';
import {
  S, UI, advance, buyMachine, buyRod, buyScarecrow, buySeed, exportSaveJson,
  harvestHoney, harvestPond, importSaveJson, payDebt, packCap, resetGame,
  restoreBackupSlot, saleValue, seedPackPrice, sellAll, startDebt, stockPond,
} from '../src/game/state';
import { NOTES } from '../src/story/debtData';
import {
  advanceNode, maybeStartPrologue, pendingNode, skipActiveCutscene, storyCtx,
  triggerCutscene, triggerShopIntro,
} from '../src/story/engine';
import { ensureQuests } from '../src/story/dailyQuests';
import { processSeasonalEvent } from '../src/game/core/events';
import { objectiveKeyFor } from '../src/story/sceneScripts';
import { EN_LINES, OBJECTIVES } from '../src/strings/cinemaLocales';
import { NODES } from '../src/story/story';
import { Hud } from '../src/ui/Hud';
import { Modals } from '../src/ui/Modals';

beforeAll(() => { installDom(); });
beforeEach(() => { localStorage.clear(); resetGame(); UI.started = true; });

describe('قفل دائمی فیکس‌های ۵ حلقهٔ ممیزی AAA (داستان، تریگر، اقتصاد، اعداد و رابط کاربری)', () => {
  it('مبلغ سند پنجم در متن فارسی و انگلیسی دقیقاً ۱٬۶۰۰٬۰۰۰ است و مغازه‌های کارگاه و املاک محتوای درست دارند', () => {
    expect(NOTES[4].amount).toBe(1_600_000);
    expect(NODES['note-open-4'].lines[0].text).toContain('یک میلیون و ششصد هزار');
    expect(EN_LINES['note-open-4'][0]).toContain('one million six hundred thousand');
    expect(NODES['shop-intro-work'].lines[0].text).toContain('تراکتور');
    expect(NODES['shop-intro-estate'].lines[0].text).toContain('زمین همسایه');
  });

  it('صف تریگرها، باز شدن خودکار مغازه پس از معرفی، انزوای بازپخش کارگردان و خودترمیمی پرولوگ درست کار می‌کنند', () => {
    S.xp = 4000;
    expect(storyCtx().level).toBeGreaterThan(1);

    maybeStartPrologue();
    const p1 = pendingNode()!;
    advanceNode(p1); // وسط پرولوگ قبل از p7
    expect(S.story.prologueSeen).toBe(false);
    S.story.pending = null;
    maybeStartPrologue();
    expect(S.story.pending).toBe('p1');
    skipActiveCutscene();
    expect(S.story.prologueSeen).toBe(true);
    expect(S.debt).not.toBeNull();

    // حفظ کات‌سین دیده‌نشده در صف هنگام اجرای صحنهٔ فوری فصل
    triggerCutscene('quest-done-q1');
    triggerCutscene('ch1-outro', { forceReplay: true });
    skipActiveCutscene();
    expect(S.story.pending).toBe('quest-done-q1');
    skipActiveCutscene();

    // بازپخش گالری کارگردان نباید صف بازی واقعی یا پرچم‌های seen را آلوده کند
    triggerCutscene('area-intro-river', { forceReplay: true, director: true });
    triggerCutscene('area-intro-apiary', { forceReplay: true, director: true });
    skipActiveCutscene();
    expect(S.story.pending).toBeNull();
    expect(S.story.seen['area-intro-river']).toBeUndefined();

    // باز شدن خودکار پنجرهٔ مغازه بلافاصله پس از کات‌سین معرفی
    expect(triggerShopIntro('seed')).toBe(true);
    expect(UI.modal).toBeNull();
    skipActiveCutscene();
    expect(UI.modal).toBe('shop');
    expect(UI.activeShop).toBe('seed');
  });

  it('صداقت ریاضی «فروش همه»، بستهٔ ۵تایی بذر، حفاظت بچه‌ماهی و حفاظت انبار پر برقرار است', () => {
    S.inv = { wheat: 30, egg: 10, fingerling: 4 };
    const promised = saleValue('wheat', 30) + saleValue('egg', 10);
    const received = sellAll();
    expect(received).toBe(promised);
    expect(S.inv.fingerling).toBe(4);

    S.xp = 2_000_000;
    S.seeds = {};
    const pack5 = seedPackPrice('pistachio', 5);
    expect(pack5).toBeGreaterThan(5 * 1150);
    S.coins = pack5;
    buySeed('pistachio', 5);
    expect(S.seeds.pistachio).toBe(5);
    expect(S.coins).toBe(0);

    // صید استخر با کولهٔ پر (سیستم حمل بازیکن) نباید ماهی‌های استخر را نابود کند
    S.ponds = [{ id: 1, stocked: true, grow: 10, feed: 4 }];
    S.pack = { wheat: packCap() };
    S.inv = {};
    expect(harvestPond(0, false)).toBe(0);
    expect(S.ponds[0].stocked).toBe(true);

    // ریختن بچه‌ماهی موجود در انبار بدون نیاز به سکه
    S.inv = { fingerling: 1 };
    S.coins = 0;
    S.ponds = [{ id: 1, stocked: false, grow: 0, feed: 0 }];
    stockPond(0);
    expect(S.ponds[0].stocked).toBe(true);
  });

  it('هیچ اعلانی رقم انگلیسی ندارد، کوئست‌ها با امکانات بازشده سازگارند و پایان‌بازی کاملاً تمیز است', () => {
    S.xp = 0;
    S.coins = 0;
    UI.toasts = [];
    buyRod();
    expect(UI.toasts[0].text).not.toMatch(/[0-9]/);

    S.xp = 900_000;
    S.coins = 9_000_000;
    buyMachine('tractor');
    expect(S.builds[0].label).not.toMatch(/[0-9]/);

    startDebt(0);
    UI.toasts = [];
    buyScarecrow();
    expect(UI.toasts[0].text).not.toMatch(/[0-9]/);

    S.hives = 2;
    S.honeyAcc = 8;
    S.inv = {};
    UI.toasts = [];
    harvestHoney(false);
    expect(UI.toasts[0].text).not.toMatch(/[0-9]/);

    // روز ۲۲ = آغاز زمستان -> شب یلدا
    S.day = 22;
    processSeasonalEvent(3);
    expect(S.event?.id).toBe('yalda');

    // هدف اختصاصی هر ۶ کوئست اصلی
    for (let i = 1; i <= 6; i++) {
      const k = objectiveKeyFor(`quest-done-q${i}`);
      expect(k).toBe(`q${i}done`);
      expect(OBJECTIVES.fa[k]).toBeTruthy();
      expect(OBJECTIVES.en[k]).toBeTruthy();
    }

    // هدیهٔ بذر تابستان مادربزرگ با نام «ذرت»
    resetGame();
    UI.started = true;
    S.day = 8;
    S.hour = 23.5;
    S.coins = 0;
    S.seeds = {};
    S.inv = {};
    UI.toasts = [];
    advance(1);
    expect(S.seeds.corn).toBe(3);
    expect(UI.toasts.some((t) => t.text.includes('ذرت'))).toBe(true);

    // کوئست روزانه در ابتدای بازی هرگز کندو/استخر/ماهیگیری قفل‌شده نمی‌خواهد
    resetGame();
    UI.started = true;
    for (let d = 1; d <= 30; d++) {
      S.day = d;
      ensureQuests(true);
      for (const g of S.quests.daily) {
        expect(['honey', 'pond', 'fish']).not.toContain(g.kind);
      }
    }

    // پایان‌بازی و پشتیبان سِیو
    startDebt(5);
    S.story.chapter = 6;
    S.story.questDone = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true };
    S.coins = 5_000_000;
    payDebt(NOTES[5].amount);
    expect(S.story.postgame).toBe(true);
    expect(renderToString(React.createElement(Hud))).toContain('مزرعه آزاد است');
    UI.modal = 'ledger';
    expect(renderToString(React.createElement(Modals))).toContain('هر شش سند مزرعه کاملاً تسویه شد!');

    const json = exportSaveJson();
    resetGame();
    expect(importSaveJson(json)).toBe(true);
    S.coins = 7;
    expect(restoreBackupSlot(1)).toBe(true);
    expect(S.coins).toBeGreaterThan(100_000);
  });
});
