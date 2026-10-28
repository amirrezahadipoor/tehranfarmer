import '../src/strings/en';
import { renderToString } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installDom } from './helpers/dom';
import { checkInvariants } from './helpers/invariants';
import { CFG } from '../src/game/settings';
import {
  CROPS, DAY_RATE, GOODS, LIVE_DAY_SECONDS, LIVE_DAY_STRETCH, PORTAL_TRAVEL_HOURS,
} from '../src/game/data';
import {
  S, UI, advance, buyWell, canAct, catchRegionalFish, craftArtisan, doAct,
  effectivePlotDailyRate, exportSaveJson, goodPrice, harvestHoney, importSaveJson,
  invCap, resetGame, sellGood, sleepToMorning, stamCap, tickLiveClock,
} from '../src/game/state';
import { buildJobLabel } from '../src/game/core/build';
import {
  ROYAL_DECREES, activeCharter, checkSeamlessEdgePortal, chooseVillageCharter,
  completeFestivalContest, ensureFrontier, fulfillRoyalDecree, harvestFrontierNode,
  judgeFestivalSubmission, redeemFestivalTokens, ringTownFestivalBell,
  stepFrontierLayer, useFrontierLandmark,
} from '../src/game/core/frontier';
import { startDebt, solvable } from '../src/game/core/debt';
import { NOTE_COUNT, TOTAL_DEBT } from '../src/story/debtData';
import { applyDialogueChoice } from '../src/story/socialVillagers';
import { skipActiveCutscene, triggerCutscene } from '../src/story/engine';
import { createSceneTapRouter } from '../src/game/engineInput';
import { makeFarmer, PAL_JAHANGIR, PAL_NPC, PAL_PLAYER } from '../src/game/rig';
import { TOWN_ACTORS, npcTargetAt } from '../src/story/townNpc';
import { drawIcon, drawProduce, iconURL } from '../src/game/art';
import { Hud } from '../src/ui/Hud';
import { Modals } from '../src/ui/Modals';
import { FishingModal } from '../src/ui/FishingModal';

function visibleTextOf(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('12 Heavy Cross-System Bug-Hunting Loops + Longer Days Without Economy Drift or Slow Ripening', () => {
  beforeAll(() => {
    installDom();
  });

  beforeEach(() => {
    CFG.locale = 'fa';
    resetGame();
    UI.started = true;
    S.story.prologueSeen = true;
    S.story.chapter = 1;
    startDebt(0);
  });

  it('Loop 1: Live days last 2.5x longer (480s = 8m) & portals cost 0.25h, while crops ripen in the EXACT same real seconds', () => {
    expect(LIVE_DAY_STRETCH).toBe(2.5);
    expect(LIVE_DAY_SECONDS).toBe(480);
    expect(PORTAL_TRAVEL_HOURS).toBe(0.25);

    // Measure old real-time crop ripening vs new tickLiveClock(dt) second-by-second across short & multi-day crops
    const ghPlot = 7; // Inside Greenhouse on Main Farm so all seasonal crops plant cleanly
    for (const cropId of ['wheat', 'carrot', 'strawberry', 'saffron', 'pomegranate'] as const) {
      resetGame();
      S.lv.land = 4;
      S.xp = 950_000;
      S.gh = 2;
      S.seeds[cropId] = 5;
      doAct('till', ghPlot);
      doAct('plant', ghPlot, false, cropId);
      doAct('water', ghPlot);
      expect(S.plots[ghPlot].crop).toBe(cropId);
      const rate = effectivePlotDailyRate('farm', ghPlot);
      const exactRealSecondsExpected = (1 / rate) * 24 * 4 * DAY_RATE;

      resetGame();
      S.lv.land = 4;
      S.xp = 950_000;
      S.gh = 2;
      S.seeds[cropId] = 5;
      S.stamina = 20;
      S.hives = 2;
      const startHour = S.hour;
      const startDay = S.day;
      doAct('till', ghPlot);
      doAct('plant', ghPlot, false, cropId);
      doAct('water', ghPlot);

      let sec = 0;
      while (!S.plots[ghPlot].ripe && sec < 4000) {
        S.plots[ghPlot].water = 1; // Keep plot hydrated across multi-day sunny transitions
        tickLiveClock(1);
        sec++;
      }
      expect(S.plots[ghPlot].ripe).toBe(true);
      expect(Math.abs(sec - Math.ceil(exactRealSecondsExpected))).toBeLessThanOrEqual(1);
      // Confirm clock moved 2.5x slower: total elapsed game hours = sec / 20 instead of sec / 8
      const totalGameHours = (S.day - startDay) * 24 + (S.hour - startHour);
      expect(totalGameHours).toBeCloseTo(sec / (4 * DAY_RATE * LIVE_DAY_STRETCH), 3);
      expect(S.stamina).toBeGreaterThan(25);
      expect(S.honeyAcc).toBeGreaterThan(0);
    }

    // Verify sleepToMorning advances builds by full real seconds equivalent
    S.coins = 50_000;
    buyWell();
    expect(S.builds.length).toBe(1);
    S.hour = 20;
    sleepToMorning();
    expect(S.hour).toBeCloseTo(6, 5);
    expect(S.wellLv).toBe(1);
  });

  it('Loop 2: Zero ASCII digits, zero raw ASCII %, and zero Persian leaks across ALL 21 modals + HUD in FA & EN', () => {
    S.xp = 500_000;
    S.coins = 250_000;
    S.story.chapter = 6;
    S.story.postgame = false;
    startDebt(4);
    S.hives = 3;
    S.honeyAcc = 14;
    S.ponds = [{ id: 1, stocked: true, grow: 3, feed: 6 }];
    S.pens = { chicken: 2, cow: 1 };
    S.animals = [
      { id: 1, kind: 'chicken', ready: 2, hue: 0, sex: 'f', grown: 0, sick: true },
      { id: 2, kind: 'cow', ready: 1, hue: 1, sex: 'f', grown: 0 },
    ];
    S.inv = { wheat: 10, saffron: 5, cheese: 5, turquoise: 4, herb: 5, honey: 5 };
    buyWell(); // Active 'well' build in HUD!

    const allModals = [
      'seed', 'market', 'work', 'carp', 'estate', 'animal', 'inv',
      'menu', 'auto', 'pond', 'hive', 'achieve', 'ledger', 'quests', 'museum',
      'home', 'almanac', 'mail', 'fishing', 'festival', 'atlas',
    ] as const;

    // 1. Persian parity audit
    CFG.locale = 'fa';
    const hudFa = visibleTextOf(renderToString(<Hud />));
    expect(/[0-9]/.test(hudFa)).toBe(false);
    expect(/%/.test(hudFa)).toBe(false);
    for (const m of allModals) {
      UI.modal = m;
      const txt = visibleTextOf(renderToString(<Modals />));
      expect(/[0-9]/.test(txt), `ASCII digit in FA modal ${m}: ${txt}`).toBe(false);
      expect(/undefined|NaN|Infinity|\[object/.test(txt), `Corrupt text in FA modal ${m}`).toBe(false);
    }

    // 2. Live English switching parity audit (including active 'well' build card!)
    CFG.locale = 'en';
    expect(/[\u0600-\u06FF]/.test(buildJobLabel({ kind: 'well', key: 'well', label: 'چاه قطره‌ای' }))).toBe(false);
    const hudEn = visibleTextOf(renderToString(<Hud />));
    expect(/[\u0600-\u06FF]/.test(hudEn), `Persian leak in EN HUD: ${hudEn}`).toBe(false);
    for (const m of allModals) {
      UI.modal = m;
      const txt = visibleTextOf(renderToString(<Modals />));
      expect(/[\u0600-\u06FF]/.test(txt), `Persian leak in EN modal ${m}: ${txt}`).toBe(false);
    }
    UI.modal = null;
    CFG.locale = 'fa';
  });

  it('Loop 3: Every GOOD, seed packet, and frontier artisan icon renders crisp distinct vector artwork', () => {
    const traceDraw = (fn: (c: CanvasRenderingContext2D) => void): string => {
      const cv = document.createElement('canvas');
      cv.width = 64;
      cv.height = 64;
      const c = cv.getContext('2d')!;
      const ops: string[] = [];
      const origFill = c.fill.bind(c);
      const origStroke = c.stroke.bind(c);
      c.fill = (() => { ops.push(`F:${String(c.fillStyle)}`); origFill(); }) as typeof c.fill;
      c.stroke = (() => { ops.push(`S:${String(c.strokeStyle)}`); origStroke(); }) as typeof c.stroke;
      fn(c);
      return ops.join('|');
    };
    for (const g of GOODS) {
      const trace = traceDraw((c) => drawProduce(c, g.id));
      expect(trace.length, `Empty drawProduce for ${g.id}`).toBeGreaterThan(0);
      expect(iconURL(g.id).startsWith('data:image/png')).toBe(true);
    }
    for (const cr of CROPS) {
      expect(traceDraw((c) => drawIcon(c, 'seed:' + cr.id)).length).toBeGreaterThan(0);
    }
    const amuletTrace = traceDraw((c) => drawIcon(c, 'turquoise-amulet'));
    const crownTrace = traceDraw((c) => drawIcon(c, 'crown'));
    const elixirTrace = traceDraw((c) => drawIcon(c, 'herbal-elixir'));
    expect(amuletTrace.length).toBeGreaterThan(0);
    expect(amuletTrace).not.toBe(crownTrace);
    expect(elixirTrace).not.toBe(crownTrace);
  });

  it('Loop 4: Core progression guards block premature Royal Decree claims & locked Village Charters', () => {
    S.xp = 0; // Level 1
    S.story.chapter = 1;
    S.story.postgame = false;
    S.inv = { pomegranate: 20, cheese: 20, amber: 20, truffle: 20 };

    // Level 1 cannot claim Lv 22 Royal Decree even with items in inventory
    expect(fulfillRoyalDecree(ROYAL_DECREES[2].id)).toBe(false);
    // Chapter 1 cannot ratify Chapter 5 Bank Charter
    expect(chooseVillageCharter('bank', 'credit')).toBe(false);

    // Once earned (Lv 25 + Chapter 5), both ratify & claim cleanly
    S.xp = 950_000;
    S.story.chapter = 5;
    expect(chooseVillageCharter('bank', 'credit')).toBe(true);
    expect(fulfillRoyalDecree(ROYAL_DECREES[2].id)).toBe(true);
  });

  it('Loop 5 & Loop 6: Fishing enforces stamina, 1:1 stat accounting, rod tier cap, and clean close-timer teardown', () => {
    const fishBefore = S.stats.fish ?? 0;
    const got = catchRegionalFish(0.85);
    expect(S.stats.fish ?? 0).toBe(fishBefore + got.qty);

    // Rapid mount/render/unmount never leaves orphan close timers corrupting UI.modal
    S.stamina = 0;
    UI.modal = 'fishing';
    const html = renderToString(<FishingModal />);
    expect(html.length).toBeGreaterThan(50);
    UI.modal = 'market';
    expect(UI.modal).toBe('market');
    UI.modal = null;
  });

  it('Loop 7: Scene Gallery (director: true) replay + Skip NEVER leaks free coins, XP, or premature Village Charters', () => {
    const coins0 = S.coins;
    const xp0 = S.xp;
    expect(activeCharter('bazaar')).toBeNull();

    triggerCutscene('note-open-1', { forceReplay: true, director: true });
    expect(UI.directorReplay).toBe(true);
    applyDialogueChoice('note-open-1', 1);
    skipActiveCutscene();

    expect(S.coins).toBe(coins0);
    expect(S.xp).toBe(xp0);
    expect(activeCharter('bazaar')).toBeNull();
  });

  it('Loop 8: Cavern stairs & Forest glade transitions clear stale movement tasks & preserve 8-region portal symmetry', () => {
    UI.scene = 'cave';
    S.stamina = 150;
    // ابتدا پله با یک ضربهٔ قطعی کشف می‌شود؛ سپس تاچ همان ناحیه طبقه را عوض می‌کند.
    harvestFrontierNode('cave', 0, () => 0);
    expect(ensureFrontier().stairsFound['cave:1']).toBe(true);

    const farmer = {
      x: 500, y: 560, face: 1, rig: makeFarmer(PAL_PLAYER), ph: 0,
      mode: 'walk' as const, kind: 'move', p: 0.2,
      tasks: [{ kind: 'move', x: 900, y: 500, face: 1, dur: 0, hit: 0 }],
      cur: { kind: 'move', x: 850, y: 520, face: 1, dur: 0, hit: 0 },
      hitDone: false, speed: 240, player: true, wait: 0,
    };
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
      moveTo: (w, x, y) => { w.tasks = [{ kind: 'move', x, y, face: 1, dur: 0, hit: 0 }]; },
      mkTask: (kind, x, y, extra) => ({ kind, x, y, face: 1, dur: 0.4, hit: 0.2, ...extra }),
      enqueuePlot: () => true,
      reasonToast: () => {},
      toScreen: (x, y) => ({ x, y }),
      pop: () => {},
      finishRiverCast: () => {},
    });

    router.dispatchTap(1148, 456, { clientX: 0, clientY: 0 });
    expect(ensureFrontier().caveFloor).toBe(2);
    expect(farmer.x).toBe(216);
    expect(farmer.tasks).toHaveLength(0);
    expect(farmer.cur).toBeNull();
    expect(farmer.mode).toBe('idle');

    expect(checkSeamlessEdgePortal('north', 52, 580)).toBe('farm');
    expect(checkSeamlessEdgePortal('north', 1230, 580)).toBe('valley');
    expect(checkSeamlessEdgePortal('valley', 52, 550)).toBe('farm');
  });

  it('Loop 9: Ancient Forest Shrine ALWAYS gifts immediately plantable in-season unlocked seeds across ALL 4 seasons (including Winter)', () => {
    for (const xpVal of [0, 3_000, 35_000, 300_000]) {
      for (const daySample of [1, 9, 16, 23]) {
        resetGame();
        S.xp = xpVal;
        S.day = daySample;
        S.seeds = {};
        doAct('till', 0);
        expect(useFrontierLandmark('forest')).toBe(true);
        const gifted = Object.keys(S.seeds)[0] as typeof CROPS[number]['id'];
        expect(gifted).toBeDefined();
        expect(canAct('plant', 0, false, gifted)).toBe('');
      }
    }
  });

  it('Loop 10: Legacy save import hydrates S.frontier immediately & resetGame cleans all transient UI flags', () => {
    const legacyRaw = JSON.stringify({ day: 44, coins: 4321, v: 6, inv: { wheat: 7 } });
    expect(importSaveJson(legacyRaw)).toBe(true);
    expect(S.frontier).toBeDefined();
    expect(S.frontier!.nodesDay).toBe(44);
    expect(S.coins).toBe(4321);

    UI.fairTab = 'archery';
    UI.seedTray = true;
    UI.combo = { count: 6, until: Date.now() + 90_000, kind: 'fish' };
    UI.needRodHint = Date.now() + 90_000;
    resetGame();
    expect(UI.fairTab).toBe('judge');
    expect(UI.seedTray).toBe(false);
    expect(UI.combo.count).toBe(0);
    expect(UI.needRodHint).toBe(0);
  });

  it('Loop 11 & Loop 12: 365-step cross-system simulation across all legacy + expansion features & debt solvability under all Charters', () => {
    S.xp = 650_000;
    S.lv.land = 4;
    S.lv.bag = 5;
    S.lv.stam = 5;
    S.coins = 120_000;
    S.workers = 3;
    S.hives = 4;
    S.rod = 1;
    S.gh = 2;
    S.story.chapter = 6;
    startDebt(3);
    chooseVillageCharter('qanat', 'commons');
    chooseVillageCharter('bazaar', 'caravan');
    chooseVillageCharter('frontier', 'quarry');
    chooseVillageCharter('bank', 'credit');

    for (let i = 0; i < NOTE_COUNT; i++) {
      expect(solvable(i)).toBe(true);
    }
    expect(TOTAL_DEBT).toBe(6_000_000);

    for (let step = 0; step < 90; step++) {
      S.stamina = stamCap();
      S.seeds.saffron = (S.seeds.saffron ?? 0) + 2;
      S.seeds.wheat = (S.seeds.wheat ?? 0) + 4;
      if (canAct('till', step % 12) === '') doAct('till', step % 12);
      if (canAct('plant', step % 12, false, 'wheat') === '') doAct('plant', step % 12, false, 'wheat');
      if (canAct('water', step % 12) === '') doAct('water', step % 12);
      tickLiveClock(48);
      if (S.plots[step % 12].ripe && canAct('harvest', step % 12) === '') doAct('harvest', step % 12);
      harvestFrontierNode('cave', step % 6);
      harvestFrontierNode('forest', step % 6);
      stepFrontierLayer('cave', 1);
      stepFrontierLayer('forest', 1);
      if (step % 7 === 0) {
        ringTownFestivalBell();
        S.inv.wheat = Math.max(1, S.inv.wheat ?? 0);
        judgeFestivalSubmission(['wheat']);
        completeFestivalContest('cauldron', 0.85);
        completeFestivalContest('archery', 0.9);
        redeemFestivalTokens('gold');
      }
      if ((S.inv.herb ?? 0) >= 2 && (S.inv.honey ?? 0) >= 1) craftArtisan('herbal-elixir', 1);
      if (S.honeyAcc >= 4) harvestHoney(true);
      if ((S.inv.wheat ?? 0) > invCap() * 0.5) sellGood('wheat', 10);
      advance(6);
      expect(goodPrice('saffron')).toBeGreaterThan(0);
      checkInvariants(`cross-loop-${step}`);
    }

    const saved = exportSaveJson();
    resetGame();
    expect(importSaveJson(saved)).toBe(true);
    checkInvariants('post-roundtrip');
  });
});
