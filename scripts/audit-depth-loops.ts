// ===== حلقه‌های ممیزی عمیق (Loop 7..11): اکشن فیزیکی صحنه‌ها، الزام ارتقا/ماشین‌آلات، ۸ راز مخفی، ضداسپم و ضدیکنواختی =====
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  ARTISAN_RECIPES, S, UI, advance, canAct, craftArtisan, doAct, enqueueBuild, exportSaveJson, importSaveJson,
  manageAllPonds, performPlayerPlotSweep, resetGame, sellAll, sleepToMorning, visitMuseum,
} from '../src/game/state';
import { SAVE_VERSION } from '../src/game/core/saveMigrations';
import { makeFarmer, PAL_JAHANGIR, PAL_NPC, PAL_PLAYER, PAL_BUILDER } from '../src/game/rig';
import { applyBeatToStage, beginSceneStage, bindWorldActors, cinema, drawCinemaWorldExtras, endSceneStage, stepCinemaStage } from '../src/game/cinemaStage';
import { areaFor, listAllScenes } from '../src/story/sceneScripts';
import { NOTES } from '../src/story/debtData';
import { maybeOpenNextNote, payDebt, processDueDay, startDebt } from '../src/game/core/debt';
import { SECRETS, checkSecretTriggers, discoveredSecretCount } from '../src/story/secrets';
import { skipActiveCutscene, triggerAreaIntro, triggerCutscene, triggerSeasonDawn } from '../src/story/engine';
import { Modals } from '../src/ui/Modals';
import type { Ctx } from '../src/game/art';

export type ReportFn = (code: string, where: string, detail: string) => void;

function makeMockWalker(x: number) {
  return {
    x, y: 390, face: 1, rig: makeFarmer(PAL_PLAYER), ph: 0, mode: 'idle' as const,
    kind: '', p: 0, tasks: [], cur: null, hitDone: false, speed: 220, player: false, wait: 0,
  };
}

function makeSpyCanvasCtx(): { ctx: Ctx; ops: { count: number } } {
  const ops = { count: 0 };
  const noop = () => { ops.count++; };
  const target: Record<string, unknown> = {
    canvas: { width: 1280, height: 720 },
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
    globalAlpha: 1,
    font: '16px sans-serif',
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop, arc: noop, ellipse: noop,
    roundRect: noop, rect: noop, fill: noop, stroke: noop,
    fillRect: noop, strokeRect: noop, clearRect: noop, drawImage: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
  };
  return { ctx: target as unknown as Ctx, ops };
}

/** حلقهٔ ۷: ممیزی حرکت فیزیکی واقعی، چرخش آزاد بازوها با اکسسوری و رندر دکور در هر ۸۷ صحنه */
export function runLoop7CutsceneActionAndSetPieceAudit(report: ReportFn) {
  resetGame();
  UI.started = true;
  bindWorldActors({
    farmer: { ...makeMockWalker(400), rig: makeFarmer(PAL_PLAYER), player: true },
    jahangir: { ...makeMockWalker(600), rig: makeFarmer(PAL_JAHANGIR) },
    npcs: PAL_NPC.map((p, i) => ({ ...makeMockWalker(300 + i * 80), rig: makeFarmer(p) })),
    builder: { ...makeMockWalker(700), rig: makeFarmer(PAL_BUILDER) },
  });
  const { ctx, ops } = makeSpyCanvasCtx();
  const scenes = listAllScenes();
  if (scenes.length < 87) {
    report('ACTION-SCENE-COUNT', 'sceneScripts', `تعداد کل صحنه‌ها (${scenes.length}) کمتر از ۸۷ صحنهٔ هدف است.`);
  }
  let maxPropSwing = 0;
  let setPiecesDrawn = 0;
  for (const sc of scenes) {
    beginSceneStage(sc);
    const opsBefore = ops.count;
    for (let bi = 0; bi < sc.beats.length; bi++) {
      applyBeatToStage(bi);
      for (let f = 0; f < 24; f++) {
        stepCinemaStage(1 / 30);
        drawCinemaWorldExtras(ctx);
      }
    }
    if (cinema.totalDistanceMoved < 40) {
      report('STATIC-CUTSCENE', `scene:${sc.id}`, `کاراکترها در صحنهٔ «${sc.id}» تقریباً بی‌حرکت بودند (${cinema.totalDistanceMoved.toFixed(1)}px).`);
    }
    if (sc.setPiece && ops.count > opsBefore) setPiecesDrawn++;
    maxPropSwing = Math.max(maxPropSwing, cinema.maxArmSwingRad);
    endSceneStage(true);
  }
  if (maxPropSwing < 2.2) {
    report('ARM-CLAMPED', 'cinemaStage.ts', `بیشینه چرخش بازو در صحنه‌های اکشن (${maxPropSwing.toFixed(2)} rad) هنوز محدود شده است.`);
  }
  if (setPiecesDrawn < 14) {
    report('SETPIECE-MISSING', 'cinemaArt.ts', `فقط ${setPiecesDrawn} صحنه دکور زندهٔ صحنه داشتند.`);
  }
}

/** حلقهٔ ۸: ۶ ربات متقلب «بدون ارتقا / بدون گسترش / بدون ماشین‌آلات» در برابر ربات توسعهٔ کامل */
export function runLoop8MandatoryUpgradesAndMachinesAudit(report: ReportFn) {
  // ربات ۱: پول بی‌نهایت + سطح ۳۰، اما بدون گسترش زمین، ابزار و حصار دوم -> قفل در فصل ۲
  resetGame();
  UI.started = true;
  S.xp = 9_000_000;
  S.coins = 50_000_000;
  S.stats.harv = 500;
  startDebt(0);
  S.story.chapter = 1;
  S.debt!.chapterStartDay = -500;
  payDebt(NOTES[0].amount);
  maybeOpenNextNote(); // وارد فصل ۲ می‌شود (فصل ۱ فقط ۲۰ برداشت است)
  S.debt!.chapterStartDay = -500;
  payDebt(NOTES[1].amount);
  if (maybeOpenNextNote() || S.story.chapter > 2 || S.story.postgame) {
    report('CHEESE-NO-UPGRADE-CH2', 'quests.ts:q2', 'بازیکن توانست بدون گسترش زمین، ارتقای ابزار و ساخت ۲ حصار دام از فصل ۲ عبور کند!');
  }

  // ربات ۲: زمین و حصار دارد، اما بدون ماشین‌آلات و کندو -> قفل در فصل ۳
  S.pens = { chicken: 1, cow: 1 };
  S.lv.land = 1;
  S.lv.hoe = 1;
  maybeOpenNextNote();
  S.debt!.chapterStartDay = -500;
  S.ponds = [{ id: 1, stocked: true, grow: 0, feed: 5 }, { id: 2, stocked: true, grow: 0, feed: 5 }];
  payDebt(NOTES[2].amount);
  if (maybeOpenNextNote() || S.story.chapter > 3) {
    report('CHEESE-NO-MACHINE-CH3', 'quests.ts:q3', 'بازیکن توانست بدون خرید ماشین‌آلات و کندوی عسل از فصل ۳ عبور کند!');
  }

  // ربات ۳: بدون چاه قطره‌ای و ۴ ماشین -> قفل در فصل ۴
  S.hives = 2;
  S.machines = { tractor: 1, sprinkler: 1 };
  maybeOpenNextNote();
  S.debt!.chapterStartDay = -500;
  S.gh = 1;
  payDebt(NOTES[3].amount);
  if (maybeOpenNextNote() || S.story.chapter > 4) {
    report('CHEESE-NO-WELL-MACH4-CH4', 'quests.ts:q4', 'بازیکن توانست بدون چاه قطره‌ای، زمین پلهٔ ۲ و ۴ ماشین از فصل ۴ عبور کند!');
  }

  // ربات ۴: بدون سیلو و ماشین مدل ۲ (MK2) -> قفل در فصل ۵
  S.wellLv = 1;
  S.lv.land = 2;
  S.machines = { tractor: 1, sprinkler: 1, harvester: 1, seeder: 1 };
  maybeOpenNextNote();
  S.debt!.chapterStartDay = -500;
  S.workers = 3;
  payDebt(NOTES[4].amount);
  if (maybeOpenNextNote() || S.story.chapter > 5) {
    report('CHEESE-NO-SILO-MK2-CH5', 'quests.ts:q5', 'بازیکن توانست بدون سیلو، زمین پلهٔ ۳ و ماشین مدل ۲ از فصل ۵ عبور کند!');
  }

  // ربات ۵: در فصل ۶ با پول کامل، اما بدون خاک طلایی، زمین کامل ۴ و ۶ ماشین -> پایان بازی قفل می‌ماند!
  S.silo = 1;
  S.lv.land = 3;
  S.machines = { tractor: 2, sprinkler: 1, harvester: 1, seeder: 1, feeder: 1 };
  maybeOpenNextNote();
  payDebt(NOTES[5].amount);
  maybeOpenNextNote();
  if (S.story.postgame) {
    report('CHEESE-NO-FULL-MASTERY-CH6', 'quests.ts:q6', 'بازیکن بدون باز کردن همهٔ زمین‌ها، خاک طلایی و ۶ ماشین توانست داستان را تمام کند!');
  }

  // ربات ۶: تکمیل واقعی همهٔ ارتقاها، زمین‌ها، خاک طلایی و ۶ ماشین -> آزادی کامل مزرعه!
  S.lv.land = 4;
  S.lv.soil = 1;
  S.lv.can = 1;
  S.lv.bag = 1;
  S.machines.collector = 1;
  maybeOpenNextNote();
  if (!S.story.postgame) {
    report('MASTERY-BLOCKED', 'quests.ts:q6', 'حتی پس از تکمیل تمام ارتقاها، زمین‌ها، خاک طلایی و ۶ ماشین، پایان بازی باز نشد!');
  }
}

/** حلقهٔ ۹: ممیزی هر ۸ رویداد مخفی، عدم لو رفتن تصادفی و ماندگاری در سِیو نسخهٔ ۶ */
export function runLoop9HiddenSecretsAndSaveV6Audit(report: ReportFn) {
  resetGame();
  UI.started = true;
  S.story.prologueSeen = true;
  startDebt(0);

  // در شرایط معمولی هیچ راز مخفی نباید بی‌دلیل لو برود
  S.hour = 12; S.weather = 0;
  checkSecretTriggers('well');
  checkSecretTriggers('fish');
  checkSecretTriggers('apiary');
  checkSecretTriggers('farm-step');
  checkSecretTriggers('tree-tap');
  checkSecretTriggers('market-open');
  checkSecretTriggers('museum-open');
  if (discoveredSecretCount() !== 0) {
    report('SECRET-PREMATURE-LEAK', 'secrets.ts', `در شرایط عادی روز اول ${discoveredSecretCount()} راز مخفی به اشتباه باز شد!`);
  }

  // ۱. چاه نقره‌ای نیمه‌شب
  UI.scene = 'farm'; S.wellLv = 2; S.weather = 0; S.hour = 23.5;
  checkSecretTriggers('well'); skipActiveCutscene();
  // ۲. شاه‌ماهی طلایی باران
  UI.scene = 'river'; S.weather = 2; S.hour = 6.5; S.stats.fish = 30;
  checkSecretTriggers('fish'); skipActiveCutscene();
  // ۳. ملکهٔ زنبورستان
  UI.scene = 'apiary'; S.day = 3; S.hives = 5; S.stats.honey = 20;
  checkSecretTriggers('apiary'); skipActiveCutscene();
  // ۴. دوئل مترسک و جهانگیر
  UI.scene = 'farm'; S.debt!.scarecrow = 3;
  checkSecretTriggers('farm-step'); skipActiveCutscene();
  // ۵. شب چله (فصل زمستان از روز ۲۲ آغاز می‌شود)
  UI.scene = 'farm'; S.day = 22; S.hour = 20.5; S.inv.pomegranate = 2;
  checkSecretTriggers('farm-step'); skipActiveCutscene();
  // ۶. درخت کهنسال
  UI.scene = 'farm'; S.lv.land = 4; S.lv.soil = 1;
  checkSecretTriggers('tree-tap'); skipActiveCutscene();
  // ۷. کاروان ابریشم بازار
  UI.scene = 'town'; S.stats.contracts = 6; S.inv.saffron = 2; S.inv.honey = 2;
  checkSecretTriggers('market-open'); skipActiveCutscene();
  // ۸. پایان مخفی واقعی موزه در سطح ۳۰ پایان‌بازی
  S.story.postgame = true; S.xp = 9_000_000; visitMuseum();
  checkSecretTriggers('museum-open'); skipActiveCutscene();

  if (discoveredSecretCount() !== SECRETS.length) {
    const missing = SECRETS.filter((s) => !S.secrets?.[s.id]).map((s) => s.id).join(', ');
    report('SECRET-MISSING', 'secrets.ts', `فقط ${discoveredSecretCount()} راز از ${SECRETS.length} راز مخفی فعال شد (جاافتاده: ${missing}).`);
  }

  const raw = exportSaveJson();
  resetGame();
  if (!importSaveJson(raw) || S.v !== SAVE_VERSION || discoveredSecretCount() !== SECRETS.length) {
    report('SECRET-SAVE-LOST', 'saveMigrations.ts', 'رازهای کشف‌شده پس از ذخیره و بازیابی سِیو نسخهٔ ۶ حفظ نشدند!');
  }

  UI.modal = 'quests';
  const qHtml = renderToString(React.createElement(Modals));
  UI.modal = 'museum';
  const mHtml = renderToString(React.createElement(Modals));
  UI.modal = null;
  if (!qHtml.includes('طومار رازهای پنهان') || !mHtml.includes('طومار رازهای پنهان')) {
    report('SECRET-UI-MISSING', 'Quests/Museum', 'بخش رازهای پنهان در پنجرهٔ کوئست‌ها یا موزه رندر نشد.');
  }
}

/** حلقهٔ ۱۰: ممیزی عدم اجرای پیاپی بی‌دلیل صحنه‌ها و صفر پرش اشتباهی بین نواحی */
export function runLoop10AntiSpamAndLocationCoherenceAudit(report: ReportFn) {
  resetGame();
  UI.started = true;
  S.story.prologueSeen = true;
  startDebt(0);

  // ۱. ایستادن در مزرعه هرگز نباید معرفی شهر/رودخانه/زنبورستان را اجرا کند
  UI.scene = 'farm';
  if (triggerAreaIntro('town') || triggerAreaIntro('river') || triggerAreaIntro('apiary')) {
    report('WRONG-LOC-AREA-INTRO', 'story/engine.ts', 'در حالی که بازیکن در مزرعه بود، صحنهٔ معرفی شهر/رودخانه/زنبورستان به اشتباه اجرا شد!');
  }

  // ۲. تکمیل کوئست یا سپیده‌دم فصل در هر ناحیه دقیقاً در همان ناحیه می‌ماند (صفر پرش ناگهانی!)
  for (const sc of ['farm', 'town', 'river', 'apiary'] as const) {
    UI.scene = sc;
    if (areaFor('quest-done-q3') !== sc || areaFor('season-dawn-winter') !== sc) {
      report('WRONG-LOC-TELEPORT', `sceneScripts:${sc}`, `صحنهٔ کوئست/فصل بازیکن را از ${sc} به ناحیهٔ دیگری پرتاب کرد!`);
    }
  }

  // ۳. همزمانی روز سررسید قسط (روز ۲۹ = روز اول بهار!) هرگز نباید دو کات‌سین فصل + قسط را پشت‌سرهم باز کند
  resetGame();
  UI.started = true;
  S.story.prologueSeen = true;
  startDebt(0);
  S.day = 28;
  S.hour = 23.5;
  S.coins = 500;
  advance(1); // ورود به روز ۲۹ (تغییر فصل زمستان -> بهار + سررسید قسط!)
  if (S.debt?.pendingVisit && S.story.pending?.startsWith('season-dawn-')) {
    report('DOUBLE-CUTSCENE-DUE-DAY', 'dayLoop.ts', 'در روز سررسید قسط، کات‌سین فصل نو همزمان با ملاقات جهانگیر پشت‌سرهم فعال شد!');
  }

  // ۴. تسویهٔ کامل سند و باز شدن پایان فصل نباید کات‌سین اضافهٔ quest-done را پشت ch1-outro صف کند
  resetGame();
  UI.started = true;
  S.story.prologueSeen = true;
  startDebt(0);
  S.story.chapter = 1;
  S.stats.harv = 25;
  S.debt!.chapterStartDay = -50;
  S.coins = 50_000;
  payDebt(NOTES[0].amount);
  skipActiveCutscene();
  if (S.story.pending !== null) {
    report('DOUBLE-CUTSCENE-CHAPTER-END', 'debt.ts:maybeOpenNextNote', `پس از پایان کات‌سین فصل ۱، بلافاصله کات‌سین اضافهٔ «${S.story.pending}» بدون هیچ بازی اجرا شد!`);
  }

  void processDueDay;
  void triggerSeasonDawn;
  void triggerCutscene;
}

/** حلقهٔ ۱۱: ممیزی کامل حذف خستگی و یکنواختی (شعاع ضربهٔ ۳×۳ ابزارها، پاتیل ۶گانه، حفاظت قرارداد، سرویس حوضچه‌ها و ساخت در خواب) */
export function runLoop11AntiGrindAndVarietyAudit(report: ReportFn) {
  resetGame();
  UI.started = true;
  S.lv.land = 4; // هر ۴۰ کرت باز
  S.lv.hoe = 4;  // بیل فولادی ۳×۳
  S.lv.can = 4;  // آبپاش فولادی ۳×۳
  S.stamina = 100;
  S.can = 20;

  // ۱. یک ضربهٔ بیل سطح ۴ باید ۹ کرت مجاور را یک‌جا شخم بزند (کاهش ۸۹٪ کلیک تکراری!)
  const sweepHits = performPlayerPlotSweep(12, 'till', canAct, doAct, () => 0.99);
  if (sweepHits.length !== 9) {
    report('AOE-HOE-BROKEN', 'artisan.ts:performPlayerPlotSweep', `ضربهٔ بیل سطح ۴ به جای ۹ کرت، ${sweepHits.length} کرت را شخم زد.`);
  }
  // ۲. برداشت طلایی پربرکت در شانس بالا محصول دوبرابر و ۱ بذر رایگان برمی‌گرداند
  S.plots[0] = { st: 2, crop: 'saffron', prog: 1, ripe: true, water: 1, fert: 1, dry: 0, dead: false, last: null, n: 0 };
  const seedsBefore = S.seeds.saffron ?? 0;
  const goldHits = performPlayerPlotSweep(0, 'harvest', canAct, doAct, () => 0.01);
  if (!goldHits[0]?.golden || (S.seeds.saffron ?? 0) !== seedsBefore + 1) {
    report('GOLDEN-HARVEST-BROKEN', 'artisan.ts', 'برداشت طلایی محصول دوبرابر و بذر جایزه نداد.');
  }

  // ۳. پاتیل روستایی و آسیاب خانگی: هر ۶ دستور پخت کار می‌کنند و سود بیشتر بدون افت تقاضای بازار می‌دهند
  S.lv.bag = 6;
  S.lv.barn = 4; // ظرفیت انبار برای مواد اولیهٔ پاتیل
  S.inv = { wheat: 10, egg: 4, milk: 6, wool: 2, saffron: 2, rose: 4, honey: 4, pomegranate: 4, fish: 6, roe: 2 };
  S.stamina = 10;
  const demBefore = S.dem.saffron ?? 1;
  let craftedTotal = 0;
  for (const r of ARTISAN_RECIPES) craftedTotal += craftArtisan(r.id, 1);
  if (craftedTotal !== 6 || (S.inv.feed ?? 0) < 5 || (S.dem.saffron ?? 1) !== demBefore || S.stamina < 90) {
    report('ARTISAN-KITCHEN-BROKEN', 'artisan.ts:craftArtisan', `پاتیل فرآوری روستایی به درستی اجرا نشد (تعداد=${craftedTotal}).`);
  }

  // ۴. حفاظت هوشمند از کالای قرارداد فعال هنگام «فروش همه»
  S.inv = { wheat: 25, egg: 5 };
  S.contract = { good: 'wheat', qty: 10, deposit: 100, reward: 500, dueDay: S.day + 5 };
  sellAll();
  if ((S.inv.wheat ?? 0) !== 10 || (S.inv.egg ?? 0) !== 0) {
    report('CONTRACT-SELLALL-WIPED', 'economy.ts:sellAll', `«فروش همه» کالای رزروشدهٔ قرارداد فعال را فروخت (باقی‌مانده=${S.inv.wheat ?? 0})!`);
  }
  S.contract = null;

  // ۵. سرویس یک‌جای همهٔ حوضچه‌ها + ساخت‌وساز در هنگام خواب تا صبح
  S.coins = 50_000;
  S.inv.feed = 20;
  S.ponds = [
    { id: 1, stocked: true, grow: 10, feed: 2 },
    { id: 2, stocked: false, grow: 0, feed: 0 },
  ];
  const ops = manageAllPonds();
  if (ops < 3 || !S.ponds[0].stocked || !S.ponds[1].stocked || S.ponds[0].feed <= 0) {
    report('POND-BATCH-BROKEN', 'artisan.ts:manageAllPonds', `سرویس یک‌جای حوضچه‌ها ناقص عمل کرد (ops=${ops}).`);
  }

  enqueueBuild('well', 'well', 'چاه', 'well', 500);
  const progBefore = S.builds[0]?.prog ?? 0;
  S.hour = 9; // حتی در روز روشن (ساعت ۹ صبح) هم استراحت تا فردا باید هم کار کند و هم ساخت‌وساز را پیش ببرد!
  sleepToMorning();
  if ((S.builds[0]?.prog ?? 999) <= progBefore) {
    report('SLEEP-BUILD-FROZEN', 'dayLoop.ts:sleepToMorning', 'استراحت تا فردا صبح پیشرفت ساخت‌وساز کارگر را جلو نبرد!');
  }

  // ۶. رندر کامل بخش پاتیل در مودال انبار بدون هیچ خطایی
  UI.modal = 'inv';
  const invHtml = renderToString(React.createElement(Modals));
  UI.modal = null;
  if (!invHtml.includes('پاتیل و آسیاب خانگی مزرعه')) {
    report('INV-ARTISAN-UI-MISSING', 'InventoryModal.tsx', 'بخش پاتیل و آسیاب خانگی در مودال انبار رندر نشد.');
  }
}
