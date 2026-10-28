// Hand-Drawn Full-Screen Canvas Art for:
//   1) Multi-Layer Ancient Qanat Crystal Cavern ('cave' — Strata 1..3)
//   2) Multi-Layer Enchanted Hyrcanian Misty Forest ('forest' — Glades 1..3)
//   3) Playable Town Square Festival Booths & Lanterns
//   4) Permanent Branching Village Charter Monuments across Town / Farm / Cavern / Forest
import { INK, box, ell, ln, put, rng, shape, type Ctx, type Pt } from './art';
import { iconPart } from './artIcons';
import { BH, BW, OX, OY, newBG } from './scenes';
import { drawSignPlaque } from './worldRoads';
import { drawFarmer } from './rig';
import type { Walker } from './engineRender';
import { S } from './state';
import {
  activeCharter, activeFrontierNodes, ensureFrontier, isFrontierNodeHarvested, isTownFestivalActive,
} from './core/frontier';
import { FT } from '../strings/frontierText';
import { fa } from '../strings/fa';

function dirtRoad(c: Ctx, pts: Pt[], w: number, col: string, _seed: number) {
  ln(c, pts, w + 7, INK);
  ln(c, pts, w, col);
}

export function caveBG(season: number, floor = 1): HTMLCanvasElement {
  void season;
  const { cv, c } = newBG();
  const r = rng(910 + floor * 37);
  const wallCols = ['#2b2638', '#1f2d3d', '#2d2236'];
  const floorCols = ['#5b5068', '#4a5a6e', '#634f62'];
  c.fillStyle = wallCols[(floor - 1) % 3];
  c.fillRect(-OX, -OY, BW, BH);

  // Vaulted subterranean cavern ceiling + stalactites
  shape(c, [[-OX, 250], [-120, 175], [180, 142], [490, 168], [820, 138], [1160, 165], [1700, 235], [1700, -OY], [-OX, -OY]],
    { fill: '#1a1726', hatch: 0.16, line: 3.5, jit: 4 });
  for (let i = 0; i < 13; i++) {
    const sx = -180 + i * 135 + r() * 35;
    const h = 42 + r() * 58;
    shape(c, [[sx - 18, 155], [sx + 18, 155], [sx, 155 + h]], { fill: '#3d3550', line: 2.6, jit: 2 });
  }

  // Walkable stone cavern floor + minecart road connecting West Exit <-> East Deep Stairwell
  shape(c, [[-OX, 390], [380, 378], [920, 384], [1700, 396], [1700, 920], [-OX, 920]],
    { fill: floorCols[(floor - 1) % 3], hatch: 0.1, line: 4, jit: 4 });
  dirtRoad(c, [[-420, 588], [160, 584], [640, 576], [1135, 512], [1700, 505]], 34, '#7d6e7e', 41 + floor);

  // تونل معدن خشک: تیرهای چوبی، واگن و مصالح؛ هیچ چشمه یا آب قناتی در غار نیست.
  for (const sx of [360, 742]) {
    ln(c, [[sx - 58, 390], [sx - 58, 278], [sx, 248], [sx + 58, 278], [sx + 58, 390]], 12, '#3b281f');
    ln(c, [[sx - 58, 390], [sx - 58, 278], [sx, 248], [sx + 58, 278], [sx + 58, 390]], 7, '#9a683b');
    ln(c, [[sx - 50, 300], [sx + 50, 300]], 5, '#c18b50');
  }
  shape(c, [[552, 348], [664, 348], [650, 378], [566, 378]], { fill: '#5d493e', smooth: false, line: 3 });
  for (const wx of [578, 638]) shape(c, ell(wx, 386, 12, 12, 12), { fill: '#27232a', line: 2.5 });
  for (let i = 0; i < 7; i++) shape(c, ell(570 + i * 13, 346 - (i % 2) * 5, 12, 8, 9), { fill: '#827687', line: 1.6 });

  // Entrance stone archway back toward River on left (x = 148, y = 438)
  shape(c, [[92, 468], [92, 344], [148, 308], [204, 344], [204, 468]], { fill: '#2a364c', line: 3.8, jit: 2 });
  shape(c, ell(148, 404, 34, 52, 14), { fill: '#7cc8f4', line: 2.2 });

  // Return staircase archway when inside deeper floor (x = 980)
  if (floor > 1) {
    shape(c, [[932, 438], [932, 326], [980, 294], [1028, 326], [1028, 438]], { fill: '#332b42', line: 3.4, jit: 2 });
    for (let s = 0; s < 3; s++) shape(c, box(980, 424 - s * 18, 72 - s * 8, 12), { fill: '#9c90ab', line: 2, smooth: false });
  }

  // راه پایین در پس‌زمینه ثابت نیست؛ تودهٔ سنگ مسدود تا کشف تصادفی با کلنگ دیده می‌شود.
  if (floor < 3) {
    shape(c, [[1084, 438], [1084, 304], [1148, 266], [1212, 304], [1212, 438]], { fill: '#322b3a', line: 4, jit: 2 });
    for (const [rx, ry, rr] of [[1110, 408, 30], [1152, 394, 38], [1190, 418, 28], [1130, 352, 25], [1174, 338, 24]] as const) {
      shape(c, ell(rx, ry, rr, rr * 0.72, 10), { fill: '#6c6272', hatch: 0.1, line: 2.2 });
    }
  }

  // Ambient background decorative crystals along upper cliff wall
  const gemHue = floor === 1 ? '#a5f3fc' : floor === 2 ? '#2dd4bf' : '#fbbf24';
  for (const [cx, cy] of [[210, 338], [945, 344], [388, 348]] as const) {
    shape(c, [[cx - 16, cy], [cx - 6, cy - 42], [cx + 8, cy - 36], [cx + 16, cy]], { fill: gemHue, line: 2.8, smooth: false });
  }
  return cv;
}

export function forestBG(season: number, layer = 1): HTMLCanvasElement {
  const { cv, c } = newBG();
  const r = rng(1410 + season * 29 + layer * 53);
  const sky = ['#bfe8d8', '#b8e2c8', '#edd6b4', '#dce6ee'][season] ?? '#bfe8d8';
  const turf = ['#5fa85b', '#4d9852', '#a88444', '#cfdce2'][season] ?? '#5fa85b';
  const leaf = ['#3f8f4e', '#2f7a44', '#c96f32', '#7d98a6'][season] ?? '#3f8f4e';
  c.fillStyle = sky;
  c.fillRect(-OX, -OY, BW, BH);

  // Layered misty Hyrcanian ancient tree silhouettes & sunbeams
  for (let i = 0; i < 9; i++) {
    const tx = -260 + i * 215 + r() * 40;
    shape(c, box(tx, 165, 36, 330), { fill: '#4c382a', hatch: 0.14, line: 3, jit: 2 });
    shape(c, ell(tx, 95, 112, 68, 16), { fill: leaf, hatch: 0.1, line: 3.2, jit: 4 });
  }
  for (let b = 0; b < 4; b++) {
    const bx = 180 + b * 290;
    c.save();
    c.globalAlpha = 0.16;
    c.fillStyle = '#fff9d6';
    c.beginPath();
    c.moveTo(bx - 35, -OY); c.lineTo(bx + 45, -OY); c.lineTo(bx + 150, 560); c.lineTo(bx + 25, 560);
    c.closePath();
    c.fill();
    c.restore();
  }

  // Forest floor + winding woodland trail
  shape(c, [[-OX, 378], [430, 368], [940, 374], [1700, 384], [1700, 920], [-OX, 920]],
    { fill: turf, hatch: 0.1, line: 4, jit: 4 });
  dirtRoad(c, [[-420, 588], [210, 582], [650, 574], [1142, 520], [1700, 514]], 32, '#c8ab78', 71 + layer);

  // Ancient Heartwood Shrine Tree at center-north (x = 640, y = 342)
  shape(c, box(640, 268, 74, 158), { fill: '#5b3c28', hatch: 0.18, line: 3.6, jit: 2 });
  shape(c, ell(640, 178, 148, 76, 18), { fill: layer === 3 ? '#f59e0b' : leaf, hatch: 0.12, line: 3.8, jit: 4 });
  shape(c, ell(640, 294, 22, 30, 12), { fill: '#fde68a', line: 2.8 });

  // Sunlit wooden archway back to Apiary on left (x = 148)
  shape(c, [[94, 468], [104, 336], [148, 306], [194, 336], [204, 468]], { fill: '#5c4028', line: 3.6, jit: 2 });
  shape(c, ell(148, 398, 36, 54, 14), { fill: '#fef9c3', line: 2.4 });

  // Outer glade archway when in deeper woodland layer (layer > 1)
  if (layer > 1) {
    shape(c, [[934, 452], [942, 332], [980, 304], [1018, 332], [1026, 452]], { fill: '#6c4d32', line: 3.4, jit: 2 });
    shape(c, ell(980, 388, 30, 48, 14), { fill: '#ecfccb', line: 2.2 });
  }

  // Misty wooden archway to deeper glade on right ONLY when deeper layer exists (layer < 3)
  if (layer < 3) {
    shape(c, [[1092, 452], [1102, 316], [1148, 286], [1196, 316], [1206, 452]], { fill: '#5c4028', line: 3.8, jit: 2 });
    shape(c, ell(1148, 382, 38, 56, 14), { fill: '#d8f3dc', line: 2.4 });
  }
  return cv;
}

export function renderFrontierScene(
  ctx: CanvasRenderingContext2D,
  scene: 'cave' | 'forest',
  bg: CanvasImageSource,
  t: number,
  farmer: Walker,
  workers: Walker[],
) {
  ctx.drawImage(bg, -OX, -OY);
  const f = ensureFrontier();
  const layer = scene === 'cave' ? f.caveFloor : f.forestLayer;
  if (scene === 'cave' && layer < 3 && f.stairsFound[`cave:${layer}`]) {
    // دهانهٔ کشف‌شده به‌صورت زنده رسم می‌شود و بلافاصله بعد از ضربهٔ کلنگ ظاهر می‌شود.
    shape(ctx, [[1084, 438], [1084, 304], [1148, 266], [1212, 304], [1212, 438]], { fill: '#17141e', line: 4, jit: 1.2 });
    for (let s = 0; s < 4; s++) {
      const w = 92 - s * 10;
      shape(ctx, box(1148 - w / 2, 412 - s * 18, w, 13), { fill: s % 2 ? '#a99dae' : '#8e829c', line: 2.2, smooth: false });
    }
    ln(ctx, [[1096, 424], [1096, 316], [1148, 280], [1200, 316], [1200, 424]], 5, '#c18b50');
    put(ctx, iconPart('down'), 1148, 330, 0.72);
  }
  const nodes = activeFrontierNodes(scene);
  const drawables: Array<{ y: number; fn: () => void }> = [];

  for (const n of nodes) {
    if (isFrontierNodeHarvested(scene, n.idx)) {
      shape(ctx, ell(n.x, n.y + 8, 22, 9, 10), { fill: 'rgba(60,50,45,.45)', line: 1.8 });
      continue;
    }
    drawables.push({
      y: n.y,
      fn: () => {
        const pulse = Math.sin(t * 3 + n.idx) * 2.5;
        shape(ctx, ell(n.x, n.y + 10, 28, 11, 10), { fill: 'rgba(0,0,0,.22)', line: 0 });
        if (scene === 'cave') {
          // رنگ سنگ‌ها خروجی را لو نمی‌دهد؛ هر تودهٔ معدنی ظاهری یکسان و ناشناس دارد.
          shape(ctx, [[n.x - 29, n.y + 9], [n.x - 22, n.y - 20], [n.x - 7, n.y - 37], [n.x + 16, n.y - 31], [n.x + 29, n.y + 9]],
            { fill: '#817786', hatch: 0.12, line: 3, smooth: false });
          shape(ctx, [[n.x - 17, n.y - 18], [n.x - 6, n.y - 31], [n.x + 4, n.y - 16], [n.x - 5, n.y - 8]],
            { fill: '#a99eaa', line: 1.4, smooth: false });
          ln(ctx, [[n.x + 4, n.y - 16], [n.x + 17, n.y - 25]], 2, '#5c5260');
          put(ctx, iconPart('hammer'), n.x, n.y - 56 + pulse, 0.38);
        } else {
          const col = n.good === 'truffle' ? '#fbbf24' : n.good === 'mushroom' ? '#f43f5e' : '#34d399';
          shape(ctx, box(n.x, n.y - 4, 14, 22), { fill: '#fef3c7', line: 2.4 });
          shape(ctx, ell(n.x, n.y - 18 + pulse * 0.5, 26, 15, 12), { fill: col, line: 2.8 });
        }
        if (scene === 'forest') put(ctx, iconPart(n.good), n.x, n.y - 52 + pulse, 0.44);
      },
    });
  }

  drawables.push({ y: farmer.y, fn: () => drawFarmer(ctx, farmer.rig, farmer.x, farmer.y, farmer.face, 0.75) });
  workers.forEach((w, wi) => {
    if (wi < Math.min(2, S.workers)) drawables.push({ y: w.y, fn: () => drawFarmer(ctx, w.rig, w.x, w.y, w.face, 0.72) });
  });
  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) d.fn();

  // Charter monument in Forest or Cavern
  const frCharter = activeCharter('frontier');
  if (scene === 'cave' && frCharter === 'quarry') {
    drawSignPlaque(ctx, 355, 298, FT.caveFloorLabel + ' — ' + fa(layer) + '/' + fa(3));
  } else if (scene === 'forest' && frCharter === 'sanctuary') {
    drawSignPlaque(ctx, 355, 298, FT.forestLayerLabel + ' — ' + fa(layer) + '/' + fa(3));
  }

  drawSignPlaque(ctx, 148, 560, scene === 'cave' ? FT.gateRiverBack : FT.gateApiaryBack);
  drawSignPlaque(ctx, scene === 'cave' ? 610 : 640, scene === 'cave' ? 316 : 362,
    scene === 'cave' ? FT.mineFloor + ' — ' + fa(layer) + '/' + fa(3) : FT.forestShrine);
  if (layer < 3) drawSignPlaque(ctx, 1148, 456,
    scene === 'cave' ? (f.stairsFound[`cave:${layer}`] ? FT.stairsDown : FT.mineStairsHidden) : FT.deeperPath);
  if (layer > 1) drawSignPlaque(ctx, 980, 456, scene === 'cave' ? FT.stairsUp : FT.outerPath);
}

/** 3 Interactive Town Square Festival Stalls + Overhead Lantern Bunting + Permanent Charter Landmarks */
export function drawTownWorldExpansions(ctx: CanvasRenderingContext2D, t: number) {
  // 1. Permanent Branching Village Charter Monuments in Town Square
  const qanat = activeCharter('qanat');
  if (qanat) {
    const cx = 285, cy = 446;
    shape(ctx, ell(cx, cy, 24, 24, 14), { fill: qanat === 'commons' ? '#93c5fd' : '#fbbf24', line: 3 });
    put(ctx, iconPart(qanat === 'commons' ? 'water' : 'gear'), cx, cy, 0.5);
  }
  const bazaar = activeCharter('bazaar');
  if (bazaar) {
    shape(ctx, [[472, 232], [628, 232], [640, 260], [460, 260]],
      { fill: bazaar === 'coop' ? '#2da85c' : '#be123c', line: 2.8, smooth: false });
  }
  const bank = activeCharter('bank');
  if (bank) {
    shape(ctx, box(946, 618, 36, 48), { fill: bank === 'credit' ? '#fde68a' : '#e2e8f0', line: 2.8 });
    put(ctx, iconPart(bank === 'credit' ? 'heart' : 'ledger'), 946, 618, 0.45);
  }

  // 2. Playable Town Square Seasonal Festival Booths (when active!)
  if (!isTownFestivalActive()) return;
  // Overhead celebratory bunting flags across Town Square
  ln(ctx, [[120, 224], [640, 248], [1160, 224]], 2.6, INK);
  const cols = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];
  for (let i = 0; i < 15; i++) {
    const fx = 155 + i * 68;
    const fy = 226 + Math.sin((i / 14) * Math.PI) * 22 + Math.sin(t * 3 + i) * 2;
    shape(ctx, [[fx - 10, fy], [fx + 10, fy], [fx, fy + 18]], { fill: cols[i % cols.length], line: 2, smooth: false });
  }

  const booths: readonly { x: number; col: string; ic: string; label: string }[] = [
    { x: 308, col: '#16a34a', ic: 'star', label: FT.fairBoothJudge },
    { x: 504, col: '#ea580c', ic: 'fire', label: FT.fairBoothCauldron },
    { x: 702, col: '#2563eb', ic: 'target', label: FT.fairBoothArchery },
  ];
  booths.forEach((b, bi) => {
    const y = 486;
    shape(ctx, box(b.x, y, 86, 40), { fill: '#d6a46c', hatch: 0.14, line: 2.8 });
    shape(ctx, [[b.x - 50, y - 34], [b.x + 50, y - 34], [b.x + 56, y - 16], [b.x - 56, y - 16]],
      { fill: b.col, line: 2.8, smooth: false });
    put(ctx, iconPart(b.ic), b.x, y - 2, 0.5);
    drawSignPlaque(ctx, b.x, bi === 1 ? y - 74 : y - 48, b.label);
  });
}
