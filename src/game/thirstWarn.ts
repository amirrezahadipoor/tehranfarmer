// ===== شمارش معکوس تشنگی کنار آیکون قطره — زرد تا ۱۲ ساعت، بعد قرمز =====
import { fa } from '../strings/fa';

/** ساعت باقی‌ماندهٔ مرگ محصول خشک (سقف ۳۶ ساعت) را زیر/کنار قطره می‌کشد */
export function drawThirstLeft(ctx: CanvasRenderingContext2D, x: number, y: number, dry: number): void {
  const left = Math.max(0, Math.ceil(36 - dry));
  ctx.save();
  ctx.font = 'bold 15px Lalezar, Vazirmatn, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#4a2c1a';
  ctx.strokeText(fa(left) + 'h', x, y);
  ctx.fillStyle = left <= 12 ? '#ff4d3d' : '#f5c518';
  ctx.fillText(fa(left) + 'h', x, y);
  ctx.restore();
}
