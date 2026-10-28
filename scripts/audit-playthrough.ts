#!/usr/bin/env node
// ===== ربات ممیزی سرتاسری داستان، تریگرها، دیالوگ‌ها و متن‌های رابط کاربری (از روز ۱ تا پایان‌بازی) =====
import React from 'react';
import { renderToString } from 'react-dom/server';
import { installDom } from '../tests/helpers/dom';
import {
  S, UI, advance, resetGame, tickBuilds, visitMuseum, clearToasts } from '../src/game/state';
import { CROPS, GH_PRICE, HIVE_MAX, POND_MAX, SILO_PRICE } from '../src/game/data';
import { NOTES, TOTAL_DEBT } from '../src/story/debtData';
import {
  debt, maybeOpenNextNote, payDebt, processDebtDay, startDebt,
} from '../src/game/core/debt';
import { checkStoryQuests } from '../src/story/quests';
import { NODES, nodeById } from '../src/story/story';
import {
  maybeStartPrologue, skipActiveCutscene, storyCtx,
  talkToSharkhar, talkToTownNpc, triggerAreaIntro, triggerCutscene, triggerShopIntro,
} from '../src/story/engine';
import { compileSceneScript, listAllScenes } from '../src/story/sceneScripts';
import { CHAR_NAMES, CINEMA_UI, EN_LINES, OBJECTIVES } from '../src/strings/cinemaLocales';
import { GT } from '../src/strings/gameText';
import { UT } from '../src/strings/uiText';
import { setSeed } from '../src/game/rng';
import { runStoryBot } from './bot';
import { Hud } from '../src/ui/Hud';
import { Modals } from '../src/ui/Modals';
import {
  runLoop1ActionAndToastFuzzer,
  runLoop2EconomyAndLedgerTruthBot,
  runLoop3CalendarQuestsObjectivesAndSaveBot,
  runLoop5MultiSeedSaveAndAllModalVisibleTextBot,
  runLoop6StoryClarityPlaytimeHoursAndMobileScaleBot,
} from './audit-deep-loops';
import {
  runLoop7CutsceneActionAndSetPieceAudit,
  runLoop8MandatoryUpgradesAndMachinesAudit,
  runLoop9HiddenSecretsAndSaveV6Audit,
  runLoop10AntiSpamAndLocationCoherenceAudit,
  runLoop11AntiGrindAndVarietyAudit,
} from './audit-depth-loops';

installDom();

interface Finding {
  code: string;
  where: string;
  detail: string;
}

const findings: Finding[] = [];
const report = (code: string, where: string, detail: string) => {
  findings.push({ code, where, detail });
};

const ASCII_DIGIT = /[0-9]/;

// ============================================================================
// بخش ۱: ممیزی معنایی، زبانی، عددی و صحنه‌پردازی تمام ۷۹ کات‌سین و جدول‌های متنی
// ============================================================================
function auditStaticTextsAndScenes() {
  const allIds = Object.keys(NODES);
  const listed = listAllScenes();
  if (listed.length !== allIds.length) {
    report('SCENE-COUNT', 'sceneScripts.ts', `تعداد صحنه‌های فهرست کارگردان (${listed.length}) با NODES (${allIds.length}) برابر نیست.`);
  }

  for (const id of allIds) {
    const node = NODES[id];
    const en = EN_LINES[id];
    if (!en) {
      report('EN-MISSING', `cinemaLocales.ts:${id}`, `ترجمهٔ انگلیسی صحنهٔ «${id}» وجود ندارد.`);
    } else if (en.length !== node.lines.length) {
      report('EN-LINE-MISMATCH', `cinemaLocales.ts:${id}`, `تعداد خطوط انگلیسی (${en.length}) با فارسی (${node.lines.length}) برابر نیست.`);
    }

    for (let li = 0; li < node.lines.length; li++) {
      const line = node.lines[li];
      if (ASCII_DIGIT.test(line.text)) {
        report('ASCII-DIGIT-STORY', `story:${id}[${li}]`, `رقم انگلیسی در دیالوگ فارسی: «${line.text}»`);
      }
    }

    const compiled = compileSceneScript(id);
    if (!compiled) {
      report('COMPILE-NULL', `sceneScripts:${id}`, `صحنهٔ «${id}» کامپایل نشد.`);
      continue;
    }
    if (compiled.beats.length !== node.lines.length && !node.next) {
      report('BEAT-COUNT', `sceneScripts:${id}`, `تعداد ضرب‌ها (${compiled.beats.length}) با خطوط گره (${node.lines.length}) نمی‌خواند.`);
    }
    for (const m of compiled.initialMarks) {
      if (m.x < 40 || m.x > 1240 || m.y < 220 || m.y > 700) {
        report('STAGE-OOB', `sceneScripts:${id}`, `مختصات بازیگر ${m.actor} بیرون از کادر مجاز است: (${m.x}, ${m.y})`);
      }
    }
  }

  for (const [k, v] of Object.entries(GT)) {
    if (ASCII_DIGIT.test(v)) report('ASCII-DIGIT-GT', `gameText.${k}`, `رقم انگلیسی در متن بازی: «${v}»`);
  }
  for (const [k, v] of Object.entries(UT)) {
    if (ASCII_DIGIT.test(v)) report('ASCII-DIGIT-UT', `uiText.${k}`, `رقم انگلیسی در متن رابط: «${v}»`);
  }
  for (const [k, v] of Object.entries(OBJECTIVES.fa)) {
    if (ASCII_DIGIT.test(v)) report('ASCII-DIGIT-OBJ', `OBJECTIVES.fa.${k}`, `رقم انگلیسی در هدف بعدی: «${v}»`);
  }
  for (const [k, v] of Object.entries(CINEMA_UI.fa)) {
    if (typeof v === 'string' && ASCII_DIGIT.test(v)) {
      report('ASCII-DIGIT-CINE', `CINEMA_UI.fa.${k}`, `رقم انگلیسی در متن سینمایی: «${v}»`);
    }
  }

  const pairs: Array<[string, string, string]> = [
    ['engineer', UT.u19, CHAR_NAMES.fa.engineer],
    ['grandma', UT.u20, CHAR_NAMES.fa.grandma],
    ['sara', UT.u21, CHAR_NAMES.fa.sara],
    ['rancher', UT.u22, CHAR_NAMES.fa.rancher],
  ];
  for (const [who, uiName, cineName] of pairs) {
    const uClean = uiName.replace(/\s+/g, '');
    const cClean = cineName.replace(/\s+/g, '');
    if (!cClean.includes(uClean) && !uClean.includes(cClean)) {
      report('CHAR-NAME-MISMATCH', `uiText vs cinemaLocales (${who})`, `نام شخصیت دوگانه است: «${uiName}» در برابر «${cineName}»`);
    }
  }

  if (TOTAL_DEBT !== 6_000_000) {
    report('DEBT-SUM', 'debtData.ts', `جمع ۶ سند برابر ${TOTAL_DEBT} است نه ۶٬۰۰۰٬۰۰۰.`);
  }
  const note4Fa = NODES['note-open-4']?.lines[0]?.text ?? '';
  const note4En = EN_LINES['note-open-4']?.[0] ?? '';
  if (NOTES[4].amount === 1_600_000 && (note4Fa.includes('یک‌ونیم میلیون') || note4En.includes('one-and-a-half million'))) {
    report('DEED-AMOUNT-WRONG-TEXT', 'story.ts:note-open-4', `سند پنجم ۱٬۶۰۰٬۰۰۰ سکه است اما در متن «یک‌ونیم میلیون / one-and-a-half million» نوشته شده است!`);
  }

  const workFa = NODES['shop-intro-work']?.lines.map((l) => l.text).join(' ') ?? '';
  if (workFa.includes('بیل') || workFa.includes('آبپاش')) {
    report('SHOP-INTRO-WRONG-CONTENT', 'newTriggers.ts:shop-intro-work', `مغازهٔ «کارگاه» (work) ماشین‌آلات و نیرو می‌فروشد (بیل و آبپاش در نجاری هستند)، اما دیالوگ معرفی به اشتباه از بیل و آبپاش می‌گوید!`);
  }
  const estateFa = NODES['shop-intro-estate']?.lines.map((l) => l.text).join(' ') ?? '';
  if (estateFa.includes('تراکتور') || estateFa.includes('ماشین‌آلات')) {
    report('SHOP-INTRO-WRONG-CONTENT', 'newTriggers.ts:shop-intro-estate', `«دفتر املاک و کارگزینی» (estate) زمین و کارگر می‌فروشد (تراکتور در کارگاه است)، اما دیالوگ معرفی به اشتباه از تراکتور و ماشین‌آلات می‌گوید!`);
  }

  const grandma0 = NODES['town-grandma-0']?.lines[0]?.text ?? '';
  if (grandma0.includes('صبح‌به‌خیر') || grandma0.includes('بهار')) {
    report('WRONG-TIME-SEASON-NPC', 'townNpc.ts:town-grandma-0', `دیالوگ عمومی مادربزرگ در شهر در شب و زمستان هم «صبح‌به‌خیر ... بهار» می‌گوید!`);
  }
  const springDawn = NODES['season-dawn-spring']?.lines.map((l) => l.text).join(' ') ?? '';
  if (springDawn.includes('سندها را صاف')) {
    report('POSTGAME-WRONG-DAWN-TEXT', 'newTriggers.ts:season-dawn-spring', `دیالوگ طلوع بهار حتی پس از تسویهٔ کامل بازی در سال‌های پایان‌بازی همچنان از بدهکار بودن و صاف‌کردن سندها حرف می‌زند!`);
  }
}

// ============================================================================
// بخش ۲: ممیزی صف تریگرها، باز شدن مغازه پس از معرفی، سطح بازیکن و سپر زمستانی
// ============================================================================
function auditTriggersAndMechanics() {
  resetGame();
  UI.started = true;
  S.xp = 5000;
  const ctx = storyCtx();
  if (ctx.level <= 1) {
    report('STORYCTX-HARDCODED-LEVEL', 'story/engine.ts:storyCtx', `مقدار storyCtx().level همواره ۱ هاردکد شده است.`);
  }

  resetGame();
  UI.started = true;
  maybeStartPrologue();
  skipActiveCutscene();
  triggerCutscene('quest-done-q1');
  triggerCutscene('ch1-outro', { forceReplay: true });
  skipActiveCutscene();
  if (!S.story.seen['quest-done-q1'] && S.story.pending !== 'quest-done-q1') {
    report('TRIGGER-QUEUE-WIPED', 'story/engine.ts:triggerCutscene', `فراخوانی همزمان کات‌سین با forceReplay کات‌سین دیده‌نشدهٔ قبلی (quest-done-q1) را کاملاً پاک و نابود کرد!`);
  }

  resetGame();
  UI.started = true;
  maybeStartPrologue();
  skipActiveCutscene();
  const triggered = triggerShopIntro('seed');
  const queuedModal = (UI as unknown as { afterModal?: string | null }).afterModal ?? UI.modal;
  if (triggered && queuedModal !== 'seed') {
    report('SHOP-MODAL-SWALLOWED', 'story/engine.ts:triggerShopIntro', `در اولین کلیک روی مغازه، کات‌سین معرفی اجرا می‌شود اما پنجرهٔ مغازه (seed) پس از پایان صحنه باز نمی‌شود!`);
  }

  for (const [sn, daySample] of [[0, 2], [1, 9], [2, 16], [3, 23]] as const) {
    resetGame();
    UI.started = true;
    S.day = daySample - 1;
    S.hour = 23.5;
    S.coins = 0;
    S.seeds = {};
    S.inv = {};
    S.gh = 0;
    for (const p of S.plots) { p.st = 0; p.crop = null; p.dead = false; p.ripe = false; }
    clearToasts();
    advance(1);
    const giftedCrop = Object.entries(S.seeds).find(([, v]) => (v ?? 0) > 0)?.[0];
    const cropDef = CROPS.find((c) => c.id === giftedCrop);
    if (!cropDef || !cropDef.seasons.includes(sn)) {
      report('WINTER-SOFTLOCK-SEED', `dayLoop.ts:newDay(season=${sn})`, `در فصل ${sn} سپر ضد قفل نرم بذر «${giftedCrop ?? 'هیچ'}» داد که اصلاً در این فصل قابل کاشت نیست!`);
    }
    const toastMsg = UI.toasts.map((t) => t.text).join(' | ');
    if (cropDef && !toastMsg.includes(cropDef.fa)) {
      report('WRONG-GIFT-TOAST-CROP', `dayLoop.ts:newDay(season=${sn})`, `بذر اهدایی «${cropDef.fa}» بود اما اعلان روی صفحه به اشتباه نوشت: «${toastMsg}»!`);
    }
  }
}

// ============================================================================
// بخش ۳: ممیزی رندر واقعی تمام ۱۵ مودال و HUD در روز اول و در پایان‌بازی
// ============================================================================
function auditRenderedUiStates() {
  resetGame();
  UI.started = true;
  maybeStartPrologue();
  skipActiveCutscene();
  UI.modal = 'carp';
  const carpHtml = renderToString(React.createElement(Modals));

  const titlesToMax: Array<[string, number]> = [
    [UT.u164, SILO_PRICE.length],
    [UT.u166, GH_PRICE.length],
    [UT.u170, POND_MAX],
    [UT.u172, HIVE_MAX],
  ];
  for (const [title, maxPips] of titlesToMax) {
    const marker = `>${title}<`;
    const pos = carpHtml.indexOf(marker);
    if (pos !== -1) {
      const slice = carpHtml.slice(pos, pos + 1600);
      const nextCard = slice.indexOf('class="paper flex flex-col items-center gap-1 p-2"');
      const cardHtml = nextCard === -1 ? slice : slice.slice(0, nextCard);
      const dots = cardHtml.match(/<span class="inline-block h-3 w-3[^"]*"[^>]*>/g) ?? [];
      if (dots.length !== maxPips) {
        report('CARP-WRONG-MAX-PIPS', `Shops2.tsx:${title}`, `کارت «${title}» در حالت صفر ${dots.length} نشانگر به جای ${maxPips} نشانگر نمایش می‌دهد!`);
      }
      const litDots = dots.filter((d) => d.includes('ffd93b') || d.includes('255, 217, 59')).length;
      if (litDots > 0) {
        report('CARP-ZERO-LIT-PIP', `Shops2.tsx:${title}`, `کارت «${title}» قبل از ساخت حتی ۱ واحد، ${litDots} نشانگر روشن نمایش می‌دهد!`);
      }
    }
  }

  // رندر بدون کرش هر ۱۵ مودال بازی
  const allModals = [
    'seed', 'market', 'work', 'carp', 'estate', 'animal', 'inv',
    'menu', 'auto', 'pond', 'hive', 'achieve', 'ledger', 'quests', 'museum',
  ] as const;
  for (const m of allModals) {
    UI.modal = m;
    const html = renderToString(React.createElement(Modals));
    if (!html || html.includes('undefined') || html.includes('NaN')) {
      report('MODAL-BAD-TEXT', `Modals:${m}`, `مودال «${m}» شامل رشتهٔ خراب undefined یا NaN است!`);
    }
  }
  UI.modal = null;

  // ممیزی پایان‌بازی (Postgame) در طول ۴۰ روز پس از اتمام داستان
  resetGame();
  UI.started = true;
  startDebt(5);
  S.story.chapter = 6;
  S.story.questDone = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true };
  S.coins = 5_000_000;
  payDebt(NOTES[5].amount);
  skipActiveCutscene();

  for (let d = 0; d < 40; d++) {
    S.day++;
    processDebtDay();
    if (debt()?.pendingVisit) {
      report('POSTGAME-FAKE-VISIT', `debt.ts:day=${S.day}`, `پس از پایان کامل داستان و آزادی مزرعه، هنوز ملاقات سررسید/باج جهانگیر (${debt()?.pendingVisit}) فعال شد!`);
      break;
    }
  }
  S.debt!.dueDay = S.day + 1;
  UI.modal = null;
  const hudPostHtml = renderToString(React.createElement(Hud));
  if (hudPostHtml.includes(UT.u38) || hudPostHtml.includes('روز قسط')) {
    report('POSTGAME-HUD-DEBT-WARNING', 'Hud.tsx:DebtChip', `پس از تسویهٔ کامل ۶٬۰۰۰٬۰۰۰ سکه و آزادی مزرعه، HUD هنوز شمارش معکوس «قسط بعدی / روز قسط» نمایش می‌دهد!`);
  }
}

// ============================================================================
// بخش ۴: اجرای کامل بازی توسط ربات از روز اول تا جشن پایان + موزهٔ پایان‌بازی
// ============================================================================
function auditFullPlaythroughStartToFinish() {
  setSeed(8001);
  const res = runStoryBot(8001, 2600);
  if (!res.prologueDone) report('PLAY-PROLOGUE', 'bot:8001', 'پرولوگ کامل نشد.');
  if (res.notesOpened !== 6) report('PLAY-NOTES', 'bot:8001', `فقط ${res.notesOpened} سند از ۶ سند باز شد.`);
  if (res.questsDone !== 6) report('PLAY-QUESTS', 'bot:8001', `فقط ${res.questsDone} کوئست از ۶ کوئست اصلی تکمیل شد.`);
  if (!res.finaleSeen || !res.postgameDay) report('PLAY-FINALE', 'bot:8001', 'جشن پایان (finale) دیده نشد.');
  if (res.softLockDays > 0) report('PLAY-SOFTLOCK', 'bot:8001', `${res.softLockDays} روز قفل نرم ثبت شد.`);

  const mustHaveSeen = [
    'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7',
    'ch1-outro', 'ch2-outro', 'ch3-outro', 'ch4-outro', 'ch5-outro', 'ch6-outro', 'finale',
    'note-open-1', 'note-open-2', 'note-open-3', 'note-open-4', 'note-open-5',
    'quest-done-q1', 'quest-done-q2', 'quest-done-q3', 'quest-done-q4', 'quest-done-q5', 'quest-done-q6',
    'season-dawn-summer', 'season-dawn-autumn', 'season-dawn-winter', 'season-dawn-spring',
  ];
  for (const id of mustHaveSeen) {
    if (!S.story.seen[id]) {
      report('PLAY-MISSED-CUTSCENE', `playthrough:${id}`, `در طول بازی کامل از روز ۱ تا پایان، کات‌سین الزامی «${id}» هرگز دیده نشد (در صف گم شد)!`);
    }
  }

  const postSharkhar = talkToSharkhar();
  if (postSharkhar?.id !== 'sharkhar-postgame') {
    report('PLAY-POSTGAME-SHARKHAR', 'talkToSharkhar', `در پایان‌بازی دیالوگ جهانگیر به جای sharkhar-postgame گرهٔ ${postSharkhar?.id} را برگرداند.`);
  }
  skipActiveCutscene();

  for (let i = 0; i < 4; i++) {
    const npcNode = talkToTownNpc(i);
    if (!npcNode || !nodeById(npcNode.id)) {
      report('PLAY-NPC', `talkToTownNpc(${i})`, 'دیالوگ شخصیت شهر نامعتبر بود.');
    }
    skipActiveCutscene();
  }

  for (const area of ['town', 'river', 'apiary'] as const) {
    UI.scene = area;
    if (!triggerAreaIntro(area)) {
      report('PLAY-AREA-INTRO', area, `معرفی ناحیهٔ ${area} اجرا نشد.`);
    }
    skipActiveCutscene();
  }
  UI.scene = 'farm';

  const coinsBeforeMuseum = S.coins;
  visitMuseum();
  if (!S.museumVisited || S.coins <= coinsBeforeMuseum) {
    report('PLAY-MUSEUM', 'Museum.tsx', 'هدیهٔ افتتاح موزه در پایان‌بازی ثبت نشد.');
  }

  tickBuilds(999);
  checkStoryQuests();
  maybeOpenNextNote();

  console.log(
    `[PLAYTHROUGH] روز پایان داستان: ${res.postgameDay} | سطح نهایی: ${res.maxLevel} | ` +
    `سندها: ${res.notesOpened}/6 | کوئست‌ها: ${res.questsDone}/6 | صحنه‌های یکتای دیده‌شده: ${Object.keys(S.story.seen).length}`,
  );
}

auditStaticTextsAndScenes();
auditTriggersAndMechanics();
auditRenderedUiStates();
runLoop1ActionAndToastFuzzer(report);
runLoop2EconomyAndLedgerTruthBot(report);
runLoop3CalendarQuestsObjectivesAndSaveBot(report);
runLoop5MultiSeedSaveAndAllModalVisibleTextBot(report);
runLoop6StoryClarityPlaytimeHoursAndMobileScaleBot(report);
runLoop7CutsceneActionAndSetPieceAudit(report);
runLoop8MandatoryUpgradesAndMachinesAudit(report);
runLoop9HiddenSecretsAndSaveV6Audit(report);
runLoop10AntiSpamAndLocationCoherenceAudit(report);
runLoop11AntiGrindAndVarietyAudit(report);
auditFullPlaythroughStartToFinish();

if (findings.length > 0) {
  console.error(`\n[AUDIT-BOT] ${findings.length} ایراد داستانی / متنی / تریگری در کل بازی شناسایی شد:\n`);
  findings.forEach((f, idx) => {
    console.error(`  ${idx + 1}. [${f.code}] (${f.where}) -> ${f.detail}`);
  });
  process.exit(1);
}

console.log('\n[OK] ممیزی سرتاسری ربات از روز ۱ تا پایان‌بازی با صفر ایراد متنی، عددی، رابط کاربری و تریگر داستانی سبز است!');
