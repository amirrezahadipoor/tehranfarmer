// Hand-Drawn Background Canvases & Live Depth-Sorted Renderer for the Two Larger Purchasable Farms:
// 1) Northern Meadow ('north' — 9x6 = 54 plots, Windmill + Stone Qanat + Well + 3 Roads)
// 2) Sunlit Valley ('valley' — 10x6 = 60 plots, Waterfall Spring + Cypresses + Granary + 3 Roads)
import { INK, box, cached, circ, cropPart, dot, ell, iconPart, ln, oval, put, rng, shape, type Ctx } from './art';
import { ESTATES, isEstateOwned, estatePlotCenter, type EstatePlot, type FarmSceneId } from './estates';
import { S, UI, playerToolPlots } from './state';
import { isReducedMotion } from './settings';
import { drawFullScarecrow } from './farmVisuals';
import { isCropDormantNow } from './worldVisuals';
import {
  drawFarmlandBed, drawFarmlandPlotsLayer, drawGlasshouseSpan, drawMachineryPad, drawSignPlaque, drawValleyWaterfall,
} from './worldRoads';
import { drawFarmer } from './rig';
import { drawBackpack, drawBackpackFront } from './backpackArt';
import { drawThirstLeft } from './thirstWarn';
import { OX, dirtRoad, ground, mountains, newBG, paperGrain, signpost, tree, wellAt } from './scenes';
import { CFG } from './settings';
import { ESTATE_UI } from '../strings/estateStoryText';
import { WX } from '../strings/worldExpansionText';
import { worldLabelBoost } from './labelScale';
import type { Task, Walker } from './engineRender';

function stoneBarn(c: Ctx, cx: number, base: number, season: number, roofCol: string) {
  c.fillStyle = 'rgba(40,30,10,.16)';
  c.beginPath(); c.ellipse(cx, base + 3, 66, 9, 0, 0, 6.3); c.fill();
  shape(c, box(cx - 52, base - 58, 104, 58), { fill: '#f4e3c1', smooth: false, hatch: 0.12, jit: 1.5 });
  shape(c, [[cx - 60, base - 55], [cx, base - 88], [cx + 60, base - 55]], { fill: roofCol, smooth: false, hatch: 0.16, jit: 1.5 });
  if (season === 3) shape(c, [[cx - 46, base - 62], [cx, base - 88], [cx + 46, base - 62]], { fill: '#fff', smooth: false, line: 2 });
  shape(c, box(cx - 22, base - 44, 44, 44), { fill: '#8a5a34', smooth: false, hatch: 0.15 });
  ln(c, [[cx - 22, base - 44], [cx + 22, base]], 2.6);
  ln(c, [[cx + 22, base - 44], [cx - 22, base]], 2.6);
  circ(c, cx, base - 68, 7, '#ffe9b0', 2.2);
}

function cypress(c: Ctx, x: number, y: number, sc: number, season: number) {
  c.save();
  c.translate(x, y);
  c.scale(sc, sc);
  c.fillStyle = 'rgba(40,30,10,.16)';
  c.beginPath(); c.ellipse(2, 2, 26, 8, 0, 0, 6.3); c.fill();
  shape(c, [[-6, 0], [-4, -44], [4, -44], [6, 0]], { fill: '#7a5230', smooth: false, line: 2.4 });
  const fill = season === 3 ? '#4c7362' : season === 2 ? '#3f8a4c' : '#2e8b44';
  shape(c, [[-26, -34], [-18, -92], [0, -146], [18, -92], [26, -34]], { fill, hatch: 0.12, jit: 2 });
  if (season === 3) oval(c, -2, -124, 11, 5, '#ffffff', -0.2, 2);
  c.restore();
}

function estateGroundIdentity(c: Ctx, farm: 'north' | 'valley', season: number) {
  if (season === 3) return;
  c.fillStyle = farm === 'north' ? 'rgba(75,155,145,.10)' : 'rgba(238,177,74,.11)';
  c.fillRect(-OX, 192, 2120, 720);
  const cols = farm === 'north' ? ['#f7f4df', '#d9f1e4'] : ['#9b72c8', '#f2c94c'];
  for (let i = 0; i < 14; i++) {
    const x = i % 2 ? 1260 + (i % 4) * 22 : -80 + (i % 4) * 24;
    const y = 286 + (i * 37) % 250;
    ln(c, [[x, y], [x + 2, y - 11]], 1.8, farm === 'north' ? '#4b9a62' : '#65713c');
    dot(c, x + 2, y - 13, farm === 'north' ? 3.6 : 4.2, cols[i % 2]);
    if (farm === 'valley') dot(c, x + 5, y - 9, 3.1, cols[(i + 1) % 2]);
  }
}

export function northBG(season: number): HTMLCanvasElement {
  const { cv, c } = newBG();
  mountains(c, season);
  ground(c, season, 192);
  estateGroundIdentity(c, 'north', season);
  const roadCol = season === 3 ? '#e9e2d4' : '#dcbe86';
  // Connecting edge-to-edge roads above bottom HUD: West -> Main Farm, South-East -> Sunlit Valley, East -> Town
  dirtRoad(c, [[-420, 588], [180, 586], [640, 586], [1140, 588], [1700, 594]], 30, roadCol, 31);
  dirtRoad(c, [[1126, 588], [1152, 412], [1214, 336], [1700, 326]], 30, roadCol, 32);
  dirtRoad(c, [[152, 586], [152, 420], [144, 290]], 24, roadCol, 33);
  drawMachineryPad(c, 584, 198, 268, 16);
  drawFarmlandBed(c, ESTATES.north.fx, ESTATES.north.fy, ESTATES.north.cols, ESTATES.north.rows, ESTATES.north.dx, ESTATES.north.dy, season);

  // Windmill stone tower base (blades rotate live in renderEstateFieldScene!)
  c.fillStyle = 'rgba(40,30,10,.18)';
  c.beginPath(); c.ellipse(118, 286, 56, 12, 0, 0, 6.3); c.fill();
  shape(c, [[82, 286], [96, 146], [140, 146], [154, 286]], { fill: '#efe4cc', smooth: false, hatch: 0.14, jit: 1.8 });
  shape(c, [[78, 150], [118, 108], [158, 150]], { fill: '#b84b3e', smooth: false, hatch: 0.15 });
  shape(c, box(104, 236, 28, 50), { fill: '#8a5a34', smooth: false });
  circ(c, 118, 192, 11, '#bfe4ff', 2.8);

  wellAt(c, 174, 398);
  stoneBarn(c, 1204, 224, season, '#b84b3e');

  const trees: [number, number, number][] = [[-90, 240, 1.0], [326, 184, 0.72], [936, 184, 0.72], [1340, 248, 1.0], [-150, 520, 1.15], [1450, 540, 1.15]];
  for (const [x, y, s] of trees) tree(c, x, y, s, season);

  signpost(c, 92, 588, -1, 'house');
  signpost(c, 1212, 588, 1, 'valley');
  signpost(c, 1218, 392, 1, 'cart');

  const r = rng(131);
  if (season !== 3) {
    const cols = ['#ffd93b', '#ff8b4a', '#fff', '#b48aff'];
    for (let i = 0; i < 36; i++) {
      const x = -OX + r() * 2000, y = 220 + r() * 480;
      if (x > 220 && x < 1090 && y > 160 && y < 600) continue;
      dot(c, x, y, 3.2, cols[i % cols.length]);
    }
  }
  paperGrain(c, 3000, 41);
  return cv;
}

export function valleyBG(season: number): HTMLCanvasElement {
  const { cv, c } = newBG();
  mountains(c, season);
  ground(c, season, 192);
  estateGroundIdentity(c, 'valley', season);
  const roadCol = season === 3 ? '#e9e2d4' : '#e2c489';
  // Connecting edge-to-edge roads above bottom HUD: West -> Main Farm, North-West -> Northern Meadow, East -> Town
  dirtRoad(c, [[-420, 588], [180, 586], [640, 586], [1140, 588], [1700, 594]], 30, roadCol, 51);
  dirtRoad(c, [[96, 586], [92, 476], [-420, 444]], 26, roadCol, 52);
  dirtRoad(c, [[1142, 588], [1166, 412], [1214, 344], [1700, 334]], 30, roadCol, 53);
  drawMachineryPad(c, 584, 198, 268, 16);
  drawFarmlandBed(c, ESTATES.valley.fx, ESTATES.valley.fy, ESTATES.valley.cols, ESTATES.valley.rows, ESTATES.valley.dx, ESTATES.valley.dy, season);

  // Natural multi-tiered stone waterfall & spring pool cleanly separated from well & signposts!
  c.save(); c.translate(-14, -8); drawValleyWaterfall(c); c.restore();
  wellAt(c, 198, 392);
  stoneBarn(c, 1204, 224, season, '#c86a2b');

  for (const [cx2, cy2, sc2] of [[322, 188, 0.76], [936, 188, 0.78], [-70, 300, 1.0], [1340, 260, 1.0]] as const) {
    cypress(c, cx2, cy2, sc2, season);
  }

  signpost(c, 96, 608, -1, 'house');
  signpost(c, 86, 456, -1, 'north');
  signpost(c, 1218, 392, 1, 'cart');
  paperGrain(c, 3000, 59);
  return cv;
}

export function renderEstateFieldScene(
  ctx: Ctx,
  farm: Exclude<FarmSceneId, 'farm'>,
  bg: CanvasImageSource,
  ox: number,
  oy: number,
  t: number,
  landLv: number,
  ghLv: number,
  weather: number,
  plots: EstatePlot[],
  hoverPlot: number,
  farmer: Walker,
  workers: Walker[],
  workerCount: number,
) {
  ctx.drawImage(bg, -ox, -oy);
  const spec = ESTATES[farm];
  const owned = isEstateOwned(farm, landLv);

  // Northern Qanat stone arch mouth & masonry channel along top of Northern Meadow when restored (landLv >= 2)
  if (farm === 'north' && landLv >= 2) {
    const qx0 = spec.fx - 26, qx1 = spec.fx + spec.cols * spec.dx + 10;
    shape(ctx, [[qx0 - 20, 172], [qx0 - 16, 138], [qx0 + 16, 138], [qx0 + 20, 172]], { fill: '#b8a996', smooth: false, line: 2.6 });
    shape(ctx, ell(qx0, 203, 10, 9, 10), { fill: '#2a6f97', line: 2.2 });
    shape(ctx, [[qx0, 194], [qx1, 194], [qx1, 212], [qx0, 212]], { fill: '#c8b8a2', smooth: false, line: 2.2 });
    shape(ctx, [[qx0 + 2, 198], [qx1 - 2, 198], [qx1 - 2, 208], [qx0 + 2, 208]], {
      fill: '#4bb8f0', smooth: false, line: 2.2,
    });
    for (let k = 0; k < 7; k++) {
      const rx = spec.fx + ((t * 55 + k * 118) % (spec.cols * spec.dx));
      ln(ctx, [[rx, 203], [rx + 18, 203]], 2.2, 'rgba(255,255,255,.85)');
    }
  }

  // Spinning wooden windmill sails on Northern Meadow (pre-cached 4-sail sprite rotated in 1 blit!)
  if (farm === 'north') {
    const sails = cached('north-windmill-sails', 140, 140, 70, 70, (sc) => {
      for (let b = 0; b < 4; b++) {
        sc.save();
        sc.rotate((b * Math.PI) / 2);
        ln(sc, [[0, 0], [0, -62]], 5, INK);
        shape(sc, [[3, -16], [20, -18], [18, -58], [3, -56]], { fill: '#fff4d8', smooth: false, hatch: 0.16, line: 2.2 });
        sc.restore();
      }
      circ(sc, 0, 0, 7, '#8a5a34', 2.6);
    });
    put(ctx, sails, 118, 152, 1, t * 0.65);
  }

  // Plots grid (54 on north, 60 on valley — cached single-blit layer for 60fps low-end mobile smoothness)
  const total = spec.cols * spec.rows;
  drawFarmlandPlotsLayer(ctx, farm, spec.fx, spec.fy, spec.cols, spec.rows, spec.dx, spec.dy, plots, owned);

  // Cohesive hand-drawn Glasshouse spanning covered columns when owned & ghLv > 0
  if (owned && ghLv > 0) {
    const colCount = Math.min(spec.cols, 2);
    const rowCount = ghLv >= 2 ? spec.rows : 2;
    drawGlasshouseSpan(ctx, spec.fx, spec.fy, spec.cols - colCount, colCount, rowCount, spec.dx, spec.dy);
  }

  if (owned && hoverPlot >= 0 && hoverPlot < total) {
    const targets = UI.tool !== 'hand' ? playerToolPlots(hoverPlot, UI.tool) : [hoverPlot];
    for (const ti of targets) {
      if (ti < 0 || ti >= total) continue;
      const { cx, cy } = estatePlotCenter(farm, ti);
      ctx.save();
      ctx.strokeStyle = ti === hoverPlot ? 'rgba(255,235,130,.92)' : 'rgba(130,245,190,.78)';
      ctx.lineWidth = ti === hoverPlot ? 3.2 : 2.2;
      ctx.beginPath(); ctx.ellipse(cx, cy + 2, 38, 28, 0, 0, 6.3); ctx.stroke();
      ctx.restore();
    }
  }

  // Drip irrigation lines & golden soil sparkles on expanded farms
  if (owned && (S.wellLv ?? 0) > 0) {
    const xEnd = spec.fx + spec.cols * spec.dx - 12;
    for (let r = 0; r < spec.rows; r++) {
      const py = spec.fy + r * spec.dy + 12;
      ln(ctx, [[spec.fx + 8, py], [xEnd, py]], 2.2, 'rgba(65,155,220,0.65)');
    }
  }
  if (owned && S.lv.soil > 0 && !isReducedMotion()) {
    ctx.fillStyle = 'rgba(255,232,120,0.78)';
    for (let k = 0; k < S.lv.soil * 4; k++) {
      const sx = spec.fx + ((k * 137 + Math.floor(t * 2) * 19) % (spec.cols * spec.dx));
      const sy = spec.fy + ((k * 89) % (spec.rows * spec.dy));
      ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, 6.3); ctx.fill();
    }
  }

  // Machines parked cleanly on upper gravel bay above plots (never hidden behind bottom Toolbar!)
  if (owned) {
    const M = S.machines;
    if (M.tractor) put(ctx, iconPart('tractor'), 624, 140, 0.92);
    if (M.seeder) put(ctx, iconPart('seeder'), 718, 140, 0.86);
    if (M.harvester) put(ctx, iconPart('harvester'), 812, 140, 0.92);
    if (M.sprinkler) {
      const rx1 = spec.fx + spec.cols * spec.dx, ry1 = spec.fy + spec.rows * spec.dy;
      for (const [sx, sy] of [[spec.fx - 16, spec.fy - 6], [rx1 + 16, spec.fy - 6], [spec.fx - 16, ry1 + 6], [rx1 + 16, ry1 + 6]]) {
        put(ctx, iconPart('sprinkler'), sx, sy, 0.78);
        if (S.auto.water && !isReducedMotion()) {
          ctx.fillStyle = 'rgba(120,205,255,0.75)';
          for (let k = 0; k < 4; k++) {
            const ang = t * 3.4 + k * 1.57;
            ctx.beginPath(); ctx.arc(sx + Math.cos(ang) * 16, sy - 5 + Math.sin(ang) * 8, 2.2, 0, 6.3); ctx.fill();
          }
        }
      }
    }
    if (M.drone) put(ctx, iconPart('drone'), 640 + Math.sin(t * 0.7) * 240, 244 + Math.sin(t * 1.3) * 26, 0.98, Math.sin(t * 2) * 0.06);
  }

  // Task target rings
  const mk2: Task[] = [...farmer.tasks, ...(farmer.cur ? [farmer.cur] : [])];
  const colr: Record<string, string> = { till: '#c8924e', plant: '#6cc84c', water: '#4aa3df', harvest: '#ffd93b', fert: '#b48aff' };
  for (const q of mk2) {
    if (q.plot !== undefined && q.plot < total) {
      const { cx, cy } = estatePlotCenter(farm, q.plot);
      ctx.save();
      ctx.strokeStyle = colr[q.kind] ?? '#fff';
      ctx.lineWidth = 3.6;
      ctx.setLineDash([8, 7]);
      ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.ellipse(cx, cy + 2, 32, 22, 0, 0, 6.3); ctx.stroke();
      ctx.restore();
    }
  }

  const list: Array<{ y: number; f: () => void }> = [];
  if (owned) {
    for (let i = 0; i < total; i++) {
      const p = plots[i];
      if (!p || p.st !== 2 || !p.crop) continue;
      const { cx, cy } = estatePlotCenter(farm, i);
      list.push({
        y: cy + 14,
        f: () => {
          const stage = p.ripe ? 3 : p.prog < 0.2 ? 0 : p.prog < 0.55 ? 1 : 2;
          const part = cropPart(p.crop!, stage, p.dead);
          const sway = p.dead ? 0 : Math.sin(t * 1.6 + i) * (weather === 2 ? 0.05 : 0.022);
          put(ctx, part, cx, cy + 15, 0.64, sway);
          if (!p.dead && p.water < 0.05) put(ctx, iconPart('drop'), cx + 24, cy - 15 + Math.sin(t * 4 + i) * 2, 0.42);
          if (!p.dead && p.water < 0.05 && p.dry > 0) drawThirstLeft(ctx, cx + 24, cy - 33 + Math.sin(t * 4 + i) * 2, p.dry);
          const inGh = ghLv > 0 && (i % spec.cols) >= spec.cols - 2 && Math.floor(i / spec.cols) < (ghLv >= 2 ? spec.rows : 2);
          if (!p.dead && !p.ripe && isCropDormantNow(p.crop!, inGh)) put(ctx, iconPart('lock'), cx - 24, cy - 15, 0.3);
          if (p.ripe && !p.dead) put(ctx, iconPart('star'), cx + 25, cy - 16 + Math.sin(t * 3 + i) * 2, (p.fert ?? 1) > 1.05 ? 0.38 : 0.31);
        },
      });
    }
  }
  list.push({ y: 556, f: () => drawFullScarecrow(ctx, farm === 'north' ? 1112 : 1148, 556, t, S.debt?.scarecrow ?? 0) });
    list.push({ y: farmer.y, f: () => { drawBackpack(ctx, farmer.x, farmer.y, farmer.face, 0.72); drawFarmer(ctx, farmer.rig, farmer.x, farmer.y, farmer.face, 0.72); drawBackpackFront(ctx, farmer.x, farmer.y, farmer.face, 0.72); } });
  if (owned) {
    workers.forEach((w, wi) => {
      if (wi < workerCount) list.push({ y: w.y, f: () => drawFarmer(ctx, w.rig, w.x, w.y, w.face, 0.72) });
    });
  }
  list.sort((a, b) => a.y - b.y);
  for (const d of list) d.f();

  // Live bilingual destination plaques over every signpost
  if (farm === 'north') {
    drawSignPlaque(ctx, 92, 588, WX.gateFarm);
    drawSignPlaque(ctx, 1212, 588, WX.gateValley);
    drawSignPlaque(ctx, 1218, 392, WX.gateTown);
  } else {
    drawSignPlaque(ctx, 96, 608, WX.gateFarm);
    drawSignPlaque(ctx, 86, 456, WX.gateNorth);
    drawSignPlaque(ctx, 1218, 392, WX.gateTown);
  }

  // Prominent Hand-Drawn Deed Board when player visits the estate before buying its deed
  if (!owned) {
    const loc = CFG.locale === 'en' ? 'en' : 'fa';
    const title = farm === 'north' ? ESTATE_UI[loc].deedBoardNorth : ESTATE_UI[loc].deedBoardValley;
    const hint = ESTATE_UI[loc].deedBoardHint;
    const bx = 640, by = 368;
    ctx.save();
    ln(ctx, [[bx - 92, by + 28], [bx - 92, by + 84]], 7, '#503426');
    ln(ctx, [[bx + 92, by + 28], [bx + 92, by + 84]], 7, '#503426');
    shape(ctx, [[bx - 168, by - 46], [bx + 168, by - 46], [bx + 174, by + 34], [bx - 174, by + 34]], {
      fill: '#fff5d8', line: 3.6, hatch: 0.08, jit: 1.4,
    });
    put(ctx, iconPart('land'), bx, by - 64, 1.05);
    ctx.textAlign = 'center';
    ctx.font = '700 22px Lalezar, Vazirmatn, sans-serif';
    ctx.fillStyle = '#4a2c16';
    ctx.fillText(title, bx, by - 12);
    ctx.font = `700 ${14 * worldLabelBoost(14, 11)}px Vazirmatn, sans-serif`;
    ctx.fillStyle = '#8b5120';
    ctx.fillText(hint, bx, by + 16);
    ctx.restore();
  }
}
