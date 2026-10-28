// ===== بخش‌های تفکیک‌شدهٔ دامستان، لانهٔ کاهی یکجای تخم، آخور دقیق علوفه و استخر یکسره =====
import { INK, box, cached, ell, iconPart, ln, put, shape, type Ctx } from './art';
import { ANIMALS, PEN_KINDS, POND_GROW_DAYS, XP, type AnimalKind } from './data';
import { S, addGood, addStat, addXp, notify, penHas, saveGame, toast, troughCap } from './state';
import { sfx } from './sound';
import { fa } from '../strings/fa';
import { GT } from '../strings/gameText';

export interface PenRect { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }

/** هر گونهٔ دام در بخش جداگانهٔ اختصاصی خودش روی چمنزار غربی مزرعه باز می‌شود (صفر تداخل با آسمان، کوه، خانه، چاه، چارتاقی و کرت‌ها) */
export const RANCH_PEN_SLOTS: readonly PenRect[] = [
  { x0: 18, x1: 192, y0: 268, y1: 330 },       // ۰: مرغ‌داری شمالی
  { x0: 18, x1: 192, y0: 412, y1: 474 },       // ۱: باغچهٔ شبدر خرگوش‌ها
  { x0: 18, x1: 192, y0: 340, y1: 402 },       // ۲: محوطه و برکهٔ اردک‌ها
  { x0: 210, x1: 384, y0: 268, y1: 330 },      // ۳: آغل گوسفندها
  { x0: 210, x1: 384, y0: 340, y1: 402 },      // ۴: بهاربند صخره‌ای بزها
  { x0: 210, x1: 384, y0: 412, y1: 474 },      // ۵: مرتع سرسبز گاوداری
];

/** لانهٔ کاهی در ردیف خدمات، بلافاصله پایین مرغ‌داری و دور از محدودهٔ چرای مرغ‌ها. */
export const STRAW_NEST = { cx: 192, cy: 496, walkX: 192, walkY: 540 } as const;

/** مختصات ۱۰۰٪ هم‌مرکز آخور چوبی و علوفهٔ داخل آن (بالای تابلوی زنبورستان با فاصلهٔ تمیز) */
export const FEED_TROUGH = { cx: 272, cy: 500, walkX: 272, walkY: 528 } as const;

export const isPoultry = (kind: AnimalKind): boolean => kind === 'chicken' || kind === 'duck';

/** آیا بازیکن واقعاً دام علوفه‌خوار (گاو/گوسفند/بز/خرگوش) دارد؟ اگر نه، علوفه اصلاً مصرف نمی‌شود! */
export function hasGrazingLivestock(): boolean {
  return S.animals.some((a) => ANIMALS[a.kind].eat > 0);
}

/** مجموع همهٔ تخم‌های آمادهٔ برداشت روی بستر کاه */
export function pendingStrawEggs(): number {
  let sum = 0;
  for (const a of S.animals) {
    if (isPoultry(a.kind) && a.grown <= 0 && a.ready > 0) sum += a.ready;
  }
  return sum;
}

/** برداشت یکجای تمام تخم‌های روی کاه با یک لمس یا یک مراجعهٔ کارگر */
export function collectAllStrawEggs(silent = false): number {
  let totalAdded = 0;
  let blockedByBag = false;
  for (const a of S.animals) {
    if (!isPoultry(a.kind) || a.grown > 0 || a.ready <= 0) continue;
    const got = addGood('egg', a.ready);
    if (got < a.ready) blockedByBag = true;
    a.ready -= got;
    totalAdded += got;
    if (got <= 0) break;
  }
  if (totalAdded > 0) {
    addStat('collect', totalAdded);
    addXp(totalAdded * XP.collect);
    if (!silent) {
      toast('egg', GT.strawEggsCollected + fa(totalAdded));
      sfx.pop();
    }
    if (blockedByBag && !silent) toast('bag', GT.g43);
    saveGame();
    notify();
  } else if (!silent) {
    toast('egg', blockedByBag ? GT.g43 : GT.strawNestEmpty);
  }
  return totalAdded;
}

/** هندسهٔ یکپارچهٔ استخر ماهی در ساحل بالای نوار ابزار پایین (۱۰۰٪ بیرون از HUD در تمام گوشی‌ها!) */
export function unifiedPondGeom() {
  const n = S.ponds.length;
  const x0 = 352;
  const width = Math.max(176, n * 144 + 48);
  const x1 = Math.min(1084, x0 + width);
  return { n, x0, x1, cx: (x0 + x1) / 2, cy: 584, w: x1 - x0, h: 64 };
}

const RANCH_OX = 8, RANCH_OY = 268, RANCH_W = 392, RANCH_H = 268;
let ranchCanvas: HTMLCanvasElement | null = null;
let ranchKey = '';

function getRanchLayer(season: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const key = `${season}:${PEN_KINDS.map((k) => S.pens[k] ?? 0).join(',')}:${hasGrazingLivestock() ? 1 : 0}:${Math.round(S.trough * 2)}:${S.nests.length}`;
  if (ranchCanvas && ranchKey === key) return ranchCanvas;
  ranchKey = key;
  if (!ranchCanvas) {
    ranchCanvas = document.createElement('canvas');
    ranchCanvas.width = RANCH_W;
    ranchCanvas.height = RANCH_H;
  }
  const c = ranchCanvas.getContext('2d', { willReadFrequently: true })!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, RANCH_W, RANCH_H);
  c.translate(-RANCH_OX, -RANCH_OY);
  paintStaticRanch(c, season);
  return ranchCanvas;
}

/** رسم همهٔ بخش‌های بازشدهٔ حیوانات، بستر کاه تخم‌ها و آخور دقیق علوفه (۸۹٪ کاهش ناحیهٔ blit در هر فریم با صفر تغییر بصری!) */
export function drawFarmZonesAndTrough(ctx: Ctx, t: number, season: number) {
  const layer = getRanchLayer(season);
  if (layer) ctx.drawImage(layer, RANCH_OX, RANCH_OY);
  else paintStaticRanch(ctx, season);

  if (penHas('chicken') || penHas('duck')) {
    const eggs = pendingStrawEggs();
    if (eggs > 0) {
      const { cx, cy } = STRAW_NEST;
      const vis = Math.min(7, eggs);
      for (let e = 0; e < vis; e++) {
        const ex = cx - 16 + (e % 4) * 10.5 + (e >= 4 ? 5 : 0);
        const ey = cy - (e >= 4 ? 11 : 6);
        ctx.fillStyle = '#fffdf7';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(ex, ey, 5.2, 6.6, (e % 2 ? 0.14 : -0.14), 0, 6.3);
        ctx.fill(); ctx.stroke();
      }
      const by = cy - 30 + Math.sin(t * 3.2) * 2.5;
      ctx.fillStyle = '#fff8dc';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.ellipse(cx, by, 26, 15, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      put(ctx, iconPart('egg'), cx - 9, by, 0.44);
      ctx.font = '700 16px Lalezar, Vazirmatn, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = INK;
      ctx.fillText(fa(eggs), cx + 9, by + 5);
    }
  }
}

function paintStaticRanch(ctx: Ctx, season: number) {
  const padFill: Record<AnimalKind, string> = {
    chicken: season === 3 ? '#e6decb' : '#e5cf8e',
    rabbit: season === 3 ? '#dfe8ec' : '#9be06c',
    duck: season === 3 ? '#dce6ec' : '#bfe2a4',
    sheep: season === 3 ? '#e4e0d4' : '#b7df78',
    goat: season === 3 ? '#dfd8cb' : '#d6c696',
    cow: season === 3 ? '#e2dfd5' : '#a8da68',
  };

  for (let pi = 0; pi < PEN_KINDS.length; pi++) {
    const kind = PEN_KINDS[pi];
    if (!penHas(kind)) continue;
    const r = RANCH_PEN_SLOTS[pi];
    const lv = S.pens[kind] ?? 1;

    // کفسازی اختصاصی هر بخش
    shape(ctx, [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]], {
      fill: padFill[kind], hatch: 0.1, line: 0, jit: 2.5,
    });

    // سازهٔ اختصاصی جمع‌وجور در نیمهٔ چپ آغل تا نیمهٔ راست ۱۰۰٪ برای چرای آزاد دام باز بماند
    if (kind === 'chicken') {
      shape(ctx, box(r.x0 + 8, r.y0 + 14, 34, 28), { fill: '#f5e4c4', smooth: false, line: 2.2 });
      shape(ctx, [[r.x0 + 5, r.y0 + 16], [r.x0 + 25, r.y0 + 2], [r.x0 + 45, r.y0 + 16]], { fill: '#d9534a', smooth: false, line: 2.2 });
    } else if (kind === 'duck') {
      shape(ctx, ell(r.x0 + 34, r.y0 + 36, 23, 13, 12), { fill: '#5cc0f2', line: 2.2 });
    } else if (kind === 'rabbit') {
      shape(ctx, ell(r.x0 + 30, r.y0 + 32, 18, 11, 10), { fill: '#b88246', hatch: 0.14, line: 2 });
      shape(ctx, ell(r.x0 + 30, r.y0 + 34, 7.5, 6.5, 8), { fill: '#5b3b20', line: 1.8 });
    } else if (kind === 'goat') {
      shape(ctx, ell(r.x0 + 28, r.y0 + 40, 17, 9.5, 9), { fill: '#b5afa6', line: 2 });
      shape(ctx, ell(r.x0 + 42, r.y0 + 35, 11, 7.5, 8), { fill: '#c9c3ba', line: 1.8 });
    } else if (kind === 'cow') {
      shape(ctx, box(r.x0 + 8, r.y0 + 14, 36, 28), { fill: '#d9534a', smooth: false, line: 2.2 });
      shape(ctx, [[r.x0 + 5, r.y0 + 16], [r.x0 + 26, r.y0 + 2], [r.x0 + 47, r.y0 + 16]], { fill: '#9c4328', smooth: false, line: 2 });
    }

    // نرده‌های چوبی دور بخش اختصاصی
    const railCol = lv >= 3 ? '#e0b35a' : '#d9a35e';
    for (const [x1, y1, x2, y2] of [[r.x0, r.y0, r.x1, r.y0], [r.x0, r.y1, r.x1, r.y1], [r.x0, r.y0, r.x0, r.y1], [r.x1, r.y0, r.x1, r.y1]] as const) {
      ln(ctx, [[x1, y1], [x2, y2]], lv >= 2 ? 6 : 4.8, INK);
      ln(ctx, [[x1, y1], [x2, y2]], lv >= 2 ? 3.5 : 2.6, railCol);
    }
    for (const px of [r.x0, r.x1]) {
      for (const py of [r.y0, r.y1]) {
        ctx.fillStyle = '#8a5a28';
        ctx.beginPath(); ctx.arc(px, py, 4.2, 0, 6.3); ctx.fill();
      }
    }

    // پلاک کوچک گونه در گوشهٔ پایین-چپ حصار (صفر تداخل با سر و حباب حیوانات در نیمهٔ راست!)
    const sx = r.x0 + 20, sy = r.y1 - 12;
    shape(ctx, [[sx - 13, sy - 9], [sx + 13, sy - 9], [sx + 12, sy + 9], [sx - 12, sy + 9]], {
      fill: '#fff4d8', line: 1.9, smooth: false, jit: 0.4,
    });
    put(ctx, iconPart(kind), sx, sy, 0.31);

    // لانه‌های تخم بارور جوجه‌کشی پرندگان در ردیف مرتب پایین-میانی
    const hatchN = S.nests.filter((n) => n.kind === kind).length;
    for (let ni = 0; ni < hatchN; ni++) {
      const nx = r.x0 + 48 + ni * 18, ny = r.y1 - 10;
      shape(ctx, ell(nx, ny, 8.5, 4.4, 8), { fill: '#d9b45a', hatch: 0.16, line: 1.4 });
      ctx.fillStyle = '#ffe9c4';
      ctx.beginPath(); ctx.ellipse(nx, ny - 3, 3.4, 4.2, 0, 0, 6.3); ctx.fill();
    }
  }

  // === لانهٔ کاهی بزرگ تخم‌ها (تمام تخم‌ها روی کاه جمع می‌شوند و یکجا برداشته می‌شوند) ===
  if (penHas('chicken') || penHas('duck')) {
    const { cx, cy } = STRAW_NEST;
    shape(ctx, [[cx - 28, cy - 4], [cx + 28, cy - 4], [cx + 24, cy + 14], [cx - 24, cy + 14]], {
      fill: '#9c6631', smooth: false, line: 2.6,
    });
    shape(ctx, ell(cx, cy - 4, 29, 12, 12), { fill: '#f2ca52', hatch: 0.2, line: 2.4 });
    for (let s = -22; s <= 22; s += 9) {
      ln(ctx, [[cx + s, cy - 2], [cx + s + 5, cy - 9]], 2.2, '#d49e2a');
    }
  }

  // === آخور چوبی دامستان + قرارگیری ۱۰۰٪ دقیق علوفه داخل دهانهٔ خود آخور ===
  if (hasGrazingLivestock() || S.trough > 0) {
    const { cx, cy } = FEED_TROUGH;
    const fr = Math.min(1, S.trough / Math.max(1, troughCap()));
    // دیوارهٔ پشتی و حفرهٔ داخلی آخور
    shape(ctx, [[cx - 48, cy - 11], [cx + 48, cy - 11], [cx + 44, cy + 4], [cx - 44, cy + 4]], {
      fill: '#6f471d', smooth: false, line: 2.5,
    });
    // علوفهٔ طلایی دقیقاً داخل حفرهٔ آخور (پشت لبهٔ جلویی چوب!)
    if (fr > 0.01) {
      const rx = 38 * (0.45 + 0.55 * fr);
      const ry = 5 + 8 * fr;
      shape(ctx, ell(cx, cy - 5, rx, ry, 12), { fill: '#f0c446', hatch: 0.18, line: 2.2 });
      for (let k = -24; k <= 24; k += 12) {
        if (Math.abs(k) < rx) ln(ctx, [[cx + k, cy - 4], [cx + k + 5, cy - 6 - ry * 0.6]], 2, '#d19924');
      }
    }
    // بدنهٔ چوبی جلویی آخور که لبهٔ پایین علوفه را در بر می‌گیرد
    shape(ctx, [[cx - 50, cy - 1], [cx + 50, cy - 1], [cx + 44, cy + 15], [cx - 44, cy + 15]], {
      fill: '#a8742a', hatch: 0.15, smooth: false, line: 2.8, jit: 1,
    });
  }
}

/** رسم استخر پرورش ماهی به‌صورت یک استخر واحد، سراسری و یکسره (نه حوضچه‌های تیکه‌تیکه) */
export function drawUnifiedPond(ctx: Ctx, t: number) {
  const g = unifiedPondGeom();
  if (g.n <= 0) {
    ctx.save();
    ctx.setLineDash([8, 7]);
    ctx.strokeStyle = 'rgba(80,52,38,.48)';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.roundRect(g.x0, g.cy - 36, 210, 72, 34);
    ctx.stroke();
    ctx.restore();
    put(ctx, iconPart('pond'), g.x0 + 105, g.cy - 2, 0.8);
    return;
  }

  const stockedCount = S.ponds.filter((p) => p.stocked).length;
  const readyCount = S.ponds.filter((p) => p.stocked && p.grow >= POND_GROW_DAYS).length;
  const rx = g.w / 2;

  // بدنهٔ سنگی-چوبی و پهنهٔ فیروزه‌ای استخر یکپارچه از پیش در کش رسم می‌شود تا در هر فریم صفر مسیر برداری سنگین بازسازی شود
  const basin = cached(`river-pond:${g.n}:${stockedCount > 0 ? 1 : 0}`, g.w + 36, 104, 18, 52, (pc) => {
    shape(pc, [
      [-10, 0], [24, -42], [g.w - 24, -42],
      [g.w + 10, 0], [g.w - 24, 42], [24, 42],
    ], { fill: '#c8924e', hatch: 0.12, smooth: true, line: 3.4 });
    shape(pc, [
      [4, 0], [30, -32], [g.w - 30, -32],
      [g.w - 4, 0], [g.w - 30, 32], [30, 32],
    ], { fill: stockedCount > 0 ? '#4cb4eb' : '#7aa8bf', smooth: true, line: 2.5 });
  });
  put(ctx, basin, g.x0, g.cy, 1);

  // موج‌های آرام سرتاسری در کل استخر یکسره
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 2;
  for (let w = 0; w < g.n + 2; w++) {
    const wx = g.x0 + 48 + ((w * 118 + t * 18) % Math.max(60, g.w - 96));
    const wy = g.cy - 12 + (w % 3) * 12;
    ln(ctx, [[wx - 16, wy], [wx, wy - 2.5], [wx + 16, wy]], 2, 'rgba(255,255,255,.48)');
  }

  // شنای آزاد همهٔ ماهی‌ها در کل طول استخر یکپارچه
  const fishVis = stockedCount * 4;
  for (let k = 0; k < fishVis; k++) {
    const ph = t * (0.42 + (k % 5) * 0.07) + k * 1.37;
    const fx = g.cx + Math.sin(ph) * Math.max(36, rx - 46);
    const fy = g.cy + Math.cos(ph * 1.7 + k) * 18;
    const dirRot = Math.cos(ph) >= 0 ? 0.12 : Math.PI - 0.12;
    put(ctx, iconPart('fish'), fx, fy, 0.52, dirRot * 0.12);
  }

  if (readyCount > 0) {
    const by = g.cy - 52 + Math.sin(t * 3.2) * 3;
    shape(ctx, ell(g.cx, by, 30, 16, 12), { fill: '#fff8dc', line: 2.6 });
    put(ctx, iconPart('fish'), g.cx - 8, by, 0.48);
    put(ctx, iconPart('star'), g.cx + 12, by, 0.46);
  }
}
