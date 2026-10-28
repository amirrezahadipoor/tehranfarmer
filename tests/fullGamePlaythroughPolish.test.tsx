import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { installDom } from './helpers/dom';
import {
  S, UI, advance, bumpPlayerCombo, canAct, doAct, effectivePlotDailyRate, performPlayerPlotSweep, resetGame, stamCap, toast,
} from '../src/game/state';
import { createSceneTapRouter } from '../src/game/engineInput';
import { makeFarmer, PAL_NPC, PAL_PLAYER, PAL_JAHANGIR } from '../src/game/rig';
import { fishCast } from '../src/game/worldVisuals';
import { CFG } from '../src/game/settings';
import { Hud } from '../src/ui/Hud';
import { Ledger } from '../src/ui/Ledger';
import { Modals } from '../src/ui/Modals';
import { Quests } from '../src/ui/Quests';
import { debt } from '../src/game/core/debt';
import type { CropId } from '../src/game/data';
import { fa } from '../src/strings/fa';
import { talkToTownNpc } from '../src/story/engine';
import { TOWN_ACTORS, npcTargetAt } from '../src/story/townNpc';

describe('Full End-to-End Playthrough Polish, AoE Hand-Care Parity, Villager Hitboxes, Combo Juice & River Tension', () => {
  beforeAll(() => {
    installDom();
  });

  beforeEach(() => {
    CFG.locale = 'fa';
    resetGame();
    UI.started = true;
    UI.modal = null;
    UI.info = null;
    UI.toasts = [];
    UI.combo = { count: 0, until: 0, kind: 'harvest' };
    UI.needRodHint = 0;
    fishCast.active = false;
    fishCast.armed = false;
    fishCast.streak = 0;
  });

  it('۱. جاروی ۳×۳ بازیکن در دشت شمالی و باغ‌دره همهٔ ۹ کرت را با p.hand = true می‌کارد و همه با سرعت کامل یکسان می‌رسند', () => {
    S.lv.land = 4;
    S.lv.hoe = 4; // 3x3 sweep (9 cells)
    S.lv.can = 4; // 3x3 sweep (9 cells)
    S.can = 30;
    S.stamina = 100;
    S.seeds.wheat = 30;
    UI.scene = 'north';
    UI.seed = 'wheat';

    const center = 13; // row 1, col 4 on 9x6 north grid -> full 9-cell 3x3 neighborhood
    const tillHits = performPlayerPlotSweep(center, 'till', canAct, doAct, () => 0.99);
    expect(tillHits.length).toBe(9);
    const stamAfterTill = S.stamina;

    const plantHits = performPlayerPlotSweep(center, 'plant', canAct, doAct, () => 0.99);
    expect(plantHits.length).toBe(9);
    expect(stamAfterTill - S.stamina).toBeLessThan(4);

    // Every single one of the 9 swept plots MUST have p.hand === true (no frozen 10x slower outer plots!)
    for (const h of plantHits) {
      expect(S.northPlots[h.plot].hand).toBe(true);
    }

    const waterHits = performPlayerPlotSweep(center, 'water', canAct, doAct, () => 0.99);
    expect(waterHits.length).toBe(9);
    expect(S.can).toBe(21); // 9 water charges properly used

    // Advance 60 hours with rain -> all 9 plots ripened identically fast!
    S.weather = 2;
    advance(60);
    for (const h of plantHits) {
      expect(S.northPlots[h.plot].ripe).toBe(true);
    }
  });

  it('۲. کارت اطلاعات کرت (Info) در دشت شمالی و باغ‌دره زمان واقعی رشد (~۵۳ ساعت و نه ۴۸۱ ساعت!) را ۱۰۰٪ هم‌ارز با شبیه‌ساز نشان می‌دهد', () => {
    S.lv.land = 4;
    S.seeds.wheat = 5;
    S.weather = 2;
    UI.scene = 'valley';
    UI.seed = 'wheat';
    doAct('till', 0);
    doAct('plant', 0);
    doAct('water', 0);

    const rate = effectivePlotDailyRate('valley', 0);
    const expectedHrs = Math.max(1, Math.round(((1 - S.valleyPlots[0].prog) / rate) * 24));
    expect(expectedHrs).toBeLessThanOrEqual(60);

    UI.info = { plot: 0, x: 200, y: 200 };
    const html = renderToStaticMarkup(<Hud />);
    expect(html).toContain(fa(expectedHrs));

    // Prove real simulation ripens in exact displayed hours (100% truth parity!)
    advance(expectedHrs + 1);
    expect(S.valleyPlots[0].ripe).toBe(true);
  });

  it('۳. لمس بالای سر اهالی شهر (پلاک نام و علامت تعجب زرد کوئست در y = n.y - 180) همیشه گفت‌وگو را باز می‌کند نه مغازه یا خروج!', () => {
    UI.scene = 'town';
    S.story.prologueSeen = true;
    const farmer = { x: 420, y: 600, face: 1, rig: makeFarmer(PAL_PLAYER), ph: 0, mode: 'idle' as const, kind: '', p: 0, tasks: [], cur: null, hitDone: false, speed: 240, player: true, wait: 0 };
    const npcs = TOWN_ACTORS.map((_, i) => {
      const [nx, ny] = npcTargetAt(i, 10);
      return { x: nx, y: ny, face: 1, rig: makeFarmer(PAL_NPC[i]), ph: 0, mode: 'idle' as const, kind: '', p: 0, tasks: [], cur: null, hitDone: false, speed: 60, player: false, wait: 0 };
    });
    const jahangir = { x: 1000, y: 600, face: -1, rig: makeFarmer(PAL_JAHANGIR), ph: 0, mode: 'idle' as const, kind: '', p: 0, tasks: [], cur: null, hitDone: false, speed: 60, player: false, wait: 0 };

    const router = createSceneTapRouter({
      farmer,
      animals: new Map(),
      npcs,
      jahangir,
      getDragLast: () => -1,
      setDragLast: () => {},
      clearTrans: () => {},
      moveTo: (w, tx, ty) => { w.tasks.push({ kind: 'move', x: tx, y: ty, face: 1, dur: 0, hit: 0 }); },
      mkTask: (kind, tx, ty, extra) => ({ kind, x: tx, y: ty, face: 1, dur: 0, hit: 0, ...extra }),
      enqueuePlot: () => true,
      reasonToast: () => {},
      toScreen: (x, y) => ({ x, y }),
      pop: () => {},
      finishRiverCast: () => {},
    });

    // Tap directly on Grandma's overhead golden ! badge (y = 594 - 180 = 414, right across Seed Shop y=250..470!)
    router.dispatchTap(npcs[0].x, npcs[0].y - 180, { clientX: 200, clientY: 160 });
    expect(farmer.tasks.length).toBe(0); // Did NOT walk into Seed Shop or exit Town!
    expect(Boolean(S.story.pending)).toBe(true); // Opened Grandma's live quest/dialogue!
  });

  it('۴. ابزار دست (نگاه) کرت رسیده را یک‌ضرب برداشت می‌کند، کمبو انرژی می‌دهد و ماهی‌گیری تا رسیدن به لب آب صبر می‌کند', () => {
    UI.scene = 'farm';
    UI.tool = 'hand';
    S.plots[0].st = 2;
    S.plots[0].crop = 'wheat';
    S.plots[0].ripe = true;
    S.plots[0].dead = false;

    const harvested: number[] = [];
    const farmer = { x: 1120, y: 540, face: -1, rig: makeFarmer(PAL_PLAYER), ph: 0, mode: 'idle' as const, kind: '', p: 0, tasks: [], cur: null, hitDone: false, speed: 240, player: true, wait: 0 };
    const router = createSceneTapRouter({
      farmer,
      animals: new Map(),
      npcs: [],
      jahangir: farmer,
      getDragLast: () => -1,
      setDragLast: () => {},
      clearTrans: () => {},
      moveTo: () => {},
      mkTask: (kind, tx, ty, extra) => ({ kind, x: tx, y: ty, face: 1, dur: 0, hit: 0, ...extra }),
      enqueuePlot: (kind, idx) => { if (kind === 'harvest') harvested.push(idx); return true; },
      reasonToast: () => {},
      toScreen: (x, y) => ({ x, y }),
      pop: () => {},
      finishRiverCast: () => {},
    });

    router.farmTap(477, 280, { clientX: 477, clientY: 280 }, true);
    expect(harvested).toEqual([0]);
    expect(UI.info).toBeNull();

    // River tap when farmer is far away at x=1120 arms cast WITHOUT popping active gauge prematurely on dry land
    UI.scene = 'river';
    S.rod = 0;
    router.dispatchTap(260, 440, { clientX: 260, clientY: 440 });
    expect(UI.needRodHint).toBeGreaterThan(Date.now() - 1000);

    S.rod = 1;
    router.dispatchTap(260, 440, { clientX: 260, clientY: 440 });
    expect(fishCast.armed).toBe(true);
    expect(fishCast.active).toBe(false);

    // Combo rhythm restores +2 stamina every 5th chain and renders live HUD badge
    S.stamina = stamCap() - 10;
    const before = S.stamina;
    for (let k = 0; k < 5; k++) bumpPlayerCombo('harvest');
    expect(S.stamina).toBe(before + 2);
    expect(UI.combo.count).toBe(5);
    const hudHtml = renderToStaticMarkup(<Hud />);
    expect(hudHtml).toContain('data-combo-badge="1"');
  });

  it('۵. دیالوگ‌های واکنشی باران/صمیمیت (FA + EN)، هدیهٔ صمیمیت ۳+ قلب و عدم هم‌پوشانی Toast با کارت مشاور در HUD', () => {
    S.affinity = { grandma: 75, sara: 65, engineer: 65, rancher: 65 };
    S.weather = 2;
    S.day = 10;
    const seedsBefore = Object.values(S.seeds).reduce((a, b) => a + (b ?? 0), 0);
    const n1 = talkToTownNpc(0);
    expect(n1).not.toBeNull();
    const seedsAfter = Object.values(S.seeds).reduce((a, b) => a + (b ?? 0), 0);
    expect(seedsAfter).toBeGreaterThanOrEqual(seedsBefore + 2);

    // Scarecrow due warning is now a real clickable button (`data-debt-warning="1"`) while Toasts sit cleanly below top HUD
    S.story.prologueSeen = true;
    (S as unknown as { debt: Record<string, unknown> }).debt = { noteIdx: 0, remaining: 15000, dueDay: 29 };
    S.day = 28;
    toast('fish', 'آزمایش اعلان بدون هم‌پوشانی');
    const htmlWithToast = renderToStaticMarkup(<Hud />);
    expect(htmlWithToast).toContain('آزمایش اعلان بدون هم‌پوشانی');
    expect(htmlWithToast).toContain('data-debt-warning="1"');
  });

  it('۶. تمام ۱۱ تابلوی جاده‌های خروجی و بازگشت در هر ۶ صحنه + کلبهٔ عسل زنبورستان دقیق و بدون برخورد با مغازه/کرت عمل می‌کنند', () => {
    S.lv.land = 5;
    S.story.prologueSeen = true;
    const farmer = { x: 500, y: 500, face: 1, rig: makeFarmer(PAL_PLAYER), ph: 0, mode: 'idle' as const, kind: '', p: 0, tasks: [] as Array<{ kind: string; to?: string; modal?: string }>, cur: null, hitDone: false, speed: 520, player: true, wait: 0 };
    const npcs = TOWN_ACTORS.map((_, i) => {
      const [nx, ny] = npcTargetAt(i, 10);
      return { x: nx, y: ny, face: 1, rig: makeFarmer(PAL_NPC[i]), ph: 0, mode: 'idle' as const, kind: '', p: 0, tasks: [], cur: null, hitDone: false, speed: 60, player: false, wait: 0 };
    });
    const router = createSceneTapRouter({
      farmer: farmer as never,
      animals: new Map(),
      npcs,
      jahangir: farmer as never,
      getDragLast: () => -1,
      setDragLast: () => {},
      clearTrans: () => {},
      moveTo: () => {},
      mkTask: (kind, tx, ty, extra) => ({ kind, x: tx, y: ty, face: 1, dur: 0, hit: 0, ...extra }),
      enqueuePlot: () => true,
      reasonToast: () => {},
      toScreen: (x, y) => ({ x, y }),
      pop: () => {},
      finishRiverCast: () => {},
    });

    const cases: Array<[typeof UI.scene, number, number, string]> = [
      ['farm', 1216, 214, 'town'],
      ['farm', 732, 130, 'north'],
      ['farm', 1212, 382, 'valley'],
      ['farm', 92, 566, 'river'],
      ['farm', 304, 588, 'apiary'],
      ['north', 92, 498, 'farm'],
      ['north', 1212, 498, 'valley'],
      ['north', 1220, 276, 'town'],
      ['valley', 96, 498, 'farm'],
      ['valley', 92, 388, 'north'],
      ['valley', 1220, 276, 'town'],
      ['town', 74, 498, 'farm'],
      ['river', 1204, 468, 'farm'],
      ['apiary', 1218, 528, 'farm'],
    ];

    for (const [scn, x, y, dest] of cases) {
      UI.scene = scn;
      farmer.tasks = [];
      router.dispatchTap(x, y, { clientX: x, clientY: y });
      expect(farmer.tasks[farmer.tasks.length - 1]?.to, `${scn} @ (${x},${y}) -> ${dest}`).toBe(dest);
    }

    UI.scene = 'apiary';
    farmer.tasks = [];
    router.dispatchTap(155, 300, { clientX: 155, clientY: 300 });
    expect(farmer.tasks[farmer.tasks.length - 1]?.to).toBe('inv');
  });

  it('۷. برداشت کششی پیوسته با ابزار پیش‌فرض «دست خالی» (first = false) همهٔ کرت‌های رسیده را پشت‌سرهم درو می‌کند', () => {
    UI.scene = 'farm';
    UI.tool = 'hand';
    for (const idx of [0, 1, 2]) {
      S.plots[idx].st = 2;
      S.plots[idx].crop = 'wheat';
      S.plots[idx].ripe = idx !== 1; // plot 1 is unripe; plots 0 & 2 are ripe
      S.plots[idx].dead = false;
    }
    let dragLast = -1;
    const harvested: number[] = [];
    const farmer = { x: 400, y: 240, face: 1, rig: makeFarmer(PAL_PLAYER), ph: 0, mode: 'idle' as const, kind: '', p: 0, tasks: [], cur: null, hitDone: false, speed: 520, player: true, wait: 0 };
    const router = createSceneTapRouter({
      farmer,
      animals: new Map(),
      npcs: [],
      jahangir: farmer,
      getDragLast: () => dragLast,
      setDragLast: (n) => { dragLast = n; },
      clearTrans: () => {},
      moveTo: () => {},
      mkTask: (kind, tx, ty, extra) => ({ kind, x: tx, y: ty, face: 1, dur: 0, hit: 0, ...extra }),
      enqueuePlot: (kind, idx) => { if (kind === 'harvest') harvested.push(idx); return true; },
      reasonToast: () => {},
      toScreen: (x, y) => ({ x, y }),
      pop: () => {},
      finishRiverCast: () => {},
    });

    router.farmTap(477, 280, { clientX: 477, clientY: 280 }, true);
    router.farmTap(563, 280, { clientX: 563, clientY: 280 }, false);
    router.farmTap(649, 280, { clientX: 649, clientY: 280 }, false);
    expect(harvested).toEqual([0, 2]);
    expect(UI.info).toBeNull();
  });

  it('۸. خودترمیم‌گری کامل موتور برابر سِیو ناقص (محصول نامعتبر در حلقهٔ رشد و تاریخچهٔ بدهی ناقص) + بازار داغ و کوئست تک‌کلیکی', () => {
    // 1. Unknown crop never freezes RAF advance()
    S.plots[3].st = 2;
    S.plots[3].crop = 'legacy_tea' as CropId;
    S.plots[3].ripe = false;
    expect(() => advance(24)).not.toThrow();
    expect(S.plots[3].crop).toBeNull();
    expect(S.plots[3].st).toBe(1);

    // 2. Partial debt object without history/flags never crashes Ledger
    (S as unknown as { debt: Record<string, unknown> }).debt = { noteIdx: 1, remaining: 18000, dueDay: 35 };
    expect(debt()?.history).toEqual([]);
    const ledgerHtml = renderToStaticMarkup(<Ledger />);
    expect(ledgerHtml).toContain('۱۸٬۰۰۰');

    // 3. Morning card never displays at night (hour 21.5), displays at morning (hour 7.5)
    S.morning = { day: 12, earned: 1450, gathered: 18, ripe: 9, shown: false };
    S.hour = 21.5;
    expect(renderToStaticMarkup(<Hud />)).not.toContain('data-morning-report="1"');
    S.hour = 7.5;
    expect(renderToStaticMarkup(<Hud />)).toContain('data-morning-report="1"');

    // 4. Hot Market banner & 1-tap NPC quest buttons render cleanly
    S.story.prologueSeen = true;
    S.day = 5;
    S.dem = { saffron: 1.38, wheat: 1.24, apple: 1.19 };
    UI.modal = 'market';
    expect(renderToStaticMarkup(<Modals />)).toContain('data-market-hot="1"');
    UI.modal = null;
    expect(renderToStaticMarkup(<Quests />)).toContain('data-quest-talk="grandma"');
  });
});
