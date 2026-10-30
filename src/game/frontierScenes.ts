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
import { drawBackpack, drawBackpackFront } from './backpackArt';
import type { Walker } from './engineRender';
import { S } from './state';
import {
  activeCharter, activeFrontierNodes, ensureFrontier, isFrontierNodeHarvested, isTownFestivalActive,
} from './core/frontier';
import { activeMineNodes, isMineNodeHarvested, mineFloorProgress } from './core/mining';
import { FT } from '../strings/frontierText';
import { fa } from '../strings/fa';
import { isReducedMotion } from './settings';

function dirtRoad(c: Ctx, pts: Pt[], w: number, col: string, _seed: number) {
  ln(c, pts, w + 7, INK);
  ln(c, pts, w, col);
}

export function caveBG(season: number, floor = 1): HTMLCanvasElement {
  void season;
  const { cv, c } = newBG();
  const r = rng(910 + floor * 137);
  const themes = [
    { wall: '#35464b', deep: '#17282d', floor: '#617068', path: '#829085', seam: '#a5e4df', wood: '#a87542', glow: '#ffd77c' },
    { wall: '#1d414d', deep: '#102b36', floor: '#3f666b', path: '#5d8582', seam: '#36d7c3', wood: '#806344', glow: '#8ff5db' },
    { wall: '#49334d', deep: '#261d31', floor: '#705761', path: '#8e6f6d', seam: '#ffc75d', wood: '#8d593b', glow: '#ffb84d' },
  ];
  const th = themes[Math.max(0, Math.min(2, floor - 1))];
  c.fillStyle = th.wall;
  c.fillRect(-OX, -OY, BW, BH);

  // هر طبقه سیلوئت مستقل دارد: آجر قنات، ستون‌های فیروزه‌ای، یا ژئود کهن.
  shape(c, [[-OX, 258], [-80, 188], [180, 148], [490, 174], [820, 138], [1160, 172], [1700, 240], [1700, -OY], [-OX, -OY]],
    { fill: th.deep, hatch: 0.08, line: 4, jit: 5 });
  for (let i = 0; i < 12; i++) {
    const sx = -160 + i * 145 + r() * 32;
    const h = 38 + r() * (floor === 3 ? 104 : 68);
    shape(c, [[sx - 20, 164], [sx + 20, 164], [sx + (floor === 2 ? 9 : 0), 164 + h]], { fill: th.wall, line: 2.6, jit: 2 });
  }
  // لایه‌های دور دیوار، برای عمق واقعی به‌جای یک رنگ تخت.
  for (let i = 0; i < 7; i++) {
    const x = 45 + i * 194;
    shape(c, [[x - 84, 390], [x - 62, 270], [x, 224 + (i % 2) * 28], [x + 72, 282], [x + 88, 390]],
      { fill: i % 2 ? th.deep : th.wall, hatch: 0.035, line: 2.2, jit: 3 });
  }
  shape(c, [[-OX, 390], [380, 378], [920, 384], [1700, 396], [1700, 920], [-OX, 920]],
    { fill: th.floor, hatch: 0.035, line: 4, jit: 4 });
  // سنگ‌ریزه و ترک‌های پراکنده بافت می‌سازند، بدون پوشش هاشور روی کل صحنه.
  for (let i = 0; i < 18; i++) {
    const px = 36 + i * 73 + r() * 24;
    const py = 424 + (i * 47) % 238;
    shape(c, ell(px, py, 3 + (i % 3), 2 + (i % 2), 7), { fill: th.path, line: 0.8 });
    if (i % 4 === 0) ln(c, [[px - 13, py + 9], [px - 3, py + 4], [px + 8, py + 10]], 1.2, th.deep);
  }
  dirtRoad(c, [[-420, 606], [160, 592], [640, 578], [1135, 518], [1700, 510]], 42, th.path, 41 + floor);

  // ریل و تراورس، مسیر خوانای بازی از خروج تا آسانسور.
  for (let x = -20; x < 1340; x += 82) {
    const y = 603 - Math.max(0, x - 640) * 0.085;
    ln(c, [[x - 20, y - 15], [x + 24, y + 13]], 7, '#49382d');
    ln(c, [[x - 20, y - 15], [x + 24, y + 13]], 3, th.wood);
  }
  ln(c, [[-80, 586], [640, 566], [1320, 494]], 5, '#2c3334');
  ln(c, [[-80, 614], [640, 594], [1320, 522]], 5, '#2c3334');
  ln(c, [[-80, 586], [640, 566], [1320, 494]], 2, '#a7b0a8');
  ln(c, [[-80, 614], [640, 594], [1320, 522]], 2, '#a7b0a8');

  // تیرهای چوبی با بند و میخ؛ رنگ و فرم در عمق تغییر می‌کند.
  for (const sx of floor === 2 ? [318, 806] : [360, 742]) {
    ln(c, [[sx - 60, 398], [sx - 60, 282], [sx, 246], [sx + 60, 282], [sx + 60, 398]], 14, '#34271f');
    ln(c, [[sx - 60, 398], [sx - 60, 282], [sx, 246], [sx + 60, 282], [sx + 60, 398]], 8, th.wood);
    ln(c, [[sx - 52, 304], [sx + 52, 304]], 5, '#d2a263');
    for (const px of [sx - 60, sx + 60]) shape(c, ell(px, 318, 4, 4, 8), { fill: '#252b2c', line: 0 });
  }

  if (floor === 1) {
    // واگن قدیمی و آجرهای قنات در دهانهٔ آموزشی.
    shape(c, [[552, 342], [670, 342], [654, 380], [568, 380]], { fill: '#6a5141', smooth: false, line: 3 });
    ln(c, [[560, 354], [662, 354]], 3, '#b78a54');
    for (const wx of [580, 640]) shape(c, ell(wx, 388, 13, 13, 12), { fill: '#252b2c', line: 2.5 });
    for (let i = 0; i < 6; i++) shape(c, ell(575 + i * 15, 340 - (i % 2) * 5, 12, 8, 9), { fill: '#9aabac', line: 1.6 });
    for (let i = 0; i < 5; i++) ln(c, [[226 + i * 23, 324], [226 + i * 23, 350]], 3, '#8c7960');
  } else if (floor === 2) {
    // بستر خشک آب و رگه‌های فیروزه‌ای؛ چشمهٔ حذف‌شده دوباره وعده داده نمی‌شود.
    shape(c, [[420, 392], [510, 356], [628, 370], [720, 348], [820, 386], [742, 414], [590, 402]],
      { fill: '#274b55', line: 2.5, jit: 3 });
    ln(c, [[452, 386], [538, 372], [620, 386], [714, 366], [786, 388]], 3, '#4d9998');
    for (const x of [264, 884]) {
      shape(c, [[x - 28, 390], [x - 18, 266], [x, 238], [x + 20, 274], [x + 30, 390]], { fill: '#28636a', line: 3, jit: 2 });
      ln(c, [[x, 260], [x - 4, 350]], 4, th.seam);
    }
  } else {
    // ژئود غول‌پیکر پس‌زمینه و رگه‌های کهربایی طبقهٔ پایانی.
    shape(c, [[474, 390], [496, 286], [574, 224], [666, 236], [742, 306], [760, 390]], { fill: '#30253c', line: 4, jit: 3 });
    shape(c, [[514, 382], [532, 306], [584, 266], [650, 276], [704, 324], [716, 382]], { fill: '#6f493f', line: 3, jit: 2 });
    for (let i = 0; i < 7; i++) {
      const x = 540 + i * 27;
      shape(c, [[x - 11, 378], [x - 5, 328 - (i % 3) * 16], [x + 7, 340 - (i % 2) * 18], [x + 12, 378]], { fill: i % 2 ? '#f0a43c' : '#a870c2', line: 1.8, smooth: false });
    }
  }

  // خروج به رودخانه.
  shape(c, [[88, 474], [88, 344], [148, 302], [208, 344], [208, 474]], { fill: th.deep, line: 4, jit: 2 });
  shape(c, ell(148, 404, 35, 54, 14), { fill: '#8ed8ec', line: 2.2 });
  ln(c, [[104, 462], [104, 352], [148, 324], [192, 352], [192, 462]], 4, th.wood);

  // آسانسور همیشه دیده می‌شود؛ انرژی آن با پیشرفت قطعی روشن می‌شود، نه کشف شانسی پله.
  if (floor < 3) {
    shape(c, [[1080, 450], [1080, 304], [1148, 258], [1216, 304], [1216, 450]], { fill: th.deep, line: 4, jit: 2 });
    for (const x of [1100, 1196]) ln(c, [[x, 432], [x, 310]], 7, '#30383a');
    ln(c, [[1100, 314], [1196, 314]], 7, th.wood);
    shape(c, box(1148, 424, 96, 16), { fill: '#6c7775', line: 3, smooth: false });
    for (let x = 1112; x <= 1184; x += 18) ln(c, [[x, 330], [x, 420]], 3, '#82908b');
    put(c, iconPart('gear'), 1148, 292, 0.42);
  }
  if (floor > 1) {
    shape(c, [[932, 442], [932, 326], [980, 292], [1028, 326], [1028, 442]], { fill: th.deep, line: 3.4, jit: 2 });
    put(c, iconPart('up'), 980, 366, 0.7);
    ln(c, [[946, 430], [946, 334], [980, 308], [1014, 334], [1014, 430]], 4, th.wood);
  }

  // فانوس‌ها و بلورهای دیواری، بدون پوشاندن محل بازی.
  for (const [lx, ly] of [[278, 316], [874, 310]] as const) {
    shape(c, ell(lx, ly, 52, 44, 16), { fill: th.glow + '22', line: 0 });
    ln(c, [[lx, ly - 42], [lx, ly - 12]], 3, '#302a25');
    shape(c, box(lx, ly, 18, 28), { fill: th.glow, line: 2.5, smooth: false });
  }
  for (const [cx, cy] of [[218, 352], [940, 350], [400, 356]] as const) {
    shape(c, [[cx - 17, cy], [cx - 7, cy - 45], [cx + 7, cy - 38], [cx + 18, cy]], { fill: th.seam, line: 2.8, smooth: false });
    ln(c, [[cx - 5, cy - 36], [cx + 2, cy - 8]], 2, '#efffff');
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
  const motionT = isReducedMotion() ? 0 : t;
  if (scene === 'cave') {
    ctx.save();
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 12; i++) {
      const dx = ((i * 137 + motionT * (4 + i % 3)) % 1280 + 1280) % 1280;
      const dy = 224 + (i * 53) % 292 + Math.sin(motionT * 0.7 + i) * 9;
      shape(ctx, ell(dx, dy, 1.5 + (i % 2), 1.5 + (i % 2), 7), { fill: i % 3 ? '#d7e8d8' : '#ffd889', line: 0 });
    }
    ctx.restore();
  }
  const f = ensureFrontier();
  const layer = scene === 'cave' ? f.caveFloor : f.forestLayer;
  if (scene === 'cave' && layer < 3) {
    const progress = mineFloorProgress(layer);
    const lamp = progress.liftOpen ? '#8ff0a5' : '#d8a256';
    shape(ctx, ell(1148, 354, 48, 54, 14), { fill: progress.liftOpen ? 'rgba(118,238,170,.12)' : 'rgba(0,0,0,.08)', line: 0 });
    put(ctx, iconPart(progress.liftOpen ? 'down' : 'lock'), 1148, 364, 0.58);
    for (const x of [1100, 1196]) shape(ctx, ell(x, 326, 6, 6, 10), { fill: lamp, line: 1.5 });
  }
  const nodes = scene === 'cave' ? activeMineNodes() : activeFrontierNodes(scene);
  const drawables: Array<{ y: number; fn: () => void }> = [];

  for (const n of nodes) {
    if (scene === 'cave' ? isMineNodeHarvested(n.idx) : isFrontierNodeHarvested(scene, n.idx)) {
      shape(ctx, ell(n.x, n.y + 8, 22, 9, 10), { fill: 'rgba(60,50,45,.45)', line: 1.8 });
      continue;
    }
    drawables.push({
      y: n.y,
      fn: () => {
        const pulse = Math.sin(motionT * 3 + n.idx) * 2.5;
        shape(ctx, ell(n.x, n.y + 10, 28, 11, 10), { fill: 'rgba(0,0,0,.22)', line: 0 });
        if (scene === 'cave') {
          // رگه و گوهر از دور خوانا هستند؛ بازیکن پیش از صرف انرژی می‌داند چه می‌گیرد.
          const royal = n.good === 'ruby';
          shape(ctx, ell(n.x, n.y + 7, royal ? 42 : 35, 15, 12), { fill: `rgba(170,235,220,${0.08 + (Math.sin(motionT * 2 + n.idx) + 1) * 0.035})`, line: 0 });
          shape(ctx, [[n.x - 34, n.y + 10], [n.x - 27, n.y - 21], [n.x - 8, n.y - 42], [n.x + 18, n.y - 35], [n.x + 34, n.y + 10]],
            { fill: royal ? '#59404f' : '#4b5b63', hatch: 0.045, line: 3, smooth: false });
          shape(ctx, [[n.x - 23, n.y - 8], [n.x - 9, n.y - 30], [n.x + 8, n.y - 24], [n.x + 23, n.y - 5]],
            { fill: royal ? '#8b5362' : '#71878b', line: 1.4, smooth: false });
          ln(ctx, [[n.x - 20, n.y - 8], [n.x - 5, n.y - 20], [n.x + 7, n.y - 11], [n.x + 22, n.y - 24]], 3, '#d8f4e9');
          put(ctx, iconPart(n.good), n.x, n.y - 20 + pulse * 0.18, royal ? 0.62 : 0.52);
          if (royal) put(ctx, iconPart('star'), n.x + 28, n.y - 48 + pulse * 0.25, 0.25);
        } else {
          const col = n.good === 'truffle' ? '#fbbf24' : n.good === 'mushroom' ? '#f43f5e' : '#34d399';
          shape(ctx, box(n.x, n.y - 4, 14, 22), { fill: '#fef3c7', line: 2.4 });
          shape(ctx, ell(n.x, n.y - 18 + pulse * 0.5, 26, 15, 12), { fill: col, line: 2.8 });
        }
        if (scene === 'forest') put(ctx, iconPart(n.good), n.x, n.y - 52 + pulse, 0.44);
      },
    });
  }

  drawables.push({ y: farmer.y, fn: () => {
    drawBackpack(ctx, farmer.x, farmer.y, farmer.face, 0.75);
    drawFarmer(ctx, farmer.rig, farmer.x, farmer.y, farmer.face, 0.75);
    drawBackpackFront(ctx, farmer.x, farmer.y, farmer.face, 0.75);
  } });
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
  const mineNames = [FT.mineFloor1Name, FT.mineFloor2Name, FT.mineFloor3Name];
  drawSignPlaque(ctx, scene === 'cave' ? 610 : 640, scene === 'cave' ? 316 : 362,
    scene === 'cave' ? mineNames[layer - 1] : FT.forestShrine);
  if (layer < 3) drawSignPlaque(ctx, 1148, 456,
    scene === 'cave' ? FT.mineLiftShort + ' · ' + fa(mineFloorProgress(layer).cleared) + '/' + fa(2) : FT.deeperPath);
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
