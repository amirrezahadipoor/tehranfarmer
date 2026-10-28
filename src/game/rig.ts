import { INK, box, cached, circ, ell, ln, oval, dot, shape, toolPart, type Ctx, type Part } from './art';

// ===== سیستم استخوان‌بندی (Rig) =====
export interface Bone {
  p?: Part;
  x: number; y: number; r: number;
  sx?: number; sy?: number;
  kids?: Bone[]; back?: Bone[];
  hide?: boolean;
}
export const bone = (p: Part | undefined, x: number, y: number, kids?: Bone[], back?: Bone[]): Bone => ({ p, x, y, r: 0, kids, back });

export function drawBone(c: Ctx, b: Bone) {
  if (b.hide) return;
  c.save();
  c.translate(b.x, b.y);
  if (b.r) c.rotate(b.r);
  if (b.sx !== undefined || b.sy !== undefined) c.scale(b.sx ?? 1, b.sy ?? 1);
  if (b.back) for (const k of b.back) drawBone(c, k);
  if (b.p) c.drawImage(b.p.img ?? b.p.c, -b.p.px, -b.p.py, b.p.w, b.p.h);
  if (b.kids) for (const k of b.kids) drawBone(c, k);
  c.restore();
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);
const cl = (t: number) => Math.max(0, Math.min(1, t));

export type CharStyle = 'farmer' | 'grandma' | 'sara' | 'engineer' | 'rancher' | 'jahangir' | 'builder' | 'workerA' | 'workerB' | 'workerC';

export interface Pal {
  shirt: string; pants: string; hat: string; skin: string; band: string; key: string;
  style?: CharStyle; hair?: string; accent?: string;
}

export const PAL_PLAYER: Pal = { shirt: '#e8564a', pants: '#3e7fc4', hat: '#f5dc84', skin: '#ffd2a8', band: '#d9382e', key: 'p', style: 'farmer', hair: '#5a3826', accent: '#f2c94c' };
export const PAL_WORKER: Pal = { shirt: '#6cc04a', pants: '#6d5843', hat: '#e88b6a', skin: '#f0c296', band: '#b5384a', key: 'w', style: 'workerA', hair: '#40281d', accent: '#fff4d8' };
export const PAL_WORKERS: Pal[] = [
  PAL_WORKER,
  { shirt: '#3fa7b8', pants: '#4f5d75', hat: '#f2c94c', skin: '#e2a97e', band: '#2c6975', key: 'w2', style: 'workerB', hair: '#2e221d', accent: '#ffe6a3' },
  { shirt: '#d98a3c', pants: '#5c4d3c', hat: '#e5d19c', skin: '#d89b72', band: '#6e8c3a', key: 'w3', style: 'workerC', hair: '#6b5a4c', accent: '#f7f0d8' },
  { shirt: '#9c59b6', pants: '#4a4258', hat: '#f6d88b', skin: '#ecc098', band: '#ffd43b', key: 'w4', style: 'workerA', hair: '#3b241e', accent: '#fff4d8' },
  { shirt: '#d9534f', pants: '#3c5a6e', hat: '#edd7a4', skin: '#d59a6e', band: '#2f7d4f', key: 'w5', style: 'workerB', hair: '#231b18', accent: '#ffe9b0' },
];
export const PAL_BUILDER: Pal = { shirt: '#e08b36', pants: '#4a5a6a', hat: '#8c5a32', skin: '#e6b488', band: '#d9c098', key: 'bld', style: 'builder', hair: '#5c3822', accent: '#c9965b' };
export const PAL_JAHANGIR: Pal = { shirt: '#5e2129', pants: '#2f2938', hat: '#382c36', skin: '#dcb08c', band: '#a82c38', key: 'jah', style: 'jahangir', hair: '#261d24', accent: '#f2c94c' };
export const PAL_NPC: Pal[] = [
  { shirt: '#9c6ba8', pants: '#6d4678', hat: '#fff3df', skin: '#f7d2b4', band: '#e06d85', key: 'n_grandma', style: 'grandma', hair: '#d9dde6', accent: '#f5d4e0' },
  { shirt: '#2d9c8f', pants: '#36495c', hat: '#d64052', skin: '#ffd6b4', band: '#f5c542', key: 'n_sara', style: 'sara', hair: '#4a2920', accent: '#ffe89c' },
  { shirt: '#d8f0ff', pants: '#455466', hat: '#ffd438', skin: '#f2c49c', band: '#5e7a48', key: 'n_eng', style: 'engineer', hair: '#2e2624', accent: '#6d8753' },
  { shirt: '#c96f35', pants: '#5a4432', hat: '#a87d4c', skin: '#d99e73', band: '#5c3b1e', key: 'n_ranch', style: 'rancher', hair: '#4a311e', accent: '#f7eed8' },
];

function drawTorsoByStyle(c: Ctx, pal: Pal, style: CharStyle) {
  const accent = pal.accent ?? '#f2c94c';
  switch (style) {
    case 'grandma':
      // دامن بلند چین‌دار روستایی + ژاکت بافتنی گرم و شال روی شانه
      shape(c, [[-13, -30], [13, -30], [20, 4], [-20, 4]], { fill: pal.pants, smooth: false, hatch: 0.1, line: 2.6 });
      ln(c, [[-6, -26], [-8, 2]], 1.8, accent); ln(c, [[6, -26], [8, 2]], 1.8, accent);
      oval(c, 0, -29, 17.5, 22, pal.shirt, 0, 2.8, 0.1);
      shape(c, [[-15, -45], [0, -26], [15, -45], [10, -50], [-10, -50]], { fill: accent, line: 2.2 });
      dot(c, 2, -23, 2.2, '#f2c94c'); dot(c, 2, -16, 2.2, '#f2c94c');
      break;
    case 'sara':
      // مانتو/تونیک بلند فیروزه‌ای با کمربند زربفت و حاشیهٔ سنتی
      oval(c, 0, -30, 15.5, 23, pal.shirt, 0, 2.8, 0.08);
      shape(c, [[-12, -27], [12, -27], [17, 3], [-17, 3]], { fill: pal.shirt, smooth: false, hatch: 0.08, line: 2.6 });
      shape(c, box(-13, -27, 26, 6), { fill: pal.band, smooth: false, line: 2.2 });
      ln(c, [[-15, 0], [15, 0]], 2.4, pal.band);
      // دنبالهٔ شال یاقوتی روی سینه
      shape(c, [[2, -48], [13, -46], [10, -24], [3, -26]], { fill: pal.hat, smooth: false, line: 2 });
      break;
    case 'engineer':
      // پیراهن یقه‌دار روشن + جلیقهٔ مهندسی چندجیبه با خودکار و خط‌کش
      oval(c, 0, -27, 16.5, 26, pal.shirt, 0, 2.8, 0.06);
      shape(c, [[-15, -47], [-4, -47], [-3, -4], [-16, -4]], { fill: accent, smooth: false, line: 2.4 });
      shape(c, [[4, -47], [15, -47], [16, -4], [3, -4]], { fill: accent, smooth: false, line: 2.4 });
      shape(c, box(6, -34, 8, 8), { fill: '#e8d9a8', smooth: false, line: 1.8 });
      ln(c, [[8, -39], [8, -33]], 2.2, '#d9382e'); ln(c, [[11, -40], [11, -33]], 2.2, '#2d72d9');
      break;
    case 'rancher':
      // پیراهن پشمی آجری + جلیقهٔ پوستین گوسفندی پشمالو و کمربند سگک‌دار
      oval(c, 0, -27, 18.5, 27, pal.shirt, 0, 3, 0.12);
      shape(c, [[-17, -47], [-5, -47], [-5, -5], [-18, -5]], { fill: accent, hatch: 0.12, line: 2.5 });
      shape(c, [[5, -47], [17, -47], [18, -5], [5, -5]], { fill: accent, hatch: 0.12, line: 2.5 });
      shape(c, box(-16, -10, 32, 6), { fill: '#4f331c', smooth: false, line: 2.2 });
      shape(c, box(-4, -11, 8, 8), { fill: '#ffd93b', smooth: false, line: 2 });
      break;
    case 'jahangir':
      // کت رسمی بلند عنابی-ذغالی با یقهٔ هفت، پیراهن سفید، کراوات سرخ و زنجیر ساعت جیبی طلایی
      oval(c, 0, -26, 18.5, 27, pal.shirt, 0, 3, 0.14);
      shape(c, [[-17, -26], [17, -26], [19, 5], [-19, 5]], { fill: pal.shirt, smooth: false, hatch: 0.1, line: 2.6 });
      shape(c, [[-6, -48], [6, -48], [2, -26]], { fill: '#fffdf4', smooth: false, line: 2 });
      shape(c, [[-2, -46], [2, -46], [3.5, -30], [0, -26], [-3.5, -30]], { fill: pal.band, smooth: false, line: 1.8 });
      ln(c, [[1, -18], [8, -14], [13, -19]], 2.2, accent);
      circ(c, 13, -20, 2.6, accent, 1.6);
      break;
    case 'builder':
      // پیراهن کارگاهی + پیش‌بند چرمی نجاری با جیب ابزار جلو
      oval(c, 0, -26, 17.5, 27, pal.shirt, 0, 3, 0.12);
      shape(c, [[-13, -38], [13, -38], [15, 2], [-15, 2]], { fill: accent, smooth: false, hatch: 0.12, line: 2.5 });
      ln(c, [[-8, -48], [-8, -38]], 3.2, '#6e4726'); ln(c, [[8, -48], [8, -38]], 3.2, '#6e4726');
      shape(c, box(-9, -20, 18, 12), { fill: '#a87442', smooth: false, line: 2 });
      break;
    case 'workerA':
      // تونیک سبز روستایی با پیش‌بند سفید کوتاه
      oval(c, 0, -26, 16.5, 26, pal.shirt, 0, 2.8, 0.1);
      shape(c, [[-12, -20], [12, -20], [15, 1], [-15, 1]], { fill: accent, smooth: false, line: 2.3 });
      shape(c, box(-14, -22, 28, 4), { fill: pal.band, smooth: false, line: 1.8 });
      break;
    case 'workerB':
      // پیراهن کار آبی نفتی با جلیقهٔ نازک کرم
      oval(c, 0, -26, 16.5, 26, pal.shirt, 0, 2.8, 0.1);
      ln(c, [[2, -46], [2, -6]], 2.2, accent);
      dot(c, 5, -36, 1.9, accent); dot(c, 5, -26, 1.9, accent);
      shape(c, box(-15, -7, 30, 5), { fill: '#5a3e28', smooth: false, line: 2 });
      break;
    case 'workerC':
      // پیراهن سنتی اخرایی با شال کمر سبز زیتونی
      oval(c, 0, -26, 17, 26, pal.shirt, 0, 2.8, 0.1);
      shape(c, box(-15, -14, 30, 8), { fill: pal.band, smooth: false, hatch: 0.1, line: 2.2 });
      ln(c, [[-4, -46], [3, -36], [3, -24]], 2, accent);
      break;
    default:
      // لباس کلاسیک کشاورز جوان (قهرمان داستان)
      oval(c, 0, -26, 17, 27, pal.shirt, 0, 3, 0.12);
      shape(c, [[-12, -30], [12, -30], [15, 1], [-15, 1]], { fill: pal.pants, smooth: false, hatch: 0.12, line: 2.5 });
      ln(c, [[-8, -48], [-9, -30]], 3.5, pal.pants); ln(c, [[8, -48], [9, -30]], 3.5, pal.pants);
      dot(c, -8, -29, 2.2, '#f2c94c'); dot(c, 8, -29, 2.2, '#f2c94c');
      shape(c, box(-6, -22, 12, 9), { fill: pal.pants, smooth: false, line: 2 });
      // دستمال گردن، دوخت جیب و برجستگی پارچه قهرمان را از کارگران متمایز می‌کند.
      shape(c, [[-7, -49], [7, -49], [2, -39], [-2, -37]], { fill: pal.band, line: 1.9 });
      ln(c, [[-4, -19], [4, -19]], 1.5, '#9fc6ee');
      oval(c, -8, -33, 3.2, 11, 'rgba(255,244,220,.2)', -0.2, 0);
      break;
  }
}

function drawHeadByStyle(c: Ctx, pal: Pal, style: CharStyle) {
  const hair = pal.hair ?? '#4a3020';
  // گردن و گوش
  oval(c, 0, -4, 6, 8, pal.skin, 0, 2.5);

  if (style === 'grandma') {
    // روسری گلدار مادرجون + گوجه‌ای سفید پشت سر + عینک گرد ظریف + لبخند مهربان
    circ(c, -15, -24, 9, hair, 2.4);
    shape(c, [[-17, -38], [15, -39], [16, -15], [4, -5], [-15, -10]], { fill: pal.hat, line: 2.6 });
    circ(c, 3, -22, 16.5, pal.skin, 2.8, 0.05);
    // حاشیهٔ روسری بالای پیشانی و گره زیر چانه
    shape(c, [[-13, -36], [17, -33], [14, -42], [-14, -40]], { fill: pal.hat, line: 2.4 });
    dot(c, -7, -37, 2, pal.band); dot(c, 3, -38, 2, pal.band); dot(c, 11, -36, 1.8, '#6cc04a');
    circ(c, 4, -4, 4.5, pal.band, 2);
    // عینک گرد طلایی + گونه + لبخند
    circ(c, 10, -24.5, 5.2, '#ffffffaa', 2);
    ln(c, [[2, -25], [5, -24.5]], 1.8, INK);
    dot(c, 10, -24.5, 2.1);
    oval(c, 11, -17, 4.2, 2.8, 'rgba(255,115,125,.42)', 0, 0);
    oval(c, 17, -21, 2.4, 1.9, pal.skin, 0, 1.7);
    ln(c, [[6, -13.5], [11, -11], [15.5, -13.8]], 2.2);
    ln(c, [[6, -31], [12.5, -30]], 1.9, hair);
    return;
  }

  if (style === 'sara') {
    // گیسوی بافتهٔ خرمایی + شال یاقوتی آزاد + مژه‌های برگشته و لبخند شاد سارا
    oval(c, -13, -14, 6, 13, hair, 0.25, 2.4);
    circ(c, -15, -2, 3.8, pal.band, 2);
    circ(c, 2, -22, 17.2, pal.skin, 2.9, 0.05);
    // چتری مو + شال یاقوتی روی سر
    shape(c, [[-16, -24], [-14, -42], [15, -42], [17, -31], [4, -36], [-8, -14]], { fill: pal.hat, line: 2.6 });
    shape(c, [[2, -38], [16, -33], [12, -28], [4, -34]], { fill: hair, smooth: false, line: 2 });
    ln(c, [[-12, -37], [14, -36]], 2, pal.band);
    oval(c, 11.5, -17, 4.8, 3, 'rgba(255,95,120,.5)', 0, 0);
    dot(c, 9.5, -25, 2.7); dot(c, 10.5, -26, 1, '#fff');
    ln(c, [[6.5, -27], [4.5, -28.5]], 1.9);
    oval(c, 17, -21, 2.2, 1.8, pal.skin, 0, 1.7);
    ln(c, [[5.5, -13.5], [10.8, -10.5], [16, -14]], 2.3, '#b8334a');
    ln(c, [[6, -31], [13, -31.8]], 2, hair);
    return;
  }

  // گوش برای سایر شخصیت‌ها
  oval(c, -12, -22, 4.5, 5.5, pal.skin, 0, 2.2);
  circ(c, 2, -22, 18, pal.skin, 3, 0.07);

  if (style === 'engineer') {
    // موی کوتاه + عینک مستطیلی مشکی + کلاه ایمنی زرد مهندسی با نشان
    shape(c, [[-14, -27], [-12, -36], [10, -36], [-6, -24]], { fill: hair, smooth: false, line: 2 });
    shape(c, box(5.5, -29, 9.5, 7.5), { fill: '#dff6ff', smooth: false, line: 2.4 });
    ln(c, [[-3, -25.5], [5.5, -25.5]], 2.2, INK);
    dot(c, 10.5, -25, 2.1);
    oval(c, 17.5, -21, 2.6, 2, pal.skin, 0, 1.8);
    ln(c, [[6, -13.5], [12, -12], [15.5, -13.5]], 2.2);
    shape(c, [[9, -8.5], [14, -8.5], [12, -5.5]], { fill: hair, smooth: false, line: 1.6 });
    // کلاه ایمنی مهندسی لبه‌دار
    oval(c, 1, -41, 17.5, 12.5, pal.hat, 0, 2.8, 0.1);
    shape(c, [[-17, -36], [23, -34], [21, -31], [-16, -33]], { fill: pal.hat, smooth: false, line: 2.4 });
    shape(c, box(4, -46, 7, 6), { fill: '#fffdf4', smooth: false, line: 1.8 });
    return;
  }

  if (style === 'rancher') {
    // ابروی پرپشت + سبیل چخماقی بزرگ + کلاه نمدی بلند دامداری
    dot(c, 9.5, -25, 2.6); dot(c, 10.4, -25.8, 0.9, '#fff');
    oval(c, 18, -21, 3.2, 2.4, pal.skin, 0, 1.9);
    ln(c, [[5, -31.5], [13.5, -31]], 3.2, hair);
    // سبیل چخماقی پهن
    shape(c, [[2, -16], [11, -18.5], [19, -15], [17, -12], [10, -14], [3, -12.5]], { fill: hair, line: 2 });
    // کلاه نمدی گنبدی بلند
    shape(c, ell(1, -36, 27, 6, 14), { fill: pal.hat, hatch: 0.14 });
    oval(c, 1, -46, 15.5, 15, pal.hat, 0, 3, 0.14);
    shape(c, box(-14, -39, 30, 4), { fill: pal.band, smooth: false, line: 2 });
    return;
  }

  if (style === 'jahangir') {
    // ابروی گره‌خورده و اخم معروف جهانگیر + بینی کشیده + سبیل پرپشت + کلاه شاپوی تیره با نوار زرشکی
    dot(c, 9.5, -24.5, 2.5);
    ln(c, [[4.5, -33], [14.5, -28.5]], 3.4, hair);
    shape(c, [[15.5, -24], [21.5, -19.5], [15.5, -18.5]], { fill: pal.skin, smooth: false, line: 2 });
    shape(c, [[3.5, -16.5], [11.5, -18.5], [18.5, -15.5], [15.5, -13], [4.5, -13.5]], { fill: hair, line: 2 });
    ln(c, [[6.5, -10.5], [13.5, -11.5]], 2.1, INK);
    // کلاه شاپوی رسمی جهانگیر
    shape(c, ell(2, -37, 29, 5.5, 14), { fill: pal.hat, line: 2.8 });
    shape(c, [[-13, -37], [-10, -52], [2, -50], [14, -52], [16, -37]], { fill: pal.hat, line: 2.8 });
    shape(c, box(-12.5, -41, 28, 4), { fill: pal.band, smooth: false, line: 1.8 });
    return;
  }

  if (style === 'builder') {
    // ریش پرپشت گرم نجار + کلاه لبه‌دار پارچه‌ای
    dot(c, 9, -25, 2.5); dot(c, 10, -25.8, 0.9, '#fff');
    oval(c, 17.5, -21, 2.8, 2.1, pal.skin, 0, 1.8);
    ln(c, [[6, -31], [13, -31.5]], 2.6, hair);
    shape(c, [[-4, -18], [5, -15], [16, -15], [15, -5], [4, -3], [-5, -9]], { fill: hair, line: 2.2 });
    ln(c, [[7, -12.5], [13, -12.5]], 2, '#fff4d8');
    oval(c, 1, -41, 17, 10.5, pal.hat, -0.06, 2.8, 0.12);
    shape(c, [[6, -35], [23, -33], [21, -30], [4, -32]], { fill: pal.band, smooth: false, line: 2.2 });
    return;
  }

  if (style === 'workerA') {
    // دختر مزرعه‌دار با دستمال‌سر گره‌دار و دم‌اسبی پشت سر
    oval(c, -17, -26, 7, 10, hair, -0.5, 2.4);
    oval(c, 11, -17, 4.5, 3, 'rgba(255,100,110,.45)', 0, 0);
    dot(c, 9.5, -25, 2.6); dot(c, 10.5, -25.8, 0.9, '#fff');
    oval(c, 17, -21, 2.4, 1.9, pal.skin, 0, 1.8);
    ln(c, [[5.5, -13.5], [10.5, -10.8], [15.5, -13.8]], 2.3);
    ln(c, [[6, -31], [12.5, -31.5]], 2.1, hair);
    shape(c, [[-16, -31], [-12, -45], [14, -44], [17, -33], [-4, -35]], { fill: pal.hat, line: 2.6 });
    shape(c, [[-17, -36], [-25, -42], [-21, -31]], { fill: pal.band, smooth: false, line: 2 });
    return;
  }

  if (style === 'workerB') {
    // پسر جوان با کلاه کپ برعکس و موی کاکل جلو
    dot(c, 9, -25, 2.6); dot(c, 10, -25.8, 0.9, '#fff');
    oval(c, 17, -21, 2.5, 2, pal.skin, 0, 1.8);
    ln(c, [[5, -14], [10.5, -11], [16, -14]], 2.3);
    ln(c, [[6, -31], [12.5, -31.5]], 2.3, hair);
    oval(c, 1, -41, 16.5, 11, pal.hat, 0, 2.8, 0.1);
    shape(c, [[-25, -35], [-10, -36], [-11, -32], [-24, -32]], { fill: pal.band, smooth: false, line: 2.2 });
    shape(c, [[8, -36], [17, -33], [12, -29]], { fill: hair, smooth: false, line: 2 });
    return;
  }

  if (style === 'workerC') {
    // باغبان با کلاه حصیری مخروطی و سبیل خاکستری-قهوه‌ای
    dot(c, 9, -25, 2.5);
    oval(c, 17, -21, 2.6, 2, pal.skin, 0, 1.8);
    ln(c, [[6, -31], [13, -31]], 2.5, hair);
    shape(c, [[4, -15.5], [11, -17], [17, -14.5], [11, -13]], { fill: hair, line: 1.9 });
    shape(c, [[-26, -35], [2, -53], [30, -35]], { fill: pal.hat, smooth: false, hatch: 0.14, line: 2.8 });
    ln(c, [[-16, -35], [19, -35]], 2.2, pal.band);
    return;
  }

  // کشاورز جوان (قهرمان داستان) با کاکل مو و کلاه حصیری آفتاب‌گیر
  oval(c, 11, -17, 4.5, 3, 'rgba(255,100,110,.45)', 0, 0);
  dot(c, 9, -25, 2.6); dot(c, 10, -25.8, 0.9, '#fff');
  oval(c, 17, -21, 2.6, 2, pal.skin, 0, 1.8);
  ln(c, [[5, -14], [10, -11], [16, -14]], 2.4);
  ln(c, [[6, -31], [12, -31.5]], 2.2, hair);
  shape(c, [[6, -37], [15, -34], [11, -30]], { fill: hair, smooth: false, line: 1.9 });
  shape(c, ell(2, -37, 31, 7, 14), { fill: pal.hat, hatch: 0.14 });
  oval(c, 2, -44, 15, 13, pal.hat, 0, 3, 0.14);
  shape(c, [[-13, -40], [17, -40], [17, -36], [-13, -36]], { fill: pal.band, smooth: false, line: 1.8 });
  // تاروود کلاه و برق لبهٔ حصیری؛ جزئیات کوچک اما خوانا در نمای نزدیک سینمایی.
  ln(c, [[-8, -47], [11, -47]], 1.3, 'rgba(132,91,38,.45)');
  ln(c, [[-10, -43], [13, -43]], 1.2, 'rgba(255,250,210,.62)');
  ln(c, [[-20, -37], [-7, -39]], 1.4, 'rgba(255,250,210,.7)');
}

function farmerParts(pal: Pal) {
  const k = pal.key;
  const style: CharStyle = pal.style ?? 'farmer';
  const bootCol = style === 'jahangir' ? '#241d24' : style === 'sara' ? '#5c2c38' : '#7a4a2a';
  return {
    torso: cached('f:torso:' + k, 52, 66, 26, 59, (c) => drawTorsoByStyle(c, pal, style)),
    head: cached('f:head:' + k, 78, 80, 39, 56, (c) => drawHeadByStyle(c, pal, style)),
    arm: cached('f:arm:' + k, 18, 34, 9, 8, (c) => {
      oval(c, 0, 10, 7, 12, pal.shirt, 0, 2.8, 0.1);
      ln(c, [[-4, 18], [4, 18]], 2, pal.accent ?? '#f2c94c');
      ln(c, [[-3, 2], [-4, 11]], 1.3, 'rgba(255,255,255,.28)');
    }),
    fore: cached('f:fore:' + k, 18, 36, 9, 7, (c) => {
      oval(c, 0, 9, 5.5, 12, pal.skin, 0, 2.6);
      circ(c, 0, 22, 5.5, pal.skin, 2.6);
      ln(c, [[-2, 3], [-2, 12]], 1.2, 'rgba(255,246,224,.48)');
      ln(c, [[-3, 22], [2, 22]], 1.2, 'rgba(105,62,40,.35)');
    }),
    thigh: cached('f:thigh:' + k, 20, 34, 10, 8, (c) => {
      oval(c, 0, 10, 8, 13, pal.pants, 0, 2.8, 0.1);
      ln(c, [[-3, 1], [-4, 14]], 1.3, 'rgba(255,255,255,.2)');
    }),
    shin: cached('f:shin:' + k, 26, 42, 11, 7, (c) => {
      oval(c, 0, 8, 6.8, 11, pal.pants, 0, 2.6, 0.1);
      oval(c, 0, 19, 6, 6, bootCol, 0, 2.2);
      oval(c, 4, 26, 10, 5.2, bootCol, 0, 2.6);
      ln(c, [[-4, 29], [12, 29]], 1.8, '#3f2c22');
      ln(c, [[1, 23], [8, 23]], 1.2, 'rgba(255,222,170,.4)');
    }),
  };
}

export interface FarmerRig {
  root: Bone; hip: Bone; torso: Bone; head: Bone;
  armF: Bone; foreF: Bone; armB: Bone; foreB: Bone;
  legF: Bone; shinF: Bone; legB: Bone; shinB: Bone; tool: Bone;
}
export function makeFarmer(pal: Pal): FarmerRig {
  const P = farmerParts(pal);
  const tool = bone(undefined, 0, 21);
  const foreF = bone(P.fore, 0, 19, [tool]);
  const armF = bone(P.arm, 0, -42, [foreF]);
  const foreB = bone(P.fore, 0, 19);
  const armB = bone(P.arm, 0, -42, [foreB]);
  const head = bone(P.head, 2, -50);
  const torso = bone(P.torso, 0, 0, [head, armF], [armB]);
  const shinF = bone(P.shin, 0, 19);
  const legF = bone(P.thigh, 3, -2, [shinF]);
  const shinB = bone(P.shin, 0, 19);
  const legB = bone(P.thigh, -3, -2, [shinB]);
  const hip = bone(undefined, 0, -50, [legB, torso, legF]);
  const root = bone(undefined, 0, 0, [hip]);
  return { root, hip, torso, head, armF, foreF, armB, foreB, legF, shinF, legB, shinB, tool };
}

export interface PoseIn { mode: 'idle' | 'walk' | 'act'; ph: number; t: number; kind: string; p: number }
const TOOL_OF: Record<string, string> = { till: 'hoe', mine: 'hammer', plant: 'seedbag', water: 'can', harvest: 'sickle', fert: 'fertsack', well: 'can', feed: 'seedbag', collect: '', build: 'hammer', fish: '' };

export function poseFarmer(r: FarmerRig, s: PoseIn) {
  r.hip.y = -50; r.hip.r = 0; r.torso.r = 0; r.torso.sy = 1; r.head.r = 0;
  r.legF.r = 0.04; r.legB.r = -0.06; r.shinF.r = 0; r.shinB.r = 0;
  r.foreF.r = -0.2; r.foreB.r = -0.2; r.armF.r = 0.06; r.armB.r = -0.05;
  let toolName = '';
  let tilt = 0;
  let aligned = false;
  if (s.mode === 'walk') {
    const a = Math.sin(s.ph), b = -a;
    r.hip.y = -50 - Math.abs(Math.cos(s.ph)) * 3.5;
    r.legF.r = a * 0.78; r.legB.r = b * 0.78;
    r.shinF.r = Math.max(0, Math.sin(s.ph - 1.3)) * 1.05; r.shinB.r = Math.max(0, Math.sin(s.ph + Math.PI - 1.3)) * 1.05;
    r.armF.r = b * 0.7; r.armB.r = a * 0.7; r.foreF.r = -0.4; r.foreB.r = -0.4;
    r.torso.r = 0.08; r.head.r = -0.05 + Math.sin(s.ph * 2) * 0.02;
  } else if (s.mode === 'idle') {
    r.torso.sy = 1 + Math.sin(s.t * 2.2) * 0.014;
    r.armF.r = 0.08 + Math.sin(s.t * 2) * 0.03;
    r.head.r = Math.sin(s.t * 1.3) * 0.04;
  } else {
    const p = cl(s.p);
    toolName = TOOL_OF[s.kind] ?? '';
    switch (s.kind) {
      case 'till': case 'mine': case 'build': {
        const up = p < 0.5 ? ease(p / 0.5) : 1;
        const dn = p < 0.5 ? 0 : ease((p - 0.5) / 0.35);
        const a = p < 0.5 ? lerp(-0.5, -2.7, up) : lerp(-2.7, -0.2, Math.min(1, dn * dn * 1.4));
        r.armF.r = a; r.armB.r = a + 0.12; r.foreF.r = -0.05; r.foreB.r = -0.05;
        r.torso.r = p < 0.5 ? lerp(0.05, -0.12, up) : lerp(-0.12, 0.42, Math.min(1, dn * 1.4));
        r.legF.r = 0.25; r.legB.r = -0.3; r.hip.y = -50 + (p > 0.5 ? dn * 4 : 0);
        aligned = true;
        break;
      }
      case 'plant': case 'fert': case 'feed': {
        const b = Math.sin(Math.min(1, p * 1.15) * Math.PI);
        r.torso.r = 0.7 * b; r.hip.y = -50 + 7 * b; r.legF.r = 0.35 * b; r.legB.r = -0.3 * b; r.shinF.r = 0.35 * b; r.shinB.r = 0.3 * b;
        r.armF.r = -0.3 - 0.9 * b; r.foreF.r = -0.2; r.armB.r = -0.1;
        r.head.r = -0.25 * b;
        break;
      }
      case 'water': case 'well': {
        const q = ease(Math.min(1, p * 1.6));
        r.armF.r = lerp(-0.2, -1.3, q); r.foreF.r = -0.25; r.armB.r = lerp(0, -0.3, q);
        tilt = s.kind === 'water' ? 0.9 * Math.sin(Math.min(1, p) * Math.PI) : 0.2;
        r.torso.r = 0.1 * q;
        if (s.kind === 'well') { r.torso.r = 0.5 * Math.sin(p * Math.PI); r.armF.r = -0.9; }
        break;
      }
      case 'harvest': {
        const b = Math.sin(Math.min(1, p * 1.1) * Math.PI);
        r.torso.r = 0.5 * b; r.hip.y = -50 + 5 * b; r.legF.r = 0.25 * b; r.legB.r = -0.2 * b;
        r.armF.r = lerp(-0.2, -1.5, ease(p)); r.foreF.r = -0.3; r.armB.r = -0.4 * b;
        break;
      }
      case 'collect': {
        const b = Math.sin(Math.min(1, p * 1.1) * Math.PI);
        r.torso.r = 0.55 * b; r.hip.y = -50 + 6 * b; r.armF.r = -0.8 * b; r.armB.r = -0.6 * b; r.legF.r = 0.3 * b; r.legB.r = -0.25 * b;
        break;
      }
      default:
        r.armF.r = -1.2 * Math.sin(p * Math.PI);
    }
  }
  const have = toolName;
  r.tool.p = have ? toolPart(have) : undefined;
  if (have) r.tool.r = aligned ? 0 : -(r.armF.r + r.foreF.r + r.torso.r) + tilt;
}

export function drawFarmer(c: Ctx, r: FarmerRig, x: number, y: number, face: number, scale: number) {
  c.save();
  c.translate(x, y);
  c.fillStyle = 'rgba(40,30,10,.22)';
  c.beginPath(); c.ellipse(0, 1, 24 * scale, 7 * scale, 0, 0, Math.PI * 2); c.fill();
  c.scale(face * scale, scale);
  drawBone(c, r.root);
  c.restore();
}

// ===== حیوانات (ریگ‌های اسکلتی بدون برش، با پاهای کاملاً نشسته روی زمین و جزئیات گونه/جنسیت در animalArt.ts) =====
import { buildBirdRig, buildQuadRig, type AnimalBone } from './animalArt';

export type AKind = 'chicken' | 'duck' | 'cow' | 'sheep' | 'goat' | 'rabbit';
export interface AnimalRig {
  kind: AKind;
  root: Bone;
  body: Bone;
  head: Bone;
  tail: Bone;
  legs: Bone[];
  wing?: Bone;
  h: number;
  len: number;
  baseBodyY: number;
}

export function makeAnimal(kind: AKind, hue = 0, sex: 'm' | 'f' = 'f'): AnimalRig {
  const built = kind === 'chicken' || kind === 'duck'
    ? buildBirdRig(hue, sex, kind)
    : buildQuadRig(kind, hue, sex);
  // animalArt از ch/behind و رندرر از kids/back استفاده می‌کند؛ تبدیل صریح با حفظ مرجع استخوان‌ها
  // برای انیمیشن لازم است. کست مستقیم قبلی باعث می‌شد ریشهٔ بی‌تصویر تنها چیزی باشد که رسم می‌شد.
  const converted = new Map<AnimalBone, Bone>();
  const adapt = (src: AnimalBone): Bone => {
    const cachedBone = converted.get(src);
    if (cachedBone) return cachedBone;
    const out: Bone = { p: src.p ?? undefined, x: src.x, y: src.y, r: src.r, sx: src.sx, sy: src.sy };
    converted.set(src, out);
    const back = src.ch.filter((k) => k.behind).map(adapt);
    const kids = src.ch.filter((k) => !k.behind).map(adapt);
    if (back.length) out.back = back;
    if (kids.length) out.kids = kids;
    return out;
  };
  return {
    kind: built.kind,
    root: adapt(built.root),
    body: adapt(built.body),
    head: adapt(built.head),
    tail: bone(undefined, 0, 0),
    legs: built.legs.map(adapt),
    wing: built.extra ? adapt(built.extra) : undefined,
    h: built.h,
    len: built.len,
    baseBodyY: built.baseBodyY,
  };
}

export interface AnimalPose { mode: 'idle' | 'walk' | 'graze'; ph: number; t: number; seed: number }
export function poseAnimal(r: AnimalRig, s: AnimalPose) {
  const sw = Math.sin(s.ph);
  if (r.kind === 'chicken' || r.kind === 'duck') {
    r.body.y = r.baseBodyY - (s.mode === 'walk' ? Math.abs(Math.cos(s.ph)) * 2.2 : 0) + Math.sin(s.t * 2 + s.seed) * 0.4;
    r.legs[0].r = s.mode === 'walk' ? sw * 0.72 : 0;
    r.legs[1].r = s.mode === 'walk' ? -sw * 0.72 : 0;
    r.head.r = s.mode === 'walk'
      ? Math.sin(s.ph * 2) * 0.16
      : s.mode === 'graze'
        ? 0.42 + Math.max(0, Math.sin(s.t * 6.5 + s.seed)) * 0.75
        : Math.sin(s.t * 1.7 + s.seed) * 0.08;
    r.tail.r = Math.sin(s.t * 3 + s.seed) * 0.08;
    if (r.wing) r.wing.r = Math.sin(s.t * 2.1 + s.seed) * 0.05;
    r.body.r = s.mode === 'graze' ? 0.15 : 0;
    return;
  }
  const hop = r.kind === 'rabbit' && s.mode === 'walk' ? Math.abs(Math.sin(s.ph)) * 4.5 : (s.mode === 'walk' ? Math.abs(Math.cos(s.ph)) * 2 : 0);
  r.body.y = r.baseBodyY - hop + Math.sin(s.t * 1.8 + s.seed) * 0.55;
  const a = s.mode === 'walk' ? (r.kind === 'rabbit' ? 0.36 : 0.46) : 0;
  r.legs[0].r = sw * a;
  r.legs[1].r = -sw * a;
  r.legs[2].r = -sw * a;
  r.legs[3].r = sw * a;
  r.head.r = s.mode === 'graze'
    ? 0.58 + Math.sin(s.t * 2.8 + s.seed) * 0.08
    : s.mode === 'walk'
      ? Math.sin(s.ph) * 0.05
      : Math.sin(s.t * 1.25 + s.seed) * 0.05;
  r.tail.r = Math.sin(s.t * 2.6 + s.seed) * 0.24 + 0.08;
  r.body.r = 0;
}

export function drawAnimal(c: Ctx, r: AnimalRig, x: number, y: number, face: number, scale: number) {
  c.save();
  c.translate(x, y);
  c.fillStyle = 'rgba(40,30,10,.2)';
  c.beginPath(); c.ellipse(0, 2, (r.len * 0.42) * scale, 8 * scale, 0, 0, Math.PI * 2); c.fill();
  c.scale(face * scale, scale);
  drawBone(c, r.root);
  c.restore();
}
