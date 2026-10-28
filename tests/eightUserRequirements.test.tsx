import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installDom } from './helpers/dom';
import {
  COLS, ROWS, WORKER_MAX, WORKER_LV, WORKER_PRICES, isUnlocked, plotsOf,
} from '../src/game/data';
import {
  ESTATES, NORTH_PLOTS_COUNT, VALLEY_PLOTS_COUNT, isEstateOwned,
} from '../src/game/estates';
import {
  S, UI, advance, buyUpgrade, buyWorker, canAct, doAct, plotsForFarm, resetGame, startDebt, tickBuilds,
} from '../src/game/state';
import { safeSceneMark, beginSceneStage, cinema } from '../src/game/cinemaStage';
import { NODES } from '../src/story/story';
import { TOWN_ACTORS } from '../src/story/townNpc';
import { areaFor, compileSceneScript } from '../src/story/sceneScripts';
import { advanceNode, pendingNode, talkToTownNpc } from '../src/story/engine';
import { isQuestDone } from '../src/story/quests';
import { npcHasQuestMarker, isNpcQuestActive, NPC_QUEST_SPECS } from '../src/story/npcQuests';
import { npcOverheadLayout } from '../src/game/npcLabels';
import { updateSetting } from '../src/game/settings';
import { Hud } from '../src/ui/Hud';
import { Estate } from '../src/ui/Shops2';
import { Quests } from '../src/ui/Quests';

beforeAll(() => { installDom(); });

const FARM_HOUSE_WINDOWS = [
  { x0: 102, y0: 172, x1: 150, y1: 220 },
  { x0: 228, y0: 172, x1: 276, y1: 220 },
];

const TOWN_SHOP_WINDOWS = [150, 350, 550, 750, 950, 1150].flatMap((cx, kind) =>
  kind === 5
    ? [
        { x0: cx - 84, y0: 304, x1: cx - 56, y1: 334 },
        { x0: cx - 30, y0: 304, x1: cx - 2, y1: 334 },
        { x0: cx + 26, y0: 304, x1: cx + 54, y1: 334 },
        { x0: cx + 78, y0: 304, x1: cx + 106, y1: 334 },
        { x0: cx - 80, y0: 378, x1: cx - 52, y1: 408 },
        { x0: cx + 54, y0: 378, x1: cx + 82, y1: 408 },
      ]
    : [
        { x0: cx - 80, y0: 374, x1: cx - 52, y1: 404 },
        { x0: cx + 52, y0: 374, x1: cx + 80, y1: 404 },
      ],
);

function rectsOverlap(
  a: { x0: number; y0: number; x1: number; y1: number },
  b: { x0: number; y0: number; x1: number; y1: number },
): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

describe('۸ الزام جدید توسعهٔ جهان، مکالمهٔ بدون تداخل پنجره، نام/شغل و علامت کوئست، کارگران سه‌مزرعه و قفل سرعت ۱×', () => {
  beforeEach(() => {
    localStorage.clear();
    resetGame();
    updateSetting('locale', 'fa');
    UI.started = true;
  });

  it('۱: تمام ۴۰ کرت مزرعهٔ اصلی از همان ثانیهٔ اول بازی بدون هیچ قفلی باز و قابل شخم/کاشت هستند', () => {
    expect(S.lv.land).toBe(0);
    expect(S.plots.length).toBe(COLS * ROWS);
    expect(plotsOf(0)).toBe(40);
    for (let i = 0; i < 40; i++) {
      expect(isUnlocked(i, 0)).toBe(true);
      expect(canAct('till', i, true, undefined, 'farm')).toBe('');
    }
    doAct('till', 39, true, undefined, true, 'farm');
    S.seeds.wheat = 5;
    expect(canAct('plant', 39, true, 'wheat', 'farm')).toBe('');
    doAct('plant', 39, true, 'wheat', true, 'farm');
    expect(S.plots[39].st).toBe(2);
  });

  it('۲ و ۳: دو مزرعهٔ بزرگ‌تر (۵۴ و ۶۰ کرت > ۴۰ کرت)، جاده‌ها، نوار ناوبری ۶گانه، خرید مرحله‌ای سند و خط داستانی اختصاصی هر مزرعه', () => {
    expect(NORTH_PLOTS_COUNT).toBe(54);
    expect(NORTH_PLOTS_COUNT).toBeGreaterThan(COLS * ROWS);
    expect(VALLEY_PLOTS_COUNT).toBe(60);
    expect(VALLEY_PLOTS_COUNT).toBeGreaterThan(NORTH_PLOTS_COUNT);
    expect(S.northPlots.length).toBe(54);
    expect(S.valleyPlots.length).toBe(60);

    expect(isEstateOwned('farm', 0)).toBe(true);
    expect(isEstateOwned('north', 0)).toBe(false);
    expect(isEstateOwned('valley', 0)).toBe(false);
    expect(canAct('till', 0, true, undefined, 'north')).toBe('locked');
    expect(canAct('till', 0, true, undefined, 'valley')).toBe('locked');

    S.xp = 900_000;
    S.coins = 900_000;
    buyUpgrade('land');
    tickBuilds(999);
    expect(S.lv.land).toBe(1);
    expect(isEstateOwned('north', S.lv.land)).toBe(true);
    expect(plotsOf(S.lv.land)).toBe(94);
    expect(canAct('till', 53, true, undefined, 'north')).toBe('');

    buyUpgrade('land');
    tickBuilds(999);
    buyUpgrade('land');
    tickBuilds(999);
    expect(S.lv.land).toBe(3);
    expect(isEstateOwned('valley', S.lv.land)).toBe(true);
    expect(plotsOf(S.lv.land)).toBe(154);
    expect(canAct('till', 59, true, undefined, 'valley')).toBe('');

    for (const id of [
      'area-intro-north', 'estate-north-bought', 'estate-north-qanat', 'estate-north-harvest',
      'area-intro-valley', 'estate-valley-bought', 'estate-valley-legacy', 'estate-valley-harvest',
    ]) {
      expect(NODES[id], `missing story node ${id}`).toBeTruthy();
      expect(NODES[id].lines.length).toBeGreaterThanOrEqual(2);
    }
    expect(areaFor('area-intro-north')).toBe('north');
    expect(areaFor('estate-north-bought')).toBe('north');
    expect(areaFor('area-intro-valley')).toBe('valley');
    expect(areaFor('estate-valley-bought')).toBe('valley');

    const hudHtml = renderToStaticMarkup(<Hud />);
    expect(hudHtml.split('<button').length - 1).toBeGreaterThanOrEqual(6);
    const estateHtml = renderToStaticMarkup(<Estate />);
    expect(estateHtml).toContain('۵۴');
    expect(estateHtml).toContain('۶۰');
    expect(ESTATES.north.cols * ESTATES.north.rows).toBe(54);
    expect(ESTATES.valley.cols * ESTATES.valley.rows).toBe(60);
  });

  it('۴: در هیچ صحنه‌ای (مزرعه کنار خانه، شهر مقابل مغازه‌ها، مزارع جدید) سر و صورت هیچ شخصیتی روی پنجره نمی‌افتد', () => {
    for (const rawX of [90, 126, 190, 250, 310, 980, 1140]) {
      for (const rawY of [180, 240, 294, 304, 340]) {
        const p = safeSceneMark('farm', rawX, rawY);
        const headBox = { x0: p.x - 24, y0: p.y - 128, x1: p.x + 24, y1: p.y - 70 };
        for (const win of FARM_HOUSE_WINDOWS) {
          expect(rectsOverlap(headBox, win)).toBe(false);
        }
      }
    }

    for (const a of TOWN_ACTORS) {
      for (const [mx, my] of [a.morning, a.noon, a.evening]) {
        const headBox = { x0: mx - 24, y0: my - 128, x1: mx + 24, y1: my - 70 };
        for (const win of TOWN_SHOP_WINDOWS) {
          expect(rectsOverlap(headBox, win)).toBe(false);
        }
      }
    }

    for (const sceneId of ['p1', 'p2', 'p3', 'p4', 'visit-due-missed', 'town-grandma-0', 'sharkhar-ch1-debt']) {
      const sc = compileSceneScript(sceneId)!;
      beginSceneStage(sc);
      expect(cinema.active).toBe(true);
      for (const m of sc.initialMarks) {
        const safe = safeSceneMark(sc.area, m.x, m.y);
        const headBox = { x0: safe.x - 24, y0: safe.y - 128, x1: safe.x + 24, y1: safe.y - 70 };
        if (sc.area === 'farm') {
          for (const win of FARM_HOUSE_WINDOWS) expect(rectsOverlap(headBox, win)).toBe(false);
        } else if (sc.area === 'town') {
          for (const win of TOWN_SHOP_WINDOWS) expect(rectsOverlap(headBox, win)).toBe(false);
        }
      }
    }
  });

  it('۵ و ۶: بالای سر NPC نام + شغل قرار می‌گیرد، صفر آیکون روی صورت می‌نشیند، و علامت تعجب زرد دقیقاً بالای نام و فقط هنگام کوئست قابل‌فعالسازی نمایش داده می‌شود', () => {
    startDebt(0);
    S.story.chapter = 1;
    S.story.prologueSeen = true;

    expect(NPC_QUEST_SPECS.length).toBeGreaterThanOrEqual(8);
    expect(npcHasQuestMarker('grandma')).toBe(true);
    expect(npcHasQuestMarker('sara')).toBe(false);
    S.xp = 1500;
    expect(npcHasQuestMarker('sara')).toBe(true);
    expect(npcHasQuestMarker('jahangir')).toBe(false);

    // وقتی کوئست فصل ۱ انجام شده و سکهٔ تسویهٔ سند آماده است، علامت تعجب زرد بالای نام جهانگیر روشن می‌شود!
    S.stats.harv = 50;
    S.coins = 50_000;
    expect(isQuestDone(1)).toBe(true);
    expect(npcHasQuestMarker('jahangir')).toBe(true);

    const withMarker = npcOverheadLayout('grandma', 300, 582, 0.72);
    expect(withMarker).not.toBeNull();
    expect(withMarker!.plateBottomY).toBeLessThanOrEqual(582 - 126);
    expect(withMarker!.questBangCenterY).toBeLessThan(withMarker!.plateTopY);
    expect(withMarker!.hasQuest).toBe(true);
    expect(withMarker!.name.length).toBeGreaterThan(2);
    expect(withMarker!.role.length).toBeGreaterThan(2);

    // صحبت در شهر با مادرجون کوئست واقعی او را بدون پرش صحنه فعال می‌کند و علامت ! خاموش می‌شود
    UI.scene = 'town';
    const node = talkToTownNpc(0)!;
    expect(node.id).toBe('npc-q-grandma-1-start');
    expect(areaFor(node.id)).toBe('town');
    while (pendingNode()) {
      expect(UI.scene).toBe('town');
      advanceNode(pendingNode()!);
    }
    const grandmaSpec = NPC_QUEST_SPECS.find((q) => q.id === 'npc-q-grandma-1')!;
    expect(isNpcQuestActive(grandmaSpec)).toBe(true);
    // چون S.stats.harv = 50 >= 12 آمادهٔ تحویل است، علامت ! برای دریافت جایزه روشن می‌ماند و پس از دریافت جایزه خاموش می‌شود!
    expect(npcHasQuestMarker('grandma')).toBe(true);
    const doneNode = talkToTownNpc(0)!;
    expect(doneNode.id).toBe('npc-q-grandma-1-done');
    while (pendingNode()) advanceNode(pendingNode()!);
    expect(npcHasQuestMarker('grandma')).toBe(false);

    const questsHtml = renderToStaticMarkup(<Quests />);
    expect(questsHtml.length).toBeGreaterThan(80);

    updateSetting('locale', 'en');
    const enLayout = npcOverheadLayout('engineer', 566, 582, 0.79)!;
    expect(/[\u0600-\u06FF]/.test(enLayout.name)).toBe(false);
    expect(/[\u0600-\u06FF]/.test(enLayout.role)).toBe(false);
  });

  it('۷: کارگران تا ۵ نفر هماهنگ با مزارع جدید استخدام می‌شوند و بدون هیچ باگی در هر ۳ مزرعه هم‌زمان کار می‌کنند', () => {
    expect(WORKER_MAX).toBe(5);
    expect(WORKER_LV.length).toBe(5);
    expect(WORKER_PRICES.length).toBe(5);

    S.xp = 9_500_000;
    S.coins = 950_000;
    S.lv.land = 3; // هر ۳ مزرعه باز: ۴۰ + ۵۴ + ۶۰ = ۱۵۴ کرت
    for (let w = 0; w < 5; w++) buyWorker();
    expect(S.workers).toBe(5);
    buyWorker();
    expect(S.workers).toBe(5);

    S.seeds.wheat = 60;
    doAct('till', 0, true, undefined, true, 'farm');
    doAct('till', 0, true, undefined, true, 'north');
    doAct('till', 0, true, undefined, true, 'valley');

    S.hour = 7;
    advance(48);

    const plantedFarm = plotsForFarm('farm').filter((p) => p.st === 2).length;
    const plantedNorth = plotsForFarm('north').filter((p) => p.st === 2).length;
    const plantedValley = plotsForFarm('valley').filter((p) => p.st === 2).length;
    expect(plantedFarm).toBeGreaterThan(0);
    expect(plantedNorth).toBeGreaterThan(0);
    expect(plantedValley).toBeGreaterThan(0);
  });

  it('۸: قابلیت چند برابر کردن سرعت بازی کاملاً حذف شده و UI.speed همیشه روی ۱× قفل است', () => {
    expect(UI.speed).toBe(1);
    const hudFa = renderToStaticMarkup(<Hud />);
    expect(hudFa).not.toContain('۲×');
    expect(hudFa).not.toContain('۳×');
    expect(hudFa).not.toContain('2×');
    expect(hudFa).not.toContain('3×');

    updateSetting('locale', 'en');
    const hudEn = renderToStaticMarkup(<Hud />);
    expect(hudEn).not.toContain('2×');
    expect(hudEn).not.toContain('3×');
    expect(UI.speed).toBe(1);
  });
});
