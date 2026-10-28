// ===== کولهٔ پشتی بازیکن — نمای قابل‌مشاهدهٔ ارتقای «کوله پشتی» (سطح ۰ تا ۶) =====
// سطح ۰: بدون کوله؛ با هر ارتقا بزرگ‌تر، پرمایه‌تر و با جزئیات بیشتر می‌شود.
import { S } from './state';

const PACK_TIER = [
  { w: 0, h: 0 },   // 0: بدون کوله
  { w: 13, h: 15 }, // 1
  { w: 15, h: 17 }, // 2
  { w: 17, h: 19 }, // 3
  { w: 19, h: 21 }, // 4
  { w: 21, h: 23 }, // 5
  { w: 23, h: 25 }, // 6
];
const PACK_BODY = ['#8a5a33', '#8a5a33', '#6f8f3f', '#3f7fa8', '#2f6f8f', '#7a5aa8', '#8a6a2f'];
const PACK_TRIM = ['#5f3d22', '#5f3d22', '#4f6f2a', '#2a5f80', '#1f4f6f', '#5a3f88', '#f0c14b'];

/** کوله را پشت بدن بازیکن می‌کشد — قبل از drawFarmer فراخوانی شود تا زیر بدن باشد */
export function drawBackpack(
  ctx: CanvasRenderingContext2D, x: number, y: number, face: number, scale: number,
): void {
  const lv = Math.min(6, Math.max(0, S.lv.bag));
  if (lv === 0) return;
  const t = PACK_TIER[lv];
  const sc = scale;
  const px = x - face * 8 * sc;
  const py = y - 30 * sc;
  const w = t.w * sc;
  const h = t.h * sc;
  ctx.save();
  ctx.strokeStyle = PACK_TRIM[lv];
  ctx.lineWidth = 2 * sc;
  ctx.beginPath();
  ctx.moveTo(px + face * 4 * sc, py + 1 * sc);
  ctx.lineTo(px - face * 2 * sc, py + h * 0.75);
  ctx.stroke();
  ctx.fillStyle = PACK_BODY[lv];
  ctx.beginPath();
  ctx.rect(px - w / 2, py, w, h);
  ctx.fill();
  ctx.lineWidth = 1.3 * sc;
  ctx.strokeStyle = '#4a2c1a';
  ctx.stroke();
  ctx.fillStyle = PACK_TRIM[lv];
  ctx.beginPath();
  ctx.rect(px - w / 2, py, w, h * 0.34);
  ctx.fill();
  ctx.stroke();
  if (lv >= 3) {
    ctx.beginPath();
    ctx.arc(px, py + h * 0.62, 1.7 * sc, 0, 6.3);
    ctx.fill();
  }
  if (lv >= 5) {
    ctx.fillStyle = '#f0c14b';
    ctx.fillRect(px - w / 2 + 1.5 * sc, py + h * 0.44, w - 3 * sc, 1.5 * sc);
  }
  ctx.restore();
}
