import { INK, box, circ, dot, ell, iconPart, ln, oval, put, rng, shape, type Ctx, type Pt } from './art';
import { northBG, valleyBG } from './estateScenes';
import { drawApiaryBenches, drawFarmlandBed, drawMachineryPad, drawMountainPassArch } from './worldRoads';

export const OX = 420;
export const OY = 200;
export const BW = 2120;
export const BH = 1120;
// منظرهٔ ثابت در مختصات منطقی همان BW×BH است، اما raster آن با وضوح بهینه
// نگه داشته می‌شود؛ لایه‌های متحرک/کرت‌ها در وضوح کامل بوم اصلی رسم می‌شوند.
export const BG_RESOLUTION = 0.5;

const GROUND = ['#9ad85f', '#82d04d', '#d3b957', '#e9f1f6'];
const GROUND2 = ['#7fc74a', '#68b83c', '#b99b3c', '#cfdde8'];
const HILL = ['#86c957', '#6dbb46', '#c4a248', '#dfe9f0'];
const LEAF = [['#6fcf4f', '#8fe06a'], ['#3fa23c', '#59b84a'], ['#e8742a', '#f2b632'], ['#7a5a46', '#7a5a46']];

export function newBG() {
  const cv = document.createElement('canvas');
  cv.width = Math.round(BW * BG_RESOLUTION); cv.height = Math.round(BH * BG_RESOLUTION);
  const c = cv.getContext('2d')!;
  c.scale(BG_RESOLUTION, BG_RESOLUTION);
  c.translate(OX, OY);
  return { cv, c };
}

export function ground(c: Ctx, season: number, y0: number) {
  c.fillStyle = GROUND[season];
  c.fillRect(-OX, y0, BW, BH);
  const r = rng(season * 99 + 5);
  c.lineCap = 'round';
  c.lineWidth = 2.6;
  const dark: [number, number, number, number][] = [];
  const light: [number, number, number, number][] = [];
  for (let i = 0; i < 2600; i++) {
    const x = -OX + r() * BW, y = y0 + 4 + r() * (BH - OY - y0 + 200);
    const isDark = r() > 0.5;
    void r();
    const x2 = x + 8 + r() * 10, y2 = y - 6 - r() * 8;
    (isDark ? dark : light).push([x, y, x2, y2]);
  }
  c.strokeStyle = GROUND2[season];
  c.beginPath();
  for (const [x, y, x2, y2] of dark) { c.moveTo(x, y); c.lineTo(x2, y2); }
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.22)';
  c.beginPath();
  for (const [x, y, x2, y2] of light) { c.moveTo(x, y); c.lineTo(x2, y2); }
  c.stroke();
  if (season !== 3) {
    c.strokeStyle = season === 2 ? '#a58230' : '#4fa83c';
    c.lineWidth = 2.4;
    c.beginPath();
    for (let i = 0; i < 260; i++) {
      const x = -OX + r() * BW, y = y0 + 10 + r() * 700;
      c.moveTo(x, y); c.lineTo(x - 3, y - 9); c.moveTo(x, y); c.lineTo(x + 3, y - 8);
    }
    c.stroke();
  }
}

export function mountains(c: Ctx, season: number) {
  const peaks: Pt[] = [[-200, 110], [120, 60], [520, 90], [960, 70], [1400, 100]];
  shape(c, [[-OX, 215], [-200, 110], [-60, 160], [120, 60], [300, 170], [520, 90], [760, 170], [960, 70], [1180, 160], [1400, 100], [1700, 190], [1700, 230], [-OX, 230]],
    { fill: season === 3 ? '#cfdcea' : '#a9c1de', smooth: false, hatch: 0.1, jit: 4 });
  for (const [x, y] of peaks) shape(c, [[x - 34, y + 46], [x, y], [x + 34, y + 46], [x + 14, y + 36], [x, y + 50], [x - 14, y + 38]], { fill: '#fff', smooth: false, line: 2, jit: 2 });
  for (const [x, w, y] of [[200, 380, 218], [820, 420, 226], [1380, 400, 220], [-250, 380, 222]] as const)
    shape(c, ell(x, y, w, 56, 18), { fill: HILL[season], hatch: 0.12 });
}

export function tree(c: Ctx, x: number, y: number, s: number, season: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(40,30,10,.16)'; c.beginPath(); c.ellipse(4, 2, 46, 11, 0, 0, 6.3); c.fill();
  shape(c, [[-9, 0], [-6, -50], [-3, -80], [5, -80], [8, -50], [12, 0]], { fill: '#9a6a3c', hatch: 0.16, smooth: false });
  if (season === 3) {
    ln(c, [[0, -70], [-26, -104]], 6, INK); ln(c, [[0, -70], [-26, -104]], 3, '#7a5a46');
    ln(c, [[2, -76], [30, -112]], 6, INK); ln(c, [[2, -76], [30, -112]], 3, '#7a5a46');
    ln(c, [[1, -80], [2, -122]], 6, INK); ln(c, [[1, -80], [2, -122]], 3, '#7a5a46');
    for (const [px, py] of [[-26, -106], [30, -114], [2, -124]]) oval(c, px, py, 14, 6, '#fff', 0, 2.2);
  } else {
    const [a, b] = LEAF[season];
    circ(c, -26, -92, 30, a, 3, 0.1); circ(c, 28, -92, 30, a, 3, 0.1); circ(c, 0, -120, 36, b, 3, 0.1); circ(c, 0, -86, 34, a, 3, 0.1);
    if (season === 0) for (const [px, py] of [[-20, -100], [14, -126], [30, -92], [-4, -80], [-34, -84]]) dot(c, px, py, 4, '#ffb8d2');
    if (season === 2) for (const [px, py] of [[-20, -100], [14, -126], [26, -84]]) dot(c, px, py, 4, '#c9381e');
  }
  c.restore();
}

function flower(c: Ctx, x: number, y: number, col: string) {
  ln(c, [[x, y], [x, y - 10]], 2.4, '#3f9a3a');
  for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.28; dot(c, x + Math.cos(a) * 3.6, y - 12 + Math.sin(a) * 3.6, 2.8, col); }
  dot(c, x, y - 12, 2.4, '#ffd93b');
}

export function fence(c: Ctx, x1: number, y1: number, x2: number, y2: number, snow = false) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(1, Math.round(len / 34));
  for (const off of [-16, -30]) ln(c, [[x1, y1 + off], [x2, y2 + off]], 7, INK);
  for (const off of [-16, -30]) ln(c, [[x1, y1 + off], [x2, y2 + off]], 4, '#d9a35e');
  for (let i = 0; i <= n; i++) {
    const x = x1 + ((x2 - x1) * i) / n, y = y1 + ((y2 - y1) * i) / n;
    shape(c, [[x - 5, y], [x - 5, y - 38], [x, y - 44], [x + 5, y - 38], [x + 5, y]], { fill: '#c8924e', hatch: 0.14, smooth: false, line: 2.6 });
    if (snow) oval(c, x, y - 44, 7, 3, '#fff', 0, 1.5);
  }
}

function roofSnow(c: Ctx, pts: Pt[], season: number) {
  if (season === 3) shape(c, pts, { fill: '#fff', smooth: false, line: 2.4 });
}

function house(c: Ctx, season: number) {
  c.fillStyle = 'rgba(40,30,10,.18)'; c.beginPath(); c.ellipse(190, 248, 126, 13, 0, 0, 6.3); c.fill();
  shape(c, box(92, 152, 196, 94), { fill: '#fff0cf', smooth: false, hatch: 0.1, jit: 1.8 });
  for (let i = 1; i < 5; i++) ln(c, [[92, 152 + i * 19], [288, 152 + i * 19]], 1.7, 'rgba(120,80,40,.35)');
  shape(c, box(244, 102, 24, 48), { fill: '#b6b0a6', smooth: false, hatch: 0.14, jit: 1.6 });
  shape(c, [[70, 158], [190, 96], [310, 158], [294, 160], [190, 112], [86, 160]], { fill: '#c8433a', smooth: false, jit: 1.8, hatch: 0.16 });
  shape(c, [[74, 159], [190, 101], [306, 159], [296, 161], [190, 109], [84, 161]], { fill: '#e0584d', smooth: false, line: 0, hatch: 0.1 });
  roofSnow(c, [[122, 136], [190, 103], [258, 136], [248, 133], [190, 113], [132, 133]], season);
  shape(c, box(167, 188, 44, 58), { fill: '#8a5a34', smooth: false, hatch: 0.16, jit: 1.4 });
  dot(c, 201, 218, 3, '#f2c94c');
  for (const x of [108, 232]) {
    shape(c, box(x, 174, 38, 34), { fill: '#bfe4ff', smooth: false, hatch: 0.08, line: 2.8 });
    ln(c, [[x + 19, 174], [x + 19, 208]], 2.6); ln(c, [[x, 191], [x + 38, 191]], 2.6);
    shape(c, box(x - 3, 208, 44, 9), { fill: '#a8742a', smooth: false, line: 2.2 });
    if (season !== 3) for (let k = 0; k < 4; k++) flower(c, x + 4 + k * 10, 208, ['#ff7aa8', '#ffd93b', '#ff8b4a', '#fff'][k]);
  }
  circ(c, 190, 132, 10, '#ffe9b0', 2.6);
}

function barn(c: Ctx, season: number) {
  c.fillStyle = 'rgba(40,30,10,.18)'; c.beginPath(); c.ellipse(1058, 232, 142, 10, 0, 0, 6.3); c.fill();
  shape(c, box(948, 174, 188, 58), { fill: '#d9534a', smooth: false, hatch: 0.14, jit: 1.8 });
  for (let i = 1; i < 8; i++) ln(c, [[948 + i * 24, 174], [948 + i * 24, 232]], 1.7, 'rgba(90,30,20,.35)');
  shape(c, [[930, 176], [1042, 136], [1154, 176], [1140, 178], [1042, 148], [944, 178]], { fill: '#a8522e', smooth: false, hatch: 0.16, jit: 1.8 });
  roofSnow(c, [[964, 166], [1042, 140], [1122, 166], [1112, 163], [1042, 150], [972, 163]], season);
  shape(c, box(1002, 182, 80, 50), { fill: '#f5dfb0', smooth: false, hatch: 0.1, line: 3.2 });
  ln(c, [[1002, 182], [1082, 232]], 3.6); ln(c, [[1082, 182], [1002, 232]], 3.6);
  circ(c, 1042, 162, 7.5, '#4a2a1a', 2.6);
  shape(c, box(1152, 164, 38, 68), { fill: '#cfd6dc', smooth: false, hatch: 0.14, jit: 1.6 });
  shape(c, ell(1171, 164, 22, 15, 12), { fill: '#e8564a', hatch: 0.12 });
  for (const y of [182, 200, 218]) ln(c, [[1152, y], [1190, y]], 2.2, 'rgba(60,60,70,.5)');
}

export function wellAt(c: Ctx, wx: number, wy: number) {
  c.save();
  c.translate(wx - 372, wy - 256);
  well(c);
  c.restore();
}

function well(c: Ctx) {
  c.fillStyle = 'rgba(40,30,10,.18)'; c.beginPath(); c.ellipse(372, 258, 40, 10, 0, 0, 6.3); c.fill();
  shape(c, [[344, 226], [400, 226], [402, 256], [342, 256]], { fill: '#b6b0a6', hatch: 0.16, smooth: false, jit: 1.6 });
  for (const [x, y] of [[356, 236], [374, 246], [390, 234], [366, 252]]) ln(c, [[x - 8, y], [x + 6, y]], 2, 'rgba(60,50,40,.5)');
  shape(c, ell(372, 226, 28, 9, 12), { fill: '#2f6fa8', line: 3 });
  ln(c, [[346, 226], [346, 180]], 7, '#8a5a34'); ln(c, [[398, 226], [398, 180]], 7, '#8a5a34');
  shape(c, [[334, 184], [372, 160], [410, 184]], { fill: '#c8433a', smooth: false, hatch: 0.14 });
  ln(c, [[372, 172], [372, 206]], 2.5, INK); shape(c, box(364, 206, 16, 14), { fill: '#a8742a', smooth: false, line: 2.6 });
}

export const FIELD_X = 434;
export const FIELD_Y = 248;
export const PLOT_DX = 86;
export const PLOT_DY = 64;

export function signpost(c: Ctx, x: number, y: number, dir: 1 | -1, icon: string) {
  c.fillStyle = 'rgba(40,30,10,.18)'; c.beginPath(); c.ellipse(x, y + 2, 32, 8, 0, 0, 6.3); c.fill();
  // سنگ‌لاند زیر تابلو — نقطهٔ اتصال راه
  oval(c, x - 20, y + 2, 9, 4.5, '#c9bba4', 0.1, 1.8); oval(c, x + 2, y + 5, 10, 5, '#c1b29a', 0.3, 1.8); oval(c, x + 20, y + 1, 8, 4, '#c9bba4', 0.2, 1.8); oval(c, x - 4, y - 2, 8, 4, '#cab99c', 0.4, 1.8);
  // ستون چوبی فریز‌شده
  ln(c, [[x, y], [x, y - 96]], 11, INK); ln(c, [[x, y], [x, y - 96]], 7, '#a8742a');
  ln(c, [[x - 6, y - 14], [x + 6, y - 14]], 3.4, INK); ln(c, [[x - 6, y - 30], [x + 6, y - 30]], 3.4, INK); // بست‌های کلافجمد
  const pts: Pt[] = dir > 0 ? [[x - 52, y - 110], [x + 46, y - 110], [x + 70, y - 80], [x + 46, y - 50], [x - 52, y - 50]] : [[x + 52, y - 110], [x - 46, y - 110], [x - 70, y - 80], [x - 46, y - 50], [x + 52, y - 50]];
  shape(c, pts, { fill: '#8a5a28', smooth: false, jit: 1.4, line: 2.5 });
  const inner: Pt[] = dir > 0 ? [[x - 46, y - 104], [x + 42, y - 104], [x + 60, y - 80], [x + 42, y - 56], [x - 46, y - 56]] : [[x + 46, y - 104], [x - 42, y - 104], [x - 60, y - 80], [x - 42, y - 56], [x + 46, y - 56]];
  shape(c, inner, { fill: '#f5dfb0', smooth: false, hatch: 0.12, jit: 1.2, line: 3 });
  // پیکان سویجه‌دار + آیکون مقصد درشت
  const tipX = x + dir * 34;
  shape(c, [[tipX - dir * 16, y - 92], [tipX, y - 80], [tipX - dir * 16, y - 68]], { fill: '#a03520', smooth: false, line: 2.4 });
  put(c, iconPart(icon), x + dir * 2, y - 80, 1.15);
}

export function farmBG(season: number): HTMLCanvasElement {
  const { cv, c } = newBG();
  mountains(c, season);
  ground(c, season, 196);
  // جاده شهر و شبکهٔ راه‌های پیوستهٔ لبه‌به‌لبهٔ مزرعه (بدون هیچ انتهای بریده یا هم‌پوشانی با کرت‌ها و نوار ابزار)
  const r = rng(77);
  const roadCol = season === 3 ? '#e9e2d4' : '#dcbe86';
  // گذرگاه پیرامونی بیرون از کرت‌ها (هرگز زیر کرت‌ها یا روی دام‌ها نمی‌افتد)
  dirtRoad(c, [[187, 252], [304, 256], [394, 256], [394, 608], [1152, 590], [1152, 232], [1044, 210]], 24, roadCol, 10);
  // ۵ جادهٔ خروجی لبه‌به‌لبه تا مرز واقعی بوم (-420..1700 × -160..920)
  dirtRoad(c, [[1152, 336], [1340, 328], [1700, 322]], 40, roadCol, 8);    // شرق -> شهر
  dirtRoad(c, [[1152, 482], [1340, 488], [1700, 496]], 32, roadCol, 13);   // جنوب‌شرق -> باغ‌درهٔ آفتاب
  dirtRoad(c, [[-420, 610], [96, 610], [394, 608]], 30, roadCol, 9);        // غرب -> رودخانه
  dirtRoad(c, [[304, 609], [304, 740], [304, 920]], 28, roadCol, 11);       // جنوب -> زنبورستان (دقیقاً در فضای باز بین نوار ناوبری و نوار ابزار!)
  dirtRoad(c, [[798, 198], [802, 172], [804, 152]], 26, roadCol, 12);      // گردنهٔ شمالی -> دشت شمالی (کاملاً جدا از تابلوی چپ و HUD راست!)
  drawMountainPassArch(c, 804, 156);
  drawMachineryPad(c, 434, 202, 200, 16);
  drawFarmlandBed(c, FIELD_X, FIELD_Y, 8, 5, PLOT_DX, PLOT_DY, season);
  // درختان پشت (کاملاً بیرون از خانه، چاه، چارتاقی، دروازهٔ شمالی و انبار!)
  const trees: [number, number, number][] = [[-52, 226, 0.95], [316, 198, 0.72], [872, 198, 0.72], [1252, 214, 0.95], [1390, 240, 1.1], [-120, 270, 1.2], [1500, 330, 1.2], [-300, 420, 1.3], [1620, 520, 1.3], [-180, 650, 1.2], [1480, 700, 1.2]];
  trees.sort((a, b) => a[1] - b[1]);
  for (const [x, y, s] of trees) tree(c, x, y, s, season);
  barn(c, season);
  house(c, season);
  well(c);
  signpost(c, 1216, 344, 1, 'cart');     // تابلوی جادهٔ شهر (کاملاً پایین‌تر از سیلوی انبار!)
  signpost(c, 696, 232, 1, 'north');     // تابلوی دشت شمالی پایین‌تر از خوشهٔ فصل و ساعت و کاملاً بالای کرت‌ها.
  signpost(c, 1212, 464, 1, 'valley');   // تابلوی جادهٔ باغ‌درهٔ آفتاب (فاصلهٔ کامل با شهر و ستاره‌های مترسک!)
  signpost(c, 60, 628, -1, 'fish');      // تابلوی جادهٔ رودخانه (۱۰۰٪ بالای نوار ناوبری پایین و جدا از جمع‌کن!)
  signpost(c, 316, 628, 1, 'hive');      // تابلوی جادهٔ زنبورستان (۱۰۰٪ بالای نوار ناوبری و زیر دامداری!)
  if (season !== 3) {
    const cols = ['#ff7aa8', '#ffd93b', '#fff', '#ff8b4a', '#b48aff'];
    for (let i = 0; i < 46; i++) {
      const x = -OX + r() * BW, y = 230 + r() * 560;
      const inField = x > 395 && x < 1230 && y > 205 && y < 650, inPen = x > 20 && x < 370 && y > 320 && y < 660, onRoad = x > 1180 && y > 290 && y < 380;
      const nearHouse = x > 60 && x < 330 && y < 290;
      if (inField || inPen || onRoad || nearHouse || (x > 920 && x < 1210 && y < 225)) continue;
      if ((x > 150 && x < 1260 && y > 628 && y < 686) || (x > 380 && x < 428 && y > 300 && y < 660) || (x > 88 && x < 130 && y > 540 && y < 678)) continue; // روی راه گل نمی‌روید
      flower(c, x, y, cols[i % cols.length]);
    }
  }
  paperGrain(c, 3500, 11);
  return cv;
}

export function paperGrain(c: Ctx, n: number, seed: number) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(80,50,20,.06)';
    c.fillRect(-OX + r() * BW, 192 + r() * (BH - OY - 192), 2 + r() * 2, 2 + r() * 2);
  }
}

// ===== راه خاکی دست‌کش — مسیرها باید خوانا باشند =====
export function dirtRoad(c: Ctx, pts: [number, number][], w: number, col: string, seed = 3) {
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = 'rgba(88,58,24,.30)'; c.lineWidth = w + 12; c.stroke();
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = col; c.lineWidth = w; c.stroke();
  const r = rng(seed);
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 20) continue;
    const n = Math.max(2, Math.round(len / 30));
    const dx = (x1 - x0) / len, dy = (y1 - y0) / len, px = -dy, py = dx;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      for (const off of [-0.27, 0.27]) {
        const ox = px * w * off + (r() - 0.5) * 4, oy = py * w * off + (r() - 0.5) * 4;
        const sx = x0 + dx * len * t + ox, sy = y0 + dy * len * t + oy;
        ln(c, [[sx - dx * 7, sy - dy * 7], [sx + dx * 7, sy + dy * 7]], 2.4, 'rgba(120,86,44,.38)');
      }
      if (r() < 0.45) { const jx = (r() - 0.5) * w * 0.66, jy = (r() - 0.5) * w * 0.66; oval(c, x0 + dx * len * t + jx, y0 + dy * len * t + jy, 2 + r() * 2, 1.2 + r(), 'rgba(150,110,60,.38)', r() * 3, 1.4); }
    }
  }
  c.restore();
}

// ===== شهر (هر ۶ مغازه با کوچهٔ سنگ‌فرش مستقل بدون ۱ پیکسل برخورد + میدان و کلبهٔ جهانگیر ۱۰۰٪ بالای HUD پایین!) =====
function shopBuilding(c: Ctx, cx: number, base: number, wall: string, roof: string, icon: string, kind: number) {
  const w = 152;
  const h = [126, 132, 140, 124, 134, 154][kind];
  c.fillStyle = 'rgba(40,30,10,.18)'; c.beginPath(); c.ellipse(cx, base + 4, 88, 11, 0, 0, 6.3); c.fill();
  shape(c, box(cx - w / 2, base - h, w, h), { fill: wall, smooth: false, hatch: 0.12, jit: 1.6 });
  if (kind === 5) {
    const lw2 = '#' + [1, 3, 5].map((i) => Math.round(parseInt(wall.slice(i, i + 2), 16) + (255 - parseInt(wall.slice(i, i + 2), 16)) * 0.3).toString(16).padStart(2, '0')).join('');
    shape(c, box(cx - w / 2 + 10, base - h + 40, w - 20, 42), { fill: lw2, smooth: false, hatch: 0.1, jit: 1.2 });
    ln(c, [[cx - w / 2, base - h + 40], [cx + w / 2, base - h + 40]], 2.4, 'rgba(80,52,38,.5)');
  }
  if (kind === 0 || kind === 1) {
    shape(c, [[cx - w / 2 - 11, base - h + 5], [cx, base - h - 46], [cx + w / 2 + 11, base - h + 5]], { fill: roof, smooth: false, hatch: 0.16, jit: 1.6 });
  } else if (kind === 2) {
    shape(c, box(cx - w / 2 - 9, base - h - 18, w + 18, 22), { fill: roof, smooth: false, hatch: 0.14, jit: 1.4 });
    shape(c, box(cx + 38, base - h - 60, 24, 42), { fill: '#8a8d96', smooth: false, hatch: 0.12 });
    circ(c, cx + 50, base - h - 72, 9, 'rgba(220,225,235,.75)', 2);
    circ(c, cx + 60, base - h - 90, 6.5, 'rgba(220,225,235,.55)', 1.8);
  } else if (kind === 3) {
    shape(c, [[cx - w / 2 - 9, base - h + 6], [cx - w / 2 - 4, base - h - 26], [cx - 16, base - h - 44], [cx, base - h - 46], [cx + 16, base - h - 44], [cx + w / 2 + 4, base - h - 26], [cx + w / 2 + 9, base - h + 6]], { fill: roof, smooth: true, hatch: 0.15, jit: 1.6 });
  } else if (kind === 4) {
    shape(c, [[cx - w / 2 - 10, base - h + 14], [cx, base - h - 36], [cx + w / 2 + 10, base - h + 14], [cx + w / 2 + 10, base - h + 26], [cx, base - h - 22], [cx - w / 2 - 10, base - h + 26]], { fill: roof, smooth: false, hatch: 0.18, jit: 1.5 });
  } else {
    shape(c, [[cx - w / 2 - 10, base - h + 2], [cx, base - h - 32], [cx + w / 2 + 10, base - h + 2]], { fill: roof, smooth: false, hatch: 0.15, jit: 1.3 });
    ln(c, [[cx + 22, base - h - 30], [cx + 22, base - h - 58]], 3, 'rgba(60,35,10,.8)');
    shape(c, [[cx + 22, base - h - 58], [cx + 46, base - h - 52], [cx + 22, base - h - 44]], { fill: '#e0453a', smooth: false });
  }
  if (kind === 3) {
    shape(c, box(cx - 24, base - 58, 48, 58), { fill: '#8a3a2a', smooth: false, hatch: 0.16 });
    ln(c, [[cx - 24, base - 58], [cx + 24, base]], 2.6); ln(c, [[cx + 24, base - 58], [cx - 24, base]], 2.6);
    circ(c, cx, base - 29, 3.5, '#f2c94c', 2.2);
  } else {
    shape(c, box(cx - 19, base - 58, 38, 58), { fill: '#8a5a34', smooth: false, hatch: 0.16 });
    dot(c, cx + 11, base - 28, 2.8, '#f2c94c');
  }
  if (kind === 0 || kind === 1) {
    const aw = w - 14, ay = base - h + (kind === 1 ? 22 : 34);
    for (let i = 0; i < 6; i++) {
      shape(c, [[cx - aw / 2 + (aw / 6) * i, ay], [cx - aw / 2 + (aw / 6) * (i + 1), ay], [cx - aw / 2 + (aw / 6) * (i + 1), ay + 15], [cx - aw / 2 + (aw / 6) * i, ay + 15]], { fill: i % 2 ? '#ffffff' : roof, smooth: false, line: 2 });
    }
  }
  const wy = kind === 5 ? base - h + 48 : base - 54;
  const wins = kind === 5
    ? [[cx - 58, wy], [cx - 12, wy], [cx + 34, wy], [cx - 58, base - 52], [cx + 36, base - 52]]
    : [[cx - 58, base - 54], [cx + 36, base - 54]];
  for (const [x, y] of wins) {
    shape(c, box(x, y, 22, 24), { fill: '#bfe4ff', smooth: false, line: 2.6 });
    ln(c, [[x + 11, y], [x + 11, y + 24]], 2.2); ln(c, [[x, y + 12], [x + 22, y + 12]], 2.2);
  }
  const sy = kind === 5 ? base - h + 40 : base - h + 14;
  ln(c, [[cx - 28, sy], [cx - 28, sy + 14]], 2.6); ln(c, [[cx + 28, sy], [cx + 28, sy + 14]], 2.6);
  shape(c, box(cx - 38, sy + 12, 76, 38), { fill: '#fff4d8', smooth: false, hatch: 0.1, line: 3, jit: 1.1 });
  put(c, iconPart(icon), cx, sy + 31, 0.72);
  // تزئینات گونه‌به‌گونه (۱۰۰٪ محدود به حریم cx ± 82 — صفر برخورد با مغازهٔ همسایه!)
  if (kind === 0) for (const x of [cx - 72, cx + 72]) { shape(c, [[x - 9, base], [x - 10, base - 24], [x + 10, base - 24], [x + 9, base]], { fill: '#d9a35a', hatch: 0.14 }); circ(c, x, base - 24, 5, '#7fc94a', 1.8); }
  if (kind === 1) for (const [x, ic] of [[cx - 70, 'tomato'], [cx + 70, 'watermelon']] as const) { shape(c, box(x - 12, base - 18, 24, 18), { fill: '#c8924e', smooth: false, hatch: 0.14 }); put(c, iconPart(ic), x, base - 24, 0.48); }
  if (kind === 2) { shape(c, [[cx + 62, base], [cx + 66, base - 20], [cx + 82, base - 20], [cx + 85, base]], { fill: '#6a7280', smooth: false, hatch: 0.14 }); }
  if (kind === 3) { for (const x of [cx - 72, cx + 72]) put(c, iconPart('feed'), x, base - 12, 0.55); }
  if (kind === 4) {
    for (let i = 0; i < 3; i++) shape(c, box(cx - 82, base - 9 - i * 8, 38, 7), { fill: ['#c8924e', '#b8863e', '#d9a35a'][i], smooth: false, line: 1.8 });
    ln(c, [[cx + 60, base - 24], [cx + 68, base]], 3.2); ln(c, [[cx + 82, base - 24], [cx + 74, base]], 3.2); ln(c, [[cx + 58, base - 24], [cx + 84, base - 24]], 4, '#8a5a28');
  }
  if (kind === 5) for (const x of [cx - 72, cx + 72]) { shape(c, box(x - 8, base - 24, 16, 24), { fill: '#7fb56a', smooth: true, hatch: 0.12 }); dot(c, x, base - 28, 5.5, '#8fd35a'); }
}

export function townBG(season: number): HTMLCanvasElement {
  const { cv, c } = newBG();
  mountains(c, season);
  ground(c, season, 196);
  const r = rng(5);
  // گنبد فیروزه‌ای در افق باز پشت کوچهٔ میانی
  c.save();
  c.translate(450, 232);
  c.scale(0.68, 0.68);
  shape(c, box(-80, -64, 160, 64), { fill: '#f1e3c4', smooth: false, hatch: 0.1, jit: 1.6 });
  shape(c, [[-52, -64], [-34, -118], [0, -136], [34, -118], [52, -64]], { fill: '#2fb5c9', hatch: 0.14 });
  ln(c, [[0, -136], [0, -160]], 3.6, '#d9a21c'); circ(c, 0, -162, 4.5, '#ffd93b', 1.8);
  for (const x of [-90, 90]) { shape(c, box(x - 9, -136, 18, 136), { fill: '#f1e3c4', smooth: false, hatch: 0.1 }); shape(c, [[x - 11, -136], [x, -168], [x + 11, -136]], { fill: '#2fb5c9', smooth: false }); }
  c.restore();
  // میدان سنگ‌فرش وسیع شهر — پلاک نام + شغل و علامت ! زرد اهالی ۱۰۰٪ روی میدان باز و بدون یک پیکسل هم‌پوشانی با مغازه‌ها!
  shape(c, [[-OX, 434], [420, 430], [860, 436], [1700, 428], [1700, 654], [860, 658], [420, 654], [-OX, 658]], { fill: season === 3 ? '#e4ddd0' : '#e3c994', hatch: 0.12, line: 0, jit: 4 });
  ln(c, [[-OX, 434], [420, 430], [860, 436], [1700, 428]], 4.5, INK);
  ln(c, [[-OX, 658], [420, 654], [860, 658], [1700, 654]], 4.5, INK);
  for (let i = 0; i < 95; i++) { const x = -OX + r() * BW, y = 444 + r() * 196; oval(c, x, y, 8, 3.6, 'rgba(150,110,60,.24)', 0, 1.4); }
  for (const cx of [150, 350, 550, 750, 950, 1150]) {
    shape(c, [[cx - 24, 406], [cx + 24, 406], [cx + 34, 434], [cx - 34, 434]], { fill: '#dcbe86', smooth: false, hatch: 0.12, jit: 1.5 });
  }
  const trees: [number, number, number][] = [[-72, 406, 0.95], [1348, 406, 0.95], [-160, 540, 1.15], [1440, 548, 1.15]];
  for (const [x, y, s] of trees) tree(c, x, y, s, season);
  shopBuilding(c, 150, 406, '#cdeeb0', '#4aa840', 'seedshop', 0);
  shopBuilding(c, 350, 406, '#ffe9a8', '#e0453a', 'market', 1);
  shopBuilding(c, 550, 406, '#d6d2ca', '#5a78b0', 'tractor', 2);
  shopBuilding(c, 750, 406, '#e8b878', '#9a3a2a', 'animalshop', 3);
  shopBuilding(c, 950, 406, '#e6c893', '#8a5a28', 'workshop', 4);
  shopBuilding(c, 1150, 406, '#d8e4f2', '#3a5f8a', 'house', 5);
  signpost(c, 68, 608, -1, 'house');
  // فوارهٔ فیروزه‌ای در قلب میدان باز شهر (کاملاً بین سارا و مهندس کاوه با فاصلهٔ کامل در تمام ساعات!)
  c.save(); c.translate(506, 456);
  shape(c, ell(0, 0, 42, 13, 16), { fill: '#b6b0a6', hatch: 0.14 });
  shape(c, ell(0, -1.5, 34, 9.5, 16), { fill: '#6cc0f0', line: 2.2 });
  shape(c, [[-6, -3], [-4.5, -26], [4.5, -26], [6, -3]], { fill: '#b6b0a6', smooth: false });
  shape(c, ell(0, -28, 15, 5, 12), { fill: '#b6b0a6' });
  for (const a of [-1, 0, 1]) ln(c, [[0, -32], [a * 10, -44], [a * 19, -24]], 2.4, '#8fd0ff');
  c.restore();
  // کلبهٔ اسناد و سماور جهانگیر با فاصلهٔ تمیز از آقا جهانگیر در ضلع شرقی میدان
  c.save(); c.translate(1156, 646);
  shape(c, box(22, -92, 12, 22), { fill: '#a84c3a', smooth: false });
  shape(c, box(-50, -48, 100, 48), { fill: '#eed8b4', smooth: false, hatch: 0.12, jit: 1.6 });
  shape(c, [[-58, -48], [-42, -76], [42, -76], [58, -48]], { fill: '#8c332b', smooth: false, hatch: 0.16, jit: 1.6 });
  shape(c, box(-14, -34, 24, 34), { fill: '#6d4425', smooth: false });
  shape(c, ell(-2, 4, 18, 5, 10), { fill: '#c8433a', line: 1.8 });
  circ(c, 5, -16, 2.2, '#ffd93b', 1.4);
  shape(c, box(18, -32, 20, 18), { fill: '#bfe4ff', smooth: false });
  ln(c, [[28, -32], [28, -14]], 1.8, INK); ln(c, [[18, -23], [38, -23]], 1.8, INK);
  shape(c, box(-74, -16, 20, 5), { fill: '#8a5a28', smooth: false });
  ln(c, [[-70, -11], [-70, 0]], 2.2, INK); ln(c, [[-58, -11], [-58, 0]], 2.2, INK);
  shape(c, box(-68, -30, 9, 14), { fill: '#d9a21c', smooth: false });
  shape(c, box(-20, -104, 40, 26), { fill: '#fff4d8', smooth: false, line: 2.4 });
  put(c, iconPart('ledger'), 0, -91, 0.48);
  c.restore();
  if (season !== 3) for (let i = 0; i < 24; i++) { const x = -OX + r() * BW, y = 668 + r() * 52; flower(c, x, y, ['#ff7aa8', '#ffd93b', '#fff', '#ff8b4a', '#b48aff'][i % 5]); }
  paperGrain(c, 3500, 13);
  return cv;
}


// ===== رودخانه (تمام رودخانه، اسکله و استخر پرورش ماهی ۱۰۰٪ بالای نوار ابزار پایین!) =====
export const RIVER_SPOTS = [
  { x: 360, y: 372 }, { x: 545, y: 380 }, { x: 730, y: 370 }, { x: 910, y: 378 },
];
export const POND_SLOTS = [
  { x: 380, y: 586 }, { x: 535, y: 586 }, { x: 690, y: 586 }, { x: 845, y: 586 }, { x: 1000, y: 586 },
];

export function riverBG(season: number): HTMLCanvasElement {
  const { cv, c } = newBG();
  mountains(c, season);
  ground(c, season, 196);
  const r = rng(41);
  // رودخانه
  shape(c, [[-OX, 272], [1700, 258], [1700, 426], [-OX, 444]], { fill: '#4aa8e0', hatch: 0.1, line: 0, jit: 5 });
  shape(c, [[-OX, 294], [400, 286], [900, 304], [1700, 282], [1700, 304], [900, 324], [400, 308], [-OX, 318]], { fill: '#6cc0f0', line: 0, jit: 3 });
  for (let i = 0; i < 26; i++) {
    const x = -OX + r() * 2100, y = 316 + r() * 94;
    ln(c, [[x, y], [x + 26, y - 3], [x + 52, y + 2]], 2.4, 'rgba(255,255,255,.5)');
  }
  // ساحل شنی
  shape(c, [[-OX, 426], [1700, 412], [1700, 468], [-OX, 486]], { fill: '#e0c690', hatch: 0.12, line: 0, jit: 4 });
  for (let i = 0; i < 54; i++) { const x = -OX + r() * 2100, y = 432 + r() * 42; oval(c, x, y, 6.5, 3, 'rgba(150,110,60,.3)', 0, 1.5); }
  dirtRoad(c, [[-420, 498], [180, 496], [640, 496], [1120, 502], [1700, 512]], 26, '#eed9a0', 12);
  dirtRoad(c, [[1094, 496], [1094, 412]], 20, '#eed9a0', 13);
  const trees: [number, number, number][] = [[-60, 240, 1.05], [220, 226, 0.85], [520, 218, 0.8], [900, 220, 0.85], [1320, 232, 1.05], [1520, 290, 1.15]];
  trees.sort((a, b) => a[1] - b[1]);
  for (const [x, y, s] of trees) tree(c, x, y, s, season);
  // اسکله چوبی
  shape(c, box(1000, 396, 200, 18), { fill: '#c8924e', hatch: 0.14, smooth: false, jit: 1.8 });
  for (let i = 0; i < 6; i++) ln(c, [[1008 + i * 34, 396], [1008 + i * 34, 414]], 2.2, 'rgba(90,50,20,.5)');
  for (const x of [1010, 1190]) shape(c, box(x - 5, 414, 10, 28), { fill: '#a8742a', smooth: false, line: 2.2 });
  signpost(c, 1212, 576, 1, 'house');
  signpost(c, 84, 576, -1, 'cave');
  paperGrain(c, 3000, 17);
  return cv;
}

import { RANCH_PEN_SLOTS } from './farmZones';
import { caveBG, forestBG } from './frontierScenes';
import { ensureFrontier } from './core/frontier';

// ===== زنبورستان (تمام ۱۲ کندو، سکوها، کلبهٔ عسل و کارگرها ۱۰۰٪ جدا و بدون تداخل کلاه کارگر با کندوها!) =====
export const PEN_SLOTS = RANCH_PEN_SLOTS;
export const HIVE_SLOTS = [
  ...Array.from({ length: 6 }, (_, i) => ({ x: 318 + i * 150, y: 328 })),
  ...Array.from({ length: 6 }, (_, i) => ({ x: 356 + i * 150, y: 440 })),
];

export function apiaryBG(season: number): HTMLCanvasElement {
  const { cv, c } = newBG();
  mountains(c, season);
  ground(c, season, 196);
  const r = rng(63);
  const cols = ['#ff7aa8', '#ffd93b', '#fff', '#ff8b4a', '#b48aff', '#f24c4c'];
  for (let i = 0; i < 180; i++) {
    const x = -OX + r() * 2100, y = 240 + r() * 620;
    if (x > 260 && x < 1165 && y > 296 && y < 490) continue;
    if (season === 3) { dot(c, x, y, 2, '#cfdde8'); continue; }
    flower(c, x, y, cols[i % cols.length]);
  }
  drawApiaryBenches(c);
  // کلبهٔ عسل با پنجره‌های دوطرفه و تابلوی سردر مستقل و تمیز
  shape(c, box(80, 244, 148, 106), { fill: '#d9534a', smooth: false, hatch: 0.12, jit: 1.8 });
  shape(c, [[64, 250], [154, 194], [244, 250]], { fill: '#a8522e', smooth: false, hatch: 0.14 });
  shape(c, box(92, 286, 24, 24), { fill: '#bfe4ff', smooth: false, line: 2.2 });
  shape(c, box(192, 286, 24, 24), { fill: '#bfe4ff', smooth: false, line: 2.2 });
  shape(c, box(132, 294, 44, 56), { fill: '#8a5a34', smooth: false, hatch: 0.14 });
  shape(c, box(134, 254, 40, 30), { fill: '#fff4d8', smooth: false, line: 2.2 });
  put(c, iconPart('hive'), 154, 269, 0.52);
  dirtRoad(c, [[-420, 612], [90, 608], [326, 602], [620, 608], [1120, 608], [1700, 612]], 28, '#e0c690', 14);
  dirtRoad(c, [[156, 356], [236, 488], [326, 602]], 24, '#e0c690', 15);
  const trees: [number, number, number][] = [[-80, 254, 1.1], [320, 218, 0.78], [720, 214, 0.76], [1180, 220, 0.88], [1480, 300, 1.15]];
  trees.sort((a, b) => a[1] - b[1]);
  for (const [x, y, s] of trees) tree(c, x, y, s, season);
  signpost(c, 1218, 626, 1, 'house');
  signpost(c, 84, 626, -1, 'forest');
  paperGrain(c, 3000, 23);
  return cv;
}

export type SceneKey = 'farm' | 'north' | 'valley' | 'town' | 'river' | 'apiary' | 'cave' | 'forest';
let cachedSeason = -1;
const sceneCache: Record<string, HTMLCanvasElement> = {};

function clearSceneCacheForSeason(sn: number) {
  if (cachedSeason === sn) return;
  for (const k of Object.keys(sceneCache)) {
    const old = sceneCache[k];
    if (old) { old.width = 0; old.height = 0; }
    delete sceneCache[k];
  }
  cachedSeason = sn;
}

function buildRawScene(scene: SceneKey, sn: number): HTMLCanvasElement {
  const f = ensureFrontier();
  if (scene === 'farm') return farmBG(sn);
  if (scene === 'north') return northBG(sn);
  if (scene === 'valley') return valleyBG(sn);
  if (scene === 'town') return townBG(sn);
  if (scene === 'river') return riverBG(sn);
  if (scene === 'cave') return caveBG(sn, f.caveFloor);
  if (scene === 'forest') return forestBG(sn, f.forestLayer);
  return apiaryBG(sn);
}

export function getSceneSource(scene: SceneKey, sn: number): CanvasImageSource {
  clearSceneCacheForSeason(sn);
  const f = ensureFrontier();
  const key = scene === 'cave' ? `cave:${f.caveFloor}` : scene === 'forest' ? `forest:${f.forestLayer}` : scene;
  let cv = sceneCache[key];
  if (!cv) {
    cv = buildRawScene(scene, sn);
    sceneCache[key] = cv;
  }
  return cv;
}

export async function prewarmScene(scene: SceneKey, sn: number): Promise<void> {
  getSceneSource(scene, sn);
  return Promise.resolve();
}

