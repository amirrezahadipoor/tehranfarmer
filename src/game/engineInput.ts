// Scene Tap Routing extracted from engine.ts to keep files modular (< 450 lines)
import {
  COLS, FISH_STAM, ROWS, isUnlocked,
} from './data';
import { ESTATES, estatePlotAt, estatePlotCenter, isEstateOwned, isFarmScene, type FarmSceneId } from './estates';
import { FEED_TROUGH, STRAW_NEST, unifiedPondGeom } from './farmZones';
import { POSTBOX_GEOM } from './postboxArt';
import { FIELD_X, FIELD_Y, PLOT_DX, PLOT_DY, RIVER_SPOTS } from './scenes';
import { S, UI, millAtNorthWindmill, drinkValleySpring, notify, toast } from './state';
import { handleFarmAnimalTap } from './farmVisuals';
import type { AR, Task, Walker } from './engineRender';
import { sfx } from './sound';
import { talkToSharkhar, talkToTownNpc } from '../story/engine';
import { checkSecretTriggers } from '../story/secrets';
import { tutOnPlotAction, tutTapOk } from './tutorial';
import { fishCast } from './worldVisuals';
import { GT } from '../strings/gameText';
import { FT } from '../strings/frontierText';
import type { CanvasPoint } from './touchBridge';
import {
  activeFrontierNodes, ensureFrontier, isFrontierNodeHarvested,
  isTownFestivalActive, stepFrontierLayer, useFrontierLandmark,
} from './core/frontier';
import { activeMineNodes, isMineNodeHarvested, stepMineFloor } from './core/mining';

const FX = FIELD_X, FY = FIELD_Y;
export const SHOPS = [{ id: 'seed', cx: 150 }, { id: 'market', cx: 350 }, { id: 'work', cx: 550 }, { id: 'animal', cx: 750 }, { id: 'carp', cx: 950 }, { id: 'estate', cx: 1150 }] as const;
const JAHANGIR_HUT = { cx: 1096, cy: 556 };

export interface SceneInputDeps {
  farmer: Walker;
  animals: Map<number, AR>;
  npcs: Walker[];
  jahangir: Walker;
  getDragLast: () => number;
  setDragLast: (v: number) => void;
  clearTrans: () => void;
  moveTo: (w: Walker, x: number, y: number, clearQ?: boolean) => void;
  mkTask: (kind: string, x: number, y: number, extra?: Partial<Task>) => Task;
  enqueuePlot: (kind: string, i: number) => boolean;
  reasonToast: (r: string) => void;
  toScreen: (x: number, y: number) => { x: number; y: number };
  pop: (x: number, y: number, icon: string, n?: number, text?: string) => void;
  finishRiverCast: () => void;
}

export function createSceneTapRouter(d: SceneInputDeps) {
  function farmTap(x: number, y: number, e: CanvasPoint, first: boolean) {
    if (first && Math.abs(x - STRAW_NEST.cx) < 44 && Math.abs(y - STRAW_NEST.cy) < 36) {
      d.farmer.tasks = []; d.farmer.cur = null;
      d.farmer.tasks.push(d.mkTask('straw', STRAW_NEST.walkX, STRAW_NEST.walkY, { face: -1, dur: 0.45, hit: 0.3 }));
      sfx.tap(); notify();
      return;
    }
    if (first) {
      for (const [id, a] of d.animals) {
        const hh = a.rig.h * a.sc;
        if (Math.abs(x - a.x) < a.rig.len * a.sc * 0.55 && y > a.y - hh && y < a.y + 14) {
          const s = S.animals.find((q) => q.id === id)!;
          if (handleFarmAnimalTap(s) === 'collect') {
            d.farmer.tasks = []; d.farmer.cur = null;
            d.farmer.tasks.push(d.mkTask('collect', a.x - 40 * a.face, a.y + 8, { animal: id, face: a.face }));
          } else { d.pop(a.x, a.y - hh - 10, 'star', 1); notify(); }
          return;
        }
      }
    }
    if (x >= FX && x < FX + COLS * PLOT_DX && y >= FY && y < FY + ROWS * PLOT_DY) {
      const i = Math.floor((y - FY) / PLOT_DY) * COLS + Math.floor((x - FX) / PLOT_DX);
      if (!first && i === d.getDragLast()) return;
      d.setDragLast(i);
      if (!isUnlocked(i, S.lv.land)) { if (first) d.reasonToast('locked'); return; }
      if (!tutTapOk(i)) { if (first) sfx.err(); return; } // آموزش روز اول: فقط کرت هدف با ابزار درست
      if (UI.tool === 'hand') {
        const pl = S.plots[i];
        if (pl && pl.st === 2 && pl.ripe && !pl.dead) {
          UI.info = null;
          if (d.enqueuePlot('harvest', i)) tutOnPlotAction(i);
          if (first) notify();
          return;
        }
        if (first) {
          const cx = FX + (i % COLS) * PLOT_DX + 44;
          const cy = FY + Math.floor(i / COLS) * PLOT_DY + 34;
          const sp = d.toScreen(cx, cy - 20);
          UI.info = UI.info?.plot === i ? null : { plot: i, x: sp.x, y: sp.y };
          UI.seedTray = false; notify();
        }
      } else { UI.info = null; if (d.enqueuePlot(UI.tool, i)) tutOnPlotAction(i); if (first) notify(); }
      return;
    }
    if (!first) return;
    UI.info = null;
    if ((x < 96 && y > 35 && y < 235) || (x > 290 && x < 515 && y > 35 && y < 198)) {
      if (checkSecretTriggers('tree-tap')) { sfx.tap(); return; }
    }
    // صندوق پست دست‌ساز کنار مسیر ایوان خانه: کشاورز کنار صندوق پست می‌رود و نامه‌ها باز می‌شوند
    if (x >= POSTBOX_GEOM.bbox.x0 - 2 && x <= POSTBOX_GEOM.bbox.x1 + 2 && y >= POSTBOX_GEOM.bbox.y0 - 4 && y <= POSTBOX_GEOM.bbox.y1 + 6) {
      d.moveTo(d.farmer, POSTBOX_GEOM.walkX, POSTBOX_GEOM.walkY);
      d.farmer.tasks.push(d.mkTask('open', POSTBOX_GEOM.walkX, POSTBOX_GEOM.walkY, { to: 'mail' }));
      sfx.tap();
      return;
    }
    if (x >= 342 && x < 420 && y > 150 && y < 270) { d.farmer.tasks = []; d.farmer.cur = null; d.farmer.tasks.push(d.mkTask('well', 372, 284, { face: -1 })); notify(); return; }
    if (x > 80 && x < 315 && y > 60 && y < 262) { d.moveTo(d.farmer, 187, 276); d.farmer.tasks.push(d.mkTask('open', 187, 276, { to: 'home' })); return; }
    // هر ۵ دروازهٔ خروجی (پلاک نام + تابلوی چوبی + پایه + دهانهٔ جاده) پیش از انبار/مترسک بررسی می‌شوند تا ۱۰۰٪ تک‌ضربه‌ای عمل کنند
    if (x >= 680 && x <= 924 && y >= 56 && y <= 246) { d.moveTo(d.farmer, 774, 212); d.farmer.tasks.push(d.mkTask('travel', 774, 212, { to: 'north' })); return; }
    if (x >= 1150 && y >= 210 && y <= 355) { d.moveTo(d.farmer, 1176, 336); d.farmer.tasks.push(d.mkTask('travel', 1176, 336, { to: 'town' })); return; }
    if (x >= 1146 && y > 355 && y <= 518) { d.moveTo(d.farmer, 1176, 484); d.farmer.tasks.push(d.mkTask('travel', 1176, 484, { to: 'valley' })); return; }
    if (x <= 165 && y >= 510 && y <= 665) { d.moveTo(d.farmer, 108, 608); d.farmer.tasks.push(d.mkTask('travel', 108, 608, { to: 'river' })); return; }
    if (x >= 244 && x <= 376 && y >= 534 && y <= 705) { d.moveTo(d.farmer, 304, 620); d.farmer.tasks.push(d.mkTask('travel', 304, 620, { to: 'apiary' })); return; }
    if (x > 905 && x < 1149 && y > 30 && y < 218) { d.moveTo(d.farmer, 1040, 240); d.farmer.tasks.push(d.mkTask('open', 1040, 240, { to: 'inv' })); return; }
    if (x >= 1152 && x <= 1256 && y > 520 && y <= 654) { if (!checkSecretTriggers('farm-step')) { UI.modal = 'ledger'; notify(); } sfx.tap(); return; }
    if (Math.abs(x - FEED_TROUGH.cx) < 58 && Math.abs(y - FEED_TROUGH.cy) < 28) {
      d.farmer.tasks = []; d.farmer.cur = null;
      d.farmer.tasks.push(d.mkTask('feed', FEED_TROUGH.walkX, FEED_TROUGH.walkY, { face: -1 }));
      return;
    }
    UI.seedTray = false;
    d.moveTo(d.farmer, Math.max(42, Math.min(1245, x)), Math.max(246, Math.min(680, y)));
    void e;
    notify();
  }

  function townTap(x: number, y: number) {
    UI.info = null;
    if (x <= 104 && y >= 435 && y <= 655) { d.moveTo(d.farmer, 108, 594); d.farmer.tasks.push(d.mkTask('travel', 108, 594, { to: 'farm' })); return; }
    for (const s of SHOPS) {
      if (Math.abs(x - s.cx) < 58 && y > 210 && y < 448) { d.moveTo(d.farmer, s.cx, 488); d.farmer.tasks.push(d.mkTask('open', s.cx, 488, { to: s.id })); return; }
    }
    for (let i = 0; i < d.npcs.length; i++) {
      const n = d.npcs[i];
      if (Math.abs(x - n.x) < 54 && y >= n.y - 216 && y <= n.y + 18) {
        d.clearTrans(); d.farmer.tasks = []; d.farmer.cur = null; d.farmer.mode = 'idle';
        talkToTownNpc(i); sfx.tap(); return;
      }
    }
    if (x < 1030 && Math.abs(x - d.jahangir.x) < 54 && y >= d.jahangir.y - 216 && y <= d.jahangir.y + 18) {
      d.clearTrans(); d.farmer.tasks = []; d.farmer.cur = null; d.farmer.mode = 'idle';
      talkToSharkhar(); sfx.tap(); return;
    }
    // دروازه و تابلوی خروجی غرب شهر به مزرعه پیش از مغازهٔ بذر (x=150) بررسی می‌شود تا هیچ ضربه‌ای روی تابلو وارد بذرفروشی نشود
    if (x <= 128 && y >= 435 && y <= 665) { d.moveTo(d.farmer, 108, 594); d.farmer.tasks.push(d.mkTask('travel', 108, 594, { to: 'farm' })); return; }
    // غرفه‌های تعاملی جشنوارهٔ فصلی میدان شهر (در ۳ دالان باز بین اهالی بدون کوچک‌ترین هم‌پوشانی با NPC یا مغازه!)
    if (isTownFestivalActive() && y >= 450 && y <= 512) {
      const fairBooths: readonly { x: number; tab: 'judge' | 'cauldron' | 'archery' }[] = [
        { x: 308, tab: 'judge' },
        { x: 504, tab: 'cauldron' },
        { x: 702, tab: 'archery' },
      ];
      for (const fb of fairBooths) {
        if (Math.abs(x - fb.x) <= 50) {
          UI.fairTab = fb.tab;
          d.moveTo(d.farmer, fb.x, 536);
          d.farmer.tasks.push(d.mkTask('open', fb.x, 536, { to: 'festival' }));
          return;
        }
      }
    }
    for (const s of SHOPS) {
      if (Math.abs(x - s.cx) < 92 && y > 210 && y < 448) { d.moveTo(d.farmer, s.cx, 488); d.farmer.tasks.push(d.mkTask('open', s.cx, 488, { to: s.id })); return; }
    }
    if ((Math.abs(x - JAHANGIR_HUT.cx) < 92 && y > 510 && y < 680) || (Math.abs(x - 1035) < 105 && y >= 575 && y < 710)) {
      d.moveTo(d.farmer, 1042, 634); d.farmer.tasks.push(d.mkTask('open', 1042, 634, { to: 'ledger' })); return;
    }
    if (S.story.postgame && ((Math.abs(x - 872) < 55 && y > 390 && y < 480) || (Math.abs(x - 825) < 70 && y > 580 && y < 705))) {
      d.moveTo(d.farmer, 872, 500); d.farmer.tasks.push(d.mkTask('open', 872, 500, { to: 'museum' })); return;
    }
    d.moveTo(d.farmer, Math.max(46, Math.min(1240, x)), Math.max(442, Math.min(648, y)));
  }

  function riverTap(x: number, y: number) {
    UI.info = null;
    if (fishCast.active) {
      d.finishRiverCast();
      return;
    }
    if (x >= 1130 && y >= 406 && y <= 640) {
      fishCast.armed = false;
      d.moveTo(d.farmer, 1168, 560); d.farmer.tasks.push(d.mkTask('travel', 1168, 560, { to: 'farm' })); return;
    }
    if (x <= 136 && y >= 470 && y <= 645) {
      fishCast.armed = false;
      d.moveTo(d.farmer, 104, 566); d.farmer.tasks.push(d.mkTask('travel', 104, 566, { to: 'cave' })); return;
    }
    const pg = unifiedPondGeom();
    if (x > pg.x0 - 24 && x < pg.x1 + 24 && Math.abs(y - pg.cy) < 48) {
      fishCast.armed = false;
      const targetX = Math.max(pg.x0 + 30, Math.min(pg.x1 - 30, x));
      d.moveTo(d.farmer, targetX, 504);
      d.farmer.tasks.push(d.mkTask('open', targetX, 504, { to: 'pond' }));
      return;
    }
    // هر نقطه از پهنهٔ آبی رودخانه و اسکله چوبی (y = 250..495) مستقیماً به جایگاه ساحلی یا روی اسکله متصل می‌شود
    if (y >= 250 && y < 495) {
      const onDock = x >= 995 && x <= 1205 && y >= 384 && y <= 462;
      let best = RIVER_SPOTS[0];
      for (const sp of RIVER_SPOTS) if (Math.abs(x - sp.x) < Math.abs(x - best.x)) best = sp;
      const castX = onDock ? 1100 : (Math.abs(x - best.x) < 95 ? best.x : Math.max(160, Math.min(960, x)));
      const standX = onDock ? 1094 : castX - 18;
      const standY = onDock ? 416 : 458;
      if (!S.rod) {
        UI.needRodHint = Date.now() + 6000;
        toast('fish', GT.g156);
        notify();
        return;
      }
      if (S.stamina < FISH_STAM) { d.reasonToast('tired'); return; }
      d.farmer.tasks = []; d.farmer.cur = null;
      d.farmer.tasks.push(d.mkTask('fish', standX, standY, { face: 1, dur: 3.4, hit: 3.25 }));
      const nearBank = Math.hypot(d.farmer.x - standX, d.farmer.y - standY) <= 44;
      fishCast.spotX = castX;
      fishCast.t = 0;
      fishCast.armed = !nearBank;
      fishCast.active = nearBank;
      if (nearBank) sfx.nibble(); else sfx.tap();
      notify();
      return;
    }
    fishCast.armed = false;
    d.moveTo(d.farmer, Math.max(42, Math.min(1245, x)), Math.max(482, Math.min(662, y)));
    notify();
  }

  function apiaryTap(x: number, y: number) {
    UI.info = null;
    if (x >= 1130 && y >= 450 && y <= 675) { d.moveTo(d.farmer, 1168, 608); d.farmer.tasks.push(d.mkTask('travel', 1168, 608, { to: 'farm' })); return; }
    if (x <= 136 && y >= 480 && y <= 675) { d.moveTo(d.farmer, 104, 612); d.farmer.tasks.push(d.mkTask('travel', 104, 612, { to: 'forest' })); return; }
    if (x >= 70 && x <= 246 && y >= 196 && y <= 372) {
      d.moveTo(d.farmer, 158, 376);
      d.farmer.tasks.push(d.mkTask('open', 158, 376, { to: 'inv' }));
      return;
    }
    if (x > 290 && x < 1265 && y > 295 && y < 600) {
      d.moveTo(d.farmer, 700, 608);
      d.farmer.tasks.push(d.mkTask('open', 700, 608, { to: 'hive' }));
      return;
    }
    d.moveTo(d.farmer, Math.max(42, Math.min(1245, x)), Math.max(372, Math.min(665, y)));
    notify();
  }

  function estateTap(farm: Exclude<FarmSceneId, 'farm'>, x: number, y: number, first: boolean) {
    const owned = isEstateOwned(farm, S.lv.land);
    const pIdx = estatePlotAt(farm, x, y);
    if (owned && pIdx >= 0) {
      if (!first && pIdx === d.getDragLast()) return;
      d.setDragLast(pIdx);
      if (UI.tool === 'hand') {
        const arr = farm === 'north' ? S.northPlots : S.valleyPlots;
        const pl = arr[pIdx];
        if (pl && pl.st === 2 && pl.ripe && !pl.dead) {
          UI.info = null; d.enqueuePlot('harvest', pIdx); if (first) notify();
          return;
        }
        if (first) {
          const { cx, cy } = estatePlotCenter(farm, pIdx);
          const sp = d.toScreen(cx, cy - 20);
          UI.info = UI.info?.plot === pIdx ? null : { plot: pIdx, x: sp.x, y: sp.y };
          UI.seedTray = false; notify();
        }
      } else { UI.info = null; d.enqueuePlot(UI.tool, pIdx); if (first) notify(); }
      return;
    }
    if (!first) return;
    UI.info = null;
    if (!owned && x > 450 && x < 830 && y > 290 && y < 430) { UI.modal = 'estate'; sfx.tap(); notify(); return; }
    // Interactive Northern Windmill (mills 2 wheat -> 6 feed on tap!)
    if (owned && farm === 'north' && x > 68 && x < 172 && y > 96 && y < 292) {
      const got = millAtNorthWindmill();
      if (got > 0) d.pop(118, 196, 'feed', 2);
      return;
    }
    // Interactive Sunlit Valley Waterfall Spring (+45 stamina daily + refills watering can!)
    if (owned && farm === 'valley' && x > 28 && x < 174 && y > 104 && y < 296) {
      drinkValleySpring();
      d.farmer.tasks = []; d.farmer.cur = null;
      d.farmer.tasks.push(d.mkTask('well', 224, 404, { face: -1 }));
      notify();
      return;
    }
    // Stone Barn on North/Valley opens Barn & Cauldron ('inv') just like Main Farm!
    if (owned && x > 1086 && x < 1315 && y > 95 && y < 226) {
      d.moveTo(d.farmer, 1152, 232);
      d.farmer.tasks.push(d.mkTask('open', 1152, 232, { to: 'inv' }));
      return;
    }
    if (x > 92 && x < 236 && y > 260 && y < 412) {
      d.farmer.tasks = []; d.farmer.cur = null; d.farmer.tasks.push(d.mkTask('well', farm === 'valley' ? 226 : 196, farm === 'valley' ? 404 : 362, { face: -1 })); notify(); return;
    }
    if (x >= 1140 && y >= 228 && y <= 425) { d.moveTo(d.farmer, 1178, 356); d.farmer.tasks.push(d.mkTask('travel', 1178, 356, { to: 'town' })); return; }
    if (farm === 'north' && x >= 1120 && y > 435) { d.moveTo(d.farmer, 1170, 588); d.farmer.tasks.push(d.mkTask('travel', 1170, 588, { to: 'valley' })); return; }
    if (farm === 'valley' && x <= 168 && y >= 316 && y <= 466) { d.moveTo(d.farmer, 114, 466); d.farmer.tasks.push(d.mkTask('travel', 114, 466, { to: 'north' })); return; }
    if (x <= 168 && y > 466) { d.moveTo(d.farmer, 114, 594); d.farmer.tasks.push(d.mkTask('travel', 114, 594, { to: 'farm' })); return; }
    UI.seedTray = false;
    void ESTATES;
    const walkY = farm === 'valley' && x < 176 && y < 306 ? 314 : Math.max(240, Math.min(680, y));
    d.moveTo(d.farmer, Math.max(42, Math.min(1245, x)), walkY);
    notify();
  }

  function frontierTap(scene: 'cave' | 'forest', x: number, y: number) {
    UI.info = null;
    const f = ensureFrontier();
    const layer = scene === 'cave' ? f.caveFloor : f.forestLayer;
    // ناحیهٔ لمسی کل طاق خروج، نه فقط تابلوی پایین آن.
    if (x >= 76 && x <= 220 && y >= 294 && y <= 680) {
      d.moveTo(d.farmer, 142, 604);
      d.farmer.tasks.push(d.mkTask('travel', 142, 604, { to: scene === 'cave' ? 'river' : 'apiary' }));
      sfx.tap();
      return;
    }
    if (scene === 'forest' && Math.abs(x - 640) <= 86 && y >= 250 && y <= 425) {
      d.moveTo(d.farmer, 640, 424);
      if (useFrontierLandmark(scene)) d.pop(640, 336, 'star', 2);
      return;
    }
    // آسانسور معدن با پیشرفت قطعی و گذرگاه جنگل با جمع‌آوری باز می‌شود.
    if (layer < 3 && x >= 1072 && x <= 1224 && y >= 252 && y <= 574) {
      if (scene === 'cave' ? stepMineFloor(1) : stepFrontierLayer(scene, 1)) {
        d.farmer.tasks = []; d.farmer.cur = null; d.farmer.mode = 'idle';
        d.farmer.x = 216; d.farmer.y = 594; d.farmer.face = 1;
      } else if (scene === 'cave') {
        toast('hammer', FT.stairsLocked);
        sfx.err();
      }
      return;
    }
    if (layer > 1 && x >= 916 && x <= 1044 && y >= 282 && y <= 574) {
      if (scene === 'cave' ? stepMineFloor(-1) : stepFrontierLayer(scene, -1)) {
        d.farmer.tasks = []; d.farmer.cur = null; d.farmer.mode = 'idle';
        d.farmer.x = 1040; d.farmer.y = 560; d.farmer.face = -1;
      }
      return;
    }
    for (const spot of scene === 'cave' ? activeMineNodes() : activeFrontierNodes(scene)) {
      if (scene === 'cave' ? isMineNodeHarvested(spot.idx) : isFrontierNodeHarvested(scene, spot.idx)) continue;
      if (Math.hypot(x - spot.x, y - spot.y) <= 66) {
        if (S.stamina < spot.stam) { d.reasonToast('tired'); return; }
        d.farmer.tasks = []; d.farmer.cur = null; d.farmer.mode = 'idle';
        d.farmer.tasks.push(d.mkTask('mine', spot.x - 42, Math.max(450, spot.y + 10), {
          node: spot.idx, face: 1,
        }));
        sfx.tap();
        notify();
        return;
      }
    }
    d.moveTo(d.farmer, Math.max(46, Math.min(1238, x)), Math.max(426, Math.min(668, y)));
    notify();
  }

  function dispatchTap(x: number, y: number, e: CanvasPoint) {
    if (UI.scene === 'farm') farmTap(x, y, e, true);
    else if (UI.scene === 'north' || UI.scene === 'valley') estateTap(UI.scene, x, y, true);
    else if (UI.scene === 'town') townTap(x, y);
    else if (UI.scene === 'river') riverTap(x, y);
    else if (UI.scene === 'cave' || UI.scene === 'forest') frontierTap(UI.scene, x, y);
    else apiaryTap(x, y);
  }

  /** Semantic DOM controls resolve to the very same hit areas as pointer/touch input. */
  function activateTarget(id: string): boolean {
    const tap = (x: number, y: number) => { dispatchTap(x, y, { clientX: 0, clientY: 0 }); return true; };
    const plot = /^plot:(\d+)$/.exec(id);
    if (plot && isFarmScene(UI.scene)) {
      const { cx, cy } = estatePlotCenter(UI.scene, Number(plot[1]));
      return tap(cx, cy);
    }
    const animal = /^animal:(\d+)$/.exec(id);
    if (animal && UI.scene === 'farm') {
      const ar = d.animals.get(Number(animal[1]));
      if (!ar) return false;
      return tap(ar.x, ar.y - ar.rig.h * ar.sc * 0.5);
    }
    if (id.startsWith('shop:') && UI.scene === 'town') {
      const shop = SHOPS.find((s) => s.id === id.slice(5));
      return shop ? tap(shop.cx, 320) : false;
    }
    if (id.startsWith('npc:') && UI.scene === 'town') {
      const npc = d.npcs[Number(id.slice(4))];
      return npc ? tap(npc.x, npc.y - 80) : false;
    }
    if (id.startsWith('fair:') && UI.scene === 'town') {
      const x = id === 'fair:judge' ? 308 : id === 'fair:cauldron' ? 504 : id === 'fair:archery' ? 702 : 0;
      return x ? tap(x, 480) : false;
    }
    if (id.startsWith('fish:') && UI.scene === 'river') {
      if (id === 'fish:finish') return tap(640, 300);
      const spot = RIVER_SPOTS[Number(id.slice(5))];
      return spot ? tap(spot.x, 300) : false;
    }
    if (id.startsWith('node:') && (UI.scene === 'cave' || UI.scene === 'forest')) {
      const idx = Number(id.slice(5));
      const spot = (UI.scene === 'cave' ? activeMineNodes() : activeFrontierNodes('forest')).find((n) => n.idx === idx);
      return spot ? tap(spot.x, spot.y) : false;
    }
    if (id === 'home' && UI.scene === 'farm') return tap(180, 160);
    if (id === 'well' && UI.scene === 'farm') return tap(380, 200);
    if (id === 'well' && (UI.scene === 'north' || UI.scene === 'valley')) return tap(150, 330);
    if (id === 'feed' && UI.scene === 'farm') return tap(FEED_TROUGH.cx, FEED_TROUGH.cy);
    if (id === 'straw' && UI.scene === 'farm') return tap(STRAW_NEST.cx, STRAW_NEST.cy);
    if (id === 'mail' && UI.scene === 'farm') return tap((POSTBOX_GEOM.bbox.x0 + POSTBOX_GEOM.bbox.x1) / 2, (POSTBOX_GEOM.bbox.y0 + POSTBOX_GEOM.bbox.y1) / 2);
    if (id === 'ledger' && UI.scene === 'farm') return tap(1200, 580);
    if (id === 'windmill' && UI.scene === 'north') return tap(118, 196);
    if (id === 'spring' && UI.scene === 'valley') return tap(100, 200);
    if (id === 'barn' && UI.scene === 'farm') return tap(1040, 130);
    if (id === 'barn' && (UI.scene === 'north' || UI.scene === 'valley')) return tap(1152, 150);
    if (id === 'barn' && UI.scene === 'apiary') return tap(158, 280);
    if (id === 'hive' && UI.scene === 'apiary') return tap(700, 400);
    if (id === 'pond' && UI.scene === 'river') { const pg = unifiedPondGeom(); return tap((pg.x0 + pg.x1) / 2, pg.cy); }
    if (id === 'sharkhar' && UI.scene === 'town') return tap(d.jahangir.x, d.jahangir.y - 80);
    if (id === 'museum' && UI.scene === 'town') return tap(872, 430);
    if (id === 'shrine' && UI.scene === 'forest') return tap(640, 336);
    if (id === 'layer:next' && (UI.scene === 'cave' || UI.scene === 'forest')) return tap(1148, 400);
    if (id === 'layer:prev' && (UI.scene === 'cave' || UI.scene === 'forest')) return tap(980, 400);
    return false;
  }

  return { farmTap, estateTap, dispatchTap, activateTarget };
}
