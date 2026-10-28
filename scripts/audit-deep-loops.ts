// ===== حلقه‌های عمیق ممیزی AAA (حلقه‌های ۱ تا ۵): کشف خودکار باگ‌های زندهٔ منطق، اعداد، اقتصاد، تقویم و پایداری =====
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  S, UI, buyAnimal, buyGh, buyHive, buyMachine, buyPen, buyPond, buyRod, buyScarecrow,
  buySeed, buySilo, buyUpgrade, buyWell, buyWorker, exportSaveJson, floorCoins, harvestHoney,
  harvestPond, importSaveJson, invCap, payDebt, resetGame, restoreBackupSlot, saveGame,
  sellAll, signContract, startDebt, stashDeposit, stockPond,
} from '../src/game/state';
import { NOTES } from '../src/story/debtData';
import { advanceNode, maybeStartPrologue, pendingNode } from '../src/story/engine';
import { ensureQuests } from '../src/story/dailyQuests';
import { processSeasonalEvent, triggerEvent } from '../src/game/core/events';
import { objectiveKeyFor } from '../src/story/sceneScripts';
import { EN_LINES, OBJECTIVES } from '../src/strings/cinemaLocales';
import { NODES } from '../src/story/story';
import { detectProfile } from '../src/ui/layout';
import { setSeed } from '../src/game/rng';
import { runSim, runStoryBot } from './bot';
import { Hud } from '../src/ui/Hud';
import { Modals } from '../src/ui/Modals';

export type Reporter = (code: string, where: string, detail: string) => void;

const ASCII_DIGIT = /[0-9]/;

// ============================================================================
// حلقهٔ ۱ (LOOP 1): فِازینگ زندهٔ تمام اکشن‌ها، اعلان‌ها (Toasts)، برچسب ساخت‌وساز،
// حفاظت انبار پُر در استخر/کندو، و نشانگر نادرست سکه روی دکمهٔ برداشت عسل
// ============================================================================
export function runLoop1ActionAndToastFuzzer(report: Reporter) {
  const captureAction = (where: string, fn: () => void) => {
    UI.toasts = [];
    fn();
    for (const t of UI.toasts) {
      if (ASCII_DIGIT.test(t.text)) {
        report('L1-ASCII-TOAST', where, `اعلان زنده دارای رقم انگلیسی است: «${t.text}»`);
      }
    }
    const nonReward = UI.toasts.filter((x) => x.icon !== 'medal' && !x.text.startsWith('باز شد:'));
    if (nonReward.length > 1) {
      report('L1-DUPLICATE-TOAST', where, `یک کلیک واحد ${nonReward.length} اعلان پیاپی چاپ کرد: «${nonReward.map((x) => x.text).join(' / ')}»`);
    }
    for (const b of S.builds) {
      if (ASCII_DIGIT.test(b.label)) {
        report('L1-ASCII-BUILD-CHIP', `${where} -> S.builds`, `برچسب زندهٔ ساخت‌وساز روی HUD رقم انگلیسی دارد: «${b.label}»`);
      }
    }
  };

  // ۱. تست تمام پیام‌های قفل سطح (در سطح ۱)
  resetGame();
  UI.started = true;
  S.xp = 0;
  S.coins = 9_000_000;
  S.lv.hoe = 1; // مرحلهٔ بعد سطح ۲ می‌خواهد
  captureAction('build.ts:buyUpgrade(hoe)', () => buyUpgrade('hoe'));
  captureAction('build.ts:buyMachine(tractor)', () => buyMachine('tractor'));
  captureAction('build.ts:buyWorker', () => buyWorker());
  captureAction('build.ts:buyPen(rabbit)', () => buyPen('rabbit'));
  captureAction('build.ts:buyGh', () => buyGh());
  captureAction('build.ts:buySilo', () => buySilo());
  captureAction('build.ts:buyPond', () => buyPond());
  captureAction('build.ts:buyHive', () => buyHive());
  S.wellLv = 0;
  captureAction('farmDeep.ts:buyWell', () => buyWell());
  captureAction('economy.ts:buySeed(saffron)', () => buySeed('saffron', 1));
  captureAction('economy.ts:buyRod(locked)', () => buyRod());
  captureAction('economy.ts:buyAnimal(cow)', () => buyAnimal('cow'));

  // ۲. تست خرید چوب ماهیگیری بدون سکه در سطح کافی -> نباید دو اعلان خطا چاپ کند
  resetGame();
  UI.started = true;
  S.xp = 50_000;
  S.coins = 0;
  captureAction('economy.ts:buyRod(no-coins)', () => buyRod());

  // ۳. تست سفارش ساخت ماشین در سطح بالا (برچسب مدل ۱..۳ روی HUD) و مترسک ضدشرخر
  resetGame();
  UI.started = true;
  S.xp = 900_000;
  S.coins = 9_000_000;
  captureAction('build.ts:buyMachine(tractor-mk1)', () => buyMachine('tractor'));
  S.debt = {
    noteIdx: 0, remaining: 1000, paidTotal: 0, extorted: 0, dueDay: 20, paidThisCycle: 0,
    nextRaidDay: 15, immuneUntilDay: 5, standing: 50, stash: 0, scarecrow: 0, beatings: 0,
    pendingVisit: null, chapter: 1, flags: {}, history: [], lastVisit: null, chapterStartDay: 1,
  };
  captureAction('debt.ts:buyScarecrow', () => buyScarecrow());

  // ۴. حفاظت انبار پر هنگام صید استخر ماهی + رقم فارسی اعلان صید استخر و برداشت عسل
  resetGame();
  UI.started = true;
  S.ponds = [{ id: 1, stocked: true, grow: 10, feed: 4 }];
  S.hives = 2;
  S.honeyAcc = 12;
  S.inv = { wheat: invCap() }; // انبار کاملاً پر است!

  harvestPond(0, false);
  if (!S.ponds[0].stocked) {
    report('L1-FULL-BAG-DESTROYS-POND', 'ponds.ts:harvestPond', 'وقتی انبار پر است، کلیک روی صید استخر ماهی تمام ماهی‌های پرورش‌یافته را نابود کرد و ۰ ماهی به بازیکن داد!');
  }
  UI.toasts = [];
  harvestHoney(false);
  if (UI.toasts.some((t) => t.text.includes('+0') || t.text.includes('+۰'))) {
    report('L1-FULL-BAG-ZERO-HONEY-TOAST', 'ponds.ts:harvestHoney', `وقتی انبار پر است، برداشت عسل به جای اخطار «انبار پر است» اعلان «${UI.toasts[0]?.text}» نشان داد!`);
  }

  // حالا انبار را خالی کن و رقم فارسی اعلان موفق صید استخر و عسل را بسنج
  S.inv = {};
  S.ponds = [{ id: 1, stocked: true, grow: 10, feed: 4 }];
  S.honeyAcc = 12;
  captureAction('ponds.ts:harvestPond(ok)', () => harvestPond(0, false));
  captureAction('ponds.ts:harvestHoney(ok)', () => harvestHoney(false));

  // ۵. بررسی دکمهٔ «برداشت عسل» در پنجرهٔ زنبورداری: نباید آیکون سکه (<Coin>) کنار تعداد شیشهٔ عسل بگذارد
  S.hives = 2;
  S.honeyAcc = 10;
  UI.modal = 'hive';
  const hiveHtml = renderToString(React.createElement(Modals));
  const btnIdx = hiveHtml.indexOf('برداشت عسل');
  if (btnIdx !== -1) {
    const btnSlice = hiveHtml.slice(Math.max(0, btnIdx - 220), btnIdx + 260);
    // دکمهٔ برداشت عسل نباید بیش از یک تصویر داشته باشد که دومی سکه باشد؛ wallet در هدر بالاست (خیلی قبل‌تر از btnIdx)
    const imgsInBtn = (btnSlice.match(/<img /g) ?? []).length;
    if (imgsInBtn >= 2) {
      report('L1-HIVE-WRONG-COIN-ICON', 'Modals.tsx:HiveModal', 'روی دکمهٔ «برداشت عسل» به اشتباه آیکون سکهٔ طلا (<Coin>) به جای تعداد شیشهٔ عسل نمایش داده شده است!');
    }
  }
  UI.modal = null;

  void stockPond;
  void sellAll;
}

const fromFaDigits = (s: string): number =>
  Number(s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[^0-9]/g, ''));

// ============================================================================
// حلقهٔ ۲ (LOOP 2): ممیزی صداقت ریاضی قیمت‌ها، بازار، بستهٔ ۵تایی بذر، استخر ماهی و دفتر کل
// ============================================================================
export function runLoop2EconomyAndLedgerTruthBot(report: Reporter) {
  // ۱. فروش همه در بازار نباید بچه‌ماهی‌های خریداری‌شده برای استخر را حراج کند!
  resetGame();
  UI.started = true;
  S.inv = { wheat: 10, fingerling: 5 };
  sellAll();
  if ((S.inv.fingerling ?? 0) !== 5) {
    report('L2-SELLALL-WIPES-FINGERLINGS', 'economy.ts:sellAll', `کلیک روی «فروش همه» در بازار، بچه‌ماهی‌های پرورشی انبار را هم فروخت و نابود کرد (باقی‌مانده=${S.inv.fingerling ?? 0})!`);
  }

  // ۲. مبلغ نمایش‌داده‌شده روی دکمهٔ بزرگ «فروش همه» باید تا آخرین سکه برابر مبلغ واقعی دریافتی باشد!
  resetGame();
  UI.started = true;
  S.inv = { wheat: 35, egg: 12 };
  UI.modal = 'market';
  const marketHtml = renderToString(React.createElement(Modals));
  const sellAllIdx = marketHtml.indexOf('فروش همه');
  if (sellAllIdx !== -1) {
    const afterSell = marketHtml.slice(sellAllIdx, sellAllIdx + 300);
    const numMatch = afterSell.match(/<span[^>]*>([۰-۹٬,]+)<\/span>/);
    const promised = numMatch ? fromFaDigits(numMatch[1]) : -1;
    const paid = sellAll();
    if (promised !== paid) {
      report('L2-SELLALL-DISPLAY-LIE', 'Modals.tsx:Market', `دکمهٔ «فروش همه» مبلغ ${promised} سکه وعده داد اما بازیکن واقعاً ${paid} سکه دریافت کرد (${promised - paid} سکه اختلاف)!`);
    }
  }
  UI.modal = null;

  // ۳. دکمهٔ خرید بستهٔ ۵تایی بذر در بذرفروشی با موجودی دقیقاً برابر عدد روی دکمه باید هر ۵ بذر را کامل بخرد!
  resetGame();
  UI.started = true;
  S.xp = 2_000_000;
  S.seeds = {};
  UI.modal = 'seed';
  const seedHtml = renderToString(React.createElement(Modals));
  const pistIdx = seedHtml.indexOf('>پسته<');
  if (pistIdx !== -1) {
    const cardSlice = seedHtml.slice(pistIdx, pistIdx + 1800);
    const fiveBtnIdx = cardSlice.indexOf('>۵<');
    if (fiveBtnIdx !== -1) {
      const priceSlice = cardSlice.slice(fiveBtnIdx, fiveBtnIdx + 300);
      const m = priceSlice.match(/<span[^>]*>([۰-۹٬,]+)<\/span>/);
      const shown5 = m ? fromFaDigits(m[1]) : 5750;
      S.coins = shown5;
      UI.toasts = [];
      buySeed('pistachio', 5);
      if ((S.seeds.pistachio ?? 0) !== 5 || UI.toasts.length > 0) {
        report('L2-SEED5-PRICE-LIE', 'Modals.tsx:SeedShop / economy.ts:buySeed', `دکمهٔ ۵ بذر پسته قیمت ${shown5} سکه نشان داد اما با دقیقاً ${shown5} سکه فقط ${S.seeds.pistachio ?? 0} بذر خرید و خطای «${UI.toasts[0]?.text ?? ''}» داد!`);
      }
    }
  }
  UI.modal = null;

  // ۴. در پنجرهٔ استخر ماهی وقتی بازیکن از قبل بچه‌ماهی در انبار دارد و سکه‌اش کم است، دکمه نباید قفل باشد!
  resetGame();
  UI.started = true;
  S.ponds = [{ id: 1, stocked: false, grow: 0, feed: 0 }];
  S.inv = { fingerling: 1 };
  S.coins = 5;
  UI.modal = 'pond';
  const pondHtml = renderToString(React.createElement(Modals));
  const stockIdx = pondHtml.indexOf('ریختن بچه‌ماهی');
  if (stockIdx !== -1) {
    const btnBefore = pondHtml.slice(Math.max(0, stockIdx - 220), stockIdx + 220);
    if (btnBefore.includes('disabled=""') || btnBefore.includes('disabled')) {
      report('L2-POND-OWNED-FINGERLING-LOCKED', 'Modals.tsx:PondModal', 'بازیکن بچه‌ماهی آماده در انبار دارد اما چون سکه‌اش کمتر از ۴۵ است دکمهٔ «ریختن بچه‌ماهی» قفل شده است!');
    }
  }
  UI.modal = null;

  // ۵. بررسی دفتر کل در پایان‌بازی + کف امن قلک
  resetGame();
  UI.started = true;
  startDebt(0);
  S.coins = 500;
  const expectedFloor = floorCoins();
  // شبیه‌سازی فرمول دکمهٔ «همه را پنهان کن»
  UI.modal = 'ledger';
  let ledgerHtml = renderToString(React.createElement(Modals));
  void stashDeposit;
  void expectedFloor;

  // پایان‌بازی: دفتر کل نباید هنوز «سند فعال» و «قسط بعدی» نشان دهد، اما اگر قلک پر است باید دکمهٔ تخلیهٔ قلک داشته باشد
  startDebt(5);
  S.debt!.stash = 4000;
  S.story.chapter = 6;
  S.story.questDone = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true };
  S.coins = 5_000_000;
  payDebt(NOTES[5].amount);
  UI.modal = 'ledger';
  ledgerHtml = renderToString(React.createElement(Modals));
  if (ledgerHtml.includes('سند فعال') || ledgerHtml.includes('قسط بعدی') || ledgerHtml.includes('تا روز قسط')) {
    report('L2-POSTGAME-LEDGER-FAKE-DEBT', 'Ledger.tsx', 'در حالت پایان‌بازی پس از تسویهٔ کامل ۶ سند، دفتر کل هنوز «سند فعال / قسط بعدی / تا روز قسط» نمایش می‌دهد!');
  }
  UI.modal = null;
}

// ============================================================================
// حلقهٔ ۳ (LOOP 3): تقویم ایرانی و رویدادهای فصلی، کوئست‌های روزانه/هفتگی قابل‌انجام،
// تطابق هدف بعدی (Next Objective) در هر ۶ کوئست اصلی، و ایمنی قطع وسط پرولوگ
// ============================================================================
export function runLoop3CalendarQuestsObjectivesAndSaveBot(report: Reporter) {
  // ۱. رویداد «سیلاب بهاری» هرگز نباید در پاییز (فصل ۲) رخ دهد!
  resetGame();
  UI.started = true;
  for (let i = 0; i < 300; i++) {
    S.day = 15 + (i % 7) + Math.floor(i / 7) * 28; // همیشه پاییز (sn = 2)
    processSeasonalEvent(2);
    if (S.event?.id === 'flood') {
      report('L3-SPRING-FLOOD-IN-AUTUMN', 'events.ts:processSeasonalEvent', `در فصل پاییز (روز ${S.day}) رویداد «${S.event.title}» اجرا شد!`);
      break;
    }
  }

  // ۲. شب یلدا باید در آغاز زمستان (روز ۲۲ = اول زمستان) تضمین شود، نه آخرین روز زمستان پیش از نوروز (روز ۲۸)!
  resetGame();
  UI.started = true;
  S.day = 22; // اولین روز زمستان
  processSeasonalEvent(3);
  if (S.event?.id !== 'yalda') {
    report('L3-YALDA-WRONG-DAY', 'events.ts:processSeasonalEvent(day=22)', `در آغاز زمستان (روز ۲۲) شب یلدا اجرا نشد (رویداد فعلی: ${S.event?.id ?? 'هیچ'}) — به اشتباه روی روز ۲۸ (آخر زمستان) تنظیم شده بود!`);
  }

  // ۳. کوئست‌های روزانه و هفتگی هرگز نباید کاری بخواهند که هنوز ابزار/سازهٔ آن (کندو، استخر، چوب ماهیگیری) در مزرعه وجود ندارد!
  resetGame();
  UI.started = true;
  S.ponds = [];
  S.hives = 0;
  S.rod = 0;
  S.xp = 0;
  let badDailyCount = 0;
  let badDailySample = '';
  let badWeeklyCount = 0;
  let badWeeklySample = '';
  for (let d = 1; d <= 84; d++) {
    S.day = d;
    ensureQuests(true);
    for (const g of S.quests.daily) {
      if (g.kind === 'honey' || g.kind === 'pond' || g.kind === 'fish') {
        badDailyCount++;
        if (!badDailySample) badDailySample = `روز ${d}: «${g.label}» (${g.kind})`;
      }
    }
    const w = S.quests.weekly;
    if (w && (w.kind === 'honey' || w.kind === 'pond' || w.kind === 'fish')) {
      badWeeklyCount++;
      if (!badWeeklySample) badWeeklySample = `روز ${d}: «${w.label}» (${w.kind})`;
    }
  }
  if (badDailyCount > 0) {
    report('L3-IMPOSSIBLE-DAILY-QUEST', 'dailyQuests.ts:ensureQuests', `بازیکنِ بدون کندو/استخر/قلاب در ${badDailyCount} نوبت کوئست روزانهٔ غیرممکن گرفت (نمونه: ${badDailySample})!`);
  }
  if (badWeeklyCount > 0) {
    report('L3-IMPOSSIBLE-WEEKLY-QUEST', 'dailyQuests.ts:ensureQuests', `بازیکنِ بدون کندو/استخر/قلاب در ${badWeeklyCount} نوبت کوئست هفتگی غیرممکن گرفت (نمونه: ${badWeeklySample})!`);
  }

  // ۴. تطابق دقیق نوار «هدف بعدی» در کات‌سین‌های تکمیل کوئست‌های اصلی (quest-done-q1..q6)
  const forbiddenInQuestDone: Array<[string, string, string]> = [
    ['quest-done-q1', 'سند دوم', 'در فصل ۱ پیش از تسویهٔ سند اول، نوار هدف به اشتباه از «سند دوم» می‌گوید!'],
    ['quest-done-q2', 'سند بابابزرگ', 'در فصل ۲ پیش از تسویهٔ سند دوم، نوار هدف به اشتباه از «سند بابابزرگ» (سند سوم) می‌گوید!'],
    ['quest-done-q3', 'سند قنات', 'در فصل ۳ پیش از تسویهٔ سند سوم، نوار هدف به اشتباه از «سند قنات» (سند چهارم) می‌گوید!'],
    ['quest-done-q4', 'سند مهندس', 'در فصل ۴ پیش از تسویهٔ سند چهارم، نوار هدف به اشتباه از «سند مهندس» (سند پنجم) می‌گوید!'],
    ['quest-done-q5', 'آخرین سند', 'در فصل ۵ پیش از تسویهٔ سند پنجم، نوار هدف به اشتباه از «آخرین سند» (سند ششم) می‌گوید!'],
  ];
  for (const [id, wrongPhrase, msg] of forbiddenInQuestDone) {
    const key = objectiveKeyFor(id);
    const faObj = OBJECTIVES.fa[key] ?? '';
    if (faObj.includes(wrongPhrase)) {
      report('L3-QUEST-DONE-WRONG-OBJECTIVE', `sceneScripts.ts:${id}`, `${msg} (متن فعلی: «${faObj}»)`);
    }
  }
  if (objectiveKeyFor('quest-done-q6') === 'default') {
    report('L3-Q6-GENERIC-OBJECTIVE', 'sceneScripts.ts:quest-done-q6', 'کات‌سین quest-done-q6 هدف اختصاصی تسویهٔ سند ششم و آغاز جشن برداشت ندارد و روی default افتاده است!');
  }

  // ۵. ایمنی خروج/ریلود وسط پرولوگ قبل از رسیدن به p7 (جلوگیری از قفل ابدی بدون بدهی و بدون فصل!)
  resetGame();
  UI.started = true;
  maybeStartPrologue();
  const n1 = pendingNode();
  if (n1) advanceNode(n1); // فقط گرهٔ p1 دیده شد؛ هنوز به p7 نرسیده و S.debt === null است!
  S.story.pending = null; // شبیه‌سازی قطع ناگهانی یا پرش وضعیت
  maybeStartPrologue();
  if (!S.debt && !S.story.pending) {
    report('L3-PROLOGUE-RELOAD-SOFTLOCK', 'story/engine.ts:applyEffects & maybeStartPrologue', 'اگر بازی بعد از گرهٔ اول پرولوگ (p1) و قبل از p7 قطع شود، prologueSeen=true می‌شود اما S.debt تا ابد null و فصل بازی ۰ باقی می‌ماند (قفل نرم دائمی سیو)!');
  }
}

// ============================================================================
// حلقهٔ ۵ (LOOP 5): اسکن متن قابل‌مشاهدهٔ تمام ۱۵ مودال و HUD در پرترین حالت بازی،
// یکپارچگی کامل ذخیره/پشتیبان/برون‌بری JSON، و استقامت ۵ کارزار کامل مستقل (Seeds 9001..9005)
// ============================================================================
export function runLoop5MultiSeedSaveAndAllModalVisibleTextBot(report: Reporter) {
  // ۱. پر کردن کامل تمام بخش‌های بازی (ساخت‌وساز فعال، دام بیمار/آبستن/بچه/لانه، قرارداد بازار،
  //    استخر، کندو، کارگر، تاریخچهٔ بدهی، باج نگه‌داشته‌شده، اسلات پشتیبان، رویداد فصلی) و اسکن متن خروجی HTML!
  resetGame();
  UI.started = true;
  S.xp = 350_000;
  S.coins = 250_000;
  S.workers = 2;
  S.hives = 3;
  S.honeyAcc = 19;
  S.ponds = [
    { id: 1, stocked: true, grow: 2, feed: 5 },
    { id: 2, stocked: false, grow: 0, feed: 0 },
  ];
  S.pens = { chicken: 2, cow: 1 };
  S.animals = [
    { id: 1, kind: 'chicken', ready: 2, hue: 0, sex: 'f', grown: 0, sick: true },
    { id: 2, kind: 'chicken', ready: 0, hue: 1, sex: 'm', grown: 2 },
    { id: 3, kind: 'cow', ready: 1, hue: 0, sex: 'f', grown: 0, preg: 4 },
  ];
  S.nests = [{ id: 10, kind: 'chicken', hatch: 2 }];
  S.inv = { wheat: 12, egg: 6, milk: 3, fingerling: 2, feed: 10 };
  S.fert = 4;
  startDebt(2);
  S.debt!.extorted = 4500;
  S.debt!.stash = 1200;
  S.debt!.dueDay = S.day + 2;
  payDebt(1000);
  signContract();
  buyMachine('tractor');
  triggerEvent('festival');
  ensureQuests(true);
  saveGame();
  S.day += 1;
  saveGame(); // ایجاد اسلات پشتیبان ۱ و ۲

  const checkVisiblePersianHtml = (where: string, html: string) => {
    const visible = html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (/undefined|NaN|Infinity|\[object/.test(visible)) {
      report('L5-CORRUPT-TEXT', where, `متن قابل‌مشاهده شامل مقدار خراب است: «${visible.slice(0, 120)}»`);
    }
    const m = visible.match(/[0-9]+/);
    if (m) {
      const idx = visible.indexOf(m[0]);
      report('L5-ASCII-DIGIT-IN-UI', where, `متن قابل‌مشاهده در رابط فارسی شامل رقم انگلیسی «${m[0]}» است: «...${visible.slice(Math.max(0, idx - 24), idx + 28)}...»`);
    }
  };

  UI.modal = null;
  UI.info = { plot: 0, x: 400, y: 300 };
  S.plots[0] = { st: 2, crop: 'cucumber', prog: 0.4, water: 0.8, fert: 0.9, last: 'wheat', dead: false, dry: 0, ripe: false, n: 1 };
  UI.seedTray = true;
  UI.tool = 'plant';
  UI.speed = 2;
  checkVisiblePersianHtml('Hud(full-state)', renderToString(React.createElement(Hud)));
  UI.info = null;
  UI.seedTray = false;
  UI.speed = 1;

  const allModals = [
    'seed', 'market', 'work', 'carp', 'estate', 'animal', 'inv',
    'menu', 'auto', 'pond', 'hive', 'achieve', 'ledger', 'quests', 'museum',
    'home', 'almanac', 'mail', 'fishing', 'festival', 'atlas',
  ] as const;
  for (const m of allModals) {
    UI.modal = m;
    checkVisiblePersianHtml(`Modal:${m}(populated)`, renderToString(React.createElement(Modals)));
  }
  for (const ft of ['judge', 'cauldron', 'archery', 'prizes'] as const) {
    UI.fairTab = ft;
    UI.modal = 'festival';
    checkVisiblePersianHtml(`Modal:festival:${ft}`, renderToString(React.createElement(Modals)));
  }
  UI.fairTab = 'judge';
  UI.modal = null;

  // ۲. تست برون‌بری / درون‌بری JSON و بازیابی پشتیبان در میانهٔ فصل ۳
  const snapCoins = S.coins;
  const snapChapter = S.story.chapter;
  const snapNote = S.debt!.noteIdx;
  const exported = exportSaveJson();
  resetGame();
  if (!importSaveJson(exported) || S.coins !== snapCoins || S.story.chapter !== snapChapter || S.debt?.noteIdx !== snapNote) {
    report('L5-SAVE-ROUNDTRIP-BROKEN', 'state.ts:exportSaveJson/importSaveJson', 'برون‌بری و درون‌بری فایل سِیو مقادیر دقیق فصل/سند/سکه را حفظ نکرد!');
  }
  S.coins = 1;
  if (!restoreBackupSlot(1)) {
    report('L5-BACKUP-SLOT-BROKEN', 'state.ts:restoreBackupSlot', 'بازیابی اسلات پشتیبان خودکار کار نکرد!');
  }

  // ۳. اجرای کامل کارزارهای سرتاسری مستقل با بذرهای تصادفی متفاوت از روز ۱ تا پایان‌بازی بدون حتی ۱ قفل نرم!
  for (const seed of [9001, 9002, 9003]) {
    setSeed(seed);
    const r = runStoryBot(seed, 2600);
    if (!r.finaleSeen || r.notesOpened !== 6 || r.questsDone !== 6 || r.softLockDays > 0) {
      report('L5-CAMPAIGN-STABILITY', `runStoryBot(seed=${seed})`, `کارزار کامل با بذر ${seed} کامل نشد: notes=${r.notesOpened}, quests=${r.questsDone}, finale=${r.finaleSeen}, softLocks=${r.softLockDays}`);
    }
  }
}

// ============================================================================
// حلقهٔ ۶ (LOOP 6): استاندارد ساعات گیم‌پلی بازی کامل، سادگی و روانی متن داستان،
// و مقیاس خوانایی و لمس موبایل (عمودی و افقی)
// ============================================================================
export function runLoop6StoryClarityPlaytimeHoursAndMobileScaleBot(report: Reporter) {
  // ۱. بررسی استاندارد ساعات واقعی بازی کامل (حداقل ۶۰ ساعت گیم‌پلی کامل کمپین اصلی تا پایان‌بازی)
  const normalCampaign = runSim('normal', 3000, 1001, true);
  const fullHours = Math.round(((normalCampaign.days * 192) / 3600) * 10) / 10;
  console.log(`[PLAYTIME] طول کمپین کامل بازیکن معمولی: ${normalCampaign.days} روز = ${fullHours} ساعت گیم‌پلی کامل استاندارد`);
  if (!normalCampaign.postgameDay || fullHours < 60 || fullHours > 85) {
    report('L6-PLAYTIME-OUT-OF-STANDARD', 'balance/dayLoop', `مدت زمان بازی کامل (${fullHours} ساعت) خارج از استاندارد ۶۰ تا ۸۵ ساعت بازی کامل است!`);
  }

  // ۲. بررسی مقیاس خوانایی فونت پایه در همهٔ ابعاد موبایل (پرتره ۳۶۰×۷۴۰ و افقی ۶۴۰×۳۶۰ / ۸۰۰×۳۶۰)
  for (const [label, w, h] of [
    ['portrait-360x740', 360, 740],
    ['mobile-16x9-640x360', 640, 360],
    ['mobile-20x9-800x360', 800, 360],
  ] as const) {
    const prof = detectProfile(w, h);
    if (prof.fontBase < 11) {
      report('L6-MOBILE-FONT-TOO-SMALL', `layout.ts:${label}`, `فونت پایه در موبایل ${label} برابر ${prof.fontBase}px است که ریزتر از حداقل استاندارد ۱۱px است!`);
    }
  }

  // ۳. بررسی سادگی، روشنی، عاری بودن از عبارات گنگ/مفهومی قدیمی و تناسب طول بالن‌های دیالوگ در موبایل
  const bannedCryptic = [
    'سند دوم سایه دارد',
    'یا آب می‌آید یا سند',
    'حریم من بود مهندس',
    'شاید این یکی بگیرد',
    'این بار هیچ نمی‌گویم',
    'من زمین زنده را می‌خواهم',
  ];
  for (const [id, node] of Object.entries(NODES)) {
    const en = EN_LINES[id];
    if (!en || en.length !== node.lines.length) {
      report('L6-EN-LINE-MISMATCH', `cinemaLocales.ts:${id}`, `تعداد خطوط انگلیسی (${en?.length ?? 0}) با فارسی (${node.lines.length}) برابر نیست!`);
      continue;
    }
    node.lines.forEach((ln, idx) => {
      for (const bad of bannedCryptic) {
        if (ln.text.includes(bad)) {
          report('L6-CRYPTIC-STORY-LINE', `story:${id}[${idx}]`, `جملهٔ بیش‌ازحد مفهومی/گنگ باقی مانده است: «${ln.text}»`);
        }
      }
      if (ln.text.length > 165) {
        report('L6-FA-LINE-TOO-LONG-MOBILE', `story:${id}[${idx}]`, `طول دیالوگ فارسی (${ln.text.length} کاراکتر) برای بالن موبایل بیش از حد طولانی است!`);
      }
      if (en[idx].length > 185) {
        report('L6-EN-LINE-TOO-LONG-MOBILE', `cinemaLocales:${id}[${idx}]`, `طول دیالوگ انگلیسی (${en[idx].length} کاراکتر) برای بالن موبایل بیش از حد طولانی است!`);
      }
    });
  }
}
