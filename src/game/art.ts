// ===== موتور نقاشی مدادرنگی =====
export const INK = '#503426';
import { drawGem } from './gemArt';
export type Pt = [number, number];
export type Ctx = CanvasRenderingContext2D;

export function rng(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ell(cx: number, cy: number, rx: number, ry: number, n = 14, rot = 0): Pt[] {
  const o: Pt[] = [];
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    o.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return o;
}
export const box = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

export interface SO {
  fill?: string | null;
  line?: number;
  ink?: string;
  smooth?: boolean;
  closed?: boolean;
  hatch?: number;
  jit?: number;
  seed?: number;
}

export function shape(c: Ctx, pts: Pt[], o: SO = {}) {
  const fill = o.fill === undefined ? null : o.fill;
  const line = o.line ?? 3;
  const ink = o.ink ?? INK;
  const smooth = o.smooth ?? true;
  const closed = o.closed ?? true;
  const jit = o.jit ?? 1.1;
  const r = rng(o.seed ?? (Math.round(pts[0][0] * 7 + pts[0][1] * 13 + pts.length) & 4095));
  let p: Pt[] = [];
  if (smooth) {
    p = pts.map(([x, y]) => [x + (r() - 0.5) * jit * 2, y + (r() - 0.5) * jit * 2] as Pt);
  } else {
    const n = pts.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      p.push([a[0] + (r() - 0.5) * jit, a[1] + (r() - 0.5) * jit]);
      p.push([(a[0] + b[0]) / 2 + (r() - 0.5) * jit * 1.6, (a[1] + b[1]) / 2 + (r() - 0.5) * jit * 1.6]);
    }
    if (!closed) p.push(pts[n - 1]);
  }
  const n = p.length;
  const path = () => {
    c.beginPath();
    if (smooth && closed) {
      c.moveTo((p[0][0] + p[n - 1][0]) / 2, (p[0][1] + p[n - 1][1]) / 2);
      for (let i = 0; i < n; i++) {
        const a = p[i];
        const b = p[(i + 1) % n];
        c.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      }
      c.closePath();
    } else if (smooth) {
      c.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < n - 1; i++) c.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
      c.lineTo(p[n - 1][0], p[n - 1][1]);
    } else {
      c.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < n; i++) c.lineTo(p[i][0], p[i][1]);
      if (closed) c.closePath();
    }
  };
  if (fill) {
    path();
    c.fillStyle = fill;
    c.fill();
    if (o.hatch) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const q of p) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
      c.save();
      path();
      c.clip();
      const h = y1 - y0;
      c.lineCap = 'round';
      c.lineWidth = 1.8;
      c.strokeStyle = `rgba(60,30,10,${o.hatch})`;
      for (let k = -h; k < x1 - x0; k += 6) {
        c.beginPath(); c.moveTo(x0 + k, y1 + 2); c.lineTo(x0 + k + h, y0 - 2); c.stroke();
      }
      c.strokeStyle = `rgba(255,255,255,${o.hatch * 1.6})`;
      for (let k = -h + 3; k < x1 - x0; k += 12) {
        c.beginPath(); c.moveTo(x0 + k, y1 + 2); c.lineTo(x0 + k + h * 0.9, y0 + h * 0.1); c.stroke();
      }
      c.restore();
    }
  }
  if (line > 0) {
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.strokeStyle = ink;
    c.lineWidth = line;
    path();
    c.stroke();
    c.save();
    c.globalAlpha = 0.35;
    c.lineWidth = Math.max(1, line * 0.55);
    c.translate(0.9, -0.8);
    path();
    c.stroke();
    c.restore();
  }
}

export const ln = (c: Ctx, pts: Pt[], w = 3, col = INK) => shape(c, pts, { fill: null, line: w, ink: col, closed: false });
export const circ = (c: Ctx, x: number, y: number, r: number, fill: string, line = 2.5, hatch = 0) => shape(c, ell(x, y, r, r, 12), { fill, line, hatch });
export const oval = (c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, rot = 0, line = 2.5, hatch = 0) =>
  shape(c, ell(x, y, rx, ry, 12, rot), { fill, line, hatch });
export const dot = (c: Ctx, x: number, y: number, r: number, col = INK) => {
  c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
};

// ===== قطعات (Part) برای ریگ — بوم CPU بدون مصرف FBO در GPU اندروید =====
export interface Part { c: HTMLCanvasElement; img?: CanvasImageSource; w: number; h: number; px: number; py: number }
const PS = 2;
export function flushPendingBitmaps(): Promise<void> { return Promise.resolve(); }

export function mk(w: number, h: number, px: number, py: number, fn: (c: Ctx) => void): Part {
  const cv = document.createElement('canvas');
  cv.width = w * PS; cv.height = h * PS;
  const c = (cv.getContext('2d', { willReadFrequently: true }) ?? cv.getContext('2d'))!;
  c.scale(PS, PS);
  c.translate(px, py);
  fn(c);
  return { c: cv, w, h, px, py };
}
const cache = new Map<string, Part>();
export function cached(key: string, w: number, h: number, px: number, py: number, fn: (c: Ctx) => void): Part {
  let p = cache.get(key);
  if (!p) { p = mk(w, h, px, py, fn); cache.set(key, p); }
  return p;
}
export function put(c: Ctx, p: Part, x = 0, y = 0, s = 1, rot = 0) {
  const src: CanvasImageSource = p.img ?? p.c;
  if (rot) { c.save(); c.translate(x, y); c.rotate(rot); c.drawImage(src, -p.px * s, -p.py * s, p.w * s, p.h * s); c.restore(); }
  else c.drawImage(src, x - p.px * s, y - p.py * s, p.w * s, p.h * s);
}

// ===== ابزارها (مبدا = دست) =====
export function drawTool(c: Ctx, name: string) {
  switch (name) {
    case 'hoe':
      ln(c, [[0, -12], [0, 52]], 7, INK);
      ln(c, [[0, -12], [0, 52]], 4, '#c8924e');
      shape(c, [[-4, 44], [22, 48], [27, 62], [-4, 58]], { fill: '#a9b3bd', smooth: false, hatch: 0.12 });
      break;
    case 'can':
      c.save(); c.translate(8, -20);
      ln(c, [[10, 6], [18, -8], [32, 6]], 4);
      shape(c, [[36, 14], [56, -2], [58, 3], [38, 24]], { fill: '#3e8fcb', smooth: false });
      oval(c, 58, 0, 4, 8, '#2f78b0', 0.5);
      shape(c, box(4, 6, 34, 28), { fill: '#4aa3df', smooth: false, hatch: 0.14 });
      ln(c, [[4, 12], [-9, 14], [-9, 30], [4, 30]], 4);
      ln(c, [[6, 14], [36, 14]], 2, '#8fd0ff');
      c.restore();
      break;
    case 'seedbag':
      shape(c, [[-9, 0], [9, 0], [16, 22], [12, 36], [-12, 36], [-16, 22]], { fill: '#d9a35a', hatch: 0.12 });
      shape(c, [[-10, 2], [10, 2], [6, 8], [-6, 8]], { fill: '#b5793a', smooth: false, line: 2 });
      circ(c, 0, 22, 6.5, '#7fc94a', 2);
      dot(c, -12, 30, 1.6, '#f2c94c'); dot(c, 10, 33, 1.6, '#f2c94c');
      break;
    case 'fertsack':
      shape(c, [[-9, 0], [9, 0], [16, 22], [12, 36], [-12, 36], [-16, 22]], { fill: '#8c6bb8', hatch: 0.12 });
      shape(c, [[-10, 2], [10, 2], [6, 8], [-6, 8]], { fill: '#6b4d99', smooth: false, line: 2 });
      oval(c, -2, 21, 6, 3.5, '#8de06a', -0.6, 2); oval(c, 4, 25, 5, 3, '#6cc84c', 0.7, 2);
      break;
    case 'sickle':
      ln(c, [[0, -8], [0, 18]], 7, INK);
      ln(c, [[0, -8], [0, 18]], 4, '#c8964e');
      shape(c, [[-2, 18], [16, 12], [30, 22], [32, 38], [24, 32], [14, 26], [4, 26]], { fill: '#c7d0d8', hatch: 0.1 });
      break;
    case 'club': {
      // چماقِ غول‌آسرای کمدی جهانگیر (بازسازی کامل — قبلاً شبیه فانوس درمی‌آمد):
      // دستهٔ نازکِ بانداج‌پیچ + سرِ تپلِ گره‌دار با میخ و لبخندِ مسخره
      ln(c, [[-2, -30], [4, 14]], 10, INK);
      ln(c, [[-2, -30], [4, 14]], 6.5, '#c8924e');
      ln(c, [[-6, -16], [8, -12]], 5, '#fff4d8');
      ln(c, [[-5, -8], [9, -4]], 5, '#fff4d8');
      shape(c, [[-24, 16], [-14, 7], [0, 5], [16, 7], [26, 17], [30, 33], [26, 51], [13, 62], [-4, 64], [-20, 58], [-30, 44], [-30, 27]], { fill: '#b87638', hatch: 0.16, line: 3.2 });
      circ(c, -23, 24, 5.5, '#8a5526', 2.4);
      circ(c, 24, 47, 6.5, '#8a5526', 2.4);
      circ(c, 7, 12, 4.5, '#8a5526', 2.2);
      ln(c, [[-33, 35], [-24, 32]], 4, '#c9ced6'); circ(c, -34.5, 35.5, 2.6, '#eef3f7', 1.7);
      ln(c, [[27, 24], [36, 21]], 4, '#c9ced6'); circ(c, 37.5, 20.5, 2.6, '#eef3f7', 1.7);
      dot(c, -8, 35, 3.4); dot(c, 9, 33, 3.4);
      ln(c, [[-7, 47], [2, 51], [11, 45]], 3, '#5a3518');
      break;
    }
    case 'scroll':
      shape(c, [[-13, 4], [13, 4], [15, 34], [-15, 34]], { fill: '#fff6da', smooth: false, line: 2.5 });
      oval(c, 0, 4, 14, 4.5, '#f0dfb4', 0, 2.2);
      ln(c, [[-8, 13], [8, 13]], 2, '#8a5a28'); ln(c, [[-8, 20], [6, 20]], 2, '#8a5a28');
      circ(c, 5, 27, 4, '#d9382e', 1.8);
      break;
    case 'teacup':
      shape(c, [[-8, 8], [8, 8], [6, 25], [-6, 25]], { fill: '#d9583b', smooth: false, line: 2.3 });
      oval(c, 0, 26, 11, 3.5, '#fff4d8', 0, 2);
      ln(c, [[-3, 3], [-5, -5]], 1.8, 'rgba(255,255,255,.75)');
      ln(c, [[3, 3], [5, -6]], 1.8, 'rgba(255,255,255,.75)');
      break;
    case 'bread':
      oval(c, 2, 18, 16, 10, '#e09a48', 0.2, 2.6, 0.14);
      ln(c, [[-6, 14], [-1, 22]], 2, '#a86420'); ln(c, [[2, 13], [7, 21]], 2, '#a86420');
      break;
  }
}
export const toolPart = (name: string) =>
  cached('tool:' + name, 100, 100, 34, 34, (c) => drawTool(c, name));

// ===== محصولات (آیکون) =====
export function drawProduce(c: Ctx, id: string) {
  switch (id) {
    case 'wheat':
      for (const d of [-9, 0, 9]) {
        ln(c, [[d * 0.5, 26], [d, 2]], 3.5, '#c9962b');
        for (let k = 0; k < 3; k++) oval(c, d + (d ? Math.sign(d) * 0.5 : 0), -2 - k * 8, 4.6, 7, '#f1c548', d * 0.03, 2);
      }
      shape(c, box(-9, 14, 18, 6), { fill: '#e0453a', smooth: false, line: 2 });
      break;
    case 'corn':
      shape(c, [[-18, 26], [-16, -6], [-4, 8], [-2, 28]], { fill: '#6cc04a', hatch: 0.1 });
      shape(c, [[18, 26], [16, -6], [4, 8], [2, 28]], { fill: '#58ab3d', hatch: 0.1 });
      oval(c, 0, 0, 11, 25, '#f7d23e', 0.1, 3, 0.1);
      for (let i = 0; i < 4; i++) for (let j = -1; j <= 1; j++) dot(c, j * 5, -12 + i * 9, 1.6, '#c99a1a');
      break;
    case 'tomato':
      circ(c, 0, 4, 21, '#ec3b30', 3, 0.12);
      shape(c, [[0, -17], [6, -10], [14, -14], [8, -6], [12, 0], [0, -4], [-12, 0], [-8, -6], [-14, -14], [-6, -10]], { fill: '#58b13c', line: 2, smooth: false });
      oval(c, -9, -2, 4, 7, 'rgba(255,255,255,.55)', 0.5, 0);
      break;
    case 'carrot':
      for (const a of [-0.6, 0, 0.6]) oval(c, Math.sin(a) * 12, -18 - Math.cos(a) * 6, 4.5, 11, '#4fb046', a, 2);
      shape(c, [[-12, -12], [12, -12], [2, 30], [-2, 30]], { fill: '#f58a1f', hatch: 0.12 });
      ln(c, [[-6, -4], [3, -2]], 2, '#c9620f'); ln(c, [[-4, 6], [3, 8]], 2, '#c9620f'); ln(c, [[-2, 16], [1, 17]], 2, '#c9620f');
      break;
    case 'watermelon': {
      const semi = (r: number, oy: number): Pt[] => Array.from({ length: 12 }, (_, i) => [Math.cos((i / 11) * Math.PI) * r, Math.sin((i / 11) * Math.PI) * r + oy] as Pt);
      shape(c, semi(26, -8), { fill: '#3a9a3c', hatch: 0.14, smooth: false });
      shape(c, semi(21, -8), { fill: '#f0455a', line: 2, smooth: false });
      for (const [x, y] of [[-10, 2], [0, 6], [10, 2], [-4, -2], [5, -2]]) oval(c, x, y, 2, 3.2, '#2b1a14', 0.4, 0);
      break;
    }
    case 'strawberry':
      oval(c, 0, 4, 16, 19, '#e8344a', 0, 3, 0.1);
      for (const [x, y] of [[-6, -2], [5, -4], [0, 6], [-7, 10], [6, 10], [0, 16]]) dot(c, x, y, 1.5, '#ffe38a');
      shape(c, [[0, -12], [6, -16], [10, -10], [4, -9], [8, -4], [0, -8], [-8, -4], [-4, -9], [-10, -10], [-6, -16]], { fill: '#58b13c', line: 2, smooth: false });
      break;
    case 'pumpkin':
      oval(c, 0, 6, 25, 19, '#f28a1e', 0, 3, 0.12);
      oval(c, -9, 6, 8, 18, '#f9a23a', 0, 2); oval(c, 9, 6, 8, 18, '#f9a23a', 0, 2);
      shape(c, [[-3, -14], [3, -14], [5, -22], [-1, -24]], { fill: '#6c9a3a', smooth: false, line: 2.5 });
      break;
    case 'saffron':
      ln(c, [[0, 28], [0, 6]], 3.5, '#4fb046');
      for (const a of [-0.9, 0, 0.9]) oval(c, Math.sin(a) * 9, -4 - Math.cos(a) * 6, 6.5, 14, '#9a5bd6', a, 2.5, 0.1);
      for (const a of [-0.4, 0, 0.4]) ln(c, [[0, 0], [Math.sin(a) * 9, -22]], 2.6, '#e8302a');
      break;
    case 'potato':
      oval(c, -8, 6, 13, 10, '#c9962b', 0.3, 2.6, 0.12); oval(c, 10, 2, 11, 9, '#d9a83e', -0.3, 2.6, 0.1); oval(c, 0, 14, 10, 8, '#b9862a', 0, 2.6, 0.1);
      dot(c, -10, 4, 1.8, '#8a5a1a'); dot(c, 9, 0, 1.8, '#8a5a1a'); dot(c, 2, 14, 1.8, '#8a5a1a');
      break;
    case 'onion':
      shape(c, [[0, -18], [4, -24], [-2, -26]], { fill: '#7fc94a', smooth: false, line: 2 });
      oval(c, 0, 4, 18, 21, '#b06ad6', 0, 3, 0.12);
      ln(c, [[-6, -10], [-6, 18]], 2, '#8a4bb0'); ln(c, [[6, -10], [6, 18]], 2, '#8a4bb0');
      break;
    case 'rice':
      for (const d of [-10, 0, 10]) {
        ln(c, [[d * 0.4, 28], [d, -4]], 3.2, '#c9b84a');
        for (let k = 0; k < 4; k++) oval(c, d + Math.sin(k) * 2, -2 - k * 7, 3.6, 5.5, '#e8d878', d * 0.04, 1.8);
      }
      break;
    case 'grape':
      ln(c, [[0, -22], [0, -12]], 3.2, '#7a5a2a');
      for (const [x, y] of [[-12, -2], [0, -6], [12, -2], [-6, 8], [6, 8], [0, 16]]) circ(c, x, y, 8, '#8a4bd6', 2.4, 0.1);
      break;
    case 'olive':
      ln(c, [[-18, 18], [16, -16]], 3.2, '#7a6a3a');
      for (const [x, y] of [[-10, 8], [2, -2], [12, -12]]) oval(c, x, y, 6, 9, '#5a8a2a', 0.8, 2.2, 0.1);
      for (const [x, y] of [[-4, 12], [8, 2]]) circ(c, x, y, 4.5, '#2e2a20', 1.8);
      break;
    case 'pepper':
      shape(c, [[0, -16], [5, -22], [-3, -24]], { fill: '#58b13c', smooth: false, line: 2 });
      oval(c, -2, 2, 11, 18, '#e8342a', 0.15, 3, 0.1);
      oval(c, 12, 10, 8, 13, '#3f9a3a', -0.3, 2.6, 0.1);
      break;
    case 'cucumber':
      oval(c, -4, 4, 10, 22, '#3f9a3a', 0.5, 3, 0.12);
      for (const [x, y] of [[-8, -4], [-2, 4], [2, 12]]) dot(c, x, y, 2, '#2e7a2e');
      break;
    case 'sunflower':
      ln(c, [[0, 28], [0, -2]], 4, '#4fb046');
      leaf(c, -12, 12, 18, -1, 8, '#5dbb46'); leaf(c, 12, 6, 18, 1, 8, '#3f9a3a');
      for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.28; oval(c, Math.cos(a) * 18, -10 + Math.sin(a) * 18, 6, 11, '#f2b632', a, 2); }
      circ(c, 0, -10, 11, '#7a4b2c', 2.6, 0.15);
      break;
    case 'fig':
      oval(c, 0, 4, 15, 20, '#8a4bd6', 0, 3, 0.12);
      shape(c, [[0, -16], [4, -8], [-4, -8]], { fill: '#58b13c', smooth: false, line: 2 });
      dot(c, 0, 6, 2.6, '#f2a2c8'); oval(c, 8, 14, 7, 11, '#a468e0', 0.3, 2.4, 0.1);
      break;
    case 'plum':
      circ(c, -7, 6, 13, '#6a3bb0', 2.6, 0.12); circ(c, 9, 2, 12, '#7a4bd6', 2.6, 0.1);
      ln(c, [[2, -10], [6, -18]], 3, '#7a5a2a'); leaf(c, 10, -14, 14, 0.7, 6, '#5dbb46');
      oval(c, -10, 2, 4, 7, 'rgba(255,255,255,.4)', 0.4, 0);
      break;
    case 'cherry':
      ln(c, [[-8, 4], [2, -14]], 2.6, '#4a7a2a'); ln(c, [[10, 0], [2, -14]], 2.6, '#4a7a2a'); ln(c, [[2, -14], [6, -22]], 2.6, '#6a5a2a');
      circ(c, -10, 10, 10.5, '#d6233a', 2.6, 0.1); circ(c, 12, 6, 10, '#c21630', 2.6, 0.1);
      oval(c, -13, 6, 3, 5, 'rgba(255,255,255,.5)', 0.5, 0); oval(c, 9, 2, 2.6, 4.4, 'rgba(255,255,255,.45)', 0.5, 0);
      break;
    case 'peach':
      circ(c, 0, 4, 19, '#f2a24c', 3, 0.12);
      ln(c, [[-2, -14], [6, 22]], 2.4, '#d67a2a');
      leaf(c, 8, -18, 16, 0.5, 7, '#5dbb46');
      oval(c, -8, -4, 5, 9, 'rgba(255,190,120,.65)', 0.4, 0); dot(c, -4, 12, 2.2, '#e87a6a');
      break;
    case 'orange':
      circ(c, 0, 4, 19, '#f28a1e', 3, 0.12);
      for (const [x, y] of [[-7, 0], [4, -3], [-2, 9], [8, 8]]) dot(c, x, y, 1.7, '#d96a0e');
      leaf(c, 6, -18, 16, 0.6, 7, '#4fb046'); ln(c, [[0, -15], [0, -20]], 3, '#6a5a2a');
      break;
    case 'pomegranate':
      circ(c, 0, 6, 20, '#c22a3a', 3, 0.12);
      shape(c, [[-8, -14], [-4, -22], [0, -16], [4, -24], [8, -14]], { fill: '#d63a4a', smooth: false, line: 2.4 });
      shape(c, [[-12, 6], [12, 6], [8, 22], [-8, 22]], { fill: '#f26a7a', line: 2, smooth: false });
      for (const [x, y] of [[-7, 9], [-2, 8], [3, 9], [8, 10], [-5, 14], [0, 15], [5, 14], [-2, 19], [3, 19]]) circ(c, x, y, 2.6, '#8e1626', 1);
      break;
    case 'pistachio':
      ln(c, [[0, 22], [0, -2]], 3, '#7a5a2a');
      for (const a of [-0.7, -0.2, 0.3, 0.8]) { const x = Math.sin(a) * 16; ln(c, [[0, 8], [x, -8 + Math.abs(a) * 4]], 2.4, '#7a5a2a'); }
      for (const [x, y] of [[-11, -6], [-4, -10], [3, -8], [11, -2], [-7, 0], [1, 0], [8, 4], [-2, 6], [5, 10], [-9, 8]]) {
        oval(c, x, y, 5, 7, '#c9d84a', (x + y) * 0.04, 1.8);
        ln(c, [[x - 1, y - 4], [x + 1, y + 4]], 2.2, '#a8435a');
      }
      break;
    case 'rose':
      ln(c, [[0, 26], [0, -2]], 3.6, '#3f8a3a');
      leaf(c, -10, 8, 15, -0.8, 7, '#4fb046'); leaf(c, 10, 14, 15, 0.8, 7, '#58b13c');
      for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.28; oval(c, Math.cos(a) * 9, -10 + Math.sin(a) * 9, 6.5, 9, '#e85a8a', a, 2, 0.08); }
      circ(c, 0, -10, 6.5, '#c22a5a', 2);
      circ(c, 16, 16, 5.5, '#e85a8a', 2);
      break;
    case 'fish':
      oval(c, -2, 2, 22, 12, '#5ab4e8', 0, 3, 0.12);
      shape(c, [[18, 2], [32, -10], [32, 14]], { fill: '#3e8fcb', smooth: false, line: 2.4 });
      shape(c, [[-6, -8], [0, -16], [6, -8]], { fill: '#3e8fcb', smooth: false, line: 2.2 });
      dot(c, -14, -1, 2.4); dot(c, -14.6, -1.6, 0.9, '#fff');
      ln(c, [[6, -4], [10, 2], [6, 8]], 2, '#2f78b0');
      break;
    case 'roe':
      shape(c, [[-14, -10], [14, -10], [12, 20], [-12, 20]], { fill: '#fdfdfd', hatch: 0.08, smooth: false });
      shape(c, box(-12, -8, 24, 12), { fill: '#f28a1e', smooth: false, line: 2 });
      for (const [x, y] of [[-6, 6], [4, 4], [-2, 12], [7, 12], [-8, 14]]) dot(c, x, y, 3.2, '#f2a24c');
      break;
    case 'cheese':
      shape(c, [[-20, 14], [22, 14], [22, 4], [-20, -10]], { fill: '#f2c94c', hatch: 0.1, smooth: false });
      for (const [x, y] of [[-8, 6], [6, 8], [12, 2], [-2, -1]]) circ(c, x, y, 3, '#d9a83e', 1.6);
      break;
    case 'honey':
      shape(c, [[-13, -8], [13, -8], [16, 22], [-16, 22]], { fill: '#f2a24c', hatch: 0.12, smooth: false });
      shape(c, box(-10, -16, 20, 9), { fill: '#c87a2a', smooth: false, line: 2.2 });
      shape(c, box(-13, 2, 26, 8), { fill: '#fff4d8', smooth: false, line: 2 });
      oval(c, -4, 12, 4, 6, 'rgba(255,255,255,.5)', 0.3, 0);
      break;
    case 'egg':
      oval(c, 0, 2, 16, 21, '#fff0d0', 0.05, 3, 0.1);
      dot(c, -5, 6, 1.4, '#c9a56a'); dot(c, 6, -2, 1.4, '#c9a56a'); dot(c, 3, 11, 1.4, '#c9a56a');
      oval(c, -6, -8, 3, 6, 'rgba(255,255,255,.8)', 0.4, 0);
      break;
    case 'milk':
      shape(c, [[-10, -22], [10, -22], [10, -14], [17, -4], [17, 26], [-17, 26], [-17, -4], [-10, -14]], { fill: '#fdfdfd', hatch: 0.08, smooth: false });
      shape(c, box(-12, -29, 24, 9), { fill: '#4aa3df', smooth: false, line: 2.5 });
      shape(c, box(-12, 0, 24, 14), { fill: '#7cc4f0', smooth: false, line: 2 });
      break;
    case 'wool':
      for (const [x, y] of [[-12, 6], [12, 6], [0, 12], [-8, -8], [10, -8], [0, 0]]) circ(c, x, y, 12, '#fbf3e4', 2.5);
      ln(c, [[-6, 0], [2, -4], [6, 4]], 2, '#d9c7a8');
      break;
    case 'feed':
      shape(c, box(-23, -14, 46, 34), { fill: '#e8c04f', smooth: false, hatch: 0.18 });
      ln(c, [[-10, -14], [-10, 20]], 3.5, '#a8742a'); ln(c, [[10, -14], [10, 20]], 3.5, '#a8742a');
      for (const [x, y] of [[-18, -18], [-6, -20], [6, -18], [18, -17]]) ln(c, [[x, y + 6], [x + 4, y - 4]], 2.5, '#e8c04f');
      break;
    case 'fert':
      drawTool(c, 'fertsack');
      break;
    case 'fingerling':
      oval(c, 0, 0, 13, 7, '#7cc4f0', 0.15, 2.4);
      shape(c, [[10, 0], [19, -7], [19, 7]], { fill: '#5ab4e8', smooth: false, line: 2 });
      dot(c, -7, -1, 1.6);
      break;
    case 'herb':
      ln(c, [[0, 20], [0, -14]], 3.2, '#15803d');
      shape(c, [[-14, 2], [-2, -4], [-4, 10]], { fill: '#4ade80' });
      shape(c, [[14, -4], [2, -10], [4, 4]], { fill: '#22c55e' });
      dot(c, 0, -18, 4.5, '#a855f7');
      break;
    case 'mushroom':
      shape(c, box(-6, 2, 12, 18), { fill: '#fef3c7', smooth: false });
      shape(c, [[-22, 4], [-14, -16], [14, -16], [22, 4]], { fill: '#e11d48' });
      dot(c, -8, -7, 3, '#fff'); dot(c, 7, -9, 3.2, '#fff');
      break;
    case 'truffle':
      circ(c, 0, 2, 16, '#b45309', 3);
      circ(c, -3, -2, 8, '#fbbf24', 0);
      break;
    case 'quartz': case 'turquoise': case 'amber': case 'amethyst': case 'garnet':
    case 'opal': case 'sapphire': case 'emerald': case 'ruby': case 'diamond':
      drawGem(c, id);
      break;
  }
}

// ===== آیکون‌ها =====
export function sun(c: Ctx, x = 0, y = 0, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ln(c, [[Math.cos(a) * 17, Math.sin(a) * 17], [Math.cos(a) * 26, Math.sin(a) * 26]], 3.5, '#e8a21c'); }
  circ(c, 0, 0, 14, '#ffd93b', 3, 0.1);
  c.restore();
}
export function cloud(c: Ctx, x = 0, y = 0, s = 1, col = '#fdfdff') {
  c.save(); c.translate(x, y); c.scale(s, s);
  shape(c, [[-24, 10], [-26, 0], [-14, -6], [-8, -16], [6, -18], [14, -8], [26, -4], [28, 8], [18, 12]], { fill: col, hatch: 0.07 });
  c.restore();
}
export { drawIcon, iconURL, iconPart } from './artIcons';

// ===== گیاهان در مراحل رشد =====
export function cropPart(id: string, stage: number, dead: boolean): Part {
  return cached(`crop:${id}:${stage}:${dead ? 1 : 0}`, 110, 124, 55, 108, (c) => drawCrop(c, id, stage, dead));
}
function leaf(c: Ctx, x: number, y: number, len: number, ang: number, wid: number, col: string) {
  oval(c, x + Math.sin(ang) * len / 2, y - Math.cos(ang) * len / 2, wid, len / 2, col, ang, 2.2);
}
const FRUIT: Record<string, string> = {
  potato: '#c9962b', onion: '#b06ad6', rice: '#e8d878', grape: '#8a4bd6', olive: '#5a8a2a',
  pepper: '#e8342a', cucumber: '#3f9a3a', sunflower: '#f2b632',
  fig: '#8a4bd6', plum: '#7a4bd6', cherry: '#d6233a', peach: '#f2a24c', orange: '#f28a1e',
  pomegranate: '#c22a3a', pistachio: '#c9d84a', rose: '#e85a8a',
};
const CROP_ART: Record<string, 'bush' | 'vine' | 'tall' | 'root' | 'flower'> = {
  potato: 'root', onion: 'root', rice: 'tall', grape: 'vine', olive: 'vine', pepper: 'bush', cucumber: 'vine', sunflower: 'flower',
  fig: 'vine', plum: 'bush', cherry: 'bush', peach: 'bush', orange: 'bush', pomegranate: 'bush', pistachio: 'tall', rose: 'flower',
};
function drawCrop(c: Ctx, id: string, st: number, dead: boolean) {
  const G = dead ? '#a89868' : '#5dbb46';
  const G2 = dead ? '#8b7b52' : '#3f9a3a';
  const hs = [0.25, 0.55, 0.82, 1][st];
  if (st === 0) {
    leaf(c, -3, 0, 14, -0.7, 4, G); leaf(c, 3, 0, 16, 0.6, 4, G); leaf(c, 0, 0, 12, 0, 3.5, G2);
    return;
  }
  switch (id) {
    case 'wheat':
      for (let i = 0; i < 7; i++) {
        const x = -25 + i * 8.4;
        const h = (44 + (i % 3) * 6) * hs;
        const tx = x + (i - 3) * 2;
        ln(c, [[x, 0], [x + (i - 3) * 0.9, -h * 0.5], [tx, -h]], 3, st === 3 && !dead ? '#c9962b' : G2);
        if (st >= 2) oval(c, tx, -h - 7, 4.6, 9, dead ? '#b59a50' : st === 3 ? '#f2c94c' : '#b8cf4a', (i - 3) * 0.05, 2, 0.08);
        else leaf(c, x, -h * 0.4, 15, (i - 3) * 0.15, 3.2, G);
      }
      break;
    case 'corn': {
      const h = 62 * hs;
      ln(c, [[0, 0], [0, -h]], 6.5, INK); ln(c, [[0, 0], [0, -h]], 4.2, dead ? '#9b8a5c' : '#7fbf3f');
      for (let k = 0; k < st + 2; k++) {
        const y = -h * (0.18 + 0.16 * k);
        const s = k % 2 ? 1 : -1;
        shape(c, [[0, y], [s * 17, y - 15], [s * 32, y - 3], [s * 17, y - 8]], { fill: G, hatch: 0.1 });
      }
      if (st === 3) {
        for (const s of [-1, 1]) { oval(c, s * 11, -h * 0.5, 5.5, 11, dead ? '#b59a50' : '#f7d23e', s * 0.25, 2.3); shape(c, [[s * 7, -h * 0.5 + 10], [s * 16, -h * 0.5 - 3], [s * 14, -h * 0.5 + 12]], { fill: G, line: 1.8, smooth: false }); }
        for (const a of [-0.5, 0, 0.5]) ln(c, [[0, -h], [Math.sin(a) * 10, -h - 10]], 2.2, '#d9b86a');
      }
      break;
    }
    case 'tomato': {
      const sp: Pt[] = [[-22, -14], [18, -16], [-6, -30], [-26, -32], [24, -34], [2, -48], [-14, -50], [14, -52]];
      ln(c, [[26, 4], [26, -70 * hs]], 4, '#c8924e');
      for (let i = 0; i < Math.min(8, 3 + st * 2); i++) oval(c, sp[i][0] * (0.5 + hs / 2), sp[i][1] * hs, 15, 11, i % 2 ? G2 : G, 0.3 * (i % 3 - 1), 2.2, 0.08);
      if (st >= 2) for (const [x, y] of [[-20, -10], [12, -14], [-6, -26], [20, -30], [-24, -34]].slice(0, 3 + st)) circ(c, x * hs, y * hs, st === 3 ? 7.5 : 4.5, dead ? '#9a6a4a' : st === 3 ? '#ec3b30' : '#bcd45a', 2);
      break;
    }
    case 'carrot':
      for (let i = 0; i < 6; i++) {
        const a = (i - 2.5) * 0.28;
        leaf(c, 0, 2, (40 + (i % 2) * 8) * hs, a, 4.5, i % 2 ? G : G2);
      }
      if (st >= 2) oval(c, 0, 4, 10, 5, dead ? '#a8845a' : '#f58a1f', 0, 2.5, 0.1);
      if (st === 3) { oval(c, -9, 5, 7, 4, dead ? '#a8845a' : '#f58a1f', 0.2, 2.5); oval(c, 10, 5, 7, 4, dead ? '#a8845a' : '#f58a1f', -0.2, 2.5); }
      break;
    case 'watermelon': case 'pumpkin': {
      const w = id === 'watermelon';
      ln(c, [[-34, -4], [-10, -8], [20, -4], [40, -10]], 3, G2);
      for (const [x, y, r] of [[-30, -10, -0.5], [-16, -16, 0.2], [26, -12, 0.4], [38, -16, -0.3], [8, -20, 0]] as const) oval(c, x, y, 13 * (0.5 + hs / 2), 9 * (0.5 + hs / 2), G, r, 2.2, 0.08);
      if (st >= 2) {
        const sz = st === 3 ? 1 : 0.6;
        if (w) {
          oval(c, 0, -14 * sz, 28 * sz, 20 * sz, dead ? '#7a8a5a' : '#3a9a3c', 0, 3, 0.15);
          for (const x of [-16, -6, 6, 16]) ln(c, [[x * sz, -30 * sz], [x * 1.15 * sz, -14 * sz], [x * sz, 0]], 2.6, dead ? '#5a6a3a' : '#1f6b2a');
        } else {
          oval(c, 0, -14 * sz, 26 * sz, 19 * sz, dead ? '#b08a5a' : st === 3 ? '#f28a1e' : '#d6b33a', 0, 3, 0.12);
          oval(c, -9 * sz, -14 * sz, 8 * sz, 18 * sz, dead ? '#c0a070' : st === 3 ? '#f9a23a' : '#e6c850', 0, 2);
          oval(c, 9 * sz, -14 * sz, 8 * sz, 18 * sz, dead ? '#c0a070' : st === 3 ? '#f9a23a' : '#e6c850', 0, 2);
          shape(c, [[-3, -30 * sz], [3, -30 * sz], [5, -38 * sz], [-1, -40 * sz]], { fill: '#6c9a3a', smooth: false, line: 2.5 });
        }
      }
      break;
    }
    case 'strawberry':
      for (let i = 0; i < 6; i++) leaf(c, (i - 2.5) * 8, 2, 30 * (0.5 + hs / 2), (i - 2.5) * 0.3, 8, i % 2 ? G : G2);
      if (st === 2) for (const x of [-16, 0, 14]) { for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; circ(c, x + Math.cos(a) * 4.5, -22 + Math.sin(a) * 4.5, 3.4, '#fff', 1.6); } dot(c, x, -22, 2.4, '#ffd93b'); }
      if (st === 3) for (const [x, y] of [[-18, -14], [-4, -20], [12, -14], [22, -8], [-10, -6]]) { oval(c, x, y, 6.5, 8, dead ? '#9a5a4a' : '#e8344a', 0, 2.2); dot(c, x - 2, y, 1, '#ffe38a'); dot(c, x + 2, y + 3, 1, '#ffe38a'); }
      break;
    case 'saffron':
      for (let i = 0; i < 6; i++) leaf(c, (i - 2.5) * 6, 2, 38 * hs, (i - 2.5) * 0.16, 2.6, i % 2 ? G : G2);
      if (st >= 2) {
        ln(c, [[0, 0], [0, -34 * hs]], 3.4, G);
        const col = dead ? '#9a8aa8' : st === 3 ? '#a45fe0' : '#c9a6e8';
        for (const a of st === 3 ? [-1, -0.4, 0.4, 1] : [-0.3, 0.3]) oval(c, Math.sin(a) * 9, -38 - Math.cos(a) * 5, 6, 14, col, a, 2.4, 0.1);
        if (st === 3) for (const a of [-0.35, 0, 0.35]) ln(c, [[0, -38], [Math.sin(a) * 9, -60]], 2.8, dead ? '#a86a5a' : '#e8302a');
      }
      break;
    default: {
      const art = CROP_ART[id] ?? 'bush';
      if (art === 'root') {
        for (let i = 0; i < 5; i++) leaf(c, (i - 2) * 9, 2, (36 + (i % 2) * 10) * hs, (i - 2) * 0.28, 7, i % 2 ? G : G2);
        if (st >= 2) for (const [x, y, r] of [[-14, 6, 0.2], [2, 10, -0.1], [16, 4, 0.3]]) oval(c, x, y, 9 * hs + 3, 7 * hs + 2, dead ? '#a8845a' : (FRUIT[id] ?? '#c9962b'), r, 2.4, 0.1);
      } else if (art === 'vine') {
        ln(c, [[-26, 2], [-6, -26 * hs], [16, -34 * hs], [30, -18 * hs]], 3.6, dead ? '#8b7b52' : '#7a5a2a');
        for (let i = 0; i < 5; i++) leaf(c, -18 + i * 11, -6 - i * 7 * hs, 20, (i - 2) * 0.5, 8, i % 2 ? G : G2);
        if (st >= 2) for (const [x, y] of [[-12, -12], [6, -22], [20, -8]].slice(0, st)) {
          for (let k = 0; k < 4; k++) circ(c, x + (k % 2) * 7 - 3, y + Math.floor(k / 2) * 8, 5.5 * hs + 1.5, dead ? '#9a8a6a' : (FRUIT[id] ?? '#8a4bd6'), 1.8);
        }
      } else if (art === 'tall') {
        for (let i = 0; i < 5; i++) {
          const x = -19 + i * 9.5, h = (42 + (i % 2) * 8) * hs;
          ln(c, [[x, 0], [x + (i - 2) * 1.8, -h]], 2.8, dead ? '#9b8a5c' : '#7fbf3f');
          if (st >= 2) oval(c, x + (i - 2) * 1.8, -h - 5, 3.8, 7, dead ? '#b59a50' : (FRUIT[id] ?? '#e8d878'), (i - 2) * 0.08, 1.9);
        }
      } else if (art === 'flower') {
        ln(c, [[0, 2], [0, -46 * hs]], 5, dead ? '#8b7b52' : '#4fb046');
        leaf(c, -14, -10, 22, -0.8, 8, G); leaf(c, 14, -18, 22, 0.8, 8, G2);
        if (st >= 2) {
          for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.28; oval(c, Math.cos(a) * 15, -46 * hs - 6 + Math.sin(a) * 15, 5, 9, dead ? '#b59a50' : '#f2b632', a, 2); }
          circ(c, 0, -46 * hs - 6, 9, dead ? '#7a6a4a' : '#7a4b2c', 2.4, 0.15);
        }
      } else {
        for (let i = 0; i < 6; i++) leaf(c, (i - 2.5) * 8, 2, (30 + (i % 2) * 8) * (0.5 + hs / 2), (i - 2.5) * 0.32, 8, i % 2 ? G : G2);
        if (st >= 2) for (const [x, y] of [[-16, -12], [2, -18], [16, -10], [-2, -4]].slice(0, 2 + st - 1)) {
          circ(c, x * hs, y * hs, (st === 3 ? 8 : 5) * (0.6 + hs / 2), dead ? '#9a6a4a' : (FRUIT[id] ?? '#e8342a'), 2);
        }
      }
      break;
    }
  }
}

// ===== خاک زمین (بستر شخم سه‌بعدی دست‌ساز با شیارهای موازی واقعی و صفر هم‌پوشانی) =====
export { TW, TH, soilTile, soilPart } from './soilArt';
