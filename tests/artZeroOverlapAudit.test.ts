import { describe, expect, it, beforeEach } from 'vitest';
import { resetGame, S } from '../src/game/state';
import { FIELD_X, FIELD_Y, HIVE_SLOTS, POND_SLOTS, PLOT_DX, PLOT_DY, RIVER_SPOTS } from '../src/game/scenes';
import { ESTATES } from '../src/game/estates';
import { FEED_TROUGH, RANCH_PEN_SLOTS, STRAW_NEST, unifiedPondGeom } from '../src/game/farmZones';
import { TOWN_ACTORS, npcTargetAt } from '../src/story/townNpc';
import { npcOverheadLayout, safeSceneMark } from '../src/game/npcLabels';
import { JAHANGIR_HUT } from '../src/game/engine';
import { POSTBOX_GEOM } from '../src/game/postboxArt';

interface Box {
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

function expectPairwiseDisjoint(boxes: Box[]) {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(overlaps(boxes[i], boxes[j]), `${boxes[i].name} overlapped ${boxes[j].name}`).toBe(false);
    }
  }
}

function signpostBox(name: string, x: number, y: number): Box {
  return { name, x0: x - 56, y0: y - 108, x1: x + 56, y1: y + 6 };
}

describe('Comprehensive 6-scene zero-overlap art layout audit', () => {
  beforeEach(() => {
    resetGame();
  });

  it('Farm scene: buildings, 6 pens, 4 ranch service stations, 5 signposts, machinery, field, scarecrow & HUD never overlap', () => {
    const farmBed: Box = {
      name: 'farm-bed',
      x0: FIELD_X - 8,
      y0: FIELD_Y - 8,
      x1: FIELD_X + 8 * PLOT_DX + 8,
      y1: FIELD_Y + 5 * PLOT_DY + 8,
    };
    const topHudLeft: Box = { name: 'hud-top-left', x0: 10, y0: 10, x1: 486, y1: 68 };
    const topHudRight: Box = { name: 'hud-top-right', x0: 846, y0: 10, x1: 1270, y1: 132 };
    const navBar: Box = { name: 'hud-nav', x0: 10, y0: 636, x1: 256, y1: 708 };
    const toolBar: Box = { name: 'hud-tools', x0: 454, y0: 602, x1: 996, y1: 710 };
    const tractorBtn: Box = { name: 'hud-tractor', x0: 1180, y0: 626, x1: 1270, y1: 712 };

    const pens: Box[] = RANCH_PEN_SLOTS.map((p, idx) => ({
      name: `pen-${idx}`,
      x0: p.x0,
      y0: p.y0,
      x1: p.x1,
      y1: p.y1,
    }));
    expectPairwiseDisjoint(pens);

    // Every pen splits strictly into left shelter strip [x0..x0+60] vs right live wander area [x0+64..x1-22]
    RANCH_PEN_SLOTS.forEach((pr, idx) => {
      const shelter: Box = { name: `pen-${idx}-shelter`, x0: pr.x0 + 4, y0: pr.y0 + 4, x1: pr.x0 + 60, y1: pr.y1 - 4 };
      const wander: Box = { name: `pen-${idx}-wander`, x0: pr.x0 + 64, y0: pr.y0 + 28, x1: pr.x1 - 22, y1: pr.y1 - 6 };
      expect(overlaps(shelter, wander)).toBe(false);
    });

    const ranchServiceRow: Box[] = [
      { name: 'collector', x0: 120, y0: 476, x1: 156, y1: 516 },
      { name: 'straw-nest', x0: STRAW_NEST.cx - 24, y0: STRAW_NEST.cy - 18, x1: STRAW_NEST.cx + 24, y1: STRAW_NEST.cy + 16 },
      { name: 'feed-trough', x0: FEED_TROUGH.cx - 42, y0: FEED_TROUGH.cy - 18, x1: FEED_TROUGH.cx + 42, y1: FEED_TROUGH.cy + 16 },
      { name: 'feeder', x0: 336, y0: 476, x1: 372, y1: 516 },
    ];
    expectPairwiseDisjoint(ranchServiceRow);

    const farmLandmarks: Box[] = [
      farmBed,
      topHudLeft,
      topHudRight,
      navBar,
      toolBar,
      tractorBtn,
      ...pens,
      ...ranchServiceRow,
      { name: 'farmhouse', x0: 70, y0: 96, x1: 292, y1: 248 },
      { name: 'postbox', ...POSTBOX_GEOM.bbox },
      { name: 'pergola', x0: 24, y0: 186, x1: 68, y1: 246 },
      { name: 'tilepool', x0: 296, y0: 240, x1: 340, y1: 264 },
      { name: 'well', x0: 342, y0: 160, x1: 410, y1: 256 },
      { name: 'machinery-pad', x0: 434, y0: 152, x1: 634, y1: 196 },
      signpostBox('sign-north', 696, 232),
      { name: 'mountain-arch', x0: 766, y0: 88, x1: 842, y1: 160 },
      { name: 'silo', x0: 894, y0: 166, x1: 926, y1: 230 },
      { name: 'barn', x0: 930, y0: 136, x1: 1190, y1: 232 },
      signpostBox('sign-town', 1216, 344),
      signpostBox('sign-valley', 1212, 464),
      { name: 'scarecrow', x0: 1156, y0: 474, x1: 1236, y1: 624 },
      signpostBox('sign-river', 60, 628),
      signpostBox('sign-apiary', 316, 628),
    ];
    expectPairwiseDisjoint(farmLandmarks);
  });

  it('Town scene: all 6 shops, alleys, NPC bodies + overhead nameplates + ! badges, fountain, statue & Jahangir cabin never overlap', () => {
    S.story.chapter = 1;
    S.story.prologueSeen = true;
    S.xp = 5000;

    const shopXs = [150, 350, 550, 750, 950, 1150];
    const shops: Box[] = shopXs.map((cx, i) => ({
      name: `shop-${i}`,
      x0: cx - 86,
      y0: 218,
      x1: cx + 86,
      y1: 406,
    }));
    expectPairwiseDisjoint(shops);

    const npcRoles = ['grandma', 'sara', 'engineer', 'rancher'] as const;
    const npcScales = [0.71, 0.74, 0.79, 0.81];
    for (const hour of [8, 13, 19]) {
      const boxes: Box[] = [
        ...shops,
        { name: 'fountain', x0: 464, y0: 412, x1: 548, y1: 460 },
        { name: 'postgame-statue', x0: 874, y0: 410, x1: 910, y1: 452 },
        { name: 'jahangir-cabin', x0: JAHANGIR_HUT.cx - 74, y0: JAHANGIR_HUT.cy - 104, x1: JAHANGIR_HUT.cx + 58, y1: JAHANGIR_HUT.cy + 6 },
        signpostBox('town-sign-farm', 68, 608),
      ];
      TOWN_ACTORS.forEach((_, i) => {
        const [nx, ny] = npcTargetAt(i, hour);
        const lay = npcOverheadLayout(npcRoles[i], nx, ny, npcScales[i], 0)!;
        boxes.push({
          name: `npc-${npcRoles[i]}`,
          x0: nx - 52,
          y0: lay.questBangCenterY - 16,
          x1: nx + 52,
          y1: ny,
        });
      });
      const jLay = npcOverheadLayout('jahangir', 984, 632, 0.8, 0)!;
      boxes.push({
        name: 'npc-jahangir',
        x0: 984 - 56,
        y0: jLay.plateTopY - 2,
        x1: 984 + 56,
        y1: 632,
      });
      expectPairwiseDisjoint(boxes);
    }
  });

  it('North, Valley, River & Apiary scenes: landmarks, ponds, 12 hives, benches, signposts & HUD never overlap', () => {
    for (const estate of ['north', 'valley'] as const) {
      const sp = ESTATES[estate];
      const bed: Box = {
        name: `${estate}-bed`,
        x0: sp.fx - 8,
        y0: sp.fy - 8,
        x1: sp.fx + sp.cols * sp.dx + 8,
        y1: sp.fy + sp.rows * sp.dy + 8,
      };
      const items: Box[] = [
        bed,
        { name: 'hud-top-right', x0: 846, y0: 10, x1: 1270, y1: 132 },
        { name: 'hud-tools', x0: 454, y0: 602, x1: 996, y1: 710 },
        { name: 'stone-barn', x0: 1144, y0: 136, x1: 1264, y1: 224 },
        signpostBox('east-town', 1218, 392),
      ];
      if (estate === 'north') {
        items.push(
          { name: 'windmill', x0: 66, y0: 96, x1: 170, y1: 292 },
          { name: 'north-well', x0: 140, y0: 302, x1: 208, y1: 398 },
          signpostBox('north-farm', 92, 588),
          signpostBox('north-valley', 1212, 588),
        );
      } else {
        items.push(
          { name: 'waterfall', x0: 22, y0: 114, x1: 190, y1: 304 },
          signpostBox('valley-north', 86, 456),
          signpostBox('valley-farm', 96, 608),
        );
      }
      expectPairwiseDisjoint(items);
    }

    // River max 5 ponds
    S.ponds = Array.from({ length: 5 }, (_, id) => ({ id, fish: 'carp', count: 3, stocked: true, grow: 0, feed: 3, fed: true }));
    const pg = unifiedPondGeom();
    expect(POND_SLOTS).toHaveLength(5);
    expect(RIVER_SPOTS).toHaveLength(4);
    expectPairwiseDisjoint([
      { name: 'river-water', x0: 0, y0: 258, x1: 1280, y1: 430 },
      { name: 'unified-pond', x0: pg.x0, y0: pg.cy - pg.h / 2, x1: pg.x1, y1: pg.cy + pg.h / 2 },
      signpostBox('river-farm', 1212, 576),
      { name: 'river-nav-hud', x0: 10, y0: 636, x1: 398, y1: 708 },
    ]);

    // Apiary all 12 beehives + worker path
    expect(HIVE_SLOTS).toHaveLength(12);
    const hiveBoxes: Box[] = HIVE_SLOTS.map((h, i) => ({
      name: `hive-${i}`,
      x0: h.x - 34,
      y0: h.y - 34,
      x1: h.x + 34,
      y1: h.y + 28,
    }));
    const workerBoxes: Box[] = [0, 1, 2, 3].map((wi) => ({
      name: `apiary-worker-${wi}`,
      x0: 380 + wi * 175 - 22,
      y0: 604 - 112,
      x1: 380 + wi * 175 + 22,
      y1: 604,
    }));
    expectPairwiseDisjoint([
      ...hiveBoxes,
      ...workerBoxes,
      { name: 'honey-shed', x0: 64, y0: 194, x1: 244, y1: 350 },
      signpostBox('apiary-farm', 1218, 626),
      { name: 'apiary-nav-hud', x0: 10, y0: 636, x1: 398, y1: 708 },
    ]);

    // Cutscene safeSceneMark keeps actors out of pens, fountain, hives & river water while preserving horizontal stride
    expect(safeSceneMark('farm', 180, 320).y).toBeGreaterThanOrEqual(524);
    expect(safeSceneMark('town', 520, 500).y).toBeGreaterThanOrEqual(614);
    expect(safeSceneMark('river', 600, 360).y).toBeGreaterThanOrEqual(492);
    expect(safeSceneMark('apiary', 600, 420).y).toBeGreaterThanOrEqual(598);
  });
});
