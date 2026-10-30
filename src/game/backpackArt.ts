// ===== کولهٔ همیشه‌قابل‌مشاهدهٔ بازیکن؛ هفت ظاهر متمایز برای سطح ۰ تا ۶ =====
// تنهٔ ریگ حدود y-50 تا y-109 است؛ کوله عمداً کنار تنه قرار می‌گیرد تا زیر بدن گم نشود.
import { circ, ell, ln, shape } from './art';
import { S } from './state';

export const BACKPACK_TIERS = [
  { w: 17, h: 21, y: -79, side: 17, body: '#b8793f', trim: '#6e4126', accent: '#f4d58a' }, // satchel
  { w: 21, h: 31, y: -99, side: 18, body: '#9a6237', trim: '#5f3d22', accent: '#f2c94c' }, // canvas
  { w: 24, h: 34, y: -102, side: 19, body: '#6f9448', trim: '#405f2d', accent: '#f6d66b' }, // bedroll
  { w: 27, h: 37, y: -104, side: 20, body: '#3f86ad', trim: '#275573', accent: '#e9f2f5' }, // pockets/buckles
  { w: 30, h: 41, y: -107, side: 21, body: '#277d82', trim: '#194d54', accent: '#f2c94c' }, // frame
  { w: 33, h: 44, y: -110, side: 22, body: '#815ea6', trim: '#4c386d', accent: '#ffd166' }, // expedition
  { w: 36, h: 47, y: -113, side: 23, body: '#9a6a2f', trim: '#503426', accent: '#ffe08a' }, // master
] as const;

export function backpackTier(level = S.lv.bag) {
  return BACKPACK_TIERS[Math.max(0, Math.min(BACKPACK_TIERS.length - 1, Math.round(level)))]!;
}

/** Draw before drawFarmer: the bag sits beside/behind the torso, not down at the legs. */
export function drawBackpack(ctx: CanvasRenderingContext2D, x: number, y: number, face: number, scale: number): void {
  const lv = Math.max(0, Math.min(6, Math.round(S.lv.bag)));
  const t = backpackTier(lv);
  const dir = face < 0 ? -1 : 1;
  const px = x - dir * t.side * scale;
  const py = y + t.y * scale;
  const w = t.w, h = t.h;
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(scale, scale);

  // External wooden/aluminium frame on the two largest expedition models.
  if (lv >= 4) {
    ln(ctx, [[-w * 0.58, -3], [-w * 0.58, h + 3]], 3.2, '#3b3129');
    ln(ctx, [[w * 0.58, -3], [w * 0.58, h + 3]], 3.2, '#3b3129');
    ln(ctx, [[-w * 0.58, h + 2], [w * 0.58, h + 2]], 2.8, t.accent);
  }

  // Rolled blanket: green scout, framed and master packs.
  if (lv === 2 || lv >= 4) {
    shape(ctx, ell(0, -3, w * 0.45, 5, 12), { fill: lv === 2 ? '#e7b65c' : '#d8c6a0', line: 2.2 });
    ln(ctx, [[-w * 0.23, -7], [-w * 0.23, 1]], 2, t.trim);
    ln(ctx, [[w * 0.23, -7], [w * 0.23, 1]], 2, t.trim);
  }

  // Main soft bag silhouette; even tier zero has a real visible satchel.
  shape(ctx, [
    [-w / 2 + 3, 5], [-w / 2, h - 6], [-w / 2 + 5, h],
    [w / 2 - 5, h], [w / 2, h - 6], [w / 2 - 3, 5], [w * 0.28, 0], [-w * 0.28, 0],
  ], { fill: t.body, line: 2.4, hatch: 0.1, jit: 0.8 });
  shape(ctx, [[-w / 2 + 1, 7], [0, 13], [w / 2 - 1, 7], [w / 2 - 3, 0], [-w / 2 + 3, 0]], {
    fill: t.trim, line: 1.8, smooth: false, hatch: 0.06,
  });

  // Front pocket grows with the bag and remains visible beyond the torso edge.
  shape(ctx, [[-w * 0.36, h * 0.54], [w * 0.36, h * 0.54], [w * 0.32, h * 0.9], [-w * 0.32, h * 0.9]], {
    fill: lv === 0 ? '#c98d50' : t.trim, line: 1.6, smooth: false, hatch: 0.08,
  });
  ln(ctx, [[-w * 0.29, h * 0.62], [w * 0.29, h * 0.62]], 1.2, t.accent);
  circ(ctx, 0, h * 0.36, lv >= 3 ? 2.2 : 1.6, t.accent, 1.1);

  if (lv >= 1) {
    ctx.save();
    ctx.setLineDash([2.2, 2.4]);
    ln(ctx, [[-w * 0.39, 15], [-w * 0.39, h - 7]], 1, t.accent);
    ln(ctx, [[w * 0.39, 15], [w * 0.39, h - 7]], 1, t.accent);
    ctx.restore();
  }
  if (lv >= 3) {
    // Side pouches and bright metal buckles distinguish the utility models.
    shape(ctx, ell(-w * 0.52, h * 0.66, 4.2, 8, 10), { fill: t.body, line: 1.8 });
    shape(ctx, ell(w * 0.52, h * 0.66, 4.2, 8, 10), { fill: t.body, line: 1.8 });
    for (const bx of [-w * 0.24, w * 0.24]) {
      ctx.strokeStyle = t.accent; ctx.lineWidth = 1.5;
      ctx.strokeRect(bx - 2, 12, 4, 5);
    }
  }
  if (lv >= 5) {
    // Compass/charm on the expedition and master versions.
    ln(ctx, [[w * 0.35, h * 0.45], [w * 0.52, h * 0.58]], 1.5, t.accent);
    circ(ctx, w * 0.52, h * 0.61, 3.5, t.accent, 1.4);
    ln(ctx, [[w * 0.52, h * 0.61 - 2], [w * 0.52, h * 0.61 + 2]], 1, t.trim);
  }
  if (lv === 6) {
    // A tiny wheat crest makes the final upgrade recognizable even at distance.
    ln(ctx, [[0, h * 0.7], [0, h * 0.86]], 1.4, t.accent);
    for (const sy of [0.72, 0.77, 0.82]) {
      ln(ctx, [[0, h * sy], [-3, h * sy - 3]], 1.3, t.accent);
      ln(ctx, [[0, h * sy], [3, h * sy - 3]], 1.3, t.accent);
    }
  }
  ctx.restore();
}

/** Draw after drawFarmer so a shoulder strap and waist belt read on the front of the body. */
export function drawBackpackFront(ctx: CanvasRenderingContext2D, x: number, y: number, face: number, scale: number): void {
  const lv = Math.max(0, Math.min(6, Math.round(S.lv.bag)));
  const t = backpackTier(lv);
  const dir = face < 0 ? -1 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * scale, scale);
  ctx.globalAlpha = 0.9;
  const strap: Array<[number, number]> = lv === 0 ? [[-10, -96], [10, -61]] : [[7, -100], [12, -66]];
  ln(ctx, strap, 4.2, '#3f2b20');
  ln(ctx, strap, 2.1, t.accent);
  if (lv >= 2) {
    ln(ctx, [[-10, -61], [12, -61]], 3.5, '#3f2b20');
    ln(ctx, [[-10, -61], [12, -61]], 1.5, t.accent);
    circ(ctx, 11, -61, 2.2, t.accent, 1);
  }
  ctx.restore();
}
